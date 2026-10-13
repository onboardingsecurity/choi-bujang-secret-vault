// 11단계: 설치형 웹앱의 서비스 워커입니다. 오프라인 안내 페이지 한 장만 저장합니다.
// 메모, 로그인 토큰, 기기 승인 결과, /api/ 응답은 저장하지 않고 가로채지도 않습니다(화면 이동 요청만 다룸).
const CACHE = 'byteback-offline-v1';
const OFFLINE_URL = '/offline.html';

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE)
    .then((cache) => cache.add(new Request(OFFLINE_URL, { cache: 'reload' })))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
    .then(() => self.clients.claim()));
});

// 화면 이동은 언제나 네트워크로 보내고, 연결이 끊겨 실패할 때만 오프라인 안내를 보여 줍니다.
// 응답을 저장해 두었다가 대신 보여 주지 않으므로, 서버 확인 없이 자료실 화면이 열리는 일은 없습니다.
self.addEventListener('fetch', (event) => {
  if (event.request.mode !== 'navigate') return;
  event.respondWith(fetch(event.request)
    .catch(async () => (await caches.match(OFFLINE_URL)) ?? Response.error()));
});
