import Link from "next/link";
import { all } from "@/lib/db";
import type { Asset } from "@/lib/types";
import { Status } from "@/components/ui";

const KINDS = ["전체", "이미지", "영상", "설정집", "대사", "스토리 노트", "기타"];

export default async function Assets({ searchParams }: PageProps<"/assets">) {
  const sp = await searchParams;
  const kind = typeof sp.kind === "string" ? sp.kind : "전체";
  const assets = all<Asset>("assets").filter((a) => kind === "전체" || a.kind === kind).sort((a, b) => b.at.localeCompare(a.at));
  return (
    <>
      <div className="view-title"><h1>소재</h1><span className="id">A-01</span><span className="crumb">{assets.length}건</span><div className="actions"><Link className="btn sm ghost" href="/assets?kind=휴지통">휴지통</Link></div></div>
      <section className="card">
        <div className="dtabs" role="tablist">{KINDS.map((k) => <Link key={k} role="tab" aria-selected={k === kind} href={k === "전체" ? "/assets" : `/assets?kind=${encodeURIComponent(k)}`}>{k}</Link>)}</div>
        <div className="pane">
          {assets.length === 0 && <div className="empty"><b>{kind === "휴지통" ? "휴지통이 비어 있습니다" : "등록된 소재가 없습니다"}</b><span>{kind === "휴지통" ? "삭제한 소재는 30일 뒤 영구 삭제됩니다." : "업로드는 다음 단계에서 붙입니다."}</span></div>}
          <div className="row-list">
            {assets.map((a) => <Link key={a.id} className="arow" href={`/assets/${a.id}`}><span className="ph">{a.name.split(".").pop()?.toUpperCase()}</span><span className="t"><b>{a.name}</b><span>{a.kind}{a.role ? ` · ${a.role}` : ""} · {a.at} · {a.by}</span></span><Status cls={a.status === "승인" ? "ok" : a.status.includes("미확인") ? "bad" : ""}>{a.status}</Status></Link>)}
          </div>
        </div>
      </section>
    </>
  );
}
