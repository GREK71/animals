/* eslint-disable @next/next/no-img-element -- 업로드 파일은 로그인 뒤 /files 로만 서빙되어 next/image 최적화를 쓰지 않는다 */
import Link from "next/link";
import { notFound } from "next/navigation";
import { all, one } from "@/lib/db";
import { STATUS_CLASS, STATUS_LABEL, type Asset, type Character, type Episode, type Issue, type PromptVersion, type RelationChange } from "@/lib/types";
import { Avatar, Card, Field, ReadyBadges, Sec, Status, Tabs } from "@/components/ui";
import CopyButton from "@/components/CopyButton";
import UploadForm from "@/components/UploadForm";
import Lightbox from "@/components/Lightbox";
import { filesFor } from "@/lib/files";
import { deleteCharacter, deleteCharacterFile, saveFixedPrompt, uploadCharacterFiles } from "./actions";
import ConfirmForm from "@/components/ConfirmForm";
import { canManage, requireUser } from "@/lib/session";
import CharacterForm from "../CharacterForm";
import { mentions } from "@/lib/names";

const TABS = [{ key: "basic", label: "기본" }, { key: "visual", label: "비주얼 가이드" }, { key: "voice", label: "성격·말투" }, { key: "rel", label: "관계" }, { key: "ep", label: "에피소드" }, { key: "asset", label: "소재" }];

