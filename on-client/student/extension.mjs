// 이 파일은 학생이 같은 프로젝트에서 이어서 구현합니다.
// 제공 UI를 받은 것만으로 단계 완료를 인정하지 않습니다.
const MODE_TEXT = {
  connected: '연결됨',
  demo: '예제 자료 · 실제 연결 아님',
  disconnected: '연결 없음',
  unknown: '확인 불가',
};

const DEVICE_TEXT = {
  compliant: '보안 기준 충족',
  noncompliant: '보안 기준 미충족',
  unknown: '확인 불가',
};

const SESSION_TEXT = {
  active: '활성',
  expired: '만료',
  revoked: '철회됨',
  unknown: '확인 불가',
};

// 정상으로 읽히면 안 되는 상태(미충족·만료·철회·확인 불가)는 글자로 "주의"를 붙인다.
const SAFE_VALUES = new Set(['compliant', 'active']);

function node(tag, text, className) {
  const element = document.createElement(tag);
  if (text !== undefined) element.textContent = text;
  if (className) element.className = className;
  return element;
}

function modeText(mode, status) {
  if (Object.hasOwn(MODE_TEXT, mode)) return MODE_TEXT[mode];
  return status === 'loading' ? '응답 전' : '확인 불가';
}

function stateText(table, value) {
  const label = typeof value === 'string' && Object.hasOwn(table, value) ? table[value] : '확인 불가';
  const raw = typeof value === 'string' && value ? value : '값 없음';
  const text = `${label}(${raw})`;
  return SAFE_VALUES.has(value) ? text : `주의: ${text}`;
}

function textOf(value) {
  return typeof value === 'string' && value ? value : '확인 불가';
}

function row(list, term, description, warn) {
  list.append(node('dt', term), node('dd', description, warn ? 'state-error' : undefined));
}

function resourceSection(title, resource, fillOk) {
  const section = node('section');
  section.append(node('h3', title));
  const status = resource && resource.status;
  const mode = resource ? resource.mode : undefined;
  section.append(node('p', `연결 방식: ${modeText(mode, status)}`, 'student-mode'));
  if (status === 'loading') {
    section.append(node('p', '불러오는 중…', 'state state-loading'));
  } else if (status === 'error') {
    const message = resource.error && typeof resource.error.message === 'string' && resource.error.message
      ? resource.error.message
      : '서버가 오류 내용을 알려 주지 않았습니다.';
    section.append(node('p', `연결 실패: ${message} (현재 값은 확인 불가)`, 'state state-error'));
  } else if (status === 'ok') {
    fillOk(section, resource.data);
  } else {
    section.append(node('p', '확인 불가: 서버 응답 상태를 알 수 없습니다.', 'state state-empty'));
  }
  return section;
}

function listRows(section, data, emptyText, fillRow) {
  if (!Array.isArray(data)) {
    section.append(node('p', '확인 불가: 응답 형식이 맞지 않습니다.', 'state state-empty'));
  } else if (data.length === 0) {
    section.append(node('p', emptyText, 'state state-empty'));
  } else {
    const list = node('ul');
    for (const item of data) list.append(fillRow(item || {}));
    section.append(list);
  }
}

function identity({ me, devices, sessions } = {}) {
  const root = node('div', undefined, 'student-identity');

  root.append(resourceSection('로그인 사용자·현재 기기·세션', me, (section, data) => {
    const user = (data && data.user) || {};
    const device = (data && data.device) || {};
    const session = (data && data.session) || {};
    const list = node('dl', undefined, 'identity');
    row(list, '사용자', `${textOf(user.label)} (id: ${textOf(user.id)})`);
    row(list, '현재 기기', `${textOf(device.label)} (id: ${textOf(device.id)})`);
    row(list, '기기 상태', stateText(DEVICE_TEXT, device.status), device.status !== 'compliant');
    row(list, '세션', `id: ${textOf(session.id)}`);
    row(list, '세션 상태', stateText(SESSION_TEXT, session.status), session.status !== 'active');
    section.append(list);
  }));

  root.append(resourceSection('기기 목록', devices, (section, data) => {
    listRows(section, data, '등록된 기기가 없습니다.', (device) => {
      const item = node('li', `${textOf(device.label)} (id: ${textOf(device.id)}) · ${stateText(DEVICE_TEXT, device.status)}`);
      if (device.status !== 'compliant') item.className = 'state-error';
      return item;
    });
  }));

  root.append(resourceSection('세션 목록', sessions, (section, data) => {
    listRows(section, data, '확인된 세션이 없습니다.', (session) => {
      const item = node('li', `세션 id: ${textOf(session.id)} · ${stateText(SESSION_TEXT, session.status)}`);
      if (session.status !== 'active') item.className = 'state-error';
      return item;
    });
  }));

  return root;
}

const DECISION_TEXT = {
  allow: '접근 허용',
  deny: '접근 거부',
  challenge: '추가 확인 필요',
  unknown: '판정 확인 불가',
};

const DECISION_NOTE = {
  allow: '정책상 접근 허용입니다. 실제 앱 접속 성공을 보장하지 않습니다.',
  deny: '정책상 접근 거부입니다.',
  challenge: '서버가 추가 확인을 요구했습니다. 이 앱은 확인 절차를 대신 수행하지 않습니다.',
  unknown: '서버가 판정을 내리지 못했습니다. 허용되지 않음으로 취급하며, 허용으로 읽지 마세요.',
};

const DECISION_STYLE = {
  allow: 'state state-ok',
  deny: 'state state-error',
  challenge: 'state state-empty',
  unknown: 'state state-empty',
};

function decision(input) {
  const { status, mode, data, error, appId } = input || {};
  const root = node('div', undefined, 'student-decision');
  if (Object.hasOwn(MODE_TEXT, mode)) root.append(node('p', `연결 방식: ${MODE_TEXT[mode]}`, 'student-mode'));
  const target = typeof appId === 'string' && appId ? appId : '선택한 앱';

  if (status === 'idle') {
    root.append(node('p', '앱을 골라 접속을 요청하세요.', 'state state-empty'));
  } else if (status === 'loading') {
    root.append(node('p', `판정 확인 중: ${target}`, 'state state-loading'));
  } else if (status === 'error') {
    const message = error && typeof error.message === 'string' && error.message
      ? error.message
      : '서버가 오류 내용을 알려 주지 않았습니다.';
    root.append(
      node('p', `요청 실패: ${message}`, 'state state-error'),
      node('p', `대상 앱: ${target}. 이것은 접근 거부 판정이 아닙니다. 허용 여부는 확인되지 않았습니다. 필요하면 직접 다시 요청하세요.`),
    );
  } else if (status === 'ok') {
    const known = data && typeof data.decision === 'string' && Object.hasOwn(DECISION_TEXT, data.decision);
    const code = known ? data.decision : 'unknown';
    const list = node('dl', undefined, 'identity');
    const row = (term, value) => list.append(node('dt', term), node('dd', value));
    row('대상 앱', typeof (data && data.appId) === 'string' && data.appId ? data.appId : target);
    row('판정 이유', data && typeof data.reason === 'string' && data.reason ? data.reason : '사유 정보 없음');
    row('판정 시각', data && typeof data.checkedAt === 'string' && data.checkedAt ? data.checkedAt : '시각 정보 없음');
    root.append(
      node('p', `${DECISION_TEXT[code]}(${code})`, DECISION_STYLE[code]),
      node('p', known ? DECISION_NOTE[code] : data ? '서버가 알 수 없는 판정 값을 보냈습니다. 허용으로 읽지 마세요.' : '서버 응답에 판정 정보가 없습니다. 허용으로 읽지 마세요.'),
      list,
    );
  } else {
    root.append(node('p', '확인 불가: 서버 응답 상태를 알 수 없습니다. 허용으로 읽지 마세요.', 'state state-empty'));
  }
  return root;
}

