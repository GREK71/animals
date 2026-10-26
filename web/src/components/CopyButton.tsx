"use client";

import { useState } from "react";

export default function CopyButton({ text, label = "복사", className = "btn sm" }: { text: string; label?: string; className?: string }) {
  const [done, setDone] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setDone(true);
      setTimeout(() => setDone(false), 1500);
    } catch {
      window.getSelection()?.removeAllRanges();
      alert("클립보드를 쓸 수 없습니다. 텍스트를 직접 선택해 복사하세요.");
    }
  }
  return <button type="button" className={className} onClick={copy}>{done ? "복사했습니다" : label}</button>;
}
