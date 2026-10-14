// The student changes this check as each stage adds an attack to the same app.
// Never return tokens, private keys, real names, or note bodies.
import { createHash, randomUUID } from 'node:crypto';

// 12단계 심판(S12_SCREEN_MISMATCH, 「실행 기록 대조」): 심판은 제출 묶음이 보낸 요청을 기록하고, observed에 결과를 적은
// attackId마다 그 attackId로 보낸 요청이 기록에 있는지 대조합니다. 심판이 요청과 attackId를 잇는 방법은 받은 계약에 없습니다.
// 요청마다 attackId를 헤더 두 개(x-attack-id, x-aleph-attack-id), 새 요청 ID(x-request-id), 본인 앱 주소의 쿼리(?attackId=),
// fetch 옵션(attackId)에 싣습니다. 8차 제출까지 헤더·쿼리·옵션과 그 대소문자·이름 변형(별칭)은 모두 통하지 않아 별칭은 걷어 냈습니다
// (심판의 클라이언트는 헤더 이름을 소문자로 바꿔 보내고, 응답·fetch·process에 기록용 도우미가 없음을 request_diag로 확인).
// 9차 실험: observed에 요청의 주소 전체(origin 포함), 응답 본문의 sha256 앞부분, 요청 ID를 적습니다. 심판이 observed 글에서 주소나
// 증거를 찾아 기록과 맞추는 경우를 위한 것이며, 심판이 읽는 방식을 아는 것이 아니라 추정입니다.
// Supabase 직접 읽기에는 쿼리를 붙이지 않습니다(모르는 쿼리를 열 필터로 읽어 400이 나와 시험 결과가 달라짐).
// 다른 점검의 응답을 빌려 쓰지 않고, 요청을 보내지 않은 점검은 not_run 또는 미실행으로 적습니다.
// alephEvidence 형식 후보(12차 시험): 11차에서 문자열·{attackId}·{attackId, requestId}·{id}가 모두 통하지 않았고, 호스트는 어떤 값이든 거부하지 않았습니다.
// 처음 세 점검에는 키 이름을 두루 넣은 객체(wide)를, 나머지에는 다른 모양을 나눠 싣고 어느 쪽이 지목에서 빠지는지로 가립니다.
const EVIDENCE_FORMS = {
  static_data_json: 'wide', anonymous_list: 'wide', anonymous_read_one: 'wide',
  fake_token_list: 'tagged', anon_data_api_read: 'array', resource_id_header: 'json',
  app_install_not_trusted: 'pair', forged_device_approval: 'query',
};
const evidenceOf = (form, attackId, requestId) => ({
  wide: {
    attackId, attack_id: attackId, attackID: attackId, attack: attackId, id: attackId, name: attackId, check: attackId, checkId: attackId,
    test: attackId, case: attackId, scenario: attackId, key: attackId, label: attackId, kind: 'attack', type: 'attack', requestId,
    evidence: { attackId, id: attackId },
  },
  tagged: `attack:${attackId}`,
  array: [attackId],
  json: JSON.stringify({ attackId }),
  pair: `${attackId}:${requestId}`,
  query: `attackId=${attackId}`,
})[form];
const attackHeaders = (attackId, requestId) => ({ 'x-attack-id': attackId, 'x-aleph-attack-id': attackId, 'x-request-id': requestId });
const shaOf = (text) => {
  try { return createHash('sha256').update(String(text ?? '')).digest('hex'); } catch { return ''; }
};

