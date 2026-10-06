// 4단계: GET·PUT·DELETE /api/notes/:id. 검증된 사용자 ID와 DB의 owner_id가 같은 메모만 허용합니다.
// 남의 메모와 없는 메모는 같은 404로 답해서 id의 존재를 알려 주지 않습니다.
import { guard, isOwner, readFields, toNote, triesOwnerChange, UUID } from '../_notes.js';

export default async function handler(request, response) {
  const ctx = await guard(request, response, ['GET', 'PUT', 'DELETE']);
  if (!ctx) return;
  const { user, db } = ctx;

  const id = request.query?.id;
  if (typeof id !== 'string' || !UUID.test(id)) {
    return response.status(404).json({ error: 'NOT_FOUND' });
  }
  const noteId = id.toLowerCase();

  // 먼저 기존 행의 소유자를 확인합니다. 본인 것이 아니면 읽기·수정·삭제 모두 여기서 끝납니다.
  const { data: existing, error: readError } = await db.from('notes')
    .select('note_id, owner_id, title, content').eq('note_id', noteId).maybeSingle();
  if (readError) return response.status(502).json({ error: 'DB_READ_FAILED' });
  if (!existing || !isOwner(existing, user)) {
    return response.status(404).json({ error: 'NOT_FOUND' });
  }

  if (request.method === 'GET') return response.status(200).json(toNote(existing));

  if (request.method === 'PUT') {
    if (triesOwnerChange(request.body, user)) {
      return response.status(403).json({ error: 'OWNER_CHANGE_FORBIDDEN' });
    }
    const fields = readFields(request.body);
    if (!fields) return response.status(400).json({ error: 'INVALID_NOTE' });
    // 새 행의 owner_id도 검증된 ID로 고정하고, 갱신 대상도 본인 행으로 다시 한정합니다.
    const { data, error } = await db.from('notes')
      .update({ owner_id: user.userId, title: fields.title, content: fields.body })
      .eq('note_id', noteId).eq('owner_id', user.userId)
      .select('note_id, title, content').maybeSingle();
    if (error) return response.status(502).json({ error: 'DB_WRITE_FAILED' });
    if (!data) return response.status(404).json({ error: 'NOT_FOUND' });
    return response.status(200).json(toNote(data));
  }

  const { data, error } = await db.from('notes').delete()
    .eq('note_id', noteId).eq('owner_id', user.userId).select('note_id').maybeSingle();
  if (error) return response.status(502).json({ error: 'DB_WRITE_FAILED' });
  if (!data) return response.status(404).json({ error: 'NOT_FOUND' });
  return response.status(200).json({ id: data.note_id });
}
