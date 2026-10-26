import Link from "next/link";
import { all } from "@/lib/db";
import type { Character } from "@/lib/types";
import { Avatar, Card, ReadyBadges } from "@/components/ui";

export default function Characters() {
  const characters = all<Character>("characters");
  return (
    <>
      <div className="view-title"><h1>캐릭터</h1><span className="id">C-01</span><span className="crumb">전체 {characters.length}명</span></div>
      <div className="home" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}>
        {characters.map((c) => (
          <Card key={c.id} title={c.name} sub={`${c.species} · ${c.age}세 · ${c.height}`} more="상세" moreHref={`/characters/${c.id}`}>
            <div className="hero" style={{ padding: 0 }}>
              <Avatar initial={c.initial} color={c.color} size="lg" />
              <div className="t"><p className="small muted">{c.intro}</p><div className="chips"><span className="chip role">{c.role}</span><span className="chip">{c.residence}</span></div></div>
            </div>
            <div style={{ marginTop: 12 }}><ReadyBadges r={c.ready} /></div>
            <p className="small muted" style={{ marginTop: 8 }}>고정 프롬프트 {c.promptVersion} · Soul ID {c.soul.status}</p>
            <div style={{ marginTop: 10 }}><Link className="btn sm ghost" href={`/characters/${c.id}`}>열기</Link></div>
          </Card>
        ))}
      </div>
    </>
  );
}
