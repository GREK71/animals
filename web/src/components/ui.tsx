import Link from "next/link";
import type { Ready } from "@/lib/types";

export function Status({ cls, children }: { cls?: string; children?: React.ReactNode }) {
  return <span className={`st ${cls ?? ""}`}>{children}</span>;
}

export function ReadyBadges({ r, animalLabel = "동물형" }: { r: Ready; animalLabel?: string }) {
  const items: [string, boolean][] = [["얼굴", r.face], ["시트", r.sheet], ["Soul ID", r.soul], [animalLabel, r.animal]];
  return <span className="ready">{items.map(([l, ok]) => <i key={l} className={ok ? "" : "no"}>{l}</i>)}</span>;
}

export function Avatar({ initial, color, size }: { initial: string; color: string; size?: "sm" | "lg" }) {
  return <span className={`av ${size ?? ""}`} style={{ background: color }}>{initial}</span>;
}

export function Tabs({ base, tabs, current }: { base: string; tabs: { key: string; label: string }[]; current: string }) {
  return (
    <div className="dtabs" role="tablist">
      {tabs.map((t) => (
        <Link key={t.key} role="tab" aria-selected={t.key === current} href={t.key === tabs[0].key ? base : `${base}?tab=${t.key}`}>{t.label}</Link>
      ))}
    </div>
  );
}

export function Card({ title, sub, more, moreHref, children }: { title: string; sub?: string; more?: string; moreHref?: string; children: React.ReactNode }) {
  return (
    <section className="card">
      <div className="hd">
        <div><h2>{title}</h2>{sub && <p>{sub}</p>}</div>
        {more && (moreHref ? <Link className="more" href={moreHref}>{more}</Link> : <span className="more">{more}</span>)}
      </div>
      <div className="bd">{children}</div>
    </section>
  );
}

export function Sec({ title, more, children, first }: { title: string; more?: string; children: React.ReactNode; first?: boolean }) {
  return (
    <div className="sec" style={first ? { marginTop: 0 } : undefined}>
      <h3>{title}{more && <span className="more">{more}</span>}</h3>
      {children}
    </div>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="f"><small>{label}</small><span>{children}</span></div>;
}