const KIND_TEXT = { access: '접속 기록', xdr: 'XDR 경보' };
const ACCESS_TEXT = { allowed: '접속 허용됨', denied: '접속 거부됨', unknown: '확인 불가' };
const UNVERIFIED_CODES = new Set(['CONTRACT_MISMATCH', 'ENGINE_RESULT_UNVERIFIED']);
let eventsViewCount = 0;

function eventTime(at) {
  const ms = Date.parse(at);
  return Number.isNaN(ms) ? Number.NEGATIVE_INFINITY : ms;
}

function eventTimeText(at) {
  const ms = Date.parse(at);
  if (Number.isNaN(ms)) return '시각 확인 불가';
  const kst = new Date(ms).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', hour12: false });
  return `${kst} (한국 시각) · 원본 ${at}`;
}

function eventKindText(kind) {
  return Object.hasOwn(KIND_TEXT, kind) ? `${KIND_TEXT[kind]}(${kind})` : `확인 불가(${kind})`;
}

function eventAppText(appId) {
  return typeof appId === 'string' && appId ? appId : '앱 확인 불가(appId 없음)';
}

function eventAccessText(value) {
  const known = typeof value === 'string' && Object.hasOwn(ACCESS_TEXT, value);
  const text = `${known ? ACCESS_TEXT[value] : '확인 불가'}(${typeof value === 'string' && value ? value : '값 없음'})`;
  return value === 'allowed' || value === 'denied' ? text : `주의: ${text}`;
}

function listOf(value) {
  return Array.isArray(value) ? value : [];
}

// 제목 아래에 줄 목록을 보여 준다. 줄이 없으면 "없음"이다. extra 는 목록 뒤에 붙일 요소다.
function lineBlock(title, lines, ...extra) {
  const block = node('div');
  block.append(node('h4', title));
  if (lines.length === 0) {
    block.append(node('p', '없음'));
  } else {
    const list = node('ul');
    for (const line of lines) list.append(node('li', line));
    block.append(list);
  }
  block.append(...extra);
  return block;
}

function textRows(title, entries, separator = ': ') {
  return lineBlock(title, listOf(entries).map((entry) => `${textOf(entry && entry.id)}${separator}${textOf(entry && entry.text)}`));
}

function eventDetail(event) {
  const panel = node('div', undefined, 'student-event-detail');
  panel.setAttribute('data-student-event-detail', event.id);
  panel.append(node('h3', `기록 상세: ${event.id}`));
  const info = node('dl', undefined, 'identity');
  row(info, '사건 ID', event.id);
  row(info, '앱', eventAppText(event.appId));
  row(info, '종류', eventKindText(event.kind));
  row(info, '시각', eventTimeText(event.at));
  panel.append(info, textRows('근거', event.evidence), textRows('규칙', event.rules));
  const state = (event && event.state) || {};
  const states = node('dl', undefined, 'identity');
  row(states, '접속 상태', eventAccessText(state.access), state.access !== 'allowed' && state.access !== 'denied');
  row(states, '세션 상태', stateText(SESSION_TEXT, state.session), state.session !== 'active');
  row(states, '기기 상태', stateText(DEVICE_TEXT, state.device), state.device !== 'compliant');
  panel.append(node('h4', '세 가지 상태 (각각 따로 확인)'), states);
  // 연결되지 않은 조치가 넘어온 경우에만 안내한다. 버튼은 비활성이며 어떤 요청도 보내지 않는다.
  const actions = Array.isArray(event.supportedActions)
    ? event.supportedActions.filter((action) => typeof action === 'string' && action)
    : [];
  if (actions.length > 0) {
    const box = node('div', undefined, 'student-unsupported-actions');
    box.append(node('h4', '조치 (아직 지원하지 않음)'));
    for (const action of actions) {
      const button = node('button', `${action} 미지원`);
      button.type = 'button';
      button.disabled = true;
      button.setAttribute('aria-disabled', 'true');
      box.append(button);
    }
    box.append(node('p', '조치 실행 연결은 준비 중입니다. 아직 지원하지 않는 조치이며 이 화면은 어떤 요청도 보내지 않습니다.'));
    panel.append(box);
  }
  return panel;
}

function filterSelect(root, label, options, onChange) {
  eventsViewCount += 1;
  const id = `student-events-filter-${eventsViewCount}`;
  const wrap = node('div', undefined, 'student-filter');
  const labelEl = node('label', label);
  labelEl.htmlFor = id;
  const select = node('select');
  select.id = id;
  for (const [value, text] of options) {
    const option = node('option', text);
    option.value = value;
    select.append(option);
  }
  select.value = 'all';
  select.addEventListener('change', () => onChange(select.value));
  wrap.append(labelEl, select);
  root.append(wrap);
}

