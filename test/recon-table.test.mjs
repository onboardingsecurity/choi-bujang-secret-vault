import assert from 'node:assert/strict';
import { test } from 'node:test';
import config from '../aleph.config.json' with { type: 'json' };
import { formatTable, runRecon, summarize } from '../scripts/recon-table.mjs';

const TOKEN = `tok-${'A'.repeat(30)}`;
const COMMIT = 'abcdef0123456789abcdef0123456789abcdef01';
const NOW = () => new Date('2026-10-14T12:00:00.000Z');

// 가짜 배포 서버: 배포 주소와 Supabase 주소로 가는 요청만 흉내 냅니다. 실제 네트워크를 쓰지 않습니다.
const fakeServer = ({ down = false, leakList = false, openDevice = false } = {}) => {
  const calls = [];
  const fetchImpl = async (url, init = {}) => {
    if (down) throw new Error('network down');
    const target = new URL(url);
    const method = init.method ?? 'GET';
    const auth = init.headers?.authorization ?? '';
    calls.push({ method, host: target.host, path: target.pathname, auth });
    const reply = (status, body, headers = {}) => new Response(typeof body === 'string' ? body : JSON.stringify(body),
      { status, headers: { 'x-vercel-id': `icn1::${status}-${calls.length}`, ...headers } });
    if (target.host.endsWith('.supabase.co')) return reply(401, { message: 'no' });
    const path = target.pathname;
    const login = auth === `Bearer ${TOKEN}`;
    const resource = path.startsWith('/api/device') ? 'devices.own' : path.startsWith('/api/war-room') ? 'warroom.own' : 'notes.own';
    const closed = () => reply(401, { error: 'LOGIN_REQUIRED' }, { 'x-resource-id': resource });
    if (path === '/') return reply(200, '<html>화면</html>');
    if (path === '/data.json') return reply(404, { error: 'NOT_FOUND' });
    if (path === '/api/config') return reply(200, { url: 'https://x.supabase.co', key: 'PUBLIC-KEY' });
    if (path === '/aleph.json') return reply(200, { step: 11, commit: COMMIT, originalApiUrl: config.originalApiUrl });
    if (path === '/manifest.webmanifest' || path === '/offline.html') return reply(200, '{}');
    if (path === '/api/notes' && method === 'GET' && leakList && !login) return reply(200, [{ id: 'n', title: '가상', body: '가상' }]);
    if (!login) return openDevice && path.startsWith('/api/device') ? reply(200, { devices: [] }) : closed();
    if (path === '/api/notes' && method === 'GET') return reply(200, [{ id: 'n', title: '가상', body: '가상' }]);
    if (path.startsWith('/api/notes/') && method === 'GET') return reply(404, { error: 'NOT_FOUND' }, { 'x-resource-id': 'notes.own' });
    if (path === '/api/device/status') return reply(200, { sessionVerified: true, devices: [{ code: 'x' }] });
    if (path === '/api/war-room') return reply(200, { requestId: 'r-1', logLine: 'war_room_view request=r-1 rules=5' });
    return reply(404, { error: 'NOT_FOUND' });
  };
  return { fetchImpl, calls };
};

const run = (server, token = '') => runRecon({ config, fetchImpl: server.fetchImpl, token, now: NOW });
const find = (rows, step, kind, text) => rows.find((row) => row.step === step && row.kind === kind && row.request.includes(text));

test('로그인 없이도 금지 요청의 거부와 공개 정상 요청의 허용이 실제 요청의 상태 코드·요청 ID·시각으로 남는다', async () => {
  const { rows } = await run(fakeServer());
  const denied = find(rows, 3, 'forbidden', 'GET /api/notes (로그인 없음)');
  assert.equal(denied.result, 'match');
  assert.equal(denied.basis, 'api');
  assert.match(denied.observed, /HTTP 401/u);
  assert.match(denied.requestId, /^vercel:icn1::/u);
  assert.equal(denied.at, '2026-10-14T12:00:00.000Z');
  const home = find(rows, 1, 'normal', 'GET /');
  assert.equal(home.result, 'match');
  assert.equal(find(rows, 1, 'forbidden', '/data.json').result, 'match');
  assert.equal(find(rows, 8, 'forbidden', 'GET /api/notes/:id').result, 'match');
  assert.equal(find(rows, 11, 'forbidden', '/api/device/register').result, 'match');
  assert.equal(find(rows, 10, 'forbidden', '가짜 토큰').result, 'match');
  assert.equal(rows.filter((row) => row.result === 'mismatch').length, 0);
});

test('토큰이 없으면 로그인 정상 요청은 보내지 않고 미실행으로 남으며 통과로 바뀌지 않는다', async () => {
  const server = fakeServer();
  const { rows } = await run(server);
  for (const [step, text] of [[3, 'GET /api/notes (로그인)'], [11, '/api/device/status (로그인)'], [12, '/api/war-room (로그인)']]) {
    const row = find(rows, step, 'normal', text);
    assert.equal(row.result, 'not_run', text);
    assert.equal(row.requestId, '없음');
    assert.equal(row.at, '-');
  }
  assert.ok(server.calls.every((call) => !call.auth.includes(TOKEN)));
});

