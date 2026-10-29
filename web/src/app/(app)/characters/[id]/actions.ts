"use server";

import { revalidatePath } from "next/cache";
import { one } from "@/lib/db";
import { deleteFile, filesFor, saveUpload } from "@/lib/files";
import { requireAdmin, requireUser } from "@/lib/session";
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

// ---- 캐릭터 직접 입력·수정 ----
import { redirect } from "next/navigation";
import { all, put, remove } from "@/lib/db";
import type { PromptVersion } from "@/lib/types";

export type CharacterFormState = { error?: string };

const DEFAULT_SLOTS: Character["slots"] = [
  { role: "얼굴 앵커", file: "미등록", status: "미등록", empty: true },
  { role: "캐릭터 시트", file: "미등록", status: "미등록", empty: true },
  { role: "Soul ID 학습 세트", file: "다각도 스틸 20~80장", status: "미학습", empty: true, note: "0 / 20" },
  { role: "동물형 앵커", file: "미등록", status: "미등록", empty: true },
];
const COLORS = ["#2e3236", "#c8a44a", "#6b7a8f", "#8c5a3c", "#4e6e59", "#7b5c8f", "#b8604a", "#3f74a8"];

const lines = (v: FormDataEntryValue | null) => String(v ?? "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
const commas = (v: FormDataEntryValue | null) => String(v ?? "").split(/[,\n]/).map((l) => l.trim()).filter(Boolean);
const str = (v: FormDataEntryValue | null, max = 200) => String(v ?? "").trim().slice(0, max);

// URL·Location 헤더에 안전하도록 ASCII만. 한글 이름이면 "c-" 접두에 시간값.
function slugify(name: string) {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 24);
  return (base || "c") + "-" + Date.now().toString(36).slice(-5);
}

// 새 캐릭터(id === "new") 또는 기존 캐릭터 저장. 슬롯·관계·업로드는 그대로 두고 설정 필드만 바꾼다.
export async function saveCharacter(_prev: CharacterFormState, form: FormData): Promise<CharacterFormState> {
  await requireUser();
  const idIn = str(form.get("id"), 64);
  const name = str(form.get("name"), 40);
  if (!name) return { error: "이름은 꼭 넣어야 합니다." };
  const age = Number(form.get("age"));
  if (!Number.isFinite(age) || age < 0 || age > 200) return { error: "나이는 숫자로 넣으세요." };
  const existing = idIn && idIn !== "new" ? one<Character>("characters", idIn) : null;
  if (idIn && idIn !== "new" && !existing) return { error: "캐릭터를 찾을 수 없습니다." };
  const id = existing ? existing.id : slugify(name);
  if (!existing && all<Character>("characters").some((c) => c.name === name)) return { error: "같은 이름의 캐릭터가 이미 있습니다." };

  const honorifics = lines(form.get("honorifics")).map((l) => {
    const [to = "", call = "", called = "", tone = ""] = l.split("|").map((x) => x.trim());
    return { to, call, called, tone };
  }).filter((h) => h.to);
  const colorIn = str(form.get("color"), 7);
  const color = /^#[0-9a-f]{6}$/i.test(colorIn) ? colorIn : existing?.color ?? COLORS[all<Character>("characters").length % COLORS.length];
  const ready = { face: form.get("ready_face") === "on", sheet: form.get("ready_sheet") === "on", soul: form.get("ready_soul") === "on", animal: form.get("ready_animal") === "on" };

  const data: Character = {
    name, age, sex: str(form.get("sex"), 10), height: str(form.get("height"), 20), species: str(form.get("species"), 40), role: str(form.get("role"), 40),
    residence: str(form.get("residence"), 80), job: str(form.get("job"), 80), intro: str(form.get("intro"), 400),
    background: lines(form.get("background")), keywords: commas(form.get("keywords")), honorifics,
    habits: commas(form.get("habits")), forbidden: lines(form.get("forbidden")), appearance: lines(form.get("appearance")), refPriority: lines(form.get("refPriority")),
    ready, promptVersion: existing?.promptVersion ?? "—", initial: str(form.get("initial"), 2) || name.slice(-2, -1) || name.slice(0, 1), color,
    soul: { status: str(form.get("soul_status"), 20) || "미학습", setCount: Number(form.get("soul_setCount")) || 0, model: str(form.get("soul_model"), 40) || "—", hfId: str(form.get("soul_hfId"), 80) || "—" },
    slots: existing?.slots ?? DEFAULT_SLOTS,
    relations: existing?.relations ?? [],
  };
  put("characters", id, data);
  revalidatePath("/characters");
  revalidatePath(`/characters/${id}`);
  revalidatePath("/");
  redirect(`/characters/${id}`);
}

// 고정 프롬프트 새 버전 저장. 과거 버전은 그대로 두고 current만 옮긴다.
export async function saveFixedPrompt(form: FormData) {
  await requireUser();
  const charId = str(form.get("characterId"), 64);
  const body = String(form.get("body") ?? "").trim().slice(0, 8000);
  const memo = str(form.get("memo"), 200) || "수정";
  const c = one<Character>("characters", charId);
  if (!c || !body) return;
  const versions = all<PromptVersion>("prompt_versions", { col: "owner_id", val: charId });
  const n = versions.reduce((m, v) => Math.max(m, Number(v.v.replace(/\D/g, "")) || 0), 0) + 1;
  const v = `v${n}`;
  for (const old of versions.filter((x) => x.current)) { const { id: oid, ...rest } = old; put("prompt_versions", oid, { ...rest, current: false }, { owner_type: "character", owner_id: charId }); }
  put("prompt_versions", `pv_${charId}_${n}_${Date.now().toString(36)}`, { ownerType: "character", ownerId: charId, v, body, memo, at: new Date().toISOString().slice(0, 10).replace(/-/g, "."), current: true } satisfies PromptVersion, { owner_type: "character", owner_id: charId });
  const { id: _cid, ...cd } = c; void _cid;
  put("characters", charId, { ...cd, promptVersion: v });
  revalidatePath(`/characters/${charId}`);
  revalidatePath("/characters");
}

// 캐릭터 삭제 (관리자 이상). 업로드 파일과 고정 프롬프트 버전도 함께 지운다. 샷·소재의 이름 표기는 그대로 남는다.
export async function deleteCharacter(form: FormData) {
  await requireAdmin();
  const id = str(form.get("id"), 64);
  const c = one<Character>("characters", id);
  if (!c) return;
  for (const f of filesFor("character", id)) deleteFile(f.id);
  for (const v of all<PromptVersion>("prompt_versions", { col: "owner_id", val: id })) remove("prompt_versions", v.id);
  remove("characters", id);
  revalidatePath("/characters");
  revalidatePath("/");
  redirect("/characters");
}
