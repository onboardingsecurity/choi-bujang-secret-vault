// 12단계: 탈환 작전실 요약(GET /api/war-room). 판정기 규칙, 탐지 사건, 회수 상태, 복구 버전을 한 번에 보여 줍니다.
// 화면의 성공 문구를 통과 근거로 쓰지 않도록, 항목마다 근거의 종류(status)를 따로 적습니다.
//   confirmed: 이번 응답에서 서버가 DB를 읽거나 사본을 다시 검증해 얻은 값
//   listed:    배포된 코드에 적힌 목록. 실행 결과가 아닙니다
//   not_run:   실행한 적이 없거나 이 저장소에 연결되어 있지 않아 값을 모릅니다(0건이 아니라 모름)
// 메모 본문·제목·사용자 ID·기기 번호·토큰은 응답에도 서버 기록에도 넣지 않습니다. 개수와 상태 이름만 씁니다.
import { randomUUID } from 'node:crypto';
import { RULE_IDS } from './decider.mjs';
import { sameUser } from './device-session.mjs';
import { verifyNoteSnapshot } from './note-restore.mjs';
import { currentPolicy, diffPolicy, verifySnapshot } from './policy-diff.mjs';

const DEVICE_STATES = ['approved', 'pending', 'revoked'];
const token = (value) => String(value).replace(/\s+/gu, '_').slice(0, 40);
const respond = (response, status, json) => response.status(status).json(json);

// 서버 기록 줄에 들어가는 값과 화면에 나오는 수치가 같은 원본에서 나오도록, 기록 칸(record)은 요약에서만 만듭니다.
export const recordOf = (summary) => ({
  rules: summary.decider.ruleCount,
  detect: summary.detect.events === null ? 'not_connected' : summary.detect.events,
  devices_approved: summary.revocation.approved,
  devices_pending: summary.revocation.pending,
  devices_revoked: summary.revocation.revoked,
  policy_verified: summary.recovery.policy.verified,
  policy_version: token(summary.recovery.policy.version ?? 'none'),
  policy_sha: summary.recovery.policy.shaPrefix ?? 'none',
  policy_changed: summary.recovery.policy.changed ?? 'na',
  note_verified: summary.recovery.notes.verified,
  note_version: token(summary.recovery.notes.version ?? 'none'),
  note_entries: summary.recovery.notes.entries ?? 'na',
});

export const warRoomLogLine = (requestId, record) =>
  `war_room_view request=${requestId} ${Object.entries(record).map(([key, value]) => `${key}=${value}`).join(' ')}`;

// 사본 검증이 실패하면 값을 비우고 verified만 false로 둡니다. 검증 실패를 성공으로 적지 않습니다.
function recoveryOf({ policy, notes, config }) {
  const out = {
    status: 'confirmed',
    policy: { verified: false, version: null, shaPrefix: null, changed: null },
    notes: { verified: false, version: null, entries: null },
  };
  try {
    verifySnapshot(policy);
    const diff = diffPolicy(policy, currentPolicy(config));
    out.policy = { verified: true, version: diff.restoreVersion, shaPrefix: diff.sha256.slice(0, 12), changed: diff.changed };
  } catch {}
  try {
    verifyNoteSnapshot(notes);
    out.notes = { verified: true, version: notes.version, entries: notes.notes.length };
  } catch {}
  return out;
}

export function buildWarRoomSummary({ devices, policy, notes, config }) {
  const count = (state) => devices.filter((row) => row.status === state).length;
  return {
    decider: { status: 'listed', ruleCount: RULE_IDS.length, ruleIds: [...RULE_IDS], verdicts: { status: 'not_run' } },
    detect: { status: 'not_run', events: null, proposals: null },
    revocation: { status: 'confirmed', ...Object.fromEntries(DEVICE_STATES.map((state) => [state, count(state)])) },
    recovery: recoveryOf({ policy, notes, config }),
  };
}

// 로그인(guard)과 학생 확인(studentOnly)을 통과한 뒤의 처리입니다. 시험에서 가짜 사용자·DB·사본으로 직접 부를 수 있게 따로 두었습니다.
export async function handleWarRoom({ user, db }, request, response, { policy, notes, config, requestId = randomUUID(), now = new Date() }) {
  const { data, error } = await db.from('devices').select('owner_id, status').eq('owner_id', user.userId);
  if (error) return respond(response, 502, { error: 'DB_READ_FAILED' });
  const devices = data.filter((row) => sameUser(row.owner_id, user));
  const summary = buildWarRoomSummary({ devices, policy, notes, config });
  const logLine = warRoomLogLine(requestId, recordOf(summary));
  try { console.log(logLine); } catch {}
  return respond(response, 200, { requestId, checkedAt: now.toISOString(), ...summary, logLine });
}
