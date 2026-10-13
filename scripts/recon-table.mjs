// 12단계: 1~11단계의 정상·금지 요청을 한 표로 남기는 절차입니다. 실행: npm run recon:table
// 표의 한 줄은 요청 하나이고, 기대 결과·실제 결과·요청 ID·확인 시각을 함께 적습니다.
// 판정(일치/다름/미실행)은 이 스크립트가 실제로 보낸 요청의 결과로만 정합니다. 보내지 않은 요청은 「미실행」이고, 통과로 바꾸지 않습니다.
//   근거 「실제 API」: 배포 주소로 실제 요청을 보내 받은 응답(상태 코드·응답 헤더만 기록, 응답 본문은 저장하지 않음)
//   근거 「로컬 연습」: 이 컴퓨터에서 decide()·detect() 등을 가상 요청으로 부른 결과(실제 API 응답이 아니고 심판 판정도 아님)
// 로그인이 필요한 정상 요청은 학생이 자기 셸에서 ALEPH_STUDENT_TOKEN을 직접 넣었을 때만 보냅니다. 이 값은 표·화면·파일 어디에도 쓰지 않습니다.
import { randomUUID } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { decide, RULE_IDS } from '../src/decider.mjs';
import { detect } from '../src/detect.mjs';
import { currentPolicy, diffPolicy, loadSnapshot } from '../src/policy-diff.mjs';
import { fixtureRequests } from './fixture-7.mjs';

const ROOT = resolve(import.meta.dirname, '..');
const PROBE_ID = '11111111-1111-4111-8111-111111111111';
const TOKEN_FORMAT = /^[A-Za-z0-9._-]{20,4096}$/u;
const ID_FORMAT = /^[A-Za-z0-9:_.-]{1,100}$/u;
const FAKE_TOKEN = 'aaa.bbb.ccc';
const NO_TOKEN = '로그인 토큰 없음(ALEPH_STUDENT_TOKEN 미설정)이라 보내지 않음';

const label = { api: '실제 API', local: '로컬 연습', none: '-' };
const resultLabel = { match: '기대와 일치', mismatch: '기대와 다름', not_run: '미실행' };

// ---------- 실제 API 요청 ----------
// 응답에서 상태·자원 ID·요청 ID·오류 코드·메모 내용 노출 여부만 꺼내고 본문은 버립니다. keepText일 때만 본문을 이 한 줄의 판정에 잠깐 씁니다.
async function send(ctx, { method, path, body, auth = 'none', headers: extra = {}, keepText = false, url }) {
  const headers = { ...extra };
  if (body) headers['content-type'] = 'application/json';
  if (auth === 'fake') headers.authorization = `Bearer ${FAKE_TOKEN}`;
  if (auth === 'token') headers.authorization = `Bearer ${ctx.token}`;
  try {
    const response = await ctx.fetchImpl(url ?? new URL(path, ctx.app), {
      method, redirect: 'error', signal: AbortSignal.timeout(10000), headers, body,
    });
    const at = ctx.now().toISOString();
    let text = '';
    try { text = await response.text(); } catch { text = ''; }
    const idHeader = response.headers.get('x-vercel-id') ?? response.headers.get('sb-request-id');
    let errorCode = '';
    try {
      const error = JSON.parse(text)?.error;
      if (typeof error === 'string' && /^[A-Z][A-Z_]{2,40}$/u.test(error)) errorCode = error;
    } catch { /* 본문이 JSON이 아니면 오류 코드는 없음 */ }
    const resourceId = response.headers.get('x-resource-id');
    return {
      failed: false, status: response.status, at,
      requestId: idHeader && ID_FORMAT.test(idHeader) ? `${response.headers.get('x-vercel-id') ? 'vercel' : 'supabase'}:${idHeader}` : '없음',
      resourceId: resourceId && ID_FORMAT.test(resourceId) ? resourceId : null,
      errorCode, leaked: /"(title|body|content)"\s*:/u.test(text), text: keepText ? text : '',
    };
  } catch {
    return { failed: true, at: ctx.now().toISOString() };
  }
}

const describe = (res) => `HTTP ${res.status}${res.resourceId ? ` · X-Resource-Id ${res.resourceId}` : ''}${res.errorCode ? ` · ${res.errorCode}` : ''}${res.leaked ? ' · 메모 내용이 보임' : ''}`;

