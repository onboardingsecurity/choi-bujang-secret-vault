import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';
import { fixtureRequests } from '../scripts/fixture-7.mjs';
import { decide, RULE_IDS, zoneOf } from '../src/decider.mjs';

// 추가 확인 기록 줄은 가로채서 시험 출력에 섞이지 않게 합니다.
const realWrite = process.stderr.write.bind(process.stderr);
process.stderr.write = (chunk, ...rest) => (String(chunk).startsWith('step_up_required ') ? true : realWrite(chunk, ...rest));

// 모두 가상 값입니다. 사용자·기기는 엔진이 확인해 넣어 준다고 가정한 연습용 가명입니다.
const { normal, suspicious } = fixtureRequests();
const A = { subjectId: 'learner_a_fixture', deviceId: 'a'.repeat(16) };
const B = { subjectId: 'learner_b_fixture', deviceId: 'b'.repeat(16) };
const NOTE_OF_A = '11111111-1111-4111-8111-111111111111';
const NOTICE = '22222222-2222-4222-8222-222222222222';
const ask = (who, method, route, path, patch = {}) => ({ ...normal, ...who, requestId: randomUUID(), method, route, path, ...patch });
const OWN = ['device_registered', 'own_notes_zone'];

test('A의 자기 메모 한 건 읽기·수정은 허용된다(두 경로 모양 모두)', async () => {
  for (const prefix of ['', '/api']) {
    const cases = [
      ['GET', `GET ${prefix}/notes/:id`, `${prefix}/notes/${NOTE_OF_A}`],
      ['PUT', `PUT ${prefix}/notes/:id`, `${prefix}/notes/${NOTE_OF_A}`],
    ];
    for (const [method, route, path] of cases) {
      const request = ask(A, method, route, path);
      const result = await decide(request);
      assert.equal(result.decision, 'allow', route);
      assert.equal(result.reasonCode, 'approved', route);
      assert.deepEqual(result.ruleIds, OWN, route);
      assert.equal(result.requestId, request.requestId);
    }
  }
});

test('메모 전체 목록은 여러 사람의 자료를 한꺼번에 여는 경로라 판정기가 거부한다(S08)', async () => {
  const reverified = { stepUp: { verified: true, authAgeSeconds: 10 }, role: 'instructor' };
  for (const prefix of ['', '/api']) {
    for (const extra of [{}, reverified]) {
      const result = await decide(ask(A, 'GET', `GET ${prefix}/notes`, `${prefix}/notes`, extra));
      assert.equal(result.decision, 'deny', prefix);
      assert.equal(result.reasonCode, 'starter_not_ready');
      assert.deepEqual(result.ruleIds, ['starter.deny']);
    }
  }
});

test('공지 쓰기는 POST·PUT·PATCH·DELETE 모두 누구에게나 거부된다(S08)', async () => {
  for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
    for (const prefix of ['', '/api']) {
      for (const [route, path] of [[`${method} ${prefix}/notices`, `${prefix}/notices`], [`${method} ${prefix}/notices/:id`, `${prefix}/notices/${NOTICE}`]]) {
        for (const who of [A, B]) assert.equal((await decide(ask(who, method, route, path))).decision, 'deny', route);
      }
    }
  }
});

test('일반 학생의 강사 공지 수정은 역할을 꾸며 넣어도 거부된다', async () => {
  const forged = { role: 'instructor', identity: { role: 'instructor' }, body: { role: 'instructor' },
    headers: { 'x-role': 'instructor' }, stepUp: { verified: true, authAgeSeconds: 10 } };
  for (const prefix of ['', '/api']) {
    for (const extra of [{}, forged]) {
      const result = await decide(ask(B, 'PUT', `PUT ${prefix}/notices/:id`, `${prefix}/notices/${NOTICE}`, extra));
      assert.equal(result.decision, 'deny');
      assert.equal(result.reasonCode, 'starter_not_ready');
      assert.deepEqual(result.ruleIds, ['instructor_notice_zone']);
    }
  }
});

test('판정기는 메모 주인을 모르므로 B가 A의 메모 ID를 골라도 구역만 판정한다(주인 대조는 자료 API)', async () => {
  const fromA = ask(A, 'GET', 'GET /notes/:id', `/notes/${NOTE_OF_A}`);
  const fromB = ask(B, 'GET', 'GET /notes/:id', `/notes/${NOTE_OF_A}`);
  assert.equal(zoneOf(fromA), 'own_notes_zone');
  assert.equal(zoneOf(fromB), 'own_notes_zone');
  assert.equal((await decide(fromB)).decision, (await decide(fromA)).decision);
});

