// 로그인 시도 제한 (프로세스 메모리). 키 = IP + 아이디. 5회 실패 시 10분 잠금.
const WINDOW_MS = 10 * 60 * 1000;
const MAX_FAILS = 5;
const fails = new Map<string, { n: number; until: number }>();

function sweep() {
  const now = Date.now();
  for (const [k, v] of fails) if (v.until < now) fails.delete(k);
}

export function loginKey(ip: string, username: string) {
  return `${ip}|${username.toLowerCase()}`;
}

export function isLocked(key: string) {
  const v = fails.get(key);
  if (!v) return 0;
  if (v.until < Date.now()) { fails.delete(key); return 0; }
  return v.n >= MAX_FAILS ? Math.ceil((v.until - Date.now()) / 1000) : 0;
}

export function recordFail(key: string) {
  if (fails.size > 5000) sweep();
  const v = fails.get(key);
  const until = Date.now() + WINDOW_MS;
  fails.set(key, { n: (v?.n ?? 0) + 1, until });
}

export function clearFails(key: string) {
  fails.delete(key);
}

export function clientIp(headers: Headers) {
  const xf = headers.get("x-forwarded-for");
  return (xf ? xf.split(",")[0] : headers.get("x-real-ip") ?? "local").trim();
}

// 로그인 뒤 돌아갈 경로: 같은 사이트의 절대 경로만 허용
export function safeNext(next: string | null | undefined) {
  if (!next) return "/";
  const n = next.trim();
  if (!/^\/(?![\/\\])/.test(n)) return "/";
  if (/[\\\r\n]/.test(n)) return "/";
  try {
    const u = new URL(n, "http://local");
    if (u.origin !== "http://local") return "/";
    return u.pathname + u.search;
  } catch {
    return "/";
  }
}
