// 10단계: POST /api/restore/note — 비공개 가상 메모 사본에서 지정한 한 건만 복원합니다.
// 로그인 검사 뒤 사본의 ID·소유자·내용 해시를 대조하고, 그 한 건의 행만 추가하거나 고칩니다.
import { guard } from '../../src/notes-api.mjs';
import { handleRestore } from '../../src/note-restore.mjs';
import { RESOURCE_IDS } from '../../src/resources.mjs';
import snapshot from '../../backup/note.v1.json' with { type: 'json' };

export default async function handler(request, response) {
  const ctx = await guard(request, response, ['POST'], RESOURCE_IDS.myNotes);
  if (!ctx) return;
  return handleRestore(ctx, request, response, snapshot);
}
