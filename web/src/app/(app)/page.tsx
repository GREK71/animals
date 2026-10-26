import Link from "next/link";
import { all } from "@/lib/db";
import { SHOT_CLASS, SHOT_LABEL, STATUS_CLASS, STATUS_LABEL, type Asset, type Character, type Episode, type Issue, type Place, type Shot } from "@/lib/types";
import { Avatar, Card, ReadyBadges, Status } from "@/components/ui";

export default function Home() {
  const characters = all<Character>("characters");
  const places = all<Place>("places");
  const episodes = all<Episode>("episodes", undefined, "no");
  const issues = all<Issue>("issues").filter((i) => i.status !== "decided");
  const assets = all<Asset>("assets").sort((a, b) => b.at.localeCompare(a.at)).slice(0, 4);
  const current = episodes.find((e) => e.status === "prod") ?? episodes.find((e) => e.status === "plan");
  const shots = current ? all<Shot>("shots", { col: "episode_id", val: current.id }, "no") : [];
  const done = shots.filter((s) => s.status === "done").length;
  const cand = shots.filter((s) => s.status === "cand" || s.status === "key").length;

  return (
    <>
      <div className="view-title"><h1>홈</h1><span className="id">H-01</span><span className="crumb">작업 시작 화면</span>
        <div className="actions"><Link className="btn sm ghost" href="/episodes">에피소드 목록</Link></div></div>
      <div className="home">
        <div className="col">
          <Card title="캐릭터" sub="레퍼런스 준비: 얼굴 · 시트 · Soul ID · 동물형" more="전체 보기" moreHref="/characters">
            <div className="row-list">
              {characters.map((c) => (
                <Link key={c.id} className="crow" href={`/characters/${c.id}`}>
                  <Avatar initial={c.initial} color={c.color} />
                  <span className="t"><b>{c.name}</b><span>{c.species} · {c.age} · {c.residence.includes("집주인") ? "집주인" : "입주자"}</span><ReadyBadges r={c.ready} /></span>
                  <span className="r"><span className="mono">{c.promptVersion}</span></span>
                </Link>
              ))}
              <div className="crow"><span className="av ghost">?</span><span className="t"><b className="muted">세 번째 입주자</b><span>종·관계 미정</span></span><span className="r"><Link className="chip todo" href="/issues">미정 항목</Link></span></div>
            </div>
          </Card>
          <Card title="장소" sub="앵커 · 공통 프롬프트" more="전체 보기" moreHref="/places">
            <div className="row-list">
              {places.map((p) => (
                <Link key={p.id} className="crow" href="/places">
                  <span className="av place">{p.short}</span>
                  <span className="t"><b>{p.name}</b><span>{p.note}</span></span>
                  <span className="r"><span className="ready"><i className={p.anchor ? "" : "no"}>앵커</i></span><span className="mono">{p.promptVersion}</span></span>
                </Link>
              ))}
            </div>
          </Card>
        </div>

        <div className="col">
          <Card title="제작 중인 에피소드" sub={current ? `${current.no} ${current.title} · 샷 ${shots.length}개 · 확정 ${done} · 후보 검토 ${cand}` : "제작 중인 에피소드가 없습니다"} more="상세 열기" moreHref={current ? `/episodes/${current.id}?tab=shots` : "/episodes"}>
            <div className="board">
              {shots.map((s) => (
                <Link key={s.id} className="shot" href={`/episodes/${s.episodeId}?tab=shots`}>
                  <span className="no">{s.no}</span>
                  <span className="t"><b>{s.title}</b><span>{s.who} · {s.place} · {s.length}</span></span>
                  <span className="r"><Status cls={SHOT_CLASS[s.status]}>{SHOT_LABEL[s.status]}</Status><span>{s.candidates ? `후보 ${s.candidates}` : "—"}</span></span>
                </Link>
              ))}
            </div>
            <div className="next"><b>다음 할 일</b><span>이현 Soul ID 학습 세트 만들기 (얼굴 앵커로 다각도 스틸 20장) → 샷 2·3a 영상 후보 확정 → 샷 3b 키프레임 조합</span></div>
          </Card>
          <Card title="에피소드" more="전체 보기" moreHref="/episodes">
            <div className="row-list">
              {episodes.map((e) => (
                <Link key={e.id} className="erow" href={`/episodes/${e.id}`}>
                  <span className="no">{e.no}</span>
                  <span className="t"><b>{e.title}</b><span>{e.characters.map((c) => characters.find((x) => x.id === c)?.name ?? c).join(" · ")}{e.places.length ? " · " + e.places.map((p) => places.find((x) => x.id === p)?.short ?? p).join(", ") : ""}</span></span>
                  <Status cls={STATUS_CLASS[e.status]}>{STATUS_LABEL[e.status]}</Status>
                </Link>
              ))}
            </div>
          </Card>
        </div>

        <div className="col right">
          <Card title="미정 항목" sub={`열림 ${issues.length}건`} more="전체 보기" moreHref="/issues">
            <div className="row-list">
              {issues.map((i) => (
                <Link key={i.id} className="iss" href="/issues"><span className="k">{i.scope.split(" · ")[0]}</span><span className="t"><b>{i.title}</b><span>{i.blocks !== "—" ? `${i.blocks}를 막고 있음` : i.options}</span></span></Link>
              ))}
            </div>
          </Card>
          <Card title="최근 추가된 소재" more="전체 보기" moreHref="/assets">
            <div className="row-list">
              {assets.map((a) => (
                <Link key={a.id} className="arow" href={`/assets/${a.id}`}><span className="ph">{a.name.split(".").pop()?.toUpperCase()}</span><span className="t"><b>{a.name}</b><span>{a.kind}{a.role ? ` · ${a.role}` : ""} · {a.at}</span></span></Link>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
