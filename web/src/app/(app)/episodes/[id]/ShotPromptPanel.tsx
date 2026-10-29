"use client";

import { useActionState, useState } from "react";
import CopyButton from "@/components/CopyButton";
import type { ShotPrompt } from "@/lib/types";
import { generateShotPrompt, saveShotPrompt, type PromptState } from "./actions";

type P = ShotPrompt & { id: string };

// 샷 하나의 씬 프롬프트. 기본 흐름: GPT 요청문 복사 → GPT 결과를 직접 입력해 버전으로 저장.
// 서버에 API 키가 있을 때만 AI 생성 폼이 보인다.
export default function ShotPromptPanel({ shotId, current, versions, aiEnabled, gptRequest, hasRefs, hasFrame }: { shotId: string; current: P | null; versions: number; aiEnabled: boolean; gptRequest: string; hasRefs: boolean; hasFrame: boolean }) {
  const [gen, generate, generating] = useActionState<PromptState, FormData>(generateShotPrompt, {});
  const [save, saveAction, saving] = useActionState<PromptState, FormData>(saveShotPrompt, {});
  const [editing, setEditing] = useState(false);
  const stamp = current ? new Date(current.at).toLocaleString("ko-KR", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }) : "";
  const showForm = editing || !current;
  return (
    <div className="sp">
      <div className="sp-row">
        <CopyButton text={gptRequest} label="GPT 요청문 복사" className="btn sm ghost" />
        <span className="muted small">ChatGPT에 캐릭터 시트 이미지를 첨부하고 이 요청문을 붙여넣으면 네 블록으로 답합니다. 결과를 아래에 입력하세요.{hasRefs ? "" : " · 캐릭터 화면에 시트를 올려 두면 요청문이 어떤 이미지를 첨부할지 알려줍니다."}{hasFrame ? " · 시작 프레임 첨부됨" : ""}</span>
      </div>

      {aiEnabled && (
        <form action={generate} className="sp-gen">
          <input type="hidden" name="shotId" value={shotId} />
          <textarea name="direction" rows={2} placeholder="추가 지시 (선택)" disabled={generating} />
          <div className="sp-row">
            <button className="btn sm" type="submit" disabled={generating}>{generating ? "AI가 작성 중… (30초~1분)" : current ? "AI로 다시 만들기" : "AI로 씬 프롬프트 만들기"}</button>
          </div>
          {gen.error && <div className="err" role="alert">{gen.error}</div>}
          {gen.ok && !gen.error && <div className="ok small">{gen.ok}</div>}
        </form>
      )}

      {current && !editing && (
        <div className="sp-cur">
          <div className="sp-meta"><b>v{current.v}</b><span className="muted small">{current.source === "ai" ? `AI (${current.model ?? ""})` : "직접 입력"} · {current.by} · {stamp}{versions > 1 ? ` · 이전 ${versions - 1}개` : ""}</span><button className="btn sm ghost" type="button" onClick={() => setEditing(true)}>수정</button></div>
          {current.brief && <div className="prompt"><div className="ph"><span>한국어 브리프 · 기획 확인용</span><CopyButton text={current.brief} className="btn sm ghost" /></div><pre>{current.brief}</pre></div>}
          {current.keyframe && <div className="prompt"><div className="ph"><span>1단계 키프레임 · English · Soul 2.0</span><CopyButton text={current.keyframe} className="btn sm ghost" /></div><pre>{current.keyframe}</pre></div>}
          {current.motion && <div className="prompt"><div className="ph"><span>2단계 영상 · English · Kling 3.0</span><CopyButton text={current.motion} className="btn sm ghost" /></div><pre>{current.motion}</pre></div>}
          {current.notes && <div className="note">{current.notes}</div>}
          {current.direction && <div className="muted small">추가 지시: {current.direction}</div>}
        </div>
      )}

      {showForm && (
        <form action={saveAction} className="sp-edit">
          <input type="hidden" name="shotId" value={shotId} />
          <label>한국어 브리프<textarea name="brief" rows={4} defaultValue={current?.brief ?? ""} placeholder="장면 / 행동 / 감정과 반응 / 카메라 / 영상 길이" /></label>
          <label>키프레임 프롬프트 (English)<textarea name="keyframe" rows={5} defaultValue={current?.keyframe ?? ""} placeholder="GPT가 준 2번 블록" /></label>
          <label>모션 프롬프트 (English)<textarea name="motion" rows={3} defaultValue={current?.motion ?? ""} placeholder="GPT가 준 3번 블록" /></label>
          <label>메모<textarea name="notes" rows={2} defaultValue={current?.notes ?? ""} /></label>
          <div className="sp-row">
            <button className="btn sm" type="submit" disabled={saving}>{saving ? "저장 중…" : current ? "새 버전으로 저장" : "저장"}</button>
            {current && <button className="btn sm ghost" type="button" onClick={() => setEditing(false)}>취소</button>}
            {save.error && <span className="err small">{save.error}</span>}
            {save.ok && <span className="ok small">{save.ok}</span>}
          </div>
        </form>
      )}
    </div>
  );
}