function events(input) {
  const { status, mode, data, error } = input || {};
  const root = node('div', undefined, 'student-events');
  if (Object.hasOwn(MODE_TEXT, mode)) root.append(node('p', `연결 방식: ${MODE_TEXT[mode]}`, 'student-mode'));

  if (status === 'loading') {
    root.append(node('p', '기록을 불러오는 중…', 'state state-loading'));
    return root;
  }
  if (status === 'error') {
    const message = error && typeof error.message === 'string' && error.message
      ? error.message
      : '서버가 오류 내용을 알려 주지 않았습니다.';
    root.append(node('p', `기록을 불러오지 못했습니다: ${message}`, 'state state-error'));
    root.append(node('p', UNVERIFIED_CODES.has(error && error.code)
      ? '확인 불가: 응답 형식을 확인하지 못했습니다. 기록이 없다는 뜻이 아니며, 이전에 불러온 목록은 표시하지 않습니다.'
      : '이것은 기록이 없는 상태가 아닙니다. 이전에 불러온 목록은 표시하지 않습니다. 필요하면 직접 다시 불러오세요.'));
    return root;
  }
  if (status !== 'ok' || !Array.isArray(data)) {
    root.append(node('p', '확인 불가: 서버 응답을 확인하지 못했습니다. 기록이 없다는 뜻이 아닙니다.', 'state state-empty'));
    return root;
  }

  root.append(node('p', '본인의 최근 보안 기록만 표시합니다(최대 40건). 전체 직원의 이력이나 실시간 전체 위협 탐지가 아니며, XDR 경보는 서버가 이미 저장한 경보만 나옵니다.', 'student-scope'));
  if (data.length === 0) {
    root.append(node('p', '표시할 기록이 없습니다.', 'state state-empty'));
    return root;
  }

  const sorted = data.filter((event) => event && typeof event === 'object')
    .sort((a, b) => eventTime(b.at) - eventTime(a.at));
  const filters = { kind: 'all', app: 'all', access: 'all' };
  let selectedId = null;

  const bar = node('div', undefined, 'student-filters');
  const count = node('p', undefined, 'student-count');
  count.setAttribute('aria-live', 'polite');
  const list = node('ul', undefined, 'student-event-list');
  const detail = node('div', undefined, 'student-event-detail-slot');

  function redraw() {
    const shown = sorted.filter((event) => (filters.kind === 'all' || event.kind === filters.kind)
      && (filters.app === 'all' || event.appId === filters.app)
      && (filters.access === 'all' || (event.state && event.state.access) === filters.access));
    if (!shown.some((event) => event.id === selectedId)) selectedId = null;
    count.textContent = `표시 ${shown.length}건 / 받은 기록 ${sorted.length}건`;

    const items = shown.map((event) => {
      const item = node('li');
      item.setAttribute('data-student-event-id', event.id);
      item.append(node('p', `${event.id} · ${eventTimeText(event.at)}`));
      item.append(node('p', `종류: ${eventKindText(event.kind)} · 앱: ${eventAppText(event.appId)}`));
      item.append(node('p', textOf(event.summary)));
      const button = node('button', `${event.id} 상세`);
      button.type = 'button';
      button.setAttribute('aria-expanded', String(event.id === selectedId));
      button.addEventListener('click', () => {
        selectedId = selectedId === event.id ? null : event.id;
        redraw();
      });
      item.append(button);
      return item;
    });
    if (shown.length === 0) {
      list.replaceChildren(node('li', '선택한 조건에 맞는 기록이 없습니다. 목록이 비어 있는 것이 아니라 필터 조건에 해당하는 기록이 없는 것입니다.', 'state state-empty'));
    } else {
      list.replaceChildren(...items);
    }
    const selected = shown.find((event) => event.id === selectedId);
    detail.replaceChildren(...(selected ? [eventDetail(selected)] : []));
  }

  const apps = [...new Set(sorted.map((event) => event.appId).filter((appId) => typeof appId === 'string' && appId))].sort();
  filterSelect(bar, '기록 종류', [['all', '전체(all)'], ['access', '접속 기록(access)'], ['xdr', 'XDR 경보(xdr)']], (v) => { filters.kind = v; redraw(); });
  filterSelect(bar, '업무 앱', [['all', '전체(all)'], ...apps.map((appId) => [appId, appId])], (v) => { filters.app = v; redraw(); });
  filterSelect(bar, '접속 상태', [['all', '전체(all)'], ['allowed', '접속 허용됨(allowed)'], ['denied', '접속 거부됨(denied)'], ['unknown', '확인 불가(unknown)']], (v) => { filters.access = v; redraw(); });
  root.append(bar, count, list, detail);
  redraw();
  return root;
}

const RESOURCE_TEXT = {
  me: '로그인 정보',
  apps: '업무 앱',
  events: '보안 기록',
  devices: '기기',
  sessions: '세션',
  access: '접속 판정',
  diagnostics: '도움정보',
  vulnerabilities: '설치 패키지 조회',
};
const RETRY_NOTE = '다시 시도는 위쪽 「다시 불러오기」 버튼을 직접 누르세요. 자동으로 다시 요청하지 않습니다.';
const SECRET_LIKE = /Bearer\s+\S+|sk-[A-Za-z0-9_-]{8,}|(?:api[_-]?key|token|password|secret|authorization)\s*[:=]\s*\S+|BEGIN [A-Z ]*PRIVATE KEY/i;

function isTimeout(error) {
  return Boolean(error && typeof error.code === 'string' && error.code.includes('TIMEOUT'));
}

// 진단 값은 글자만 받고 길이를 제한하며, 키·토큰처럼 보이는 값은 표시·복사하지 않는다.
function safeDiagValue(value) {
  if (typeof value !== 'string' && typeof value !== 'number') return '확인 불가';
  const text = String(value);
  if (!text) return '확인 불가';
  return SECRET_LIKE.test(text) || text.length > 200 ? '표시하지 않음' : text;
}

function diagFields(data) {
  const source = data && typeof data === 'object' ? data : {};
  const engine = source.engine && typeof source.engine === 'object' ? source.engine : {};
  return [
    ['requestId', safeDiagValue(source.requestId)],
    ['component', safeDiagValue(source.component)],
    ['version', safeDiagValue(source.version)],
    ['checkedAt', safeDiagValue(source.checkedAt)],
    ['engine.mode', safeDiagValue(engine.mode)],
    ['engine.code', safeDiagValue(engine.code)],
  ];
}

// objectText는 목적격 조사가 붙은 이름이다(예: "기기 목록을"). 조사를 뗀 이름은 noun으로 쓴다.
function failureBlock(objectText, error) {
  const message = error && typeof error.message === 'string' && error.message
    ? error.message
    : '서버가 오류 내용을 알려 주지 않았습니다.';
  const box = node('div');
  box.append(
    node('p', `${objectText} 불러오지 못했습니다${isTimeout(error) ? '(시간 초과)' : ''}: ${message}`, 'state state-error'),
    node('p', `이것은 비어 있는 상태가 아니라 확인하지 못한 상태입니다. ${RETRY_NOTE}`),
  );
  return box;
}

function statusSection(title, resource, objectText, emptyText, fillList) {
  const section = node('section');
  section.append(node('h3', title));
  const status = resource && resource.status;
  if (status === 'loading') {
    section.append(node('p', `${objectText} 불러오는 중…`, 'state state-loading'));
  } else if (status === 'error') {
    section.append(failureBlock(objectText, resource.error));
  } else if (status === 'ok' && Array.isArray(resource.data)) {
    if (resource.data.length === 0) section.append(node('p', emptyText, 'state state-empty'));
    else fillList(section, resource.data);
  } else {
    section.append(node('p', `확인 불가: ${objectText.slice(0, -1)} 응답을 확인하지 못했습니다. 비어 있다는 뜻이 아닙니다.`, 'state state-empty'));
  }
  return section;
}

function notificationsSection(notifications) {
  const section = node('section');
  section.append(node('h3', '알림'));
  const items = Array.isArray(notifications) ? notifications.filter((item) => item && typeof item === 'object') : [];
  if (items.length === 0) {
    section.append(node('p', '주의할 알림이 없습니다.', 'state state-empty'));
    return section;
  }
  const list = node('ul');
  for (const item of items) {
    const resource = typeof item.resource === 'string' ? item.resource : '';
    const label = Object.hasOwn(RESOURCE_TEXT, resource) ? `${RESOURCE_TEXT[resource]}(${resource})` : `확인 불가(${resource || '자료 없음'})`;
    list.append(node('li', `자료: ${label} · 코드: ${textOf(item.code)} · ${textOf(item.message)}`, 'state-error'));
  }
  section.append(list);
  return section;
}

