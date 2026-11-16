// 미노피아 기본 훅(v0.7.43 소유자 "하네스 엔지니어링: 위험한 행동은 원천 차단"). 프로젝트 저장소의 .claude/hooks/guard.mjs로 들어간다.
// 1) Claude Code PreToolUse 훅: 명령·파일 쓰기를 실행 전에 보고, 위험하면 종료 코드 2로 막는다(이유는 Claude에게 보임).
// 2) git pre-commit(--commit): 올리려는 변경에 .env·비밀값·데이터 삭제 SQL이 있으면 커밋을 막는다(Codex 등 모든 AI·사람).
// 규칙만, 외부 호출 없음. 정말 필요한 일이면 소유자가 직접 하거나 지시서에 승인을 적는다(훅을 끄지 않는다).
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const ENV_FILE = /(^|\/)\.env(\.[\w-]+)?$/;
const ENV_OK = /(^|\/)\.env\.(example|sample|template)$/;
const SECRET = [
  /\bghp_[A-Za-z0-9]{30,}/,
  /\bgithub_pat_[A-Za-z0-9_]{40,}/,
  /\bsk-(?:ant-|proj-)?[A-Za-z0-9_-]{24,}/,
  /\bAKIA[0-9A-Z]{16}\b/,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}/,
  /(SERVICE_ROLE|SECRET|PRIVATE)_?KEY\s*[:=]\s*['"]?[A-Za-z0-9_\-.]{20,}/i,
];
const SQL_DANGER = /\b(drop\s+(table|schema|database)\b|truncate\s+table\b|truncate\s+[\w."]+\s*;)/i;

/** 셸 명령이 위험하면 이유, 아니면 null */
export function checkCommand(cmd) {
  const c = String(cmd ?? '');
  if (/\brm\s+-[a-zA-Z]*r[a-zA-Z]*\s+(-[a-zA-Z]+\s+)*(\/|~|\*|\.{1,2})(\s|$|\/\*?(\s|$))/.test(c)) return '저장소 전체·홈·루트를 지우는 rm -rf는 막혀 있어요. 지울 파일을 하나씩 적으세요.';
  if (/\bgit\s+push\b[^|;&]*\s(--force(?!-with-lease)|-f)(\s|$)/.test(c)) return '강제 push(--force)는 막혀 있어요. 작업 브랜치에 새 커밋으로 올리세요.';
  if (/\bgit\s+push\b[^|;&]*\s(origin\s+)?(HEAD:)?(main|master|release)(\s|$)/.test(c)) return 'main·release에 바로 push하는 것은 막혀 있어요. 작업 브랜치로 올리고 PR로 합치세요.';
  if (/--no-verify\b/.test(c)) return '--no-verify(검사 건너뛰기)는 막혀 있어요.';
  if (/\bsupabase\s+(db\s+(reset|push)|migration\s+repair)/.test(c)) return '운영 DB를 바꾸는 supabase 명령은 막혀 있어요(소유자 승인 뒤 미노피아가 해요).';
  if (SQL_DANGER.test(c)) return 'DROP·TRUNCATE 같은 데이터 삭제 SQL은 막혀 있어요.';
  if (/\b(cat|less|more|head|tail|bat|type)\s+[^|;&]*\.env(\.[\w-]+)?(\s|$)/.test(c) && !/\.env\.(example|sample|template)/.test(c)) return '.env(비밀값) 파일 내용을 출력하는 것은 막혀 있어요.';
  if (/\b(printenv|env)\s*(\||$)/.test(c)) return '환경 변수 전체를 출력하는 것은 막혀 있어요(비밀값이 섞여 있어요).';
  return null;
}

/** 파일 쓰기가 위험하면 이유 */
export function checkWrite(path, content = '') {
  const p = String(path ?? '');
  if (ENV_FILE.test(p) && !ENV_OK.test(p)) return '.env(비밀값) 파일은 쓰거나 고칠 수 없어요. 비밀값은 서버 secrets에만 둬요.';
  const hit = SECRET.find((r) => r.test(String(content)));
  if (hit) return '비밀값(토큰·키)처럼 보이는 글은 파일에 넣을 수 없어요.';
  return null;
}

/** 커밋하려는 변경(파일 목록·추가된 줄)이 위험하면 이유 */
export function checkStaged(files, addedLines) {
  const env = files.find((f) => ENV_FILE.test(f) && !ENV_OK.test(f));
  if (env) return `.env 파일(${env})은 커밋할 수 없어요.`;
  const text = addedLines.join('\n');
  if (SECRET.some((r) => r.test(text))) return '비밀값(토큰·키)처럼 보이는 줄이 있어요. 지우고 서버 secrets로 옮기세요.';
  if (SQL_DANGER.test(text)) return 'DROP·TRUNCATE 같은 데이터 삭제 SQL이 들어 있어요. 꼭 필요하면 소유자 승인을 받아 사람이 커밋해요.';
  return null;
}

/** Claude PreToolUse 입력 하나 판단 */
export function checkTool(input) {
  const name = String(input?.tool_name ?? '');
  const t = input?.tool_input ?? {};
  if (name === 'Bash') return checkCommand(t.command);
  if (name === 'Write') return checkWrite(t.file_path, t.content);
  if (name === 'Edit') return checkWrite(t.file_path, t.new_string);
  if (name === 'MultiEdit') return checkWrite(t.file_path, (t.edits ?? []).map((e) => e.new_string).join('\n'));
  return null;
}

function main() {
  if (process.argv.includes('--commit')) {
    const files = execSync('git diff --cached --name-only', { encoding: 'utf8' }).split('\n').filter(Boolean);
    const added = execSync('git diff --cached -U0', { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
      .split('\n')
      .filter((l) => l.startsWith('+') && !l.startsWith('+++'));
    const why = checkStaged(files, added);
    if (why) {
      console.error(`[미노피아 훅] 커밋을 막았어요: ${why}`);
      process.exit(1);
    }
    return;
  }
  let input = {};
  try {
    input = JSON.parse(readFileSync(0, 'utf8') || '{}');
  } catch {
    return;
  }
  const why = checkTool(input);
  if (why) {
    console.error(`[미노피아 훅] ${why}`);
    process.exit(2);
  }
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop())) main();
