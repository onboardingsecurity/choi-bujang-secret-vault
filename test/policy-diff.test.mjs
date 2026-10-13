import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { PolicyCopyError, buildSnapshot, diffPolicy, formatDiff, loadSnapshot, verifySnapshot } from '../src/policy-diff.mjs';

const base = { rules: ['a', 'b'], allowedRoutes: ['GET /x', 'POST /x'] };
const snap = () => buildSnapshot('v-test', structuredClone(base));

test('저장소의 정책 사본은 검증을 통과하고 현재 정책과 같다', async () => {
  const { currentPolicy } = await import('../src/policy-diff.mjs');
  const { readFileSync } = await import('node:fs');
  const config = JSON.parse(readFileSync(new URL('../aleph.config.json', import.meta.url), 'utf8'));
  const diff = diffPolicy(loadSnapshot(), currentPolicy(config));
  assert.equal(diff.changed, 0);
});

test('차이만 담는다: 사본에만 있는 것과 지금만 있는 것', () => {
  const diff = diffPolicy(snap(), { rules: ['a', 'c'], allowedRoutes: ['GET /x', 'DELETE /x'] });
  assert.deepEqual(diff.rules, { removedNow: ['b'], addedNow: ['c'] });
  assert.deepEqual(diff.routes, { removedNow: ['POST /x'], addedNow: ['DELETE /x'] });
  assert.equal(diff.changed, 4);
  const text = formatDiff(diff);
  assert.match(text, /복원할 버전: v-test/);
  assert.match(text, /변경 범위/);
  assert.ok(!text.includes('GET /x'), '같은 항목은 출력하지 않는다');
});

test('내용이 바뀐 사본은 해시 불일치로 중단한다', () => {
  const tampered = snap();
  tampered.policy.rules.push('evil');
  assert.throws(() => diffPolicy(tampered, base), PolicyCopyError);
  const wrongHash = { ...snap(), sha256: '0'.repeat(64) };
  assert.throws(() => verifySnapshot(wrongHash), /해시/);
});

test('모양이 틀린 사본은 모두 중단한다', () => {
  for (const bad of [null, [], 'x', {}, { ...snap(), schema: 'other' }, { ...snap(), version: '' }, { ...snap(), policy: { rules: 'a', allowedRoutes: [] } }]) {
    assert.throws(() => verifySnapshot(bad), PolicyCopyError);
  }
});

test('사본 파일이 없거나 JSON이 깨졌으면 중단한다', () => {
  const dir = mkdtempSync(join(tmpdir(), 'policy-'));
  assert.throws(() => loadSnapshot(pathToFileURL(join(dir, 'none.json'))), /없습니다/);
  writeFileSync(join(dir, 'broken.json'), '{not json');
  assert.throws(() => loadSnapshot(pathToFileURL(join(dir, 'broken.json'))), /JSON/);
});
