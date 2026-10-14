// The student changes this check as each stage adds an attack to the same app.
// Never return tokens, private keys, real names, or note bodies.
import { randomUUID } from 'node:crypto';

// 12단계 심판(S12_SCREEN_MISMATCH, 「실행 기록 대조」): 심판은 제출 묶음이 보낸 요청을 기록하고, observed에 결과를 적은
// attackId마다 그 attackId로 보낸 요청이 기록에 있는지 대조합니다. 심판이 attackId를 어디서 읽는지는 받은 계약에 없어
// 요청마다 attackId를 두 헤더에 싣고 새 요청 ID(x-request-id)를 붙이며, observed에는 그 점검이 보낸 요청의 ID를 적습니다.
// 헤더만으로는 심판이 읽지 못해(3adf694 제출: 요청을 보낸 점검 8건이 모두 「기록 없음」) 본인 앱 주소로 가는 요청에는
// 요청 주소의 쿼리(?attackId=)에도 같은 값을 싣습니다. 쿼리는 본인 앱 응답을 바꾸지 않는 것을 배포본에서 확인했습니다.
// Supabase 직접 읽기에는 쿼리를 붙이지 않습니다(모르는 쿼리를 열 필터로 읽어 400이 나와 시험 결과가 달라짐).
// 다른 점검의 응답을 빌려 쓰지 않고, 요청을 보내지 않은 점검은 not_run 또는 미실행으로 적습니다.
const attackHeaders = (attackId, requestId) => ({ 'x-attack-id': attackId, 'x-aleph-attack-id': attackId, 'x-request-id': requestId });

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
  // GET 요청 하나를 attackId 표시·요청 ID와 함께 보냅니다. 격리 환경 규칙에 따라 GET만 씁니다.
  const probe = async (attackId, target, extra = {}) => {
    const requestId = randomUUID();
    const url = new URL(target, app);
    // 1단계 점검(시작 틀 동작)은 주소를 바꾸지 않고, 3단계부터의 점검에만 싣습니다.
    if (config.step >= 3 && url.origin === app.origin) url.searchParams.set('attackId', attackId);
    // attackId는 fetch 옵션에도 넣습니다(기본 fetch는 모르는 옵션을 무시하고, 요청을 기록하는 쪽이 읽을 수 있음).
    const response = await fetch(url.href, {
      method: 'GET', redirect: 'error', signal: AbortSignal.timeout(10000), attackId,
      headers: { ...attackHeaders(attackId, requestId), ...extra },
    });
    return { response, requestId };
  };
  const read = async (attackId, path) => {
    const { response, requestId } = await probe(attackId, path);
    let visible = false;
    if (response.ok) {
      try {
        const data = await response.json();
        visible = data?.sampleMarker === config.sampleMarker && Array.isArray(data.notes)
          && data.notes.length > 0;
      } catch {
        // A non-JSON response is a failed check, not a successful deployment.
      }
    }
    return { visible, status: response.status, requestId };
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
    // 그 점검의 attackId로 GET 요청 하나를 보내고 상태·자원 ID·메모 노출 여부·요청 ID만 돌려줍니다. 응답 본문은 저장하지 않습니다.
    const send = async (attackId, path, extra = {}, label = '') => {
      const { response, requestId } = await probe(attackId, path, extra);
      let leaked = false;
      try {
        const text = await response.text();
        leaked = response.ok || /"(title|body)"\s*:/u.test(text);
      } catch {
        // An unreadable body is not a leak.
      }
      return { requestId, status: response.status, resourceId: response.headers.get('x-resource-id'), leaked,
        line: `${label}GET ${path.replace(probeId, ':id')} → HTTP ${response.status}` };
    };
    const ids = (sent) => ` [요청 ID ${sent.map((item) => item.requestId).join(', ')}]`;
    const observe = (sent) => `${sent.map((item) => item.line).join(', ')}${sent.some((item) => item.leaked) ? ' (메모 내용이 보임)' : ', 메모 내용 없음'}${ids(sent)}`;
    const anonymous = '로그인 없이는 거부(401)되고 메모가 보이지 않아야 함';
    const results = [{ attackId: 'static_data_json', expected: '/data.json에서 메모가 보이지 않아야 함',
      observed: `GET /data.json → HTTP ${staticRead.status}, ${staticRead.visible ? '메모가 아직 보임' : '메모 내용 없음'}${ids([staticRead])}` }];
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
        const settings = await keyRead.response.json();
        const key = typeof settings?.key === 'string' ? settings.key : undefined;
        const base = new URL(config.identityProvider.issuer).origin;
        if (!key) throw new Error('no key');
        const target = config.step >= 5 ? config.originalApiUrl : new URL('/rest/v1/notes?select=*', base).href;
        const dataRead = await probe('anon_data_api_read', target, { apikey: key });
        const text = await dataRead.response.text();
        const leaked = dataRead.response.ok || /"(title|content)"\s*:/u.test(text);
        results.push({ ...direct, observed: `GET /api/config → HTTP ${keyRead.response.status}, anon GET ${config.step >= 5 ? 'originalApiUrl' : '/rest/v1/notes'} → HTTP ${dataRead.response.status}${leaked ? ' (메모 내용이 보임)' : ', 메모 내용 없음'}${ids([keyRead, dataRead])}` });
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
            observed: `GET /api/notes → HTTP ${header.status}, X-Resource-Id ${header.resourceId ?? '없음'}${ids([header])}` },
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
        let manifestLine;
        try {
          const sent = await probe('app_install_not_trusted', '/manifest.webmanifest');
          installSent.push(sent);
          const { response } = sent;
          const manifest = response.ok ? await response.json().catch(() => null) : null;
          const icons = Array.isArray(manifest?.icons) ? manifest.icons.map((icon) => icon?.sizes).filter((size) => typeof size === 'string') : [];
          manifestLine = `GET /manifest.webmanifest → HTTP ${response.status}${manifest ? ` (${manifest.display ?? 'display 없음'}, 아이콘 ${icons.join('·') || '없음'})` : ''}`;
        } catch {
          manifestLine = 'GET /manifest.webmanifest → 요청 실패';
        }
        let pageLine;
        try {
          const sent = await probe('app_install_not_trusted', '/');
          installSent.push(sent);
          const { response } = sent;
          const code = (await response.text()).replace(/<!--[\s\S]*?-->/gu, '').replace(/^\s*\/\/.*$/gmu, '');
          const storage = /localStorage|sessionStorage|indexedDB|document\.cookie/u.test(code);
          pageLine = `GET / → HTTP ${response.status}, 브라우저 저장소 사용 ${storage ? '있음' : '없음'}, 로그인 세션 ${/persistSession:\s*false/u.test(code) ? '메모리 보관' : '저장소 보관 가능'}`;
        } catch {
          pageLine = 'GET / → 요청 실패';
        }
        // 12단계: 점검이 20개까지라 새 항목을 늘리지 않고, 탈환 작전실(GET /api/war-room)의 토큰 없는 요청과 가짜 토큰 요청을 이 항목에 합칩니다.
        const deviceSent = [await send('forged_device_approval', '/api/device/status')];
        if (config.step >= 12) {
          deviceSent.push(await send('forged_device_approval', '/api/war-room'), await send('forged_device_approval', '/api/war-room', fakeToken, '가짜 토큰 '));
        }
        results.push(
          { attackId: 'app_install_not_trusted', expected: '설치용 manifest가 있어도 설치 표시만으로 기기가 승인되지 않고, 로그인 토큰·기기 키를 브라우저 저장소에 두지 않아야 함',
            observed: `${manifestLine}; ${pageLine}${installSent.length ? ids(installSent) : ''}` },
          { attackId: 'forged_device_approval', expected: `로그인 없는 기기 상태 조회와 승인된 척하는 가짜 토큰 등록 요청${config.step >= 12 ? ', 로그인 없는·가짜 토큰의 작전실 요약 요청' : ''}은 거부(401)되어야 함`,
            observed: `${observe(deviceSent)}; 가짜 토큰 POST /api/device/register → ${NOT_RUN}` },
          { attackId: 'unapproved_device_notes', expected: '로그인했어도 서버가 승인·확인하지 않은 기기의 메모 요청은 403으로 거부되고 메모가 보이지 않아야 함',
            observed: '미실행 (이 스크립트는 로그인 요청을 보내지 않음. 학생이 승인 전 화면에서 확인)' });
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
