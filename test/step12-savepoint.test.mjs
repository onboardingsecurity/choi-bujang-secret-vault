import assert from 'node:assert/strict';
import { test } from 'node:test';
import config from '../aleph.config.json' with { type: 'json' };
import { deploymentIdentity } from '../scripts/deployment-identity.mjs';
import { RULE_IDS } from '../src/decider.mjs';
import { createHash } from 'node:crypto';
import { runAttackChecks } from '../src/attack-check.mjs';

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

// 12단계 제출 기록은 심판 기록과 연결되지 않은 8건을 미실행으로 적고, 실측은 화면 출력(console.log)에만 남깁니다.
// 시험은 그 출력을 모아 실측 observed를 읽고, 제출 기록(results)의 글과 따로 확인합니다.
const ACTUAL_LINE = /^실측\(제출 기록 아님\) ([a-z0-9_.-]+): ([\s\S]*)$/u;
async function runWithActual(overrides = {}) {
  const logged = [];
  const realLog = console.log;
  console.log = (...args) => { logged.push(args.map(String).join(' ')); };
  try {
    const results = await runAttackChecks({ ...config, publicAppUrl: 'https://student-defense.vercel.app/', ...overrides });
    const actual = Object.fromEntries(logged.map((line) => ACTUAL_LINE.exec(line)).filter(Boolean).map((match) => [match[1], match[2]]));
    return { results, actual, observed: Object.fromEntries(results.map((item) => [item.attackId, actual[item.attackId] ?? item.observed])) };
  } finally {
    console.log = realLog;
  }
}

// 가짜 fetch만 씁니다. 실제 배포 주소·Supabase에는 요청을 보내지 않습니다.
test('12단계 자기 점검은 20개 안에서 모양이 맞고, GET만 보내며 결과를 적은 점검은 실행 기록과 맞는다', async () => {
  const realFetch = globalThis.fetch;
  const sent = [];
  const records = [];
  const denied = () => new Response('{"error":"LOGIN_REQUIRED"}', { status: 401, headers: { 'x-resource-id': 'notes.own' } });
  const respond = (target) => {
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
  globalThis.fetch = async (url, init = {}) => {
    const target = new URL(String(url));
    sent.push(`${init.method ?? 'GET'} ${target.origin}${target.pathname}`);
    const reply = respond(target);
    records.push({ requestId: init.headers?.['x-request-id'], origin: target.origin, path: target.pathname, query: target.search, status: reply.status,
      headerNames: Object.keys(init.headers ?? {}), optionNames: Object.keys(init).sort() });
    return reply;
  };
  try {
    const { results, actual, observed: observedById } = await runWithActual();
    assert.equal(results.length, 20);
    assert.equal(new Set(results.map(item => item.attackId)).size, results.length);
    // 제출 기록: 요청은 보냈으나 심판 기록과 연결되지 않은 8건은 사실대로 미실행입니다(요청을 보내지 않았다는 not_run이 아님).
    const unlinked = ['static_data_json', 'anonymous_list', 'anonymous_read_one', 'fake_token_list', 'anon_data_api_read',
      'resource_id_header', 'app_install_not_trusted', 'forged_device_approval'];
    assert.deepEqual(Object.keys(actual).sort(), [...unlinked].sort());
    for (const item of results) {
      if (!unlinked.includes(item.attackId)) continue;
      assert.match(item.observed, /^미실행 \(요청은 보냈으나 심판이 그 attackId로 보낸 요청 기록을 찾지 못해 결과로 적지 않음/u, item.attackId);
      assert.notEqual(item.observed, 'not_run');
      assert.ok(!/HTTP \d{3}|GET /u.test(item.observed), '제출 기록에는 심판 기록이 뒷받침하지 못하는 결과를 적지 않음');
    }
    for (const item of results) {
      assert.equal(Object.keys(item).sort().join(), 'attackId,expected,observed');
      assert.ok(item.observed.length <= 300 && item.expected.length <= 300, item.attackId);
    }
    const byId = observedById;
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
    // 실행 기록 대조(점검 쪽 확인): 실측 observed에 적은 요청·상태가 실제로 보낸 요청·받은 상태와 하나도 빠짐없이 같고,
    // 요청을 보내지 않은 점검(not_run·미실행)을 위한 요청은 없습니다.
    for (const record of records) {
      assert.match(record.requestId ?? '', /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u);
      assert.deepEqual(record.headerNames.filter((name) => name !== 'apikey' && name !== 'authorization'), ['x-request-id']);
      assert.deepEqual(record.optionNames, ['headers', 'method', 'redirect', 'signal'], '시험용 옵션·표식을 싣지 않음');
      if (record.origin === host) assert.equal(record.query, '', '본인 앱 주소에는 쿼리를 붙이지 않음');
    }
    assert.equal(new Set(records.map((record) => record.requestId)).size, records.length);
    const claimed = Object.values(observedById).flatMap((text) => [...text.matchAll(/GET (https:\/\/[^\s,]+) → HTTP (\d{3})/gu)]
      .map(([, url, status]) => `${url} ${status}`));
    assert.deepEqual(claimed.sort(), records.map((record) => `${record.origin}${record.path} ${record.status}`).sort());
    for (const text of Object.values(observedById)) {
      for (const [, id] of text.matchAll(/req:([0-9a-f-]{36})/gu)) assert.ok(records.some((record) => record.requestId === id), 'observed의 요청 ID가 실제 요청이 아님');
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
    const byId = (await runWithActual()).observed;
    assert.match(byId.app_install_not_trusted, /manifest\.webmanifest → HTTP 404 sha256:[0-9a-f]{8,16}.*GET https:\/\/student-defense\.vercel\.app\/ → HTTP 200, 브라우저 저장소 사용 있음, 로그인 세션 저장소 보관 가능 sha256:/u);
  } finally {
    globalThis.fetch = realFetch;
  }
});

// 심판의 격리 환경은 URL의 searchParams를 제공하지 않습니다(`url.searchParams.set`에서 "Cannot read properties of undefined (reading 'set')" 오류).
// 그런 URL로도 점검이 끝까지 돌고, 주소에 쿼리를 붙이지 않는지 확인합니다.
test('URL에 searchParams가 없어도 자기 점검이 끝까지 돈다', async () => {
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
    assert.ok(urls.length > 0 && urls.every((url) => url.startsWith('https://')));
    assert.ok(urls.filter((url) => url.startsWith('https://student-defense.vercel.app')).every((url) => !url.includes('?')));
  } finally {
    globalThis.URL = NativeURL;
    globalThis.fetch = realFetch;
  }
});
