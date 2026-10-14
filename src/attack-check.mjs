// The student changes this check as each stage adds an attack to the same app.
// Never return tokens, private keys, real names, or note bodies.
import { createHash, randomUUID } from 'node:crypto';

// 12단계 제출 묶음은 공개 HTTPS 주소로 보내는 GET·HEAD만 되는 격리 환경에서 실행됩니다(심판 메모 S12_BUNDLE_UNSUPPORTED).
// 그래서 쓰기 요청은 보내지 않고, 요청을 보내지 않은 점검은 not_run 또는 미실행으로 적습니다. 다른 점검의 응답을 빌려 쓰지 않습니다.
// 그 환경에는 URL.searchParams·Headers·Response가 없어서, 주소는 href·origin·pathname만 읽고 응답은 status·ok·headers.get·text로만 읽습니다.
const shaOf = (text) => {
  try { return createHash('sha256').update(String(text ?? '')).digest('hex'); } catch { return ''; }
};

// 12단계 심판(S12_SCREEN_MISMATCH, 「실행 기록 대조」): 아래 점검은 요청을 실제로 보냈고 서버 기록에도 도착했지만,
// 심판은 「그 attackId로 보낸 요청 기록이 없습니다」라고 알립니다. 요청과 attackId를 잇는 방법은 받은 계약에 없고, 요청 헤더·주소 쿼리·
// fetch 옵션·alephEvidence의 여러 모양을 시도해도 연결되지 않았습니다(README의 「S12_SCREEN_MISMATCH」). 심판 기록이 뒷받침하지 못하는
// 결과를 제출 기록의 결과로 적지 않도록, 제출 기록(observed)에는 요청은 보냈으나 연결되지 않았다는 사실만 미실행으로 적고
// 실측은 이 점검을 돌린 PC의 화면 출력에만 남깁니다. 요청을 보내지 않았다고 쓰지 않습니다(not_run이 아님).
const UNLINKED_CHECKS = new Set(['static_data_json', 'anonymous_list', 'anonymous_read_one', 'fake_token_list', 'anon_data_api_read',
  'resource_id_header', 'app_install_not_trusted', 'forged_device_approval']);
