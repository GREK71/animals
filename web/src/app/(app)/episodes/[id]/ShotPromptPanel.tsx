"use client";

import { useActionState, useState } from "react";
import CopyButton from "@/components/CopyButton";
import type { ShotPrompt } from "@/lib/types";
import { generateShotPrompt, saveShotPrompt, type PromptState } from "./actions";

type P = ShotPrompt & { id: string };

// 샷 하나의 씬 프롬프트: AI 생성 폼 + 현재 버전 표시 + 수동 편집
export default function ShotPromptPanel({ shotId, current, versions, hasRefs, hasFrame }: { shotId: string; current: P | null; versions: number; hasRefs: boolean; hasFrame: boolean }) {
  const [gen, generate, generating] = useActionState<PromptState, FormData>(generateShotPrompt, {});
  const [save, saveAction, saving] = useActionState<PromptState, FormData>(saveShotPrompt, {});
  const [editing, setEditing] = useState(false);
  const stamp = current ? new Date(current.at).toLocaleString("ko-KR", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }) : "";
  return (
    <div className="sp">
      <form action={generate} className="sp-gen">
        <input type="hidden" name="shotId" value={shotId} />
        <textarea name="direction" rows={2} placeholder="추가 지시 (선택). 예: 도윤이 소파 끝에 걸터앉은 상태에서 시작, 카메라는 살짝 로우앵글, 치킨 상자는 테이블 위" disabled={generating} />
        <div className="sp-row">
          <button className="btn sm" type="submit" disabled={generating}>{generating ? "AI가 작성 중… (30초~1분)" : current ? "AI로 다시 만들기" : "AI로 씬 프롬프트 만들기"}</button>
          <span className="muted small">{hasRefs ? "캐릭터 레퍼런스 이미지 첨부됨" : "캐릭터 레퍼런스 이미지 없음 · 캐릭터 화면에서 올리면 정확도가 올라갑니다"}{hasFrame ? " · 시작 프레임 첨부됨" : ""}</span>
        </div>
        {gen.error && <div className="err" role="alert">{gen.error}</div>}
        {gen.ok && !gen.error && <div className="ok small">{gen.ok}</div>}
      </form>

      {!current && <p className="muted small" style={{ marginTop: 8 }}>아직 프롬프트가 없습니다.</p>}

      {current && !editing && (
        <div className="sp-cur">
          <div className="sp-meta"><b>v{current.v}</b><span className="muted small">{current.source === "ai" ? `AI (${current.model ?? ""})` : "수동 편집"} · {current.by} · {stamp}{versions > 1 ? ` · 이전 ${versions - 1}개` : ""}</span><button className="btn sm ghost" type="button" onClick={() => setEditing(true)}>수정</button></div>
          {current.brief && <div className="prompt"><div className="ph"><span>한국어 브리프 · 기획 확인용</span><CopyButton text={current.brief} className="btn sm ghost" /></div><pre>{current.brief}</pre></div>}
          <div className="prompt"><div className="ph"><span>1단계 키프레임 · English · Soul 2.0</span><CopyButton text={current.keyframe} className="btn sm ghost" /></div><pre>{current.keyframe}</pre></div>
          <div className="prompt"><div className="ph"><span>2단계 영상 · English · Kling 3.0</span><CopyButton text={current.motion} className="btn sm ghost" /></div><pre>{current.motion}</pre></div>
          {current.notes && <div className="note">{current.notes}</div>}
          {current.direction && <div className="muted small">추가 지시: {current.direction}</div>}
        </div>
      )}

      {current && editing && (
        <form action={saveAction} className="sp-edit">
          <input type="hidden" name="shotId" value={shotId} />
          <label>한국어 브리프<textarea name="brief" rows={5} defaultValue={current.brief} /></label>
          <label>키프레임 프롬프트 (English)<textarea name="keyframe" rows={6} defaultValue={current.keyframe} /></label>
          <label>모션 프롬프트 (English)<textarea name="motion" rows={4} defaultValue={current.motion} /></label>
          <label>메모<textarea name="notes" rows={2} defaultValue={current.notes} /></label>
          <div className="sp-row">
            <button className="btn sm" type="submit" disabled={saving}>{saving ? "저장 중…" : "새 버전으로 저장"}</button>
            <button className="btn sm ghost" type="button" onClick={() => setEditing(false)}>취소</button>
            {save.error && <span className="err small">{save.error}</span>}
            {save.ok && <span className="ok small">{save.ok}</span>}
          </div>
        </form>
      )}
    </div>
  );
}
