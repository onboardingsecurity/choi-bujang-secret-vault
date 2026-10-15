// 근거: MITRE ATT&CK T1041(Exfiltration Over C2 Channel), T1048(Exfiltration Over Alternative Protocol). 값은 patterns.json의 patterns와 같습니다.
// 이 파일은 다른 파일·패키지를 불러오지 않고, 파일을 읽거나 쓰지 않고, 바깥에 묻지 않고 혼자 계산해서 답합니다. 시계·난수도 쓰지 않습니다.
// 내보내는 것은 decide(alert) 하나뿐입니다. 반환은 { action, confidence, reason }이고 0.85 이상 block, 0.5 이상 alert, 그 아래 record입니다.
// reason은 근거 패턴 이름으로 시작하는 한 줄이며 경보 설명 원문은 옮겨 적지 않습니다.
const PATTERNS = [
  {
    "name": "large_transfer_to_new_destination",
    "mitre": "T1048",
    "condition": {
      "where": [
        "경보 설명(rule.description)",
        "전송 크기(data.bytes)"
      ],
      "event": "평소보다 큰 자료가 처음 보는 목적지로 나감",
      "signals": [
        "큰 자료가 처음 보는 목적지(주소)로 나감",
        "한 번에 많은 파일이나 자료실 전체·메모 묶음이 나감",
        "같은 자료가 처음 보는 목적지 두 곳으로 나감"
      ],
      "supporting": "짧은 시간 안에 나가거나 업무 시간 밖에 나갔다고 설명하면 근거를 더합니다.",
      "notMatch": [
        "수업 자료 주소·자료실 같은 평소 목적지로 가는 작은 동기화나 저장",
        "중간 크기 파일이 한 번 나갔지만 목적지가 평소와 같거나 크기가 작은 경우",
        "처음 보는 주소로 작은 파일이 한두 건 나간 경우",
        "전송이 실패해 나간 양이 0인 경우",
        "압축 파일을 만들기만 하고 외부 전송이 아직 없는 경우"
      ]
    },
    "evidence": "T1048(Exfiltration Over Alternative Protocol): ATT&CK 탐지 단서(AN0367)가 비정상 파일 반출의 징후로 평소보다 매우 큰 양(uncommonly high volume)을, AN0368이 평소 사용자 행동 밖의 반출을 들므로, 처음 보는 목적지로 나가는 큰 전송이 그 의심 단서입니다."
  },
  {
    "name": "off_hours_archive_exfiltration",
    "mitre": "T1048",
    "condition": {
      "where": [
        "경보 설명(rule.description)",
        "전송 크기(data.bytes)"
      ],
      "event": "수업·업무 시간 밖에 압축 파일이 바깥으로 나감",
      "signals": [
        "수업 시간 밖이나 업무 시간 밖에 압축 파일이 나갔다고 설명함",
        "나간 압축 파일의 크기가 큼",
        "압축 파일이 연속으로 여러 개 올라감"
      ],
      "supporting": "처음 보는 주소로 나갔다고 설명하면 근거를 더합니다.",
      "notMatch": [
        "수업 시간에 압축 파일을 만들기만 하고 외부 전송이 없는 경우",
        "압축 파일을 연 뒤 일부 자료만 평소 목적지가 아닌 곳으로 작게 나간 경우",
        "수업 끝 무렵 백업처럼 보이는 전송이 한 건이고 크기가 작은 경우",
        "시각 언급 없이 압축 파일 이름만 보인 경우"
      ]
    },
    "evidence": "T1048(Exfiltration Over Alternative Protocol): ATT&CK 탐지 단서(AN0367)가 비정상 파일 반출의 징후로 업무 시간 밖 활동(off-hour activity)과 평소보다 매우 큰 양을 들므로, 업무 시간 밖에 큰 압축 파일이 나가는 것이 그 의심 단서입니다(압축 자체는 탐지 단서가 아님)."
  },
  {
    "name": "repeated_large_transfer_same_destination",
    "mitre": "T1041",
    "condition": {
      "where": [
        "경보 설명(rule.description)",
        "전송 크기(data.bytes)",
        "반복 횟수(data.count)"
      ],
      "event": "같은 목적지로 대용량 전송이 반복됨",
      "signals": [
        "같은 목적지로 대용량 전송이 여러 번 반복됨",
        "명령 통로로 큰 파일이 처음 보는 목적지에 반복 전송됨",
        "업무 시간 밖에 같은 목적지로 전송이 이어짐"
      ],
      "supporting": "처음 보는 목적지라고 설명하면 근거를 더합니다.",
      "notMatch": [
        "평소 목적지로 짧은 자료 이름이 몇 번 보였지만 큰 파일이 아닌 경우",
        "전송량이 평소보다 한 번 높았지만 반복이 없고 목적지가 평소와 같은 경우",
        "파일 수만 한 번 늘었고 목적지가 평소와 같은 경우"
      ]
    },
    "evidence": "T1041(Exfiltration Over C2 Channel): 공격자는 이미 있는 명령 통로로 자료를 빼내고, ATT&CK 탐지 단서(AN0988)가 평소 통신이 적은 쪽에서 나가는 대량 전송과 드문 외부 목적지로의 연결(AN0990)을 보라고 하므로, 같은 목적지로 되풀이되는 큰 전송이 그 흔적일 수 있습니다."
  },
  {
    "name": "unusual_port_transfer",
    "mitre": "T1041",
    "condition": {
      "where": [
        "경보 설명(rule.description)",
        "전송 크기(data.bytes)"
      ],
      "event": "평소에 쓰지 않던 포트로 큰 자료가 나감",
      "signals": [
        "평소에 쓰지 않던 포트로 자료가 나감",
        "나간 자료의 크기가 큼",
        "자료 이름이 연속으로 전송됨"
      ],
      "supporting": "처음 보는 목적지로 나갔다고 설명하거나 업무 시간 밖에 나갔다고 설명하면 근거를 더합니다.",
      "notMatch": [
        "평소 쓰는 포트로 수업 자료 주소에 나간 평소 전송",
        "포트 이야기만 있고 나간 자료가 없는 경우",
        "평소와 다른 포트로 작은 자료가 한두 건 나간 경우",
        "전송이 실패해 나간 양이 0인 경우"
      ]
    },
    "evidence": "T1041(Exfiltration Over C2 Channel): ATT&CK 탐지 단서(AN0988)가 평소 통신이 거의 없는 쪽에서 나가는 비정상 대량 전송을 명령 통로의 프로토콜(암호화된 웹 통신, DNS, custom TCP/UDP ports)에서 보라고 하므로, 평소에 쓰지 않던 포트로 나가는 큰 전송이 그 의심 단서입니다(포트가 평소와 다르다는 것 자체가 탐지 기준은 아님)."
  }
];

