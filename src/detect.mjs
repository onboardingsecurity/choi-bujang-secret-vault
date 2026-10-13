// 9단계에서 학생이 채우는 탐지 함수입니다. 이 기본값은 어떤 접속도 회수하지 않습니다.
// 반 엔진이 검증한 사건만 전달해야 하며, 브라우저가 보낸 사용자 번호는 받지 않습니다.

// 9단계 입력 검사: 가상 사건에서 가명 사용자·기기·요청 종류·판정·시각만 읽습니다.
// 그 밖의 이름(본문, 토큰, 이름 등)은 있어도 복사하지 않고, 값이 이상하면 사건을 버립니다.
const MAX_EVENTS = 10000;
const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
const DECISIONS = ['allow', 'deny', 'step_up'];
const SUBJECT_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
const DEVICE_PATTERN = /^[0-9a-f]{16}$/;
const NETWORKS = ['usual', 'unusual'];
const BURST_WINDOW_MS = 10 * 60 * 1000;
const BURST_OVER = 120;

function own(object, name) {
  return object !== null && typeof object === 'object' && Object.hasOwn(object, name) ? object[name] : undefined;
}

// 사건 하나를 읽어 {at, method, subject, deviceId, decision}만 돌려줍니다. 필수 값이 틀리면 null입니다.
// deviceId·decision은 계약(docs/DETECT_EVENTS.md)에 없는 선택 항목이라 없거나 틀리면 null로 둡니다.
export function readDetectEvent(raw) {
  const at = own(raw, 'at');
  if (typeof at !== 'string' || Number.isNaN(Date.parse(at)) || new Date(at).toISOString() !== at) return null;
  const method = own(raw, 'method');
  if (!METHODS.includes(method)) return null;
  const subject = own(own(raw, 'identity'), 'sub');
  if (typeof subject !== 'string' || !SUBJECT_PATTERN.test(subject)) return null;
  const deviceId = own(raw, 'deviceId');
  const decision = own(raw, 'decision');
  const network = own(raw, 'network');
  return {
    at, method, subject,
    deviceId: typeof deviceId === 'string' && DEVICE_PATTERN.test(deviceId) ? deviceId : null,
    decision: DECISIONS.includes(decision) ? decision : null,
    network: NETWORKS.includes(network) ? network : null,
  };
}

// 사건 목록을 읽어 쓸 수 있는 사건과 버린 건수를 돌려줍니다. 버린 사건의 내용은 남기지 않습니다.
export function readDetectEvents(events) {
  if (!Array.isArray(events)) throw new TypeError('invalid_detection_events');
  const read = [];
  let rejected = Math.max(0, events.length - MAX_EVENTS);
  for (const raw of events.slice(0, MAX_EVENTS)) {
    const event = readDetectEvent(raw);
    if (event) read.push(event); else rejected += 1;
  }
  return { events: read, rejected };
}

// 회수 제안 대상: 낯선 네트워크 사건이 모두 같은 기기에서 왔을 때만 그 기기 한 개입니다.
// 기기 값이 없거나 둘 이상이면 대상을 정할 수 없으므로 null입니다(정상 기기는 건드리지 않습니다).
function singleUnusualDevice(reads, start, end) {
  const devices = new Set();
  for (let i = start; i <= end; i += 1) {
    if (reads[i].unusual) devices.add(reads[i].deviceId);
  }
  const [only] = devices;
  return devices.size === 1 && only !== null ? only : null;
}

// 복합 의심 규칙: 같은 사용자의 GET이 10분 구간에서 120건을 넘고, 그 구간에 낯선 네트워크(unusual)
// 사건이 함께 있을 때만 의심입니다. 조회만 많거나 네트워크만 낯설면 의심이 아닙니다.
// 네트워크 값이 없으면(null) 낯선 것으로 치지 않습니다. 지역은 읽지 않습니다.
export function findCompoundSuspects(events) {
  const bySubject = new Map();
  for (const event of events) {
    if (event.method !== 'GET') continue;
    if (!bySubject.has(event.subject)) bySubject.set(event.subject, []);
    bySubject.get(event.subject).push({ time: Date.parse(event.at), unusual: event.network === 'unusual', deviceId: event.deviceId });
  }
  const suspects = [];
  for (const [subject, reads] of bySubject) {
    reads.sort((a, b) => a.time - b.time);
    let start = 0;
    let unusual = 0;
    for (let end = 0; end < reads.length; end += 1) {
      if (reads[end].unusual) unusual += 1;
      while (reads[end].time - reads[start].time >= BURST_WINDOW_MS) {
        if (reads[start].unusual) unusual -= 1;
        start += 1;
      }
      if (end - start + 1 > BURST_OVER && unusual > 0) {
        suspects.push({ subject, reasonCode: 'unusual_network_burst', deviceId: singleUnusualDevice(reads, start, end) });
        break;
      }
    }
  }
  return suspects;
}

// 계약(docs/DETECT_EVENTS.md) 모양의 사건에는 네트워크 값이 없습니다. 한 사용자의 GET 사건에 네트워크 값이
// 하나도 없을 때만 계약대로 10분 구간 120건 초과를 회수 제안(burst_read) 대상으로 봅니다.
// 네트워크 값이 있는 사용자는 위 복합 규칙만 따르므로, 평소 네트워크(usual)의 다량 조회는 제안하지 않습니다.
function findContractBurst(events) {
  const bySubject = new Map();
  for (const event of events) {
    if (event.method !== 'GET') continue;
    if (!bySubject.has(event.subject)) bySubject.set(event.subject, []);
    bySubject.get(event.subject).push(event);
  }
  for (const [subject, reads] of bySubject) {
    if (reads.some(event => event.network !== null)) continue;
    const times = reads.map(event => Date.parse(event.at)).sort((a, b) => a - b);
    let start = 0;
    for (let end = 0; end < times.length; end += 1) {
      while (times[end] - times[start] >= BURST_WINDOW_MS) start += 1;
      if (end - start + 1 > BURST_OVER) return subject;
    }
  }
  return null;
}

// 정상 사건은 전처럼 { action: 'observe' }만 돌려줍니다. 접속 허용/거부 응답(decide)과는 별개인 탐지 결과입니다.
// 복합 의심에 대상 기기 한 개가 확인되면 그 기기의 회수 제안, 계약 모양 사건의 다량 조회면 계약의 회수 제안을 냅니다.
// 이 함수는 제안만 합니다. 실제 회수와 걸린 시간은 운영 쪽(심판)이 확인하며 여기서 기기 권한을 바꾸지 않습니다.
export function detect(events) {
  const { events: read } = readDetectEvents(events);
  const suspicious = findCompoundSuspects(read);
  const target = suspicious.find(item => item.deviceId !== null);
  if (target) {
    return { action: 'propose_revocation', reasonCode: target.reasonCode, subject: target.subject,
      deviceId: target.deviceId, suspicious };
  }
  const burstSubject = findContractBurst(read);
  if (burstSubject) return { action: 'propose_revocation', reasonCode: 'burst_read', subject: burstSubject };
  return suspicious.length > 0 ? { action: 'observe', suspicious } : { action: 'observe' };
}
