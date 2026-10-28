"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { backupDatabase, getDb } from "@/lib/db";
import { establishSession, requireAdmin, requireUser, type User } from "@/lib/session";

// 계정 추가·삭제는 마스터·관리자만. 만들 수 있는 역할은 관리자/멤버뿐 (마스터는 첫 계정 하나).
export async function addUser(form: FormData) {
  await requireAdmin();
  const username = String(form.get("username") ?? "").trim();
  const name = String(form.get("name") ?? "").trim() || username;
  const password = String(form.get("password") ?? "");
  const role = String(form.get("role") ?? "member") === "admin" ? "admin" : "member";
  if (!/^[a-z0-9_.-]{3,32}$/i.test(username) || password.length < 8) return;
  try {
    getDb().prepare("INSERT INTO users (username, name, password_hash, role) VALUES (?, ?, ?, ?)").run(username, name, await bcrypt.hash(password, 10), role);
  } catch { /* 중복 아이디 */ }
  revalidatePath("/settings");
}

// 마스터 계정은 누구도 지울 수 없다 (관리자는 마스터를 관리하지 못함).
export async function removeUser(form: FormData) {
  const me = await requireAdmin();
  const id = Number(form.get("id"));
  if (!id || id === me.id) return;
  const target = getDb().prepare("SELECT role FROM users WHERE id = ?").get(id) as { role: string } | undefined;
  if (!target || target.role === "master") return;
  getDb().prepare("DELETE FROM users WHERE id = ? AND role != 'master'").run(id);
  revalidatePath("/settings");
}

// 비밀번호를 바꾸면 session_version을 올려 다른 기기의 기존 세션을 끊고, 현재 세션만 새로 발급한다.
export async function changePassword(form: FormData) {
  const me = await requireUser();
  const password = String(form.get("password") ?? "");
  if (password.length < 8) return;
  getDb().prepare("UPDATE users SET password_hash = ?, session_version = session_version + 1 WHERE id = ?").run(await bcrypt.hash(password, 10), me.id);
  const fresh = getDb().prepare("SELECT id, username, name, role, session_version FROM users WHERE id = ?").get(me.id) as User;
  await establishSession(fresh);
  revalidatePath("/settings");
}

export async function makeBackup() {
  await requireAdmin();
  backupDatabase();
  revalidatePath("/settings");
}