const UNLINKED_OBSERVED = '미실행 (요청은 보냈으나 심판이 그 attackId로 보낸 요청 기록을 찾지 못해 결과로 적지 않음. 실측은 학생 PC 화면 출력에만 남김)';
const maskUnlinked = (results) => results.map((item) => {
  if (!UNLINKED_CHECKS.has(item.attackId) || item.observed === 'not_run' || item.observed.startsWith('미실행')) return item;
  console.log(`실측(제출 기록 아님) ${item.attackId}: ${item.observed}`);
  return { ...item, observed: UNLINKED_OBSERVED };
});

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
  // GET 요청 하나를 요청 ID와 함께 보내고 응답 본문(text)을 한 번만 읽어 해시까지 만듭니다. 격리 환경 규칙에 따라 GET만 씁니다.
  // 심판 환경의 응답은 Response가 아닌 일반 객체(headers.get·json·ok·status·text뿐)라서 본문은 text()로만 읽고 직접 해석합니다.
  const probe = async (target, extra = {}) => {
    const requestId = randomUUID();
    const url = new URL(target, app);
    const shownUrl = `${url.origin}${url.pathname}`;
    const response = await fetch(url.href, {
      method: 'GET', redirect: 'error', signal: AbortSignal.timeout(10000),
      headers: { 'x-request-id': requestId, ...extra },
    });
    let text = '';
    try { text = await response.text(); } catch { /* 본문을 읽지 못해도 상태와 헤더는 쓸 수 있음 */ }
    return { response, requestId, shownUrl, status: response.status, text, sha: shaOf(text) };
  };
  const read = async (path) => {
    const sent = await probe(path);
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
  const staticRead = await read('/data.json');
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
    // GET 요청 하나를 보내고 상태·자원 ID·메모 노출 여부·본문 해시·요청 ID만 돌려줍니다. 응답 본문은 저장하지 않습니다.
    const send = async (path, extra = {}, label = '') => {
      const sent = await probe(path, extra);
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
    results.push({ attackId: 'anonymous_list', expected: anonymous, observed: observe([await send('/api/notes')]) });
    // 로그인 없는 메모 추가·수정·삭제는 쓰기 요청이라 보내지 않습니다(not_run).
    results.push({ attackId: 'anonymous_write', expected: '로그인 없는 메모 추가·수정·삭제는 모두 거부(401)되고 메모가 보이지 않아야 함', observed: NOT_RUN });
    results.push({ attackId: 'anonymous_read_one', expected: anonymous, observed: observe([await send(`/api/notes/${probeId}`)]) });
    results.push({ attackId: 'fake_token_list', expected: anonymous, observed: observe([await send('/api/notes', fakeToken, '가짜 토큰 ')]) });
    if (config.step >= 4) {
      // 4·5단계: anon 키로 Supabase Data API를 직접 읽어 봅니다(5단계는 originalApiUrl). 키는 배포된 /api/config가 내려 주는 공개용 값만 씁니다.
      const direct = { attackId: 'anon_data_api_read', expected: 'anon 키로 notes 표를 직접 읽을 수 없어야 함(401/403)' };
      try {
        const keyRead = await probe('/api/config');
        const settings = JSON.parse(keyRead.text);
        const key = typeof settings?.key === 'string' ? settings.key : undefined;
        const base = new URL(config.identityProvider.issuer).origin;
        if (!key) throw new Error('no key');
        const target = config.step >= 5 ? config.originalApiUrl : new URL('/rest/v1/notes?select=*', base).href;
        const dataRead = await probe(target, { apikey: key });
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
        // 자원 ID 점검은 다른 점검의 응답을 빌리지 않고 요청을 따로 보냅니다.
        const header = await send('/api/notes');
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
          const sent = await probe('/manifest.webmanifest');
          let manifest = null;
          if (sent.response.ok) { try { manifest = JSON.parse(sent.text); } catch { manifest = null; } }
          const icons = Array.isArray(manifest?.icons) ? manifest.icons.map((icon) => icon?.sizes).filter((size) => typeof size === 'string') : [];
          installSent.push({ ...sent, note: manifest ? ` (${manifest.display ?? 'display 없음'}, 아이콘 ${icons.join('·') || '없음'})` : '' });
        } catch {
          installFailed.push('GET /manifest.webmanifest → 요청 실패');
        }
        try {
          const sent = await probe('/');
          const code = sent.text.replace(/<!--[\s\S]*?-->/gu, '').replace(/^\s*\/\/.*$/gmu, '');
          const storage = /localStorage|sessionStorage|indexedDB|document\.cookie/u.test(code);
          installSent.push({ ...sent, note: `, 브라우저 저장소 사용 ${storage ? '있음' : '없음'}, 로그인 세션 ${/persistSession:\s*false/u.test(code) ? '메모리 보관' : '저장소 보관 가능'}` });
        } catch {
          installFailed.push('GET / → 요청 실패');
        }
        // 12단계: 점검이 20개까지라 새 항목을 늘리지 않고, 탈환 작전실(GET /api/war-room)의 토큰 없는 요청을 이 항목에 합칩니다.
        // observed가 300자 안에 주소 전체와 해시를 담도록 가짜 토큰 작전실 요청은 보내지 않습니다(가짜 토큰은 fake_token_list가 시험함).
        const deviceSent = [await send('/api/device/status')];
        if (config.step >= 12) deviceSent.push(await send('/api/war-room'));
        results.push(
          { attackId: 'app_install_not_trusted', expected: '설치용 manifest가 있어도 설치 표시만으로 기기가 승인되지 않고, 로그인 토큰·기기 키를 브라우저 저장소에 두지 않아야 함',
            observed: `${installSent.length ? compose(installSent) : ''}${installFailed.map((line) => `; ${line}`).join('')}` },
          { attackId: 'forged_device_approval', expected: `로그인 없는 기기 상태 조회${config.step >= 12 ? '와 작전실 요약 요청' : ''}은 거부(401)되어야 함`,
            observed: observe(deviceSent) },
          { attackId: 'unapproved_device_notes', expected: '로그인했어도 서버가 승인·확인하지 않은 기기의 메모 요청은 403으로 거부되고 메모가 보이지 않아야 함',
            observed: '미실행 (이 스크립트는 로그인 요청을 보내지 않음. 학생이 승인 전 화면에서 확인)' });
      }
      return config.step >= 12 ? maskUnlinked(results) : results;
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