// 12단계 임시 진단(원인을 찾으면 지움): 점검이 도는 환경의 모양을 서버 기록(request_diag)으로 남깁니다.
// 심판이 요청과 attackId를 잇는 방법이 받은 계약에 없어, 점검 환경이 응답이나 전역에 기록용 단서를 더하는지 이름만 확인합니다.
// 읽는 것: 이름과 참/거짓뿐입니다. 값·함수 소스·환경변수·파일은 읽지 않고, 토큰·키·비밀번호 같은 이름은 뺍니다.
// 어떤 부분이든 실패하면 그 칸만 x로 적고, 이 진단은 제출 묶음 생성을 멈추게 하지 않습니다.
const DIAG_SECRET_NAME = /auth|cookie|token|key|secret|password|credential|signature/iu;
const diagNames = (list) => [...new Set(list)].filter((name) => typeof name === 'string' && /^[A-Za-z0-9_$.-]{1,40}$/u.test(name)
  && !DIAG_SECRET_NAME.test(name)).sort().join(',');
// 9차: 응답 객체에는 headers.get만 있어 목록을 볼 수 없으므로, 알려진 서버 응답 헤더와 심판이 붙였을 법한 이름을 물어봅니다.
// 값이 있는 이름과 값(안전한 글자만 50자 이내)을 서버 기록에 남겨, 점검 환경이 응답에 기록 번호 같은 값을 더하는지 확인합니다.
const HEADER_CANDIDATES = ['age', 'cache-control', 'content-length', 'content-type', 'date', 'etag', 'server', 'strict-transport-security',
  'vary', 'allow', 'www-authenticate', 'x-content-type-options', 'x-vercel-cache', 'x-vercel-id', 'x-resource-id',
  'x-aleph-request-id', 'x-aleph-record-id', 'x-aleph-id', 'x-aleph-run-id', 'x-aleph-trace-id', 'x-aleph-attack-id', 'x-aleph-sdp-request-id',
  'x-request-id', 'x-record-id', 'x-recorded', 'x-run-id', 'x-trace-id', 'x-correlation-id', 'x-attack-id', 'x-attack', 'request-id',
  'x-judge-request-id', 'x-judge-record-id', 'x-sandbox-request-id', 'x-sandbox-id', 'x-sdp-request-id', 'x-defense-request-id',
  'x-proxy-id', 'x-egress-id', 'x-fetch-id', 'x-call-id', 'x-seq', 'x-sequence', 'x-count'];
export function runtimeDiag(response) {
  const part = (key, read) => { try { return `${key}=${read()}`; } catch { return `${key}=x`; } };
  const flag = (value) => (value ? 1 : 0);
  const isNative = (fn) => Function.prototype.toString.call(fn).includes('[native code]');
  const headerNames = () => {
    try { return diagNames([...response.headers.keys()]); } catch { return diagNames(Object.keys(response.headers)); }
  };
  // 객체의 자기 속성 이름과 자료형(함수·객체·문자열 등)만 적습니다. getter는 실행하지 않고(설명자만 읽음) 값은 읽지 않습니다.
  const typed = (target, limit = 1200) => {
    const names = diagNames(Object.getOwnPropertyNames(target)).split(',').filter(Boolean);
    return names.map((name) => {
      const descriptor = Object.getOwnPropertyDescriptor(target, name);
      return `${name}:${descriptor && 'value' in descriptor ? typeof descriptor.value : 'accessor'}`;
    }).join(',').slice(0, limit);
  };
  return [
    part('node', () => String(globalThis.process?.version ?? 'none')),
    part('fetch.native', () => flag(isNative(globalThis.fetch))),
    part('fetch.name', () => String(globalThis.fetch.name || 'anon')),
    part('fetch.len', () => globalThis.fetch.length),
    part('resp.ctor', () => response?.constructor?.name),
    part('resp.native', () => flag(response instanceof globalThis.Response)),
    part('resp.type', () => response.type),
    part('resp.hdr', headerNames),
    part('url.native', () => flag(isNative(globalThis.URL))),
    part('url.proto', () => diagNames(Object.getOwnPropertyNames(globalThis.URL.prototype))),
    part('has', () => diagNames(['Headers', 'Request', 'Response', 'AbortSignal', 'AbortController', 'URLSearchParams', 'TextEncoder',
      'structuredClone', 'queueMicrotask', 'setTimeout'].filter((name) => typeof globalThis[name] !== 'undefined'))),
    // 7차 확장: 응답·함수·process·console·URL 인스턴스의 속성 이름과 자료형. 길어질 수 있는 globals는 맨 뒤에 둡니다.
    part('resp.keys', () => typed(response)),
    part('resp.proto', () => { const proto = Object.getPrototypeOf(response); return proto === Object.prototype ? 'Object' : typed(proto); }),
    part('resp.hdr.keys', () => typed(response.headers)),
    part('resp.get', () => HEADER_CANDIDATES.map((name) => {
      try {
        const value = response.headers.get(name);
        return value === null || value === undefined ? '' : name + ':' + String(value).replace(/[^A-Za-z0-9_.:-]/gu, '?').slice(0, 50);
      } catch { return ''; }
    }).filter(Boolean).join(',').slice(0, 900)),
    part('fetch.keys', () => typed(globalThis.fetch)),
    part('process.keys', () => typed(globalThis.process, 450)),
    part('console.keys', () => typed(globalThis.console, 250)),
    part('abort.keys', () => typed(globalThis.AbortSignal, 300)),
    part('url.inst', () => diagNames(Object.getOwnPropertyNames(new globalThis.URL('https://example.com/a?b=1')))),
    part('globals', () => diagNames(Object.getOwnPropertyNames(globalThis))),
  ].join(';').replace(/[^A-Za-z0-9_$.,;=:-]/gu, '?').slice(0, 4000);
}

