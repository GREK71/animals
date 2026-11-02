"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const MAIN = [
  { href: "/", label: "홈", ic: <path d="M3 11 12 4l9 7v9H3z" /> },
  { href: "/tasks", label: "작업", ic: <><path d="M9 5h11M9 12h11M9 19h11" /><path d="m3 5 1 1 2-2M3 12l1 1 2-2M3 19l1 1 2-2" /></> },
  { href: "/characters", label: "캐릭터", ic: <><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" /></> },
  { href: "/places", label: "장소", ic: <path d="M4 21V9l8-6 8 6v12M9 21v-7h6v7" /> },
  { href: "/episodes", label: "에피소드", ic: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 10h18M8 5v14" /></> },
  { href: "/assets", label: "소재", ic: <><path d="M4 4h16v16H4z" /><path d="m4 16 5-5 4 4 3-3 4 4" /></> },
  { href: "/issues", label: "미정 항목", ic: <><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16h.01" /></> },
];

function Icon({ children }: { children: React.ReactNode }) {
  return <svg className="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">{children}</svg>;
}

export default function Nav() {
  const path = usePathname();
  const active = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));
  return (
    <div className="nav">
      {MAIN.map((m) => (
        <Link key={m.href} href={m.href} aria-current={active(m.href) ? "page" : undefined}><Icon>{m.ic}</Icon>{m.label}</Link>
      ))}
      <hr />
      <Link href="/settings" aria-current={active("/settings") ? "page" : undefined}><Icon><circle cx="12" cy="12" r="3" /><path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.5-2.4 1a7 7 0 0 0-1.7-1L14.5 3h-5l-.3 2.5a7 7 0 0 0-1.7 1l-2.4-1-2 3.5 2 1.5a7 7 0 0 0 0 2l-2 1.5 2 3.5 2.4-1a7 7 0 0 0 1.7 1l.3 2.5h5l.3-2.5a7 7 0 0 0 1.7-1l2.4 1 2-3.5-2-1.5c.1-.3.1-.7.1-1z" /></Icon>설정</Link>
    </div>
  );
}
