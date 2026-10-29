// 이 PC의 네트워크 구성, 방화벽 켜짐 여부, 최근 Windows 기록(System·Application)의 경고·오류 건수를 일반 권한으로 한 번 읽는다.
// 읽기 전용이다. 방화벽·보안 설정을 바꾸는 명령은 이 파일에 없고, 관리자 권한을 요청하거나 올리지 않는다.
// 실행하는 외부 명령은 아래 SCRIPTS의 고정 읽기 명령뿐이며 사용자 입력을 섞지 않고 셸 없이 실행한다.
// 응답에는 IP·MAC·컴퓨터 이름·사용자 이름·기록 본문을 넣지 않는다. 읽지 못한 값은 값 없이 안전한 이유 코드만 돌려준다.
// Windows 기록의 경고·오류 건수는 침해나 공격 탐지 결과가 아니다.
import os from 'node:os';
import {execFile} from 'node:child_process';
import {join} from 'node:path';

const COMMAND_TIMEOUT_MS = 6000;
const MAX_OUTPUT_BYTES = 64 * 1024;
// 이름만 쓰면 Windows가 현재 폴더의 같은 이름 파일을 먼저 실행할 수 있어, 시스템 폴더의 정식 경로로 고정한다.
const POWERSHELL_PATH = join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
export const EVENT_HOURS = 24;
export const EVENT_COUNT_CAP = 5000;

const LOG_NAME = /^[A-Za-z0-9 _-]{1,64}$/;

// Windows 기록의 경고·오류 건수를 세는 읽기 명령을 만든다. 서버는 기본값만 쓰고, 값은 모두 고정된 정수·이름이다.
// 시간 필터를 건 읽기는 권한이 없는 로그도 「일치하는 기록 없음」으로 돌려준다. 그대로 0건으로 믿지 않고,
// 필터 없이 한 번 더 읽어 권한 없음(PERMISSION_DENIED)인지 진짜 0건인지 가린다.
export function buildEventsScript({hours = EVENT_HOURS, cap = EVENT_COUNT_CAP, logs = ['System', 'Application']} = {}) {
  if (!Number.isInteger(hours) || hours < 1 || hours > 168 || !Number.isInteger(cap) || cap < 1 || cap > 100000
    || !Array.isArray(logs) || logs.length === 0 || !logs.every((name) => typeof name === 'string' && LOG_NAME.test(name))) {
    throw new Error('INVALID_EVENT_SCRIPT_OPTIONS');
  }
  const zero = "$o.status='ok'; $o.errors=0; $o.warnings=0; $o.capped=$false";
  const denied = "$o.status='unavailable'; $o.reason='PERMISSION_DENIED'";
  const unreadable = "$o.status='unavailable'; $o.reason='UNREADABLE'";
  return [
    `$since=(Get-Date).AddHours(-${hours})`,
    '$out=@()',
    `foreach ($log in ${logs.map((name) => `'${name}'`).join(',')}) {`
      + ' $o=[ordered]@{log=$log};'
      + ' try {'
      + ` $e=@(Get-WinEvent -FilterHashtable @{LogName=$log;Level=2,3;StartTime=$since} -MaxEvents ${cap + 1} -ErrorAction Stop);`
      + " $o.status='ok'; $o.errors=@($e | Where-Object {$_.Level -eq 2}).Count; $o.warnings=@($e | Where-Object {$_.Level -eq 3}).Count;"
      + ` $o.capped=($e.Count -gt ${cap})`
      + ' } catch {'
      + " if ($_.FullyQualifiedErrorId -like 'NoMatchingEventsFound*') {"
      + ' try { $null=@(Get-WinEvent -LogName $log -MaxEvents 1 -ErrorAction Stop); ' + zero + ' }'
      + ` catch { if ($_.Exception -is [System.UnauthorizedAccessException]) { ${denied} }`
      + ` elseif ($_.FullyQualifiedErrorId -like 'NoMatchingEventsFound*') { ${zero} } else { ${unreadable} } }`
      + ' }'
      + ` elseif ($_.Exception -is [System.UnauthorizedAccessException]) { ${denied} }`
      + ` else { ${unreadable} }`
      + ' };'
      + ' $out += [pscustomobject]$o }',
    'ConvertTo-Json -InputObject $out -Compress',
  ].join('; ');
}

