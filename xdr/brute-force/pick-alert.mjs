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
export function pickAlert(alert) {
  return {
    at: redact(alert?.timestamp),
    srcip: redact(alert?.data?.srcip),
    user: redact(alert?.data?.srcuser),
    level: Number.isFinite(alert?.rule?.level) ? alert.rule.level : null,
    description: redact(alert?.rule?.description),
  };
}

