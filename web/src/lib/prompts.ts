import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { all, one, type Doc } from "./db";
import { filesFor, readFileBase64 } from "./files";
import { mentions } from "./names";
import type { Character, Episode, Place, PromptVersion, Shot, ShotPrompt, StoredFile } from "./types";

export const PROMPT_MODEL = "claude-opus-5-5";
const MAX_IMAGE_BYTES = 4_500_000; // API 이미지 한도(5MB) 아래로
const MAX_IMAGES = 4; // 요청당 이미지 장수
const MAX_TOTAL_BYTES = 12_000_000; // 요청당 이미지 합계

const Output = z.object({
  brief_ko: z.string().describe("한국어 장면 브리프. '장면 / 행동 / 감정과 반응 / 카메라 / 영상 길이' 다섯 줄, 기획 확인용"),
  keyframe_en: z.string().describe("힉스필드 Soul 2.0 키프레임(스틸) 생성용 영어 프롬프트 한 문단. 정체성 → 장소 → 자세·표정(모션 직전의 정지 순간) → 카메라 → 규격 순"),
  motion_en: z.string().describe("Kling 3.0 이미지→영상용 영어 모션 프롬프트. 외형 서술 없이 움직임·표정 변화·카메라 움직임·길이만. 시작 프레임과 얼굴·머리·의상 동일 유지 문구 포함"),
  notes_ko: z.string().describe("한국어 제작 메모 2~4줄: 연속성 주의점, 레퍼런스 첨부 권장, 실패하기 쉬운 부분"),
});
export type PromptOutput = z.infer<typeof Output>;

const SYSTEM = `당신은 숏폼(인스타그램 릴스·유튜브 쇼츠) AI 영상 제작 파이프라인의 프롬프트 작가다.
파이프라인은 힉스필드(Higgsfield) 2단계다.
1단계 키프레임: Soul 2.0 (또는 Soul Cinema)로 세로 9:16 스틸을 만든다. 캐릭터의 Soul ID 또는 얼굴·캐릭터 시트 레퍼런스 이미지를 첨부한다.
2단계 영상: Kling 3.0 이미지→영상. 1단계 키프레임을 시작 프레임으로 넣고 모션 프롬프트만 준다.

작성 원칙:
- 영어 프롬프트가 실제 입력이다. 구체적인 명사와 동사, 짧은 문장. 추상적 형용사와 감상 금지.
- 캐릭터는 인간형. 동물 귀·꼬리·털·주둥이 같은 동물 특징은 절대 넣지 않는다. 수인다움은 시선, 자세, 반응 속도, 표정 습관으로만 표현한다.
- 첨부된 얼굴 앵커·캐릭터 시트 이미지를 실제로 보고, 얼굴 생김새·헤어·체형·기본 의상을 영어로 정확히 옮긴다. 이미지 속 구도·배경·표정은 복제하지 말고 장면 지시를 따른다.
- 키프레임 프롬프트는 "모션이 시작되기 직전의 정지 순간" 하나를 그린다. 이야기 전체를 한 장에 욱여넣지 않는다.
- 모션 프롬프트는 외형을 다시 묘사하지 않는다. 움직임, 표정 변화, 시선 이동, 카메라 움직임, 초 단위 길이만. 끝에 "keep face, hair and outfit identical to the start frame" 류의 문구를 둔다.
- 실사 질감: photoreal, realistic skin texture, natural interior lighting, smartphone-realistic contrast. 과도한 보정·아이돌풍 금지.
- 세로 9:16. 화면 안에 글자·자막·로고 없음.
- 같은 에피소드의 앞·뒤 샷과 의상·조명·소품·위치가 이어지도록 한다.
- 사용자의 추가 지시가 있으면 최우선으로 반영한다.`;

function fixedPrompt(charId: string) {
  return all<PromptVersion>("prompt_versions", { col: "owner_id", val: charId }).find((v) => v.current)?.body ?? "";
}

function charactersInShot(shot: Shot, episode: Episode, characters: Doc<Character>[]) {
  const inEp = characters.filter((c) => episode.characters.includes(c.id));
  // 샷의 who("도윤", "이현 + 도윤")에 이름 일부가 들어가면 그 캐릭터
  const named = inEp.filter((c) => mentions(shot.who, c.name));
  return named.length ? named : inEp;
}

function placesInShot(shot: Shot, episode: Episode, places: Doc<Place>[]) {
  const inEp = places.filter((p) => episode.places.includes(p.id));
  const named = places.filter((p) => shot.place.includes(p.short) || shot.place.includes(p.name));
  return named.length ? named : inEp;
}