const [NEW_DESTINATION, OFF_HOURS_ARCHIVE, REPEATED, UNUSUAL_PORT] = PATTERNS;

// 경보 한 건에서 읽은 사실입니다. 모든 판단은 아래 값만 씁니다.
// 읽는 칸은 patterns.json의 where에 적은 경보 설명(rule.description), 전송 크기(data.bytes), 반복 횟수(data.count)뿐입니다.
// 목적지(data.dstip)·출발 주소(data.srcip)·계정·시각·규칙 수준·경보의 mitre 칸·파일 수(data.files)는 읽지 않습니다.
// 목적지 이력이 계약에도 저장소에도 없어서 '처음 보는 목적지'는 경보 설명의 문구로만 읽고, 업무 시간 밖도 시각이 아니라 문구로만 읽습니다.
// 아래 숫자 세 개는 이 모듈이 정한 값입니다. ATT&CK도 patterns.json도 숫자를 정하지 않았고, 연습 경보의 크기 분포를 보고 잡았습니다.
//   LARGE_BYTES  50,000,000  큰 전송의 기준(연습 경보에서 공격은 7천만 바이트 이상, 애매한 것은 1500만 바이트 이하)
//   MANY_FILES   50          설명에 '자료 N건'으로 적힌 많은 파일의 기준
//   REPEAT_COUNT 5           반복 횟수(data.count)가 많다고 보는 기준
// 읽는 글자 수 한도 2000도 이 모듈이 정한 값입니다(privilege·persistence 모듈의 값을 따랐습니다).
const LARGE_BYTES = 50_000_000;
const MANY_FILES = 50;
const REPEAT_COUNT = 5;
const MAX_LENGTH = 2000;
const DIGITS = /^\d{1,15}$/u;
// "큰 파일은 아닙니다."처럼 낱말 세 개 이하의 짧은 부정문은 읽지 않습니다. 큰 파일이라는 낱말이 있어도 큰 파일이 아니라는 뜻이므로 일로 읽지 않습니다.
const NEGATED_SENTENCE = /^\S+(?: \S+){0,2}[은는] (?:없습니다|아닙니다)\.?$/u;
const NOT_SENT = /(?:전송|반출)[^.]{0,8}(?:없|않)/u;
const FAILED = /실패/u;

