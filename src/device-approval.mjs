// 11단계: 기기 승인 흐름(패스키, WebAuthn). 기기 개인키는 기기의 인증기(Touch ID·Windows Hello·휴대폰 화면 잠금)에만 있고
// 브라우저 저장소(localStorage·sessionStorage·IndexedDB·쿠키)에는 두지 않습니다. 서버는 공개키와 자격 ID만 devices 표에 저장합니다.
// 화면의 「승인 요청」은 status가 pending인 행만 만들고, approved로 바꾸는 일은 학생(관리자)이 Supabase SQL Editor에서만 합니다.
// 요청 본문에 status·approved·owner_id 같은 값이 있으면 요청 전체를 거부하고, 어떤 값도 승인으로 쓰지 않습니다.
import {
  generateAuthenticationOptions, generateRegistrationOptions, verifyAuthenticationResponse, verifyRegistrationResponse,
} from '@simplewebauthn/server';
import { isoBase64URL, isoUint8Array } from '@simplewebauthn/server/helpers';
import config from '../aleph.config.json' with { type: 'json' };
import { DEVICE_SESSION_SECONDS, readDeviceSession, sameUser } from './device-session.mjs';
import { logDenied, UUID } from './notes-api.mjs';

// 패스키는 고정 배포 주소(publicAppUrl)에 묶입니다. 배포마다 바뀌는 주소에서 만든 서명은 출처가 달라 거부됩니다.
const APP = new URL(config.publicAppUrl);
export const RP_ID = APP.hostname;
export const EXPECTED_ORIGIN = APP.origin;
const RP_NAME = 'BYTE BACK 내 자료실';
const ALGORITHMS = [-7, -257]; // ES256, RS256
const CHALLENGE_SECONDS = 300;
const CEREMONY_TIMEOUT_MS = 120000;
const LABEL = /^[^\p{Cc}\p{Cf}]{1,40}$/u;
const CREDENTIAL_ID = /^[A-Za-z0-9_-]{16,1400}$/u;

const respond = (response, status, json) => response.status(status).json(json);
const plain = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const onlyKeys = (value, keys) => plain(value) && Object.keys(value).every((key) => keys.includes(key));
// 화면에는 기기 번호(행 ID 앞 8자리)·이름·상태만 보냅니다. 자격 ID와 공개키는 보내지 않습니다.
const publicDevice = (row) => ({
  code: String(row.id).slice(0, 8), label: row.label, status: row.status, synced: row.synced === true, createdAt: row.created_at,
});

// 기기 승인은 학생 로그인 세션에만 묶습니다. 심판 토큰이나 session_id가 없는 토큰은 이 흐름을 쓸 수 없습니다.
export function studentOnly({ user, resourceId }, request, response) {
  if (user?.kind === 'student' && typeof user.sessionId === 'string' && UUID.test(user.sessionId)) return true;
  logDenied('device_flow_not_student', resourceId, request.method);
  respond(response, 403, { error: 'STUDENT_LOGIN_REQUIRED' });
  return false;
}

// GET /api/device/status: 내 기기 목록과, 이번 로그인 세션이 승인된 기기로 확인됐는지를 서버 기록으로만 알려 줍니다.
export async function handleDeviceStatus({ user, db }, request, response, now = Date.now()) {
  const { data, error } = await db.from('devices')
    .select('id, owner_id, label, status, synced, created_at').eq('owner_id', user.userId).order('created_at');
  if (error) return respond(response, 502, { error: 'DB_READ_FAILED' });
  const session = await readDeviceSession(db, user, now);
  if (session.reason === 'device_check_failed') return respond(response, 502, { error: 'DB_READ_FAILED' });
  return respond(response, 200, {
    sessionVerified: session.reason === null,
    expiresAt: session.expiresAt,
    devices: data.filter((row) => sameUser(row.owner_id, user)).map(publicDevice),
  });
}

