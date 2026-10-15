// 근거: CVE-2021-44228(Apache Log4j, NIST NVD) 형태 요청, MITRE ATT&CK T1190(Exploit Public-Facing Application). 값은 patterns.json과 같습니다.
// 이 파일은 다른 파일·패키지를 불러오지 않고, 파일을 읽거나 쓰지 않고, 바깥에 묻지 않고 혼자 계산해서 답합니다.
// ATT&CK와 NVD는 건수·시간 기준을 정하지 않습니다. 완전한 원격 조회 구문은 한 번만 있어도 뚜렷한 형태로 봅니다.
const PATTERNS = [
  {
    name: 'jndi_lookup_in_request',
    mitre: 'T1190',
    condition: {
      where: ['요청 머리글(useragent)', '요청 인자(url)'],
      match: '${jndi:<프로토콜>://… 형태가 끝까지 이어진 완전한 구문',
      regex: '\\$\\{jndi:[a-z]+://',
      regexFlags: 'i',
      notMatch: ['jndi 라는 낱말만 있는 경우', 'CVE-2021-44228 이라는 글자만 있는 경우', '중괄호나 조회 구문 조각만 잘려 있는 경우'],
    },
    evidence: 'CVE-2021-44228: 기록되는 문자열에 ${jndi:ldap://…} 같은 조회 구문을 넣으면 Log4j가 공격자가 정한 원격 주소로 조회를 보내 외부 코드를 받아 실행할 수 있고, 공개 웹 앱을 노린 이 요청은 T1190에 해당합니다.',
  },
  {
    name: 'known_scanner_trace',
    mitre: 'T1190',
    condition: {
      where: ['경보 설명(rule.description)'],
      signals: ['점검 흔적'],
      notMatch: ['점검 도구와 비슷한 수업용 프로그램 이름만 있는 경우'],
      withJndiLookup: 'jndi_lookup_in_request와 함께 있으면 뚜렷한 공격 쪽 근거를 더하고, 점검 흔적만 있으면 확인용으로만 봅니다.',
    },
    evidence: 'T1190(Exploit Public-Facing Application): 공개 취약점이 있는 서버를 찾으려고 점검 도구가 먼저 훑은 흔적은 CVE-2021-44228 형태 요청 앞뒤에 함께 나타나는 신호입니다.',
  },
];

const [JNDI, SCANNER] = PATTERNS;
const JNDI_RE = new RegExp(JNDI.condition.regex, JNDI.condition.regexFlags);

// 애매한 단서: 완전한 구문은 아니지만 같은 계열의 낱말·조각이 있는 경우입니다. 공격이 아닐 수 있어 alert까지만 올립니다.
// 종류가 하나면 0.5, 하나 늘 때마다 0.1씩 더해 0.8을 넘기지 않습니다. 이 목록은 patterns.json에는 없고 이 파일에만 있습니다.
const AMBIGUOUS_HINTS = [
  { pattern: JNDI.name, label: 'jndi 낱말', re: /jndi/i },
  { pattern: JNDI.name, label: '조회 구문 조각', re: /\$\{|lookup|중괄호|조회 형태|잘린/i },
  { pattern: JNDI.name, label: 'CVE 번호', re: /cve-\d{4}-\d{4,7}/i },
  { pattern: JNDI.name, label: '취약점·라이브러리 언급', re: /취약점|라이브러리|log4j|log-library|cve-list/i },
  { pattern: SCANNER.name, label: '점검 도구·흔적', re: /점검 흔적|점검 도구/ },
];

const BLOCK_AT = 0.85;
const ALERT_AT = 0.5;
const AMBIGUOUS_MAX = 0.8;

const round2 = n => Math.round(n * 100) / 100;
const text = value => (typeof value === 'string' ? value : '');

// %24%7B 처럼 숨긴 글자를 최대 두 번 풀어 봅니다. 풀 수 없으면 있는 그대로 둡니다.
function unescaped(value) {
  let out = text(value);
  for (let i = 0; i < 2; i += 1) {
    try {
      const next = decodeURIComponent(out);
      if (next === out) break;
      out = next;
    } catch { break; }
  }
  return out;
}

// 확신도: 경보가 패턴에 얼마나 뚜렷하게 맞는지를 0~1로 매깁니다.
// 완전한 조회 구문이 한 곳이면 0.9, 머리글과 주소 두 곳이면 0.95이고 점검 흔적이 함께 있으면 0.03을 더합니다(block).
// 낱말·조각만 있으면 0.5~0.8(alert)이고, 아무 단서도 없으면 0(record)입니다.
// 요청 내용은 문자열 모양으로만 보며, 조회 구문 자체는 reason에 옮겨 적지 않습니다.
export function decide(alert) {
  const header = unescaped(alert?.data?.useragent);
  const url = unescaped(alert?.data?.url);
  const description = text(alert?.rule?.description);

  const found = [];
  if (JNDI_RE.test(header)) found.push('머리글');
  if (JNDI_RE.test(url)) found.push('주소 인자');
  if (found.length > 0) {
    const scanner = SCANNER.condition.signals.some(s => description.includes(s));
    const base = found.length >= 2 ? 0.95 : 0.9;
    const confidence = round2(Math.min(1, scanner ? base + 0.03 : base));
    const names = scanner ? `${JNDI.name}, ${SCANNER.name}` : JNDI.name;
    return {
      action: confidence >= BLOCK_AT ? 'block' : 'alert',
      confidence,
      reason: `${names}: ${found.join('·')}에 완전한 원격 조회 구문${scanner ? ', 점검 흔적 함께' : ''}`,
    };
  }

  const haystack = `${header} ${url} ${description}`;
  const hits = AMBIGUOUS_HINTS.filter(h => h.re.test(haystack));
  if (hits.length > 0) {
    const confidence = round2(Math.min(AMBIGUOUS_MAX, ALERT_AT + 0.1 * (hits.length - 1)));
    const names = [...new Set(hits.map(h => h.pattern))].join(', ');
    return {
      action: confidence >= ALERT_AT ? 'alert' : 'record',
      confidence,
      reason: `${names}: 완전한 구문은 없고 ${hits.map(h => h.label).join('·')}만 있어 확인이 필요합니다`,
    };
  }
  return { action: 'record', confidence: 0, reason: `${JNDI.name}, ${SCANNER.name}에 맞는 신호가 없는 정상 이벤트` };
}
