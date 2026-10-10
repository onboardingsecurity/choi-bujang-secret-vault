import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { decide } from '../xdr/web-injection/decide.mjs';
import { respond } from '../xdr/web-injection/respond.mjs';
import { readAlerts } from '../xdr/web-injection/read-alerts.mjs';

const NOW = new Date('2026-10-11T00:00:00Z');

function raw(id, second, ip, description, url = '/search?q=doc-sql-chain') {
  const at = new Date(Date.UTC(2026, 9, 11, 0, 0, second)).toISOString();
  return { id, timestamp: at, rule: { level: 7, description }, data: { srcip: ip, url } };
}

async function run(alerts) {
  const root = await mkdtemp(join(tmpdir(), 'web-respond-'));
  try {
    await mkdir(join(root, 'xdr', 'fixtures'), { recursive: true });
    await mkdir(join(root, 'xdr', 'web-injection'), { recursive: true });
    await writeFile(join(root, 'xdr', 'fixtures', 'web-injection.json'),
      JSON.stringify({ schema: 'aleph.xdr.fixture.v1', moduleKey: 'web-injection', alerts }));
    const result = await respond({ root, now: NOW });
    const log = await readFile(join(root, 'xdr', 'alerts.log'), 'utf8').catch(() => '');
    return { result, log };
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

const SQL = 'SQL 구문 표기가 한 번 들어왔습니다.';

test('같은 주소의 낱개 SQL 주입 8건은 합쳐져 차단 후보가 되고 7건은 되지 않는다', async () => {
  const make = (n, ip) => Array.from({ length: n }, (_, i) => raw(`s-${ip}-${i + 1}`, i * 10, ip, SQL));
  const { result } = await run([...make(8, '203.0.113.31'), ...make(7, '203.0.113.32')]);
  assert.deepEqual(result.candidates.map(c => c.srcip), ['203.0.113.31']);
  assert.match(result.candidates[0].alertId, /~/);
});

test('2분 창을 넘겨 흩어진 주입 시도는 차단하지 않는다', async () => {
  const alerts = Array.from({ length: 10 }, (_, i) => raw(`d-${i + 1}`, i * 130, '198.51.100.31', SQL));
  const { result } = await run(alerts);
  assert.equal(result.candidates.length, 0);
});

test('같은 주소에서 정상 이벤트가 주입 시도보다 많으면 차단하지 않고, 적으면 차단한다', async () => {
  const attack = n => Array.from({ length: n }, (_, i) => raw(`a-${n}-${i + 1}`, i, '192.0.2.31', SQL));
  const normal = n => Array.from({ length: n }, (_, i) => raw(`n-${n}-${i + 1}`, 30 + i, '192.0.2.31', '자료 목록을 조회했습니다.', '/api/notes'));
  assert.equal((await run([...attack(8), ...normal(20)])).result.candidates.length, 0);
  assert.equal((await run([...attack(28), ...normal(1)])).result.candidates.length, 1);
});

test('수업 낱말이나 공격이 아니라고 밝힌 경보는 block 되지 않고 alert 로 사람이 본다', () => {
  for (const [d, url] of [
    ['주소에 select 라는 수업명이 한 번 있습니다.', '/search?q=select-course'],
    ['SQL 이라는 수업 공지 제목을 한 번 조회했습니다.', '/search?q=sql-class-notice'],
    ['검색어에 스크립트라는 수업 단어가 한 번 있습니다. 삽입 표식은 아닙니다.', '/search?q=script-class'],
    ['요청 주소가 평소보다 깁니다. 공격 표기는 없습니다.', '/notes?q=user02-week3-summary'],
  ]) {
    const out = decide({ rule: { level: 6, description: d }, data: { srcip: '192.0.2.5', url, count: '1' } });
    assert.equal(out.action, 'alert', d);
  }
});

test('주소의 실제 구문 모양(UNION SELECT, script 태그, ../ 반복)도 신호로 본다', () => {
  const at = (url, count) => decide({ rule: { level: 5, description: '요청이 들어왔습니다.' }, data: { srcip: '192.0.2.6', url, count: String(count) } });
  assert.equal(at('/notes?id=1%20UNION%20SELECT%20a', 9).action, 'block');
  assert.equal(at('/search?q=%3Cscript%3E', 9).action, 'block');
  assert.equal(at('/files?path=../../../x', 9).action, 'block');
  assert.equal(at('/notes?id=1%20UNION%20SELECT%20a', 1).action, 'alert');
  assert.equal(at('/search?q=week3', 99).action, 'record');
});

test('엉뚱한 입력에도 오류 없이 답한다', () => {
  for (const bad of [null, undefined, {}, 'text', [], { rule: { description: 5 }, data: { url: 5, count: 'x' } }, { data: { url: '%E0%A4%A' } }]) {
    const out = decide(bad);
    assert.ok(['block', 'alert', 'record'].includes(out.action));
  }
});

test('알림 로그는 한 건이 한 줄이고 읽기 모듈은 건수가 같다', async () => {
  const alerts = Array.from({ length: 8 }, (_, i) => ({ ...raw(`l-${i + 1}`, i, '203.0.113.33', SQL), data: { srcip: '203.0.113.33', srcuser: 'u\nFAKE | block', url: '/x' } }));
  const { log } = await run(alerts);
  assert.equal(log.trim().split('\n').length, 1);
  const { alertCount, rows } = await readAlerts();
  assert.equal(alertCount, rows.length);
});