function diagnosticsSection(diagnostics) {
  const section = node('section');
  section.append(node('h3', '도움정보 (연결 점검)'));
  const status = diagnostics && diagnostics.status;
  const ready = status === 'ok' && diagnostics.data && typeof diagnostics.data === 'object';
  const fields = ready ? diagFields(diagnostics.data) : [];

  if (status === 'loading') {
    section.append(node('p', '도움정보를 불러오는 중…', 'state state-loading'));
  } else if (status === 'error') {
    section.append(failureBlock('도움정보를', diagnostics.error));
  } else if (ready) {
    const list = node('dl', undefined, 'identity');
    for (const [name, value] of fields) row(list, name, value);
    section.append(list);
  } else {
    section.append(node('p', '도움정보를 아직 불러오지 않았습니다. 제공 「도움정보」 카드의 「도움정보 불러오기」를 직접 누르면 여기에 표시됩니다. 이 화면은 자동으로 조회하지 않습니다.', 'state state-empty'));
  }

  const feedback = node('p', undefined, 'student-copy-feedback');
  feedback.setAttribute('role', 'status');
  const button = node('button', '도움정보 복사');
  button.type = 'button';
  button.disabled = !ready;
  button.setAttribute('aria-disabled', String(!ready));
  button.addEventListener('click', async () => {
    const text = fields.map(([name, value]) => `${name}: ${value}`).join('\n');
    try {
      await navigator.clipboard.writeText(text);
      feedback.textContent = '위 6개 값(비밀값 없음)을 클립보드에 복사했습니다. 도움을 요청할 때 붙여 넣어 쓰세요.';
    } catch {
      feedback.textContent = '자동 복사를 사용할 수 없습니다. 위에 표시된 값을 직접 선택해 복사하세요.';
    }
  });
  section.append(
    button,
    node('p', ready
      ? '이 정보는 도움을 요청할 때 쓰도록 복사하는 것입니다. 누를 때만 복사하며, 키·토큰·비밀번호는 포함하지 않습니다.'
      : '도움정보를 불러온 뒤에 복사할 수 있습니다.'),
    feedback,
  );
  return section;
}

function statusView(input) {
  const { devices, sessions, notifications, diagnostics, mode } = input || {};
  const root = node('div', undefined, 'student-status');
  if (Object.hasOwn(MODE_TEXT, mode)) root.append(node('p', `연결 방식: ${MODE_TEXT[mode]}`, 'student-mode'));

  const deviceSection = statusSection('등록 기기', devices, '기기 목록을', '등록된 기기가 없습니다.', (section, data) => {
    const list = node('ul');
    for (const device of data) {
      const item = (device && typeof device === 'object') ? device : {};
      list.append(node('li', `${textOf(item.label)} (id: ${textOf(item.id)}) · ${stateText(DEVICE_TEXT, item.status)}`, item.status === 'compliant' ? undefined : 'state-error'));
    }
    section.append(list);
  });
  deviceSection.append(node('p', '내 이름으로 등록되고 회수되지 않은 기기를 최대 100개까지 표시합니다. 서버가 모르는 값은 확인 불가로 표시합니다.', 'student-scope'));

  const sessionSection = statusSection('세션', sessions, '세션을', '현재 연결이 없습니다.', (section, data) => {
    const list = node('ul');
    for (const session of data) {
      const item = (session && typeof session === 'object') ? session : {};
      list.append(node('li', `세션 id: ${textOf(item.id)} · ${stateText(SESSION_TEXT, item.status)}`, item.status === 'active' ? undefined : 'state-error'));
    }
    section.append(list);
  });
  sessionSection.append(node('p', '지금 검증된 연결 한 개만 표시합니다. 지난 세션 목록이 아닙니다.', 'student-scope'));

  root.append(deviceSection, sessionSection, notificationsSection(notifications), diagnosticsSection(diagnostics));
  return root;
}

// 17단계: 제공 화면이 넘기는 안전한 오류 코드를 원인 묶음으로 나눈다. 목록에 없는 코드는 확인 불가로 읽는다.
const AI_CAUSE = {
  pending: {
    title: '권한 준비 중 또는 확인 불가',
    guide: '학생 잘못이 아닙니다. 담당자에게 계정 연결과 앱 권한 확인을 요청하세요. 이 상태는 연결 성공이 아닙니다.',
  },
  auth: {
    title: '인증 실패 또는 접근 제한',
    guide: '보호 현황의 계정 연결을 다시 확인하고, 계속되면 담당자에게 확인을 요청하세요.',
  },
  limit: {
    title: '반 사용량 또는 이용 한도',
    guide: '담당자에게 사용량과 한도 확인을 요청하세요.',
  },
  hours: {
    title: '이용 시간 아님',
    guide: '지금은 AI 이용 시간이 아닙니다. 이용 시간을 확인하세요.',
  },
  retry: {
    title: '요청 제한 또는 시간 초과',
    guide: '잠시 뒤 「AI 연결 점검」을 직접 다시 누르세요. 자동으로 다시 점검하지 않습니다.',
    explainGuide: '잠시 뒤 보안 기록에서 설명을 직접 다시 요청하세요. 자동으로 다시 요청하지 않습니다.',
  },
  cancelled: {
    title: '취소됨',
    guide: '점검을 취소했습니다. 이전 결과는 현재 결과가 아닙니다. 필요하면 직접 다시 점검하세요.',
    explainGuide: '설명 요청을 취소했습니다. 이전 응답은 현재 결과가 아닙니다. 필요하면 직접 다시 요청하세요.',
  },
  models: {
    title: '쓸 수 있는 모델 없음',
    guide: '담당자에게 모델 허용 설정 확인을 요청하세요.',
  },
  scope: {
    title: '로그인·사건 연결 확인 불가',
    guide: '현재 로그인과 사건·프로젝트의 연결을 확인하지 못했습니다. 성공으로 읽지 마세요. 담당자에게 계정 연결 확인을 요청하세요.',
  },
  invalid: {
    title: 'AI 응답 또는 사건 근거의 형식 확인 불가',
    guide: '설명에 필요한 사건 근거·규칙이나 AI 응답의 형식을 확인하지 못해 설명을 표시하지 않았습니다. 필요하면 보안 기록에서 직접 다시 요청하세요.',
    explainGuide: '설명에 필요한 사건 근거·규칙이나 AI 응답의 형식을 확인하지 못해 설명을 표시하지 않았습니다. 필요하면 보안 기록에서 직접 다시 요청하세요. 실패 이유: 이 기록의 근거가 부족하거나, AI 응답이 이 기록의 근거·규칙과 맞지 않거나, 조치를 이미 실행했다고 답한 설명입니다. 이런 설명은 사용하지 않으며 내용을 지어내지 않습니다.',
  },
  unverified: {
    title: '확인 불가',
    guide: '알 수 없는 오류 코드입니다. 성공으로 읽지 마세요. 담당자에게 확인을 요청하세요.',
  },
};

