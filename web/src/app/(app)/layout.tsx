import Link from "next/link";
import { requireUser } from "@/lib/session";
import { logout } from "@/app/login/actions";
import Nav from "@/components/Nav";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser();
  const today = new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" }).replace(/\. /g, ".").replace(/\.$/, "");
  return (
    <>
      <header className="top">
        <Link className="brand" href="/"><div className="mark">AH</div><div><b>ANIMAL HOUSE</b><small>Creative Archive</small></div></Link>
        <div className="search" role="button" tabIndex={0} title="전역 검색은 다음 단계">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
          <span>캐릭터, 장소, 에피소드, 소재 검색</span><span className="kbd">⌘K</span>
        </div>
        <div className="topr">
          <span className="sample">{today}</span>
          <Link className="backup" href="/settings" title="백업 상태"><i></i>백업 설정</Link>
          <div className="me">
            <span className="av sm" style={{ background: "var(--accent)" }}>{user.name.slice(0, 1)}</span>
            <span>{user.name}</span>
            <form action={logout}><button className="link" type="submit">로그아웃</button></form>
          </div>
        </div>
      </header>
      <div className="shell">
        <nav className="side" aria-label="주 메뉴">
          <Nav />
          <div className="proj"><div className="img">수인 쉐어하우스</div><div className="t"><b>ANIMAL HOUSE</b><span>옴니버스 숏폼 · 인스타 / 유튜브</span></div></div>
        </nav>
        <main>{children}</main>
      </div>
    </>
  );
}
