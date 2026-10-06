// The student changes this check as each stage adds an attack to the same app.
// Never return tokens, private keys, real names, or note bodies.
export async function runAttackChecks(config) {
  if (![1, 2, 3, 4].includes(config.step)) throw new Error('이 단계의 공격 점검을 src/attack-check.mjs에 구현해 주세요.');
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
  if (config.step === 3 || config.step === 4) {
    // 3·4단계: 토큰 없는 요청과 가짜 토큰 요청만 실제로 보냅니다. 비밀번호는 이 파일에 넣지 않으므로
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
    for (const [attackId, method, path, body, extra] of probes) {
      const response = await fetch(new URL(path, app), {
        method, redirect: 'error', signal: AbortSignal.timeout(10000),
        headers: { ...(body ? { 'content-type': 'application/json' } : {}), ...extra }, body,
      });
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
    if (config.step === 4) {
      // 4단계: anon 키로 Supabase Data API를 직접 읽어 봅니다. 키는 배포된 화면에 있는 공개용 값만 씁니다.
      const direct = { attackId: 'anon_data_api_read', expected: 'anon 키로 notes 표를 직접 읽을 수 없어야 함(401/403)' };
      try {
        const page = await (await fetch(app, { redirect: 'error', signal: AbortSignal.timeout(10000) })).text();
        const key = page.match(/sb_publishable_[A-Za-z0-9_-]+/u)?.[0];
        const base = new URL(config.identityProvider.issuer).origin;
        if (!key) throw new Error('no key');
        const response = await fetch(new URL('/rest/v1/notes?select=*', base), {
          redirect: 'error', signal: AbortSignal.timeout(10000), headers: { apikey: key },
        });
        const text = await response.text();
        const leaked = response.ok || /"(title|content)"\s*:/u.test(text);
        results.push({ ...direct, observed: `anon GET /rest/v1/notes → HTTP ${response.status}${leaked ? ' (메모 내용이 보임)' : ', 메모 내용 없음'}` });
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
