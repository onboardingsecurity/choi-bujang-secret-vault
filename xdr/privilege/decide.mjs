// 근거: MITRE ATT&CK T1078(Valid Accounts), T1068(Exploitation for Privilege Escalation). 값은 patterns.json과 같습니다.
// 이 파일은 다른 파일·패키지를 불러오지 않고, 파일을 읽거나 쓰지 않고, 바깥에 묻지 않고 혼자 계산해서 답합니다.
// 읽는 칸은 경보 설명(rule.description)과 그룹 이름(data.group) 둘뿐입니다. 시각(timestamp)과 규칙 수준(rule.level), 경보의 mitre 칸은 읽지 않습니다.
// ATT&CK는 건수·시간 기준을 정하지 않고, 연습 경보의 시각은 모두 09~16시라 업무 시간 밖 여부는 시각 숫자로 가를 수 없습니다.
// 그래서 업무 시간 밖은 경보 설명의 문구로만 읽습니다. 규칙 수준을 읽으면 경보가 이미 준 점수를 따라 적는 것이라 읽지 않습니다.
const PATTERNS = [
  {
    name: 'admin_group_addition',
    mitre: 'T1078',
    condition: {
      where: ['경보 설명(rule.description)', '그룹 이름(data.group)'],
      event: '평범한 계정이 관리자 그룹(administrators)에 추가됨',
      signals: ['관리자 그룹에 계정이 추가됨', '원격 주소에서 추가됨', '추가 직후 관리자 명령이 이어짐'],
      supporting: '같은 주소에서 여러 계정이 관리자 그룹에 추가되거나, 관리자 그룹에서 빠진 계정이 곧 다시 들어오면 근거를 더합니다.',
      notMatch: [
        '관리자가 아닌 과제 그룹에 추가된 경우',
        '새 로컬 그룹이 만들어졌고 멤버가 본인 한 명뿐인 경우',
        '그룹 목록이나 그룹 소속을 읽기만 한 경우',
        '수업 그룹의 설명만 바뀐 경우',
      ],
    },
    evidence: 'T1078(Valid Accounts): 공격자는 훔친 정상 계정으로 권한을 높여 관리자 수준까지 올라갈 수 있으므로, 평범한 계정이 갑자기 관리자 그룹에 들어간 것은 그 권한 상승의 흔적일 수 있습니다(그룹 추가를 직접 짚은 탐지 단서는 아님).',
  },
  {
    name: 'unfamiliar_admin_command',
    mitre: 'T1078',
    condition: {
      where: ['경보 설명(rule.description)'],
      event: '관리자 명령 실행',
      signals: [
        '처음 보는 주소에서 관리자 명령을 실행함',
        '방금 관리자가 된 계정이 곧바로 관리자 명령을 실행함',
        '다른 계정의 권한으로 관리자 명령을 실행함',
      ],
      supporting: '같은 계정이 직전에 관리자 그룹에 추가됐다는 경보가 있으면 근거를 더합니다.',
      notMatch: [
        '평소 주소에서 관리자 명령이 한 번 실행된 경우',
        '관리자 명령이 실패 한 건으로 끝난 경우',
        '권한 상승 창이 한 번 뜨고 취소된 경우',
        '수업 중 권한 상승이 한 건 있고 이어서 명령이 없는 경우',
        '수업용 관리 계정이나 서비스 계정이 평소 주소에서 평소 일을 한 경우',
      ],
    },
    evidence: 'T1078(Valid Accounts): 공격자는 훔친 정상 계정으로 권한을 높이고, ATT&CK 탐지 단서는 예상과 다른 시간·주소의 로그온과 예상 밖의 프로세스 실행을 보라고 하므로, 방금 관리자가 된 평범한 계정이나 처음 보는 주소의 관리자 명령이 그 흔적입니다.',
  },
  {
    name: 'off_hours_privileged_use',
    mitre: 'T1078',
    condition: {
      where: ['경보 설명(rule.description)'],
      event: '관리자 그룹 추가 또는 관리자 명령 실행',
      signals: [
        '수업 시간 밖이나 업무처럼 보이지 않는 시각에 일어났다고 설명함',
        '그 시각에 관리자 그룹 추가와 명령 실행이 함께 있음',
      ],
      supporting: '처음 보는 주소에서 일어났다고 설명하면 근거를 더합니다.',
      notMatch: [
        '수업 시간에 일어난 평소 관리 작업',
        '시각 언급 없이 로그인·로그아웃·조회만 있는 경우',
        '관리자 권한을 쓰지 않은 수업 시간 밖 활동',
      ],
    },
    evidence: 'T1078(Valid Accounts): ATT&CK 탐지 단서가 시간적으로 일관되지 않은 활동과 예상과 다른 시간의 로그인을 보라고 하므로, 업무 시간 밖의 관리자 권한 사용은 정상 계정을 도용했다는 의심 근거입니다.',
  },
  {
    name: 'session_admin_without_group_change',
    mitre: 'T1068',
    condition: {
      where: ['경보 설명(rule.description)', '그룹 이름(data.group)'],
      event: '세션의 권한이 관리자로 바뀜',
      signals: ['관리자 그룹 추가 기록 없이 세션이 관리자 권한으로 바뀜', '그 요청 주소를 처음 봄'],
      supporting: '관리자 명령이 곧바로 이어지면 근거를 더합니다. 이 패턴은 악용을 확인하는 것이 아니라 의심 단서로만 씁니다.',
      notMatch: [
        '관리자 그룹 추가 기록이 함께 있는 경우(admin_group_addition으로 봄)',
        '권한 상승 창이 떴다가 취소된 경우',
        '자기 계정 종류를 조회만 하고 변경이 없는 경우',
      ],
    },
    evidence: 'T1068(Exploitation for Privilege Escalation): 소프트웨어 오류를 악용하면 낮은 권한에서 SYSTEM·root로 올라가고 ATT&CK 탐지 단서는 이어지는 비정상 프로세스·토큰 동작을 보라고 하므로, 그룹 변경 기록 없이 세션 권한만 관리자로 바뀐 경우가 그 단서일 수 있습니다(악용 확인은 아님).',
  },
];