const text = value => (typeof value === 'string' ? value.slice(0, MAX_LENGTH) : '');
const amount = value => {
  const digits = typeof value === 'string' ? value.trim() : Number.isSafeInteger(value) ? String(value) : '';
  return DIGITS.test(digits) ? Number(digits) : null;
};

function facts(alert) {
  const sentences = text(alert?.rule?.description).split(/(?<=\.)\s+/u).map(s => s.trim()).filter(Boolean);
  const live = sentences.filter(s => !NEGATED_SENTENCE.test(s));
  const said = live.join(' ');
  // "전송은 아직 없습니다", "전송이 실패 1건으로 끝났습니다"처럼 실제로 나가지 않았다고 말하는 문장은 나간 일로 읽지 않습니다. 문장마다 따로 봅니다.
  const sentOut = re => live.some(s => !NOT_SENT.test(s) && !FAILED.test(s) && re.test(s));
  const bytes = amount(alert?.data?.bytes);
  const count = amount(alert?.data?.count);
  const filesInText = said.match(/자료 (\d{1,6})건/u);
  return {
    said,
    out: sentOut(/나갔|올라갔|복사됐|전송됐|보냈/u),
    transfer: sentOut(/전송|나갔|올라갔|복사|보냈/u),
    attempt: /전송|나갔|올라갔|복사|보냈/u.test(said),
    newDestination: /처음 보는 (?:목적지|주소|곳)|목적지는 처음 (?:보|봅)|다른 주소|외부 (?:주소|목적지)/u.test(said),
    sameDestination: /같은 목적지/u.test(said),
    twoPlaces: /두 곳/u.test(said),
    archive: /압축 파일/u.test(said),
    offHours: /수업 시간 밖|업무 시간 밖|업무처럼 보이지 않는/u.test(said),
    shortTime: /짧은 시간|\d{1,3}분 안에/u.test(said),
    repeated: /반복|(?:[2-9]|\d{2,})번/u.test(said),
    commandChannel: /명령 통로/u.test(said),
    unusualPort: /평소에 쓰지 않던 포트/u.test(said),
    consecutive: /연속/u.test(said),
    large: (bytes !== null && bytes >= LARGE_BYTES) || /대용량|큰 파일이/u.test(said),
    manyFiles: /자료실 전체|묶음/u.test(said) || (filesInText !== null && Number(filesInText[1]) >= MANY_FILES),
    manyRepeats: count !== null && count >= REPEAT_COUNT,
  };
}

