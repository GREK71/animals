export type Ready = { face: boolean; sheet: boolean; soul: boolean; animal: boolean };

export type Character = {
  name: string; age: number; sex: string; height: string; species: string; role: string;
  residence: string; job: string; intro: string; background: string[]; keywords: string[];
  honorifics: { to: string; call: string; called: string; tone: string }[];
  habits: string[]; forbidden: string[]; appearance: string[]; refPriority: string[];
  ready: Ready; promptVersion: string; initial: string; color: string;
  soul: { status: string; setCount: number; model: string; hfId: string };
  slots: { role: string; file: string; status: string; empty?: boolean; note?: string }[];
  relations: { to: string; types: string[]; current: string }[];
};

export type Place = { name: string; group: string; note: string; anchor: boolean; promptVersion: string; short: string; fixed: string[]; variable: string[] };

export type Episode = {
  no: string; title: string; status: "idea" | "plan" | "prod" | "done"; hook: string; summary: string;
  characters: string[]; places: string[]; lighting: string; habits: string[]; series: string; length: string;
  continuity: { text: string; done: boolean }[]; relationNote: string;
  compose?: { shot: string; blocks: { n: string; title: string; version: string; preview: string }[]; refs: { order: string; status: string; label: string; note: string }[]; keyframe: string; motion: string; warning: string };
  publish?: { checklist: { text: string; done: boolean; right: string; bad?: boolean }[]; rows: { platform: string; status: string }[]; caption: string };
  series_list?: { no: string; title: string; active?: boolean }[];
};

export type Shot = { episodeId: string; no: string; title: string; who: string; place: string; length: string; camera: string; subtitle: string; status: "none" | "key" | "cand" | "done"; candidates: number };
export type Run = { shotId: string; n: number; stage: "키프레임" | "영상"; model: string; at: string; note: string };
export type Variant = { runId: string; label: string; note: string; state: "cand" | "pick" | "drop" };
export type Asset = { name: string; kind: string; role: string; status: string; at: string; by: string; note: string; size?: string; hash?: string; source?: string; tool?: string; license?: string; portrait?: string; derive?: string; similarity?: string; links?: string[]; lineage?: { v: string; text: string; at: string }[]; refs?: { v: string; text: string; at: string }[] };
export type Issue = { scope: string; title: string; desc: string; options: string; blocks: string; status: "open" | "warn" | "decided"; decided?: string; decidedAt?: string };
export type PromptVersion = { ownerType: string; ownerId: string; v: string; body: string; memo: string; at: string; current: boolean };
export type RelationChange = { episodeId: string; pair: string; before: string; after: string; memo: string; planned?: boolean };

export const STATUS_LABEL: Record<string, string> = { idea: "아이디어", plan: "기획", prod: "제작 중", done: "게시 완료" };
export const STATUS_CLASS: Record<string, string> = { idea: "", plan: "info", prod: "warn", done: "ok" };
export const SHOT_LABEL: Record<string, string> = { none: "미생성", key: "키프레임 검토", cand: "후보 검토", done: "확정" };
export const SHOT_CLASS: Record<string, string> = { none: "", key: "info", cand: "warn", done: "ok" };
