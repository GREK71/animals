"use client";

import { useActionState, useRef } from "react";
import type { UploadState } from "@/app/(app)/characters/[id]/actions";

type Action = (prev: UploadState, form: FormData) => Promise<UploadState>;

// 이미지 업로드 폼. 파일을 고르면 바로 제출한다. hidden에 소유자 정보를 담아 보낸다.
export default function UploadForm({ action, hidden, multiple, label = "이미지 올리기" }: { action: Action; hidden: Record<string, string>; multiple?: boolean; label?: string }) {
  const [state, submit, pending] = useActionState<UploadState, FormData>(action, {});
  const formRef = useRef<HTMLFormElement>(null);
  return (
    <form ref={formRef} action={submit} className="upl">
      {Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <label className={`btn sm ghost ${pending ? "busy" : ""}`}>
        {pending ? "올리는 중…" : label}
        <input type="file" name="files" accept="image/png,image/jpeg,image/webp" multiple={multiple} disabled={pending} hidden onChange={() => formRef.current?.requestSubmit()} />
      </label>
      {state.error && <span className="err small" role="alert">{state.error}</span>}
    </form>
  );
}
