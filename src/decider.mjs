// ALEPH SDP 엔진이 확인한 요청만 받는 학생 판정기 시작점입니다.
// 6단계부터 규칙을 하나씩 추가합니다. 어느 규칙에도 맞지 않는 요청은 시작 틀 응답(starter.deny)으로 거부합니다.
// 요청 본문의 userId, role, 기기 키, 토큰을 별도로 믿거나 저장하지 마세요.
export const RULE_IDS = Object.freeze(['starter.deny', 'device_registered', 'step_up_required']);

const answer = (request, decision, reasonCode, ...ruleIds) => ({
  schema: 'aleph.decision.v1',
  requestId: request?.requestId,
  decision,
  reasonCode,
  ruleIds,
});

// 7단계 입력 검사: 엔진이 넘긴 접속 정보(signals, recentEvents)의 출처를 구분해 읽습니다.
// 계약(docs/DECIDER_REQUEST.md)에 있는 이 두 항목만 읽고, 요청에 headers·geo·device 같은 이름이 있어도 읽지 않습니다.
// 없거나 모양이 틀리거나 출처를 알 수 없으면 null로 남깁니다. local·usual·14시 같은 정상값으로 채우지 않습니다.
// signals.origin: judge_fixture(심판의 가상 신호, virtual) | none(실제 경로, 정보 없음) | untrusted(출처 불명·모양 불일치) | missing
// judge_fixture도 가상 연습 입력일 뿐 실제 위치 증거가 아닙니다.
const SIGNAL_KEYS = 'hour,network,region,source';
const EVENT_KEYS = 'ageSeconds,count,kind';
const REGIONS = ['local', 'foreign'];
const NETWORKS = ['usual', 'unusual'];
const MAX_EVENTS = 12;

const isPlain = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const sameKeys = (value, keys) => Object.keys(value).sort().join() === keys;

function readSignals(signals) {
  const unknown = origin => ({ origin, virtual: false, region: null, network: null, hour: null });
  if (!isPlain(signals)) return unknown('missing');
  if (!sameKeys(signals, SIGNAL_KEYS)) return unknown('untrusted');
  if (signals.source === 'none') {
    return signals.region === 'unknown' && signals.network === 'unknown' ? unknown('none') : unknown('untrusted');
  }
  if (signals.source !== 'judge_fixture') return unknown('untrusted');
  return {
    origin: 'judge_fixture',
    virtual: true,
    region: REGIONS.includes(signals.region) ? signals.region : null,
    network: NETWORKS.includes(signals.network) ? signals.network : null,
    hour: Number.isInteger(signals.hour) && signals.hour >= 0 && signals.hour <= 23 ? signals.hour : null,
  };
}

// 하나라도 모양이 틀리면 전체를 null(알 수 없음)로 둡니다. 빈 배열은 엔진이 "최근 사건 없음"이라고 준 값일 때만 나옵니다.
function readEvents(events) {
  if (!Array.isArray(events) || events.length > MAX_EVENTS) return null;
  const clean = [];
  for (const item of events) {
    if (!isPlain(item) || !sameKeys(item, EVENT_KEYS)
        || typeof item.kind !== 'string' || !/^[a-z][a-z0-9_]{0,63}$/u.test(item.kind)
        || !Number.isFinite(item.ageSeconds) || item.ageSeconds < 0
        || !Number.isInteger(item.count) || item.count < 0) return null;
    clean.push({ kind: item.kind, ageSeconds: item.ageSeconds, count: item.count });
  }
  return clean;
}

export function readAccessInfo(request) {
  return { signals: readSignals(request?.signals), events: readEvents(request?.recentEvents) };
}

