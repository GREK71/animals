"use server";

import { revalidatePath } from "next/cache";
import { one, put } from "@/lib/db";
import { requireUser } from "@/lib/session";
import type { Issue } from "@/lib/types";

export async function decideIssue(form: FormData) {
  await requireUser();
  const id = String(form.get("id") ?? "");
  const decided = String(form.get("decided") ?? "").trim();
  const memo = String(form.get("memo") ?? "").trim();
  const issue = one<Issue>("issues", id);
  if (!issue || !decided) return;
  const { id: _omit, ...data } = issue;
  void _omit;
  put("issues", id, { ...data, status: "decided", decided: memo ? `${decided} · ${memo}` : decided, decidedAt: new Date().toISOString().slice(0, 10).replace(/-/g, ".") });
  revalidatePath("/issues");
  revalidatePath("/");
}

export async function reopenIssue(form: FormData) {
  await requireUser();
  const id = String(form.get("id") ?? "");
  const issue = one<Issue>("issues", id);
  if (!issue) return;
  const { id: _omit, ...data } = issue;
  void _omit;
  put("issues", id, { ...data, status: "open", decided: undefined, decidedAt: undefined });
  revalidatePath("/issues");
  revalidatePath("/");
}

export async function addIssue(form: FormData) {
  await requireUser();
  const title = String(form.get("title") ?? "").trim();
  if (!title) return;
  const id = "i" + Date.now().toString(36);
  put("issues", id, { scope: String(form.get("scope") ?? "채널"), title, desc: String(form.get("desc") ?? ""), options: String(form.get("options") ?? "—") || "—", blocks: String(form.get("blocks") ?? "—") || "—", status: "open" });
  revalidatePath("/issues");
  revalidatePath("/");
}
