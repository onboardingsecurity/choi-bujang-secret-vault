import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fixtureRequests } from '../scripts/fixture-7.mjs';
import { decide, RULE_IDS, stepUpEvidence } from '../src/decider.mjs';

const { normal, suspicious } = fixtureRequests();

// 추가 확인 기록 줄만 가로채서 시험하고, 그 밖의 오류 출력은 그대로 내보냅니다.
const logged = [];
const realWrite = process.stderr.write.bind(process.stderr);
process.stderr.write = (chunk, ...rest) => {
  if (String(chunk).startsWith('step_up_required ')) { logged.push(String(chunk)); return true; }
  return realWrite(chunk, ...rest);
};
const FIVE = 'decision,reasonCode,requestId,ruleIds,schema';
const odd = (patch = {}, events = suspicious.recentEvents) => ({
  ...suspicious, ...patch, recentEvents: events,
  signals: { ...suspicious.signals, ...(patch.signals ?? {}) },
});
const burst = (count, ageSeconds = 60) => [{ kind: 'risk_signal', ageSeconds, count }];

test('정상 사건은 허용되고 복합 이상 사건은 추가 확인으로 나온다', async () => {
  const ok = await decide(normal);
  assert.equal(ok.decision, 'allow');
  assert.equal(ok.reasonCode, 'approved');
  assert.deepEqual(ok.ruleIds, ['device_registered']);
  const step = await decide(suspicious);
  assert.equal(Object.keys(step).sort().join(), FIVE);
  assert.equal(step.decision, 'step_up');
  assert.equal(step.reasonCode, 'step_up_required');
  assert.deepEqual(step.ruleIds, ['step_up_required']);
  assert.equal(step.requestId, suspicious.requestId);
  assert.deepEqual(RULE_IDS, ['starter.deny', 'device_registered', 'step_up_required']);
});

test('사유(근거)가 남고 지역은 참고일 뿐이다', () => {
  assert.deepEqual(stepUpEvidence(suspicious), ['unusual_hour', 'unusual_network', 'read_burst', 'foreign_region']);
  assert.deepEqual(stepUpEvidence(normal), []);
});

test('지역 하나만으로는 추가 확인도 거부도 하지 않는다', async () => {
  const foreignOnly = { ...normal, signals: { ...normal.signals, region: 'foreign' } };
  const result = await decide(foreignOnly);
  assert.equal(result.decision, 'allow');
  // 지역을 local로 바꿔도 시각·네트워크·조회량이 모두 이상하면 여전히 추가 확인이다.
  assert.equal((await decide(odd({ signals: { region: 'local' } }))).decision, 'step_up');
});

test('시각·네트워크·대량 조회 중 하나라도 빠지면 추가 확인이 아니다', async () => {
  const cases = [
    ['시각 정상', odd({ signals: { hour: 14 } })],
    ['네트워크 정상', odd({ signals: { network: 'usual' } })],
    ['조회량 적음', odd({}, burst(9))],
    ['조회가 오래전', odd({}, burst(50, 601))],
    ['사건 없음', odd({}, [])],
    ['시각만 이상', odd({ signals: { network: 'usual' } }, [])],
    ['네트워크만 이상', odd({ signals: { hour: 14 } }, [])],
    ['조회량만 많음', { ...normal, recentEvents: burst(50) }],
  ];
  for (const [name, request] of cases) assert.equal((await decide(request)).decision, 'allow', name);
});

test('기준 경계: 0~5시, 10건, 600초', async () => {
  for (const hour of [0, 5]) assert.equal((await decide(odd({ signals: { hour } }))).decision, 'step_up', String(hour));
  for (const hour of [6, 23]) assert.equal((await decide(odd({ signals: { hour } }))).decision, 'allow', String(hour));
  assert.equal((await decide(odd({}, burst(10, 600)))).decision, 'step_up');
  assert.equal((await decide(odd({}, [...burst(4), ...burst(6)]))).decision, 'step_up');
  assert.equal((await decide(odd({}, burst(10, 601)))).decision, 'allow');
});

test('알 수 없거나 출처 불명인 접속 정보는 이상 근거로 승격되지 않고 정상값으로도 채워지지 않는다', async () => {
  const none = { source: 'none', region: 'unknown', network: 'unknown', hour: 3 };
  const forged = { headers: { 'x-forwarded-for': '203.0.113.9' }, geo: { country: 'KR' }, region: 'foreign', network: 'unusual', hour: 3 };
  // 실제 경로 신호(none)와 위조 이름이 섞여도 시각·네트워크 근거가 없으니 추가 확인이 아니다.
  assert.equal((await decide({ ...suspicious, ...forged, signals: none })).decision, 'allow');
  // 출처가 헤더·브라우저라고 밝힌 신호는 값이 이상해 보여도 근거가 아니다.
  for (const source of ['header', 'browser', 'x-forwarded-for', 'geoip']) {
    assert.equal((await decide(odd({ signals: { source } }))).decision, 'allow', source);
  }
  // 사건 목록 모양이 틀리면 알 수 없음이다.
  assert.equal((await decide(odd({}, [{ kind: 'risk_signal', count: 20 }]))).decision, 'allow');
  assert.equal((await decide({ ...suspicious, recentEvents: undefined })).decision, 'allow');
});

