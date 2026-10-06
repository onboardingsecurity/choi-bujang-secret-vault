// 2단계: 메모는 정적 파일이 아니라 서버가 학습용 DB에서 읽어 줍니다.
// 3단계 전까지 이 API는 로그인 없이 열려 있으므로 DB에는 가상 메모만 두세요.
// SUPABASE_URL, SUPABASE_SECRET_KEY는 Vercel 환경변수 입력란에만 넣고 코드에는 적지 않습니다.
import { createClient } from '@supabase/supabase-js';

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store');
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  }
  const { SUPABASE_URL, SUPABASE_SECRET_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
    return response.status(503).json({ error: 'DB_NOT_CONFIGURED' });
  }
  const db = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await db.from('notes').select('title, content').order('id');
  if (error) return response.status(502).json({ error: 'DB_READ_FAILED' });
  return response.status(200).json({ notes: data });
}
