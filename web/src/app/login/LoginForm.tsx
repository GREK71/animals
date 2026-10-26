"use client";

import { useActionState } from "react";
import { login, type LoginState } from "./actions";

export default function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});
  return (
    <form className="form" action={action}>
      <input type="hidden" name="next" value={next} />
      <label>아이디<input id="username" name="username" autoComplete="username" autoFocus required /></label>
      <label>비밀번호<input id="password" name="password" type="password" autoComplete="current-password" required /></label>
      {state.error && <div className="err" role="alert">{state.error}</div>}
      <button className="btn w" type="submit" disabled={pending}>{pending ? "확인 중…" : "들어가기"}</button>
    </form>
  );
}
