"use client";

import { useActionState } from "react";
import Link from "next/link";
import type { Character } from "@/lib/types";
import { saveCharacter, type CharacterFormState } from "./[id]/actions";

// 캐릭터 설정 입력·수정 폼. 줄 단위 항목은 한 줄에 하나, 쉼표 항목은 쉼표로 구분.
export default function CharacterForm({ id, c }: { id: string; c?: Character }) {
  const [state, action, pending] = useActionState<CharacterFormState, FormData>(saveCharacter, {});
  const j = (a?: string[]) => (a ?? []).join("\n");
  return (
    <form action={action} className="cf">
      <input type="hidden" name="id" value={id} />
      <div className="form">
        <label>이름 (성 포함)<input name="name" defaultValue={c?.name ?? ""} required maxLength={40} /></label>
        <label>나이<input name="age" type="number" min={0} max={200} defaultValue={c?.age ?? ""} required /></label>
        <label>성별<input name="sex" defaultValue={c?.sex ?? ""} placeholder="남 / 여" /></label>
        <label>키<input name="height" defaultValue={c?.height ?? ""} placeholder="185cm" /></label>
        <label>종 (수인)<input name="species" defaultValue={c?.species ?? ""} placeholder="도베르만 수인" /></label>
        <label>역할<input name="role" defaultValue={c?.role ?? ""} placeholder="주인공 / 조연" /></label>
        <label>거주지<input name="residence" defaultValue={c?.residence ?? ""} /></label>
        <label>직업<input name="job" defaultValue={c?.job ?? ""} /></label>
        <label>아바타 글자<input name="initial" defaultValue={c?.initial ?? ""} maxLength={2} placeholder="비우면 이름에서" /></label>
        <label>아바타 색<input name="color" type="color" defaultValue={c?.color ?? "#2e3236"} /></label>
      </div>
      <label className="cf-l">한 줄 소개<textarea name="intro" rows={2} defaultValue={c?.intro ?? ""} /></label>
      <label className="cf-l">캐릭터 시트 프롬프트 (시트 이미지를 만들 때 쓴 프롬프트 · 상세 화면에서 복사)<textarea name="sheetPrompt" rows={8} defaultValue={c?.sheetPrompt ?? ""} placeholder="예: A full-body character sheet of a 31-year-old Korean man, 185cm, slim build, black knit sweater… front, side and back views on a plain background" /></label>
      <label className="cf-l">배경 (한 줄에 하나)<textarea name="background" rows={3} defaultValue={j(c?.background)} /></label>
      <label className="cf-l">성격 키워드 (쉼표)<input name="keywords" defaultValue={(c?.keywords ?? []).join(", ")} /></label>
      <label className="cf-l">습성 태그 (쉼표)<input name="habits" defaultValue={(c?.habits ?? []).join(", ")} /></label>
      <label className="cf-l">호칭 (한 줄에 하나: 상대 | 내가 부를 때 | 상대가 부를 때 | 말투)<textarea name="honorifics" rows={2} defaultValue={(c?.honorifics ?? []).map((h) => `${h.to} | ${h.call} | ${h.called} | ${h.tone}`).join("\n")} placeholder={"서도윤 | \"도윤아\" | \"현이형\" | 서로 반말"} /></label>
      <label className="cf-l">금지 표현 (한 줄에 하나)<textarea name="forbidden" rows={2} defaultValue={j(c?.forbidden)} /></label>
      <label className="cf-l">인간형 외형 기준 (한 줄에 하나)<textarea name="appearance" rows={4} defaultValue={j(c?.appearance)} /></label>
      <label className="cf-l">레퍼런스 우선순위 (한 줄에 하나)<textarea name="refPriority" rows={3} defaultValue={j(c?.refPriority)} placeholder={"얼굴 앵커: 얼굴 정체성, 표정 방향, 피부, 헤어\n캐릭터 시트: 전신 비율, 의상\n장면 지시: 장소·동작·카메라·조명만"} /></label>
      <div className="form">
        <label>Soul ID 상태<select name="soul_status" defaultValue={c?.soul.status ?? "미학습"}><option>미학습</option><option>학습 중</option><option>사용 가능</option></select></label>
        <label>학습 세트 장수<input name="soul_setCount" type="number" min={0} defaultValue={c?.soul.setCount ?? 0} /></label>
        <label>학습 모델<input name="soul_model" defaultValue={c?.soul.model ?? ""} placeholder="Soul 2.0" /></label>
        <label>힉스필드 ID<input name="soul_hfId" defaultValue={c?.soul.hfId ?? ""} /></label>
      </div>
      <div className="cf-ready">
        <span className="muted small">준비 상태</span>
        <label><input type="checkbox" name="ready_face" defaultChecked={c?.ready.face} /> 얼굴</label>
        <label><input type="checkbox" name="ready_sheet" defaultChecked={c?.ready.sheet} /> 시트</label>
        <label><input type="checkbox" name="ready_soul" defaultChecked={c?.ready.soul} /> Soul ID</label>
        <label><input type="checkbox" name="ready_animal" defaultChecked={c?.ready.animal} /> 동물형</label>
      </div>
      {state.error && <div className="err" role="alert">{state.error}</div>}
      <div className="sp-row">
        <button className="btn sm" type="submit" disabled={pending}>{pending ? "저장 중…" : c ? "저장" : "캐릭터 만들기"}</button>
        <Link className="btn sm ghost" href={c ? `/characters/${id}` : "/characters"}>취소</Link>
        {c && <span className="muted small">레퍼런스 이미지와 관계 이력은 그대로 유지됩니다. 고정 프롬프트는 비주얼 가이드 탭에서 버전으로 관리합니다.</span>}
      </div>
    </form>
  );
}
