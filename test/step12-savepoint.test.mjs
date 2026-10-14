import assert from 'node:assert/strict';
import { test } from 'node:test';
import config from '../aleph.config.json' with { type: 'json' };
import { deploymentIdentity } from '../scripts/deployment-identity.mjs';
import { RULE_IDS } from '../src/decider.mjs';
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
      origin: target.origin, queryAttackId: target.searchParams.get('attackId'), query: target.search, optionAttackId: init.attackId });
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
    assert.match(byId.static_data_json, /^GET \/data\.json → HTTP 404, 메모 내용 없음 \[요청 ID [0-9a-f-]{36}\]$/u);
    assert.match(byId.anonymous_list, /GET \/api\/notes → HTTP 401, 메모 내용 없음/u);
    assert.match(byId.resource_id_header, /^GET \/api\/notes → HTTP 401, X-Resource-Id notes\.own \[요청 ID [0-9a-f-]{36}\]$/u);
    assert.equal(byId.instructor_notice_edit, 'not_run');
    assert.match(byId.decider_zone_rules, /^미실행 \(확인 불가: /u);
    assert.match(byId.detect_compound_revocation, /^미실행 \(확인 불가: /u);
    assert.match(byId.unusual_access_step_up, /^미실행 \(확인 불가: /u);
    for (const id of ['logged_in_a_crud', 'other_user_access', 'owner_change', 'unregistered_device', 'restore_other_user', 'unapproved_device_notes']) {
      assert.match(byId[id], /^미실행/u, id);
    }
    assert.equal(byId.restore_without_login, 'not_run');
    assert.match(byId.app_install_not_trusted, /manifest\.webmanifest → HTTP 200 \(standalone, 아이콘 192x192·512x512\)/u);
    assert.match(byId.app_install_not_trusted, /브라우저 저장소 사용 없음, 로그인 세션 메모리 보관/u);
    assert.match(byId.forged_device_approval, /^GET \/api\/device\/status → HTTP 401, GET \/api\/war-room → HTTP 401, 가짜 토큰 GET \/api\/war-room → HTTP 401, 메모 내용 없음 \[요청 ID [0-9a-f-]{36}, [0-9a-f-]{36}, [0-9a-f-]{36}\]; 가짜 토큰 POST \/api\/device\/register → not_run$/u);
    assert.ok(sent.includes('GET https://student-defense.vercel.app/api/war-room'));
    // 실행 기록 대조(심판 조건을 흉내 냄): 결과를 적은 점검마다 그 attackId로 보낸 요청이 있고, observed에 적은 요청 ID가 그 요청들의 ID와 같습니다.
    // 요청을 보내지 않은 점검(not_run·미실행)에는 그 attackId로 보낸 요청이 없습니다.
    for (const record of records) {
      assert.equal(record.alephAttackId, record.attackId);
      assert.equal(record.optionAttackId, record.attackId);
      // 본인 앱 주소로 가는 요청은 요청 주소에도 같은 attackId를 싣고, Supabase 직접 읽기에는 쿼리를 붙이지 않습니다(붙이면 400).
      if (record.origin === 'https://student-defense.vercel.app') assert.equal(record.queryAttackId, record.attackId, record.attackId);
      else assert.equal(record.query, '', `${record.origin}에는 쿼리를 붙이지 않음`);
      assert.match(record.requestId ?? '', /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u);
      assert.ok(record.attackId in byId, `결과에 없는 attackId로 보낸 요청: ${record.attackId}`);
    }
    assert.equal(new Set(records.map((record) => record.requestId)).size, records.length);
    for (const { attackId, observed } of results) {
      const mine = records.filter((record) => record.attackId === attackId).map((record) => record.requestId).sort();
      if (observed === 'not_run' || observed.startsWith('미실행')) {
        assert.equal(mine.length, 0, `${attackId}: 미실행인데 요청 기록이 있음`);
        continue;
      }
      assert.ok(mine.length > 0, `${attackId}: 그 attackId로 보낸 요청 기록이 없음`);
      assert.deepEqual((observed.match(/\[요청 ID ([^\]]+)\]/u)?.[1].split(', ') ?? []).sort(), mine, attackId);
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
    assert.match(byId.app_install_not_trusted, /manifest\.webmanifest → HTTP 404; GET \/ → HTTP 200, 브라우저 저장소 사용 있음, 로그인 세션 저장소 보관 가능/u);
  } finally {
    globalThis.fetch = realFetch;
  }
});