function apiRow(step, kind, request, expected, res, { ok, observed }) {
  if (res.failed) {
    return { step, kind, request, expected, observed: '요청 실패(응답을 받지 못해 측정하지 못함)', result: 'not_run', basis: 'api', requestId: '없음', at: res.at };
  }
  return { step, kind, request, expected, observed: observed ?? describe(res), result: ok ? 'match' : 'mismatch', basis: 'api', requestId: res.requestId, at: res.at };
}

const notRun = (step, kind, request, expected, reason) => ({
  step, kind, request, expected, observed: `미실행 (${reason})`, result: 'not_run', basis: 'none', requestId: '없음', at: '-',
});

// 금지 요청: 정해진 거부 상태가 와야 하고 메모 내용이 보이면 안 됩니다. 자원 ID를 정한 요청은 그 헤더도 같아야 합니다.
async function forbidden(ctx, { step, method, path, status, auth = 'none', body, resource, request, expected }) {
  const res = await send(ctx, { method, path, body, auth });
  const shown = request ?? `${method} ${path.replace(PROBE_ID, ':id')}${auth === 'fake' ? ' (가짜 토큰)' : auth === 'token' ? ' (로그인)' : ' (로그인 없음)'}`;
  const want = expected ?? `HTTP ${status} 거부, 메모 내용이 보이지 않음${resource ? `, X-Resource-Id ${resource}` : ''}`;
  return apiRow(step, 'forbidden', shown, want, res, { ok: !res.failed && res.status === status && !res.leaked && (!resource || res.resourceId === resource) });
}

async function normal(ctx, { step, method = 'GET', path, status = 200, auth = 'none', request, expected, check, observe }) {
  const res = await send(ctx, { method, path, auth, keepText: Boolean(check || observe) });
  const shown = request ?? `${method} ${path}${auth === 'token' ? ' (로그인)' : ''}`;
  const extra = !res.failed && res.status === status ? (check ? check(res) : true) : false;
  return apiRow(step, 'normal', shown, expected ?? `HTTP ${status}`, res, { ok: !res.failed && res.status === status && extra,
    observed: !res.failed && observe ? `${describe(res)} · ${observe(res)}` : undefined });
}

const parse = (text) => { try { return JSON.parse(text); } catch { return null; } };

