import Link from "next/link";
import { requireUser } from "@/lib/session";
import { logout } from "@/app/login/actions";
import Nav from "@/components/Nav";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser();
  return (
    <>
      <header className="top">
        <Link className="brand" href="/"><div className="mark">AH</div><div><b>ANIMAL HOUSE</b><small>Creative Archive</small></div></Link>
        <div className="topr">
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
        </nav>
        <main>{children}</main>
      </div>
    </>
  );
}
