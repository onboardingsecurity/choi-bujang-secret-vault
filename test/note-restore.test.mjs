import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildNoteSnapshot, handleRestore, hashNoteContent, hashOwner, verifyNoteSnapshot } from '../src/note-restore.mjs';

const A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const ID = '11111111-1111-4111-8111-111111111111';
const OTHER = '22222222-2222-4222-8222-222222222222';
const note = { title: '가상 제목', body: '가상 본문' };
const userB = { userId: B };
const snap = () => buildNoteSnapshot('v-test', [{ id: ID, ownerSha256: hashOwner(B), contentSha256: hashNoteContent(note) }]);

// 가짜 DB: notes 행만 다루고, delete가 불리면 시험이 실패한다. 감사 기록은 따로 두고 건드리는지 본다.
const fakeDb = (rows) => {
  const calls = [];
  const db = { rows, calls, audit: ['audit-1'],
    from() {
      const state = { filters: {}, op: null, values: null };
      const run = () => {
        if (state.op === 'insert') {
          if (rows.some((r) => r.note_id === state.values.note_id)) return { error: { code: '23505' } };
          rows.push({ ...state.values }); calls.push('insert'); return { data: { note_id: state.values.note_id } };
        }
        const found = rows.filter((r) => Object.entries(state.filters).every(([k, v]) => r[k] === v));
        if (state.op === 'update') {
          const [row] = found;
          if (!row) return { data: null };
          Object.assign(row, state.values); calls.push('update'); return { data: { note_id: row.note_id } };
        }
        return { data: found[0] ? { ...found[0] } : null };
      };
      const q = { select: () => q, eq(k, v) { state.filters[k] = v; return q; },
        insert(values) { state.op = 'insert'; state.values = values; return q; },
        update(values) { state.op = 'update'; state.values = values; return q; },
        delete() { throw new Error('delete 금지'); },
        maybeSingle: async () => run(), single: async () => run() };
      return q;
    } };
  return db;
};
const fakeRes = () => ({ statusCode: null, body: null, status(c) { this.statusCode = c; return this; }, json(b) { this.body = b; return this; } });
const call = async (db, body, user = userB, snapshot = snap()) => {
  const res = fakeRes();
  await handleRestore({ user, db, resourceId: 'notes.own' }, { method: 'POST', body }, res, snapshot);
  return res;
};
const row = (id, owner, n = note) => ({ note_id: id, owner_id: owner, title: n.title, content: n.body });

test('없는 메모는 사본대로 한 건만 추가하고 ID·소유자·내용 해시를 다시 대조한다', async () => {
  const db = fakeDb([row(OTHER, A, { title: '다른', body: '다른 메모' })]);
  const res = await call(db, { id: ID, ...note });
  assert.equal(res.statusCode, 201);
  assert.deepEqual(res.body, { id: ID, version: 'v-test', action: 'insert', verified: true });
  assert.equal(db.rows.length, 2);
  assert.deepEqual(db.rows[0], row(OTHER, A, { title: '다른', body: '다른 메모' }));
  assert.equal(db.rows[1].owner_id, B);
  assert.deepEqual(db.audit, ['audit-1']);
});

test('바뀐 메모는 그 한 건만 사본 내용으로 고친다', async () => {
  const db = fakeDb([row(ID, B, { title: '침해됨', body: '바뀐 본문' }), row(OTHER, B, { title: '다른', body: '유지' })]);
  const res = await call(db, { id: ID, ...note });
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.action, 'update');
  assert.deepEqual(db.rows[0], row(ID, B));
  assert.equal(db.rows[1].content, '유지');
});

test('이미 같은 메모면 아무것도 쓰지 않는다', async () => {
  const db = fakeDb([row(ID, B)]);
  const res = await call(db, { id: ID, ...note });
  assert.equal(res.body.action, 'none');
  assert.deepEqual(db.calls, []);
});

test('dryRun은 복원할 버전과 바뀔 동작만 보여 주고 쓰지 않는다', async () => {
  const db = fakeDb([]);
  const res = await call(db, { id: ID, ...note, dryRun: true });
  assert.deepEqual(res.body, { id: ID, version: 'v-test', action: 'insert', dryRun: true });
  assert.equal(db.rows.length, 0);
});

test('거부: 내용 해시가 다르면 422이고 쓰지 않는다', async () => {
  const db = fakeDb([]);
  const res = await call(db, { id: ID, title: note.title, body: '위조된 본문' });
  assert.equal(res.statusCode, 422);
  assert.equal(db.rows.length, 0);
});

test('거부: 다른 계정 A는 B의 사본을 복원할 수 없다(404)', async () => {
  const db = fakeDb([]);
  const res = await call(db, { id: ID, ...note }, { userId: A });
  assert.equal(res.statusCode, 404);
  assert.equal(db.rows.length, 0);
});

test('거부: 사본에 없는 ID는 404, owner_id를 보내면 403', async () => {
  const db = fakeDb([]);
  assert.equal((await call(db, { id: OTHER, ...note })).statusCode, 404);
  assert.equal((await call(db, { id: ID, ...note, owner_id: A })).statusCode, 403);
  assert.equal(db.rows.length, 0);
});

test('거부: 같은 ID의 행이 남의 것이면 덮어쓰지 않는다(404)', async () => {
  const db = fakeDb([row(ID, A, { title: 'A의 메모', body: 'A의 본문' })]);
  const res = await call(db, { id: ID, ...note });
  assert.equal(res.statusCode, 404);
  assert.equal(db.rows[0].content, 'A의 본문');
});

test('거부: 모르는 키·여러 건·잘못된 모양은 400', async () => {
  const db = fakeDb([]);
  for (const body of [null, [], 'x', { id: ID, ...note, extra: 1 }, { id: [ID], ...note }, { id: 'nope', ...note }, { id: ID, ...note, dryRun: 'yes' }, { id: ID }]) {
    assert.equal((await call(db, body)).statusCode, 400);
  }
});

test('거부: 사본이 변조되었으면 복원 전체를 중단한다(503)', async () => {
  const bad = snap();
  bad.notes[0].contentSha256 = hashNoteContent({ title: 'x', body: 'y' });
  const db = fakeDb([]);
  assert.equal((await call(db, { id: ID, ...note }, userB, bad)).statusCode, 503);
  assert.equal(db.rows.length, 0);
  assert.throws(() => verifyNoteSnapshot(null));
});

test('저장소의 사본은 검증을 통과하고 본문이나 소유자 원문이 없다', async () => {
  const { readFileSync } = await import('node:fs');
  const text = readFileSync(new URL('../backup/note.v1.json', import.meta.url), 'utf8');
  verifyNoteSnapshot(JSON.parse(text));
  assert.ok(!/"(title|body|content|owner_id|ownerId)"/u.test(text));
});
