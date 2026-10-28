import { redirect } from "next/navigation";
import { hasUsers } from "@/lib/db";
import SetupForm from "./SetupForm";

export const dynamic = "force-dynamic";

// 계정이 하나도 없을 때만 열리는 첫 관리자 등록 화면.
export default async function SetupPage({ searchParams }: PageProps<"/setup">) {
  if (hasUsers()) redirect("/login");
  const sp = await searchParams;
  const token = typeof sp.token === "string" ? sp.token : "";
  return (
    <div className="login">
      <div className="card">
        <div className="brand" style={{ marginBottom: 18 }}>
          <div className="mark">AH</div>
          <div><b>ANIMAL HOUSE</b><small>Creative Archive</small></div>
        </div>
        <h1>마스터 계정 등록</h1>
        <p>아직 계정이 없습니다. 서버 로그(docker compose logs)에 찍힌 설정 토큰을 넣고 첫 계정(마스터)을 만들면 바로 로그인됩니다. 관리자·멤버 계정은 설정 화면에서 추가합니다.</p>
        <SetupForm token={token} />
      </div>
    </div>
  );
}
