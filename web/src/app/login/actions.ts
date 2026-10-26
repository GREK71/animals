"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { establishSession, getSession, verifyPassword } from "@/lib/session";
import { clearFails, clientIp, isLocked, loginKey, recordFail, safeNext } from "@/lib/ratelimit";

export type LoginState = { error?: string };

export async function login(_prev: LoginState, form: FormData): Promise<LoginState> {
  const username = String(form.get("username") ?? "").trim();
  const password = String(form.get("password") ?? "");
  const next = safeNext(String(form.get("next") ?? "/"));
  if (!username || !password) return { error: "아이디와 비밀번호를 입력하세요." };
  const key = loginKey(clientIp(await headers()), username);
  const locked = isLocked(key);
  if (locked) return { error: `시도가 너무 많습니다. ${Math.ceil(locked / 60)}분 뒤 다시 시도하세요.` };
  const user = await verifyPassword(username, password);
  if (!user) { recordFail(key); return { error: "아이디 또는 비밀번호가 맞지 않습니다." }; }
  clearFails(key);
  await establishSession(user);
  redirect(next);
}

export async function logout() {
  const session = await getSession();
  session.destroy();
  redirect("/login");
}
