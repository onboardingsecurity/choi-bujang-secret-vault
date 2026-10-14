import assert from 'node:assert/strict';
import { test } from 'node:test';
import { describeRequest, diagLine, logRequestProbe, probeLine } from '../src/request-probe.mjs';

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

test('경로에서 허용 문자 밖의 글자(따옴표·세미콜론·제어 문자·퍼센트)는 ?로 바뀌고 정상 경로는 그대로다', () => {
  const pathOf = (url) => describeRequest({ method: 'GET', url, headers: {} }).path;
  assert.equal(pathOf('/api/x"; DROP;--'), '/api/x???DROP?--');
  assert.equal(pathOf('/api/notes/\u0001\u0002'), '/api/notes/??');
  assert.equal(pathOf('/api/notes/%0Aforged_line=1'), '/api/notes/?0Aforged_line?1');
  assert.equal(pathOf('/api/notes'), '/api/notes');
  assert.equal(pathOf('/api/notes/0f8fad5b-d9cb-469f-a165-70867728950e'), '/api/notes/:id');
  assert.equal(pathOf('/api/device/status?attackId=x'), '/api/device/status');
  for (const url of ['/a"b', '/a;b', '/a\u0000b', '/a\b', '/a b']) assert.match(pathOf(url), /^[A-Za-z0-9/_.:?-]+$/u, url);
});

test('x-diag-env 헤더가 있으면 request_diag 줄을 따로 남기고, 허용 문자 밖은 ?로 바꾸며, 없으면 남기지 않는다', () => {
  assert.equal(diagLine({ url: '/api/config', headers: {} }), '');
  assert.equal(diagLine(undefined), '');
  const line = diagLine({ url: '/api/config?attackId=diag_env', headers: { 'x-diag-env': 'fetch.native=0;globals=A,B;bad="x" y' } });
  assert.equal(line, 'request_diag attack_query=diag_env diag=fetch.native=0;globals=A,B;bad=?x??y');
  assert.ok(diagLine({ url: '/a', headers: { 'x-diag-env': 'a'.repeat(9000) } }).length < 4100);
  const lines = [];
  const original = console.log;
  console.log = (...args) => lines.push(args.join(' '));
  try { logRequestProbe({ method: 'GET', url: '/api/config?attackId=diag_env', headers: { 'x-diag-env': 'node=v1' } }, 'config.public'); } finally { console.log = original; }
  assert.equal(lines.length, 2);
  assert.match(lines[0], /^request_probe /u);
  assert.match(lines[1], /^request_diag attack_query=diag_env diag=node=v1$/u);
});

test('같은 헤더가 합쳐져 "값, 값"으로 와도 표식 값이 기록에 보인다(쉼표 허용)', () => {
  const info = describeRequest({ method: 'GET', url: '/api/notes', headers: { 'x-attack-id': 'anonymous_list, anonymous_list' } });
  assert.deepEqual(info.marked, [['x-attack-id', 'anonymous_list, anonymous_list']]);
  assert.match(probeLine(info), /marked=x-attack-id:anonymous_list,_anonymous_list /u);
});
