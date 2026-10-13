import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import config from '../aleph.config.json' with { type: 'json' };
import policy from '../backup/policy.v1.json' with { type: 'json' };
import notes from '../backup/note.v1.json' with { type: 'json' };
import { RULE_IDS } from '../src/decider.mjs';
import { RESOURCE_IDS } from '../src/resources.mjs';
import { buildWarRoomSummary, handleWarRoom, recordOf, warRoomLogLine } from '../src/war-room.mjs';

const A = Object.freeze({ kind: 'student', userId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', sessionId: '0a0a0a0a-0a0a-4a0a-8a0a-0a0a0a0a0a0a' });
const B_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const REQUEST_ID = '11111111-2222-4333-8444-555555555555';

// 가짜 DB: devices 표의 owner_id 조회만 흉내 냅니다. 기기 번호·자격 ID·공개키 칸은 일부러 채워 응답에 새는지 봅니다.
const fakeDb = (rows, failing = false) => ({
  from: () => ({ select: () => ({ eq: (key, value) => Promise.resolve(failing
    ? { data: null, error: { code: 'XX000' } }
    : { data: rows.filter((row) => row[key] === value), error: null }) }) }),
});
const device = (owner, status) => ({ id: 'deadbeef-1111-4111-8111-111111111111', owner_id: owner, status, credential_id: 'CRED-SECRET-ID', public_key: 'PUBKEY-SECRET' });
const fakeResponse = () => ({ statusCode: null, body: null, status(code) { this.statusCode = code; return this; }, json(value) { this.body = value; return this; } });
const run = async (db, extra = {}) => {
  const response = fakeResponse();
  const lines = [];
  const original = console.log;
  console.log = (line) => lines.push(line);
  try {
    await handleWarRoom({ user: A, db }, { method: 'GET' }, response, { policy, notes, config, requestId: REQUEST_ID, ...extra });
  } finally { console.log = original; }
  return { response, lines };
};

test('요약은 기기 상태를 서버 DB에서 센 값으로 채우고 남의 기기는 세지 않는다', async () => {
  const db = fakeDb([device(A.userId, 'approved'), device(A.userId, 'revoked'), device(A.userId, 'revoked'), device(B_ID, 'pending')]);
  const { response } = await run(db);
  assert.equal(response.statusCode, 200);
  assert.deepEqual(
    { approved: response.body.revocation.approved, pending: response.body.revocation.pending, revoked: response.body.revocation.revoked },
    { approved: 1, pending: 0, revoked: 2 });
  assert.equal(response.body.revocation.status, 'confirmed');
  assert.equal(response.body.requestId, REQUEST_ID);
});

test('판정기 규칙은 코드 목록, 탐지 사건·판정 결과는 미실행으로 남고 0건이나 통과로 적지 않는다', async () => {
  const { response } = await run(fakeDb([]));
  const { decider, detect } = response.body;
  assert.deepEqual(decider.ruleIds, [...RULE_IDS]);
  assert.equal(decider.ruleCount, RULE_IDS.length);
  assert.equal(decider.status, 'listed');
  assert.equal(decider.verdicts.status, 'not_run');
  assert.equal(detect.status, 'not_run');
  assert.equal(detect.events, null);
  assert.equal(detect.proposals, null);
});

test('복구 버전은 요청마다 사본을 다시 검증해 그 결과를 돌려준다', async () => {
  const { response } = await run(fakeDb([]));
  const { recovery } = response.body;
  assert.equal(recovery.policy.verified, true);
  assert.equal(recovery.policy.version, policy.version);
  assert.equal(recovery.policy.shaPrefix, policy.sha256.slice(0, 12));
  assert.equal(recovery.policy.changed, 0);
  assert.equal(recovery.notes.verified, true);
  assert.equal(recovery.notes.version, notes.version);
  assert.equal(recovery.notes.entries, notes.notes.length);
});

test('변조된 사본은 검증 실패로 보이고 버전·개수를 성공처럼 채우지 않는다', async () => {
  const badPolicy = { ...policy, sha256: '0'.repeat(64) };
  const badNotes = { ...notes, sha256: '0'.repeat(64) };
  const { response } = await run(fakeDb([]), { policy: badPolicy, notes: badNotes });
  assert.deepEqual(response.body.recovery.policy, { verified: false, version: null, shaPrefix: null, changed: null });
  assert.deepEqual(response.body.recovery.notes, { verified: false, version: null, entries: null });
});

test('현재 정책이 사본과 다르면 차이 건수가 그대로 나온다', async () => {
  const drifted = { ...config, allowedRoutes: [...config.allowedRoutes, 'GET /api/extra'] };
  const { response } = await run(fakeDb([]), { config: drifted });
  assert.equal(response.body.recovery.policy.changed, 1);
});

test('서버 기록은 한 줄이고 응답의 기록 줄·화면 수치와 칸마다 같다', async () => {
  const { response, lines } = await run(fakeDb([device(A.userId, 'approved'), device(A.userId, 'pending')]));
  assert.equal(lines.length, 1);
  assert.equal(lines[0], response.body.logLine);
  const { body } = response;
  const logged = Object.fromEntries(lines[0].split(' ').slice(2).map((part) => part.split('=')));
  assert.equal(lines[0].split(' ')[1], `request=${REQUEST_ID}`);
  assert.equal(logged.rules, String(body.decider.ruleCount));
  assert.equal(logged.devices_approved, String(body.revocation.approved));
  assert.equal(logged.devices_pending, String(body.revocation.pending));
  assert.equal(logged.devices_revoked, String(body.revocation.revoked));
  assert.equal(logged.detect, 'not_connected');
  assert.equal(logged.policy_sha, body.recovery.policy.shaPrefix);
  assert.equal(logged.note_entries, String(body.recovery.notes.entries));
  assert.equal(lines[0], warRoomLogLine(REQUEST_ID, recordOf(buildWarRoomSummary({
    devices: [{ status: 'approved' }, { status: 'pending' }], policy, notes, config }))));
});

test('응답과 서버 기록에는 메모 본문·사용자 ID·기기 번호·자격 정보·토큰이 없다', async () => {
  const { response, lines } = await run(fakeDb([device(A.userId, 'approved')]));
  const text = JSON.stringify(response.body) + lines.join('\n');
  for (const secret of [A.userId, A.sessionId, 'deadbeef', 'CRED-SECRET-ID', 'PUBKEY-SECRET', 'ownerSha256', 'contentSha256', 'Bearer']) {
    assert.ok(!text.includes(secret), `새면 안 되는 값: ${secret}`);
  }
  assert.deepEqual(Object.keys(response.body).sort(), ['checkedAt', 'decider', 'detect', 'logLine', 'recovery', 'requestId', 'revocation']);
});

test('DB를 읽지 못하면 요약을 만들지 않고 502로 닫으며 기록 줄도 남기지 않는다', async () => {
  const { response, lines } = await run(fakeDb([], true));
  assert.equal(response.statusCode, 502);
  assert.deepEqual(response.body, { error: 'DB_READ_FAILED' });
  assert.equal(lines.length, 0);
});

test('작전실 API는 자기 자원 ID를 쓰고, 로그인 없는 요청과 GET이 아닌 요청은 자료 없이 거부한다', async () => {
  assert.equal(RESOURCE_IDS.warRoom, 'warroom.own');
  const { default: handler } = await import('../api/war-room/index.js');
  for (const method of ['POST', 'GET']) {
    const headers = {};
    const response = { ...fakeResponse(), setHeader(name, value) { headers[name] = value; } };
    const saved = { ...process.env };
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SECRET_KEY;
    try { await handler({ method, headers: {} }, response); } finally { Object.assign(process.env, saved); }
    // POST는 405, GET은 설정이 없으면 503. 어느 쪽도 요약 본문을 주지 않습니다.
    assert.equal(response.statusCode, method === 'POST' ? 405 : 503);
    assert.equal(headers['X-Resource-Id'], 'warroom.own');
    assert.ok(!('decider' in (response.body ?? {})));
  }
});

test('작전실 화면은 요약을 서버 응답에서만 그리고 메모를 읽지 않으며 근거 종류를 구분해 적는다', async () => {
  const html = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');
  assert.match(html, /id="war-box"/u);
  assert.match(html, /fetch|api\('\/api\/war-room'\)/u);
  assert.match(html, /서버 응답으로 확인/u);
  assert.match(html, /코드 목록 · 실행 결과 아님/u);
  assert.match(html, /미실행·미연결/u);
  assert.match(html, /이 화면의 문구는 통과 근거가 아닙니다/u);
  // 작전실 구역은 메모 API를 부르지 않고, 열리는 곳은 서버가 확인한 뒤의 자료실 열기 한 곳뿐입니다.
  const war = html.slice(html.indexOf('const BASIS'), html.indexOf('async function loadWarRoom'));
  assert.doesNotMatch(war, /\/api\/notes|\.body\b|note\.title/u);
  assert.equal((html.match(/loadWarRoom\(\)/gu) ?? []).length >= 3, true);
});
