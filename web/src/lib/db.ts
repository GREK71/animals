import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { seedAll } from "./seed";

// 문서형 저장소: 각 테이블은 id + JSON data. 부모 참조는 별도 컬럼으로 둔다.
const DOC_TABLES: Record<string, string[]> = {
  characters: [],
  places: [],
  episodes: [],
  shots: ["episode_id"],
  runs: ["shot_id"],
  variants: ["run_id"],
  assets: [],
  issues: [],
  prompt_versions: ["owner_type", "owner_id"],
  relation_changes: ["episode_id"],
};

declare global {
  // eslint-disable-next-line no-var
  var __ahdb: Database.Database | undefined;
}

export function dataDir() {
  return process.env.DATA_DIR || path.join(process.cwd(), "data");
}

function open() {
  const dir = dataDir();
  fs.mkdirSync(dir, { recursive: true });
  const db = new Database(path.join(dir, "archive.sqlite"));
  db.pragma("journal_mode = WAL");
  db.exec(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'member',
    session_version INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`);
  migrateUsers(db);
  for (const [table, refs] of Object.entries(DOC_TABLES)) {
    const cols = refs.map((r) => `${r} TEXT`).concat(["data TEXT NOT NULL"]).join(", ");
    db.exec(`CREATE TABLE IF NOT EXISTS ${table} (id TEXT PRIMARY KEY, ${cols}, updated_at TEXT NOT NULL DEFAULT (datetime('now')))`);
    for (const r of refs) db.exec(`CREATE INDEX IF NOT EXISTS idx_${table}_${r} ON ${table}(${r})`);
  }
  seedIfEmpty(db);
  return db;
}

// 이전 스키마(role·session_version 없음)에서 올라온 DB를 맞춘다.
function migrateUsers(db: Database.Database) {
  const cols = (db.prepare("PRAGMA table_info(users)").all() as { name: string }[]).map((c) => c.name);
  if (!cols.includes("role")) db.exec("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'member'");
  if (!cols.includes("session_version")) db.exec("ALTER TABLE users ADD COLUMN session_version INTEGER NOT NULL DEFAULT 1");
  // 마스터는 정확히 하나. 없으면 가장 이른 관리자(없으면 가장 이른 계정)를 승격하고,
  // 둘 이상이면 가장 이른 하나만 남기고 관리자로 내린다. 부분 유니크 인덱스로 DB에서도 보장한다.
  const masters = (db.prepare("SELECT COUNT(*) AS n FROM users WHERE role = 'master'").get() as { n: number }).n;
  if (masters === 0) {
    db.exec(`UPDATE users SET role = 'master' WHERE id = COALESCE(
      (SELECT MIN(id) FROM users WHERE role = 'admin'), (SELECT MIN(id) FROM users))`);
  } else if (masters > 1) {
    db.exec("UPDATE users SET role = 'admin' WHERE role = 'master' AND id != (SELECT MIN(id) FROM users WHERE role = 'master')");
  }
  db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_single_master ON users(role) WHERE role = 'master'");
}

function seedIfEmpty(db: Database.Database) {
  const userCount = (db.prepare("SELECT COUNT(*) AS n FROM users").get() as { n: number }).n;
  if (userCount === 0) {
    const username = process.env.ADMIN_USERNAME || "admin";
    const password = process.env.ADMIN_PASSWORD;
    if (password) {
      db.prepare("INSERT INTO users (username, name, password_hash, role) VALUES (?, ?, ?, 'master')").run(username, "운영자", bcrypt.hashSync(password, 10));
    } else {
      // 계정이 없으면 /setup 화면에서 첫 관리자를 만든다. 아무나 선점하지 못하도록 일회용 토큰을 요구한다.
      const token = ensureSetupToken();
      console.log(`[archive] 계정이 없습니다. 브라우저에서 /setup 을 열고 설정 토큰을 입력해 첫 관리자 계정을 만드세요.\n[archive] 설정 토큰: ${token}  (파일: ${setupTokenPath()})`);
    }
  }
  const charCount = (db.prepare("SELECT COUNT(*) AS n FROM characters").get() as { n: number }).n;
  if (charCount === 0 && process.env.SEED_EXAMPLES !== "false") {
    seedAll(db);
    console.log("[archive] 예시 데이터를 넣었습니다.");
  }
}

function setupTokenPath() {
  return path.join(dataDir(), "setup-token.txt");
}

function ensureSetupToken() {
  const p = setupTokenPath();
  try {
    const t = fs.readFileSync(p, "utf8").trim();
    if (t) return t;
  } catch { /* 없으면 새로 만든다 */ }
  const t = crypto.randomBytes(16).toString("hex");
  fs.writeFileSync(p, t + "\n", { mode: 0o600 });
  return t;
}

// 첫 관리자 등록에 필요한 토큰. 계정이 생기면 null.
export function setupToken(): string | null {
  if (hasUsers()) return null;
  return ensureSetupToken();
}

export function clearSetupToken() {
  fs.rmSync(setupTokenPath(), { force: true });
}

export function hasUsers() {
  return (getDb().prepare("SELECT COUNT(*) AS n FROM users").get() as { n: number }).n > 0;
}

export function getDb() {
  if (!global.__ahdb) global.__ahdb = open();
  return global.__ahdb;
}

// ---- 문서 헬퍼 ----
export type Doc<T> = T & { id: string };

export function all<T>(table: string, where?: { col: string; val: string }, orderJsonKey?: string): Doc<T>[] {
  const db = getDb();
  const sql = `SELECT id, data FROM ${table}` + (where ? ` WHERE ${where.col} = ?` : "");
  const rows = (where ? db.prepare(sql).all(where.val) : db.prepare(sql).all()) as { id: string; data: string }[];
  const docs = rows.map((r) => ({ ...(JSON.parse(r.data) as T), id: r.id }));
  if (orderJsonKey) docs.sort((a, b) => String((a as Record<string, unknown>)[orderJsonKey] ?? "").localeCompare(String((b as Record<string, unknown>)[orderJsonKey] ?? ""), "ko"));
  return docs;
}

export function one<T>(table: string, id: string): Doc<T> | null {
  const row = getDb().prepare(`SELECT id, data FROM ${table} WHERE id = ?`).get(id) as { id: string; data: string } | undefined;
  return row ? { ...(JSON.parse(row.data) as T), id: row.id } : null;
}

export function put(table: string, id: string, data: object, refs: Record<string, string> = {}) {
  const refCols = Object.keys(refs);
  const cols = ["id", ...refCols, "data", "updated_at"];
  const sql = `INSERT INTO ${table} (${cols.join(",")}) VALUES (${cols.map(() => "?").join(",")})
    ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at` +
    refCols.map((c) => `, ${c} = excluded.${c}`).join("");
  getDb().prepare(sql).run(id, ...refCols.map((c) => refs[c]), JSON.stringify(data), new Date().toISOString());
}

export function count(table: string) {
  return (getDb().prepare(`SELECT COUNT(*) AS n FROM ${table}`).get() as { n: number }).n;
}

// WAL 모드에서도 일관된 스냅샷을 만든다. VACUUM INTO는 커밋된 모든 변경을 포함한 단일 파일을 쓴다.
export function backupDatabase() {
  const dir = path.join(dataDir(), "backups");
  fs.mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15);
  const file = path.join(dir, `archive-${stamp}.sqlite`);
  getDb().exec(`VACUUM INTO '${file.replace(/'/g, "''")}'`);
  // 최근 14개만 보관
  const old = fs.readdirSync(dir).filter((f) => f.startsWith("archive-") && f.endsWith(".sqlite")).sort().slice(0, -14);
  for (const f of old) fs.rmSync(path.join(dir, f));
  return file;
}

export function listBackups() {
  const dir = path.join(dataDir(), "backups");
  if (!fs.existsSync(dir)) return [] as { name: string; size: number; mtime: string }[];
  return fs.readdirSync(dir).filter((f) => f.endsWith(".sqlite")).sort().reverse().map((name) => {
    const st = fs.statSync(path.join(dir, name));
    return { name, size: st.size, mtime: st.mtime.toISOString() };
  });
}

