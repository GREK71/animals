"use client";

// 제출 전에 확인 창을 한 번 띄우는 폼. 서버 액션과 hidden 값은 그대로 전달한다.
export default function ConfirmForm({ action, hidden, message, label, className = "btn sm ghost danger" }: { action: (form: FormData) => void | Promise<void>; hidden: Record<string, string>; message: string; label: string; className?: string }) {
  return (
    <form action={action} onSubmit={(e) => { if (!confirm(message)) e.preventDefault(); }}>
      {Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <button className={className} type="submit">{label}</button>
    </form>
  );
}
