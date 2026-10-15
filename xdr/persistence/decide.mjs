// 근거: MITRE ATT&CK T1543.003(Windows Service), T1053.005(Scheduled Task), T1547.001(Registry Run Keys / Startup Folder). 값은 patterns.json과 같습니다.
// 이 파일은 다른 파일·패키지를 불러오지 않고, 파일을 읽거나 쓰지 않고, 바깥에 묻지 않고 혼자 계산해서 답합니다.
// ATT&CK는 건수·시간 기준을 정하지 않습니다. 이 모듈은 건수가 아니라 서명·목록·경로 단서의 조합으로 가릅니다.
// 시작 폴더는 연습 경보가 T1543으로 표시했지만 ATT&CK에서는 T1547.001이라 경보의 mitre 칸은 읽지 않습니다.
const PATTERNS = [
  {
    name: 'unsigned_new_service',
    mitre: 'T1543.003',
    condition: {
      where: ['경보 설명(rule.description)'],
      event: '서비스 등록 또는 서비스 실행 파일 변경',
      signals: ['서명 없음', '새 서비스 또는 평소 목록에 없는 서비스', '다시 켜도 남도록 등록'],
      supporting: '실행 파일 경로(data.path)가 사용자 임시 폴더(AppData\\Local\\Temp)이면 근거를 더합니다.',
      notMatch: [
        '서명된 기존 서비스가 실행 중이라는 설명만 있는 경우',
        '서비스 설명만 바뀌고 실행 파일은 그대로인 경우',
        '서비스가 멈췄다가 같은 파일로 다시 시작된 경우',
      ],
    },
    evidence: 'T1543.003(Windows Service): 공격자는 새 서비스를 등록하거나 기존 서비스의 실행 파일 경로를 바꿔 부팅 때마다 자기 프로그램이 돌게 하므로, 서명 없는 새 서비스 등록이 그 흔적입니다.',
  },
  {
    name: 'unfamiliar_scheduled_task',
    mitre: 'T1053.005',
    condition: {
      where: ['경보 설명(rule.description)'],
      event: '예약 작업 생성',
      signals: ['처음 보는 예약 작업', '수업 시간 밖에 실행', '작업 이름이 임의 문자열'],
      supporting: '실행 파일 경로(data.path)가 사용자 임시 폴더(AppData\\Local\\Temp)이면 근거를 더합니다.',
      notMatch: [
        '평소 시각에 그대로인 기존 예약 작업',
        '수업 폴더(C:\\lab)의 수업 과제 이름이고 서명만 확인되지 않은 경우',
        '예약 작업이 하나 있고 실행 시각이 수업 시간뿐인 경우',
      ],
    },
    evidence: 'T1053.005(Scheduled Task): 공격자는 작업 스케줄러에 작업을 등록해 시작 때나 반복 일정으로 악성 코드를 실행하므로, 처음 보는 예약 작업의 생성은 새로 만들어졌거나 바뀐 예약 작업을 보라는 ATT&CK 탐지 단서와 맞습니다.',
  },
  {
    name: 'startup_folder_change',
    mitre: 'T1547.001',
    condition: {
      where: ['경보 설명(rule.description)', '실행 파일 경로(data.path)'],
      event: '시작 폴더에 항목 추가 또는 변경',
      signals: ['평소 목록에 없는 프로그램이 시작 폴더에 추가됨'],
      supporting: '경로가 사용자 시작 폴더(AppData\\Roaming\\Microsoft\\Windows\\Start Menu\\Programs\\Startup) 안이면 근거를 더합니다.',
      notMatch: [
        '시작 프로그램 목록을 읽기만 한 경우',
        '시작 폴더 변경이 1건이고 이어서 실행된 기록이 없는 경우',
        '시작 항목에 수업 도구 이름이 있고 서명을 아직 모르는 경우',
      ],
    },
    evidence: 'T1547.001(Registry Run Keys / Startup Folder): 공격자는 시작 폴더에 프로그램이나 바로가기를 넣어 사용자가 로그인할 때마다 실행되게 하므로, 평소 목록에 없는 시작 항목의 추가가 그 흔적입니다.',
  },
];

const [SERVICE, TASK, STARTUP] = PATTERNS;

// 패턴마다 경보 설명에서 읽는 낱말입니다. 이 목록은 patterns.json에는 없고 이 파일에만 있습니다.
// event는 그 패턴이 다루는 일이 경보에 있는지, signals는 patterns.json의 신호 항목을 같은 순서로 읽는 낱말입니다.
// 서명 여부와 평소 목록은 경보 설명의 문구로만 읽습니다(서명을 직접 검사하지 못함).
const TEMP_PATH = /\\AppData\\Local\\Temp\\/i;
const STARTUP_PATH = /\\Start Menu\\Programs\\Startup\\/i;
const MATCHERS = {
  [SERVICE.name]: {
    event: /서비스/,
    signals: [/서명이 없|서명 없|서명 안/, /새 서비스|처음 보는 서비스|평소 목록에 없는 서비스/, /다시 켜도 남도록/],
    supportedBy: (description, path) => TEMP_PATH.test(path) || /임시 폴더/.test(description),
  },
  [TASK.name]: {
    event: /예약 작업|예약된 작업/,
    signals: [/처음 보는 예약 작업|처음 보는 작업/, /수업 시간 밖/, /임의 문자열/],
    supportedBy: (description, path) => TEMP_PATH.test(path) || /임시 폴더|임시 파일/.test(description),
  },
  [STARTUP.name]: {
    event: /시작 폴더|시작 프로그램|시작 항목/,
    signals: [/평소 목록에 없는 (프로그램|항목|파일)/],
    supportedBy: (description, path) => STARTUP_PATH.test(path) || TEMP_PATH.test(path) || /임시 폴더|임시 파일/.test(description),
  },
};

