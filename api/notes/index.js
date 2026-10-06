// 3단계: GET /api/notes (내 메모 목록), POST /api/notes (추가).
// 로그인 확인만 합니다. 다른 사람 메모를 고치는 허점은 4단계에서 막습니다.
import { guard, readFields, toNote, UUID } from '../_notes.js';

export default async function handler(request, response) {
  const ctx = await guard(request, response, ['GET', 'POST']);
  if (!ctx) return;
  const { user, db } = ctx;

  if (request.method === 'GET') {
    const { data, error } = await db.from('notes')
      .select('note_id, title, content').eq('owner_id', user.userId).order('id');
    if (error) return response.status(502).json({ error: 'DB_READ_FAILED' });
    return response.status(200).json(data.map(toNote));
  }

  const fields = readFields(request.body);
  if (!fields) return response.status(400).json({ error: 'INVALID_NOTE' });
  const givenId = request.body.id;
  if (givenId !== undefined && !(typeof givenId === 'string' && UUID.test(givenId))) {
    return response.status(400).json({ error: 'INVALID_ID' });
  }
  const row = { owner_id: user.userId, title: fields.title, content: fields.body };
  if (givenId) row.note_id = givenId.toLowerCase();
  const { data, error } = await db.from('notes').insert(row).select('note_id').single();
  if (error?.code === '23505') return response.status(409).json({ error: 'ID_EXISTS' });
  if (error) return response.status(502).json({ error: 'DB_WRITE_FAILED' });
  return response.status(201).json({ id: data.note_id });
}
