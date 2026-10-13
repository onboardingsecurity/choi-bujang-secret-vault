// The student changes this check as each stage adds an attack to the same app.
// Never return tokens, private keys, real names, or note bodies.
export async function runAttackChecks(config) {
  if (![1, 2, 3, 4, 5, 6, 7, 8, 9].includes(config.step)) throw new Error('이 단계의 공격 점검을 src/attack-check.mjs에 구현해 주세요.');
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
  const read = async path => {
    const response = await fetch(new URL(path, app), {
      redirect: 'error', signal: AbortSignal.timeout(10000),
    });
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
    return { visible, status: response.status };
  };
  const staticRead = await read('/data.json');
  if (config.step === 1) {
    return [{ attackId: 'anonymous_note_read', expected: '비로그인 화면에서 가상 메모를 확인',
      observed: staticRead.visible ? '비로그인 요청에서 공개 가상 메모 확인 표시가 보임' : `비로그인 요청에서 확인 표시가 보이지 않음 (HTTP ${staticRead.status})` }];
  }
  if (config.step >= 3 && config.step <= 9) {
    // 3~9단계: 토큰 없는 요청과 가짜 토큰 요청만 실제로 보냅니다. 비밀번호는 이 파일에 넣지 않으므로
    // 로그인 상태의 추가·수정·삭제와 A/B 교차 접근은 여기서 보내지 않고 '미실행'으로 남깁니다.
    const probeId = '11111111-1111-4111-8111-111111111111';
    const noteBody = JSON.stringify({ title: 'x', body: 'y' });
    const probes = [
      ['anonymous_list', 'GET', '/api/notes'],
      ['anonymous_create', 'POST', '/api/notes', noteBody],
      ['anonymous_read_one', 'GET', `/api/notes/${probeId}`],
      ['anonymous_update', 'PUT', `/api/notes/${probeId}`, noteBody],
      ['anonymous_delete', 'DELETE', `/api/notes/${probeId}`],
      ['fake_token_list', 'GET', '/api/notes', undefined, { authorization: 'Bearer aaa.bbb.ccc' }],
    ];
    const results = [{ attackId: 'static_data_json', expected: '/data.json에서 메모가 보이지 않아야 함',
      observed: staticRead.visible ? '정적 /data.json에서 메모가 아직 보임' : `정적 /data.json에서 메모가 보이지 않음 (HTTP ${staticRead.status})` }];
    const resourceIds = {};
    for (const [attackId, method, path, body, extra] of probes) {
      const response = await fetch(new URL(path, app), {
        method, redirect: 'error', signal: AbortSignal.timeout(10000),
        headers: { ...(body ? { 'content-type': 'application/json' } : {}), ...extra }, body,
      });
      resourceIds[attackId] = response.headers.get('x-resource-id');
      let leaked = false;
      try {
        const text = await response.text();
        leaked = response.ok || /"(title|body)"\s*:/u.test(text);
      } catch {
        // An unreadable body is not a leak.
      }
      results.push({ attackId, expected: '로그인 없이는 거부(401)되고 메모가 보이지 않아야 함',
        observed: `${method} ${path.replace(probeId, ':id')} → HTTP ${response.status}${leaked ? ' (메모 내용이 보임)' : ', 메모 내용 없음'}` });
    }
    if (config.step >= 4) {
      // 4·5단계: anon 키로 Supabase Data API를 직접 읽어 봅니다(5단계는 originalApiUrl). 키는 배포된 /api/config가 내려 주는 공개용 값만 씁니다.
      const direct = { attackId: 'anon_data_api_read', expected: 'anon 키로 notes 표를 직접 읽을 수 없어야 함(401/403)' };
      try {
        const settings = await (await fetch(new URL('/api/config', app), { redirect: 'error', signal: AbortSignal.timeout(10000) })).json();
        const key = typeof settings?.key === 'string' ? settings.key : undefined;
        const base = new URL(config.identityProvider.issuer).origin;
        if (!key) throw new Error('no key');
        const response = await fetch(config.step >= 5 ? new URL(config.originalApiUrl) : new URL('/rest/v1/notes?select=*', base), {
          redirect: 'error', signal: AbortSignal.timeout(10000), headers: { apikey: key },
        });
        const text = await response.text();
        const leaked = response.ok || /"(title|content)"\s*:/u.test(text);
        results.push({ ...direct, observed: `anon GET ${config.step >= 5 ? 'originalApiUrl' : '/rest/v1/notes'} → HTTP ${response.status}${leaked ? ' (메모 내용이 보임)' : ', 메모 내용 없음'}` });
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
          observed: '확인 불가 (제공 엔진 환경이 주어지지 않아 실측하지 않음. 로컬 연습은 npm run decider:test)' });
      }
      if (config.step >= 8) {
        // 8단계: 비로그인 요청에도 서버가 정한 자원 ID가 응답 헤더에 붙는지, 없는 공지 주소에 수정 요청을 보내면 어떻게 되는지만 실제로 보냅니다.
        // 로그인한 B가 A의 메모를 직접 요청하는 시험은 위 other_user_access와 같은 이유로 보내지 않습니다.
        const notice = await fetch(new URL(`/api/notices/${probeId}`, app), {
          method: 'PUT', redirect: 'error', signal: AbortSignal.timeout(10000),
          headers: { 'content-type': 'application/json' }, body: noteBody,
        });
        results.push(
          { attackId: 'resource_id_header', expected: '내 메모 API의 응답에는 서버가 정한 자원 ID(notes.own)가 붙어야 함',
            observed: `GET /api/notes → X-Resource-Id ${resourceIds.anonymous_list ?? '없음'}` },
          { attackId: 'instructor_notice_edit', expected: '비로그인의 강사 공지 수정은 거부되어야 함',
            observed: `PUT /api/notices/:id → HTTP ${notice.status} (공지 주소가 없음. 로그인한 일반 학생의 요청은 미실행)` },
          { attackId: 'decider_zone_rules', expected: '일반 학생의 공지 수정과 알 수 없는 경로는 판정기가 거부해야 함',
            observed: '확인 불가 (반 엔진이 부르는 판정기 안의 규칙이라 요청으로 시험할 수 없음. 로컬 연습은 node --test test/decider-zones.test.mjs)' });
      }
      if (config.step >= 9) {
        // 9단계 탐지 함수(src/detect.mjs)는 반 엔진이 사건을 넘겨 부르는 쪽이라 이 스크립트가 요청으로 시험할 수 없습니다.
        results.push({ attackId: 'detect_compound_revocation', expected: '낯선 네트워크와 다량 조회가 함께일 때만 기기 한 개의 회수 제안(propose_revocation)이 나오고 정상 기기는 유지되어야 함',
          observed: '확인 불가 (실제 회수와 경과 시간은 심판이 가상 사건으로 확인함. 로컬 연습은 node --test test/detect-input.test.mjs)' });
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
