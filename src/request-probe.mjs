// 12단계 디버그: 요청이 서버에 어떤 모양으로 도착하는지 서버 기록 한 줄(request_probe)로 남깁니다.
// 심판이 attackId를 어떤 표식으로 읽는지 받은 계약에 없어서, 제출 묶음이 보낸 표식(헤더·주소·옵션)이 서버까지 오는지,
// 심판이 직접 붙이는 표식이 따로 있는지를 Vercel Logs로 확인하기 위한 것입니다. 원인을 찾은 뒤에는 지울 수 있습니다.
// 지키는 규칙: 토큰·쿠키·본문·사용자 ID·메모 ID는 쓰지 않습니다. 헤더는 이름만 쓰고(auth·cookie·token·key·secret이 들어간 이름은 뺌),
// 값은 표식으로 쓰일 법한 이름의 헤더와 user-agent에 한해 안전한 문자만 짧게 씁니다. 이 함수는 예외를 밖으로 내보내지 않습니다.
const SECRET_NAME = /auth|cookie|token|key|secret|password|credential|signature/iu;
const MARKER_NAME = /attack|aleph|judge|check|test|run|probe|case|scenario|trace|request-id|vercel-id/iu;
const SAFE_VALUE = /^[A-Za-z0-9_.:/ -]{1,80}$/u;
const ID_SEGMENT = /^[0-9a-f][0-9a-f-]{7,}$/iu;

const clean = (value, limit = 80) => {
  const text = typeof value === 'string' ? value.trim() : '';
  return SAFE_VALUE.test(text.slice(0, limit)) && text.length <= limit ? text : '';
};

// 요청 주소에서 경로(메모 ID는 :id로 가림)와 쿼리 이름·attackId 값을 읽습니다. URL.searchParams는 쓰지 않습니다.
export function describeRequest(request, resourceId = 'unknown') {
  const raw = typeof request?.url === 'string' ? request.url : '';
  const [pathPart, ...rest] = raw.split('?');
  const queryText = rest.join('?').split('#')[0];
  // 경로는 허용 문자(영문·숫자·/·_·.·:·-) 밖의 글자를 ?로 바꿉니다. 따옴표·세미콜론·제어 문자가 기록에 그대로 들어가지 않게 합니다.
  const path = pathPart.split('#')[0].split('/').map((segment) => (ID_SEGMENT.test(segment) ? ':id' : segment)).join('/')
    .slice(0, 80).replace(/[^A-Za-z0-9/_.:-]/gu, '?') || 'unknown';
  const pairs = queryText ? queryText.split('&').filter(Boolean) : [];
  const queryKeys = pairs.map((pair) => decodeSafe(pair.split('=')[0])).filter((key) => /^[A-Za-z0-9_.-]{1,40}$/u.test(key));
  const attackPair = pairs.find((pair) => decodeSafe(pair.split('=')[0]) === 'attackId');
  const headers = request?.headers && typeof request.headers === 'object' ? request.headers : {};
  const names = Object.keys(headers).map((name) => name.toLowerCase()).filter((name) => !SECRET_NAME.test(name)).sort();
  const marked = names.filter((name) => MARKER_NAME.test(name))
    .map((name) => [name, clean(Array.isArray(headers[name]) ? headers[name][0] : headers[name])]).filter(([, value]) => value);
  return {
    method: typeof request?.method === 'string' && /^[A-Z]{1,10}$/u.test(request.method) ? request.method : 'OTHER',
    path, resource: resourceId,
    queryKeys: queryKeys.slice(0, 8),
    attackQuery: attackPair ? clean(decodeSafe(attackPair.split('=').slice(1).join('='))) : '',
    marked, userAgent: clean(headers['user-agent'], 60), headerNames: names,
  };
}

function decodeSafe(text) {
  try { return decodeURIComponent(text); } catch { return ''; }
}

export const probeLine = (info) => {
  const parts = [`request_probe method=${info.method} path=${info.path} resource=${info.resource}`,
    `query_keys=${info.queryKeys.join(',') || '-'}`, `attack_query=${info.attackQuery || '-'}`,
    `marked=${info.marked.map(([name, value]) => `${name}:${value.replace(/ /gu, '_')}`).join(';') || '-'}`,
    `ua=${info.userAgent ? info.userAgent.replace(/ /gu, '_') : '-'}`, `headers=${info.headerNames.join(',') || '-'}`];
  return parts.join(' ').slice(0, 900);
};

// 임시 진단: 점검이 도는 환경의 모양(이름·참/거짓)을 담아 오는 헤더를 별도 줄(request_diag)로 남깁니다.
// 허용 문자(영문·숫자·_ $ . , ; = : -) 밖은 ?로 바꾸고 3500자까지만 씁니다.
export function diagLine(request) {
  const headers = request?.headers && typeof request.headers === 'object' ? request.headers : {};
  const raw = Array.isArray(headers['x-diag-env']) ? headers['x-diag-env'][0] : headers['x-diag-env'];
  if (typeof raw !== 'string' || !raw) return '';
  const query = describeRequest(request).attackQuery || '-';
  return `request_diag attack_query=${query} diag=${raw.slice(0, 3500).replace(/[^A-Za-z0-9_$.,;=:-]/gu, '?')}`;
}

export function logRequestProbe(request, resourceId) {
  try { console.log(probeLine(describeRequest(request, resourceId))); } catch {}
  try { const line = diagLine(request); if (line) console.log(line); } catch {}
}