const AI_CAUSE_BY_CODE = {
  ON_AI_PROVISIONING_PENDING: 'pending',
  AI_REQUEST_UNVERIFIED: 'pending',
  SUBJECT_SCOPE_UNVERIFIED: 'scope',
  ON_AI_INVALID_INPUT: 'invalid',
  ON_AI_INVALID_OUTPUT: 'invalid',
  WB_CLCO_AUTH_REQUIRED: 'auth',
  WB_CLCO_ACCESS_BLOCKED: 'auth',
  ON_AI_AUTHORIZATION_CHANGED: 'auth',
  WB_CLCO_COHORT_BUDGET_EXHAUSTED: 'limit',
  WB_CLCO_LIMIT_REACHED: 'limit',
  WB_CLCO_SESSION_CLOSED: 'hours',
  WB_CLCO_RATE_LIMITED: 'retry',
  WB_CLCO_TIMEOUT: 'retry',
  REQUEST_TIMEOUT: 'retry',
  ENGINE_TIMEOUT: 'retry',
  TIMEOUT: 'retry',
  CANCELLED: 'cancelled',
  WB_CLCO_CANCELLED: 'cancelled',
  REQUEST_CANCELLED: 'cancelled',
  ON_AI_MODEL_LIST_EMPTY: 'models',
  MODEL_NOT_CONFIGURED: 'models',
};

const AI_AUTH_TEXT = {
  test: '시험 연결 점검(test)',
  verified: '앱 권한 확인 후 점검(verified)',
};

// forExplanation 이 true 이면 사건 설명 화면에 맞는 재시도·취소 안내를 쓴다(연결 점검 버튼을 가리키지 않는다).
function aiFailure(error, introText, forExplanation) {
  const code = error && typeof error.code === 'string' ? error.code : '';
  const cause = AI_CAUSE[Object.hasOwn(AI_CAUSE_BY_CODE, code) ? AI_CAUSE_BY_CODE[code] : 'unverified'];
  const box = node('div');
  box.append(
    node('p', `${introText}: ${cause.title}`, 'state state-error'),
    node('p', `오류 코드: ${safeDiagValue(code)} · 메시지: ${safeDiagValue(error && error.message)}`),
    node('p', forExplanation && cause.explainGuide ? cause.explainGuide : cause.guide),
  );
  return box;
}

function aiConnection(input) {
  const { status, mode, data, error, checkedAt } = input || {};
  const root = node('div', undefined, 'student-ai-connection');
  root.setAttribute('data-student-ai-status', typeof status === 'string' ? status : 'unknown');
  if (Object.hasOwn(MODE_TEXT, mode)) root.append(node('p', `연결 방식: ${MODE_TEXT[mode]}`, 'student-mode'));

  if (status === 'idle') {
    root.append(
      node('p', 'AI 연결 점검 전', 'state state-empty'),
      node('p', '아직 점검하지 않았습니다. 이전 점검 결과는 표시하지 않습니다. 「AI 연결 점검」을 직접 눌러야 점검이 시작되며, 자동으로 다시 점검하지 않습니다.'),
    );
  } else if (status === 'loading') {
    root.append(
      node('p', 'AI 연결 점검 중', 'state state-loading'),
      node('p', '응답을 기다리는 중입니다. 취소하면 늦게 도착한 응답은 현재 결과로 표시하지 않습니다.'),
    );
  } else if (status === 'error') {
    root.append(
      aiFailure(error, 'AI 연결 점검 실패'),
      node('p', '이 결과는 사건 설명 실행과 무관합니다. 기존 접속 기록은 그대로입니다. 다시 점검은 「AI 연결 점검」을 직접 눌러야 하며 자동으로 다시 점검하지 않습니다.'),
    );
  } else if (status === 'ok' && data && Object.hasOwn(AI_AUTH_TEXT, data.audienceAuthorization) && Number.isInteger(data.modelCount)) {
    const verified = data.audienceAuthorization === 'verified';
    const list = node('dl', undefined, 'identity');
    row(list, '점검 종류', AI_AUTH_TEXT[data.audienceAuthorization]);
    row(list, '응답 모델 수(modelCount)', String(data.modelCount));
    row(list, '점검 시각(checkedAt)', textOf(checkedAt));
    root.append(
      node('p', 'AI 연결 점검 완료', 'state state-ok'),
      list,
      node('p', verified
        ? '확인 범위: 이 시각 기준의 앱 권한 확인과 모델 목록 응답입니다.'
        : '확인 범위: 시험 연결의 모델 목록 응답입니다. 앱 권한이 확인된 것은 아닙니다.'),
      node('p', '사건 설명은 아직 실행하지 않았습니다. 모델 목록 응답만으로는 사건 설명이 이루어진 것이 아닙니다. 사건 설명은 보안 기록에서 사건을 골라 따로 요청하고 확인하세요.'),
    );
  } else {
    root.append(
      node('p', '확인 불가: AI 연결 점검 응답을 확인하지 못했습니다. 성공으로 읽지 마세요.', 'state state-empty'),
      node('p', '「AI 연결 점검」을 직접 눌러 다시 점검하세요.'),
    );
  }
  return root;
}

// 18단계: 선택한 사건의 AI 설명을 그 사건의 근거·규칙·현재 상태와 이어서 보여 준다. AI 설명은 참고용 해석이다.
const EXPLAIN_STATE_ROWS = [
  ['access', '접속', ACCESS_TEXT],
  ['session', '세션', SESSION_TEXT],
  ['device', '기기', DEVICE_TEXT],
];

const evidenceTextById = (event) => new Map(listOf(event.evidence).map((entry) => [entry && entry.id, entry && entry.text]));
const distinct = (ids) => new Set(ids).size === ids.length;

// 제공 코드가 이미 검사한 설명도 이 기록의 근거·지원 조치와 한 번 더 대조한다. 맞지 않으면 사유를 돌려주고, 없는 근거를 만들어 맞추지 않는다.
function explanationProblem(event, data) {
  if (!data || typeof data !== 'object' || typeof data.summary !== 'string' || !data.summary
      || !Array.isArray(data.evidenceIds) || !Array.isArray(data.proposals)) {
    return '응답 형식이 맞지 않습니다.';
  }
  if (data.executed !== false) {
    return 'AI가 조치를 이미 실행했다고 답했거나 실행 여부를 확인할 수 없는 설명입니다. 이런 설명은 사용하지 않습니다.';
  }
  if (data.requiresHumanConfirmation !== true) {
    return '사람 확인이 필요하다는 표시가 없는 설명입니다. 이런 설명은 사용하지 않습니다.';
  }
  const evidence = evidenceTextById(event);
  if (evidence.size === 0 || data.evidenceIds.length === 0) {
    return '근거 부족: 이 기록에 인용할 근거가 없거나 AI가 근거 ID를 인용하지 않았습니다.';
  }
  const missing = data.evidenceIds.filter((id) => typeof id !== 'string' || !evidence.has(id));
  if (missing.length > 0) {
    return `근거가 맞지 않습니다: 이 기록(${event.id})의 근거 목록에 없는 ID ${missing.map(safeDiagValue).join(', ')}를 인용했습니다.`;
  }
  if (!distinct(data.evidenceIds)) return '근거가 맞지 않습니다: 인용한 근거 ID가 중복되었습니다.';
  const supported = listOf(event.supportedActions);
  const proposalsOk = data.proposals.every((proposal) => proposal && typeof proposal === 'object'
    && typeof proposal.action === 'string' && supported.includes(proposal.action)
    && Array.isArray(proposal.evidenceIds) && proposal.evidenceIds.length > 0 && distinct(proposal.evidenceIds)
    && proposal.evidenceIds.every((id) => evidence.has(id))
    && typeof proposal.reason === 'string' && proposal.reason);
  if (!proposalsOk) return '제안한 조치가 이 기록의 지원 조치 또는 근거와 맞지 않습니다.';
  return '';
}

