// 11단계: GET /api/device/status — 내 기기의 승인 상태와, 이번 로그인 세션이 승인된 기기로 확인됐는지를 돌려줍니다.
// 기기 승인 API는 승인 전에 쓰는 곳이라 기기 확인 없이 로그인만 검사하고, 메모 자료는 주지 않습니다.
import { guard } from '../../src/notes-api.mjs';
import { handleDeviceStatus, studentOnly } from '../../src/device-approval.mjs';
import { RESOURCE_IDS } from '../../src/resources.mjs';

export default async function handler(request, response) {
  const ctx = await guard(request, response, ['GET'], RESOURCE_IDS.myDevices, { requireDevice: false });
  if (!ctx || !studentOnly(ctx, request, response)) return;
  return handleDeviceStatus(ctx, request, response);
}
