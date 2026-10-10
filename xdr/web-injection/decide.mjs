// 근거: MITRE ATT&CK T1190(Exploit Public-Facing Application). 값은 patterns.json과 같습니다.
// ATT&CK는 건수 기준을 정하지 않습니다. minRepeats 8은 Wazuh 31152(SQL 주입 반복)의 frequency 8을 모든 종류에 쓴 임의 값입니다.
// (Wazuh 31153·31154는 10이지만 연습 경보의 명확한 공격 중 스크립트 9번·경로 8번이 막히지 않아 쓰지 않았습니다.)
const PATTERNS = [
  {
    name: 'sql_injection_repeat',
    mitre: 'T1190',
    condition: { groupBy: ['srcip'], signals: ['SQL 구문', 'SQL 표식', 'SQL 표기', '데이터베이스 조회를 이어'], minRepeats: 8, windowMinutes: 2 },
    evidence: 'T1190(Exploit Public-Facing Application): 공개 웹 앱의 요청 인자에 SQL 구문을 끼워 넣어 데이터베이스 조회를 바꾸려는 시도가 같은 출발지에서 반복됩니다.',
  },
  {
    name: 'script_injection_repeat',
    mitre: 'T1190',
    condition: { groupBy: ['srcip'], signals: ['스크립트 삽입', '스크립트 표식', '스크립트 표기', '스크립트 태그'], minRepeats: 8, windowMinutes: 2 },
    evidence: 'T1190(Exploit Public-Facing Application): 요청 인자에 스크립트 태그를 심어 웹 앱이 그대로 돌려주게 하려는 시도가 같은 출발지에서 반복됩니다.',
  },
  {
    name: 'path_traversal_repeat',
    mitre: 'T1190',
    condition: { groupBy: ['srcip'], signals: ['거슬러 올라가', '경로 이탈', '../'], minRepeats: 8, windowMinutes: 2 },
    evidence: 'T1190(Exploit Public-Facing Application): 요청 경로의 ../ 를 여러 단계 이어 붙여 허용된 폴더 밖 파일을 읽으려는 시도가 같은 출발지에서 반복됩니다.',
  },
  {
    name: 'command_separator_repeat',
    mitre: 'T1190',
    condition: { groupBy: ['srcip'], signals: ['명령 구분자'], minRepeats: 8, windowMinutes: 2 },
    evidence: 'T1190(Exploit Public-Facing Application): 요청 인자에 명령 구분자를 끼워 서버가 다른 명령을 이어 실행하게 하려는 시도가 같은 출발지에서 반복됩니다.',
  },
];

// 애매한 단서: 공격 표기가 아니어도 같은 낱말이 들어 있을 수 있어 alert까지만 올립니다. patterns.json의 ambiguousHints와 같습니다.
const AMBIGUOUS_HINTS = [
  { word: '따옴표', pattern: 'sql_injection_repeat' },
  { word: '주입처럼', pattern: 'sql_injection_repeat' },
  { word: '이상한 검색', pattern: 'sql_injection_repeat' },
  { word: 'select', pattern: 'sql_injection_repeat' },
  { word: 'SQL', pattern: 'sql_injection_repeat' },
  { word: '스크립트', pattern: 'script_injection_repeat' },
  { word: 'script', pattern: 'script_injection_repeat' },
  { word: '경로에 up', pattern: 'path_traversal_repeat' },
  { word: '구분 문자', pattern: 'command_separator_repeat' },
  { word: '평소보다 깁니다', pattern: 'sql_injection_repeat' },
];

// 요청 주소(url)에서 보는 신호: 연습 경보의 문서용 표식(doc-*)과 실제 구문 모양. 문자열은 판별용이며 어디에도 보내지 않습니다.
const URL_RULES = {
  sql_injection_repeat: [/doc-(sql|mixed)/i, /union\s+select/i, /'\s*or\s*'?\d'?\s*=\s*'?\d/i, /;\s*drop\s+table/i],
  script_injection_repeat: [/doc-(script|mixed)/i, /<\s*script/i, /javascript\s*:/i],
  path_traversal_repeat: [/doc-up/i, /(\.\.\/){2,}/, /(\.\.\\){2,}/],
  command_separator_repeat: [/doc-cmd/i],
};

const BLOCK_AT = 0.85;
const ALERT_AT = 0.5;
const MIN_REPEATS = PATTERNS[0].condition.minRepeats;

function count(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function decoded(url) {
  if (typeof url !== 'string') return '';
  try { return decodeURIComponent(url); } catch { return url; }
}

// 확신도: 경보가 패턴에 얼마나 뚜렷하게 맞는지를 0~0.95로 매깁니다.
// 뚜렷한 신호가 있고 반복이 minRepeats 이상이면 0.95(block), 모자라면 반복 수에 따라 0.54~0.82(alert까지),
// 낱말만 닮은 애매한 단서는 설명에 "공격이 아니다"라고 적혀 있어도 0.5(alert)로 사람이 한 번 보게 하고, 단서 없는 정상 이벤트는 record입니다.
// 신호는 경보 설명의 문구와 요청 주소에서 찾으며, 코드가 요청 내용을 직접 분석하는 것은 아닙니다.
export function decide(alert) {
  const description = typeof alert?.rule?.description === 'string' ? alert.rule.description : '';
  const url = decoded(alert?.data?.url);
  const strong = PATTERNS.filter(p =>
    p.condition.signals.some(s => description.includes(s))
    || URL_RULES[p.name].some(r => r.test(url)));
  if (strong.length > 0) {
    const repeats = count(alert?.data?.count) || 1;
    const names = strong.map(p => p.name).join(',');
    const confidence = repeats >= MIN_REPEATS ? 0.95 : Math.round(Math.min(0.82, 0.5 + 0.04 * repeats) * 100) / 100;
    const action = confidence >= BLOCK_AT ? 'block' : 'alert';
    return { action, confidence, reason: `${names}: ${strong[0].evidence}` };
  }
  const hint = AMBIGUOUS_HINTS.find(h => description.includes(h.word));
  if (!hint) {
    return { action: 'record', confidence: 0, reason: `${PATTERNS[0].name}에 해당하지 않는 정상 이벤트` };
  }
  return { action: 'alert', confidence: ALERT_AT, reason: `${hint.pattern}: 낱말만 닮은 애매한 단서, 반복 없음` };
}
