import { all } from "@/lib/db";
import type { Episode, Place } from "@/lib/types";
import { Card, Sec } from "@/components/ui";

export default function Places() {
  const places = all<Place>("places");
  const episodes = all<Episode>("episodes");
  return (
    <>
      <div className="view-title"><h1>장소</h1><span className="id">W-02 · W-03</span><span className="crumb">반복 등장하는 고정 세트</span></div>
      <div className="home" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))" }}>
        {places.map((p) => {
          const eps = episodes.filter((e) => e.places.includes(p.id));
          return (
            <Card key={p.id} title={p.name} sub={`${p.group} · ${p.note}`} more={p.anchor ? "앵커 승인" : "앵커 미등록"}>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 6 }}><span className="ready"><i className={p.anchor ? "" : "no"}>앵커</i></span><span className="chip">공통 프롬프트 {p.promptVersion}</span><span className="chip">등장 {eps.length}편</span></div>
              <Sec title="고정 요소">{p.fixed.length ? <ul className="pl">{p.fixed.map((f) => <li key={f}>{f}</li>)}</ul> : <p className="muted small">미정</p>}</Sec>
              <Sec title="유동 요소">{p.variable.length ? <ul className="pl">{p.variable.map((f) => <li key={f}>{f}</li>)}</ul> : <p className="muted small">—</p>}</Sec>
            </Card>
          );
        })}
      </div>
    </>
  );
}