export default async function CharacterPage({ params, searchParams }: PageProps<"/characters/[id]">) {
  const { id } = await params;
  const me = await requireUser();
  const sp = await searchParams;
  const tab = typeof sp.tab === "string" ? sp.tab : "basic";
  const edit = sp.edit === "1";
  const c = one<Character>("characters", id);
  if (!c) notFound();
  const others = all<Character>("characters").filter((x) => x.id !== id);
  const versions = all<PromptVersion>("prompt_versions", { col: "owner_id", val: id }).sort((a, b) => b.v.localeCompare(a.v));
  const current = versions.find((v) => v.current);
  const issues = all<Issue>("issues").filter((i) => mentions(i.scope, c.name));
  const episodes = all<Episode>("episodes", undefined, "no").filter((e) => e.characters.includes(id));
  const changes = all<RelationChange>("relation_changes");
  const assets = all<Asset>("assets").filter((a) => mentions(a.role, c.name) || a.links?.some((l) => mentions(l, c.name)));
  const uploads = filesFor("character", id);

  return (
    <>
      <div className="view-title"><h1>캐릭터</h1><span className="id">C-02</span><span className="crumb">캐릭터 › {c.name}</span></div>
      <div className="detail">
        <section className="card">
          <div className="hero">
            <Avatar initial={c.initial} color={c.color} size="lg" />
            <div className="t"><h2>{c.name}</h2><div className="chips"><span className="chip role">{c.role}</span><span className="chip">{c.species}</span><span className="chip">{c.age}세 · {c.height}</span><span className="chip">{c.residence}</span>{issues.filter((i) => i.status !== "decided").length > 0 && <span className="chip todo">미정 {issues.filter((i) => i.status !== "decided").length}건</span>}</div></div>
            <div className="actions">{c.sheetPrompt && <CopyButton text={c.sheetPrompt} label="시트 프롬프트 복사" className="btn sm ghost" />}{current && <CopyButton text={current.body} label={`고정 프롬프트 ${current.v} 복사`} />}<Link className="btn sm ghost" href={`/characters/${id}?tab=basic&edit=1`}>설정 수정</Link></div>
          </div>
          <Tabs base={`/characters/${id}`} tabs={TABS} current={tab} />

          {tab === "basic" && edit && (
            <div className="pane">
              <CharacterForm id={id} c={c} />
              {canManage(me) && (
                <div className="danger-zone">
                  <div><b>캐릭터 삭제</b><span className="muted small">올려 둔 레퍼런스 이미지와 고정 프롬프트 버전도 함께 지워집니다. 샷·소재에 적힌 이름은 남습니다. 되돌릴 수 없습니다.</span></div>
                  <ConfirmForm action={deleteCharacter} hidden={{ id }} message={`"${c.name}" 캐릭터를 삭제할까요? 이미지와 고정 프롬프트도 지워지며 되돌릴 수 없습니다.`} label="삭제" />
                </div>
              )}
            </div>
          )}

          {tab === "basic" && !edit && (
            <div className="pane">
              <div className="grid2">
                <Field label="이름">{c.name}</Field><Field label="나이 · 성별">{c.age} · {c.sex}</Field><Field label="키">{c.height}</Field>
                <Field label="종">{c.species}</Field><Field label="거주지">{c.residence}</Field><Field label="직업">{c.job}</Field>
              </div>
              <Sec title="한 줄 소개"><p>{c.intro}</p></Sec>
              <Sec title="캐릭터 시트 프롬프트" more={c.sheetPrompt ? "시트 이미지를 만들 때 쓴 프롬프트 · 복사해서 GPT·힉스필드에" : "아직 없음 · 설정 수정에서 입력"}>
                {c.sheetPrompt ? <div className="prompt"><div className="ph"><span>캐릭터 시트</span><CopyButton text={c.sheetPrompt} className="btn sm" /></div><pre>{c.sheetPrompt}</pre></div> : <p className="muted small">설정 수정 화면의 &quot;캐릭터 시트 프롬프트&quot; 칸에 넣으면 여기 표시됩니다.</p>}
              </Sec>
              <Sec title="배경"><ul className="pl">{c.background.map((b) => <li key={b}>{b}</li>)}</ul></Sec>
              <Sec title="이 캐릭터의 미정 항목" more="미정 항목(O-01)에 저장됩니다">
                <div className="row-list">
                  {issues.length === 0 && <p className="muted small">없음</p>}
                  {issues.map((i) => <Link key={i.id} className="iss" href="/issues"><span className="k">{i.scope.split(" · ")[0]}</span><span className="t"><b>{i.title}</b><span>{i.options !== "—" ? i.options : i.desc}{i.blocks !== "—" ? ` · ${i.blocks} 영향` : ""}{i.status === "decided" ? ` · 결정: ${i.decided}` : ""}</span></span></Link>)}
                </div>
              </Sec>
            </div>
          )}

          {tab === "visual" && (
            <div className="pane">
              <Sec title="레퍼런스 슬롯" more="PNG · JPG · WEBP, 장당 20MB까지 · 생성 시 AI가 이 이미지를 보고 외형을 옮깁니다" first>
                <div className="slots">
                  {c.slots.map((s) => {
                    const fs = uploads.filter((f) => f.slot === s.role);
                    const multi = s.role.includes("학습 세트");
                    const empty = fs.length === 0;
                    return (
                      <div key={s.role} className={`slot ${empty ? "empty" : ""}`}>
                        <span className="ph">{fs[0] ? <a href={`/files/${fs[0].id}`} data-lightbox="char" data-lightbox-id={fs[0].id} title="크게 보기"><img src={`/files/${fs[0].id}`} alt={s.role} /></a> : (s.note ?? "미등록")}</span>
                        <b>{s.role}</b>
                        {empty ? <><span>{s.file}</span><Status cls={s.status === "미학습" ? "warn" : ""}>{s.status}</Status></> : <Status cls="ok">{multi ? `${fs.length}장 등록` : "등록됨"}</Status>}
                        {fs.length > 1 && <div className="thumbs">{fs.slice(1).map((f) => <a key={f.id} href={`/files/${f.id}`} data-lightbox="char" data-lightbox-id={f.id} title={f.name}><img src={`/files/${f.id}`} alt={f.name} /></a>)}</div>}
                        {fs.length > 0 && <div className="files">{fs.map((f) => <div key={f.id}><a href={`/files/${f.id}`} data-lightbox="char" data-lightbox-id={f.id} title={f.name}>{f.name}</a><form action={deleteCharacterFile}><input type="hidden" name="id" value={f.id} /><button type="submit" title="삭제">✕</button></form></div>)}</div>}
                        <UploadForm action={uploadCharacterFiles} hidden={{ characterId: id, slot: s.role }} multiple={multi} label={empty ? "이미지 올리기" : multi ? "더 올리기" : "교체 · 추가"} />
                      </div>
                    );
                  })}
                </div>
              </Sec>
              <Lightbox group="char" images={c.slots.flatMap((s) => uploads.filter((f) => f.slot === s.role).map((f) => ({ id: f.id, url: `/files/${f.id}`, name: f.name, caption: `${c.name} · ${s.role}` })))} />
              <Sec title="Soul ID (힉스필드)">
                <div className="grid2"><Field label="상태"><Status cls={c.soul.status === "사용 가능" ? "ok" : "warn"}>{c.soul.status}</Status></Field><Field label="학습 세트">{c.soul.setCount}장</Field><Field label="학습 모델">{c.soul.model}</Field><Field label="힉스필드 ID">{c.soul.hfId}</Field></div>
                <p className="note" style={{ marginTop: 10 }}>Soul ID는 학습한 모델에 묶입니다. 학습 세트 원본은 소재로 보관해 모델이 바뀌면 재학습합니다.</p>
              </Sec>
              <Sec title="레퍼런스 우선순위"><ol className="pl">{c.refPriority.map((r) => <li key={r}>{r}</li>)}</ol></Sec>
              <Sec title="인간형 외형 기준"><ul className="pl">{c.appearance.map((a) => <li key={a}>{a}</li>)}</ul></Sec>
              <Sec title="고정 프롬프트" more={current ? `현재 ${current.v} · 저장하면 새 버전이 추가되고 과거 생성 시도는 당시 버전을 유지` : "아직 없음 · 아래에 입력"}>
                {current && <div className="prompt"><div className="ph"><span>한국어</span><span className="mono">{current.v} · {current.at}</span><CopyButton text={current.body} /></div><pre>{current.body}</pre></div>}
                <details className="cf-d" style={{ marginTop: 10 }} open={!current}>
                  <summary className="btn sm ghost">{current ? "새 버전으로 수정" : "고정 프롬프트 입력"}</summary>
                  <form action={saveFixedPrompt} className="sp-edit" style={{ marginTop: 10 }}>
                    <input type="hidden" name="characterId" value={id} />
                    <label>본문 (한국어 · GPT 요청문과 생성에 그대로 들어갑니다)<textarea name="body" rows={10} defaultValue={current?.body ?? ""} required /></label>
                    <label>변경 메모<input name="memo" placeholder="예: 의상 기본값을 회색 후드티로" /></label>
                    <div className="sp-row"><button className="btn sm" type="submit">새 버전으로 저장</button></div>
                  </form>
                </details>
              </Sec>
              <Sec title="버전 이력">
                <div className="vers">{versions.map((v) => <div key={v.id}><span className={`v ${v.current ? "cur" : "muted"}`}>{v.v}</span><span className={v.current ? "" : "muted"}>{v.memo}</span><span className="muted small">{v.at}</span></div>)}</div>
              </Sec>
            </div>
          )}

          {tab === "voice" && (
            <div className="pane">
              <Sec title="성격 키워드" first><div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{c.keywords.map((k) => <span key={k} className="chip">{k}</span>)}</div></Sec>
              <Sec title="호칭"><div className="tw"><table><thead><tr><th>상대</th><th>{c.name}이(가) 부를 때</th><th>상대가 부를 때</th><th>말투</th></tr></thead><tbody>{c.honorifics.map((h) => <tr key={h.to}><td>{h.to}</td><td>{h.call}</td><td>{h.called}</td><td>{h.tone}</td></tr>)}</tbody></table></div></Sec>
              <Sec title="습성 태그" more="에피소드 개요에서 소재로 끌어옵니다"><div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{c.habits.map((k) => <span key={k} className="chip">{k}</span>)}</div></Sec>
              <Sec title="금지 표현"><ul className="pl">{c.forbidden.map((f) => <li key={f}>{f}</li>)}</ul></Sec>
            </div>
          )}

          {tab === "rel" && (
            <div className="pane">
              {c.relations.map((r) => {
                const other = others.find((o) => o.id === r.to);
                return (
                  <div key={r.to}>
                    <Sec title={other?.name ?? r.to} more="현재 상태는 변화 이력의 최신값에서 계산" first>
                      <div className="grid2"><Field label="관계 유형">{r.types.join(" / ")}</Field><Field label="현재 상태">{r.current}</Field></div>
                    </Sec>
                    <Sec title="변화 이력 (RelationChange)">
                      <div className="tw"><table><thead><tr><th>에피소드</th><th>전</th><th>후</th><th>메모</th></tr></thead><tbody>
                        {changes.map((ch) => { const ep = one<Episode>("episodes", ch.episodeId); return <tr key={ch.id} className={ch.planned ? "muted" : ""}><td className={ch.planned ? "muted" : ""}>{ep?.no}{ch.planned ? " (예정)" : ""}</td><td className={ch.planned ? "muted" : ""}>{ch.before}</td><td className={ch.planned ? "muted" : ""}>{ch.after}</td><td className={ch.planned ? "muted" : ""}>{ch.memo}</td></tr>; })}
                      </tbody></table></div>
                    </Sec>
                  </div>
                );
              })}
            </div>
          )}

          {tab === "ep" && (
            <div className="pane"><div className="row-list">
              {episodes.map((e) => <Link key={e.id} className="erow" href={`/episodes/${e.id}`}><span className="no">{e.no}</span><span className="t"><b>{e.title}</b><span>{e.hook}</span></span><Status cls={STATUS_CLASS[e.status]}>{STATUS_LABEL[e.status]}</Status></Link>)}
            </div></div>
          )}

          {tab === "asset" && (
            <div className="pane"><div className="row-list">
              {assets.length === 0 && <p className="muted small">연결된 소재가 없습니다.</p>}
              {assets.map((a) => <Link key={a.id} className="arow" href={`/assets/${a.id}`}><span className="ph">{a.name.split(".").pop()?.toUpperCase()}</span><span className="t"><b>{a.name}</b><span>{a.role} · {a.status}</span></span></Link>)}
            </div></div>
          )}
        </section>

        <aside className="col">
          <Card title="다른 캐릭터">
            <div className="row-list">{others.map((o) => <Link key={o.id} className="crow" href={`/characters/${o.id}`}><Avatar initial={o.initial} color={o.color} /><span className="t"><b>{o.name}</b><span>{o.species} · {o.age}</span><ReadyBadges r={o.ready} /></span></Link>)}</div>
          </Card>
        </aside>
      </div>
    </>
  );
}
