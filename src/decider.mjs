// ALEPH SDP 엔진이 확인한 요청만 받는 학생 판정기 시작점입니다.
// 6단계부터 규칙을 하나씩 추가합니다. 어느 규칙에도 맞지 않는 요청은 시작 틀 응답(starter.deny)으로 거부합니다.
// 요청 본문의 userId, role, 기기 키, 토큰을 별도로 믿거나 저장하지 마세요.
export const RULE_IDS = Object.freeze([
  'starter.deny', 'device_registered', 'step_up_required', 'own_notes_zone', 'instructor_notice_zone',
]);

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
// 기준 값(심야 22시~다음 날 5시, 15분(900초) 안 5건 이상, 재확인 900초 이내)은 심판 가상 사건 연습에 맞춘 이 파일의 값이며 계약이 정한 값이 아닙니다.
// 900초는 계약이 정한 유일한 시간 한계(재확인 나이 0~900초)에 맞춘 값입니다.
// 시각·네트워크가 알 수 없음(null)이면 근거가 없는 것이므로 규칙이 맞지 않고, 정상값으로 채우지도 않습니다.
const NIGHT_FROM_HOUR = 22;
const NIGHT_TO_HOUR = 5;
const BURST_WINDOW_SECONDS = 900;
const BURST_MIN_COUNT = 5;
const STEP_UP_MAX_AGE_SECONDS = 900;
const STEP_UP_REQUIRED_EVIDENCE = ['unusual_hour', 'unusual_network', 'read_burst'];
const REQUEST_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;

export function stepUpEvidence(request) {
  const { signals, events } = readAccessInfo(request);
  const evidence = [];
  // 심야는 날이 바뀌는 구간(22시 이상 또는 5시 이하)입니다.
  if (signals.hour !== null && (signals.hour >= NIGHT_FROM_HOUR || signals.hour <= NIGHT_TO_HOUR)) evidence.push('unusual_hour');
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

// 8단계 구역 규칙: 엔진이 확인한 사용자(subjectId)·기기(deviceId)·메서드·정확한 경로(route와 path)가 아래 표와 맞을 때만 구역이 정해집니다.
// 표에 없는 경로·메서드는 구역이 없고 맨 아래 starter.deny가 거부합니다(알 수 없는 경로는 거부).
// own_notes_zone(자원 ID notes.own): 내 메모 한 건 읽기·수정. 메모 주인은 계약에 없어 여기서 가리지 못하므로,
//   B가 A의 메모 ID를 고른 요청은 최종 자료 API가 저장된 owner_id와 대조해 막습니다.
//   메모 목록(GET /notes)은 판정기가 보기에 여러 사람의 자료를 한꺼번에 여는 경로라 표에 넣지 않습니다(S08_OTHER_ZONE_ALLOWED).
// instructor_notice_zone(자원 ID notices.instructor): 강사임을 증명하는 값이 계약에 없어 공지 수정은 누구의 요청이든 거부합니다.
// :id 칸은 자료 ID만 고릅니다. 같은 깊이에 export 같은 기능 경로를 두지 않으므로 그 칸의 값은 언제나 자료 ID로만 읽힙니다.
// 쿼리로 기능을 고르지 않습니다. 이 경로들은 쿼리를 쓰지 않으므로 쿼리가 붙은 요청(queryLength가 0이 아님)은 표에 맞지 않습니다.
// 경로 모양은 시작 틀 연습 요청(GET /notes/:id)과 aleph.config.json(GET /api/notes/:id) 두 가지를 받습니다. 엔진이 어느 쪽을 보내는지는 확인하지 못했습니다.
// 이 파일은 격리 환경에서 혼자 불릴 수 있어 src/resources.mjs를 불러오지 않고 구역 이름을 여기 따로 적습니다.
const ZONE_ROUTES = Object.freeze([
  ['own_notes_zone', 'GET', '/notes/:id'],
  ['own_notes_zone', 'PUT', '/notes/:id'],
  ['instructor_notice_zone', 'PUT', '/notices/:id'],
]);
const ROUTE_PREFIXES = ['', '/api'];
const RESOURCE_ID = '[A-Za-z0-9][A-Za-z0-9_-]{0,63}';
const SUBJECT_ID = /^\S{1,256}$/u;
const DEVICE_ID = /^[0-9a-f]{16}$/u;

export function zoneOf(request) {
  if (typeof request?.subjectId !== 'string' || !SUBJECT_ID.test(request.subjectId)) return null;
  if (typeof request.deviceId !== 'string' || !DEVICE_ID.test(request.deviceId)) return null;
  if (request.queryLength !== 0 || typeof request.path !== 'string') return null;
  for (const [zone, method, template] of ZONE_ROUTES) {
    if (request.method !== method) continue;
    for (const prefix of ROUTE_PREFIXES) {
      const exactPath = new RegExp(`^${prefix}${template.replace(':id', RESOURCE_ID)}$`, 'u');
      if (request.route === `${method} ${prefix}${template}` && exactPath.test(request.path)) return zone;
    }
  }
  return null;
}

export async function decide(request) {
  // 6단계 device_registered: 엔진이 넣어 준 deviceRegistered가 true가 아니면 어느 구역이든 먼저 거부합니다.
  // false이거나 값이 없거나 true가 아닌 값(문자열 'true' 등)이면 미등록 기기로 봅니다.
  if (request?.deviceRegistered !== true) {
    return answer(request, 'deny', 'device_not_registered', 'device_registered');
  }
  const zone = zoneOf(request);
  if (zone === 'instructor_notice_zone') return answer(request, 'deny', 'starter_not_ready', 'instructor_notice_zone');
  if (zone === 'own_notes_zone') {
    // 7단계 step_up_required: 복합 이상 접속은 확인 전에는 추가 확인을 요청하고, 엔진이 다시 확인했다고 알려 준 새 요청은 다시 판정해 허용합니다.
    // 8단계에서 내 메모 수정(PUT)이 열렸으므로 이 확인은 읽기와 수정 모두에 걸립니다.
    const evidence = stepUpEvidence(request);
    if (STEP_UP_REQUIRED_EVIDENCE.every(item => evidence.includes(item))) {
      if (reverified(request.stepUp)) {
        return answer(request, 'allow', 'approved', 'device_registered', 'own_notes_zone', 'step_up_required');
      }
      // 사유 기록: 요청 ID와 근거 이름만 오류 출력에 한 줄 남깁니다. 계정·기기·쿼리 지문·접속 값·토큰은 쓰지 않습니다.
      // 심판은 이 파일 하나를 process가 없는 격리 환경에서 부를 수 있으므로, 쓸 수 있을 때만 쓰고 실패해도 판정은 그대로 돌려줍니다.
      const id = typeof request.requestId === 'string' && REQUEST_ID.test(request.requestId) ? request.requestId : 'unknown';
      try { globalThis.process?.stderr?.write?.(`step_up_required request=${id} evidence=${evidence.join(',')}\n`); } catch {}
      return answer(request, 'step_up', 'step_up_required', 'step_up_required');
    }
    return answer(request, 'allow', 'approved', 'device_registered', 'own_notes_zone');
  }
  return answer(request, 'deny', 'starter_not_ready', RULE_IDS[0]);
}
