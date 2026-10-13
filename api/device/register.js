// 11단계: POST /api/device/register — 이 기기의 패스키 공개키를 검증해 승인 대기(pending)로만 저장합니다.
// 승인(approved)은 이 API가 아니라 학생이 Supabase SQL Editor에서만 바꿉니다. 메모 자료는 주지 않습니다.
import { guard } from '../../src/notes-api.mjs';
import { handleDeviceRegister, studentOnly } from '../../src/device-approval.mjs';
import { RESOURCE_IDS } from '../../src/resources.mjs';

export default async function handler(request, response) {
  const ctx = await guard(request, response, ['POST'], RESOURCE_IDS.myDevices, { requireDevice: false });
  if (!ctx || !studentOnly(ctx, request, response)) return;
  return handleDeviceRegister(ctx, request, response);
}