function proposalList(proposals) {
  const list = node('ul');
  for (const proposal of proposals) {
    const item = node('li');
    item.append(
      node('p', `조치: ${proposal.action}`),
      node('p', `이유: ${proposal.reason}`),
      node('p', `인용한 근거 ID: ${proposal.evidenceIds.join(', ')}`),
      node('p', '사람 확인이 필요하며 실행되지 않았습니다.'),
    );
    list.append(item);
  }
  return list;
}

// 성공한 설명을 root 에 채운다. data-student-explanation-event 는 여기에서만 붙인다.
function fillExplanation(root, event, data, checkedAt) {
  root.setAttribute('data-student-explanation-event', event.id);

  const evidence = evidenceTextById(event);
  const state = event.state || {};
  const unconfirmed = EXPLAIN_STATE_ROWS
    .filter(([key, , table]) => state[key] === 'unknown' || !Object.hasOwn(table, state[key]))
    .map(([key, label]) => `${label}: 확인 불가(${typeof state[key] === 'string' && state[key] ? state[key] : '값 없음'})`);

  const supported = listOf(event.supportedActions);
  const proposalBody = data.proposals.length > 0
    ? proposalList(data.proposals)
    : node('p', supported.length === 0
      ? '연동 시스템이 지원하는 조치가 없어 제안이 없습니다(정상).'
      : 'AI가 제안한 조치가 없습니다. 이 기록에서 지원하는 조치는 있으나 AI가 제안하지 않았습니다.');
  const proposals = node('div');
  proposals.append(
    node('h4', 'AI 제안'),
    proposalBody,
    node('p', '이 화면은 조치를 실행하지 않습니다. 설명과 제안만으로 보안 조치가 실행되지 않습니다.'),
  );

  const idList = node('dl', undefined, 'identity');
  row(idList, '사건 ID', event.id);
  row(idList, '확인 시각(checkedAt)', textOf(checkedAt));

  root.append(
    node('p', 'AI 설명 수신(참고용)', 'state state-ok'),
    node('h3', 'AI 설명(참고용)'),
    idList,
    node('p', data.summary),
    node('p', '이 요약은 AI의 해석입니다. 사실 판단은 아래 근거 글과 연동 시스템이 알려 준 현재 상태를 기준으로 하세요.'),
    textRows('인용한 근거 (근거 ID — 근거 글)', data.evidenceIds.map((id) => ({ id, text: evidence.get(id) })), ' — '),
    textRows('규칙 (규칙 ID — 규칙 글)', event.rules, ' — '),
    lineBlock('확인할 수 없는 현재 상태', unconfirmed,
      ...(unconfirmed.length > 0 ? [node('p', '확인 불가는 정상이나 안전이 아닙니다. 확인되지 않은 상태로 읽으세요.')] : [])),
    proposals,
  );
}

// 성공 표식은 fillExplanation 에서만 붙는다. 아래 화면에는 붙이지 않는다.
function explanationView(input) {
  const { event, explanation, checkedAt } = input || {};
  const status = explanation && explanation.status;
  const root = node('div', undefined, 'student-explanation');
  if (explanation && Object.hasOwn(MODE_TEXT, explanation.mode)) {
    root.append(node('p', `연결 방식: ${MODE_TEXT[explanation.mode]}`, 'student-mode'));
  }

  if (status === 'error') {
    root.append(
      aiFailure(explanation.error, 'AI 설명 실패', true),
      node('p', '기록은 그대로입니다. 설명이 실패해도 접속 기록과 업무 앱 판정은 바뀌지 않으며, 이 실패는 과제 실패가 아닙니다.'),
    );
  } else if (status === 'loading') {
    root.append(node('p', 'AI 설명 요청 중', 'state state-loading'));
  } else if (!event || typeof event.id !== 'string' || !event.id) {
    root.append(node('p', '보안 기록에서 기록을 먼저 고르세요', 'state state-empty'));
  } else if (status === 'idle') {
    root.append(node('p', `AI 설명 전: 선택한 기록(${event.id})의 설명을 직접 요청하세요. AI 연결 점검은 사건 설명이 아닙니다.`, 'state state-empty'));
  } else if (status === 'ok') {
    const problem = explanationProblem(event, explanation.data);
    if (problem) {
      root.append(
        node('p', `AI 설명을 사용할 수 없음: ${problem}`, 'state state-error'),
        node('p', '내용을 지어내거나 다른 근거로 대신하지 않았습니다. 기록은 그대로입니다.'),
      );
    } else {
      fillExplanation(root, event, explanation.data, checkedAt);
    }
  } else {
    root.append(
      node('p', '확인 불가: AI 설명 응답을 확인하지 못했습니다. 설명이 수신된 것으로 읽지 마세요.', 'state state-empty'),
      node('p', '기록은 그대로입니다.'),
    );
  }
  return root;
}

// 19단계: 조치 제안·사람 확인·서버 접수(ACK)·실제 효과 확인을 구분해 보여 준다. 이 칸은 표시만 하며 버튼·요청·확인 번호를 만들지 않는다.
const RESEND_BUTTON = '「연동 시스템 결과만 재조회」(화면 표기: 「원천 결과만 재조회」)';

const ACTION_STATUS = {
  idle: { label: '아직 미실행(idle)', style: 'state state-empty' },
  loading: { label: '조치 준비 또는 결과 조회 중(loading)', style: 'state state-loading', note: '결과가 아직 확인되지 않았습니다. 실행 여부와 효과는 알 수 없습니다.' },
  prepared: { label: '준비됨·미실행(prepared)', style: 'state state-empty', note: '조치는 아직 서버에 전달되지 않았습니다. 사람이 아래 대상과 조치를 확인하고 제공 화면의 「대상과 조치를 확인했으며 집행합니다」를 직접 눌러야 전달됩니다.' },
  executing: { label: '서버에 전달 중(executing)', style: 'state state-loading', note: '결과가 아직 없습니다. 전달 중인 요청의 효과는 확인되지 않았습니다.' },
  pending: { label: '서버 접수·처리 중(pending)', style: 'state state-loading', note: '서버가 요청을 받았다는 응답(ACK)은 효과 확인이 아닙니다. 효과는 아직 확인되지 않았습니다.' },
  succeeded: { label: '효과 확인(succeeded)', style: 'state state-ok' },
  denied: { label: '거절(denied)', style: 'state state-error', note: '연동 시스템이 조치를 거절했습니다.' },
  failed: { label: '실패(failed)', style: 'state state-error', note: '연동 시스템에서 조치가 실패했습니다.' },
  unknown: { label: '결과 불명(unknown)', style: 'state state-empty', note: `효과가 없다고도, 성공했다고도 판단하지 마세요. 제공 화면의 ${RESEND_BUTTON}를 직접 눌러 결과를 다시 조회하세요. 자동으로 다시 조회하지 않습니다.` },
  expired: { label: '확인 기한 지남(expired)', style: 'state state-error', note: '이번 준비로는 집행할 수 없습니다. 조치를 다시 준비하세요.' },
  error: { label: '요청 처리 안 됨(error)', style: 'state state-error', note: '요청이 처리되지 않았습니다. 이것은 조치 효과가 없다는 확인이 아닙니다.' },
};

