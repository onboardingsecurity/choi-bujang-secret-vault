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

export function createStudentView() {
  return {
    renderIdentity(input) { return identity(input); },
    renderDecision(input) { return decision(input); },
    renderEvents(input) { return events(input); },
    renderStatus() { return '학생 구현 대기: 기기·세션·알림과 연결 점검 상태를 구분하세요.'; },
    renderVulnerabilities() { return '학생 구현 대기: 정확한 설치 버전·OSV 출처·조회 시각·부분 결과·조회 실패를 구분하세요.'; },
    renderAiConnection() { return '학생 구현 대기: 모델 응답 점검과 실제 사건 설명을 구분하고 AI 오류·취소·수동 복구를 안내하세요.'; },
    renderExplanation() { return '학생 구현 대기: 선택한 사건의 근거·규칙·현재 상태와 AI 설명을 연결하세요. 제안은 자동 실행하지 않습니다.'; },
    renderAction() { return '학생 구현 대기: 현재 사건·조치·실제 대상·사람 확인·ACK와 원천 효과·unknown을 구분하세요.'; },
  };
}