// POST /api/device/challenge {purpose}: 이번 로그인 세션에 5분짜리 챌린지를 하나 냅니다(새로 내면 이전 것은 무효).
// register는 새 기기의 공개키를 받을 준비, verify는 이미 승인된 기기에만 서명을 요청합니다.
export async function handleDeviceChallenge({ user, db, resourceId }, request, response, now = Date.now()) {
  const input = request.body;
  if (!onlyKeys(input, ['purpose']) || !['register', 'verify'].includes(input.purpose)) {
    logDenied('device_request_invalid', resourceId, request.method);
    return respond(response, 400, { error: 'INVALID_REQUEST' });
  }
  const { data, error } = await db.from('devices')
    .select('owner_id, credential_id, status').eq('owner_id', user.userId);
  if (error) return respond(response, 502, { error: 'DB_READ_FAILED' });
  const mine = data.filter((row) => sameUser(row.owner_id, user));
  let options;
  if (input.purpose === 'register') {
    options = await generateRegistrationOptions({
      rpName: RP_NAME, rpID: RP_ID, userName: `byteback-${user.userId.slice(0, 8)}`, userDisplayName: RP_NAME,
      userID: isoUint8Array.fromHex(user.userId.replaceAll('-', '').toLowerCase()),
      attestationType: 'none', timeout: CEREMONY_TIMEOUT_MS, supportedAlgorithmIDs: ALGORITHMS,
      excludeCredentials: mine.filter((row) => row.status !== 'revoked').map((row) => ({ id: row.credential_id })),
      authenticatorSelection: { authenticatorAttachment: 'platform', residentKey: 'preferred', userVerification: 'required' },
    });
  } else {
    const approved = mine.filter((row) => row.status === 'approved');
    if (!approved.length) return respond(response, 409, { error: 'NO_APPROVED_DEVICE' });
    options = await generateAuthenticationOptions({
      rpID: RP_ID, timeout: CEREMONY_TIMEOUT_MS, userVerification: 'required',
      allowCredentials: approved.map((row) => ({ id: row.credential_id })),
    });
  }
  const { error: saveError } = await db.from('device_sessions').upsert({
    session_id: user.sessionId, owner_id: user.userId, challenge: options.challenge, challenge_purpose: input.purpose,
    challenge_expires_at: new Date(now + CHALLENGE_SECONDS * 1000).toISOString(),
  }, { onConflict: 'session_id' }).select('session_id').single();
  if (saveError) return respond(response, 502, { error: 'DB_WRITE_FAILED' });
  return respond(response, 200, options);
}

// 이번 세션에 서버가 낸 챌린지를 한 번만 씁니다. 꺼내는 즉시 지워서, 검증에 실패하거나 같은 응답을 다시 보내도 재사용할 수 없습니다.
async function takeChallenge(db, user, purpose, now) {
  const { data: row, error } = await db.from('device_sessions')
    .select('owner_id, challenge, challenge_purpose, challenge_expires_at').eq('session_id', user.sessionId).maybeSingle();
  if (error) return { status: 502, error: 'DB_READ_FAILED' };
  if (!row || !sameUser(row.owner_id, user) || row.challenge_purpose !== purpose || typeof row.challenge !== 'string'
      || !(Date.parse(row.challenge_expires_at) > now)) return { status: 400, error: 'CHALLENGE_INVALID' };
  const { data: taken, error: takeError } = await db.from('device_sessions')
    .update({ challenge: null, challenge_purpose: null, challenge_expires_at: null })
    .eq('session_id', user.sessionId).eq('challenge', row.challenge).select('session_id').maybeSingle();
  if (takeError) return { status: 502, error: 'DB_WRITE_FAILED' };
  if (!taken) return { status: 400, error: 'CHALLENGE_INVALID' };
  return { value: row.challenge };
}

// POST /api/device/register {label, credential}: 이 기기의 패스키 공개키를 검증해 pending으로만 저장합니다.
// 출처(고정 배포 주소)·챌린지·사용자 확인(UV)이 맞아야 하며, 저장한 기기는 승인되지 않은 상태입니다.
export async function handleDeviceRegister({ user, db, resourceId }, request, response, now = Date.now()) {
  const input = request.body;
  const label = typeof input?.label === 'string' ? input.label.trim() : '';
  if (!onlyKeys(input, ['label', 'credential']) || !LABEL.test(label) || !plain(input.credential)) {
    logDenied('device_request_invalid', resourceId, request.method);
    return respond(response, 400, { error: 'INVALID_REQUEST' });
  }
  const challenge = await takeChallenge(db, user, 'register', now);
  if (challenge.error) return respond(response, challenge.status, { error: challenge.error });
  let result = null;
  try {
    result = await verifyRegistrationResponse({
      response: input.credential, expectedChallenge: challenge.value, expectedOrigin: EXPECTED_ORIGIN,
      expectedRPID: RP_ID, requireUserVerification: true, supportedAlgorithmIDs: ALGORITHMS,
    });
  } catch { result = null; }
  if (!result?.verified) {
    logDenied('device_proof_invalid', resourceId, request.method);
    return respond(response, 400, { error: 'DEVICE_PROOF_INVALID' });
  }
  const { credential, credentialDeviceType } = result.registrationInfo;
  // synced: 다른 기기로 복사되는 패스키(iCloud 키체인·Google 비밀번호 관리자 등)인지. 승인하는 사람이 보고 판단하도록 저장합니다.
  const { data, error } = await db.from('devices').insert({
    owner_id: user.userId, label, credential_id: credential.id, public_key: isoBase64URL.fromBuffer(credential.publicKey),
    sign_count: credential.counter, synced: credentialDeviceType === 'multiDevice', status: 'pending',
  }).select('id, owner_id, label, status, synced, created_at').single();
  if (error?.code === '23505') return respond(response, 409, { error: 'DEVICE_EXISTS' });
  if (error) return respond(response, 502, { error: 'DB_WRITE_FAILED' });
  return respond(response, 201, { device: publicDevice(data) });
}

