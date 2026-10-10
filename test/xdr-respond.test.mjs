import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { decide } from '../xdr/brute-force/decide.mjs';
import { respond } from '../xdr/brute-force/respond.mjs';

const NOW = new Date('2026-10-11T00:00:00Z');

function raw(id, minute, ip, user, description = '로그인 실패') {
  const at = new Date(Date.UTC(2026, 9, 11, 0, minute)).toISOString();
  return { id, timestamp: at, rule: { level: 5, description }, data: { srcip: ip, srcuser: user } };
}

async function run(alerts) {
  const root = await mkdtemp(join(tmpdir(), 'respond-'));
  try {
    await mkdir(join(root, 'xdr', 'fixtures'), { recursive: true });
    await mkdir(join(root, 'xdr', 'brute-force'), { recursive: true });
    await writeFile(join(root, 'xdr', 'fixtures', 'brute-force.json'),
      JSON.stringify({ schema: 'aleph.xdr.fixture.v1', moduleKey: 'brute-force', alerts }));
    const result = await respond({ root, now: NOW });
    const log = await readFile(join(root, 'xdr', 'alerts.log'), 'utf8').catch(() => '');
    return { result, log };
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

test('같은 주소의 낱개 실패 20건은 시간 창 안에서 합쳐져 차단 후보가 된다', async () => {
  const alerts = Array.from({ length: 20 }, (_, i) => raw(`r-${i + 1}`, i % 2, '203.0.113.77', 'user01'));
  const { result } = await run(alerts);
  assert.equal(result.candidates.length, 1);
  assert.equal(result.candidates[0].srcip, '203.0.113.77');
  assert.equal(result.candidates[0].alertId, 'r-1~r-20');
  assert.ok(result.candidates[0].expiresAt);
});

test('시간 창을 넘겨 흩어진 실패와 적은 실패는 차단되지 않는다', async () => {
  const spread = Array.from({ length: 20 }, (_, i) => raw(`s-${i + 1}`, i * 10, '198.51.100.31', 'user02'));
  const few = Array.from({ length: 4 }, (_, i) => raw(`f-${i + 1}`, i, '192.0.2.31', 'user03'));
  const { result } = await run([...spread, ...few]);
  assert.equal(result.candidates.length, 0);
});

test('같은 주소의 서로 다른 5개 계정 실패는 한 건으로 모여 차단 후보가 된다', async () => {
  const alerts = [];
  for (let u = 1; u <= 5; u += 1) for (let n = 0; n < 3; n += 1) alerts.push(raw(`p-${u}-${n}`, n, '203.0.113.88', `user0${u}`));
  const { result } = await run(alerts);
  assert.equal(result.candidates.length, 1);
  assert.match(result.candidates[0].reason, /same_password_many_accounts/);
});

test('같은 주소에서 정상 이벤트가 실패보다 많으면 그 주소는 차단하지 않는다', async () => {
  const alerts = [
    ...Array.from({ length: 20 }, (_, i) => raw(`a-${i + 1}`, i % 2, '192.0.2.99', 'user01')),
    ...Array.from({ length: 60 }, (_, i) => raw(`n-${i + 1}`, 6, '192.0.2.99', 'user02', '로그인이 성공했습니다.')),
  ];
  const { result } = await run(alerts);
  assert.equal(result.candidates.length, 0);
  assert.equal(result.skipped.length, 1);
});

test('공격 28건 뒤 같은 주소에서 정상 로그인 1건이 있어도 차단 후보로 남는다', async () => {
  const alerts = [
    ...Array.from({ length: 28 }, (_, i) => raw(`a-${i + 1}`, i % 2, '203.0.113.12', 'user01')),
    raw('n-1', 6, '203.0.113.12', 'user01', '로그인이 성공했습니다.'),
  ];
  const { result } = await run(alerts);
  assert.equal(result.candidates.length, 1);
});

test('서로 다른 5명이 각각 한 번씩 실패해도 차단하지 않는다(공용 주소)', async () => {
  const alerts = [1, 2, 3, 4, 5].map(u => raw(`u-${u}`, u % 2, '198.51.100.40', `user0${u}`));
  const { result } = await run(alerts);
  assert.equal(result.candidates.length, 0);
});

test('같은 주소의 실패는 14건이면 차단하지 않고 15건이면 차단한다', async () => {
  const make = (n, ip) => Array.from({ length: n }, (_, i) => raw(`b-${ip}-${i + 1}`, i % 2, ip, 'user01'));
  const { result } = await run([...make(14, '192.0.2.14'), ...make(15, '192.0.2.15')]);
  assert.deepEqual(result.candidates.map(c => c.srcip), ['192.0.2.15']);
});

test('같은 비밀번호라는 근거가 있을 때만 계정 수로 차단한다', () => {
  const spray = (description, count) => ({
    rule: { level: 10, description },
    data: { srcip: '198.51.100.5', count: String(count), accounts: 'a,b,c,d,e,f' },
  });
  assert.equal(decide(spray('서로 다른 계정 6개에 같은 비밀번호로 로그인 실패.', 6)).action, 'block');
  assert.equal(decide(spray('서로 다른 계정 6개에 로그인 실패.', 6)).action, 'alert');
});

test('알림 로그는 한 건이 한 줄이다', async () => {
  const alerts = Array.from({ length: 20 }, (_, i) => raw(`l-${i + 1}`, i % 2, '203.0.113.60', 'user01\nFAKE | block'));
  const { log } = await run(alerts);
  assert.equal(log.trim().split('\n').length, 1);
});
