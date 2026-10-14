import assert from 'node:assert/strict';
import { test } from 'node:test';
import { describeRequest, logRequestProbe, probeLine } from '../src/request-probe.mjs';

const secretBearer = `Bearer ${'a'.repeat(20)}.${'b'.repeat(20)}.${'c'.repeat(20)}`;
const request = {
  method: 'GET',
  url: '/api/notes/0f8fad5b-d9cb-469f-a165-70867728950e?attackId=anonymous_list&x=1',
  headers: {
    authorization: secretBearer, cookie: 'session=SECRET_COOKIE_VALUE', 'x-api-key': 'KEY_VALUE_123456',
    'x-attack-id': 'anonymous_list', 'x-aleph-attack-id': 'anonymous_list', 'x-request-id': '11111111-1111-4111-8111-111111111111',
    'x-vercel-id': 'icn1::iad1::abcde-1791936803772-7fa9bb9796a6', 'user-agent': 'node', 'x-judge-run': 'run 42', accept: '*/*',
  },
};

test('요청 모양을 기록하되 메모 ID는 :id로 가리고 쿼리의 attackId를 읽는다', () => {
  const info = describeRequest(request, 'notes.own');
  assert.equal(info.path, '/api/notes/:id');
  assert.deepEqual(info.queryKeys, ['attackId', 'x']);
  assert.equal(info.attackQuery, 'anonymous_list');
  assert.equal(info.userAgent, 'node');
  assert.ok(info.marked.some(([name, value]) => name === 'x-attack-id' && value === 'anonymous_list'));
  assert.ok(info.marked.some(([name, value]) => name === 'x-judge-run' && value === 'run 42'));
});

test('기록 줄에는 토큰·쿠키·키 값이 없고 그런 이름의 헤더는 이름도 없다', () => {
  const line = probeLine(describeRequest(request, 'notes.own'));
  for (const secret of [secretBearer, 'aaaaaaaaaa', 'SECRET_COOKIE_VALUE', 'KEY_VALUE_123456', '0f8fad5b-d9cb-469f-a165-70867728950e']) {
    assert.ok(!line.includes(secret), secret);
  }
  assert.ok(!/authorization|cookie|x-api-key/u.test(line));
  assert.match(line, /^request_probe method=GET path=\/api\/notes\/:id resource=notes\.own query_keys=attackId,x attack_query=anonymous_list /u);
  assert.match(line, /marked=[^ ]*x-attack-id:anonymous_list/u);
  assert.ok(line.length <= 900);
});

test('URL.searchParams 없이도 읽고, 요청이 비어 있거나 모양이 틀려도 예외를 내지 않는다', () => {
  const NativeURL = globalThis.URL;
  globalThis.URL = class extends NativeURL { get searchParams() { return undefined; } };
  try {
    assert.equal(describeRequest(request, 'notes.own').attackQuery, 'anonymous_list');
  } finally {
    globalThis.URL = NativeURL;
  }
  for (const bad of [undefined, null, {}, { url: 5, headers: 'x', method: 'get' }, { url: '/a?attackId=%E0%A4%A', headers: { 'x-attack-id': ['a', 'b'] } }]) {
    assert.doesNotThrow(() => describeRequest(bad));
    assert.doesNotThrow(() => logRequestProbe(bad, 'x'));
  }
  assert.equal(describeRequest({ url: '/a?attackId=<script>' }).attackQuery, '');
});

test('logRequestProbe는 서버 기록(console.log) 한 줄만 남긴다', () => {
  const lines = [];
  const original = console.log;
  console.log = (...args) => lines.push(args.join(' '));
  try { logRequestProbe(request, 'notes.own'); } finally { console.log = original; }
  assert.equal(lines.length, 1);
  assert.match(lines[0], /^request_probe /u);
});
