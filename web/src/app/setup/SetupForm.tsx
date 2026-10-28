"use client";

import { useActionState } from "react";
import { setupAdmin, type SetupState } from "./actions";

export default function SetupForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState<SetupState, FormData>(setupAdmin, {});
  return (
    <form className="form" action={action}>
      <label>설정 토큰<input id="token" name="token" defaultValue={token} autoComplete="off" spellCheck={false} required /></label>
      <label>아이디<input id="username" name="username" autoComplete="username" pattern="[A-Za-z0-9_.\-]{3,32}" autoFocus required /></label>
      <label>이름<input id="name" name="name" autoComplete="name" placeholder="비우면 아이디를 씁니다" /></label>
      <label>비밀번호 (8자 이상)<input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required /></label>
      <label>비밀번호 확인<input id="confirm" name="confirm" type="password" autoComplete="new-password" minLength={8} required /></label>
      {state.error && <div className="err" role="alert">{state.error}</div>}
      <button className="btn w" type="submit" disabled={pending}>{pending ? "만드는 중…" : "마스터 계정 만들기"}</button>
    </form>
  );
}
