import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const read = (path) => readFile(new URL(`../public/${path}`, import.meta.url));
const text = async (path) => (await read(path)).toString('utf8');

test('11단계 manifest는 설치에 필요한 항목을 갖고, 설치를 기기 확인이라고 쓰지 않는다', async () => {
  const manifest = JSON.parse(await text('manifest.webmanifest'));
  assert.equal(manifest.name, 'BYTE BACK 내 자료실');
  assert.equal(manifest.short_name, '내 자료실');
  assert.equal(manifest.start_url, '/');
  assert.equal(manifest.scope, '/');
  assert.equal(manifest.display, 'standalone');
  assert.match(manifest.description, /앱 설치는 기기 확인이 아니며, 기기 승인 여부는 서버가 정합니다/u);
  const sizes = manifest.icons.map((icon) => icon.sizes).sort();
  assert.deepEqual(sizes, ['192x192', '512x512']);
  for (const icon of manifest.icons) {
    assert.equal(icon.type, 'image/png');
    const png = await read(icon.src.slice(1));
    assert.equal(png.subarray(1, 4).toString('ascii'), 'PNG');
    const [width] = icon.sizes.split('x').map(Number);
    assert.equal(png.readUInt32BE(16), width);
    assert.equal(png.readUInt32BE(20), width);
  }
});

test('첫 화면은 manifest·설치 상태·기기 승인 상태·오프라인 안내를 보여 주고 설치를 승인으로 다루지 않는다', async () => {
  const html = await text('index.html');
  assert.match(html, /<link rel="manifest" href="\/manifest\.webmanifest">/u);
  assert.match(html, /serviceWorker\.register\('\/sw\.js'\)/u);
  assert.match(html, /앱을 설치해도 기기 확인은 끝나지 않습니다/u);
  assert.match(html, /id="device-state"/u);
  assert.match(html, /id="offline"/u);
  assert.doesNotMatch(html, /설치(?:만으로|하면|되면)[^<.]*(?:승인됨|승인되었|승인 완료|확인 완료)/u);
});

test('서비스 워커는 화면 이동 실패 때 오프라인 안내만 보여 주고 API·자료를 저장하지 않는다', async () => {
  // 설명 주석은 빼고 실제 코드만 봅니다.
  const worker = (await text('sw.js')).replace(/^\s*\/\/.*$/gmu, '');
  assert.match(worker, /if \(event\.request\.mode !== 'navigate'\) return;/u);
  assert.match(worker, /const OFFLINE_URL = '\/offline\.html';/u);
  assert.doesNotMatch(worker, /cache\.put|\/api\//u);
  const offline = await text('offline.html');
  assert.doesNotMatch(offline, /<script|\/api\//u);
  assert.match(offline, /메모를 보여 주지 않습니다/u);
});

test('11단계 화면은 로그인 토큰을 메모리에만 두고, 서버가 승인된 기기로 확인한 뒤에만 자료실을 연다', async () => {
  const html = await text('index.html');
  assert.match(html, /createClient\([^)]*\{\s*auth: \{ persistSession: false \},?\s*\}\)/u);
  // 메모 목록을 부르는 load()는 서버 상태가 sessionVerified일 때 여는 openVault()와 자료실 안의 버튼에서만 불립니다.
  assert.match(html, /if \(status\.sessionVerified === true\) \{ openVault\(status\.expiresAt\); return; \}/u);
  const openCalls = html.match(/openVault\(/gu) ?? [];
  assert.equal(openCalls.length, 2, 'openVault 정의 1곳과 서버 확인 뒤 호출 1곳뿐');
  // 승인 요청은 기기 이름과 패스키 응답만 보내고, 승인 여부를 화면이 서버에 알리지 않습니다.
  assert.match(html, /body: JSON\.stringify\(\{ label, credential: \{/u);
  assert.doesNotMatch(html, /approved:\s*true|status:\s*'approved'/u);
  assert.match(html, /이 화면의 버튼만으로는 승인되지 않습니다/u);
});

test('공개 화면 파일은 브라우저 저장소를 직접 쓰지 않는다', async () => {
  for (const path of ['index.html', 'offline.html', 'sw.js']) {
    // 설명 주석(줄 전체 // 주석과 HTML 주석)은 빼고 실제 코드만 봅니다.
    const code = (await text(path)).replace(/<!--[\s\S]*?-->/gu, '').replace(/^\s*\/\/.*$/gmu, '');
    assert.doesNotMatch(code, /localStorage|sessionStorage|indexedDB|document\.cookie/u, path);
  }
});
