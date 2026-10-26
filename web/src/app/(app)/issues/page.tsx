import { all } from "@/lib/db";
import type { Issue } from "@/lib/types";
import { Card, Status } from "@/components/ui";
import { addIssue, decideIssue, reopenIssue } from "./actions";

export default async function Issues({ searchParams }: PageProps<"/issues">) {
  const sp = await searchParams;
  const issues = all<Issue>("issues");
  const open = issues.filter((i) => i.status !== "decided");
  const decided = issues.filter((i) => i.status === "decided");
  const selId = typeof sp.sel === "string" ? sp.sel : open[0]?.id;
  const sel = issues.find((i) => i.id === selId);
  return (
    <>
      <div className="view-title"><h1>미정 항목</h1><span className="id">O-01</span><span className="crumb">프로젝트 전체 · 열림 {open.length} · 결정 {decided.length}</span></div>
      <div className="detail">
        <section className="card"><div className="pane"><div className="tw"><table>
          <thead><tr><th>소속</th><th>항목</th><th>선택지</th><th>막는 에피소드</th><th>상태</th><th></th></tr></thead>
          <tbody>
            {[...open, ...decided].map((i) => (
              <tr key={i.id} style={sel?.id === i.id ? { background: "var(--accent-soft)" } : undefined}>
                <td><span className="chip">{i.scope}</span></td>
                <td><b>{i.title}</b>{i.desc && <><br /><span className="muted small">{i.desc}</span></>}</td>
                <td>{i.options}</td><td>{i.blocks}</td>
                <td>{i.status === "decided" ? <Status cls="ok">결정 · {i.decidedAt}</Status> : <Status cls={i.status === "open" ? "bad" : "warn"}>열림</Status>}</td>
                <td>{i.status === "decided" ? <form action={reopenIssue}><input type="hidden" name="id" value={i.id} /><button className="btn sm ghost" type="submit">다시 열기</button></form> : <a className="btn sm ghost" href={`/issues?sel=${i.id}`}>결정</a>}</td>
              </tr>
            ))}
          </tbody></table></div></div></section>
        <aside className="col">
          {sel && sel.status !== "decided" && (
            <Card title="결정하기" sub={`선택한 항목: ${sel.title}`}>
              <form className="form" action={decideIssue}>
                <input type="hidden" name="id" value={sel.id} />
                <label className="full">결정 내용{sel.options !== "—" ? <select id="decided" name="decided" defaultValue={sel.options.split(" / ")[0]}>{sel.options.split(" / ").map((o) => <option key={o} value={o}>{o}</option>)}</select> : <input id="decided" name="decided" placeholder="결정 내용" required />}</label>
                <label className="full">메모<textarea id="memo" name="memo" rows={3} placeholder="이유와 적용 범위" /></label>
                <div><button className="btn sm" type="submit">결정하고 닫기</button></div>
              </form>
              {sel.decided && <p className="note" style={{ marginTop: 12 }}>이전 결정: {sel.decided}</p>}
            </Card>
          )}
          {sel && sel.status === "decided" && <Card title="결정됨" sub={sel.title}><p>{sel.decided}</p><p className="muted small" style={{ marginTop: 6 }}>{sel.decidedAt}</p></Card>}
          <Card title="항목 추가">
            <form className="form" action={addIssue}>
              <label className="full">소속<select id="scope" name="scope" defaultValue="채널"><option>채널</option><option>세계관</option><option>캐릭터 · 이현</option><option>캐릭터 · 서도윤</option><option>장소</option></select></label>
              <label className="full">제목<input id="title" name="title" required /></label>
              <label className="full">설명<input id="desc" name="desc" /></label>
              <label>선택지<input id="options" name="options" placeholder="A / B" /></label>
              <label>막는 에피소드<input id="blocks" name="blocks" placeholder="EP.01" /></label>
              <div><button className="btn sm ghost" type="submit">추가</button></div>
            </form>
          </Card>
        </aside>
      </div>
    </>
  );
}
