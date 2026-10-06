// The student changes this check as each stage adds an attack to the same app.
// Never return tokens, private keys, real names, or note bodies.
export async function runAttackChecks(config) {
  if (![1, 2].includes(config.step)) throw new Error('이 단계의 공격 점검을 src/attack-check.mjs에 구현해 주세요.');
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
