import Link from "next/link";
import { notFound } from "next/navigation";
import { all, one } from "@/lib/db";
import type { Asset } from "@/lib/types";
import { Card, Field, Sec, Status } from "@/components/ui";

export default async function AssetPage({ params }: PageProps<"/assets/[id]">) {
  const { id } = await params;
  const a = one<Asset>("assets", id);
  if (!a) notFound();
  const counts = all<Asset>("assets").reduce<Record<string, number>>((m, x) => { m[x.kind] = (m[x.kind] ?? 0) + 1; return m; }, {});
  const unverified = all<Asset>("assets").filter((x) => x.status.includes("미확인") && x.id !== id);
  const hasRefs = (a.refs?.length ?? 0) > 0;
  return (
    <>
      <div className="view-title"><h1>소재</h1><span className="id">A-02</span><span className="crumb">소재 › {a.kind} › {a.name}</span>
        <div className="actions"><button className="btn sm ghost" type="button">다운로드</button><button className="btn sm ghost" type="button" disabled={hasRefs} title={hasRefs ? "참조 중인 곳이 있어 삭제할 수 없습니다" : ""}>삭제</button></div></div>
      <div className="detail">
        <section className="card"><div className="pane">
          <div style={{ display: "grid", gridTemplateColumns: "200px minmax(0,1fr)", gap: 18, alignItems: "start" }}>
            <div className="slot"><span className="ph" style={{ aspectRatio: "3/4" }}>{a.kind}</span><b>{a.name}</b>{a.size && <span>{a.size}</span>}{a.hash && <span className="mono">{a.hash}</span>}</div>
            <div>
              <div className="grid2"><Field label="유형">{a.kind}</Field><Field label="앵커 역할">{a.role || "—"}</Field><Field label="승인 상태"><Status cls={a.status === "승인" ? "ok" : a.status.includes("미확인") ? "bad" : ""}>{a.status}</Status></Field><Field label="추가">{a.at} · {a.by}</Field></div>
              {a.links && a.links.length > 0 && <Sec title="연결"><div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{a.links.map((l) => <span key={l} className="chip">{l}</span>)}</div></Sec>}
              {a.note && <p className="note warn" style={{ marginTop: 12 }}>{a.note}</p>}
            </div>
          </div>
          <Sec title="출처 · 권리">
            <div className="grid2"><Field label="출처">{a.source ?? "—"}</Field><Field label="생성 도구">{a.tool ?? "—"}</Field><Field label="라이선스">{a.license ?? "—"}</Field><Field label="초상 · 퍼블리시티 동의">{a.portrait ?? "—"}</Field><Field label="수정 · 파생 허용">{a.derive ?? "—"}</Field></div>
            <div className="f" style={{ marginTop: 12 }}><small>실존 인물 유사성 검토 메모 (실사 얼굴 레퍼런스 필수)</small><span>{a.similarity || <span className="st bad">미작성 · 승인 불가</span>}</span></div>
          </Sec>
          {a.lineage && <Sec title="생성 계보"><div className="vers">{a.lineage.map((l, i) => <div key={i}><span className="v">{l.v}</span><span>{l.text}</span><span className="muted small">{l.at}</span></div>)}</div></Sec>}
          {a.refs && <Sec title="참조 중인 곳" more="참조가 남아 있는 동안 삭제 불가"><div className="vers">{a.refs.map((r, i) => <div key={i}><span className="v">{r.v}</span><span>{r.text}</span><span className="muted small">{r.at}</span></div>)}</div></Sec>}
        </div></section>
        <aside className="col">
          <Card title="소재 전체" sub="A-01"><div className="vers">{Object.entries(counts).map(([k, n]) => <div key={k}><span className="v num">{n}</span><Link href={`/assets?kind=${encodeURIComponent(k)}`}>{k}</Link><span></span></div>)}<div><span className="v num">0</span><span className="muted">휴지통</span><span className="muted small">30일 후 영구 삭제</span></div></div></Card>
          {unverified.length > 0 && <Card title="권리 미확인"><div className="row-list">{unverified.map((u) => <Link key={u.id} className="arow" href={`/assets/${u.id}`}><span className="ph">{u.name.split(".").pop()?.toUpperCase()}</span><span className="t"><b>{u.name}</b><span>{u.note}</span></span></Link>)}</div></Card>}
        </aside>
      </div>
    </>
  );
}
