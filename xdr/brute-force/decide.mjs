// 근거: MITRE ATT&CK T1110(Brute Force). 값은 patterns.json과 같습니다.
// ATT&CK는 건수 기준을 정하지 않습니다. minFailures 15와 minAccounts 5는 연습 경보에 맞춘 이 모듈의 값입니다(명확한 공격만 block).
// Wazuh 기본 sshd 규칙(5712 등)의 8회는 경보를 올리는 기준이라 block 기준으로 쓰지 않았습니다.
const PATTERNS = [
  {
    name: 'same_source_failure_streak',
    mitre: 'T1110.001',
    condition: { groupBy: ['srcip'], event: '로그인 실패', minFailures: 15 },
    evidence: 'T1110.001(Password Guessing): 같은 출발지에서 짧은 시간에 로그인 실패가 연속으로 쌓입니다.',
  },
  {
    name: 'same_password_many_accounts',
    mitre: 'T1110.003',
    condition: { groupBy: ['srcip'], event: '로그인 실패', distinct: 'user', minAccounts: 5 },
    evidence: 'T1110.003(Password Spraying): 같은 비밀번호를 여러 계정에 차례로 대입해 계정 수가 많습니다.',
  },
];

const BLOCK_AT = 0.85;
const ALERT_AT = 0.5;

const STREAK = PATTERNS[0];
const SPRAY = PATTERNS[1];
const MIN_FAILURES = STREAK.condition.minFailures;
const MIN_ACCOUNTS = SPRAY.condition.minAccounts;
const SPRAY_WORDS = /계정\s*\d+개|여러 계정|서로 다른 계정/;

function count(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

// 계정 수: 경보의 accounts 목록 길이, 없으면 설명 속 "계정 N개".
function accountsOf(alert, description) {
  const list = typeof alert?.data?.accounts === 'string'
    ? alert.data.accounts.split(',').filter(Boolean).length : 0;
  const named = /계정\s*(\d+)개/.exec(description);
  return Math.max(list, named ? count(named[1]) : 0);
}

// 확신도: 경보가 패턴 기준(MIN_FAILURES)에 얼마나 뚜렷하게 닿는지를 0~0.95로 매깁니다.
// 기준에 닿으면 0.95(block), 모자라면 건수에 따라 0.45~0.84(alert까지, block은 안 됨)입니다.
// 로그인 실패가 아닌 이벤트는 0, 성공으로 끝난 시도는 block 아래(0.84)로 눌러 둡니다.
// 계정이 여러 개여도 "같은 비밀번호"라는 근거가 경보 설명에 없으면 계정 수는 건수로 셈하지 않고 1계정=1건으로만 봅니다.
// 이 코드는 비밀번호가 같은지 직접 알 수 없고, 경보 설명의 문구로 추정할 뿐입니다.
export function decide(alert) {
  const description = typeof alert?.rule?.description === 'string' ? alert.rule.description : '';
  const accounts = accountsOf(alert, description);
  const failures = count(alert?.data?.count);
  const spraying = accounts > 0 || SPRAY_WORDS.test(description);
  const pattern = spraying ? SPRAY : STREAK;
  const isFailure = description.includes('실패') || accounts >= MIN_ACCOUNTS;
  if (!isFailure) {
    return { action: 'record', confidence: 0, reason: `${pattern.name}에 해당하지 않는 정상 이벤트` };
  }
  const sameSecret = /같은 비밀번호/.test(description);
  const volume = spraying
    ? Math.max(failures, accounts * (sameSecret ? MIN_FAILURES / MIN_ACCOUNTS : 1))
    : failures;
  let confidence = volume >= MIN_FAILURES ? 0.95 : Math.min(0.84, 0.42 + 0.03 * volume);
  if (/성공(했|하였)/.test(description)) confidence = Math.min(confidence, 0.84);
  confidence = Math.round(confidence * 100) / 100;
  const action = confidence >= BLOCK_AT ? 'block' : confidence >= ALERT_AT ? 'alert' : 'record';
  return { action, confidence, reason: `${pattern.name}: ${pattern.evidence}` };
}