// 7단계 step_up_required: 평소와 다른 시각 + 처음 보는 네트워크 + 갑작스러운 대량 조회가 모두 있을 때만 추가 확인(step_up)을 요청합니다.
// 지역(region)은 사유 기록용 참고일 뿐 근거가 아닙니다. 지역 하나로는 추가 확인도 거부도 하지 않고, 이 규칙은 영구 차단하지 않습니다.
// 기준 값(심야 0~5시, 10분 안 10건 이상, 재확인 900초 이내)은 심판 가상 사건 연습에 맞춘 이 파일의 값이며 계약이 정한 값이 아닙니다.
// 시각·네트워크가 알 수 없음(null)이면 근거가 없는 것이므로 규칙이 맞지 않고, 정상값으로 채우지도 않습니다.
const NIGHT_FROM_HOUR = 0;
const NIGHT_TO_HOUR = 5;
const BURST_WINDOW_SECONDS = 600;
const BURST_MIN_COUNT = 10;
const STEP_UP_MAX_AGE_SECONDS = 900;
const STEP_UP_REQUIRED_EVIDENCE = ['unusual_hour', 'unusual_network', 'read_burst'];
const REQUEST_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;

export function stepUpEvidence(request) {
  const { signals, events } = readAccessInfo(request);
  const evidence = [];
  if (signals.hour !== null && signals.hour >= NIGHT_FROM_HOUR && signals.hour <= NIGHT_TO_HOUR) evidence.push('unusual_hour');
  if (signals.network === 'unusual') evidence.push('unusual_network');
  const recent = (events ?? []).reduce((sum, item) => (item.ageSeconds <= BURST_WINDOW_SECONDS ? sum + item.count : sum), 0);
  if (recent >= BURST_MIN_COUNT) evidence.push('read_burst');
  if (signals.region === 'foreign') evidence.push('foreign_region');
  return evidence;
}

// 엔진이 준 stepUp이 계약 모양(verified true, 나이 0~900초 정수)일 때만 다시 확인된 것으로 봅니다. 그 밖은 확인 전으로 봅니다.
// 같은 로그인으로 새로 로그인했는지는 엔진이 검증하며, 이 파일은 그 검증을 할 수 없습니다.
function reverified(stepUp) {
  return isPlain(stepUp) && sameKeys(stepUp, 'authAgeSeconds,verified') && stepUp.verified === true
    && Number.isInteger(stepUp.authAgeSeconds) && stepUp.authAgeSeconds >= 0
    && stepUp.authAgeSeconds <= STEP_UP_MAX_AGE_SECONDS;
}

export async function decide(request) {
  // 6단계 device_registered: 엔진이 넣어 준 deviceRegistered가 true일 때만 내 자료실 읽기(GET)를 허용합니다.
  // false이거나 값이 없거나 true가 아닌 값(문자열 'true' 등)이면 미등록 기기로 보고 거부합니다.
  if (request?.deviceRegistered !== true) {
    return answer(request, 'deny', 'device_not_registered', 'device_registered');
  }
  if (request.method === 'GET') {
    // 7단계 step_up_required: 복합 이상 접속은 확인 전에는 추가 확인을 요청하고, 엔진이 다시 확인했다고 알려 준 새 요청은 다시 판정해 허용합니다.
    const evidence = stepUpEvidence(request);
    if (STEP_UP_REQUIRED_EVIDENCE.every(item => evidence.includes(item))) {
      if (reverified(request.stepUp)) return answer(request, 'allow', 'approved', 'device_registered', 'step_up_required');
      // 사유 기록: 요청 ID와 근거 이름만 오류 출력에 한 줄 남깁니다. 계정·기기·쿼리 지문·접속 값·토큰은 쓰지 않습니다.
      const id = typeof request.requestId === 'string' && REQUEST_ID.test(request.requestId) ? request.requestId : 'unknown';
      process.stderr.write(`step_up_required request=${id} evidence=${evidence.join(',')}\n`);
      return answer(request, 'step_up', 'step_up_required', 'step_up_required');
    }
    return answer(request, 'allow', 'approved', 'device_registered');
  }
  return answer(request, 'deny', 'starter_not_ready', RULE_IDS[0]);
}
