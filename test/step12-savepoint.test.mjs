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
test('12단계 자기 점검은 20개 안에서 모양이 맞고, 보내지 않은 점검은 미실행·확인 불가로 남는다', async () => {
  const realFetch = globalThis.fetch;
  const sent = [];
  const denied = () => new Response('{"error":"LOGIN_REQUIRED"}', { status: 401, headers: { 'x-resource-id': 'notes.own' } });
  globalThis.fetch = async (url, init = {}) => {
    const target = new URL(String(url));
    sent.push(`${init.method ?? 'GET'} ${target.origin}${target.pathname}`);
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
    assert.match(byId.anonymous_write, /^POST \/api\/notes → HTTP 401, PUT \/api\/notes\/:id → HTTP 401, DELETE \/api\/notes\/:id → HTTP 401, 메모 내용 없음$/u);
    assert.match(byId.anonymous_list, /GET \/api\/notes → HTTP 401, 메모 내용 없음/u);
    assert.match(byId.resource_id_header, /notes\.own/u);
    assert.match(byId.instructor_notice_edit, /HTTP 404/u);
    assert.match(byId.decider_zone_rules, /^확인 불가/u);
    assert.match(byId.detect_compound_revocation, /^확인 불가/u);
    assert.match(byId.unusual_access_step_up, /^확인 불가/u);
    for (const id of ['logged_in_a_crud', 'other_user_access', 'owner_change', 'unregistered_device', 'restore_other_user', 'unapproved_device_notes']) {
      assert.match(byId[id], /^미실행/u, id);
    }
    assert.match(byId.restore_without_login, /^POST \/api\/restore\/note → HTTP 401, 가짜 토큰 POST \/api\/restore\/note → HTTP 401, 메모 내용 없음$/u);
    assert.match(byId.app_install_not_trusted, /manifest\.webmanifest → HTTP 200 \(standalone, 아이콘 192x192·512x512\)/u);
    assert.match(byId.app_install_not_trusted, /브라우저 저장소 사용 없음, 로그인 세션 메모리 보관/u);
    assert.match(byId.forged_device_approval, /^GET \/api\/device\/status → HTTP 401, 가짜 토큰 POST \/api\/device\/register → HTTP 401, GET \/api\/war-room → HTTP 401, 가짜 토큰 GET \/api\/war-room → HTTP 401, 메모 내용 없음$/u);
    assert.ok(sent.includes('GET https://student-defense.vercel.app/api/war-room'));
    assert.ok(sent.includes('POST https://student-defense.vercel.app/api/restore/note'));
    assert.ok(sent.includes('POST https://student-defense.vercel.app/api/device/register'));
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
