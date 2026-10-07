// 화면이 로그인(Auth)에 쓰는 Supabase 주소와 공개용(publishable) 키를 서버 환경변수에서 내려 줍니다.
// HTML 소스에는 키를 적지 않습니다. 서버 전용 키(SUPABASE_SECRET_KEY)는 여기서 읽지도 내보내지도 않습니다.
export default function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store');
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  }
  const { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    return response.status(503).json({ error: 'CONFIG_NOT_SET' });
  }
  return response.status(200).json({ url: SUPABASE_URL, key: SUPABASE_PUBLISHABLE_KEY });
}
