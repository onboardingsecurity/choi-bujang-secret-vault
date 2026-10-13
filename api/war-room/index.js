// 12단계: GET /api/war-room — 탈환 작전실 요약. 승인된 기기로 확인된 학생 로그인 세션에만 답합니다.
// 심판 토큰은 기기 승인 흐름을 거칠 수 없는 신원이라 이 요약을 볼 수 없습니다(403).
import { guard } from '../../src/notes-api.mjs';
import { studentOnly } from '../../src/device-approval.mjs';
import { handleWarRoom } from '../../src/war-room.mjs';
import { RESOURCE_IDS } from '../../src/resources.mjs';
import config from '../../aleph.config.json' with { type: 'json' };
import policy from '../../backup/policy.v1.json' with { type: 'json' };
import notes from '../../backup/note.v1.json' with { type: 'json' };

export default async function handler(request, response) {
  const ctx = await guard(request, response, ['GET'], RESOURCE_IDS.warRoom);
  if (!ctx || !studentOnly(ctx, request, response)) return;
  return handleWarRoom(ctx, request, response, { policy, notes, config });
}