function describeCharacter(c: Doc<Character>) {
  return [
    `### ${c.name} (${c.species}, ${c.age}세 ${c.sex}, ${c.height}, ${c.role})`,
    `고정 프롬프트:\n${fixedPrompt(c.id) || "(없음)"}`,
    `인간형 외형 기준:\n- ${c.appearance.join("\n- ")}`,
    c.sheetPrompt ? `캐릭터 시트 생성 프롬프트 (외형 표현의 기준):\n${c.sheetPrompt}` : "",
    `성격 키워드: ${c.keywords.join(", ")}`,
    `습성: ${c.habits.join(", ")}`,
    `금지 표현: ${c.forbidden.join(", ")}`,
  ].filter(Boolean).join("\n");
}

type ImagePart = { type: "image"; source: { type: "base64"; media_type: "image/png" | "image/jpeg" | "image/webp"; data: string } };

// 장당 4.5MB, 요청 전체 4장·12MB까지. 최근 올린 것을 우선한다.
function imageParts(files: Doc<StoredFile>[], skipped: string[], budget: { n: number; bytes: number }): ImagePart[] {
  const out: ImagePart[] = [];
  for (const f of [...files].sort((a, b) => b.at.localeCompare(a.at))) {
    if (f.size > MAX_IMAGE_BYTES) { skipped.push(`${f.name} (${(f.size / 1048576).toFixed(1)}MB, 4.5MB 초과)`); continue; }
    if (budget.n >= MAX_IMAGES || budget.bytes + f.size > MAX_TOTAL_BYTES) { skipped.push(`${f.name} (요청당 ${MAX_IMAGES}장·12MB 한도)`); continue; }
    budget.n++; budget.bytes += f.size;
    out.push({ type: "image", source: { type: "base64", media_type: f.mime as ImagePart["source"]["media_type"], data: readFileBase64(f) } });
  }
  return out;
}

export function aiEnabled() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

type ShotContext = { shot: Doc<Shot>; episode: Doc<Episode>; cast: Doc<Character>[]; scene: Doc<Place>[]; prev: Doc<Shot> | null; next: Doc<Shot> | null; previous: Doc<ShotPrompt> | undefined };

function loadContext(shotId: string): ShotContext | null {
  const shot = one<Shot>("shots", shotId);
  if (!shot) return null;
  const episode = one<Episode>("episodes", shot.episodeId);
  if (!episode) return null;
  const characters = all<Character>("characters");
  const places = all<Place>("places");
  const shots = all<Shot>("shots", { col: "episode_id", val: shot.episodeId }, "no");
  const idx = shots.findIndex((s) => s.id === shotId);
  return {
    shot, episode,
    cast: charactersInShot(shot, episode, characters),
    scene: placesInShot(shot, episode, places),
    prev: idx > 0 ? shots[idx - 1] : null,
    next: idx >= 0 && idx < shots.length - 1 ? shots[idx + 1] : null,
    previous: all<ShotPrompt>("shot_prompts", { col: "shot_id", val: shotId }).sort((a, b) => b.v - a.v)[0],
  };
}

const shotLine = (s: Shot) => `샷 ${s.no} "${s.title}" · 등장: ${s.who} · 장소: ${s.place} · 길이: ${s.length} · 카메라: ${s.camera}${s.subtitle ? ` · 자막: ${s.subtitle}` : ""}`;

// 에피소드·캐릭터·장소·앞뒤 샷을 한 덩어리 텍스트로. AI 호출과 GPT 요청문이 함께 쓴다.
function buildBrief(ctx: ShotContext, direction: string, includePrevious: boolean) {
  const { shot, episode, cast, scene, prev, next, previous } = ctx;
  return [
    `# 에피소드 ${episode.no} ${episode.title}`,
    `훅: ${episode.hook}`,
    `줄거리: ${episode.summary}`,
    `시간·조명: ${episode.lighting || "미정"}`,
    `연속성: ${episode.continuity.map((c) => c.text).join(" / ") || "없음"}`,
    ``,
    `# 등장 캐릭터`,
    cast.map(describeCharacter).join("\n\n"),
    ``,
    `# 장소`,
    scene.map((p) => `- ${p.name}: ${p.note}. 고정 요소: ${p.fixed.join(", ")}${p.variable.length ? `. 가변: ${p.variable.join(", ")}` : ""}`).join("\n") || "(미정)",
    ``,
    `# 이번 샷`,
    shotLine(shot),
    prev ? `앞 샷: ${shotLine(prev)}` : "앞 샷: 없음 (에피소드 첫 샷)",
    next ? `다음 샷: ${shotLine(next)}` : "다음 샷: 없음 (마지막 샷)",
    includePrevious && previous ? `\n# 이전 버전 (v${previous.v}, ${previous.source === "ai" ? "AI" : "수동"})\n브리프: ${previous.brief}\n키프레임: ${previous.keyframe}\n모션: ${previous.motion}` : "",
    direction ? `\n# 사용자 추가 지시 (최우선)\n${direction}` : "",
  ].filter((l) => l !== undefined).join("\n");
}