// 정상 단서: 패턴의 일이 있어도 뚜렷한 신호가 하나도 없으면서 이 낱말이 있으면 평소 일로 봅니다. 뚜렷한 신호가 있으면 무시합니다.
const NORMAL_MARKERS = [/서명된/, /읽기만/, /평소 시각/, /기존[^.]*(마쳤|끝났|실행 중)/];

// "서비스 등록은 없습니다"처럼 일이 없었다는 문장은 읽지 않습니다. 서명이 들어간 문장은 이 규칙으로 버리지 않습니다("서명이 없습니다").
const NEGATED_SENTENCE = /^(?!.*서명).*[은는] 없습니다\.?$/;

// 확신도(백분율 정수로 계산한 뒤 100으로 나눕니다). 숫자는 이 모듈이 정한 값이며 ATT&CK도 patterns.json도 정하지 않았습니다.
// 패턴의 일만 있으면 50(alert). 뚜렷한 신호가 하나면 +35로 85(block), 신호가 하나 늘 때마다 +5, 경로 근거가 있으면 +5, 상한 99.
// 서로 다른 두 패턴의 일이 함께 있고 둘 다 경로 근거가 있으면(같은 임시 파일을 시작 항목과 예약 작업이 가리키는 경우 등) +30.
// 일은 없고 임시 폴더의 실행 파일만 있으면 50(alert). 아무 단서도 없으면 0(record).
const BLOCK_AT = 0.85;
const ALERT_AT = 0.5;
const POINTS = { base: 50, firstSignal: 35, moreSignal: 5, support: 5, together: 30, cap: 99, normal: 10, hint: 50 };
const MAX_LENGTH = 2000;

const text = value => (typeof value === 'string' ? value.slice(0, MAX_LENGTH) : '');
const verdict = (points, reason) => {
  const confidence = Math.round(points) / 100;
  return { action: confidence >= BLOCK_AT ? 'block' : confidence >= ALERT_AT ? 'alert' : 'record', confidence, reason };
};

export function decide(alert) {
  const path = text(alert?.data?.path);
  const sentences = text(alert?.rule?.description).split(/(?<=\.)\s+/u).map(s => s.trim()).filter(Boolean);
  const read = sentences.filter(s => !NEGATED_SENTENCE.test(s)).join(' ');
  const everything = sentences.join(' ');

  const hits = [];
  const calmed = [];
  for (const pattern of PATTERNS) {
    const matcher = MATCHERS[pattern.name];
    if (!matcher.event.test(read) && !(pattern === STARTUP && STARTUP_PATH.test(path))) continue;
    const labels = matcher.signals.flatMap((re, i) => (re.test(read) ? [pattern.condition.signals[i]] : []));
    const supported = matcher.supportedBy(read, path);
    if (labels.length === 0 && NORMAL_MARKERS.some(re => re.test(read))) { calmed.push(pattern.name); continue; }
    const points = POINTS.base
      + (labels.length > 0 ? POINTS.firstSignal + POINTS.moreSignal * (labels.length - 1) : 0)
      + (supported ? POINTS.support : 0);
    hits.push({ pattern, labels, supported, points });
  }

  if (hits.length > 0) {
    const together = hits.length >= 2 && hits.every(h => h.supported);
    hits.sort((a, b) => b.points - a.points);
    const points = Math.min(POINTS.cap, hits[0].points + (together ? POINTS.together : 0));
    const names = (together ? hits : [hits[0]]).map(h => h.pattern.name).join(', ');
    const clues = [
      ...(together ? hits.flatMap(h => h.labels) : hits[0].labels),
      ...((together ? hits : [hits[0]]).some(h => h.supported) ? ['경로 근거'] : []),
      ...(together ? ['두 패턴이 같은 경로를 함께 가리킴'] : []),
    ];
    const strong = clues.length > 0 && (hits[0].labels.length > 0 || together);
    return verdict(points, `${names}: ${strong ? clues.join('·') : '패턴의 일만 있고 뚜렷한 신호가 없어 확인이 필요합니다'}`);
  }

  if (calmed.length > 0) return verdict(POINTS.normal, `${calmed.join(', ')}: 서명된 기존 항목처럼 평소 일로 보이는 정상 이벤트`);

  // 패턴의 일은 없지만 임시 폴더에 실행 파일만 생긴 경우: 어느 패턴의 일이 없다고 적혔는지로 이름을 고릅니다.
  const executable = /실행 파일/.test(everything) || /\.(exe|dll|cmd|bat|ps1|vbs|scr)$/i.test(path);
  if (executable && (TEMP_PATH.test(path) || /임시 폴더/.test(everything))) {
    const named = PATTERNS.find(p => MATCHERS[p.name].event.test(everything)) ?? SERVICE;
    return verdict(POINTS.hint, `${named.name}: 임시 폴더에 실행 파일만 있고 등록은 확인되지 않아 확인이 필요합니다`);
  }

  return verdict(0, `${PATTERNS.map(p => p.name).join(', ')}에 맞는 신호가 없는 정상 이벤트`);
}
