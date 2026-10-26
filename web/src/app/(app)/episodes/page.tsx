import Link from "next/link";
import { all } from "@/lib/db";
import { STATUS_CLASS, STATUS_LABEL, type Character, type Episode, type Shot } from "@/lib/types";
import { Status } from "@/components/ui";

export default function Episodes() {
  const episodes = all<Episode>("episodes", undefined, "no");
  const characters = all<Character>("characters");
  const shots = all<Shot>("shots");
  return (
    <>
      <div className="view-title"><h1>에피소드</h1><span className="id">E-01</span><span className="crumb">{episodes.length}편</span></div>
      <section className="card"><div className="pane"><div className="tw"><table>
        <thead><tr><th>회차</th><th>제목</th><th>상태</th><th>등장인물</th><th>샷 진행</th><th>길이</th></tr></thead>
        <tbody>
          {episodes.map((e) => { const s = shots.filter((x) => x.episodeId === e.id); const done = s.filter((x) => x.status === "done").length; return (
            <tr key={e.id}><td className="mono">{e.no}</td><td><Link href={`/episodes/${e.id}`}><b>{e.title}</b></Link><br /><span className="muted small">{e.hook}</span></td><td><Status cls={STATUS_CLASS[e.status]}>{STATUS_LABEL[e.status]}</Status></td><td>{e.characters.map((c) => characters.find((x) => x.id === c)?.name ?? c).join(" · ")}</td><td className="num">{s.length ? `${done} / ${s.length}` : "—"}</td><td>{e.length || "—"}</td></tr>
          ); })}
        </tbody></table></div></div></section>
    </>
  );
}