// ChatGPT 등 외부 도구에 붙여넣는 요청문. 캐릭터 레퍼런스 이미지는 사용자가 직접 첨부한다.
export function gptRequest(shotId: string): string | null {
  const ctx = loadContext(shotId);
  if (!ctx) return null;
  const refs = ctx.cast.map((c) => {
    const slots = filesFor("character", c.id).filter((f) => f.slot !== "Soul ID 학습 세트").map((f) => f.slot);
    return `${c.name}: ${slots.length ? [...new Set(slots)].join(", ") : "(아카이브에 올린 이미지 없음)"}`;
  });
  return [
    SYSTEM,
    ``,
    `# 첨부 이미지`,
    `이 메시지에 첨부한 이미지는 캐릭터의 얼굴 앵커·캐릭터 시트다. 실제로 보고 외형을 영어로 옮겨라.`,
    ...refs.map((r) => `- ${r}`),
    ``,
    buildBrief(ctx, "", false),
    ``,
    `# 출력 형식 (이 네 블록만, 머리말 없이)`,
    `## 1. 한국어 브리프`,
    `장면 / 행동 / 감정과 반응 / 카메라 / 영상 길이 — 다섯 줄`,
    `## 2. 키프레임 프롬프트 (English, Soul 2.0)`,
    `한 문단. 정체성 → 장소 → 모션 직전의 자세·표정 → 카메라 → "vertical 9:16, photoreal, realistic skin texture, natural interior lighting, no text or captions in frame"`,
    `## 3. 모션 프롬프트 (English, Kling 3.0)`,
    `외형 서술 없이 움직임·표정 변화·시선·카메라 움직임·초 단위 길이만. 끝에 "keep face, hair and outfit identical to the start frame"`,
    `## 4. 제작 메모 (한국어)`,
    `연속성 주의점, 실패하기 쉬운 부분 2~4줄`,
  ].join("\n");
}

export type GenerateResult = { ok: true; output: PromptOutput; model: string; skipped: string[] } | { ok: false; error: string };

export async function generateShotPrompt(shotId: string, direction: string): Promise<GenerateResult> {
  if (!aiEnabled()) return { ok: false, error: "서버에 ANTHROPIC_API_KEY가 없습니다. .env에 넣고 컨테이너를 다시 시작하세요." };
  const ctx = loadContext(shotId);
  if (!ctx) return { ok: false, error: "샷 또는 에피소드를 찾을 수 없습니다." };
  const { cast } = ctx;

  const skipped: string[] = [];
  const budget = { n: 0, bytes: 0 };
  const content: Anthropic.ContentBlockParam[] = [];
  for (const c of cast) {
    const files = filesFor("character", c.id).filter((f) => f.slot !== "Soul ID 학습 세트");
    const imgs = imageParts(files, skipped, budget);
    if (imgs.length) {
      content.push({ type: "text", text: `[${c.name} 레퍼런스 이미지 ${imgs.length}장 (얼굴 앵커·캐릭터 시트 등, 최근 업로드 우선)]` });
      content.push(...imgs);
    }
  }
  const frameFiles = filesFor("shot", shotId);
  const frameImgs = imageParts(frameFiles, skipped, budget);
  if (frameImgs.length) {
    content.push({ type: "text", text: `[이 샷의 확정 시작 프레임 ${frameImgs.length}장. 모션 프롬프트는 이 프레임에서 시작한다고 가정]` });
    content.push(...frameImgs);
  }

  const brief = buildBrief(ctx, direction, true) + "\n\n이번 샷의 brief_ko, keyframe_en, motion_en, notes_ko를 작성하라.";
  content.push({ type: "text", text: brief });

  const client = new Anthropic();
  try {
    const res = await client.messages.parse({
      model: PROMPT_MODEL,
      max_tokens: 8000,
      thinking: { type: "adaptive" },
      output_config: { effort: "high", format: zodOutputFormat(Output) },
      system: SYSTEM,
      messages: [{ role: "user", content }],
    });
    if (res.stop_reason === "refusal") return { ok: false, error: `모델이 생성을 거부했습니다${res.stop_details?.explanation ? `: ${res.stop_details.explanation}` : "."}` };
    if (res.stop_reason === "max_tokens") return { ok: false, error: "출력이 길이 제한에 걸렸습니다. 다시 시도하세요." };
    if (!res.parsed_output) return { ok: false, error: "응답을 해석하지 못했습니다. 다시 시도하세요." };
    return { ok: true, output: res.parsed_output, model: res.model, skipped };
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) return { ok: false, error: "API 키가 올바르지 않습니다." };
    if (e instanceof Anthropic.RateLimitError) return { ok: false, error: "요청이 몰렸습니다. 잠시 뒤 다시 시도하세요." };
    if (e instanceof Anthropic.BadRequestError) return { ok: false, error: `요청 오류: ${e.message}` };
    if (e instanceof Anthropic.APIConnectionError) return { ok: false, error: "API에 연결하지 못했습니다. 네트워크를 확인하세요." };
    if (e instanceof Anthropic.APIError) return { ok: false, error: `API 오류 ${e.status}: ${e.message}` };
    throw e;
  }
}