// 한 줄로 쓰고 작은따옴표만 쓴다(명령줄 인자로 넘길 때 따옴표가 깨지지 않게).
const SCRIPTS = Object.freeze({
  adapters: [
    '$r=@(Get-NetAdapter -Physical | ForEach-Object { [pscustomobject]@{Status=[string]$_.Status;MediaType=[string]$_.MediaType} })',
    'ConvertTo-Json -InputObject $r -Compress',
  ].join('; '),
  firewall: [
    '$r=@(Get-NetFirewallProfile | ForEach-Object { [pscustomobject]@{Name=[string]$_.Name;Enabled=[string]$_.Enabled} })',
    'ConvertTo-Json -InputObject $r -Compress',
  ].join('; '),
  events: buildEventsScript(),
});

const unavailable = (reason, measuredAt) => ({status: 'unavailable', reason, measuredAt});
const isCount = (value) => Number.isInteger(value) && value >= 0;

// 고정 명령을 한 번 실행해 표준 출력만 돌려준다. 실패는 이유 코드로만 알린다.
export function runPowerShell(script, {signal, timeoutMs = COMMAND_TIMEOUT_MS} = {}) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) { reject(new Error('CANCELLED')); return; }
    execFile(POWERSHELL_PATH, ['-NoProfile', '-NonInteractive', '-Command', script], {
      windowsHide: true,
      timeout: timeoutMs,
      maxBuffer: MAX_OUTPUT_BYTES,
      encoding: 'utf8',
      signal,
    }, (error, stdout) => {
      if (!error) { resolve({ok: true, stdout}); return; }
      if (signal?.aborted || error.name === 'AbortError') { reject(new Error('CANCELLED')); return; }
      if (error.killed) { resolve({ok: false, reason: 'TIMEOUT'}); return; }
      if (error.code === 'ENOENT') { resolve({ok: false, reason: 'COMMAND_UNAVAILABLE'}); return; }
      if (error.code === 'EACCES' || error.code === 'EPERM') { resolve({ok: false, reason: 'PERMISSION_DENIED'}); return; }
      resolve({ok: false, reason: 'UNREADABLE'});
    });
  });
}

