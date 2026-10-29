// src/system-status.mjs 시험. 가짜 명령 출력으로 돌리므로 실제 PC의 값이나 설정을 읽거나 바꾸지 않는다(마지막 시험만 이 PC에서 읽기 전용으로 한 번 읽음).
// 실행: node --test test/system-status.test.mjs (on-client 폴더)
import test from 'node:test';
import assert from 'node:assert/strict';
import {readSystemStatus, buildEventsScript, runPowerShell, EVENT_HOURS} from '../src/system-status.mjs';

const clock = () => new Date('2026-10-29T03:00:00.000Z');
const interfaces = () => ({Ethernet: [{address: '192.0.2.10', internal: false}], Loopback: [{address: '127.0.0.1', internal: true}]});

const ADAPTERS = [{Status: 'Up', MediaType: '802.3'}, {Status: 'Disconnected', MediaType: 'Native 802.11'}];
const FIREWALL = [{Name: 'Domain', Enabled: 'True'}, {Name: 'Private', Enabled: 'True'}, {Name: 'Public', Enabled: 'False'}];
const EVENTS = [
  {log: 'System', status: 'ok', errors: 2, warnings: 8, capped: false},
  {log: 'Application', status: 'ok', errors: 0, warnings: 0, capped: false},
];

// 어떤 명령이 왔는지 보고 미리 정한 출력을 돌려준다. 받은 명령은 모아 둔다.
function fakeRun(outputs, seen = []) {
  return async (script) => {
    seen.push(script);
    const key = script.includes('Get-NetAdapter') ? 'adapters' : script.includes('Get-NetFirewallProfile') ? 'firewall' : 'events';
    const value = outputs[key];
    if (value && value.fail) return {ok: false, reason: value.fail};
    return {ok: true, stdout: typeof value === 'string' ? value : JSON.stringify(value)};
  };
}

const read = (outputs, extra = {}) => readSystemStatus({clock, platform: 'win32', networkInterfaces: interfaces, run: fakeRun(outputs), ...extra});

test('정상: 네트워크·방화벽·기록 건수를 시각·범위·출처와 함께 돌려준다', async () => {
  const data = await read({adapters: ADAPTERS, firewall: FIREWALL, events: EVENTS});
  assert.equal(data.network.status, 'ok');
  assert.equal(data.network.externalInterfaces, 1);
  assert.deepEqual(data.network.adapters.wired, {up: 1, total: 1});
  assert.deepEqual(data.network.adapters.wireless, {up: 0, total: 1});
  assert.deepEqual(data.firewall.profiles, [{name: 'domain', enabled: 'on'}, {name: 'private', enabled: 'on'}, {name: 'public', enabled: 'off'}]);
  assert.equal(data.firewall.readOnly, true);
  assert.equal(data.events.hours, EVENT_HOURS);
  assert.deepEqual(data.events.logs[0], {log: 'System', status: 'ok', errors: 2, warnings: 8, capped: false});
  for (const part of [data.network, data.firewall, data.events]) {
    assert.equal(part.measuredAt, '2026-10-29T03:00:00.000Z');
    assert.ok(part.scope && part.source);
  }
  assert.match(data.events.scope, /침해나 공격 탐지 결과가 아니다/);
});

test('응답에 IP·MAC·컴퓨터 이름·사용자 이름이 없다', async () => {
  const text = JSON.stringify(await read({adapters: ADAPTERS, firewall: FIREWALL, events: EVENTS}));
  assert.doesNotMatch(text, /192\.0\.2\.10|127\.0\.0\.1|mac|hostname|username/i);
});

test('기록이 0건인 것과 읽지 못한 것을 구분한다', async () => {
  const data = await read({adapters: ADAPTERS, firewall: FIREWALL, events: [
    {log: 'System', status: 'ok', errors: 0, warnings: 0, capped: false},
    {log: 'Application', status: 'unavailable', reason: 'PERMISSION_DENIED'},
  ]});
  assert.deepEqual(data.events.logs[0], {log: 'System', status: 'ok', errors: 0, warnings: 0, capped: false});
  assert.deepEqual(data.events.logs[1], {log: 'Application', status: 'unavailable', reason: 'PERMISSION_DENIED'});
});

test('한 값을 읽지 못해도 나머지는 그대로 돌려준다(시간 초과·권한 없음)', async () => {
  const data = await read({adapters: {fail: 'TIMEOUT'}, firewall: {fail: 'PERMISSION_DENIED'}, events: EVENTS});
  assert.equal(data.network.status, 'ok');
  assert.deepEqual(data.network.adapters, {status: 'unavailable', reason: 'TIMEOUT', measuredAt: '2026-10-29T03:00:00.000Z'});
  assert.equal(data.firewall.status, 'unavailable');
  assert.equal(data.firewall.reason, 'PERMISSION_DENIED');
  assert.equal(data.events.status, 'ok');
});

