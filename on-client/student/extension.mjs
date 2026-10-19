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

function textRows(title, entries) {
  const block = node('div');
  block.append(node('h4', title));
  const rows = Array.isArray(entries) ? entries : [];
  if (rows.length === 0) {
    block.append(node('p', '없음'));
    return block;
  }
  const list = node('ul');
  for (const entry of rows) list.append(node('li', `${textOf(entry && entry.id)}: ${textOf(entry && entry.text)}`));
  block.append(list);
  return block;
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

export function createStudentView() {
  return {
    renderIdentity(input) { return identity(input); },
    renderDecision(input) { return decision(input); },
    renderEvents(input) { return events(input); },
    renderStatus(input) { return statusView(input); },
    renderVulnerabilities() { return '학생 구현 대기: 정확한 설치 버전·OSV 출처·조회 시각·부분 결과·조회 실패를 구분하세요.'; },
    renderAiConnection() { return '학생 구현 대기: 모델 응답 점검과 실제 사건 설명을 구분하고 AI 오류·취소·수동 복구를 안내하세요.'; },
    renderExplanation() { return '학생 구현 대기: 선택한 사건의 근거·규칙·현재 상태와 AI 설명을 연결하세요. 제안은 자동 실행하지 않습니다.'; },
    renderAction() { return '학생 구현 대기: 현재 사건·조치·실제 대상·사람 확인·ACK와 원천 효과·unknown을 구분하세요.'; },
  };
}
