"use server";

import { revalidatePath } from "next/cache";
import { all, getDb, one, put } from "@/lib/db";
import { deleteFile, saveUpload } from "@/lib/files";
import { generateShotPrompt as generate } from "@/lib/prompts";
import { requireAdmin, requireUser } from "@/lib/session";
import type { Shot, ShotPrompt, StoredFile } from "@/lib/types";
import type { UploadState } from "../../characters/[id]/actions";

export type PromptState = { error?: string; ok?: string };

// MAX(v)+1 조회와 저장을 한 트랜잭션으로 묶어 동시 저장이 같은 버전을 덮어쓰지 않게 한다.
function savePromptVersion(shotId: string, data: Omit<ShotPrompt, "shotId" | "v">) {
  return getDb().transaction(() => {
    const v = all<ShotPrompt>("shot_prompts", { col: "shot_id", val: shotId }).reduce((m, p) => Math.max(m, p.v), 0) + 1;
    put("shot_prompts", `${shotId}-p${v}`, { shotId, v, ...data } satisfies ShotPrompt, { shot_id: shotId });
    return v;
  })();
}

// 샷 시작 프레임 업로드 (힉스필드에서 확정한 키프레임)
export async function uploadShotFrame(_prev: UploadState, form: FormData): Promise<UploadState> {
  const me = await requireUser();
  const shotId = String(form.get("shotId") ?? "");
  const shot = one<Shot>("shots", shotId);
  if (!shot) return { error: "샷을 찾을 수 없습니다." };
  const files = form.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) return { error: "파일을 선택하세요." };
  let ok = 0;
  for (const f of files) {
    const r = await saveUpload(f, { type: "shot", id: shotId, slot: "start" }, me.name);
    if (!r.ok) { revalidatePath(`/episodes/${shot.episodeId}`); return { error: r.error, ok }; }
    ok++;
  }
  revalidatePath(`/episodes/${shot.episodeId}`);
  return { ok };
}

export async function deleteShotFile(form: FormData) {
  await requireUser();
  const id = String(form.get("id") ?? "");
  const f = one<StoredFile>("files", id);
  if (!f || f.ownerType !== "shot") return;
  const shot = one<Shot>("shots", f.ownerId);
  deleteFile(id);
  if (shot) revalidatePath(`/episodes/${shot.episodeId}`);
}

// AI로 씬 프롬프트 생성 → 새 버전으로 저장. 유료 호출이므로 관리자 이상만.
export async function generateShotPrompt(_prev: PromptState, form: FormData): Promise<PromptState> {
  const me = await requireAdmin();
  const shotId = String(form.get("shotId") ?? "");
  const direction = String(form.get("direction") ?? "").trim().slice(0, 2000);
  const shot = one<Shot>("shots", shotId);
  if (!shot) return { error: "샷을 찾을 수 없습니다." };
  const r = await generate(shotId, direction);
  if (!r.ok) return { error: r.error };
  const v = savePromptVersion(shotId, { brief: r.output.brief_ko, keyframe: r.output.keyframe_en, motion: r.output.motion_en, notes: r.output.notes_ko, direction, source: "ai", model: r.model, at: new Date().toISOString(), by: me.name });
  revalidatePath(`/episodes/${shot.episodeId}`);
  return { ok: `v${v} 생성 완료 (${r.model})${r.skipped.length ? ` · 제외된 이미지: ${r.skipped.join(", ")}` : ""}` };
}

// 손으로 고친 프롬프트를 새 버전으로 저장
export async function saveShotPrompt(_prev: PromptState, form: FormData): Promise<PromptState> {
  const me = await requireUser();
  const shotId = String(form.get("shotId") ?? "");
  const shot = one<Shot>("shots", shotId);
  if (!shot) return { error: "샷을 찾을 수 없습니다." };
  const keyframe = String(form.get("keyframe") ?? "").trim();
  const motion = String(form.get("motion") ?? "").trim();
  if (!keyframe && !motion) return { error: "키프레임이나 모션 프롬프트 중 하나는 있어야 합니다." };
  const v = savePromptVersion(shotId, { brief: String(form.get("brief") ?? "").trim(), keyframe, motion, notes: String(form.get("notes") ?? "").trim(), direction: "", source: "edit", at: new Date().toISOString(), by: me.name });
  revalidatePath(`/episodes/${shot.episodeId}`);
  return { ok: `v${v} 저장 완료` };
}
