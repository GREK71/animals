"use server";

import crypto from "node:crypto";
import path from "node:path";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getDb, logActivity, one, put } from "@/lib/db";
import { requireUser } from "@/lib/session";
import type { ArchiveDocument, DocumentVersion } from "@/lib/types";

const MAX_MARKDOWN = 2 * 1024 * 1024;
const CATEGORIES = new Set(["episode", "asset", "character", "setting", "note"]);
const STATUSES = new Set(["draft", "review", "qa", "published"]);

function slugify(text: string) {
  return text.toLowerCase().trim().replace(/[^a-z0-9가-힣]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || "document";
}

function parseMarkdown(text: string, filename: string) {
  const normalized = text.replace(/\r\n/g, "\n").replace(/^\uFEFF/, "");
  const meta: Record<string, string> = {};
  let content = normalized;
  const frontmatter = normalized.match(/^---\n([\s\S]*?)\n---\n?/);
  if (frontmatter) {
    for (const line of frontmatter[1].split("\n")) {
      const match = line.match(/^([a-zA-Z_]+):\s*(.*)$/);
      if (match) meta[match[1].toLowerCase()] = match[2].replace(/^['"]|['"]$/g, "").trim();
    }
    content = normalized.slice(frontmatter[0].length);
  }
  const firstHeading = content.match(/^#\s+(.+)$/m)?.[1]?.trim();
  const fallback = path.basename(filename, path.extname(filename)).replace(/[-_]+/g, " ");
  const title = (meta.title || firstHeading || fallback || "제목 없는 문서").slice(0, 120);
  const category = CATEGORIES.has(meta.category) ? meta.category as ArchiveDocument["category"] : "note";
  return { title, category, content: content.trim() + "\n" };
}

function userById(id: number) {
  return getDb().prepare("SELECT id, name FROM users WHERE id = ?").get(id) as { id: number; name: string } | undefined;
}

export async function importMarkdown(form: FormData) {
  const me = await requireUser();
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0 || file.size > MAX_MARKDOWN || !file.name.toLowerCase().endsWith(".md")) redirect("/documents?error=file");
  const buf = Buffer.from(await file.arrayBuffer());
  if (buf.includes(0)) redirect("/documents?error=file");
  const parsed = parseMarkdown(buf.toString("utf8"), file.name);
  const now = new Date().toISOString();
  const id = `d${crypto.randomBytes(6).toString("hex")}`;
  const doc: ArchiveDocument = { ...parsed, slug: slugify(parsed.title), status: "draft", version: 1, sourceName: path.basename(file.name).slice(0, 120), createdBy: me.id, createdByName: me.name, createdAt: now, updatedByName: me.name, updatedAt: now };
  put("documents", id, doc);
  put("document_versions", `${id}-v1`, { documentId: id, version: 1, content: doc.content, at: now, by: me.name, memo: "Markdown 가져오기" } satisfies DocumentVersion, { document_id: id });
  logActivity(me, "document", `“${doc.title}” 문서를 가져왔습니다`, `/documents/${id}`);
  revalidatePath("/documents");
  revalidatePath("/");
  redirect(`/documents/${id}`);
}

export async function createDocument(form: FormData) {
  const me = await requireUser();
  const title = String(form.get("title") ?? "").trim().slice(0, 120);
  if (!title) redirect("/documents?error=empty");
  const categoryIn = String(form.get("category") ?? "note");
  const category = CATEGORIES.has(categoryIn) ? categoryIn as ArchiveDocument["category"] : "note";
  const now = new Date().toISOString();
  const id = `d${crypto.randomBytes(6).toString("hex")}`;
  const content = `# ${title}\n\n내용을 작성하세요.\n`;
  const doc: ArchiveDocument = { title, slug: slugify(title), category, content, status: "draft", version: 1, createdBy: me.id, createdByName: me.name, createdAt: now, updatedByName: me.name, updatedAt: now };
  put("documents", id, doc);
  put("document_versions", `${id}-v1`, { documentId: id, version: 1, content, at: now, by: me.name, memo: "빈 문서 생성" } satisfies DocumentVersion, { document_id: id });
  logActivity(me, "document", `“${title}” 문서를 만들었습니다`, `/documents/${id}`);
  revalidatePath("/documents");
  redirect(`/documents/${id}?edit=1`);
}

export async function saveDocument(form: FormData) {
  const me = await requireUser();
  const id = String(form.get("id") ?? "");
  const current = one<ArchiveDocument>("documents", id);
  if (!current) redirect("/documents");
  const expectedVersion = Number(form.get("version"));
  if (current.version !== expectedVersion) redirect(`/documents/${id}?conflict=1`);
  const title = String(form.get("title") ?? "").trim().slice(0, 120);
  const content = String(form.get("content") ?? "").replace(/\r\n/g, "\n").slice(0, MAX_MARKDOWN);
  if (!title || !content.trim()) redirect(`/documents/${id}?error=empty`);
  const categoryIn = String(form.get("category") ?? current.category);
  const statusIn = String(form.get("status") ?? current.status);
  const category = CATEGORIES.has(categoryIn) ? categoryIn as ArchiveDocument["category"] : current.category;
  const status = STATUSES.has(statusIn) ? statusIn as ArchiveDocument["status"] : current.status;
  const assigneeId = Number(form.get("assigneeId")) || undefined;
  const assignee = assigneeId ? userById(assigneeId) : undefined;
  const version = current.version + 1;
  const now = new Date().toISOString();
  const { id: _id, ...data } = current;
  void _id;
  const updated: ArchiveDocument = { ...data, title, slug: slugify(title), category, content, status, version, assigneeId: assignee?.id, assigneeName: assignee?.name, updatedByName: me.name, updatedAt: now };
  put("documents", id, updated);
  put("document_versions", `${id}-v${version}`, { documentId: id, version, content, at: now, by: me.name, memo: String(form.get("memo") ?? "").trim() || "웹 편집" } satisfies DocumentVersion, { document_id: id });
  logActivity(me, "document", `“${title}” 문서를 v${version}으로 저장했습니다`, `/documents/${id}`);
  revalidatePath(`/documents/${id}`);
  revalidatePath("/documents");
  revalidatePath("/");
  redirect(`/documents/${id}?saved=${version}`);
}