async function apiRows(ctx) {
  const { config } = ctx;
  const rows = [];
  const withToken = async (make, step, kind, request, expected) => (ctx.token ? make() : notRun(step, kind, request, expected, NO_TOKEN));
  const randomId = randomUUID();
  const restorePath = typeof config.restoreRoute === 'string' && config.restoreRoute.startsWith('POST /') ? config.restoreRoute.slice(5) : null;
  const note = JSON.stringify({ title: 'x', body: 'y' });

  rows.push(await normal(ctx, { step: 1, path: '/', expected: 'HTTP 200 (첫 화면이 열림)' }));
  rows.push(await forbidden(ctx, { step: 1, method: 'GET', path: '/data.json', status: 404, expected: 'HTTP 404, 공개 가상 메모가 보이지 않음' }));
  {
    const res = await send(ctx, { method: 'GET', path: '/', keepText: true });
    rows.push(apiRow(2, 'forbidden', 'GET / (화면 원본에서 가상 메모 확인 표시 찾기)', '화면 원본에 가상 메모 확인 표시가 없음', res,
      { ok: !res.failed && res.status === 200 && !res.text.includes(config.sampleMarker),
        observed: res.failed ? '' : `HTTP ${res.status} · 확인 표시 ${res.text.includes(config.sampleMarker) ? '있음' : '없음'}` }));
  }
  rows.push(await forbidden(ctx, { step: 3, method: 'GET', path: '/api/notes', status: 401 }));
  rows.push(await forbidden(ctx, { step: 3, method: 'POST', path: '/api/notes', status: 401, body: note }));
  rows.push(await forbidden(ctx, { step: 3, method: 'PUT', path: `/api/notes/${PROBE_ID}`, status: 401, body: note }));
  rows.push(await forbidden(ctx, { step: 3, method: 'DELETE', path: `/api/notes/${PROBE_ID}`, status: 401 }));
  rows.push(await forbidden(ctx, { step: 3, method: 'GET', path: '/api/notes', status: 401, auth: 'fake' }));
  rows.push(await withToken(() => normal(ctx, { step: 3, path: '/api/notes', auth: 'token',
    expected: 'HTTP 200, 내 메모 목록(건수만 기록)',
    check: (res) => Array.isArray(parse(res.text)), observe: (res) => { const list = parse(res.text); return Array.isArray(list) ? `메모 ${list.length}건(본문은 기록하지 않음)` : '목록 형식이 아님'; } }),
  3, 'normal', 'GET /api/notes (로그인)', 'HTTP 200, 내 메모 목록(건수만 기록)'));
  rows.push(notRun(3, 'normal', 'POST·PUT·DELETE /api/notes (로그인)', 'A가 자기 메모를 추가·수정·삭제할 수 있음', '이 절차는 로그인 요청으로 메모를 바꾸지 않음. 학생이 화면에서 확인'));
  rows.push(await withToken(() => forbidden(ctx, { step: 4, method: 'GET', path: `/api/notes/${randomId}`, status: 404, auth: 'token',
    request: 'GET /api/notes/:id (로그인, 내 것이 아닌 ID)', expected: 'HTTP 404, 남의 메모와 없는 메모는 같은 404' }),
  4, 'forbidden', 'GET /api/notes/:id (로그인, 내 것이 아닌 ID)', 'HTTP 404'));
  rows.push(notRun(4, 'forbidden', 'B가 A의 메모를 읽기·수정·삭제', 'HTTP 404, A의 메모는 그대로', '두 계정이 필요해 이 절차는 보내지 않음. 학생이 A·B 시크릿 창에서 확인'));
  rows.push(notRun(4, 'forbidden', '본문에 남의 owner_id를 넣은 추가·수정', 'HTTP 403으로 거부', '로그인 요청으로 메모를 바꿔 보지 않음'));

  // 4·5단계: anon(공개용) 키로 원본 자료 API를 직접 읽습니다. 키는 /api/config가 내려 주는 공개용 값만 씁니다.
  {
    const settings = await send(ctx, { method: 'GET', path: '/api/config', keepText: true });
    const key = settings.failed ? null : parse(settings.text)?.key;
    const direct = async (step, request, url) => {
      if (typeof key !== 'string' || !key) return notRun(step, 'forbidden', request, 'HTTP 401/403, 메모 내용 없음', '공개용 키를 받지 못함');
      const res = await send(ctx, { method: 'GET', url, headers: { apikey: key } });
      return apiRow(step, 'forbidden', request, 'HTTP 401 또는 403, 메모 내용이 보이지 않음', res, { ok: !res.failed && [401, 403].includes(res.status) && !res.leaked });
    };
    rows.push(await direct(4, 'GET Supabase /rest/v1/notes?select=* (anon 키)', new URL('/rest/v1/notes?select=*', new URL(config.identityProvider.issuer).origin)));
    rows.push(await direct(5, 'GET originalApiUrl (anon 키)', new URL(config.originalApiUrl)));
  }
  {
    const res = await send(ctx, { method: 'GET', path: '/aleph.json', keepText: true });
    const info = res.failed ? null : parse(res.text);
    if (info && typeof info.commit === 'string' && /^[0-9a-f]{40}$/u.test(info.commit)) ctx.deployed = { step: info.step, commit: info.commit };
    rows.push(apiRow(5, 'normal', 'GET /aleph.json', `HTTP 200, originalApiUrl이 ${new URL(config.originalApiUrl).pathname} 주소로 실려 있음`, res,
      { ok: !res.failed && res.status === 200 && info?.originalApiUrl === config.originalApiUrl,
        observed: res.failed ? '' : `HTTP ${res.status} · step ${info?.step ?? '없음'} · 배포 커밋 ${ctx.deployed ? ctx.deployed.commit.slice(0, 7) : '없음'} · originalApiUrl ${info?.originalApiUrl === config.originalApiUrl ? '있음' : '없음'}` }));
  }
  rows.push(await forbidden(ctx, { step: 8, method: 'GET', path: `/api/notes/${PROBE_ID}`, status: 401, resource: 'notes.own' }));
  rows.push(restorePath
    ? await forbidden(ctx, { step: 10, method: 'POST', path: restorePath, status: 401, body: JSON.stringify({ id: PROBE_ID, title: 'x', body: 'y' }) })
    : notRun(10, 'forbidden', 'POST 복원 경로 (로그인 없음)', 'HTTP 401', 'aleph.config.json에 restoreRoute가 없음'));
  rows.push(restorePath
    ? await forbidden(ctx, { step: 10, method: 'POST', path: restorePath, status: 401, auth: 'fake', body: JSON.stringify({ id: PROBE_ID, title: 'x', body: 'y' }) })
    : notRun(10, 'forbidden', 'POST 복원 경로 (가짜 토큰)', 'HTTP 401', 'aleph.config.json에 restoreRoute가 없음'));
  rows.push(notRun(10, 'forbidden', '사본 소유자가 아닌 로그인 계정의 복원 요청', 'HTTP 404, 다른 메모는 그대로', '두 계정이 필요해 이 절차는 보내지 않음'));
  rows.push(await normal(ctx, { step: 11, path: '/manifest.webmanifest', expected: 'HTTP 200 (설치용 설정이 열림)' }));
  rows.push(await normal(ctx, { step: 11, path: '/offline.html', expected: 'HTTP 200 (오프라인 안내가 열림)' }));
  rows.push(await forbidden(ctx, { step: 11, method: 'GET', path: '/api/device/status', status: 401, resource: 'devices.own' }));
  rows.push(await forbidden(ctx, { step: 11, method: 'POST', path: '/api/device/register', status: 401, auth: 'fake',
    body: JSON.stringify({ label: 'x', credential: {}, status: 'approved' }), resource: 'devices.own',
    request: 'POST /api/device/register (가짜 토큰, 승인된 척하는 본문)' }));
  rows.push(await withToken(() => normal(ctx, { step: 11, path: '/api/device/status', auth: 'token', expected: 'HTTP 200, 내 기기 상태(개수만 기록)',
    check: (res) => Array.isArray(parse(res.text)?.devices),
    observe: (res) => { const body = parse(res.text); return `기기 ${body?.devices?.length ?? '?'}개 · 이 세션 확인 ${body?.sessionVerified === true ? '됨' : '안 됨'}`; } }),
  11, 'normal', 'GET /api/device/status (로그인)', 'HTTP 200'));
  rows.push(notRun(11, 'forbidden', '승인 전·회수 뒤 로그인의 메모 요청', 'HTTP 403, 메모 내용 없음', '기기 승인 상태에 달려 있어 이 절차는 보내지 않음. 학생이 화면에서 확인'));
  rows.push(await forbidden(ctx, { step: 12, method: 'GET', path: '/api/war-room', status: 401, resource: 'warroom.own' }));
  rows.push(await withToken(() => normal(ctx, { step: 12, path: '/api/war-room', auth: 'token', expected: 'HTTP 200, 요약과 서버 기록 줄(war_room_view)',
    check: (res) => typeof parse(res.text)?.logLine === 'string' && parse(res.text).logLine.startsWith('war_room_view request='),
    observe: (res) => `요청 ID ${parse(res.text)?.requestId ?? '없음'}` }),
  12, 'normal', 'GET /api/war-room (로그인)', 'HTTP 200'));
  return rows;
}

