// 8단계: 자료실 구역마다 서버가 붙이는 자원 ID입니다. 요청 본문·쿼리·화면 메뉴에서 오는 값이 아니라
// 서버 함수가 자기 구역을 정해서 넘기는 고정 값입니다. 자원 ID는 소유자를 뜻하지 않습니다(소유자 검사는 notes-api.mjs).
export const RESOURCE_IDS = Object.freeze({
  myNotes: 'notes.own', // 내 메모: /api/notes, /api/notes/:id
  instructorNotices: 'notices.instructor', // 강사 공지: 이 ID만 예약했고 아직 연결된 주소·자료가 없습니다.
  myDevices: 'devices.own', // 11단계 내 기기 승인: /api/device/status·challenge·register·verify
  warRoom: 'warroom.own', // 12단계 탈환 작전실 요약: /api/war-room (개수·상태만, 메모 본문 없음)
});

export const RESOURCE_HEADER = 'X-Resource-Id';
