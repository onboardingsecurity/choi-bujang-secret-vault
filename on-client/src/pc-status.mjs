// 이 PC의 CPU 사용률·메모리·디스크 남은 공간을 일반 권한으로 한 번 읽는다.
// Node 기본 모듈(os, fs)만 쓴다. 관리자 권한이 필요한 명령이나 외부 프로그램은 실행하지 않는다.
// 컴퓨터 이름·사용자 이름·폴더 경로는 응답에 넣지 않는다. 읽지 못한 값은 값 없이 안전한 이유 코드만 돌려준다.
import os from 'node:os';
import {statfs} from 'node:fs/promises';

const GIB = 1024 ** 3;
const CPU_WINDOW_MS = 250;

const round = (value, digits) => Math.round(value * 10 ** digits) / 10 ** digits;
const unavailable = (reason, measuredAt) => ({status: 'unavailable', reason, measuredAt});

function wait(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) { reject(new Error('CANCELLED')); return; }
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => { clearTimeout(timer); reject(new Error('CANCELLED')); }, {once: true});
  });
}

// 코어별 누적 시간(ms)을 두 번 읽어 그 사이에 쉬지 않은 비율을 구한다.
async function readCpu(clock, signal) {
  const before = os.cpus();
  if (!Array.isArray(before) || before.length === 0) return unavailable('CPU_UNREADABLE', clock().toISOString());
  await wait(CPU_WINDOW_MS, signal);
  const after = os.cpus();
  const measuredAt = clock().toISOString();
  if (!Array.isArray(after) || after.length !== before.length) return unavailable('CPU_UNREADABLE', measuredAt);
  let idle = 0;
  let total = 0;
  after.forEach((cpu, index) => {
    for (const key of Object.keys(cpu.times)) {
      const delta = cpu.times[key] - before[index].times[key];
      total += delta;
      if (key === 'idle') idle += delta;
    }
  });
  if (!(total > 0)) return unavailable('CPU_NO_SAMPLE', measuredAt);
  return {
    status: 'ok',
    value: round(100 * (1 - idle / total), 1),
    unit: '%',
    cores: after.length,
    windowMs: CPU_WINDOW_MS,
    measuredAt,
    scope: `전체 ${after.length}코어 평균, 잰 시각 직전 ${CPU_WINDOW_MS} ms 구간`,
    source: 'os.cpus()',
  };
}

function readMemory(clock) {
  const measuredAt = clock().toISOString();
  const total = os.totalmem();
  const free = os.freemem();
  if (!(total > 0) || !(free >= 0) || free > total) return unavailable('MEMORY_UNREADABLE', measuredAt);
  return {
    status: 'ok',
    usedPercent: round(100 * (1 - free / total), 1),
    usedGiB: round((total - free) / GIB, 2),
    freeGiB: round(free / GIB, 2),
    totalGiB: round(total / GIB, 2),
    measuredAt,
    scope: 'OS가 보고한 여유 메모리 기준(사용 = 전체 − 여유). 캐시로 쓰는 메모리는 사용에 포함될 수 있어 작업 관리자·활동 모니터와 다를 수 있음'
      + (process.platform === 'darwin' ? '. macOS는 비활성·캐시 메모리를 여유로 세지 않아 활동 모니터의 「메모리 사용」보다 크게 높게 나올 수 있음' : ''),
    source: 'os.totalmem() / os.freemem()',
  };
}

async function readDisk(clock, directory) {
  try {
    const stats = await statfs(directory);
    const measuredAt = clock().toISOString();
    const free = stats.bavail * stats.bsize;
    const total = stats.blocks * stats.bsize;
    if (!(total > 0) || !(free >= 0)) return unavailable('DISK_UNREADABLE', measuredAt);
    return {
      status: 'ok',
      freeGiB: round(free / GIB, 1),
      totalGiB: round(total / GIB, 1),
      measuredAt,
      scope: '앱이 실행 중인 폴더가 있는 디스크(볼륨) 한 곳, 일반 사용자가 쓸 수 있는 남은 공간',
      source: 'fs.statfs()',
    };
  } catch (error) {
    const reason = error?.code === 'EACCES' || error?.code === 'EPERM' ? 'PERMISSION_DENIED' : 'DISK_UNREADABLE';
    return unavailable(reason, clock().toISOString());
  }
}

// 세 값은 서로 독립이다. 하나를 읽지 못해도 나머지는 그대로 돌려준다.
export async function readPcStatus({clock = () => new Date(), directory = process.cwd(), signal} = {}) {
  const [cpu, memory, disk] = await Promise.all([
    readCpu(clock, signal).catch((error) => (error?.message === 'CANCELLED' ? Promise.reject(error) : unavailable('CPU_UNREADABLE', clock().toISOString()))),
    Promise.resolve().then(() => readMemory(clock)).catch(() => unavailable('MEMORY_UNREADABLE', clock().toISOString())),
    readDisk(clock, directory),
  ]);
  return {platform: process.platform, cpu, memory, disk};
}
