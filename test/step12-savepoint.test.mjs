import assert from 'node:assert/strict';
import { test } from 'node:test';
import config from '../aleph.config.json' with { type: 'json' };
import { deploymentIdentity } from '../scripts/deployment-identity.mjs';
import { RULE_IDS } from '../src/decider.mjs';
import { createHash } from 'node:crypto';
import { base64Url, redactSource, runAttackChecks, packDiag, runtimeDiag } from '../src/attack-check.mjs';

const env = {
  VERCEL_GIT_PROVIDER: 'github',
  VERCEL_GIT_REPO_OWNER: 'Student-A',
  VERCEL_GIT_REPO_SLUG: 'aleph-defense',
  VERCEL_GIT_COMMIT_SHA: 'a'.repeat(40),
  VERCEL_URL: 'student-defense-123.vercel.app',
};

test('저장소의 설정은 12단계이고 빌드 식별이 허용 경로·원본 주소·복원 경로를 싣는다', () => {
  assert.equal(config.step, 12);
  const identity = deploymentIdentity(env, config);
  assert.equal(identity.step, 12);
  assert.equal(identity.restoreRoute, 'POST /api/restore/note');
  assert.ok(!config.allowedRoutes.includes(config.restoreRoute));
  assert.deepEqual(identity.allowedRoutes, config.allowedRoutes);
  assert.equal(identity.originalApiUrl, config.originalApiUrl);
  assert.throws(() => deploymentIdentity(env, { ...config, step: 13 }));
  assert.equal(deploymentIdentity(env, { ...config, step: 11 }).step, 11);
  for (const restoreRoute of [null, 'GET /api/restore/note', 'POST https://x.example/api', 'POST /api/restore/note?x=1']) {
    assert.throws(() => deploymentIdentity(env, { ...config, restoreRoute }), /restoreRoute/u);
  }
  assert.equal(deploymentIdentity(env, { ...config, step: 9, restoreRoute: null }).restoreRoute, undefined);
});

test('RULE_IDS에는 구현한 규칙 이름만 있다(11·12단계는 판정기 규칙을 더하지 않음)', () => {
  assert.deepEqual(RULE_IDS, ['starter.deny', 'device_registered', 'step_up_required', 'own_notes_zone', 'instructor_notice_zone']);
});

