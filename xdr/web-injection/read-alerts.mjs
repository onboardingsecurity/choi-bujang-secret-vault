import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const REDACTED = '[가림]';

// 비밀값처럼 보이는 모양만 가립니다. 설명 속 "비밀번호" 같은 낱말 자체는 그대로 둡니다.
const SECRET_PATTERNS = [
  /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?(-----END [A-Z ]*PRIVATE KEY-----|$)/g,
  /\b(password|passwd|pwd|token|secret|api[_-]?key|비밀번호|토큰|비밀키)\s*[:=]\s*\S+/gi,
  /\bBearer\s+[A-Za-z0-9._~+/=-]{8,}/gi,
  /\beyJ[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]*/g,
  /\bsb_(secret|publishable)_[A-Za-z0-9_-]+/g,
  /\b[A-Za-z0-9_-]{32,}\b/g,
];

export function redact(value) {
  if (typeof value !== 'string') return null;
  return SECRET_PATTERNS.reduce((text, pattern) => text.replace(pattern, REDACTED), value);
}

// 경보 한 건에서 시각·출발 주소·계정·규칙 수준·설명만 뽑습니다. 값이 없으면 null로 남겨 줄 수를 맞춥니다.
// 요청 주소(url)와 반복 횟수(count)는 뽑지 않습니다. 확인용이라 다섯 값만 봅니다.
export function pickAlert(alert) {
  return {
    at: redact(alert?.timestamp),
    srcip: redact(alert?.data?.srcip),
    user: redact(alert?.data?.srcuser),
    level: Number.isFinite(alert?.rule?.level) ? alert.rule.level : null,
    description: redact(alert?.rule?.description),
  };
}

export async function readAlerts({ root = ROOT } = {}) {
  const fixture = JSON.parse(await readFile(join(root, 'xdr', 'fixtures', 'web-injection.json'), 'utf8'));
  if (fixture?.schema !== 'aleph.xdr.fixture.v1' || fixture.moduleKey !== 'web-injection' || !Array.isArray(fixture.alerts)) {
    throw new Error('web-injection 경보 묶음 형식이 아닙니다.');
  }
  const rows = fixture.alerts.map(pickAlert);
  if (rows.length !== fixture.alerts.length) throw new Error('경보 건수와 뽑은 줄 수가 다릅니다.');
  return { alertCount: fixture.alerts.length, rows };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const { alertCount, rows } = await readAlerts();
    for (const row of rows) process.stdout.write(`${JSON.stringify(row)}\n`);
    process.stdout.write(`경보 ${alertCount}건 / 뽑은 줄 ${rows.length}줄 ${alertCount === rows.length ? '(일치)' : '(불일치)'}\n`);
    if (alertCount !== rows.length) process.exitCode = 1;
  } catch (error) {
    process.stderr.write(`경보 읽기 첫 오류: ${error.message}\n`);
    process.exitCode = 1;
  }
}
