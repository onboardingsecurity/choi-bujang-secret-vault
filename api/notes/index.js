// 4단계: GET /api/notes (내 메모 목록), POST /api/notes (추가).
// 목록은 검증된 사용자 ID의 owner_id만 읽고, 추가할 때 owner_id는 항상 검증된 ID로 저장합니다.
import { guard, readFields, toNote, triesOwnerChange, UUID } from '../_notes.js';

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

  if (triesOwnerChange(request.body, user)) {
    return response.status(403).json({ error: 'OWNER_CHANGE_FORBIDDEN' });
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