test('형식이 이상한 출력은 값으로 쓰지 않고 OUTPUT_INVALID로 둔다', async () => {
  const data = await read({adapters: 'not json', firewall: [{Name: 'Evil', Enabled: 'True'}], events: [{log: 'Security', status: 'ok', errors: 1, warnings: 1}]});
  assert.equal(data.network.adapters.reason, 'OUTPUT_INVALID');
  assert.equal(data.firewall.reason, 'OUTPUT_INVALID');
  assert.equal(data.events.reason, 'OUTPUT_INVALID');
});

test('Windows가 아니면 명령을 실행하지 않고 방화벽·기록은 UNSUPPORTED_OS로 둔다', async () => {
  const seen = [];
  const data = await readSystemStatus({clock, platform: 'linux', networkInterfaces: interfaces, run: fakeRun({}, seen)});
  assert.equal(seen.length, 0);
  assert.equal(data.firewall.reason, 'UNSUPPORTED_OS');
  assert.equal(data.events.reason, 'UNSUPPORTED_OS');
  assert.equal(data.network.status, 'ok');
  assert.equal(data.network.adapters.reason, 'UNSUPPORTED_OS');
});

test('실행하는 명령은 읽기 명령 세 개뿐이고 설정을 바꾸는 명령이 없다', async () => {
  const seen = [];
  await read({adapters: ADAPTERS, firewall: FIREWALL, events: EVENTS}, {run: fakeRun({adapters: ADAPTERS, firewall: FIREWALL, events: EVENTS}, seen)});
  assert.equal(seen.length, 3);
  const cmdlets = seen.flatMap((script) => script.match(/\b[A-Z][a-z]+-[A-Z]\w+/g) || []);
  const allowed = new Set(['Get-NetAdapter', 'Get-NetFirewallProfile', 'Get-WinEvent', 'Get-Date', 'ForEach-Object', 'Where-Object', 'ConvertTo-Json']);
  for (const cmdlet of cmdlets) assert.ok(allowed.has(cmdlet), `허용 목록에 없는 명령: ${cmdlet}`);
  for (const script of seen) assert.doesNotMatch(script, /\b(Set|New|Remove|Enable|Disable|Add|Clear|Stop|Start|Invoke|Restart|Reset)-/);
});

test('취소하면 값으로 바꾸지 않고 취소를 그대로 알린다', async () => {
  await assert.rejects(readSystemStatus({clock, platform: 'win32', networkInterfaces: interfaces, run: async () => { throw new Error('CANCELLED'); }}), /CANCELLED/);
});

test('이 PC에서 읽기 전용으로 한 번 읽는다 (Windows에서만)', {skip: process.platform !== 'win32'}, async () => {
  const data = await readSystemStatus();
  for (const part of [data.network, data.firewall, data.events]) assert.ok(['ok', 'unavailable'].includes(part.status));
  if (data.events.status === 'ok') for (const log of data.events.logs) assert.ok(['ok', 'unavailable'].includes(log.status));
  assert.doesNotMatch(JSON.stringify(data), /\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/);
});

// 아래 세 시험은 이 PC에서 읽기 전용으로 실제 Get-WinEvent를 돌린다(Windows에서만). 설정은 바꾸지 않고 건수 외에는 읽지 않는다.
const runEvents = async (options) => {
  const result = await runPowerShell(buildEventsScript(options));
  assert.equal(result.ok, true);
  return JSON.parse(result.stdout);
};

test('권한이 없는 로그는 0건이 아니라 PERMISSION_DENIED로 나온다 (관리자 권한으로 실행 중이면 건너뜀)', {skip: process.platform !== 'win32'}, async () => {
  const admin = await runPowerShell('([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)');
  if (admin.ok && admin.stdout.trim() === 'True') return;
  const [item] = await runEvents({logs: ['Security']});
  assert.deepEqual(item, {log: 'Security', status: 'unavailable', reason: 'PERMISSION_DENIED'});
});

test('세는 한도를 낮추면 실제 명령에서도 capped가 켜지고 건수가 한도+1에서 멈춘다', {skip: process.platform !== 'win32'}, async () => {
  const full = await runEvents({});
  const capped = await runEvents({cap: 1});
  for (const item of capped) {
    const total = item.errors + item.warnings;
    const fullItem = full.find((entry) => entry.log === item.log);
    assert.ok(total <= 2, item.log + ' 합계 ' + total);
    assert.equal(item.capped, total > 1);
    if (fullItem.errors + fullItem.warnings > 1) assert.equal(item.capped, true);
  }
});

test('명령을 만들 때 이상한 값(범위 밖 숫자, 따옴표·명령이 섞인 로그 이름)을 거부한다', () => {
  for (const options of [{hours: 0}, {hours: 1000}, {cap: 0}, {cap: 1.5}, {logs: []}, {logs: ["System'; Remove-Item x; '"]}, {logs: ['A$B']}]) {
    assert.throws(() => buildEventsScript(options), /INVALID_EVENT_SCRIPT_OPTIONS/);
  }
});
