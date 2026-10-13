// 11단계: 메모·복원 API가 자료를 주기 전에 확인하는 기기 승인 상태입니다.
// 이번 로그인 세션(Supabase가 서명한 토큰의 session_id)이 승인된 기기의 패스키 서명으로 확인된 적이 있고,
// 확인 시간이 지나지 않았으며, 그 기기가 지금도 approved일 때만 통과합니다.
// 화면이 보낸 값(승인 버튼, 요청 본문, 헤더)은 읽지 않고 서버 DB의 devices·device_sessions 행만 봅니다.
// 이 파일은 notes-api.mjs가 불러오므로 다른 src 파일을 불러오지 않습니다(순환 방지).

// 기기 확인 한 번이 이 로그인 세션에서 유효한 시간입니다. 지나면 다시 패스키로 확인합니다(이 파일에서 정한 값).
export const DEVICE_SESSION_SECONDS = 3600;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;
export const sameUser = (ownerId, user) =>
  typeof ownerId === 'string' && ownerId.toLowerCase() === String(user?.userId).toLowerCase();

// 결과: { reason: null | 'device_not_verified' | 'device_not_approved' | 'device_check_failed', expiresAt }
// DB를 읽지 못하면 열어 두지 않고 device_check_failed로 거부합니다.
export async function readDeviceSession(db, user, now = Date.now()) {
  const sessionId = user?.sessionId;
  if (typeof sessionId !== 'string' || !UUID.test(sessionId)) return { reason: 'device_not_verified', expiresAt: null };
  const { data: session, error } = await db.from('device_sessions')
    .select('owner_id, device_id, verified_at, expires_at').eq('session_id', sessionId).maybeSingle();
  if (error) return { reason: 'device_check_failed', expiresAt: null };
  if (!session || !sameUser(session.owner_id, user) || !session.device_id || !session.verified_at
      || !(Date.parse(session.expires_at) > now)) return { reason: 'device_not_verified', expiresAt: null };
  const { data: device, error: deviceError } = await db.from('devices')
    .select('owner_id, status').eq('id', session.device_id).maybeSingle();
  if (deviceError) return { reason: 'device_check_failed', expiresAt: null };
  // 확인한 뒤에 회수(revoked)되었거나 대기로 돌아간 기기는 바로 거부합니다.
  if (!device || !sameUser(device.owner_id, user) || device.status !== 'approved') {
    return { reason: 'device_not_approved', expiresAt: null };
  }
  return { reason: null, expiresAt: session.expires_at };
}
