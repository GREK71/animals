import { cookies } from "next/headers";
import { getIronSession, type SessionOptions } from "iron-session";
import { redirect } from "next/navigation";
import { cache } from "react";
import bcrypt from "bcryptjs";
import { getDb } from "./db";

export type SessionData = { userId?: number; sv?: number };
export type Role = "master" | "admin" | "member";
export type User = { id: number; username: string; name: string; role: Role; session_version: number };

// 마스터 > 관리자 > 멤버. 마스터는 첫 계정 하나뿐이며 관리자가 손댈 수 없다.
export function canManage(u: User) {
  return u.role === "master" || u.role === "admin";
}

export function roleLabel(role: string) {
  return role === "master" ? "마스터" : role === "admin" ? "관리자" : "멤버";
}

export const COOKIE_NAME = "ah_session";

function secret() {
  const s = process.env.SESSION_SECRET;
  if (s && s.length >= 32) return s;
  if (process.env.NODE_ENV === "production") throw new Error("SESSION_SECRET(32자 이상)이 필요합니다.");
  return "dev-only-session-secret-change-me-please-0000";
}

export function sessionOptions(): SessionOptions {
  return {
    password: secret(),
    cookieName: COOKIE_NAME,
    cookieOptions: { httpOnly: true, sameSite: "lax", secure: process.env.COOKIE_SECURE === "true", maxAge: 60 * 60 * 24 * 14 },
  };
}

export async function getSession() {
  return getIronSession<SessionData>(await cookies(), sessionOptions());
}

export async function establishSession(user: User) {
  const s = await getSession();
  s.userId = user.id;
  s.sv = user.session_version;
  await s.save();
}

const COLS = "id, username, name, role, session_version";

// 세션 쿠키의 userId와 session_version이 DB와 맞을 때만 로그인으로 본다.
export const currentUser = cache(async (): Promise<User | null> => {
  const s = await getSession();
  if (!s.userId) return null;
  const row = getDb().prepare(`SELECT ${COLS} FROM users WHERE id = ?`).get(s.userId) as User | undefined;
  if (!row || row.session_version !== (s.sv ?? 0)) return null;
  return row;
});

export async function requireUser() {
  const u = await currentUser();
  if (!u) redirect("/login");
  return u;
}

// 계정·백업 관리 권한: 마스터 또는 관리자
export async function requireAdmin() {
  const u = await requireUser();
  if (!canManage(u)) redirect("/");
  return u;
}

export async function verifyPassword(username: string, password: string): Promise<User | null> {
  const row = getDb().prepare(`SELECT ${COLS}, password_hash FROM users WHERE username = ?`).get(username) as (User & { password_hash: string }) | undefined;
  // 아이디가 없어도 같은 시간이 걸리도록 더미 해시와 비교
  const hash = row?.password_hash ?? "$2a$10$CwTycUXWue0Thq9StjUM0uJ8m4yq4xkqmQ1uC0W6l3Q2Z3jGQh6yq";
  const ok = await bcrypt.compare(password, hash);
  if (!row || !ok) return null;
  const { password_hash: _ph, ...user } = row;
  void _ph;
  return user;
}