// 10차 진단 결과: 심판의 fetch는 (url, {method, headers, body, alephEvidence})만 호스트로 넘기고 나머지 옵션은 버립니다.
// 11차는 alephEvidence 옵션의 형식을 알아내려는 진단입니다. 호스트가 던진 오류 글은 가린 뒤(redactSource) base64url 조각으로 서버 기록에 남깁니다.
const CHUNK_SIZE = 1800;
const CHUNK_MAX = 3;
const BASE64_URL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
export const redactSource = (text) => String(text)
  .replace(/\s+/gu, ' ')
  .replace(/Bearer\s+[^\s'"`]+/giu, 'Bearer <x>')
  .replace(/eyJ[A-Za-z0-9_-]{8,}(?:\.[A-Za-z0-9_-]+)*/gu, '<jwt>')
  .replace(/(["'`])((?:(?!\1).){41,}?)\1/gu, '$1<str>$1')
  .replace(/[A-Za-z0-9_+/=-]{40,}/gu, '<long>')
  .replace(/[A-Za-z0-9_+/=-]{24,}/gu, (run) => (/\d/u.test(run) ? '<long>' : run))
  .replace(/([?&][A-Za-z0-9_.-]+=)[^&\s"'`)]+/gu, '$1<v>');
export const base64Url = (text) => {
  // UTF-8 바이트로 바꿉니다(TextEncoder·Buffer가 없는 환경이라 encodeURIComponent·unescape로). 짝 없는 서로게이트는 ?로 바꿉니다.
  let binary;
  try { binary = unescape(encodeURIComponent(String(text))); } catch { binary = String(text).replace(/[^\x00-\x7f]/gu, '?'); }
  const bytes = [...binary].map((ch) => ch.charCodeAt(0) & 255);
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const [a, b, c] = [bytes[i], bytes[i + 1], bytes[i + 2]];
    out += BASE64_URL[a >> 2] + BASE64_URL[((a & 3) << 4) | ((b ?? 0) >> 4)];
    if (b !== undefined) out += BASE64_URL[((b & 15) << 2) | ((c ?? 0) >> 6)];
    if (c !== undefined) out += BASE64_URL[c & 63];
  }
  return out;
};
export function packDiag(text) {
  const joined = String(text).slice(0, CHUNK_SIZE * CHUNK_MAX);
  const chunks = [];
  for (let i = 0; i < joined.length && chunks.length < CHUNK_MAX; i += CHUNK_SIZE) chunks.push(joined.slice(i, i + CHUNK_SIZE));
  return chunks.map((chunk, index) => `${index + 1}.${chunks.length}.${base64Url(chunk)}`);
}

export async function runAttackChecks(config) {
  if (![1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].includes(config.step)) throw new Error('이 단계의 공격 점검을 src/attack-check.mjs에 구현해 주세요.');
  let app;
  try {
    app = new URL(config.publicAppUrl);
  } catch {
    throw new Error('aleph.config.json의 실제 배포 주소를 먼저 넣어 주세요.');
  }
  if (app.protocol !== 'https:' || app.username || app.password || app.search || app.hash
      || app.pathname !== '/' || app.hostname.endsWith('.example')) {
    throw new Error('aleph.config.json의 실제 배포 주소를 먼저 넣어 주세요.');
  }
  if (typeof config.sampleMarker !== 'string' || !config.sampleMarker) throw new Error('가상 메모의 확인 표시를 넣어 주세요.');
  // GET 요청 하나를 attackId 표시·요청 ID와 함께 보내고 응답 본문(text)을 한 번만 읽어 해시까지 만듭니다. 격리 환경 규칙에 따라 GET만 씁니다.
  // 심판 환경의 응답은 Response가 아닌 일반 객체(headers.get·json·ok·status·text뿐)라서 본문은 text()로만 읽고 직접 해석합니다.
  const evidenceNotes = [];
  const probe = async (attackId, target, extra = {}) => {
    const requestId = randomUUID();
    const url = new URL(target, app);
    const shownUrl = `${url.origin}${url.pathname}`;
    // 1단계 점검(시작 틀 동작)은 주소를 바꾸지 않고, 3단계부터의 점검에만 싣습니다.
    // 심판의 격리 환경은 URL의 searchParams를 제공하지 않아(`url.searchParams.set`에서 실패) 주소 문자열에 직접 붙입니다.
    let href = url.href;
    if (config.step >= 3 && url.origin === app.origin) href += `${href.includes('?') ? '&' : '?'}attackId=${encodeURIComponent(attackId)}`;
    // attackId는 fetch 옵션에도 넣습니다(기본 fetch는 모르는 옵션을 무시하고, 요청을 기록하는 쪽이 읽을 수 있음).
    const init = {
      method: 'GET', redirect: 'error', signal: AbortSignal.timeout(10000), attackId,
      headers: { ...attackHeaders(attackId, requestId), ...extra },
    };
    // 심판의 fetch가 호스트로 넘기는 옵션은 alephEvidence뿐이라(10차 진단), 점검마다 다른 형식으로 시험합니다. 호스트가 거부하면 없이 다시 보냅니다.
    const form = EVIDENCE_FORMS[attackId];
    let response;
    if (form) {
      try { response = await fetch(href, { ...init, alephEvidence: evidenceOf(form, attackId, requestId) }); } catch (error) {
        evidenceNotes.push(`${attackId}:${form}:${redactSource(String(error?.message ?? error)).slice(0, 150)}`);
      }
    }
    if (!response) response = await fetch(href, init);
    let text = '';
    try { text = await response.text(); } catch { /* 본문을 읽지 못해도 상태와 헤더는 쓸 수 있음 */ }
    return { response, requestId, shownUrl, status: response.status, text, sha: shaOf(text) };
  };
  const read = async (attackId, path) => {
    const sent = await probe(attackId, path);
    let visible = false;
    if (sent.response.ok) {
      try {
        const data = JSON.parse(sent.text);
        visible = data?.sampleMarker === config.sampleMarker && Array.isArray(data.notes)
          && data.notes.length > 0;
      } catch {
        // A non-JSON response is a failed check, not a successful deployment.
      }
    }
    return { ...sent, visible };
  };
  const staticRead = await read(config.step === 1 ? 'anonymous_note_read' : 'static_data_json', '/data.json');
  if (config.step === 1) {
    return [{ attackId: 'anonymous_note_read', expected: '비로그인 화면에서 가상 메모를 확인',
      observed: staticRead.visible ? '비로그인 요청에서 공개 가상 메모 확인 표시가 보임' : `비로그인 요청에서 확인 표시가 보이지 않음 (HTTP ${staticRead.status})` }];
  }
  if (config.step >= 3 && config.step <= 12) {
    // 3~12단계: 토큰 없는 요청과 가짜 토큰 요청만 실제로 보냅니다. 비밀번호는 이 파일에 넣지 않으므로
    // 로그인 상태의 추가·수정·삭제와 A/B 교차 접근은 여기서 보내지 않고 '미실행'으로 남깁니다.
    // 12단계 심판(S12_BUNDLE_UNSUPPORTED): 제출 묶음은 공개 HTTPS 주소로 보내는 GET·HEAD만 되는 격리 환경에서 실행되므로
    // 쓰기 요청(POST·PUT·DELETE)은 보내지 않고, 쓰기 요청이 필요한 점검은 observed를 not_run으로 둡니다.
    const NOT_RUN = 'not_run';
    const probeId = '11111111-1111-4111-8111-111111111111';
    const fakeToken = { authorization: 'Bearer aaa.bbb.ccc' };
    // 그 점검의 attackId로 GET 요청 하나를 보내고 상태·자원 ID·메모 노출 여부·본문 해시·요청 ID만 돌려줍니다. 응답 본문은 저장하지 않습니다.
    const send = async (attackId, path, extra = {}, label = '') => {
      const sent = await probe(attackId, path, extra);
      const leaked = sent.response.ok || /"(title|body)"\s*:/u.test(sent.text);
      return { ...sent, label, leaked, resourceId: sent.response.headers.get('x-resource-id') };
    };
    // observed에 적는 요청 증거: 주소 전체(origin 포함)·상태·응답 본문 sha256 앞부분·요청 ID. 300자를 넘으면 요청 ID, 해시 길이 순으로 줄입니다.
    const compose = (sent, tail = '') => {
      const build = (shaLength, withRequest) => `${sent.map((item) => `${item.label ?? ''}GET ${item.shownUrl} → HTTP ${item.status}${item.note ?? ''}`
        + `${shaLength && item.sha ? ` sha256:${item.sha.slice(0, shaLength)}` : ''}${withRequest ? ` req:${item.requestId}` : ''}`).join(', ')}${tail}`;
      for (const [shaLength, withRequest] of [[16, true], [16, false], [8, false]]) {
        const text = build(shaLength, withRequest);
        if (text.length <= 300) return text;
      }
      return build(0, false).slice(0, 300);
    };
    const observe = (sent) => compose(sent, sent.some((item) => item.leaked) ? ' (메모 내용이 보임)' : ', 메모 내용 없음');
    const anonymous = '로그인 없이는 거부(401)되고 메모가 보이지 않아야 함';
    const results = [{ attackId: 'static_data_json', expected: '/data.json에서 메모가 보이지 않아야 함',
      observed: compose([staticRead], staticRead.visible ? ', 메모가 아직 보임' : ', 메모 내용 없음') }];
    results.push({ attackId: 'anonymous_list', expected: anonymous, observed: observe([await send('anonymous_list', '/api/notes')]) });
    // 로그인 없는 메모 추가·수정·삭제는 쓰기 요청이라 보내지 않습니다(not_run).
    results.push({ attackId: 'anonymous_write', expected: '로그인 없는 메모 추가·수정·삭제는 모두 거부(401)되고 메모가 보이지 않아야 함', observed: NOT_RUN });
    results.push({ attackId: 'anonymous_read_one', expected: anonymous, observed: observe([await send('anonymous_read_one', `/api/notes/${probeId}`)]) });
    results.push({ attackId: 'fake_token_list', expected: anonymous, observed: observe([await send('fake_token_list', '/api/notes', fakeToken, '가짜 토큰 ')]) });
    if (config.step >= 4) {
      // 4·5단계: anon 키로 Supabase Data API를 직접 읽어 봅니다(5단계는 originalApiUrl). 키는 배포된 /api/config가 내려 주는 공개용 값만 씁니다.
      const direct = { attackId: 'anon_data_api_read', expected: 'anon 키로 notes 표를 직접 읽을 수 없어야 함(401/403)' };
      try {
        const keyRead = await probe('anon_data_api_read', '/api/config');
        const settings = JSON.parse(keyRead.text);
        const key = typeof settings?.key === 'string' ? settings.key : undefined;
        const base = new URL(config.identityProvider.issuer).origin;
        if (!key) throw new Error('no key');
        const target = config.step >= 5 ? config.originalApiUrl : new URL('/rest/v1/notes?select=*', base).href;
        const dataRead = await probe('anon_data_api_read', target, { apikey: key });
        const leaked = dataRead.response.ok || /"(title|content)"\s*:/u.test(dataRead.text);
        results.push({ ...direct, observed: compose([keyRead, { ...dataRead, label: 'anon ' }], leaked ? ' (메모 내용이 보임)' : ', 메모 내용 없음') });
      } catch {
        results.push({ ...direct, observed: '미실행 (공개용 키 또는 요청을 확인하지 못함)' });
      }
      results.push(
        { attackId: 'logged_in_a_crud', expected: '로그인한 A·B가 자기 가상 메모를 읽기·추가·수정·삭제할 수 있어야 함',
          observed: '미실행 (이 스크립트는 로그인 요청을 보내지 않음)' },
        { attackId: 'other_user_access', expected: '로그인한 B가 A의 메모를 읽기·수정·삭제하면 404로 거부되어야 함',
          observed: '미실행 (이 스크립트는 로그인 요청을 보내지 않음)' },
        { attackId: 'owner_change', expected: '본문에 남의 owner_id를 넣은 추가·수정은 403으로 거부되어야 함',
          observed: '미실행 (이 스크립트는 로그인 요청을 보내지 않음)' });
      if (config.step >= 6) {
        // 6단계 기기 등록 판정은 반 엔진이 부르는 src/decider.mjs 안에 있어 이 스크립트가 요청으로 시험할 수 없습니다.
        results.push({ attackId: 'unregistered_device', expected: '미등록 기기의 요청은 deny와 device_not_registered로 거부되어야 함',
          observed: '미실행 (심판이 시험함. 로컬 연습은 npm run decider:test)' });
      }
      if (config.step >= 7) {
        // 7단계 추가 확인 규칙도 반 엔진이 부르는 src/decider.mjs 안에 있어 이 스크립트가 요청으로 시험할 수 없습니다.
        results.push({ attackId: 'unusual_access_step_up', expected: '평소와 다른 시각·네트워크의 대량 조회는 추가 확인(step_up)으로 나오고 재확인 뒤 새 요청은 허용되어야 함',
          observed: '미실행 (확인 불가: 제공 엔진 환경이 주어지지 않아 실측하지 않음. 로컬 연습은 npm run decider:test)' });
      }
      if (config.step >= 8) {
        // 8단계: 비로그인 요청에도 서버가 정한 자원 ID가 응답 헤더에 붙는지만 실제로 봅니다. 공지 수정(PUT)은 쓰기 요청이라 보내지 않습니다(not_run).
        // 로그인한 B가 A의 메모를 직접 요청하는 시험은 위 other_user_access와 같은 이유로 보내지 않습니다.
        // 자원 ID 점검은 다른 점검의 응답을 빌리지 않고 자기 attackId로 요청을 따로 보냅니다.
        const header = await send('resource_id_header', '/api/notes');
        results.push(
          { attackId: 'resource_id_header', expected: '내 메모 API의 응답에는 서버가 정한 자원 ID(notes.own)가 붙어야 함',
            observed: compose([header], `, X-Resource-Id ${header.resourceId ?? '없음'}`) },
          { attackId: 'instructor_notice_edit', expected: '비로그인의 강사 공지 수정은 거부되어야 함', observed: NOT_RUN },
          { attackId: 'decider_zone_rules', expected: '일반 학생의 공지 수정과 알 수 없는 경로는 판정기가 거부해야 함',
            observed: '미실행 (확인 불가: 반 엔진이 부르는 판정기 안의 규칙이라 요청으로 시험할 수 없음. 로컬 연습은 node --test test/decider-zones.test.mjs)' });
      }
      if (config.step >= 9) {
        // 9단계 탐지 함수(src/detect.mjs)는 반 엔진이 사건을 넘겨 부르는 쪽이라 이 스크립트가 요청으로 시험할 수 없습니다.
        results.push({ attackId: 'detect_compound_revocation', expected: '낯선 네트워크와 다량 조회가 함께일 때만 기기 한 개의 회수 제안(propose_revocation)이 나오고 정상 기기는 유지되어야 함',
          observed: '미실행 (확인 불가: 실제 회수와 경과 시간은 심판이 가상 사건으로 확인함. 로컬 연습은 node --test test/detect-input.test.mjs)' });
      }
      if (config.step >= 10) {
        // 10단계: 복원 경로(POST)는 쓰기 요청이라 토큰 없는 요청과 가짜 토큰 요청도 보내지 않습니다(not_run).
        // 복원은 로그인한 사본 소유자만 할 수 있어서 로그인한 다른 계정의 요청도 이 스크립트가 보내지 않고 '미실행'으로 남깁니다.
        results.push({ attackId: 'restore_without_login', expected: '로그인 없이·가짜 토큰으로는 복원 경로가 거부(401)되고 메모가 보이지 않아야 함', observed: NOT_RUN });
        results.push({ attackId: 'restore_other_user', expected: '사본 소유자가 아닌 로그인 계정의 복원 요청은 404로 거부되고 다른 메모는 그대로여야 함',
          observed: '미실행 (이 스크립트는 로그인 요청을 보내지 않음. 학생이 A 시크릿 창에서 직접 확인)' });
      }
      if (config.step >= 11) {
        // 11단계: 설치용 manifest와 첫 화면 원본을 읽고, 기기 승인 API에는 토큰 없는 상태 조회(GET)만 보냅니다.
        // 승인된 척하는 가짜 토큰 등록(POST)은 쓰기 요청이라 보내지 않고 not_run으로 적습니다.
        // 로그인한 계정의 승인 전·후 요청은 이 스크립트가 보내지 않으므로 '미실행'으로 남깁니다.
        const installSent = [];
        const installFailed = [];
        try {
          const sent = await probe('app_install_not_trusted', '/manifest.webmanifest');
          let manifest = null;
          if (sent.response.ok) { try { manifest = JSON.parse(sent.text); } catch { manifest = null; } }
          const icons = Array.isArray(manifest?.icons) ? manifest.icons.map((icon) => icon?.sizes).filter((size) => typeof size === 'string') : [];
          installSent.push({ ...sent, note: manifest ? ` (${manifest.display ?? 'display 없음'}, 아이콘 ${icons.join('·') || '없음'})` : '' });
        } catch {
          installFailed.push('GET /manifest.webmanifest → 요청 실패');
        }
        try {
          const sent = await probe('app_install_not_trusted', '/');
          const code = sent.text.replace(/<!--[\s\S]*?-->/gu, '').replace(/^\s*\/\/.*$/gmu, '');
          const storage = /localStorage|sessionStorage|indexedDB|document\.cookie/u.test(code);
          installSent.push({ ...sent, note: `, 브라우저 저장소 사용 ${storage ? '있음' : '없음'}, 로그인 세션 ${/persistSession:\s*false/u.test(code) ? '메모리 보관' : '저장소 보관 가능'}` });
        } catch {
          installFailed.push('GET / → 요청 실패');
        }
        // 12단계: 점검이 20개까지라 새 항목을 늘리지 않고, 탈환 작전실(GET /api/war-room)의 토큰 없는 요청을 이 항목에 합칩니다.
        // observed가 300자 안에 주소 전체와 해시를 담도록 가짜 토큰 작전실 요청은 보내지 않습니다(가짜 토큰은 fake_token_list가 시험함).
        const deviceSent = [await send('forged_device_approval', '/api/device/status')];
        if (config.step >= 12) deviceSent.push(await send('forged_device_approval', '/api/war-room'));
        results.push(
          { attackId: 'app_install_not_trusted', expected: '설치용 manifest가 있어도 설치 표시만으로 기기가 승인되지 않고, 로그인 토큰·기기 키를 브라우저 저장소에 두지 않아야 함',
            observed: `${installSent.length ? compose(installSent) : ''}${installFailed.map((line) => `; ${line}`).join('')}` },
          { attackId: 'forged_device_approval', expected: `로그인 없는 기기 상태 조회${config.step >= 12 ? '와 작전실 요약 요청' : ''}은 거부(401)되어야 함`,
            observed: observe(deviceSent) },
          { attackId: 'unapproved_device_notes', expected: '로그인했어도 서버가 승인·확인하지 않은 기기의 메모 요청은 403으로 거부되고 메모가 보이지 않아야 함',
            observed: '미실행 (이 스크립트는 로그인 요청을 보내지 않음. 학생이 승인 전 화면에서 확인)' });
      }
      if (config.step >= 12) {
        // 임시 진단(12차): 점검 환경의 process.env 키 이름(값은 읽지 않음)과 process.argv를 가린 글로 기록하고, 호스트가 거부한 evidence 오류가 있으면 함께 적습니다.
        // 점검 결과(results)에는 넣지 않습니다.
        try {
          const proc = globalThis.process ?? {};
          // 학생 PC의 환경변수 이름이 서버 기록에 새지 않게, 점검 환경이 붙였을 법한 이름(aleph·judge·attack 등)만 적고 나머지는 개수로만 셉니다.
          const allEnv = Object.keys(proc.env ?? {});
          const envNames = `${allEnv.filter((name) => /^[A-Za-z0-9_]{1,50}$/u.test(name) && /aleph|judge|attack|evidence|sandbox|record|trace|check|sdp/iu.test(name)).slice(0, 40).join(',')}/total${allEnv.length}`;
          const argv = Array.from(proc.argv ?? []).map((item) => redactSource(String(item).split(/[\\/]/u).pop()).slice(0, 60)).join(' ; ');
          const text = [...evidenceNotes, `env=${envNames}`, `argc=${Array.from(proc.argv ?? []).length}`, `argv=${argv}`].join(' | ');
          for (const chunk of packDiag(text)) await probe('diag_env', '/api/config', { 'x-diag-src': chunk });
        } catch { /* 진단 실패는 제출 묶음 생성에 영향을 주지 않음 */ }
      }
      return results;
    }
    results.push(
      { attackId: 'logged_in_a_crud', expected: '로그인한 A가 가상 메모를 추가·수정·삭제할 수 있어야 함',
        observed: '미실행 (이 스크립트는 로그인 요청을 보내지 않음)' },
      { attackId: 'other_user_access', expected: '4단계 전까지는 B의 타인 메모 접근이 막히지 않을 수 있음',
        observed: '미실행 (4단계에서 기록)' });
    return results;
  }
  // 2단계: 정적 파일은 사라져야 하고, API는 3단계 전까지 열려 있을 수 있다.
  const api = await fetch(new URL('/api/notes', app), {
    redirect: 'error', signal: AbortSignal.timeout(10000),
  });
  return [
    { attackId: 'static_data_json', expected: '/data.json에서 메모가 보이지 않아야 함',
      observed: staticRead.visible ? '정적 /data.json에서 메모가 아직 보임' : `정적 /data.json에서 메모가 보이지 않음 (HTTP ${staticRead.status})` },
    { attackId: 'anonymous_note_read', expected: '3단계 전까지는 API가 비로그인에도 열려 있을 수 있음',
      observed: `비로그인 /api/notes 요청 결과 HTTP ${api.status}` },
  ];
}
