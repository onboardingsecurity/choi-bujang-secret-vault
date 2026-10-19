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

export function createStudentView() {
  return {
    renderIdentity(input) { return identity(input); },
    renderDecision() { return '학생 구현 대기: 서버의 판정과 이유를 연결하세요.'; },
    renderEvents() { return '학생 구현 대기: 본인 접속·XDR 기록을 연결하세요.'; },
    renderStatus() { return '학생 구현 대기: 기기·세션·알림과 연결 점검 상태를 구분하세요.'; },
    renderVulnerabilities() { return '학생 구현 대기: 정확한 설치 버전·OSV 출처·조회 시각·부분 결과·조회 실패를 구분하세요.'; },
    renderAiConnection() { return '학생 구현 대기: 모델 응답 점검과 실제 사건 설명을 구분하고 AI 오류·취소·수동 복구를 안내하세요.'; },
    renderExplanation() { return '학생 구현 대기: 선택한 사건의 근거·규칙·현재 상태와 AI 설명을 연결하세요. 제안은 자동 실행하지 않습니다.'; },
    renderAction() { return '학생 구현 대기: 현재 사건·조치·실제 대상·사람 확인·ACK와 원천 효과·unknown을 구분하세요.'; },
  };
}
