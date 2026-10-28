import { redirect } from "next/navigation";
import { hasUsers } from "@/lib/db";
import { currentUser } from "@/lib/session";
import LoginForm from "./LoginForm";

// 계정 유무를 매 요청 확인해야 하므로 정적 캐시 금지 (빌드 시점 상태가 굳으면 /setup과 무한 리다이렉트)
export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  if (!hasUsers()) redirect("/setup");
  if (await currentUser()) redirect("/");
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? sp.next : "/";
  return (
    <div className="login">
      <div className="card">
        <div className="brand" style={{ marginBottom: 18 }}>
          <div className="mark">AH</div>
          <div><b>ANIMAL HOUSE</b><small>Creative Archive</small></div>
        </div>
        <h1>로그인</h1>
        <p>운영자가 만들어 준 계정으로 들어갑니다.</p>
        <LoginForm next={next} />
      </div>
    </div>
  );
}
