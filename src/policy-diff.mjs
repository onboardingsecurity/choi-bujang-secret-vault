// 10단계: 검증한 안전 정책 사본과 현재 시험 정책의 차이만 보여 줍니다. 읽기 전용입니다.
// 시험 정책은 판정기 규칙 이름(RULE_IDS)과 허용 경로(aleph.config.json의 allowedRoutes) 두 가지입니다.
// 사본이 없거나 모양·해시 검증에 실패하면 차이를 계산하지 않고 중단합니다. 운영 설정(Vercel·Supabase)은 읽지도 쓰지도 않습니다.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { RULE_IDS } from './decider.mjs';

const SNAPSHOT_SCHEMA = 'aleph.policy.snapshot.v1';
const SNAPSHOT_URL = new URL('../backup/policy.v1.json', import.meta.url);
const CONFIG_URL = new URL('../aleph.config.json', import.meta.url);

export class PolicyCopyError extends Error {}

const isStringList = (value) => Array.isArray(value) && value.every((item) => typeof item === 'string' && item.length > 0);

// 해시 대상은 정책 내용 하나뿐이라 키 순서를 고정해 직렬화합니다.
const canonical = (policy) => JSON.stringify({ rules: policy.rules, allowedRoutes: policy.allowedRoutes });
export const hashPolicy = (policy) => createHash('sha256').update(canonical(policy)).digest('hex');

export const currentPolicy = (config) => ({ rules: [...RULE_IDS], allowedRoutes: [...(config?.allowedRoutes ?? [])] });

export const buildSnapshot = (version, policy) => ({
  schema: SNAPSHOT_SCHEMA, version, policy, sha256: hashPolicy(policy),
});

// 사본을 검증합니다. 어느 하나라도 틀리면 PolicyCopyError로 중단합니다.
export const verifySnapshot = (snapshot) => {
  if (snapshot === null || typeof snapshot !== 'object' || Array.isArray(snapshot)) throw new PolicyCopyError('사본 모양이 틀립니다');
  if (snapshot.schema !== SNAPSHOT_SCHEMA) throw new PolicyCopyError('사본 형식(schema)이 다릅니다');
  if (typeof snapshot.version !== 'string' || !snapshot.version) throw new PolicyCopyError('사본 버전이 없습니다');
  const policy = snapshot.policy;
  if (!policy || !isStringList(policy.rules) || !isStringList(policy.allowedRoutes)) throw new PolicyCopyError('사본 정책 항목이 틀립니다');
  if (typeof snapshot.sha256 !== 'string' || snapshot.sha256 !== hashPolicy(policy)) throw new PolicyCopyError('사본 해시가 내용과 다릅니다(변조 또는 손상)');
  return snapshot;
};

export const loadSnapshot = (url = SNAPSHOT_URL) => {
  let text;
  try { text = readFileSync(url, 'utf8'); } catch { throw new PolicyCopyError('정책 사본이 없습니다'); }
  let parsed;
  try { parsed = JSON.parse(text); } catch { throw new PolicyCopyError('사본을 읽을 수 없습니다(JSON 오류)'); }
  return verifySnapshot(parsed);
};

const delta = (saved, now) => ({
  removedNow: saved.filter((item) => !now.includes(item)), // 사본에는 있고 지금은 없음(복원하면 되돌아옴)
  addedNow: now.filter((item) => !saved.includes(item)), // 지금만 있음(복원하면 사라짐)
});

// 검증된 사본과 현재 정책의 차이만 돌려줍니다. 같은 항목은 담지 않습니다.
export const diffPolicy = (snapshot, current) => {
  verifySnapshot(snapshot);
  const rules = delta(snapshot.policy.rules, current.rules);
  const routes = delta(snapshot.policy.allowedRoutes, current.allowedRoutes);
  return {
    restoreVersion: snapshot.version,
    sha256: snapshot.sha256,
    rules, routes,
    changed: rules.removedNow.length + rules.addedNow.length + routes.removedNow.length + routes.addedNow.length,
  };
};

export const formatDiff = (diff) => {
  const lines = [`복원할 버전: ${diff.restoreVersion} (해시 ${diff.sha256.slice(0, 12)}…, 검증 통과)`, `변경 범위: 규칙 이름·허용 경로 두 항목만 비교합니다. 다른 서비스 규칙, 메모, 감사 기록은 비교하지 않습니다.`];
  if (diff.changed === 0) return [...lines, '차이 없음: 현재 시험 정책이 사본과 같습니다.'].join('\n');
  const show = (label, { removedNow, addedNow }) => [
    ...removedNow.map((item) => `  - ${label} 사본에만 있음(되돌리면 생김): ${item}`),
    ...addedNow.map((item) => `  + ${label} 지금만 있음(되돌리면 사라짐): ${item}`),
  ];
  return [...lines, `차이 ${diff.changed}건:`, ...show('규칙', diff.rules), ...show('경로', diff.routes)].join('\n');
};

// 실행: node src/policy-diff.mjs — 사본이 없거나 검증에 실패하면 종료 코드 1로 중단합니다. 아무것도 쓰지 않습니다.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const snapshot = loadSnapshot();
    const config = JSON.parse(readFileSync(CONFIG_URL, 'utf8'));
    console.log(formatDiff(diffPolicy(snapshot, currentPolicy(config))));
  } catch (error) {
    console.error(`중단: ${error instanceof PolicyCopyError ? error.message : '현재 정책을 읽을 수 없습니다'}`);
    process.exitCode = 1;
  }
}
