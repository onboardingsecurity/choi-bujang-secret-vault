import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { buildSnapshot, PolicyCopyError } from '../src/policy-diff.mjs';
import { applyRestore, formatPlan, planRestore } from '../src/policy-restore.mjs';
import { RULE_IDS } from '../src/decider.mjs';

const routes = ['GET /api/notes', 'POST /api/notes', 'GET /api/notes/:id'];
const snap = () => buildSnapshot('v-test', { rules: [...RULE_IDS], allowedRoutes: [...routes] });
const config = (allowedRoutes) => ({ step: 9, judgeIssuer: 'https://example.invalid/j', originalApiUrl: 'https://example.invalid/r', otherService: { keep: true }, allowedRoutes });

test('미리보기는 바뀔 항목을 보여 주고 설정 객체를 바꾸지 않는다', () => {
  const current = config([...routes, 'DELETE /api/export', 'GET /api/notes/all'].filter((r) => r !== 'POST /api/notes'));
  const frozen = structuredClone(current);
  const plan = planRestore(snap(), current);
  assert.deepEqual(current, frozen);
  assert.deepEqual(plan.changes.sort(), ['삭제: allowedRoutes에서 DELETE /api/export', '삭제: allowedRoutes에서 GET /api/notes/all', '추가: allowedRoutes에 POST /api/notes'].sort());
  assert.match(formatPlan(plan), /복원할 버전: v-test/);
  assert.match(formatPlan(plan), /실행하면 바뀌는 항목/);
});

test('복원은 allowedRoutes만 사본으로 되돌리고 다른 키는 그대로 둔다', () => {
  const dir = mkdtempSync(join(tmpdir(), 'restore-'));
  const path = join(dir, 'aleph.config.json');
  const current = config(['GET /api/notes', 'GET /api/evil']);
  writeFileSync(path, JSON.stringify(current));
  const plan = planRestore(snap(), current);
  applyRestore(plan, snap(), pathToFileURL(path));
  const after = JSON.parse(readFileSync(path, 'utf8'));
  assert.deepEqual(after.allowedRoutes, routes);
  const { allowedRoutes: _a, ...rest } = after;
  const { allowedRoutes: _b, ...restBefore } = current;
  assert.deepEqual(rest, restBefore);
  assert.equal(after.otherService.keep, true);
  assert.equal(existsSync(`${path}.restore.tmp`), false);
});

test('차이가 없으면 바뀔 항목이 없다', () => {
  assert.deepEqual(planRestore(snap(), config(routes)).changes, []);
});

test('판정기 규칙이 다르면 코드를 고치지 않고 알린다', () => {
  const bad = { ...snap(), policy: { ...snap().policy, rules: [...RULE_IDS, 'ghost_rule'] } };
  bad.sha256 = buildSnapshot('v-test', bad.policy).sha256;
  const plan = planRestore(bad, config(routes));
  assert.equal(plan.rulesNeedManualFix, true);
  assert.match(formatPlan(plan), /직접 확인/);
});

test('변조된 사본으로는 계획도 만들지 않는다', () => {
  const tampered = snap();
  tampered.policy.allowedRoutes.push('GET /api/evil');
  assert.throws(() => planRestore(tampered, config(routes)), PolicyCopyError);
});
