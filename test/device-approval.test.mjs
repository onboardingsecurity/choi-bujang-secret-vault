import assert from 'node:assert/strict';
import { createHash, generateKeyPairSync, randomBytes, sign } from 'node:crypto';
import { test } from 'node:test';
import {
  EXPECTED_ORIGIN, handleDeviceChallenge, handleDeviceRegister, handleDeviceStatus, handleDeviceVerify, RP_ID, studentOnly,
} from '../src/device-approval.mjs';
import { DEVICE_SESSION_SECONDS, readDeviceSession } from '../src/device-session.mjs';
import { deviceGate } from '../src/notes-api.mjs';

const A = Object.freeze({ kind: 'student', userId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', sessionId: '0a0a0a0a-0a0a-4a0a-8a0a-0a0a0a0a0a0a' });
const B = Object.freeze({ kind: 'student', userId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', sessionId: '0b0b0b0b-0b0b-4b0b-8b0b-0b0b0b0b0b0b' });
const JUDGE = Object.freeze({ kind: 'judge', userId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', runId: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', identity: 'a' });

// 가짜 DB: devices·device_sessions 두 표와 이 흐름이 쓰는 조회 모양만 흉내 냅니다. delete가 불리면 시험이 실패합니다.
const fakeDb = () => {
  const tables = { devices: [], device_sessions: [] };
  let seq = 0;
  const db = { tables, failing: new Set(),
    from(table) {
      const state = { op: 'select', filters: [], values: null, onConflict: null, order: null };
      const rows = tables[table];
      const run = () => {
        if (db.failing.has(table)) return { data: null, error: { code: 'XX000' } };
        if (state.op === 'insert') {
          if (table === 'devices' && rows.some((r) => r.credential_id === state.values.credential_id)) return { data: null, error: { code: '23505' } };
          seq += 1;
          const row = { id: `${String(seq).padStart(8, '0')}-1111-4111-8111-111111111111`, created_at: new Date(seq * 1000).toISOString(), ...state.values };
          rows.push(row);
          return { data: [{ ...row }], error: null };
        }
        if (state.op === 'upsert') {
          let row = rows.find((r) => r[state.onConflict] === state.values[state.onConflict]);
          if (row) Object.assign(row, state.values);
          else rows.push(row = { device_id: null, verified_at: null, expires_at: null, ...state.values });
          return { data: [{ ...row }], error: null };
        }
        const found = rows.filter((r) => state.filters.every(([key, value]) => r[key] === value));
        if (state.op === 'update') for (const r of found) Object.assign(r, state.values);
        if (state.order) found.sort((x, y) => String(x[state.order]).localeCompare(String(y[state.order])));
        return { data: found.map((r) => ({ ...r })), error: null };
      };
      const first = (strict) => async () => {
        const { data, error } = run();
        if (error) return { data: null, error };
        if (strict && data.length !== 1) return { data: null, error: { code: 'PGRST116' } };
        return { data: data[0] ?? null, error: null };
      };
      const q = {
        select: () => q, order(column) { state.order = column; return q; }, eq(key, value) { state.filters.push([key, value]); return q; },
        insert(values) { state.op = 'insert'; state.values = values; return q; },
        update(values) { state.op = 'update'; state.values = values; return q; },
        upsert(values, { onConflict }) { state.op = 'upsert'; state.values = values; state.onConflict = onConflict; return q; },
        delete() { throw new Error('delete 금지'); },
        maybeSingle: first(false), single: first(true),
        then(resolve, reject) { return Promise.resolve(run()).then(resolve, reject); },
      };
      return q;
    } };
  return db;
};

// 가짜 패스키 인증기: P-256 키로 WebAuthn 등록(none)·서명 응답을 만듭니다. 개인키는 이 객체 안에만 있습니다.
const b64u = (bytes) => Buffer.from(bytes).toString('base64url');
const sha256 = (data) => createHash('sha256').update(data).digest();
const head = (major, n) => (n < 24 ? Buffer.from([(major << 5) | n])
  : n < 256 ? Buffer.from([(major << 5) | 24, n]) : Buffer.from([(major << 5) | 25, n >> 8, n & 255]));
const cbor = (value) => {
  if (typeof value === 'number') return value >= 0 ? head(0, value) : head(1, -1 - value);
  if (typeof value === 'string') return Buffer.concat([head(3, Buffer.byteLength(value)), Buffer.from(value)]);
  if (value instanceof Map) return Buffer.concat([head(5, value.size), ...[...value].flatMap(([k, v]) => [cbor(k), cbor(v)])]);
  return Buffer.concat([head(2, value.length), Buffer.from(value)]);
};
const UP = 0x01;
const UV = 0x04;
const BACKED_UP = 0x18;
const AT = 0x40;

function authenticator({ synced = false } = {}) {
  const { privateKey, publicKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
  const jwk = publicKey.export({ format: 'jwk' });
  const rawId = randomBytes(32);
  const coseKey = cbor(new Map([[1, 2], [3, -7], [-1, 1], [-2, Buffer.from(jwk.x, 'base64url')], [-3, Buffer.from(jwk.y, 'base64url')]]));
  const flags = UP | UV | (synced ? BACKED_UP : 0);
  let count = 0;
  const base = { id: b64u(rawId), rawId: b64u(rawId), type: 'public-key', clientExtensionResults: {}, authenticatorAttachment: 'platform' };
  return {
    id: b64u(rawId),
    register(challenge, { origin = EXPECTED_ORIGIN, rpId = RP_ID, flagBits = flags | AT } = {}) {
      const clientDataJSON = Buffer.from(JSON.stringify({ type: 'webauthn.create', challenge, origin, crossOrigin: false }));
      const idLength = Buffer.alloc(2);
      idLength.writeUInt16BE(rawId.length);
      const authData = Buffer.concat([sha256(rpId), Buffer.from([flagBits]), Buffer.alloc(4), Buffer.alloc(16), idLength, rawId, coseKey]);
      const attestationObject = cbor(new Map([['fmt', 'none'], ['attStmt', new Map()], ['authData', authData]]));
      return { ...base, response: { clientDataJSON: b64u(clientDataJSON), attestationObject: b64u(attestationObject), transports: ['internal'] } };
    },
    assert(challenge, { origin = EXPECTED_ORIGIN, rpId = RP_ID, flagBits = flags, signCount = count + 1, key = privateKey } = {}) {
      count = signCount;
      const clientDataJSON = Buffer.from(JSON.stringify({ type: 'webauthn.get', challenge, origin, crossOrigin: false }));
      const counter = Buffer.alloc(4);
      counter.writeUInt32BE(signCount);
      const authenticatorData = Buffer.concat([sha256(rpId), Buffer.from([flagBits]), counter]);
      const signature = sign('sha256', Buffer.concat([authenticatorData, sha256(clientDataJSON)]), key);
      return { ...base, response: { clientDataJSON: b64u(clientDataJSON), authenticatorData: b64u(authenticatorData), signature: b64u(signature) } };
    },
  };
}

const fakeRes = () => ({ statusCode: null, body: null, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } });
const call = async (handler, db, user, body, method = 'POST') => {
  const res = fakeRes();
  await handler({ user, db, resourceId: 'devices.own' }, { method, body }, res);
  return res;
};
const challenge = async (db, user, purpose) => {
  const res = await call(handleDeviceChallenge, db, user, { purpose });
  assert.equal(res.statusCode, 200, `${purpose} 챌린지`);
  return res.body;
};
const register = async (db, user, key, label = '업무용 노트북') =>
  call(handleDeviceRegister, db, user, { label, credential: key.register((await challenge(db, user, 'register')).challenge) });
// 학생이 Supabase SQL Editor에서 하는 승인·회수를 흉내 냅니다(앱 API에는 이 기능이 없음).
const setStatus = (db, key, status) => { db.tables.devices.find((row) => row.credential_id === key.id).status = status; };
const verify = async (db, user, key, options) =>
  call(handleDeviceVerify, db, user, { credential: key.assert((await challenge(db, user, 'verify')).challenge, options) });

test('승인 요청은 대기(pending)로만 저장되고, 그 상태로는 자료 API가 열리지 않는다', async () => {
  const db = fakeDb();
  const key = authenticator();
  const res = await register(db, A, key);
  assert.equal(res.statusCode, 201);
  assert.equal(res.body.device.status, 'pending');
  assert.deepEqual(Object.keys(res.body.device).sort(), ['code', 'createdAt', 'label', 'status', 'synced']);
  const [row] = db.tables.devices;
  assert.equal(row.status, 'pending');
  assert.equal(row.owner_id, A.userId);
  assert.equal(row.credential_id, key.id);
  assert.ok(row.public_key.length > 20);
  assert.deepEqual(await deviceGate(A, db), { status: 403, error: 'DEVICE_NOT_APPROVED', reason: 'device_not_verified' });
  assert.equal((await call(handleDeviceChallenge, db, A, { purpose: 'verify' })).body.error, 'NO_APPROVED_DEVICE');
  const status = await call(handleDeviceStatus, db, A, undefined, 'GET');
  assert.equal(status.body.sessionVerified, false);
  assert.equal(status.body.devices[0].status, 'pending');
  assert.doesNotMatch(JSON.stringify(status.body), new RegExp(key.id, 'u'));
});

test('거부: 승인된 척하는 값·남의 owner_id·모르는 키가 든 요청은 400이고 아무것도 저장하지 않는다', async () => {
  const db = fakeDb();
  const key = authenticator();
  const credential = key.register((await challenge(db, A, 'register')).challenge);
  for (const body of [
    { label: '노트북', credential, status: 'approved' }, { label: '노트북', credential, approved: true },
    { label: '노트북', credential, owner_id: B.userId }, { label: '', credential }, { label: 'x'.repeat(41), credential },
    { label: '노트북' }, { label: '노트북', credential: 'x' }, null, [], 'x',
  ]) {
    assert.equal((await call(handleDeviceRegister, db, A, body)).statusCode, 400, JSON.stringify(body)?.slice(0, 60));
  }
  assert.equal(db.tables.devices.length, 0);
  assert.equal((await call(handleDeviceChallenge, db, A, { purpose: 'approve' })).statusCode, 400);
  assert.equal((await call(handleDeviceChallenge, db, A, { purpose: 'verify', approved: true })).statusCode, 400);
  assert.equal((await call(handleDeviceVerify, db, A, { credential: key.assert('x'), approved: true })).statusCode, 400);
});

test('관리자가 서버에서 승인한 뒤 그 기기의 서명이 있어야 이번 로그인 세션의 자료가 열린다', async () => {
  const db = fakeDb();
  const key = authenticator();
  await register(db, A, key);
  setStatus(db, key, 'approved');
  const options = await challenge(db, A, 'verify');
  assert.deepEqual(options.allowCredentials.map((item) => item.id), [key.id]);
  assert.equal(options.userVerification, 'required');
  const res = await call(handleDeviceVerify, db, A, { credential: key.assert(options.challenge) });
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.sessionVerified, true);
  assert.equal(await deviceGate(A, db), null);
  assert.equal(db.tables.devices[0].sign_count, 1);
  const status = await call(handleDeviceStatus, db, A, undefined, 'GET');
  assert.equal(status.body.sessionVerified, true);
  assert.equal(status.body.devices[0].status, 'approved');
  // 같은 계정이라도 다른 로그인 세션은 따로 확인해야 합니다.
  assert.equal((await deviceGate({ ...A, sessionId: '0c0c0c0c-0c0c-4c0c-8c0c-0c0c0c0c0c0c' }, db)).reason, 'device_not_verified');
});

test('거부: 다른 주소·다른 서비스·사용자 확인 없음·다른 키의 서명은 400이고 챌린지는 한 번만 쓴다', async () => {
  const db = fakeDb();
  const key = authenticator();
  await register(db, A, key);
  setStatus(db, key, 'approved');
  const other = generateKeyPairSync('ec', { namedCurve: 'P-256' }).privateKey;
  for (const options of [{ origin: 'https://attacker.example' }, { rpId: 'attacker.example' }, { flagBits: UP }, { key: other }]) {
    const res = await verify(db, A, key, options);
    assert.equal(res.statusCode, 400, JSON.stringify(Object.keys(options)));
    assert.equal(res.body.error, 'DEVICE_PROOF_INVALID');
    assert.notEqual(await deviceGate(A, db), null);
  }
  const options = await challenge(db, A, 'verify');
  const proof = key.assert(options.challenge, { signCount: 10 });
  assert.equal((await call(handleDeviceVerify, db, A, { credential: proof })).statusCode, 200);
  // 같은 응답을 다시 보내면 챌린지가 이미 지워져 거부됩니다.
  assert.equal((await call(handleDeviceVerify, db, A, { credential: proof })).body.error, 'CHALLENGE_INVALID');
  // 서명 횟수가 저장된 값보다 크지 않으면(복제 의심) 거부합니다.
  assert.equal((await verify(db, A, key, { signCount: 10 })).body.error, 'DEVICE_PROOF_INVALID');
  // 등록도 다른 주소에서 만든 응답이나 사용자 확인 없는 응답은 저장하지 않습니다.
  for (const options of [{ origin: 'https://attacker.example' }, { flagBits: UP | AT }]) {
    const fresh = authenticator();
    const res = await call(handleDeviceRegister, db, A, { label: '노트북', credential: fresh.register((await challenge(db, A, 'register')).challenge, options) });
    assert.equal(res.body.error, 'DEVICE_PROOF_INVALID');
  }
  assert.equal(db.tables.devices.length, 1);
});

test('거부: 남의 기기·대기 기기는 404·403, 확인 뒤 회수되거나 시간이 지나면 자료 API가 다시 막힌다', async () => {
  const db = fakeDb();
  const keyA = authenticator();
  const keyB = authenticator();
  const pendingA = authenticator();
  await register(db, A, keyA);
  await register(db, B, keyB);
  await register(db, A, pendingA, '개인 노트북');
  setStatus(db, keyA, 'approved');
  setStatus(db, keyB, 'approved');
  // B가 A의 기기 서명을 보내도 B의 세션은 열리지 않습니다.
  const stolen = keyA.assert((await challenge(db, B, 'verify')).challenge);
  assert.equal((await call(handleDeviceVerify, db, B, { credential: stolen })).statusCode, 404);
  assert.notEqual(await deviceGate(B, db), null);
  // 승인 대기인 기기로는 확인되지 않습니다.
  assert.equal((await verify(db, A, pendingA)).statusCode, 403);
  assert.notEqual(await deviceGate(A, db), null);
  // 승인된 기기로 확인한 뒤 회수하면 바로 막힙니다.
  assert.equal((await verify(db, A, keyA)).statusCode, 200);
  assert.equal(await deviceGate(A, db), null);
  setStatus(db, keyA, 'revoked');
  assert.equal((await deviceGate(A, db)).reason, 'device_not_approved');
  setStatus(db, keyA, 'approved');
  const later = Date.now() + (DEVICE_SESSION_SECONDS + 1) * 1000;
  assert.equal((await readDeviceSession(db, A, later)).reason, 'device_not_verified');
  // 같은 기기를 두 번 등록할 수 없습니다.
  assert.equal((await register(db, A, keyA)).statusCode, 409);
});

test('심판 토큰은 기기 검사에서 빠지지만 기기 승인 흐름은 쓸 수 없고, 기록을 못 읽으면 자료를 열지 않는다', async () => {
  const db = fakeDb();
  assert.equal(await deviceGate(JUDGE, db), null);
  const res = fakeRes();
  assert.equal(studentOnly({ user: JUDGE, resourceId: 'devices.own' }, { method: 'POST' }, res), false);
  assert.equal(res.statusCode, 403);
  assert.equal(studentOnly({ user: { ...A, sessionId: null }, resourceId: 'devices.own' }, { method: 'POST' }, fakeRes()), false);
  assert.equal(studentOnly({ user: A, resourceId: 'devices.own' }, { method: 'POST' }, fakeRes()), true);
  db.failing.add('device_sessions');
  assert.deepEqual(await deviceGate(A, db), { status: 503, error: 'DEVICE_CHECK_UNAVAILABLE', reason: 'device_check_failed' });
  assert.equal((await deviceGate({ ...A, sessionId: 'not-a-session' }, fakeDb())).reason, 'device_not_verified');
});

test('동기화되는 패스키는 승인하는 사람이 알 수 있게 synced로 저장한다', async () => {
  const db = fakeDb();
  assert.equal((await register(db, A, authenticator({ synced: true }))).body.device.synced, true);
  assert.equal(db.tables.devices[0].synced, true);
});