test('알 수 없는 경로·메서드는 거부되고 기능 경로를 :id 깊이에서 고를 수 없다', async () => {
  const unknown = [
    ['GET', 'GET /notes/export', '/notes/export'],
    ['GET', 'GET /notes/:id/export', `/notes/${NOTE_OF_A}/export`],
    ['GET', 'GET /notes/:id', `/notes/${NOTE_OF_A}/export`],
    ['GET', 'GET /notes/:id', `/notes/${NOTE_OF_A}/`],
    ['GET', 'GET /notes/:id', `/notes//${NOTE_OF_A}`],
    ['GET', 'GET /notes/:id', '/notes/../notices/x'],
    ['GET', 'GET /notes/:id', '/notes/%2e%2e'],
    ['GET', 'GET /notes/:id', `/notes/${NOTE_OF_A}?export=1`],
    ['GET', 'GET /notes/:id', `/api/notes/${NOTE_OF_A}`],
    ['GET', 'GET /Notes/:id', `/Notes/${NOTE_OF_A}`],
    ['GET', 'GET /notices/:id', `/notices/${NOTICE}`],
    ['GET', 'GET /admin', '/admin'],
    ['GET', 'GET /notes/:id', '/notes/' + 'x'.repeat(65)],
    ['PUT', 'GET /notes/:id', `/notes/${NOTE_OF_A}`],
    ['PUT', 'PUT /notes', '/notes'],
    ['POST', 'POST /notes', '/notes'],
    ['DELETE', 'DELETE /notes/:id', `/notes/${NOTE_OF_A}`],
    ['GET', undefined, `/notes/${NOTE_OF_A}`],
    ['GET', 'GET /notes/:id', undefined],
  ];
  for (const [method, route, path] of unknown) {
    const result = await decide(ask(A, method, route, path));
    assert.equal(result.decision, 'deny', `${method} ${route} ${path}`);
    assert.equal(result.reasonCode, 'starter_not_ready');
    assert.deepEqual(result.ruleIds, ['starter.deny']);
  }
});

test(':id 칸의 값은 자료 ID로만 읽히고 기능을 고르지 않는다', () => {
  for (const id of ['export', 'admin', 'notices', NOTE_OF_A]) {
    assert.equal(zoneOf(ask(A, 'GET', 'GET /notes/:id', `/notes/${id}`)), 'own_notes_zone', id);
  }
});

test('쿼리가 붙거나 엔진이 확인한 사용자·기기가 없으면 구역이 없다', async () => {
  const bad = [
    { queryLength: 9 }, { queryLength: '0' }, { queryLength: undefined },
    { subjectId: undefined }, { subjectId: '' }, { subjectId: 'learner a' }, { subjectId: 7 },
    { deviceId: undefined }, { deviceId: 'A'.repeat(16) }, { deviceId: 'a'.repeat(15) }, { deviceId: 'g'.repeat(16) },
  ];
  for (const patch of bad) {
    const result = await decide(ask(A, 'GET', 'GET /notes/:id', `/notes/${NOTE_OF_A}`, patch));
    assert.equal(result.decision, 'deny', JSON.stringify(patch));
    assert.deepEqual(result.ruleIds, ['starter.deny']);
  }
});

test('이전 규칙은 그대로다: 기기 규칙이 먼저이고 복합 이상 접속은 읽기·수정 모두 추가 확인이다', async () => {
  for (const [method, route, path] of [['PUT', 'PUT /notices/:id', `/notices/${NOTICE}`], ['GET', 'GET /notes/:id', `/notes/${NOTE_OF_A}`]]) {
    const result = await decide(ask(A, method, route, path, { deviceRegistered: false }));
    assert.equal(result.reasonCode, 'device_not_registered', route);
  }
  for (const [method, route] of [['GET', 'GET /notes/:id'], ['PUT', 'PUT /notes/:id']]) {
    const odd = { ...suspicious, ...A, requestId: randomUUID(), method, route, path: `/notes/${NOTE_OF_A}` };
    assert.equal((await decide(odd)).decision, 'step_up', method);
    const again = await decide({ ...odd, stepUp: { verified: true, authAgeSeconds: 60 } });
    assert.equal(again.decision, 'allow', method);
    assert.deepEqual(again.ruleIds, [...OWN, 'step_up_required']);
  }
  assert.deepEqual(RULE_IDS, ['starter.deny', 'device_registered', 'step_up_required', 'own_notes_zone', 'instructor_notice_zone']);
});

test('process가 없는 격리 환경에서도 구역 규칙이 같다', async () => {
  const source = readFileSync(new URL('../src/decider.mjs', import.meta.url), 'utf8');
  const sandbox = vm.createContext({});
  vm.runInContext(`${source.replace(/^export /gmu, '')}\nglobalThis.__decide = decide;`, sandbox, { timeout: 2000 });
  const isolated = async request => JSON.parse(JSON.stringify(await sandbox.__decide(JSON.parse(JSON.stringify(request)))));
  assert.equal((await isolated(ask(A, 'PUT', 'PUT /notes/:id', `/notes/${NOTE_OF_A}`))).decision, 'allow');
  assert.deepEqual((await isolated(ask(B, 'PUT', 'PUT /notices/:id', `/notices/${NOTICE}`))).ruleIds, ['instructor_notice_zone']);
  assert.deepEqual((await isolated(ask(A, 'GET', 'GET /notes/export', '/notes/export'))).ruleIds, ['starter.deny']);
});