// POST /api/device/verify {credential}: 승인된 내 기기가 이번 챌린지에 서명했는지 검증하고, 맞으면 이번 로그인 세션을 확인 상태로 기록합니다.
// 이 기록이 있어야 메모·복원 API(guard)가 자료를 줍니다.
export async function handleDeviceVerify({ user, db, resourceId }, request, response, now = Date.now()) {
  const input = request.body;
  if (!onlyKeys(input, ['credential']) || !plain(input.credential)
      || typeof input.credential.id !== 'string' || !CREDENTIAL_ID.test(input.credential.id)) {
    logDenied('device_request_invalid', resourceId, request.method);
    return respond(response, 400, { error: 'INVALID_REQUEST' });
  }
  const challenge = await takeChallenge(db, user, 'verify', now);
  if (challenge.error) return respond(response, challenge.status, { error: challenge.error });
  const { data: device, error } = await db.from('devices')
    .select('id, owner_id, credential_id, public_key, sign_count, status').eq('credential_id', input.credential.id).maybeSingle();
  if (error) return respond(response, 502, { error: 'DB_READ_FAILED' });
  // 남의 기기와 없는 기기는 같은 404입니다.
  if (!device || !sameUser(device.owner_id, user)) {
    logDenied(device ? 'device_not_owner' : 'device_unknown', resourceId, request.method);
    return respond(response, 404, { error: 'DEVICE_NOT_FOUND' });
  }
  if (device.status !== 'approved') {
    logDenied('device_not_approved', resourceId, request.method);
    return respond(response, 403, { error: 'DEVICE_NOT_APPROVED' });
  }
  let result = null;
  try {
    result = await verifyAuthenticationResponse({
      response: input.credential, expectedChallenge: challenge.value, expectedOrigin: EXPECTED_ORIGIN, expectedRPID: RP_ID,
      credential: { id: device.credential_id, publicKey: isoBase64URL.toBuffer(device.public_key), counter: Number(device.sign_count) },
      requireUserVerification: true,
    });
  } catch { result = null; }
  if (!result?.verified) {
    logDenied('device_proof_invalid', resourceId, request.method);
    return respond(response, 400, { error: 'DEVICE_PROOF_INVALID' });
  }
  // 서명 횟수를 저장해 복제된 인증기를 알아챌 수 있게 합니다. 그사이 승인이 회수되었으면 기록하지 않습니다.
  const { data: counted, error: countError } = await db.from('devices')
    .update({ sign_count: result.authenticationInfo.newCounter })
    .eq('id', device.id).eq('owner_id', user.userId).eq('status', 'approved').select('id').maybeSingle();
  if (countError) return respond(response, 502, { error: 'DB_WRITE_FAILED' });
  if (!counted) {
    logDenied('device_not_approved', resourceId, request.method);
    return respond(response, 403, { error: 'DEVICE_NOT_APPROVED' });
  }
  const expiresAt = new Date(now + DEVICE_SESSION_SECONDS * 1000).toISOString();
  const { data: saved, error: saveError } = await db.from('device_sessions')
    .update({ device_id: device.id, verified_at: new Date(now).toISOString(), expires_at: expiresAt })
    .eq('session_id', user.sessionId).eq('owner_id', user.userId).select('session_id').maybeSingle();
  if (saveError || !saved) return respond(response, 502, { error: 'DB_WRITE_FAILED' });
  return respond(response, 200, { sessionVerified: true, expiresAt });
}
