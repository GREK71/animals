"use server";

import { revalidatePath } from "next/cache";
import { one } from "@/lib/db";
import { deleteFile, saveUpload } from "@/lib/files";
import { requireUser } from "@/lib/session";
import type { Character, StoredFile } from "@/lib/types";

export type UploadState = { error?: string; ok?: number };

// 캐릭터 레퍼런스 슬롯에 이미지 업로드 (여러 장 가능)
export async function uploadCharacterFiles(_prev: UploadState, form: FormData): Promise<UploadState> {
  const me = await requireUser();
  const charId = String(form.get("characterId") ?? "");
  const slot = String(form.get("slot") ?? "").trim();
  const c = one<Character>("characters", charId);
  if (!c) return { error: "캐릭터를 찾을 수 없습니다." };
  if (!c.slots.some((s) => s.role === slot)) return { error: "알 수 없는 슬롯입니다." };
  const files = form.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) return { error: "파일을 선택하세요." };
  let ok = 0;
  for (const f of files) {
    const r = await saveUpload(f, { type: "character", id: charId, slot }, me.name);
    if (!r.ok) { revalidatePath(`/characters/${charId}`); return { error: r.error, ok }; }
    ok++;
  }
  revalidatePath(`/characters/${charId}`);
  return { ok };
}

export async function deleteCharacterFile(form: FormData) {
  await requireUser();
  const id = String(form.get("id") ?? "");
  const f = one<StoredFile>("files", id);
  if (!f || f.ownerType !== "character") return;
  deleteFile(id);
  revalidatePath(`/characters/${f.ownerId}`);
}