const [GROUP_ADD, ADMIN_COMMAND, OFF_HOURS, SESSION_ADMIN] = PATTERNS;

// 경보 한 건에서 읽은 사실입니다. 모든 판단은 아래 값만 씁니다.
// "관리자 그룹은 아닙니다."처럼 낱말 세 개 이하의 짧은 부정문은 읽지 않습니다(관리자 그룹이라는 낱말이 있어도 관리자 그룹이 아니라는 뜻이므로).
// 긴 문장 안의 "변경은 없습니다"는 그 문장이 다른 일도 말하므로 버리지 않습니다.
// 읽는 글자 수 한도 2000은 이 모듈이 정한 값입니다(요구사항·ATT&CK·patterns.json이 정하지 않았고 persistence 모듈의 값을 따랐습니다).
const MAX_LENGTH = 2000;
const NEGATED_SENTENCE = /^\S+(?: \S+){0,2}[은는] (?:없습니다|아닙니다)\.?$/u;
const ADMIN_GROUP_NAME = /^(?:administrators?|admins?|domain admins|관리자)$/iu;
const text = value => (typeof value === 'string' ? value.slice(0, MAX_LENGTH) : '');

// 같은 문장 안에서 "세션 → 관리자 권한(또는 권한 → 관리자) → 바뀜" 순서가 있는지 봅니다.
// 정규식의 [^.]*를 겹쳐 쓰면 같은 낱말이 많이 반복되는 긴 입력에서 몇 초씩 걸려, 가장 이른 위치부터 차례로 찾습니다(입력 길이에 비례해 끝남).
const CHANGE_VERB = /바뀌|바뀐|올라|상승|변경/u;
function sessionBecameAdmin(said) {
  for (const part of said.split('.')) {
    const s = part.indexOf('세션');
    if (s < 0) continue;
    const a = part.indexOf('관리자 권한', s + 2);
    const k = part.indexOf('권한', s + 2);
    const b = k < 0 ? -1 : part.indexOf('관리자', k + 2);
    const ends = [a < 0 ? -1 : a + 6, b < 0 ? -1 : b + 3].filter(e => e >= 0);
    if (ends.length > 0 && CHANGE_VERB.test(part.slice(Math.min(...ends)))) return true;
  }
  return false;
}

