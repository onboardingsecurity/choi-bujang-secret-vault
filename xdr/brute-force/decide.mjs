import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pickAlert } from './read-alerts.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const { patterns } = JSON.parse(await readFile(join(HERE, 'patterns.json'), 'utf8'));
const PATTERN_NAMES = new Set(patterns.map(pattern => pattern.name));
const STREAK = 'same_source_failure_streak';
const SPRAY = 'same_password_many_accounts';
for (const name of [STREAK, SPRAY]) {
  if (!PATTERN_NAMES.has(name)) throw new Error(`patterns.json에 ${name} 패턴이 없습니다.`);
}

// 확신도 기준은 요청대로 0.85 / 0.5. 건수 기준은 연습 경보에 맞춘 이 모듈의 값이며 ATT&CK가 정한 값이 아닙니다.
export const BLOCK_AT = 0.85;
export const ALERT_AT = 0.5;
const CLEAR_FAILURES = 15;
const CLEAR_ACCOUNTS = 5;
const AMBIGUOUS_FAILURES = 3;
const JEV_TIMEOUT_MS = 5000;

function classify(alert) {
  const row = pickAlert(alert);
  const description = row.description ?? '';
  const isFailure = description.includes('실패');
  const succeeded = /성공(했|하였)/.test(description);
  const accountList = typeof alert?.data?.accounts === 'string'
    ? alert.data.accounts.split(',').filter(Boolean).length : 0;
  const count = Number(alert?.data?.count);
  const failures = Number.isFinite(count) ? count : 0;
  const spraying = accountList >= CLEAR_ACCOUNTS || /계정\s*\d+개|여러 계정|서로 다른 계정/.test(description);
  const pattern = spraying ? SPRAY : STREAK;
  if (!isFailure && accountList < CLEAR_ACCOUNTS) return { row, kind: 'normal', pattern };
  if (!succeeded && (failures >= CLEAR_FAILURES || accountList >= CLEAR_ACCOUNTS)) return { row, kind: 'clear', pattern };
  if (Math.max(failures, accountList) >= AMBIGUOUS_FAILURES) return { row, kind: 'ambiguous', pattern };
  return { row, kind: 'normal', pattern };
}

function byConfidence(confidence) {
  if (confidence >= BLOCK_AT) return 'block';
  if (confidence >= ALERT_AT) return 'alert';
  return 'record';
}

async function ask(askJev, payload) {
  if (typeof askJev !== 'function') return null;
  let timer;
  try {
    const answer = await Promise.race([
      Promise.resolve(askJev(payload)),
      new Promise(resolve => { timer = setTimeout(() => resolve(null), JEV_TIMEOUT_MS); }),
    ]);
    return typeof answer === 'number' && Number.isFinite(answer) && answer >= 0 && answer <= 1 ? answer : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// 기본 호출 decide(alert)에는 Jev 연결이 없어 애매한 경보는 alert로 남습니다.
// 두 번째 인자 { askJev }는 시험용 연결 자리이며, Jev에게는 비밀값을 가린 다섯 값과 패턴 이름만 넘깁니다.
export async function decide(alert, { askJev } = {}) {
  const { row, kind, pattern } = classify(alert);
  if (kind === 'clear') return { action: 'block', confidence: 0.95, reason: `${pattern}: 명확한 무차별 대입` };
  if (kind === 'normal') return { action: 'record', confidence: 0, reason: `${pattern}에 해당하지 않는 정상 이벤트` };
  const confidence = await ask(askJev, { ...row, pattern });
  if (confidence === null) return { action: 'alert', confidence: ALERT_AT, reason: `${pattern}: 애매함, Jev 응답 없음` };
  return { action: byConfidence(confidence), confidence, reason: `${pattern}: 애매함, Jev 확신도 ${confidence}` };
}
