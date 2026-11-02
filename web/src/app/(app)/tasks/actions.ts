"use server";

import { revalidatePath } from "next/cache";
import { getDb, logActivity, one, put } from "@/lib/db";
import { requireUser } from "@/lib/session";
import type { Task } from "@/lib/types";

const STATUSES = new Set(["todo", "doing", "review", "done"]);
const PRIORITIES = new Set(["high", "normal", "low"]);
const STATUS_NAMES: Record<Task["status"], string> = { todo: "할 일", doing: "진행 중", review: "검토", done: "완료" };

function userById(id: number) {
  return getDb().prepare("SELECT id, name FROM users WHERE id = ?").get(id) as { id: number; name: string } | undefined;
}

function refresh() {
  revalidatePath("/tasks");
  revalidatePath("/");
}

export async function addTask(form: FormData) {
  const me = await requireUser();
  const title = String(form.get("title") ?? "").trim();
  if (!title) return;
  const assigneeId = Number(form.get("assigneeId")) || undefined;
  const assignee = assigneeId ? userById(assigneeId) : undefined;
  const priorityIn = String(form.get("priority") ?? "normal");
  const priority = PRIORITIES.has(priorityIn) ? priorityIn as Task["priority"] : "normal";
  const linkIn = String(form.get("link") ?? "").trim();
  const link = linkIn.startsWith("/") && !linkIn.startsWith("//") ? linkIn : undefined;
  const now = new Date().toISOString();
  const id = `t${Date.now().toString(36)}`;
  put("tasks", id, {
    title,
    note: String(form.get("note") ?? "").trim(),
    status: "todo",
    priority,
    assigneeId: assignee?.id,
    assigneeName: assignee?.name,
    link,
    createdBy: me.id,
    createdByName: me.name,
    createdAt: now,
    updatedByName: me.name,
    updatedAt: now,
  });
  logActivity(me, "task", `“${title}” 작업을 만들었습니다`, `/tasks#${id}`);
  refresh();
}

export async function updateTask(form: FormData) {
  const me = await requireUser();
  const id = String(form.get("id") ?? "");
  const task = one<Task>("tasks", id);
  if (!task) return;
  const statusIn = String(form.get("status") ?? task.status);
  const priorityIn = String(form.get("priority") ?? task.priority);
  const status = STATUSES.has(statusIn) ? statusIn as Task["status"] : task.status;
  const priority = PRIORITIES.has(priorityIn) ? priorityIn as Task["priority"] : task.priority;
  const assigneeId = Number(form.get("assigneeId")) || undefined;
  const assignee = assigneeId ? userById(assigneeId) : undefined;
  const { id: _id, ...data } = task;
  void _id;
  put("tasks", id, { ...data, status, priority, assigneeId: assignee?.id, assigneeName: assignee?.name, updatedByName: me.name, updatedAt: new Date().toISOString() });
  const change = status !== task.status ? `상태를 ${STATUS_NAMES[status]}로 변경했습니다` : assignee?.id !== task.assigneeId ? `${assignee?.name ?? "미지정"}에게 배정했습니다` : "작업 정보를 수정했습니다";
  logActivity(me, "task", `“${task.title}” ${change}`, `/tasks#${id}`);
  refresh();
}

export async function claimTask(form: FormData) {
  const me = await requireUser();
  const id = String(form.get("id") ?? "");
  const task = one<Task>("tasks", id);
  if (!task) return;
  const { id: _id, ...data } = task;
  void _id;
  put("tasks", id, { ...data, assigneeId: me.id, assigneeName: me.name, status: task.status === "todo" ? "doing" : task.status, updatedByName: me.name, updatedAt: new Date().toISOString() });
  logActivity(me, "task", `“${task.title}” 작업을 맡았습니다`, `/tasks#${id}`);
  refresh();
}