test('다시 확인된 새 요청은 다시 판정해 허용하고, 모양이 틀린 stepUp은 확인 전으로 본다', async () => {
  const again = await decide({ ...suspicious, stepUp: { verified: true, authAgeSeconds: 60 } });
  assert.equal(again.decision, 'allow');
  assert.equal(again.reasonCode, 'approved');
  assert.deepEqual(again.ruleIds, ['device_registered', 'step_up_required']);
  for (const authAgeSeconds of [0, 900]) {
    assert.equal((await decide({ ...suspicious, stepUp: { verified: true, authAgeSeconds } })).decision, 'allow', String(authAgeSeconds));
  }
  const badSteps = [
    { verified: false, authAgeSeconds: null }, { verified: true, authAgeSeconds: null }, { verified: true, authAgeSeconds: -1 },
    { verified: true, authAgeSeconds: 901 }, { verified: true, authAgeSeconds: 1.5 }, { verified: true, authAgeSeconds: '60' },
    { verified: 'true', authAgeSeconds: 60 }, { verified: 1, authAgeSeconds: 60 },
    { verified: true, authAgeSeconds: 60, token: 'x' }, { verified: true }, null, undefined, 'verified', [],
  ];
  for (const stepUp of badSteps) {
    const result = await decide({ ...suspicious, stepUp });
    assert.equal(result.decision, 'step_up', JSON.stringify(stepUp));
  }
});

test('기기 규칙이 먼저이고, 쓰기와 요청 없음의 결과는 그대로다', async () => {
  const unregistered = await decide({ ...suspicious, deviceRegistered: false, stepUp: { verified: true, authAgeSeconds: 1 } });
  assert.equal(unregistered.decision, 'deny');
  assert.equal(unregistered.reasonCode, 'device_not_registered');
  assert.deepEqual(unregistered.ruleIds, ['device_registered']);
  const write = await decide({ ...suspicious, method: 'POST' });
  assert.equal(write.decision, 'deny');
  assert.equal(write.reasonCode, 'starter_not_ready');
  assert.deepEqual(write.ruleIds, ['starter.deny']);
  const none = await decide(null);
  assert.equal(none.decision, 'deny');
  assert.equal(none.reasonCode, 'device_not_registered');
});

test('추가 확인일 때만 기록 한 줄이 남고 요청 ID와 근거 이름 말고는 담기지 않는다', async () => {
  logged.length = 0;
  const marked = { ...suspicious, subjectId: 'subject_leak_check', deviceId: 'b'.repeat(16), querySha256: 'c'.repeat(64), path: '/notes/secret-path' };
  const step = await decide(marked);
  assert.equal(step.decision, 'step_up');
  assert.equal(Object.keys(step).sort().join(), FIVE);
  assert.deepEqual(logged, [`step_up_required request=${marked.requestId} evidence=unusual_hour,unusual_network,read_burst,foreign_region\n`]);
  for (const leak of [marked.subjectId, marked.deviceId, marked.querySha256, marked.path, 'Bearer', 'eyJ']) {
    assert.equal(logged[0].includes(leak), false, leak);
  }
  // 요청 ID에 줄바꿈이나 다른 글이 섞여 있으면 기록에는 unknown만 쓴다.
  logged.length = 0;
  await decide({ ...suspicious, requestId: 'x\nfake_line request=1' });
  await decide({ ...suspicious, requestId: ['not-a-string'] });
  assert.equal(logged.length, 2);
  for (const line of logged) assert.match(line, /^step_up_required request=unknown evidence=[a-z_,]+\n$/u);
  // 추가 확인이 아닌 모든 경우에는 기록이 없다.
  logged.length = 0;
  await decide(normal);
  await decide({ ...suspicious, stepUp: { verified: true, authAgeSeconds: 60 } });
  await decide({ ...normal, signals: { ...normal.signals, region: 'foreign' } });
  await decide({ ...suspicious, deviceRegistered: false });
  await decide({ ...suspicious, method: 'POST' });
  await decide(null);
  assert.deepEqual(logged, []);
});

test('이 규칙은 어떤 경우에도 deny를 만들지 않는다(영구 차단 없음)', async () => {
  const hours = [0, 3, 5, 6, 14, 23, -1, 24, null];
  const networks = ['usual', 'unusual', 'unknown', null];
  const regions = ['local', 'foreign', 'unknown', null];
  const counts = [0, 9, 10, 100];
  for (const hour of hours) for (const network of networks) for (const region of regions) for (const count of counts) {
    const request = { ...suspicious, signals: { source: 'judge_fixture', region, network, hour }, recentEvents: burst(count) };
    const result = await decide(request);
    assert.notEqual(result.decision, 'deny', JSON.stringify({ hour, network, region, count }));
  }
});
