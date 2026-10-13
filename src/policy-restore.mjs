// 10단계: 검증한 정책 사본으로 시험 정책을 되돌리는 절차입니다.
// 되돌리는 것은 aleph.config.json의 allowedRoutes 한 항목뿐입니다. 다른 키(발급자·원본 API 주소·단계 등)와 감사 기록은 읽지도 쓰지도 않습니다.
// 판정기 규칙(RULE_IDS)은 코드라서 이름 목록으로 되돌릴 수 없습니다. 차이만 알려 주고 고치지 않습니다.
// 기본 실행은 미리보기입니다. 실제 변경은 --apply 와 --confirm=<사본 해시 앞 12자리> 를 함께 줘야 합니다.
import { readFileSync, renameSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { PolicyCopyError, currentPolicy, diffPolicy, formatDiff, loadSnapshot, verifySnapshot } from './policy-diff.mjs';

const CONFIG_URL = new URL('../aleph.config.json', import.meta.url);

// 사본 검증 → 차이 계산 → 바뀔 항목 목록과 새 설정을 만듭니다. 파일은 쓰지 않습니다.
export const planRestore = (snapshot, config) => {
  const diff = diffPolicy(snapshot, currentPolicy(config));
  const routesChange = diff.routes.removedNow.length + diff.routes.addedNow.length > 0
    || JSON.stringify(config.allowedRoutes) !== JSON.stringify(snapshot.policy.allowedRoutes);
  const nextConfig = routesChange ? { ...config, allowedRoutes: [...snapshot.policy.allowedRoutes] } : config;
  const changes = [
    ...diff.routes.addedNow.map((item) => `삭제: allowedRoutes에서 ${item}`),
    ...diff.routes.removedNow.map((item) => `추가: allowedRoutes에 ${item}`),
    ...(routesChange && diff.routes.addedNow.length + diff.routes.removedNow.length === 0 ? ['순서: allowedRoutes를 사본 순서로 되돌림'] : []),
  ];
  return { diff, nextConfig, changes, rulesNeedManualFix: diff.rules.removedNow.length + diff.rules.addedNow.length > 0 };
};

export const formatPlan = (plan) => [
  formatDiff(plan.diff),
  '--- 실행하면 바뀌는 항목 ---',
  ...(plan.changes.length ? plan.changes.map((line) => `  ${line}`) : ['  없음(되돌릴 경로 변경이 없습니다)']),
  '--- 바뀌지 않는 항목 ---',
  '  aleph.config.json의 allowedRoutes 외 모든 키, 판정기 코드, 메모 자료, 감사·서버 로그, 다른 서비스 규칙',
  ...(plan.rulesNeedManualFix ? ['  ! 판정기 규칙 이름이 사본과 다릅니다. 이 절차는 코드를 고치지 않습니다. git 이력으로 src/decider.mjs를 직접 확인하세요.'] : []),
].join('\n');

// 쓰기 직전에 사본을 다시 읽어(reloadSnapshot) 검증하고, 미리보기에서 보여 준 사본과 같은 버전·해시일 때만 씁니다.
// 사본이 없어졌거나 검증에 실패했거나 그 사이에 바뀌었으면 아무것도 쓰지 않고 중단합니다.
// 새 설정을 임시 파일에 쓴 뒤 바꿔 끼우고, 다시 읽어 allowedRoutes만 사본과 같고 나머지는 그대로인지 확인합니다.
export const applyRestore = (plan, snapshot, configPath, reloadSnapshot = () => snapshot) => {
  const fresh = verifySnapshot(reloadSnapshot());
  if (fresh.sha256 !== snapshot.sha256 || fresh.version !== snapshot.version) throw new PolicyCopyError('미리보기 뒤 사본이 바뀌었습니다. 처음부터 다시 실행하세요');
  const before = JSON.parse(readFileSync(configPath, 'utf8'));
  const temp = `${fileURLToPath(configPath)}.restore.tmp`;
  writeFileSync(temp, `${JSON.stringify(plan.nextConfig, null, 2)}\n`);
  renameSync(temp, configPath);
  const after = JSON.parse(readFileSync(configPath, 'utf8'));
  const { allowedRoutes: afterRoutes, ...afterRest } = after;
  const { allowedRoutes: _beforeRoutes, ...beforeRest } = before;
  const ok = JSON.stringify(afterRoutes) === JSON.stringify(snapshot.policy.allowedRoutes) && JSON.stringify(afterRest) === JSON.stringify(beforeRest);
  if (!ok) throw new PolicyCopyError('복원 뒤 확인에 실패했습니다');
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2);
    const apply = args.includes('--apply');
    const confirm = args.find((arg) => arg.startsWith('--confirm='))?.slice('--confirm='.length);
    const snapshot = loadSnapshot();
    const config = JSON.parse(readFileSync(CONFIG_URL, 'utf8'));
    const plan = planRestore(snapshot, config);
    console.log(formatPlan(plan));
    if (!apply) {
      console.log(`\n미리보기만 했습니다. 실제로 되돌리려면: node src/policy-restore.mjs --apply --confirm=${snapshot.sha256.slice(0, 12)}`);
    } else if (confirm !== snapshot.sha256.slice(0, 12)) {
      console.error('\n중단: --confirm 값이 복원할 사본의 해시 앞 12자리와 다릅니다. 아무것도 바꾸지 않았습니다.');
      process.exitCode = 1;
    } else if (!plan.changes.length) {
      console.log('\n바꿀 항목이 없어 아무것도 쓰지 않았습니다.');
    } else {
      applyRestore(plan, snapshot, CONFIG_URL, () => loadSnapshot());
      console.log('\n복원 완료: allowedRoutes를 사본과 같게 되돌렸고 다른 키는 그대로임을 다시 읽어 확인했습니다.');
      if (plan.rulesNeedManualFix) process.exitCode = 2;
    }
  } catch (error) {
    console.error(`중단: ${error instanceof PolicyCopyError ? error.message : '정책을 읽거나 쓸 수 없습니다'}`);
    process.exitCode = 1;
  }
}