// ---------- 로컬 연습 ----------
const reads = (count) => Array.from({ length: count }, (_, index) => ({
  at: new Date(Date.UTC(2026, 9, 1) + index * 2000).toISOString(), method: 'GET', identity: { sub: 'learner_fixture' },
}));

async function localRows(ctx) {
  const { normal: ordinary, suspicious } = fixtureRequests();
  const rows = [];
  const decided = async (step, kind, request, text, expected, want) => {
    const at = ctx.now().toISOString();
    try {
      const res = await decide(request);
      const valid = res?.requestId === request.requestId && Array.isArray(res.ruleIds) && res.ruleIds.length > 0 && res.ruleIds.every((id) => RULE_IDS.includes(id));
      const ok = valid && res.decision === want.decision && (!want.reasonCode || res.reasonCode === want.reasonCode);
      rows.push({ step, kind, request: text, expected, observed: `${res.decision}/${res.reasonCode} · ruleIds ${res.ruleIds.join(',')}${valid ? '' : ' · 응답 형식이 맞지 않음'}`,
        result: ok ? 'match' : 'mismatch', basis: 'local', requestId: `local:${request.requestId}`, at });
    } catch {
      rows.push({ step, kind, request: text, expected, observed: 'decide()가 오류를 냄', result: 'mismatch', basis: 'local', requestId: `local:${request.requestId}`, at });
    }
  };
  const again = (patch) => ({ ...ordinary, requestId: randomUUID(), ...patch });
  await decided(6, 'normal', ordinary, '판정기: 등록 기기의 GET /notes/:id', 'allow/approved', { decision: 'allow', reasonCode: 'approved' });
  await decided(6, 'forbidden', again({ deviceRegistered: false }), '판정기: 미등록 기기의 같은 요청', 'deny/device_not_registered', { decision: 'deny', reasonCode: 'device_not_registered' });
  await decided(7, 'forbidden', suspicious, '판정기: 심야·낯선 네트워크·대량 조회가 함께인 요청', 'step_up/step_up_required', { decision: 'step_up', reasonCode: 'step_up_required' });
  await decided(7, 'normal', { ...suspicious, requestId: randomUUID(), stepUp: { verified: true, authAgeSeconds: 60 } }, '판정기: 같은 요청을 다시 확인한 뒤', 'allow/approved', { decision: 'allow', reasonCode: 'approved' });
  await decided(8, 'forbidden', again({ route: 'GET /notes', path: '/notes' }), '판정기: 메모 전체 목록 GET /notes', 'deny', { decision: 'deny' });
  await decided(8, 'forbidden', again({ method: 'PUT', route: 'PUT /notices/:id', path: '/notices/demo' }), '판정기: 강사 공지 수정 PUT /notices/:id', 'deny', { decision: 'deny' });
  const detected = (step, kind, events, text, expected, want) => {
    const at = ctx.now().toISOString();
    const res = detect(events);
    const ok = res.action === want.action && (!want.reasonCode || res.reasonCode === want.reasonCode);
    rows.push({ step, kind, request: text, expected, observed: `${res.action}${res.reasonCode ? `/${res.reasonCode}` : ''}`, result: ok ? 'match' : 'mismatch',
      basis: 'local', requestId: '없음(탐지 연습에는 요청 ID가 없음)', at });
  };
  detected(9, 'normal', reads(30), '탐지: 한 사용자의 조회 30건', 'observe', { action: 'observe' });
  detected(9, 'forbidden', reads(121), '탐지: 한 사용자의 10분 안 조회 121건', 'propose_revocation/burst_read', { action: 'propose_revocation', reasonCode: 'burst_read' });
  {
    const at = ctx.now().toISOString();
    let observed;
    let ok = false;
    try {
      const diff = diffPolicy(loadSnapshot(), currentPolicy(ctx.config));
      ok = diff.changed === 0;
      observed = `사본 ${diff.restoreVersion} · 차이 ${diff.changed}건`;
    } catch { observed = '사본 검증 실패(중단)'; }
    rows.push({ step: 10, kind: 'normal', request: '정책 사본과 현재 시험 정책 비교(src/policy-diff.mjs)', expected: '차이 0건', observed,
      result: ok ? 'match' : 'mismatch', basis: 'local', requestId: '없음(요청이 아님)', at });
  }
  for (const [step, request, expected] of [
    [6, '반 엔진이 실제 경로에서 부르는 판정기(device_registered)', '미등록 기기는 deny'],
    [7, '반 엔진이 실제 경로에서 부르는 판정기(step_up_required)', '복합 이상 접속은 step_up'],
    [8, '반 엔진이 실제 경로에서 부르는 판정기(구역 규칙)', '다른 구역·목록은 deny'],
    [9, '반 엔진이 사건을 넘겨 부르는 탐지와 실제 접속 회수', '복합 의심 사건만 회수 제안, 실제 회수까지 걸린 시간 확인'],
  ]) rows.push(notRun(step, 'forbidden', request, expected, '확인 불가: 제공 엔진·심판이 시험하며 이 저장소에서는 보낼 수 없음'));
  return rows;
}

