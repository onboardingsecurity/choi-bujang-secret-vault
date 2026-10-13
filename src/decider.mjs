// ALEPH SDP 엔진이 확인한 요청만 받는 학생 판정기 시작점입니다.
// 6단계부터 규칙을 하나씩 추가합니다. 어느 규칙에도 맞지 않는 요청은 시작 틀 응답(starter.deny)으로 거부합니다.
// 요청 본문의 userId, role, 기기 키, 토큰을 별도로 믿거나 저장하지 마세요.
export const RULE_IDS = Object.freeze(['starter.deny', 'device_registered']);

const answer = (request, decision, reasonCode, ruleId) => ({
  schema: 'aleph.decision.v1',
  requestId: request?.requestId,
  decision,
  reasonCode,
  ruleIds: [ruleId],
});

export async function decide(request) {
  // 6단계 device_registered: 엔진이 넣어 준 deviceRegistered가 true일 때만 내 자료실 읽기(GET)를 허용합니다.
  // false이거나 값이 없거나 true가 아닌 값(문자열 'true' 등)이면 미등록 기기로 보고 거부합니다.
  if (request?.deviceRegistered !== true) {
    return answer(request, 'deny', 'device_not_registered', 'device_registered');
  }
  if (request.method === 'GET') return answer(request, 'allow', 'approved', 'device_registered');
  return answer(request, 'deny', 'starter_not_ready', RULE_IDS[0]);
}
