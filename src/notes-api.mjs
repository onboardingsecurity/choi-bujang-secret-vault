// 3단계: 메모 API 공용 도우미. 로그인 검사는 src/verify-login.mjs에 맡기고,
// 브라우저가 보낸 userId·role·owner_id는 읽지 않습니다. 사용자 ID는 검사를 통과한 토큰에서만 나옵니다.
import { createClient } from '@supabase/supabase-js';
import config from '../aleph.config.json' with { type: 'json' };
import { createLoginVerifier } from './verify-login.mjs';
import { RESOURCE_HEADER } from './resources.mjs';

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;

let verifier;
let db;

// 서버 키는 Vercel 환경변수 입력란에만 있고 응답·로그에 나가지 않습니다.
function setup() {
  const { SUPABASE_URL, SUPABASE_SECRET_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) return false;
  if (!verifier) {
    verifier = createLoginVerifier({ config, supabaseSecretKey: SUPABASE_SECRET_KEY });
    db = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return true;
}

// 8단계: 거부 사유를 서버 로그에 한 줄만 남깁니다. 사유 코드·자원 ID·메서드 이름만 쓰고,
// 사용자 ID·메모 ID·토큰·본문은 쓰지 않습니다. 응답 쪽 상태 코드와 본문은 이 줄과 무관하게 그대로입니다.
export function logDenied(reason, resourceId, method) {
  const verb = typeof method === 'string' && /^[A-Z]{1,10}$/u.test(method) ? method : 'OTHER';
  try { console.warn(`notes_denied reason=${reason} resource=${resourceId} method=${verb}`); } catch {}
}

// 허용 메서드가 아니면 405, 설정이 없으면 503, 토큰 검사에 실패하면 자료 없이 401.
// 통과하면 { user, db }를 돌려주고, 아니면 응답을 이미 보냈으므로 null을 돌려줍니다.
export async function guard(request, response, allowed, resourceId) {
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader(RESOURCE_HEADER, resourceId);
  if (!allowed.includes(request.method)) {
    logDenied('method_not_allowed', resourceId, request.method);
    response.setHeader('Allow', allowed.join(', '));
    response.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
    return null;
  }
  let ready = false;
  try { ready = setup(); } catch { ready = false; }
  if (!ready) {
    response.status(503).json({ error: 'AUTH_NOT_CONFIGURED' });
    return null;
  }
  const user = await verifier(request.headers.authorization);
  if (!user) {
    logDenied('login_required', resourceId, request.method);
    response.setHeader('WWW-Authenticate', 'Bearer');
    response.status(401).json({ error: 'LOGIN_REQUIRED' });
    return null;
  }
  return { user, db, resourceId };
}

// 4단계: DB 행의 owner_id가 검증된 사용자 ID와 같을 때만 본인 메모입니다.
// owner_id가 비어 있거나 다르면 본인 것이 아니므로 기본 거부합니다.
export const isOwner = (row, user) =>
  typeof row?.owner_id === 'string' && row.owner_id.toLowerCase() === String(user.userId).toLowerCase();

// 8단계: 검증된 사용자와 DB에 저장된 owner_id를 다시 대조해 거부 사유 코드를 돌려줍니다(통과면 null).
// 화면 메뉴나 요청 본문의 role·owner_id는 읽지 않습니다. 저장된 강사 권한 자료가 없어 강사 예외는 두지 않으며,
// 이 API에서는 소유자만 내 메모에 닿습니다.
export function checkNoteOwner(row, user) {
  if (!row) return 'not_found';
  if (isOwner(row, user)) return null;
  return typeof row.owner_id === 'string' && row.owner_id ? 'not_owner' : 'no_owner';
}

// 본문이 owner_id를 보냈는데 검증된 사용자와 다르면 소유자 변경 시도입니다. 값은 저장에 쓰지 않습니다.
export function triesOwnerChange(input, user) {
  if (!input || typeof input !== 'object' || !('owner_id' in input)) return false;
  return !(typeof input.owner_id === 'string'
    && input.owner_id.toLowerCase() === String(user.userId).toLowerCase());
}

export const toNote = row => ({ id: row.note_id, title: row.title, body: row.content });

// 제목·본문만 받습니다. owner_id 등 다른 칸은 무시합니다.
export function readFields(input) {
  const { title, body } = input && typeof input === 'object' ? input : {};
  if (typeof title !== 'string' || !title.trim() || title.length > 200) return null;
  if (typeof body !== 'string' || !body.trim() || body.length > 5000) return null;
  return { title, body };
}