// ---------- 표 ----------
const cell = (text) => String(text).replace(/\|/gu, '／').replace(/\r?\n/gu, ' ');

export function summarize(rows) {
  const count = (basis, result) => rows.filter((row) => row.basis === basis && row.result === result).length;
  const gap = (kind) => [...new Set(rows.filter((row) => row.step <= 11).map((row) => row.step))]
    .filter((step) => !rows.some((row) => row.step === step && row.kind === kind && row.result !== 'not_run')).sort((a, b) => a - b);
  return {
    api: { match: count('api', 'match'), mismatch: count('api', 'mismatch') }, local: { match: count('local', 'match'), mismatch: count('local', 'mismatch') },
    notRun: rows.filter((row) => row.result === 'not_run').length,
    noNormal: gap('normal'), noForbidden: gap('forbidden'),
  };
}

export function formatTable(rows, meta) {
  const sum = summarize(rows);
  const steps = (list) => (list.length ? `${list.join('·')}단계` : '없음');
  return [
    '# 1~11단계 정상·금지 요청 표 (탈환 작전실 12단계)',
    '',
    `- 확인한 주소: ${meta.app}`,
    `- 배포본 커밋: ${meta.commit ? `${meta.commit.slice(0, 12)} (배포본 /aleph.json에서 읽음)` : '읽지 못함'}`,
    `- 표를 만든 시각: ${meta.generatedAt}`,
    `- 로그인 요청: ${meta.withToken ? '학생이 넣은 토큰으로 읽기 요청만 보냄(토큰 값은 기록하지 않음)' : '보내지 않음(토큰 없음)'}`,
    '- 이 표는 학생 자기 점검입니다. 심판의 판정이 아니고, 「기대와 일치」는 통과 선언이 아닙니다.',
    '',
    '| 단계 | 구분 | 요청 | 기대 결과 | 실제 결과 | 판정 | 근거 | 요청 ID | 확인 시각 |',
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- |',
    ...rows.map((row) => `| ${row.step} | ${row.kind === 'normal' ? '정상' : '금지'} | ${cell(row.request)} | ${cell(row.expected)} | ${cell(row.observed)} | ${resultLabel[row.result]} | ${label[row.basis]} | ${cell(row.requestId)} | ${row.at} |`),
    '',
    `- 실제 API: 일치 ${sum.api.match} · 다름 ${sum.api.mismatch}`,
    `- 로컬 연습: 일치 ${sum.local.match} · 다름 ${sum.local.mismatch} (실제 API 응답이 아님)`,
    `- 미실행: ${sum.notRun}줄`,
    `- 실측 결과가 없는 칸 — 정상 요청: ${steps(sum.noNormal)} · 금지 요청: ${steps(sum.noForbidden)}`,
    '- 총공세 41종: 41종 목록이 이 저장소에 없고 실행한 적이 없어 항목별 결과를 만들지 않았습니다. 미실행이며 통과로 표시하지 않습니다.',
    '',
  ].join('\n');
}