function parseList(stdout) {
  try {
    const parsed = JSON.parse(stdout);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

async function runList(run, key, signal) {
  const result = await run(SCRIPTS[key], {signal});
  if (!result || result.ok !== true) return {reason: result && typeof result.reason === 'string' ? result.reason : 'UNREADABLE'};
  const list = parseList(result.stdout);
  return list ? {list} : {reason: 'OUTPUT_INVALID'};
}

// 물리 네트워크 어댑터를 유선(802.3)·무선(802.11)·그 밖으로 나눠 센다.
function summarizeAdapters(list) {
  const groups = {wired: {up: 0, total: 0}, wireless: {up: 0, total: 0}, other: {up: 0, total: 0}};
  for (const item of list) {
    if (!item || typeof item.Status !== 'string' || typeof item.MediaType !== 'string') return null;
    const group = item.MediaType === '802.3' ? groups.wired : item.MediaType === 'Native 802.11' ? groups.wireless : groups.other;
    group.total += 1;
    if (item.Status === 'Up') group.up += 1;
  }
  return groups;
}

const FIREWALL_PROFILES = new Set(['Domain', 'Private', 'Public']);
const FIREWALL_STATE = {True: 'on', False: 'off', NotConfigured: 'not_configured'};

function summarizeFirewall(list) {
  const profiles = [];
  for (const item of list) {
    if (!item || !FIREWALL_PROFILES.has(item.Name) || !Object.hasOwn(FIREWALL_STATE, item.Enabled)) return null;
    profiles.push({name: item.Name.toLowerCase(), enabled: FIREWALL_STATE[item.Enabled]});
  }
  return profiles.length > 0 ? profiles : null;
}

function summarizeEvents(list) {
  const logs = [];
  for (const item of list) {
    if (!item || (item.log !== 'System' && item.log !== 'Application')) return null;
    if (item.status === 'ok' && isCount(item.errors) && isCount(item.warnings)) {
      logs.push({log: item.log, status: 'ok', errors: item.errors, warnings: item.warnings, capped: item.capped === true});
    } else if (item.status === 'unavailable' && typeof item.reason === 'string') {
      logs.push({log: item.log, status: 'unavailable', reason: item.reason});
    } else {
      return null;
    }
  }
  return logs.length === 2 ? logs : null;
}

function externalInterfaceCount(networkInterfaces) {
  const all = networkInterfaces();
  if (!all || typeof all !== 'object') return null;
  return Object.values(all).filter((addresses) => Array.isArray(addresses) && addresses.some((address) => address && address.internal === false)).length;
}

// 세 값은 서로 독립이다. 하나를 읽지 못해도 나머지는 그대로 돌려준다.
export async function readSystemStatus({
  clock = () => new Date(),
  signal,
  platform = process.platform,
  run = runPowerShell,
  networkInterfaces = os.networkInterfaces,
} = {}) {
  const windows = platform === 'win32';
  const stamp = () => clock().toISOString();

  const readNetwork = async () => {
    let interfaces = null;
    try { interfaces = externalInterfaceCount(networkInterfaces); } catch { interfaces = null; }
    const measuredAt = stamp();
    if (interfaces === null) return unavailable('UNREADABLE', measuredAt);
    let adapters;
    if (!windows) {
      adapters = unavailable('UNSUPPORTED_OS', measuredAt);
    } else {
      const got = await runList(run, 'adapters', signal);
      const groups = got.list ? summarizeAdapters(got.list) : null;
      adapters = groups ? {status: 'ok', ...groups} : unavailable(got.list ? 'OUTPUT_INVALID' : got.reason, stamp());
    }
    return {
      status: 'ok',
      externalInterfaces: interfaces,
      adapters,
      measuredAt,
      scope: 'IP 주소가 있는 외부 인터페이스 수는 가상 어댑터를 포함한다. 유선·무선 구분은 물리 어댑터만 센다',
      source: 'os.networkInterfaces()' + (windows ? ' / Get-NetAdapter -Physical' : ''),
    };
  };

  const readFirewall = async () => {
    if (!windows) return unavailable('UNSUPPORTED_OS', stamp());
    const got = await runList(run, 'firewall', signal);
    const measuredAt = stamp();
    if (!got.list) return unavailable(got.reason, measuredAt);
    const profiles = summarizeFirewall(got.list);
    if (!profiles) return unavailable('OUTPUT_INVALID', measuredAt);
    return {
      status: 'ok',
      profiles,
      readOnly: true,
      measuredAt,
      scope: '도메인·개인·공용 프로필의 켜짐 여부만 읽는다. 규칙 목록과 설정 값은 읽지도 바꾸지도 않는다',
      source: 'Get-NetFirewallProfile',
    };
  };

  const readEvents = async () => {
    if (!windows) return unavailable('UNSUPPORTED_OS', stamp());
    const got = await runList(run, 'events', signal);
    const measuredAt = stamp();
    if (!got.list) return unavailable(got.reason, measuredAt);
    const logs = summarizeEvents(got.list);
    if (!logs) return unavailable('OUTPUT_INVALID', measuredAt);
    return {
      status: 'ok',
      hours: EVENT_HOURS,
      cap: EVENT_COUNT_CAP,
      logs,
      measuredAt,
      scope: `최근 ${EVENT_HOURS}시간 System·Application 기록의 경고·오류 건수. 침해나 공격 탐지 결과가 아니다`,
      source: 'Get-WinEvent',
    };
  };

  const guard = (read, reason) => read().catch((error) => (error?.message === 'CANCELLED' ? Promise.reject(error) : unavailable(reason, stamp())));
  const [network, firewall, events] = await Promise.all([
    guard(readNetwork, 'UNREADABLE'),
    guard(readFirewall, 'UNREADABLE'),
    guard(readEvents, 'UNREADABLE'),
  ]);
  return {platform, network, firewall, events};
}
