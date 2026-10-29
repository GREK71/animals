"use client";

import { useCallback, useEffect, useState } from "react";

export type LightboxImage = { id: string; url: string; name: string; caption: string };

// 페이지의 <a data-lightbox="<group>" data-lightbox-id="<id>"> 클릭을 가로채 앨범처럼 넘겨 본다.
// JS가 없으면 링크 그대로 열린다. 이미지 복사는 PNG로 변환해 클립보드에 넣는다.
export default function Lightbox({ group, images }: { group: string; images: LightboxImage[] }) {
  const [idx, setIdx] = useState<number | null>(null);
  const [msg, setMsg] = useState("");
  const cur = idx === null ? null : images[idx];

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest<HTMLAnchorElement>(`a[data-lightbox="${group}"]`);
      if (!a || e.metaKey || e.ctrlKey || e.shiftKey) return;
      const i = images.findIndex((im) => im.id === a.dataset.lightboxId);
      if (i < 0) return;
      e.preventDefault();
      setMsg("");
      setIdx(i);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [group, images]);

  const move = useCallback((d: number) => { setMsg(""); setIdx((i) => (i === null ? null : (i + d + images.length) % images.length)); }, [images.length]);

  useEffect(() => {
    if (idx === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIdx(null);
      else if (e.key === "ArrowRight") move(1);
      else if (e.key === "ArrowLeft") move(-1);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [idx, move]);

  async function copyImage() {
    if (!cur) return;
    try {
      const res = await fetch(cur.url, { credentials: "same-origin" });
      let blob = await res.blob();
      if (blob.type !== "image/png") blob = await toPng(blob); // 클립보드는 PNG만 안정적으로 받는다
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      setMsg("이미지를 복사했습니다. 힉스필드나 GPT에 붙여넣으세요.");
    } catch {
      setMsg("이 브라우저에서는 이미지 복사가 막혀 있습니다. 다운로드하거나 이미지를 길게 눌러 복사하세요.");
    }
  }

  async function copyLink() {
    if (!cur) return;
    try { await navigator.clipboard.writeText(new URL(cur.url, location.href).toString()); setMsg("링크를 복사했습니다 (로그인한 사람만 열 수 있습니다)."); }
    catch { setMsg("링크를 복사하지 못했습니다."); }
  }

  if (!cur) return null;
  return (
    <div className="lb" role="dialog" aria-modal="true" aria-label={cur.name} onClick={(e) => { if (e.target === e.currentTarget) setIdx(null); }}>
      <button className="lb-x" type="button" aria-label="닫기" onClick={() => setIdx(null)}>✕</button>
      {images.length > 1 && <button className="lb-nav prev" type="button" aria-label="이전" onClick={() => move(-1)}>‹</button>}
      <figure className="lb-fig" onClick={(e) => e.stopPropagation()}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={cur.url} alt={cur.name} />
        <figcaption>
          <div className="lb-cap"><b>{cur.caption}</b><span className="muted small">{cur.name} · {idx! + 1} / {images.length}</span></div>
          <div className="lb-btns">
            <button className="btn sm" type="button" onClick={copyImage}>이미지 복사</button>
            <a className="btn sm ghost" href={cur.url} download={cur.name}>다운로드</a>
            <button className="btn sm ghost" type="button" onClick={copyLink}>링크 복사</button>
            <a className="btn sm ghost" href={cur.url} target="_blank" rel="noreferrer">새 탭</a>
          </div>
          {msg && <div className="lb-msg">{msg}</div>}
        </figcaption>
      </figure>
      {images.length > 1 && <button className="lb-nav next" type="button" aria-label="다음" onClick={() => move(1)}>›</button>}
    </div>
  );
}

function toPng(blob: Blob): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = img.naturalWidth; c.height = img.naturalHeight;
      c.getContext("2d")!.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      c.toBlob((b) => (b ? resolve(b) : reject(new Error("png"))), "image/png");
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("decode")); };
    img.src = url;
  });
}