// 가짜 fetch만 씁니다. 실제 배포 주소·Supabase에는 요청을 보내지 않습니다.
test('12단계 자기 점검은 20개 안에서 모양이 맞고, GET만 보내며 결과를 적은 점검은 실행 기록과 맞는다', async () => {
  const realFetch = globalThis.fetch;
  const sent = [];
  const records = [];
  const denied = () => new Response('{"error":"LOGIN_REQUIRED"}', { status: 401, headers: { 'x-resource-id': 'notes.own' } });
  globalThis.fetch = async (url, init = {}) => {
    const target = new URL(String(url));
    sent.push(`${init.method ?? 'GET'} ${target.origin}${target.pathname}`);
    const headers = init.headers ?? {};
    records.push({ attackId: headers['x-attack-id'], alephAttackId: headers['x-aleph-attack-id'], requestId: headers['x-request-id'],
      origin: target.origin, path: target.pathname, queryAttackId: target.searchParams.get('attackId'), query: target.search, optionAttackId: init.attackId });
    if (target.pathname === '/api/config') return Response.json({ url: 'https://example-project.supabase.co', key: 'public-placeholder' });
    if (target.pathname.startsWith('/api/notices')) return new Response(null, { status: 404 });
    if (target.pathname === '/manifest.webmanifest') {
      return Response.json({ name: 'BYTE BACK 내 자료실', display: 'standalone', icons: [{ sizes: '192x192' }, { sizes: '512x512' }] });
    }
    if (target.pathname === '/') {
      return new Response("<!-- localStorage에 두지 않음 -->\n<script>\n// localStorage 설명 주석\ncreateClient(u, k, { auth: { persistSession: false } });\n</script>", { status: 200 });
    }
    if (target.pathname.startsWith('/api/device/')) return new Response('{"error":"LOGIN_REQUIRED"}', { status: 401, headers: { 'x-resource-id': 'devices.own' } });
    if (target.pathname === '/api/war-room') return new Response('{"error":"LOGIN_REQUIRED"}', { status: 401, headers: { 'x-resource-id': 'warroom.own' } });
    if (target.pathname === '/api/restore/note' || target.pathname.startsWith('/api/notes')) return denied();
    if (target.pathname === '/data.json') return new Response(null, { status: 404 });
    return new Response('{"code":"42501"}', { status: 401 });
  };
  try {
    const results = await runAttackChecks({ ...config, publicAppUrl: 'https://student-defense.vercel.app/' });
    assert.equal(results.length, 20);
    assert.equal(new Set(results.map(item => item.attackId)).size, results.length);
    for (const item of results) {
      assert.equal(Object.keys(item).sort().join(), 'attackId,expected,observed');
      assert.ok(item.observed.length <= 300 && item.expected.length <= 300, item.attackId);
    }
    const byId = Object.fromEntries(results.map(item => [item.attackId, item.observed]));
    assert.equal(byId.anonymous_write, 'not_run');
    const host = 'https://student-defense.vercel.app';
    const sha16 = (text) => createHash('sha256').update(text).digest('hex').slice(0, 16);
    assert.match(byId.static_data_json, new RegExp(`^GET ${host}/data\\.json → HTTP 404 sha256:${sha16('')} req:[0-9a-f-]{36}, 메모 내용 없음$`, 'u'));
    assert.match(byId.anonymous_list, new RegExp(`GET ${host}/api/notes → HTTP 401 sha256:${sha16('{"error":"LOGIN_REQUIRED"}')} req:[0-9a-f-]{36}, 메모 내용 없음$`, 'u'));
    assert.match(byId.anonymous_read_one, new RegExp(`^GET ${host}/api/notes/11111111-1111-4111-8111-111111111111 → HTTP 401 sha256:`, 'u'));
    assert.match(byId.fake_token_list, /^가짜 토큰 GET https:\/\/student-defense\.vercel\.app\/api\/notes → HTTP 401 sha256:/u);
    assert.match(byId.anon_data_api_read, new RegExp(`^GET ${host}/api/config → HTTP 200 sha256:[0-9a-f]{8,16}.*anon GET https://example-project\\.supabase\\.co/rest/v1/notes|anon GET https://eyrodbkzyapsuiudjjft\\.supabase\\.co/rest/v1/notes → HTTP 401`, 'u'));
    assert.match(byId.resource_id_header, new RegExp(`^GET ${host}/api/notes → HTTP 401 sha256:[0-9a-f]{16} req:[0-9a-f-]{36}, X-Resource-Id notes\\.own$`, 'u'));
    assert.equal(byId.instructor_notice_edit, 'not_run');
    assert.match(byId.decider_zone_rules, /^미실행 \(확인 불가: /u);
    assert.match(byId.detect_compound_revocation, /^미실행 \(확인 불가: /u);
    assert.match(byId.unusual_access_step_up, /^미실행 \(확인 불가: /u);
    for (const id of ['logged_in_a_crud', 'other_user_access', 'owner_change', 'unregistered_device', 'restore_other_user', 'unapproved_device_notes']) {
      assert.match(byId[id], /^미실행/u, id);
    }
    assert.equal(byId.restore_without_login, 'not_run');
    assert.match(byId.app_install_not_trusted, /manifest\.webmanifest → HTTP 200 \(standalone, 아이콘 192x192·512x512\) sha256:/u);
    assert.match(byId.app_install_not_trusted, /GET https:\/\/student-defense\.vercel\.app\/ → HTTP 200, 브라우저 저장소 사용 없음, 로그인 세션 메모리 보관 sha256:/u);
    assert.match(byId.forged_device_approval, /^GET https:\/\/student-defense\.vercel\.app\/api\/device\/status → HTTP 401 sha256:[0-9a-f]{8,16}.*, GET https:\/\/student-defense\.vercel\.app\/api\/war-room → HTTP 401 sha256:[0-9a-f]{8,16}.*, 메모 내용 없음$/u);
    assert.ok(!byId.forged_device_approval.includes('POST'));
    assert.ok(sent.includes('GET https://student-defense.vercel.app/api/war-room'));
    // 실행 기록 대조(심판 조건을 흉내 냄): 결과를 적은 점검마다 그 attackId로 보낸 요청이 있고, observed에 적은 주소·요청 ID가 그 요청들과 같습니다.
    // 요청을 보내지 않은 점검(not_run·미실행)에는 그 attackId로 보낸 요청이 없습니다.
    for (const record of records) {
      assert.equal(record.alephAttackId, record.attackId);
      assert.equal(record.optionAttackId, record.attackId);
      // 본인 앱 주소로 가는 요청은 요청 주소에도 같은 attackId를 싣고, Supabase 직접 읽기에는 쿼리를 붙이지 않습니다(붙이면 400).
      if (record.origin === host) assert.equal(record.queryAttackId, record.attackId, record.attackId);
      else assert.equal(record.query, '', `${record.origin}에는 쿼리를 붙이지 않음`);
      assert.match(record.requestId ?? '', /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u);
      assert.ok(record.attackId in byId || record.attackId === 'diag_env', `결과에 없는 attackId로 보낸 요청: ${record.attackId}`);
    }
    assert.equal(new Set(records.map((record) => record.requestId)).size, records.length);
    for (const { attackId, observed } of results) {
      const mine = records.filter((record) => record.attackId === attackId);
      if (observed === 'not_run' || observed.startsWith('미실행')) {
        assert.equal(mine.length, 0, `${attackId}: 미실행인데 요청 기록이 있음`);
        continue;
      }
      assert.ok(mine.length > 0, `${attackId}: 그 attackId로 보낸 요청 기록이 없음`);
      for (const [, id] of observed.matchAll(/req:([0-9a-f-]{36})/gu)) {
        assert.ok(mine.some((record) => record.requestId === id), `${attackId}: observed의 요청 ID가 그 점검의 요청이 아님`);
      }
      for (const [, url] of observed.matchAll(/GET (https:\/\/[^\s,]+)/gu)) {
        assert.ok(mine.some((record) => `${record.origin}${record.path}` === url), `${attackId}: observed의 주소가 실제 요청과 다름: ${url}`);
      }
      assert.equal([...observed.matchAll(/→ HTTP (\d{3})/gu)].length, mine.length, `${attackId}: observed의 요청 수와 기록이 다름`);
    }
    // 격리 환경 규칙: 공개 HTTPS 주소로 보내는 GET·HEAD만 보냅니다.
    assert.ok(sent.every(line => /^(GET|HEAD) https:\/\//u.test(line)), sent.join('\n'));
    // 로그인한 계정으로 보낸 요청이 없어야 합니다: 가짜 토큰 요청 말고는 Authorization을 쓰지 않습니다.
    assert.ok(sent.every(line => /student-defense\.vercel\.app|supabase\.co/u.test(line)));
  } finally {
    globalThis.fetch = realFetch;
  }
});

test('첫 화면이 브라우저 저장소를 쓰면 자기 점검이 그대로 적는다', async () => {
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    const { pathname } = new URL(String(url));
    if (pathname === '/') return new Response('<script>localStorage.setItem("t", "x")</script>', { status: 200 });
    if (pathname === '/manifest.webmanifest') return new Response(null, { status: 404 });
    if (pathname === '/api/config') return Response.json({});
    return new Response(null, { status: pathname === '/data.json' || pathname.startsWith('/api/notices') ? 404 : 401 });
  };
  try {
    const byId = Object.fromEntries((await runAttackChecks({ ...config, publicAppUrl: 'https://student-defense.vercel.app/' }))
      .map(item => [item.attackId, item.observed]));
    assert.match(byId.app_install_not_trusted, /manifest\.webmanifest → HTTP 404 sha256:[0-9a-f]{8,16}.*GET https:\/\/student-defense\.vercel\.app\/ → HTTP 200, 브라우저 저장소 사용 있음, 로그인 세션 저장소 보관 가능 sha256:/u);
  } finally {
    globalThis.fetch = realFetch;
  }
});

// 심판의 격리 환경은 URL의 searchParams를 제공하지 않습니다(`url.searchParams.set`에서 "Cannot read properties of undefined (reading 'set')" 오류).
// 그런 URL로도 점검이 끝까지 돌고, 쿼리는 주소 문자열에 직접 붙는지 확인합니다.
test('URL에 searchParams가 없어도 자기 점검이 끝까지 돌고 쿼리를 주소에 직접 붙인다', async () => {
  const realFetch = globalThis.fetch;
  const NativeURL = globalThis.URL;
  const urls = [];
  globalThis.URL = class NoSearchParamsURL extends NativeURL {
    get searchParams() { return undefined; }
  };
  globalThis.fetch = async (url) => {
    urls.push(String(url));
    const { pathname } = new NativeURL(String(url));
    if (pathname === '/api/config') return Response.json({ key: 'public-placeholder' });
    if (pathname === '/manifest.webmanifest') return Response.json({ display: 'standalone', icons: [{ sizes: '192x192' }] });
    if (pathname === '/') return new Response('createClient(u, k, { auth: { persistSession: false } });', { status: 200 });
    if (pathname === '/data.json') return new Response(null, { status: 404 });
    return new Response('{"error":"LOGIN_REQUIRED"}', { status: 401, headers: { 'x-resource-id': 'notes.own' } });
  };
  try {
    const results = await runAttackChecks({ ...config, publicAppUrl: 'https://student-defense.vercel.app/' });
    assert.equal(results.length, 20);
    const own = urls.filter((url) => url.startsWith('https://student-defense.vercel.app'));
    assert.ok(own.length > 0 && own.every((url) => /[?&]attackId=[a-z0-9_]+$/u.test(url)), own.join('\n'));
    assert.ok(urls.filter((url) => !url.startsWith('https://student-defense.vercel.app')).every((url) => !url.includes('?')));
  } finally {
    globalThis.URL = NativeURL;
    globalThis.fetch = realFetch;
  }
});

// 11차: 심판의 fetch가 호스트로 넘기는 옵션은 alephEvidence뿐이라, 점검마다 다른 형식으로 싣고 형식 시험은 점검 결과에 섞이지 않게 보냅니다.
const respondFor = (url) => {
  const { pathname } = new URL(String(url));
  if (pathname === '/api/config') return Response.json({ key: 'public-placeholder' });
  if (pathname === '/manifest.webmanifest') return Response.json({ display: 'standalone', icons: [{ sizes: '192x192' }] });
  if (pathname === '/') return new Response('createClient(u, k, { auth: { persistSession: false } });', { status: 200 });
  if (pathname === '/data.json') return new Response(null, { status: 404 });
  return new Response('{"error":"LOGIN_REQUIRED"}', { status: 401, headers: { 'x-resource-id': 'notes.own' } });
};

test('alephEvidence는 점검마다 정해진 형식으로 실리고, 형식 시험은 점검 결과에 섞이지 않으며, 호스트가 거부하면 없이 다시 보낸다', async () => {
  const realFetch = globalThis.fetch;
  const calls = [];
  let rejectObjects = false;
  globalThis.fetch = async (url, init = {}) => {
    calls.push({ attackId: init.attackId, evidence: init.alephEvidence, method: init.method, src: init.headers?.['x-diag-src'] });
    if (rejectObjects && init.alephEvidence !== undefined && typeof init.alephEvidence === 'object') throw new Error('alephEvidence 형식 거부 모의');
    return respondFor(url);
  };
  try {
    const results = await runAttackChecks({ ...config, publicAppUrl: 'https://student-defense.vercel.app/' });
    assert.equal(results.length, 20);
    assert.ok(results.every((item) => item.attackId !== 'diag_env'));
    assert.ok(calls.every((call) => call.method === 'GET'));
    const evidenceOf = (id) => calls.find((call) => call.attackId === id && call.evidence !== undefined)?.evidence;
    assert.equal(evidenceOf('static_data_json'), 'static_data_json');
    assert.deepEqual(evidenceOf('anonymous_list'), { attackId: 'anonymous_list' });
    const request = evidenceOf('anonymous_read_one');
    assert.equal(request.attackId, 'anonymous_read_one');
    assert.match(request.requestId, /^[0-9a-f-]{36}$/u);
    assert.deepEqual(evidenceOf('fake_token_list'), { id: 'fake_token_list' });
    // 형식 시험: 여섯 가지 값을 보낸 뒤 결과 글을 base64url 조각으로 서버 기록용 헤더에 싣습니다.
    const forms = calls.filter((call) => call.attackId === 'diag_env' && call.evidence !== undefined);
    assert.deepEqual(forms.map((call) => call.evidence), ['diag_env', { attackId: 'diag_env' }, 1, {}, { unknownKey: 1 }, ['diag_env']]);
    const chunks = calls.filter((call) => call.src);
    assert.ok(chunks.length >= 1 && chunks.length <= 3);
    assert.ok(chunks.every((call) => /^[1-3]\.[1-3]\.[A-Za-z0-9_-]+$/u.test(call.src)));
    const text = Buffer.from(chunks[0].src.split('.')[2].replace(/-/gu, '+').replace(/_/gu, '/'), 'base64').toString('utf8');
    assert.match(text, /str=ok200/u);

    calls.length = 0;
    rejectObjects = true;
    const again = await runAttackChecks({ ...config, publicAppUrl: 'https://student-defense.vercel.app/' });
    assert.equal(again.length, 20, '호스트가 형식을 거부해도 점검은 끝까지 돈다');
    assert.ok(calls.some((call) => call.attackId === 'anonymous_list' && call.evidence === undefined), '거부되면 evidence 없이 다시 보냄');
    const note = Buffer.from(calls.find((call) => call.src).src.split('.')[2].replace(/-/gu, '+').replace(/_/gu, '/'), 'base64').toString('utf8');
    assert.match(note, /anonymous_list:object:.*거부 모의/u);
    assert.match(note, /obj=.*거부 모의/u);
  } finally {
    globalThis.fetch = realFetch;
  }
});

test('환경 진단은 응답·fetch·process·console·URL 인스턴스의 속성 이름과 자료형을 담되 값은 담지 않는다', () => {
  const response = Object.assign(Object.create(null), { status: 200, ok: true, headers: { get() {} }, text() {}, secretToken: 'LEAK' });
  const diag = runtimeDiag(response);
  for (const key of ['resp.keys=', 'resp.proto=', 'resp.hdr.keys=', 'fetch.keys=', 'process.keys=', 'console.keys=', 'abort.keys=', 'url.inst=', 'globals=']) {
    assert.ok(diag.includes(key), key);
  }
  for (const entry of ['status:number', 'ok:boolean', 'text:function', 'headers:object']) assert.match(diag, new RegExp(`resp\\.keys=[^;]*${entry}`, 'u'));
  assert.ok(!diag.includes('LEAK') && !diag.includes('secretToken'), '값과 비밀 이름은 담지 않음');
  assert.match(diag, /resp\.hdr\.keys=get:function/u);
  assert.ok(diag.indexOf('globals=') > diag.indexOf('url.inst='), '긴 globals는 맨 뒤');
  assert.ok(diag.length <= 4000);
  assert.match(diag, /^[A-Za-z0-9_$.,;=:?-]+$/u);
  assert.ok(!diag.includes(process.env.PATH ?? '\u0000'), '환경변수 값은 담지 않음');
});

// 9차: 심판 응답 객체에는 headers.get만 있어 목록을 볼 수 없으므로, 후보 이름을 get으로 물어 값이 있는 것만 기록합니다.
test('환경 진단의 응답 헤더 탐색은 값이 있는 후보만 안전한 글자로 기록하고, get만 있는 일반 객체 응답에서도 동작한다', () => {
  const store = { 'x-aleph-request-id': 'rec_123', 'content-type': 'application/json; charset=utf-8', 'x-vercel-id': 'sin1::abc-123' };
  const response = { status: 200, ok: true, text() {}, json() {}, headers: { get: (name) => store[name] ?? null } };
  const diag = runtimeDiag(response);
  const part = (key) => diag.match(new RegExp(`(?:^|;)${key.replace(/\./gu, '\\.')}=([^;]*)`, 'u'))?.[1];
  assert.equal(part('resp.get'), 'content-type:application?json??charset?utf-8,x-vercel-id:sin1::abc-123,x-aleph-request-id:rec_123');
  assert.equal(part('resp.hdr'), 'get');
  assert.match(part('resp.keys'), /headers:object/u);
  const none = runtimeDiag({ headers: { get: () => null } });
  assert.match(none, /resp\.get=;/u);
  assert.doesNotThrow(() => runtimeDiag({ headers: { get() { throw new Error('금지'); } } }));
  assert.match(runtimeDiag({ headers: { get() { throw new Error('금지'); } } }), /resp\.get=;/u);
});

// 10차: 점검 환경의 fetch·응답 함수 소스를 가려서 남기는 진단(학생 승인). 비밀처럼 보이는 것은 가리고, 글자는 base64url만 씁니다.
test('진단 글은 토큰·긴 문자열·쿼리 값을 가리고, base64url로 되돌릴 수 있으며, 조각은 3개까지다', () => {
  const secretLike = 'Bearer abc.def.ghi eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjMifQ.sig token="' + 'a'.repeat(50) + '" k=' + ['sk', 'live', '1234567890abcdefghij1234'].join('_') + ' url?x=hunter2&y=z';
  const redacted = redactSource('function f(a) { return record(a.attackId, "' + 'b'.repeat(60) + '") ' + secretLike + ' }');
  for (const leak of ['abc.def.ghi', 'eyJhbGci', 'aaaaaaaa', 'bbbbbbbb', ['sk', 'live', '1234567890'].join('_'), 'hunter2']) assert.ok(!redacted.includes(leak), leak);
  assert.ok(redacted.includes('record(a.attackId'), '로직은 남음');
  const sample = 'function (a, b) { return 한글 ~ ok; }';
  const encoded = base64Url(sample);
  assert.match(encoded, /^[A-Za-z0-9_-]+$/u);
  const decoded = Buffer.from(encoded.replace(/-/gu, '+').replace(/_/gu, '/'), 'base64').toString('utf8');
  assert.equal(decoded, sample);
  const chunks = packDiag('fetch=async (url) => { return 1; }');
  assert.equal(chunks.length, 1);
  assert.match(chunks[0], /^1\.1\.[A-Za-z0-9_-]+$/u);
  assert.ok(packDiag('a b '.repeat(5000)).length <= 3);
  assert.deepEqual(packDiag(''), []);
});
