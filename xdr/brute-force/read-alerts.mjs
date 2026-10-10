import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pickAlert } from './pick-alert.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

export async function readAlerts({ root = ROOT } = {}) {
  const fixture = JSON.parse(await readFile(join(root, 'xdr', 'fixtures', 'brute-force.json'), 'utf8'));
  if (fixture?.schema !== 'aleph.xdr.fixture.v1' || fixture.moduleKey !== 'brute-force' || !Array.isArray(fixture.alerts)) {
    throw new Error('brute-force 경보 묶음 형식이 아닙니다.');
  }
  const rows = fixture.alerts.map(pickAlert);
  if (rows.length !== fixture.alerts.length) throw new Error('경보 건수와 뽑은 줄 수가 다릅니다.');
  return { alertCount: fixture.alerts.length, rows };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const { alertCount, rows } = await readAlerts();
    for (const row of rows) process.stdout.write(`${JSON.stringify(row)}\n`);
    process.stdout.write(`경보 ${alertCount}건 / 뽑은 줄 ${rows.length}줄 ${alertCount === rows.length ? '(일치)' : '(불일치)'}\n`);
    if (alertCount !== rows.length) process.exitCode = 1;
  } catch (error) {
    process.stderr.write(`경보 읽기 첫 오류: ${error.message}\n`);
    process.exitCode = 1;
  }
}
