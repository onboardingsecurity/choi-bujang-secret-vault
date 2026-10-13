import assert from 'node:assert/strict';
import { test } from 'node:test';
import { handleNotes } from '../api/notes/index.js';
import { handleNote } from '../api/notes/[id].js';
import { checkNoteOwner, logDenied } from '../src/notes-api.mjs';
import { RESOURCE_IDS } from '../src/resources.mjs';

// 모두 가상 값입니다. A·B는 검증을 통과한 사용자라고 가정한 연습용 ID입니다.
const A = Object.freeze({ kind: 'student', userId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' });
const B = Object.freeze({ kind: 'student', userId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' });
const NOTE_A = '11111111-1111-4111-8111-111111111111';
const NOTE_B = '22222222-2222-4222-8222-222222222222';
const NOTE_NOBODY = '33333333-3333-4333-8333-333333333333';
const NOTE_NONE = '44444444-4444-4444-8444-444444444444';

// 필요한 질의 모양만 흉내 내는 가짜 DB입니다. 실제 DB·네트워크는 쓰지 않습니다.
function fakeDb(rows, { ignoreOwnerFilter = false } = {}) {
  const query = (table, mode, patch) => {
    const filters = [];
    const q = {
      select: () => q,
      order: () => q,
      eq(column, value) { filters.push([column, value]); return q; },
      then(resolve) { resolve({ data: run(false), error: null }); },
      maybeSingle: async () => ({ data: run(true), error: null }),
    };
    const matches = row => filters.every(([c, v]) => (ignoreOwnerFilter && c === 'owner_id') || row[c] === v);
    const run = single => {
      const hit = rows.filter(matches);
      if (mode === 'update') hit.forEach(row => Object.assign(row, patch));
      if (mode === 'delete') hit.forEach(row => rows.splice(rows.indexOf(row), 1));
      return single ? (hit[0] ?? null) : hit;
    };
    return q;
  };
  return { from: table => ({
    select: () => query(table, 'select'),
    update: patch => query(table, 'update', patch),
    delete: () => query(table, 'delete'),
  }) };
}
const seed = () => [
  { note_id: NOTE_A, owner_id: A.userId, title: 'A의 가상 메모', content: 'A 본문' },
  { note_id: NOTE_B, owner_id: B.userId, title: 'B의 가상 메모', content: 'B 본문' },
  { note_id: NOTE_NOBODY, owner_id: null, title: '주인 없는 가상 메모', content: '주인 없음' },
];
const fakeResponse = () => ({ statusCode: null, body: null,
  setHeader() {}, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } });

// 거부 사유 줄만 가로채서 모읍니다.
async function withLogs(run) {
  const lines = [];
  const real = console.warn;
  console.warn = line => lines.push(String(line));
  try { await run(); } finally { console.warn = real; }
  return lines;
}
const call = (user, db, request, handler = handleNote) => {
  const response = fakeResponse();
  return handler({ user, db, resourceId: RESOURCE_IDS.myNotes }, request, response).then(() => response);
};

test('A는 자기 메모를 읽고 수정하고 삭제할 수 있다', async () => {
  const db = fakeDb(seed());
  assert.equal((await call(A, db, { method: 'GET', query: { id: NOTE_A } })).body.title, 'A의 가상 메모');
  const put = await call(A, db, { method: 'PUT', query: { id: NOTE_A }, body: { title: '새 제목', body: '새 본문' } });
  assert.equal(put.statusCode, 200);
  assert.equal(put.body.title, '새 제목');
  assert.equal((await call(A, db, { method: 'DELETE', query: { id: NOTE_A } })).statusCode, 200);
});

test('B가 A의 메모 ID를 직접 불러도 읽기·수정·삭제 모두 404이고 내용이 없다', async () => {
  const rows = seed();
  const db = fakeDb(rows);
  const logs = await withLogs(async () => {
    for (const request of [
      { method: 'GET', query: { id: NOTE_A } },
      { method: 'PUT', query: { id: NOTE_A }, body: { title: '탈취', body: '탈취' } },
      { method: 'DELETE', query: { id: NOTE_A } },
    ]) {
      const response = await call(B, db, request);
      assert.equal(response.statusCode, 404, request.method);
      assert.deepEqual(response.body, { error: 'NOT_FOUND' });
    }
  });
  assert.equal(rows.find(row => row.note_id === NOTE_A).title, 'A의 가상 메모');
  assert.equal(rows.length, 3);
  assert.deepEqual(logs, ['GET', 'PUT', 'DELETE'].map(m => `notes_denied reason=not_owner resource=notes.own method=${m}`));
});

test('없는 메모·주인 없는 메모·형식이 틀린 ID도 같은 404이고 사유만 로그에 구분된다', async () => {
  const db = fakeDb(seed());
  const logs = await withLogs(async () => {
    for (const id of [NOTE_NONE, NOTE_NOBODY, 'export', '../notices']) {
      const response = await call(A, db, { method: 'GET', query: { id } });
      assert.equal(response.statusCode, 404, id);
      assert.deepEqual(response.body, { error: 'NOT_FOUND' });
    }
  });
  assert.deepEqual(logs.map(line => line.split(' ')[1]), ['reason=not_found', 'reason=no_owner', 'reason=invalid_id', 'reason=invalid_id']);
});

test('요청 본문·쿼리·헤더의 role이나 owner_id는 권한이 되지 못한다', async () => {
  const rows = seed();
  const db = fakeDb(rows);
  const claim = { role: 'instructor', isInstructor: true, admin: true };
  const logs = await withLogs(async () => {
    const read = await call(B, db, { method: 'GET', query: { id: NOTE_A, ...claim }, headers: { 'x-role': 'instructor' }, body: claim });
    assert.equal(read.statusCode, 404);
    const edit = await call(B, db, { method: 'PUT', query: { id: NOTE_A }, body: { title: 'x', body: 'y', ...claim } });
    assert.equal(edit.statusCode, 404);
    const steal = await call(B, db, { method: 'PUT', query: { id: NOTE_B }, body: { title: 'x', body: 'y', owner_id: A.userId } });
    assert.equal(steal.statusCode, 403);
  });
  assert.equal(rows.find(row => row.note_id === NOTE_A).owner_id, A.userId);
  assert.equal(rows.find(row => row.note_id === NOTE_B).owner_id, B.userId);
  assert.deepEqual(logs.map(line => line.split(' ')[1]), ['reason=not_owner', 'reason=not_owner', 'reason=owner_change']);
});

test('목록은 자기 메모만 돌려주고, DB 조건이 새도 저장된 owner_id로 다시 걸러 낸다', async () => {
  const list = await call(A, fakeDb(seed()), { method: 'GET' }, handleNotes);
  assert.deepEqual(list.body.map(note => note.title), ['A의 가상 메모']);
  let leaked;
  const logs = await withLogs(async () => { leaked = await call(A, fakeDb(seed(), { ignoreOwnerFilter: true }), { method: 'GET' }, handleNotes); });
  assert.equal(leaked.statusCode, 200);
  assert.deepEqual(leaked.body.map(note => note.title), ['A의 가상 메모']);
  assert.equal(JSON.stringify(leaked.body).includes('owner_id'), false);
  assert.deepEqual(logs, ['notes_denied reason=not_owner resource=notes.own method=GET']);
});

test('거부 사유 줄에는 사유·자원 ID·메서드 말고는 담기지 않는다', async () => {
  const logs = await withLogs(async () => {
    await call(B, fakeDb(seed()), { method: 'GET', query: { id: NOTE_A } });
    logDenied('login_required', RESOURCE_IDS.myNotes, 'GET\nfake_line reason=x');
  });
  for (const line of logs) {
    assert.match(line, /^notes_denied reason=[a-z_]+ resource=notes\.own method=[A-Z]+$/u);
    for (const leak of [A.userId, B.userId, NOTE_A, 'A의', 'Bearer', 'eyJ']) assert.equal(line.includes(leak), false, leak);
  }
});

test('소유자 대조는 비어 있거나 다른 소유자를 모두 거부하고 대소문자만 달라도 같은 사람으로 본다', () => {
  assert.equal(checkNoteOwner(null, A), 'not_found');
  assert.equal(checkNoteOwner({ owner_id: B.userId }, A), 'not_owner');
  assert.equal(checkNoteOwner({ owner_id: null }, A), 'no_owner');
  assert.equal(checkNoteOwner({ owner_id: '' }, A), 'no_owner');
  assert.equal(checkNoteOwner({ owner_id: A.userId.toUpperCase() }, A), null);
  assert.equal(checkNoteOwner({ owner_id: A.userId, role: 'instructor' }, B), 'not_owner');
});
