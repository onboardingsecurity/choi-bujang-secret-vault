// 3단계: 메모 API 공용 도우미. 로그인 검사는 src/verify-login.mjs에 맡기고,
// 브라우저가 보낸 userId·role·owner_id는 읽지 않습니다. 사용자 ID는 검사를 통과한 토큰에서만 나옵니다.
import { createClient } from '@supabase/supabase-js';
import config from '../aleph.config.json' with { type: 'json' };
import { createLoginVerifier } from '../src/verify-login.mjs';

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

// 허용 메서드가 아니면 405, 설정이 없으면 503, 토큰 검사에 실패하면 자료 없이 401.
// 통과하면 { user, db }를 돌려주고, 아니면 응답을 이미 보냈으므로 null을 돌려줍니다.
export async function guard(request, response, allowed) {
  response.setHeader('Cache-Control', 'no-store');
  if (!allowed.includes(request.method)) {
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
    response.setHeader('WWW-Authenticate', 'Bearer');
    response.status(401).json({ error: 'LOGIN_REQUIRED' });
    return null;
  }
  return { user, db };
}

// 4단계: DB 행의 owner_id가 검증된 사용자 ID와 같을 때만 본인 메모입니다.
// owner_id가 비어 있거나 다르면 본인 것이 아니므로 기본 거부합니다.
export const isOwner = (row, user) =>
  typeof row?.owner_id === 'string' && row.owner_id.toLowerCase() === String(user.userId).toLowerCase();

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