function facts(alert) {
  const sentences = text(alert?.rule?.description).split(/(?<=\.)\s+/u).map(s => s.trim()).filter(Boolean);
  const said = sentences.filter(s => !NEGATED_SENTENCE.test(s)).join(' ');
  const adminGroup = /관리자 그룹/u.test(said) || ADMIN_GROUP_NAME.test(text(alert?.data?.group).trim());
  // "추가되지 않았습니다", "실행하지 않았습니다"처럼 그 일이 없었다고 말하는 문장은 일로 읽지 않습니다. 동사 바로 뒤의 "않"만 봅니다.
  const groupAdded = adminGroup && /(?:추가|들어)(?![가-힣]{0,4} 않)/u.test(said);
  return {
    said,
    groupAdded,
    adminCommand: /(?:관리자|권한) 명령(?![^.]{0,15}(?:않았|않습|못했))/u.test(said),
    // 관리자 그룹 추가 기록이 함께 있으면 세션 패턴이 아니라 admin_group_addition으로 봅니다(patterns.json의 notMatch).
    sessionAdmin: !groupAdded && sessionBecameAdmin(said),
    offHours: /수업 시간 밖|업무 시간 밖|업무처럼 보이지 않는/u.test(said),
    firstSeen: /처음 보는 (?:주소|IP|위치|곳)|주소[^.]*처음 (?:보는|봅니다)/u.test(said),
  };
}

// 패턴마다 일(strong)이 있는지, 뚜렷한 신호(clues)가 몇 개 맞는지 읽습니다. 신호의 이름은 patterns.json의 signals를 그대로 씁니다.
// strong은 patterns.json의 event이고, signals[0]은 그 event와 같은 말이라 신호로 세지 않습니다. supporting은 신호와 같은 무게로 셉니다.
// weak는 일과 관련은 있으나 patterns.json의 notMatch에 가까운 애매한 경우로, 뚜렷한 신호를 읽지 않고 확인 필요(alert)로만 남깁니다.
// 한 건씩 판단하므로 "직전에 같은 계정이 관리자 그룹에 추가됐다"는 다른 경보는 읽을 수 없고, 같은 경보 설명 안의 말만 읽습니다.
const MATCHERS = {
  [GROUP_ADD.name]: {
    strong: f => f.groupAdded,
    weak: f => /그룹/u.test(f.said) && /(?:추가|들어|만들어|바뀌|변경)(?![가-힣]{0,4} 않)/u.test(f.said),
    clues: [
      [GROUP_ADD.condition.signals[1], f => /원격 주소/u.test(f.said)],
      [GROUP_ADD.condition.signals[2], f => /(?:곧바로|직후|이어서)[^.]*명령|추가와 명령 실행|명령 실행이 같이/u.test(f.said)],
      ['여러 계정이 관리자 그룹에 추가됨', f => /계정 (?:[2-9]|\d{2,})개|여러 계정/u.test(f.said)],
      ['빠진 계정이 곧 다시 들어옴', f => /빠진[^.]*다시|다시[^.]*들어/u.test(f.said)],
    ],
  },
  [ADMIN_COMMAND.name]: {
    strong: f => f.adminCommand,
    clues: [
      [ADMIN_COMMAND.condition.signals[0], f => f.firstSeen],
      [ADMIN_COMMAND.condition.signals[1], f => /방금 관리자가 된|관리자가 된 (?:직후|뒤)|곧바로|직후/u.test(f.said)],
      [ADMIN_COMMAND.condition.signals[2], f => /다른 계정의 권한/u.test(f.said)],
    ],
  },
  // 업무 시간 밖이라는 말이 있고 관리자 그룹 추가나 관리자 명령이 함께 있을 때만 일이 됩니다.
  [OFF_HOURS.name]: {
    strong: f => f.offHours && (f.groupAdded || f.adminCommand),
    clues: [
      [OFF_HOURS.condition.signals[1], f => /추가와 명령 실행|명령 실행이 같이/u.test(f.said) || (f.groupAdded && f.adminCommand)],
      ['처음 보는 주소에서 일어남', f => f.firstSeen],
    ],
  },
  [SESSION_ADMIN.name]: {
    strong: f => f.sessionAdmin,
    weak: f => /권한 상승|계정 종류/u.test(f.said),
    clues: [
      [SESSION_ADMIN.condition.signals[1], f => f.firstSeen],
      ['관리자 명령이 곧바로 이어짐', f => f.adminCommand],
    ],
  },
};

