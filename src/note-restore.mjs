// 10단계: 비공개 가상 메모 사본에서 지정한 한 건만 복원합니다(POST /api/restore/note).
// 사본(backup/note.v1.json)에는 메모 본문이 없고 ID, 소유자 해시, 내용 해시만 있습니다. 본문은 요청으로 받아 해시를 대조합니다.
// 복원은 그 한 건의 행만 추가하거나 고칩니다. 다른 메모 삭제, 다른 행 수정, 감사·서버 로그 쓰기는 하지 않습니다.
import { createHash } from 'node:crypto';
import { checkNoteOwner, logDenied, readFields, triesOwnerChange, UUID } from './notes-api.mjs';

const NOTE_SNAPSHOT_SCHEMA = 'aleph.note.snapshot.v1';
const SHA256 = /^[0-9a-f]{64}$/u;
const ALLOWED_KEYS = new Set(['id', 'title', 'body', 'dryRun']);

const sha256 = (text) => createHash('sha256').update(text).digest('hex');
// 내용 해시는 DB에 저장되는 제목과 본문만 대상으로 하고 키 순서를 고정합니다.
export const hashNoteContent = ({ title, body }) => sha256(JSON.stringify({ title, body }));
export const hashOwner = (userId) => sha256(String(userId).toLowerCase());

const entriesHash = (notes) => sha256(JSON.stringify(notes.map((n) => ({ id: n.id, ownerSha256: n.ownerSha256, contentSha256: n.contentSha256 }))));

export const buildNoteSnapshot = (version, notes) => ({
  schema: NOTE_SNAPSHOT_SCHEMA, version, notes, sha256: entriesHash(notes),
});

// 사본이 틀리면 복원 전체를 중단합니다.
export const verifyNoteSnapshot = (snapshot) => {
  const bad = (why) => { throw new Error(`note_snapshot_invalid:${why}`); };
  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) bad('shape');
  if (snapshot.schema !== NOTE_SNAPSHOT_SCHEMA) bad('schema');
  if (typeof snapshot.version !== 'string' || !snapshot.version) bad('version');
  if (!Array.isArray(snapshot.notes)) bad('notes');
  const ids = new Set();
  for (const n of snapshot.notes) {
    if (!n || typeof n.id !== 'string' || !UUID.test(n.id) || !SHA256.test(n.ownerSha256) || !SHA256.test(n.contentSha256)) bad('entry');
    if (ids.has(n.id)) bad('duplicate');
    ids.add(n.id);
  }
  if (snapshot.sha256 !== entriesHash(snapshot.notes)) bad('hash');
  return snapshot;
};

const respond = (response, status, json) => response.status(status).json(json);

// 로그인 검사(guard)를 통과한 뒤의 처리입니다. 시험에서 가짜 사용자·DB·사본으로 직접 부를 수 있게 따로 두었습니다.
export async function handleRestore({ user, db, resourceId }, request, response, snapshot) {
  const input = request.body;
  if (!input || typeof input !== 'object' || Array.isArray(input)) return respond(response, 400, { error: 'INVALID_RESTORE' });
  if (triesOwnerChange(input, user)) {
    logDenied('owner_change', resourceId, request.method);
    return respond(response, 403, { error: 'OWNER_CHANGE_FORBIDDEN' });
  }
  if (Object.keys(input).some((key) => !ALLOWED_KEYS.has(key))) return respond(response, 400, { error: 'INVALID_RESTORE' });
  if (typeof input.id !== 'string' || !UUID.test(input.id)) return respond(response, 400, { error: 'INVALID_ID' });
  if (input.dryRun !== undefined && typeof input.dryRun !== 'boolean') return respond(response, 400, { error: 'INVALID_RESTORE' });
  const fields = readFields(input);
  if (!fields) return respond(response, 400, { error: 'INVALID_NOTE' });
  const id = input.id.toLowerCase();

  try { verifyNoteSnapshot(snapshot); } catch {
    logDenied('backup_invalid', resourceId, request.method);
    return respond(response, 503, { error: 'BACKUP_INVALID' });
  }
  // 사본에 없는 ID와 남의 사본은 같은 404입니다. 어느 ID가 사본에 있는지 알려 주지 않습니다.
  const entry = snapshot.notes.find((n) => n.id === id);
  if (!entry || entry.ownerSha256 !== hashOwner(user.userId)) {
    logDenied(entry ? 'not_owner' : 'not_in_backup', resourceId, request.method);
    return respond(response, 404, { error: 'NOT_FOUND' });
  }
  if (hashNoteContent(fields) !== entry.contentSha256) {
    logDenied('hash_mismatch', resourceId, request.method);
    return respond(response, 422, { error: 'HASH_MISMATCH' });
  }

  const { data: existing, error: readError } = await db.from('notes')
    .select('note_id, owner_id, title, content').eq('note_id', id).maybeSingle();
  if (readError) return respond(response, 502, { error: 'DB_READ_FAILED' });
  if (existing) {
    const denied = checkNoteOwner(existing, user);
    if (denied) {
      logDenied(denied, resourceId, request.method);
      return respond(response, 404, { error: 'NOT_FOUND' });
    }
  }
  const action = !existing ? 'insert'
    : hashNoteContent({ title: existing.title, body: existing.content }) === entry.contentSha256 ? 'none' : 'update';
  const report = { id, version: snapshot.version, action };
  if (input.dryRun === true) return respond(response, 200, { ...report, dryRun: true });
  if (action === 'none') return respond(response, 200, { ...report, verified: true });

  if (action === 'insert') {
    const { error } = await db.from('notes').insert({ note_id: id, owner_id: user.userId, title: fields.title, content: fields.body })
      .select('note_id').single();
    if (error?.code === '23505') return respond(response, 409, { error: 'ID_EXISTS' });
    if (error) return respond(response, 502, { error: 'DB_WRITE_FAILED' });
  } else {
    const { data, error } = await db.from('notes').update({ title: fields.title, content: fields.body })
      .eq('note_id', id).eq('owner_id', user.userId).select('note_id').maybeSingle();
    if (error) return respond(response, 502, { error: 'DB_WRITE_FAILED' });
    if (!data) {
      logDenied('not_owner', resourceId, request.method);
      return respond(response, 404, { error: 'NOT_FOUND' });
    }
  }

  // 쓴 뒤 다시 읽어 ID·소유자·내용 해시가 사본과 같은지 확인합니다.
  const { data: after, error: verifyError } = await db.from('notes')
    .select('note_id, owner_id, title, content').eq('note_id', id).maybeSingle();
  const verified = !verifyError && after?.note_id === id
    && hashOwner(after.owner_id) === entry.ownerSha256
    && hashNoteContent({ title: after.title, body: after.content }) === entry.contentSha256;
  if (!verified) {
    logDenied('restore_verify_failed', resourceId, request.method);
    return respond(response, 502, { error: 'RESTORE_VERIFY_FAILED' });
  }
  return respond(response, action === 'insert' ? 201 : 200, { ...report, verified: true });
}
