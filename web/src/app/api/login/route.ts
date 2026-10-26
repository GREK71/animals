import { NextResponse } from "next/server";
import { establishSession, verifyPassword } from "@/lib/session";
import { clearFails, clientIp, isLocked, loginKey, recordFail } from "@/lib/ratelimit";

// 스크립트·점검용 로그인 엔드포인트. 화면은 서버 액션(login)을 쓴다. 제한 정책은 동일.
export async function POST(req: Request) {
  const ct = req.headers.get("content-type") ?? "";
  let username = "", password = "";
  if (ct.includes("application/json")) {
    const body = (await req.json().catch(() => ({}))) as { username?: string; password?: string };
    username = body.username ?? ""; password = body.password ?? "";
  } else {
    const form = await req.formData();
    username = String(form.get("username") ?? ""); password = String(form.get("password") ?? "");
  }
  username = username.trim();
  if (!username || !password) return NextResponse.json({ ok: false, error: "아이디와 비밀번호를 입력하세요." }, { status: 400 });
  const key = loginKey(clientIp(req.headers), username);
  const locked = isLocked(key);
  if (locked) return NextResponse.json({ ok: false, error: "시도가 너무 많습니다.", retryAfter: locked }, { status: 429, headers: { "retry-after": String(locked) } });
  const user = await verifyPassword(username, password);
  if (!user) { recordFail(key); return NextResponse.json({ ok: false, error: "아이디 또는 비밀번호가 맞지 않습니다." }, { status: 401 }); }
  clearFails(key);
  await establishSession(user);
  return NextResponse.json({ ok: true, user: { username: user.username, name: user.name, role: user.role } });
}