// 정상 단서: 일이 있어도 뚜렷한 신호가 하나도 없으면서 읽기·조회만 했다는 말이 있으면 평소 일로 봅니다. 뚜렷한 신호가 있으면 무시합니다.
const NORMAL_MARKERS = [/읽기만/u, /조회만/u];

// 확신도(백분율 정수로 계산한 뒤 100으로 나눕니다). 숫자는 이 모듈이 정한 값이며 ATT&CK도 patterns.json도 정하지 않았습니다.
// 패턴의 일만 있으면 50(alert). 뚜렷한 신호가 하나면 +35로 85(block), 신호가 하나 늘 때마다 +5, 뚜렷한 신호가 있는 패턴이 둘 이상이면 +5, 상한 99.
// 패턴의 일이 없으면 0(record). 읽기·조회만 한 평소 일은 10(record).
const BLOCK_AT = 0.85;
const ALERT_AT = 0.5;
const POINTS = { base: 50, firstSignal: 35, moreSignal: 5, together: 5, cap: 99, normal: 10 };

const verdict = (points, reason) => {
  const confidence = Math.round(points) / 100;
  return { action: confidence >= BLOCK_AT ? 'block' : confidence >= ALERT_AT ? 'alert' : 'record', confidence, reason };
};

export function decide(alert) {
  const f = facts(alert);

  const hits = [];
  const calmed = [];
  for (const pattern of PATTERNS) {
    const matcher = MATCHERS[pattern.name];
    const strong = matcher.strong(f);
    if (!strong && !matcher.weak?.(f)) continue;
    const labels = strong ? matcher.clues.flatMap(([label, test]) => (test(f) ? [label] : [])) : [];
    if (labels.length === 0 && NORMAL_MARKERS.some(re => re.test(f.said))) { calmed.push(pattern.name); continue; }
    const points = POINTS.base + (labels.length > 0 ? POINTS.firstSignal + POINTS.moreSignal * (labels.length - 1) : 0);
    hits.push({ pattern, labels, points });
  }

  if (hits.length > 0) {
    hits.sort((a, b) => b.points - a.points);
    const clear = hits.filter(h => h.labels.length > 0);
    const together = clear.length >= 2;
    const points = Math.min(POINTS.cap, hits[0].points + (together ? POINTS.together : 0));
    if (clear.length === 0) {
      return verdict(points, `${hits[0].pattern.name}: 패턴과 관련된 일만 있고 뚜렷한 신호가 없어 확인이 필요합니다`);
    }
    const shown = together ? clear : [clear[0]];
    const clues = shown.flatMap(h => h.labels);
    return verdict(points, `${shown.map(h => h.pattern.name).join(', ')}: ${clues.join('·')}${together ? '·두 패턴이 함께 맞음' : ''}`);
  }

  if (calmed.length > 0) return verdict(POINTS.normal, `${calmed.join(', ')}: 읽기·조회만 한 평소 일로 보이는 정상 이벤트`);

  return verdict(0, `${PATTERNS.map(p => p.name).join(', ')}에 맞는 신호가 없는 정상 이벤트`);
}
