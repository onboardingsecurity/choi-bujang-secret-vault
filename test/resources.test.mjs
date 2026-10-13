import assert from 'node:assert/strict';
import { test } from 'node:test';
import notesList from '../api/notes/index.js';
import noteOne from '../api/notes/[id].js';
import { RESOURCE_HEADER, RESOURCE_IDS } from '../src/resources.mjs';

const fakeResponse = () => {
  const headers = {};
  return { headers, statusCode: null,
    setHeader(name, value) { headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    json() { return this; } };
};

test('메모와 강사 공지는 서로 다른 자원 ID를 가진다', () => {
  assert.notEqual(RESOURCE_IDS.myNotes, RESOURCE_IDS.instructorNotices);
  assert.equal(new Set(Object.values(RESOURCE_IDS)).size, Object.keys(RESOURCE_IDS).length);
});

test('내 메모 API는 모든 요청 응답에 자기 구역의 자원 ID를 붙인다', async () => {
  for (const [handler, method] of [[notesList, 'PUT'], [noteOne, 'POST']]) {
    const response = fakeResponse();
    await handler({ method, headers: {}, query: {} }, response);
    assert.equal(response.statusCode, 405);
    assert.equal(response.headers[RESOURCE_HEADER], RESOURCE_IDS.myNotes);
  }
});

test('요청의 헤더·쿼리·본문에 든 자원 ID는 서버가 쓰지 않는다', async () => {
  const response = fakeResponse();
  await notesList({ method: 'PUT', headers: { 'x-resource-id': RESOURCE_IDS.instructorNotices },
    query: { resource: RESOURCE_IDS.instructorNotices }, body: { resourceId: RESOURCE_IDS.instructorNotices } }, response);
  assert.equal(response.headers[RESOURCE_HEADER], RESOURCE_IDS.myNotes);
});
