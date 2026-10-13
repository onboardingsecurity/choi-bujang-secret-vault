// 4단계: GET /api/notes (내 메모 목록), POST /api/notes (추가).
// 목록은 검증된 사용자 ID의 owner_id만 읽고, 추가할 때 owner_id는 항상 검증된 ID로 저장합니다.
import { guard, isOwner, logDenied, readFields, toNote, triesOwnerChange, UUID } from '../../src/notes-api.mjs';
import { RESOURCE_IDS } from '../../src/resources.mjs';

export default async function handler(request, response) {
  const ctx = await guard(request, response, ['GET', 'POST'], RESOURCE_IDS.myNotes);
  if (!ctx) return;
  return handleNotes(ctx, request, response);
}

// 로그인 검사(guard)를 통과한 뒤의 처리입니다. 시험에서 가짜 사용자·DB로 직접 부를 수 있게 따로 두었습니다.
export async function handleNotes({ user, db, resourceId }, request, response) {
  if (request.method === 'GET') {
    // 조건에 owner_id를 걸고도, 돌아온 행의 저장된 owner_id를 검증된 사용자와 한 번 더 대조합니다.
    const { data, error } = await db.from('notes')
      .select('note_id, owner_id, title, content').eq('owner_id', user.userId).order('id');
    if (error) return response.status(502).json({ error: 'DB_READ_FAILED' });
    const mine = data.filter(row => isOwner(row, user));
    if (mine.length !== data.length) logDenied('not_owner', resourceId, request.method);
    return response.status(200).json(mine.map(toNote));
  }

  if (triesOwnerChange(request.body, user)) {
    logDenied('owner_change', resourceId, request.method);
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