export async function runRecon({ config, fetchImpl = fetch, token = '', now = () => new Date() }) {
  let app;
  try { app = new URL(config.publicAppUrl); } catch { throw new Error('aleph.config.json의 실제 배포 주소를 먼저 넣어 주세요.'); }
  if (app.protocol !== 'https:' || app.username || app.password || app.search || app.hash || app.pathname !== '/' || app.hostname.endsWith('.example')) {
    throw new Error('aleph.config.json의 실제 배포 주소를 먼저 넣어 주세요.');
  }
  if (typeof config.sampleMarker !== 'string' || !config.sampleMarker) throw new Error('가상 메모의 확인 표시를 넣어 주세요.');
  if (token && !TOKEN_FORMAT.test(token)) throw new Error('ALEPH_STUDENT_TOKEN 형식이 맞지 않습니다. 값을 다시 넣어 주세요(값은 출력하지 않습니다).');
  const ctx = { config, app, fetchImpl, token, now, deployed: null };
  const rows = [...await apiRows(ctx), ...await localRows(ctx)].sort((a, b) => a.step - b.step);
  return { rows, meta: { app: app.origin, commit: ctx.deployed?.commit ?? null, generatedAt: now().toISOString(), withToken: Boolean(token) } };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const config = JSON.parse(readFileSync(join(ROOT, 'aleph.config.json'), 'utf8'));
    const { rows, meta } = await runRecon({ config, token: process.env.ALEPH_STUDENT_TOKEN ?? '' });
    const table = formatTable(rows, meta);
    mkdirSync(join(ROOT, 'artifacts'), { recursive: true });
    writeFileSync(join(ROOT, 'artifacts', 'recon-table.md'), table, 'utf8');
    process.stdout.write(`${table}\n표를 artifacts/recon-table.md에 저장했습니다(Git에 올라가지 않는 폴더).\n`);
    if (rows.some((row) => row.result === 'mismatch')) process.exitCode = 1;
  } catch (error) {
    process.stderr.write(`정상·금지 요청 표 첫 오류: ${error.message}\n`);
    process.exitCode = 1;
  }
}