// 패턴마다 일(strong)이 있는지, 뚜렷한 신호(clues)가 몇 개 맞는지 읽습니다. 신호의 이름은 patterns.json의 signals를 그대로 씁니다.
// weak는 일과 관련은 있으나 patterns.json의 notMatch에 가까운 애매한 경우로, 뚜렷한 신호를 읽지 않고 확인 필요(alert)로만 남깁니다.
// 한 건씩 판단하므로 "같은 목적지로 나간 이전 경보"는 읽을 수 없고, 같은 경보 설명 안의 말만 읽습니다.
// 주의: new_destination 패턴의 event 문장은 '큰 자료가 처음 보는 목적지로 나감'이지만, 이 파일은 '나감 + 처음 보는 목적지'를 일로 읽고
//   '큰 자료'(크기가 LARGE_BYTES 이상)는 뚜렷한 신호 하나로 셉니다. 큰 크기가 있어야 block(0.85)에 닿고, 크기 없이 처음 보는 목적지로만 나간 것은 alert(0.5)입니다.
const MATCHERS = {
  [NEW_DESTINATION.name]: {
    strong: f => f.out && f.newDestination,
    weak: f => (f.newDestination && f.attempt)
      || /파일 수가[^.]{0,8}늘/u.test(f.said)
      || /한 번에 읽힌[^.]{0,12}전송/u.test(f.said),
    clues: [
      [NEW_DESTINATION.condition.signals[0], f => f.large],
      [NEW_DESTINATION.condition.signals[1], f => f.manyFiles],
      [NEW_DESTINATION.condition.signals[2], f => f.twoPlaces],
      ['짧은 시간 또는 업무 시간 밖에 나감', f => f.shortTime || f.offHours],
    ],
  },
  // 업무 시간 밖이라는 말이 있고 압축 파일이 나갔을 때만 일이 됩니다.
  [OFF_HOURS_ARCHIVE.name]: {
    strong: f => f.offHours && f.archive && f.out,
    weak: f => f.archive || /백업처럼 보이는 전송/u.test(f.said),
    clues: [
      [OFF_HOURS_ARCHIVE.condition.signals[1], f => f.large],
      [OFF_HOURS_ARCHIVE.condition.signals[2], f => /연속으로|압축 파일 (?:[2-9]|\d{2,})개/u.test(f.said)],
      ['처음 보는 주소로 나감', f => f.newDestination],
    ],
  },
  [REPEATED.name]: {
    strong: f => f.repeated && (f.sameDestination || f.newDestination) && f.transfer,
    weak: f => (f.commandChannel && f.repeated) || /전송량이[^.]{0,12}평소보다/u.test(f.said),
    clues: [
      [REPEATED.condition.signals[0], f => f.large],
      ['반복 횟수가 많음', f => f.manyRepeats],
      [REPEATED.condition.signals[1], f => f.commandChannel],
      [REPEATED.condition.signals[2], f => f.offHours],
      ['처음 보는 목적지라고 설명함', f => f.newDestination],
    ],
  },
  // 평소에 쓰지 않던 포트라는 말이 있고 자료가 나갔을 때만 일이 됩니다. 포트 이름·번호는 읽지 않고 그 문구만 읽습니다.
  [UNUSUAL_PORT.name]: {
    strong: f => f.unusualPort && f.out,
    weak: f => f.unusualPort && f.attempt,
    clues: [
      [UNUSUAL_PORT.condition.signals[1], f => f.large],
      [UNUSUAL_PORT.condition.signals[2], f => f.consecutive],
      ['처음 보는 목적지이거나 업무 시간 밖이라고 설명함', f => f.newDestination || f.offHours],
    ],
  },
};

// 확신도(백분율 정수로 계산한 뒤 100으로 나눕니다). 숫자는 이 모듈이 정한 값이며 ATT&CK도 patterns.json도 정하지 않았습니다.
// 패턴의 일만 있으면 50(alert). 뚜렷한 신호가 하나면 +35로 85(block), 신호가 하나 늘 때마다 +5, 뚜렷한 신호가 있는 패턴이 둘 이상이면 +5, 상한 99.
// 패턴의 일이 없으면 0(record).
const BLOCK_AT = 0.85;
const ALERT_AT = 0.5;
const POINTS = { base: 50, firstSignal: 35, moreSignal: 5, together: 5, cap: 99 };

const verdict = (points, reason) => {
  const confidence = Math.round(points) / 100;
  return { action: confidence >= BLOCK_AT ? 'block' : confidence >= ALERT_AT ? 'alert' : 'record', confidence, reason };
};

export function decide(alert) {
  const f = facts(alert);

  const hits = [];
  for (const pattern of PATTERNS) {
    const matcher = MATCHERS[pattern.name];
    const strong = matcher.strong(f);
    if (!strong && !matcher.weak(f)) continue;
    const labels = strong ? matcher.clues.flatMap(([label, test]) => (test(f) ? [label] : [])) : [];
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

  return verdict(0, `${PATTERNS.map(p => p.name).join(', ')}에 맞는 신호가 없는 정상 이벤트`);
}