const stringOrNull = (value) => (typeof value === 'string' && value ? value : null);

// 받은 영수증이 현재 사건·조치와 다른 것이면 사유를 돌려준다. 값이 없는 항목은 비교하지 않는다.
function actionBindingProblem(event, actionId, receipt) {
  if (!receipt || typeof receipt !== 'object') return '';
  const eventId = stringOrNull(event && event.id);
  if (eventId && stringOrNull(receipt.eventId) && receipt.eventId !== eventId) {
    return `영수증의 사건 ID(${safeDiagValue(receipt.eventId)})가 현재 사건(${eventId})과 다릅니다.`;
  }
  if (stringOrNull(actionId) && stringOrNull(receipt.actionId) && receipt.actionId !== actionId) {
    return `영수증의 조치(${safeDiagValue(receipt.actionId)})가 현재 조치(${actionId})와 다릅니다.`;
  }
  return '';
}

function actionIdentityRows(event, actionId, target, receipt) {
  const list = node('dl', undefined, 'identity');
  const present = (term, value) => {
    const text = stringOrNull(value) || (Number.isInteger(value) ? String(value) : null);
    if (text) row(list, term, safeDiagValue(text));
  };
  const evidenceIds = listOf(event && event.evidence).map((entry) => entry && entry.id).filter((id) => stringOrNull(id));
  present('사건 ID(event.id)', event && event.id);
  if (evidenceIds.length > 0) row(list, '근거 ID(evidence)', evidenceIds.map(safeDiagValue).join(', '));
  present('조치(actionId)', actionId);
  present('실제 대상(target.id)', target && target.id);
  present('대상 세대(target.generation)', target && target.generation);
  present('요청 ID(requestId)', receipt && receipt.requestId);
  present('영수증 ID(receiptId)', receipt && receipt.receiptId);
  present('버전(version)', receipt && receipt.version);
  return list;
}

function actionView(input) {
  const { status, event, actionId, target, receipt, observation, message, confirmationExpiresAt, error } = input || {};
  const root = node('div', undefined, 'student-action');
  const known = typeof status === 'string' && Object.hasOwn(ACTION_STATUS, status);
  const mismatch = actionBindingProblem(event, actionId, receipt);
  const effectConfirmed = status === 'succeeded' && !mismatch && Boolean(observation) && observation.effectApplied === true;

  // 효과 확인이 아닌 succeeded, 알 수 없는 status, 현재 사건과 다른 영수증은 모두 결과 불명으로 처리한다.
  let shown = known ? status : 'unknown';
  if (status === 'succeeded' && !effectConfirmed) shown = 'unknown';
  const view = ACTION_STATUS[shown];
  root.setAttribute('data-student-action-status', shown);

  root.append(node('p', view.label, view.style));
  if (!known) {
    root.append(node('p', `서버가 알 수 없는 상태 값(${safeDiagValue(status)})을 보냈습니다. 성공으로 읽지 마세요.`, 'state state-empty'));
  } else if (status === 'succeeded' && !effectConfirmed) {
    root.append(node('p', mismatch
      ? `succeeded 응답이 현재 요청과 맞지 않아 효과 확인으로 표시하지 않습니다. ${mismatch}`
      : 'succeeded 응답이지만 observation.effectApplied가 true가 아니어서 효과 확인으로 표시하지 않습니다.', 'state state-empty'));
  } else if (mismatch) {
    root.append(node('p', `받은 영수증이 현재 요청과 맞지 않습니다. ${mismatch}`, 'state state-error'));
  }
  if (view.note) root.append(node('p', view.note));

  if (shown === 'idle') {
    root.append(
      node('p', stringOrNull(message) || '조치 제안은 아직 실행되지 않았습니다.'),
      node('p', '이 칸에는 조치 준비·집행 버튼이 없습니다. 조치 준비·집행·재조회·취소는 제공 화면의 버튼으로만 합니다. 연동 시스템이 지원하는 조치가 없으면 「조치 준비」 버튼이 나오지 않으며, 지금 기록에서는 정상입니다.'),
    );
    return root;
  }

  if (effectConfirmed) {
    const list = node('dl', undefined, 'identity');
    row(list, '관측 시각(observedAt)', textOf(observation.observedAt));
    row(list, '실제 효과', 'effectApplied: true');
    row(list, '영수증 ID(receiptId)', textOf(receipt && receipt.receiptId));
    root.append(list);
  }
  if (shown === 'denied' || shown === 'failed') {
    const text = stringOrNull(message) || stringOrNull(error && error.message);
    root.append(node('p', text ? `메시지: ${safeDiagValue(text)}` : '메시지: 서버가 사유를 알려 주지 않았습니다.'));
  }
  if (shown === 'prepared') {
    root.append(node('p', `확인 기한(confirmationExpiresAt): ${textOf(confirmationExpiresAt)}`));
  }
  if (error && (shown === 'error' || shown === 'expired' || shown === 'unknown')) {
    root.append(node('p', `오류 코드: ${safeDiagValue(error.code)} · 메시지: ${safeDiagValue(error.message)}`));
  }

  root.append(actionIdentityRows(event, actionId, target, receipt));
  root.append(node('p', '이 칸은 상태만 표시합니다. 「조치 화면 취소」는 화면의 요청을 닫을 뿐 이미 서버에 전달된 조치의 효과를 되돌리지 않습니다.', 'student-scope'));

  // 현재 사건·요청에 묶인 표시일 때만 표식을 붙인다.
  if (known && !mismatch && stringOrNull(event && event.id)) {
    root.setAttribute('data-student-action-event', event.id);
    if (stringOrNull(receipt && receipt.requestId)) root.setAttribute('data-student-action-request', receipt.requestId);
  }
  return root;
}

// 20단계: 설치 패키지의 정확한 버전과 OSV 조회 결과를 보여 준다. 미조회·조회 실패는 "취약점 없음"이 아니다.
// 이 함수는 받은 값으로 화면을 새로 만들기만 하므로 오류·조회 중일 때 이전 표가 남지 않는다.
const SCAN_TEXT = {
  complete: { label: '모두 조회', note: '승인된 공개 패키지를 모두 조회했습니다. 앱 전체가 안전하다는 뜻은 아닙니다.' },
  partial: { label: '일부 조회 실패', note: '일부 패키지는 조회를 끝까지 확인하지 못했습니다. 아래 패키지별 조회 상태를 확인하세요.' },
  not_checked: { label: '아직 조회 안 함', note: '승인된 공개 조회 대상이 없어 조회하지 않았습니다. 취약점이 없다는 뜻이 아닙니다.' },
  not_configured: { label: '조회 준비 미완료', note: '조회 대상 프로젝트 설정이 없어 조회하지 않았습니다. 취약점이 없다는 뜻이 아닙니다.' },
  unverifiable: { label: 'lock 파일 확인 불가', note: '설치 목록(package-lock.json)을 확인하지 못해 조회하지 않았습니다. 취약점이 없다는 뜻이 아닙니다.' },
};

