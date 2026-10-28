"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { clearSetupToken, getDb, hasUsers, setupToken } from "@/lib/db";
import { establishSession, type User } from "@/lib/session";
import { clearFails, clientIp, isLocked, recordFail } from "@/lib/ratelimit";

export type SetupState = { error?: string };

function tokenMatches(input: string, expected: string) {
  const a = Buffer.from(input), b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// 첫 계정(마스터) 만들기. 계정이 하나라도 있으면 거부하고(트랜잭션 안에서 다시 확인),
// 서버 로그에 찍힌 설정 토큰이 맞아야 한다.
export async function setupAdmin(_prev: SetupState, form: FormData): Promise<SetupState> {
  if (hasUsers()) return { error: "이미 계정이 있습니다. 로그인 화면으로 이동하세요." };
  const token = String(form.get("token") ?? "").trim();
  const username = String(form.get("username") ?? "").trim();
  const name = String(form.get("name") ?? "").trim() || username;
  const password = String(form.get("password") ?? "");
  const confirm = String(form.get("confirm") ?? "");

  const key = `setup|${clientIp(await headers())}`;
  const locked = isLocked(key);
  if (locked) return { error: `시도가 너무 많습니다. ${Math.ceil(locked / 60)}분 뒤 다시 시도하세요.` };
  const expected = setupToken();
  if (!expected || !tokenMatches(token, expected)) { recordFail(key); return { error: "설정 토큰이 맞지 않습니다. 서버 로그(docker compose logs)나 data/setup-token.txt 를 확인하세요." }; }
  if (!/^[a-z0-9_.-]{3,32}$/i.test(username)) return { error: "아이디는 영문·숫자·._- 3~32자로 입력하세요." };
  if (password.length < 8) return { error: "비밀번호는 8자 이상이어야 합니다." };
  if (password !== confirm) return { error: "비밀번호 확인이 일치하지 않습니다." };

  const hash = await bcrypt.hash(password, 10);
  const db = getDb();
  const created = db.transaction(() => {
    const n = (db.prepare("SELECT COUNT(*) AS n FROM users").get() as { n: number }).n;
    if (n > 0) return null;
    const r = db.prepare("INSERT INTO users (username, name, password_hash, role) VALUES (?, ?, ?, 'master')").run(username, name, hash);
    return db.prepare("SELECT id, username, name, role, session_version FROM users WHERE id = ?").get(r.lastInsertRowid) as User;
  })();
  if (!created) return { error: "이미 계정이 있습니다. 로그인 화면으로 이동하세요." };
  clearFails(key);
  clearSetupToken();
  await establishSession(created);
  redirect("/");
}
