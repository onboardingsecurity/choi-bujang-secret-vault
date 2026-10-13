// 11단계: POST /api/device/verify — 승인된 내 기기가 이번 챌린지에 서명했는지 검증하고, 맞으면 이번 로그인 세션을 확인 상태로 기록합니다.
// 기기 승인 API는 승인 전에 쓰는 곳이라 기기 확인 없이 로그인만 검사하고, 메모 자료는 주지 않습니다.
import { guard } from '../../src/notes-api.mjs';
import { handleDeviceVerify, studentOnly } from '../../src/device-approval.mjs';
import { RESOURCE_IDS } from '../../src/resources.mjs';

export default async function handler(request, response) {
  const ctx = await guard(request, response, ['POST'], RESOURCE_IDS.myDevices, { requireDevice: false });
  if (!ctx || !studentOnly(ctx, request, response)) return;
  return handleDeviceVerify(ctx, request, response);
}