const PACKAGE_TEXT = {
  known_vulnerabilities: '알려진 항목 있음',
  none_found: '알려진 항목 없음(조회 시점·OSV 조회 범위 기준, 안전 보장 아님)',
  unverifiable: '조회 확인 불가(취약점 없음이 아님)',
};

const EXACT_VERSION = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;

const hasValue = (value) => (typeof value === 'string' && value !== '') || Number.isFinite(value);

function packageStatusText(pkg, findings) {
  if (pkg.status === 'unverifiable' && findings.length > 0) return '일부 확인 · 전체 조회 확인 불가(unverifiable)';
  const raw = typeof pkg.status === 'string' && pkg.status ? pkg.status : '값 없음';
  const label = Object.hasOwn(PACKAGE_TEXT, pkg.status) ? PACKAGE_TEXT[pkg.status] : '조회 확인 불가(상태값을 알 수 없음, 취약점 없음이 아님)';
  return `${label}(${raw})`;
}

function findingRows(pkg, findings) {
  const wrap = node('div');
  if (findings.length === 0) {
    wrap.append(node('p', pkg.status === 'known_vulnerabilities' ? '받은 ID 없음(확인 불가)' : '표시할 취약점 ID 없음'));
    return wrap;
  }
  const list = node('ul');
  for (const finding of findings) {
    const item = finding && typeof finding === 'object' ? finding : {};
    list.append(node('li', `ID: ${textOf(item.id)} · 수정 시각(modified): ${textOf(item.modified)}`));
  }
  wrap.append(list);
  return wrap;
}

function packageItem(value) {
  const pkg = value && typeof value === 'object' ? value : {};
  const findings = Array.isArray(pkg.vulnerabilities) ? pkg.vulnerabilities : [];
  const item = node('li', undefined, 'student-package');
  // 설치 버전은 lock 파일의 정확한 버전(1.2.3)만 쓴다. ^1.2.0 같은 범위나 태그는 설치 버전으로 보여 주지 않는다.
  const version = EXACT_VERSION.test(textOf(pkg.version)) ? pkg.version : '확인 불가(정확한 설치 버전이 아님)';
  item.setAttribute('data-student-package-name', textOf(pkg.name));
  item.setAttribute('data-student-package-version', version);
  const warn = pkg.status !== 'none_found';
  const list = node('dl', undefined, 'identity');
  row(list, '패키지(name)', textOf(pkg.name));
  row(list, '설치 버전(version)', version, version !== pkg.version);
  row(list, '조회 상태(status)', packageStatusText(pkg, findings), warn);
  row(list, '알려진 항목', '', false);
  list.lastChild.append(findingRows(pkg, findings));
  row(list, '출처(source)', textOf(pkg.source));
  row(list, '패키지 조회 시각(checkedAt)', textOf(pkg.checkedAt));
  item.append(list);
  return item;
}

function vulnerabilities(input) {
  const { status, mode, data, error } = input || {};
  const root = node('div', undefined, 'student-vulnerabilities');
  root.setAttribute('data-student-vulnerabilities-status', typeof status === 'string' ? status : 'unknown');
  if (Object.hasOwn(MODE_TEXT, mode)) root.append(node('p', `연결 방식: ${MODE_TEXT[mode]}`, 'student-mode'));

  if (status === 'idle') {
    root.append(
      node('p', '조회 전', 'state state-empty'),
      node('p', '아직 조회하지 않았습니다. 이전 조회 결과는 표시하지 않습니다. 「설치 패키지 조회」를 직접 눌러야 조회가 시작되며, 자동으로 다시 조회하지 않습니다.'),
    );
  } else if (status === 'loading') {
    root.append(
      node('p', '조회 중', 'state state-loading'),
      node('p', '응답을 기다리는 중입니다. 이전 결과는 현재 결과가 아니므로 표시하지 않습니다. 「패키지 조회 취소」를 누르면 늦게 도착한 응답은 표시하지 않습니다.'),
    );
  } else if (status === 'error') {
    root.append(
      node('p', `조회 실패: ${safeDiagValue(error && error.message)}`, 'state state-error'),
      node('p', `오류 코드: ${safeDiagValue(error && error.code)}`),
      node('p', '조회 실패는 취약점이 없다는 뜻이 아니라 확인하지 못한 상태입니다. 이전 조회 결과는 현재 결과로 표시하지 않습니다. 다시 조회는 「설치 패키지 조회」를 직접 눌러야 하며 자동으로 다시 조회하지 않습니다.'),
    );
  } else if (status === 'ok' && data && typeof data === 'object' && Object.hasOwn(SCAN_TEXT, data.status)) {
    const scan = SCAN_TEXT[data.status];
    const complete = data.status === 'complete';
    root.setAttribute('data-student-scan-status', data.status);
    root.append(node('p', `${complete ? '' : '주의: '}${scan.label}(${data.status})`, `state ${complete ? 'state-ok' : 'state-empty'}`), node('p', scan.note));

    // 전달된 값만 보여 준다. 없는 값을 채워 넣지 않는다.
    const summary = node('dl', undefined, 'identity');
    row(summary, '설치 목록 원천', 'package-lock.json');
    if (hasValue(data.lockfileVersion)) row(summary, '잠금 파일 버전(lockfileVersion)', String(data.lockfileVersion));
    if (hasValue(data.lockfileHash)) row(summary, '잠금 파일 해시(lockfileHash)', String(data.lockfileHash));
    if (hasValue(data.checkedAt)) row(summary, '조회 시각(checkedAt)', String(data.checkedAt));
    root.append(summary);

    if (!Array.isArray(data.packages)) {
      root.append(node('p', '확인 불가: 패키지 목록 형식이 맞지 않습니다. 비어 있다는 뜻이 아닙니다.', 'state state-empty'));
    } else if (data.packages.length === 0) {
      root.append(node('p', complete
        ? '표시할 패키지 조회 결과가 없습니다.'
        : '표시할 패키지 조회 결과가 없습니다. 패키지에 취약점이 없다는 뜻이 아닙니다.', 'state state-empty'));
    } else {
      const list = node('ul', undefined, 'student-packages');
      for (const pkg of data.packages) list.append(packageItem(pkg));
      root.append(list);
    }
    root.append(node('p', 'OSV는 알려진 취약점 데이터베이스입니다. 조회 결과가 없다는 사실만으로 패키지나 앱 전체가 안전하다고 보장할 수 없습니다.'));
  } else {
    root.append(
      node('p', '확인 불가: 패키지 조회 응답을 확인하지 못했습니다. 취약점이 없다는 뜻이 아닙니다.', 'state state-empty'),
      node('p', '「설치 패키지 조회」를 직접 눌러 다시 조회하세요.'),
    );
  }
  return root;
}

export function createStudentView() {
  return {
    renderIdentity(input) { return identity(input); },
    renderDecision(input) { return decision(input); },
    renderEvents(input) { return events(input); },
    renderStatus(input) { return statusView(input); },
    renderVulnerabilities(input) { return vulnerabilities(input); },
    renderAiConnection(input) { return aiConnection(input); },
    renderExplanation(input) { return explanationView(input); },
    renderAction(input) { return actionView(input); },
  };
}