test('토큰이 있으면 읽기 요청만 보내고 정상 요청이 허용되며, 토큰 값은 표 어디에도 없다', async () => {
  const server = fakeServer();
  const { rows, meta } = await run(server, TOKEN);
  assert.equal(find(rows, 3, 'normal', 'GET /api/notes (로그인)').result, 'match');
  assert.match(find(rows, 3, 'normal', 'GET /api/notes (로그인)').observed, /메모 1건\(본문은 기록하지 않음\)/u);
  assert.equal(find(rows, 4, 'forbidden', '내 것이 아닌 ID').result, 'match');
  assert.equal(find(rows, 11, 'normal', '/api/device/status (로그인)').result, 'match');
  const war = find(rows, 12, 'normal', '/api/war-room (로그인)');
  assert.equal(war.result, 'match');
  assert.match(war.observed, /요청 ID r-1/u);
  const table = formatTable(rows, meta);
  assert.ok(!table.includes(TOKEN));
  assert.ok(!table.includes('PUBLIC-KEY'));
  assert.ok(!table.includes('가상"'));
  // 로그인 요청은 모두 GET이라 메모를 바꾸지 않습니다.
  assert.ok(server.calls.filter((call) => call.auth === `Bearer ${TOKEN}`).every((call) => call.method === 'GET'));
});

test('금지 요청에 메모 내용이 보이면 기대와 다름으로 남는다', async () => {
  const { rows } = await run(fakeServer({ leakList: true }));
  const list = find(rows, 3, 'forbidden', 'GET /api/notes (로그인 없음)');
  assert.equal(list.result, 'mismatch');
  assert.match(list.observed, /메모 내용이 보임/u);
});

test('기기 API가 로그인 없이 200을 주면 기대와 다름으로 남는다', async () => {
  const { rows } = await run(fakeServer({ openDevice: true }));
  assert.equal(find(rows, 11, 'forbidden', '/api/device/status').result, 'mismatch');
});

test('응답을 받지 못한 요청은 일치로 세지 않고 미실행(측정 못 함)으로 남는다', async () => {
  const { rows } = await run(fakeServer({ down: true }));
  const apiRows = rows.filter((row) => row.basis === 'api');
  assert.ok(apiRows.length > 0);
  assert.ok(apiRows.every((row) => row.result === 'not_run'));
  assert.equal(summarize(rows).api.match, 0);
});

test('로컬 연습 줄은 근거가 로컬 연습이고 판정기 응답 형식과 규칙 이름까지 확인한다', async () => {
  const { rows } = await run(fakeServer());
  const local = rows.filter((row) => row.basis === 'local');
  assert.ok(local.length >= 9);
  assert.ok(local.every((row) => row.result === 'match'), JSON.stringify(local.filter((row) => row.result !== 'match')));
  const unregistered = find(rows, 6, 'forbidden', '미등록 기기');
  assert.match(unregistered.observed, /deny\/device_not_registered/u);
  assert.match(unregistered.requestId, /^local:[0-9a-f-]{36}$/u);
  assert.match(find(rows, 9, 'forbidden', '121건').observed, /propose_revocation\/burst_read/u);
});

test('실행하지 않은 시험과 41종 총공세는 어떤 줄에서도 일치나 통과로 표시하지 않는다', async () => {
  const { rows, meta } = await run(fakeServer());
  const unrun = rows.filter((row) => row.result === 'not_run');
  assert.ok(unrun.length >= 8);
  for (const row of unrun) {
    assert.match(row.observed, /^미실행 \(|요청 실패/u);
    assert.equal(row.requestId, '없음');
  }
  const table = formatTable(rows, meta);
  assert.match(table, /총공세 41종: 41종 목록이 이 저장소에 없고 실행한 적이 없어/u);
  assert.match(table, /통과로 표시하지 않습니다/u);
  assert.doesNotMatch(table, /41종[^\n]*(?:통과함|모두 통과|일치)/u);
  assert.match(table, /심판의 판정이 아니고/u);
});

test('표 끝에 정상·금지 요청의 실측이 없는 단계를 알려 준다', async () => {
  const { rows, meta } = await run(fakeServer());
  const sum = summarize(rows);
  // 토큰이 없으면 2·4단계는 정상 요청 실측이 없고, 9·10단계 금지 요청과 달리 2단계 정상은 화면에서만 확인할 수 있습니다.
  assert.ok(sum.noNormal.includes(2));
  assert.ok(sum.noNormal.includes(4));
  assert.ok(!sum.noForbidden.includes(3));
  assert.match(formatTable(rows, meta), /실측 결과가 없는 칸 — 정상 요청: .*단계 · 금지 요청: /u);
});

test('표는 열 아홉 개의 한 표이고 배포본 커밋과 요청 ID·확인 시각이 들어 있다', async () => {
  const { rows, meta } = await run(fakeServer(), TOKEN);
  assert.equal(meta.commit, COMMIT);
  const table = formatTable(rows, meta);
  assert.match(table, /배포본 커밋: abcdef012345/u);
  const lines = table.split('\n').filter((line) => line.startsWith('| '));
  assert.equal(lines.length, rows.length + 2);
  for (const line of lines) assert.equal(line.split('|').length - 2, 9, line);
  assert.match(lines[0], /단계 \| 구분 \| 요청 \| 기대 결과 \| 실제 결과 \| 판정 \| 근거 \| 요청 ID \| 확인 시각/u);
});

test('잘못된 배포 주소나 토큰 형식은 요청을 보내기 전에 멈춘다', async () => {
  const server = fakeServer();
  await assert.rejects(runRecon({ config: { ...config, publicAppUrl: 'http://x.example/' }, fetchImpl: server.fetchImpl }), /실제 배포 주소/u);
  await assert.rejects(runRecon({ config, fetchImpl: server.fetchImpl, token: 'bad token' }), /형식이 맞지 않습니다/u);
  assert.equal(server.calls.length, 0);
});
