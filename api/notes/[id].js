// 3단계: GET·PUT·DELETE /api/notes/:id.
// 아직 소유자 검사를 하지 않습니다. 로그인한 누구나 id만 알면 다른 사람 메모를 읽고 고칠 수 있고,
// 이 허점은 4단계에서 막습니다.
import { guard, readFields, toNote, UUID } from '../_notes.js';

export default async function handler(request, response) {
  const ctx = await guard(request, response, ['GET', 'PUT', 'DELETE']);
  if (!ctx) return;
  const { db } = ctx;

  const id = request.query?.id;
  if (typeof id !== 'string' || !UUID.test(id)) {
    return response.status(404).json({ error: 'NOT_FOUND' });
  }
  const noteId = id.toLowerCase();

  if (request.method === 'GET') {
    const { data, error } = await db.from('notes')
      .select('note_id, title, content').eq('note_id', noteId).maybeSingle();
    if (error) return response.status(502).json({ error: 'DB_READ_FAILED' });
    if (!data) return response.status(404).json({ error: 'NOT_FOUND' });
    return response.status(200).json(toNote(data));
  }

  if (request.method === 'PUT') {
    const fields = readFields(request.body);
    if (!fields) return response.status(400).json({ error: 'INVALID_NOTE' });
    const { data, error } = await db.from('notes')
      .update({ title: fields.title, content: fields.body })
      .eq('note_id', noteId).select('note_id, title, content').maybeSingle();
    if (error) return response.status(502).json({ error: 'DB_WRITE_FAILED' });
    if (!data) return response.status(404).json({ error: 'NOT_FOUND' });
    return response.status(200).json(toNote(data));
  }

  const { data, error } = await db.from('notes').delete()
    .eq('note_id', noteId).select('note_id').maybeSingle();
  if (error) return response.status(502).json({ error: 'DB_WRITE_FAILED' });
  if (!data) return response.status(404).json({ error: 'NOT_FOUND' });
  return response.status(200).json({ id: data.note_id });
}
