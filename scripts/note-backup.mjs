// 10단계: 시험 계정 B의 가상 메모 한 건으로 사본(backup/note.v1.json)에 해시만 적습니다. 본문은 파일에 쓰지 않습니다.
// 사용: node scripts/note-backup.mjs <메모ID> <소유자 사용자ID> backup/private/<파일>.json
// 비공개 파일은 {"title": "...", "body": "..."} 형식이며 Git에 올라가지 않는 backup/private/ 에만 둡니다.
import { readFileSync, writeFileSync } from 'node:fs';
import { readFields, UUID } from '../src/notes-api.mjs';
import { buildNoteSnapshot, hashNoteContent, hashOwner, verifyNoteSnapshot } from '../src/note-restore.mjs';

const BACKUP = new URL('../backup/note.v1.json', import.meta.url);
const [id, ownerId, privateFile] = process.argv.slice(2);
const stop = (message) => { console.error(`중단: ${message}`); process.exit(1); };

if (!UUID.test(id ?? '') || !UUID.test(ownerId ?? '')) stop('메모ID와 소유자 사용자ID는 UUID여야 합니다.');
if (!privateFile || !/^backup[\/]private[\/][\w.-]+\.json$/u.test(privateFile)) stop('원본은 backup/private/ 아래 .json 파일이어야 합니다.');
let fields;
try { fields = readFields(JSON.parse(readFileSync(privateFile, 'utf8'))); } catch { stop('원본 파일을 읽을 수 없습니다.'); }
if (!fields) stop('원본의 title·body가 올바르지 않습니다.');

const current = verifyNoteSnapshot(JSON.parse(readFileSync(BACKUP, 'utf8')));
const notes = [...current.notes.filter((n) => n.id !== id.toLowerCase()),
  { id: id.toLowerCase(), ownerSha256: hashOwner(ownerId), contentSha256: hashNoteContent(fields) }];
const next = buildNoteSnapshot(current.version, notes);
writeFileSync(BACKUP, `${JSON.stringify(next, null, 2)}\n`);
console.log(`사본에 1건을 적었습니다: id=${id.toLowerCase()} 내용 해시 ${notes.at(-1).contentSha256.slice(0, 12)}… (본문은 쓰지 않음, 총 ${notes.length}건)`);
