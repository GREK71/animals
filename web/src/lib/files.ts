import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { all, one, put, remove, uploadsDir, type Doc } from "./db";
import type { StoredFile } from "./types";

export const IMAGE_TYPES: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };
export const MAX_UPLOAD = 20 * 1024 * 1024;

export function filesFor(ownerType: StoredFile["ownerType"], ownerId: string): Doc<StoredFile>[] {
  return all<StoredFile>("files", { col: "owner_id", val: ownerId }).filter((f) => f.ownerType === ownerType).sort((a, b) => a.at.localeCompare(b.at));
}

export function filePath(f: Pick<StoredFile, "ext"> & { id: string }) {
  return path.join(uploadsDir(), `${f.id}.${f.ext}`);
}

// 업로드 검증 후 디스크와 files 테이블에 저장. 실패 사유는 문자열로 돌려준다.
export async function saveUpload(file: File, owner: { type: StoredFile["ownerType"]; id: string; slot: string }, by: string): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const ext = IMAGE_TYPES[file.type];
  if (!ext) return { ok: false, error: `지원하지 않는 형식입니다 (${file.type || "알 수 없음"}). PNG, JPG, WEBP만 올릴 수 있습니다.` };
  if (file.size === 0) return { ok: false, error: "빈 파일입니다." };
  if (file.size > MAX_UPLOAD) return { ok: false, error: "20MB를 넘는 파일은 올릴 수 없습니다." };
  const id = "f" + crypto.randomBytes(6).toString("hex");
  const buf = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(/*turbopackIgnore: true*/ path.join(uploadsDir(), `${id}.${ext}`), buf, { mode: 0o600 });
  const name = path.basename(file.name || `upload.${ext}`).replace(/[\r\n]/g, "").slice(0, 120);
  put("files", id, { ownerType: owner.type, ownerId: owner.id, slot: owner.slot, name, mime: file.type, size: file.size, ext, at: new Date().toISOString(), by } satisfies StoredFile, { owner_type: owner.type, owner_id: owner.id });
  return { ok: true, id };
}

export function deleteFile(id: string) {
  const f = one<StoredFile>("files", id);
  if (!f) return;
  fs.rmSync(/*turbopackIgnore: true*/ filePath(f), { force: true });
  remove("files", id);
}

export function readFileBase64(f: Doc<StoredFile>) {
  return fs.readFileSync(/*turbopackIgnore: true*/ filePath(f)).toString("base64");
}
