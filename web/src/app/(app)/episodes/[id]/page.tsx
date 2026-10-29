/* eslint-disable @next/next/no-img-element -- 업로드 파일은 로그인 뒤 /files 로만 서빙되어 next/image 최적화를 쓰지 않는다 */
import Link from "next/link";
import { notFound } from "next/navigation";
import { all, one } from "@/lib/db";
import { SHOT_CLASS, SHOT_LABEL, STATUS_CLASS, STATUS_LABEL, type Character, type Episode, type Issue, type Place, type RelationChange, type Run, type Shot, type Variant } from "@/lib/types";
import { Card, Field, Sec, Status, Tabs } from "@/components/ui";
import CopyButton from "@/components/CopyButton";
import UploadForm from "@/components/UploadForm";
import Lightbox from "@/components/Lightbox";
import { filesFor } from "@/lib/files";
import { aiEnabled, gptRequest } from "@/lib/prompts";
import { mentions } from "@/lib/names";
import type { ShotPrompt } from "@/lib/types";
import ShotPromptPanel from "./ShotPromptPanel";
import { deleteShotFile, uploadShotFrame } from "./actions";

const TABS = [{ key: "over", label: "개요" }, { key: "shots", label: "샷 · 생성" }, { key: "compose", label: "프롬프트 조합" }, { key: "pub", label: "게시" }];

export default async function EpisodePage({ params, searchParams }: PageProps<"/episodes/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  const tab = typeof sp.tab === "string" ? sp.tab : "over";
  const e = one<Episode>("episodes", id);
  if (!e) notFound();
  const characters = all<Character>("characters");
  const places = all<Place>("places");
  const shots = all<Shot>("shots", { col: "episode_id", val: id }, "no");
  const runsByShot = (sid: string) => all<Run>("runs", { col: "shot_id", val: sid }).sort((a, b) => b.n - a.n);
  const variantsByRun = (rid: string) => all<Variant>("variants", { col: "run_id", val: rid });
  const changes = all<RelationChange>("relation_changes", { col: "episode_id", val: id });
  const promptsFor = (sid: string) => all<ShotPrompt>("shot_prompts", { col: "shot_id", val: sid }).sort((a, b) => b.v - a.v);
  const castHasRefs = (who: string) => characters.some((c) => mentions(who, c.name) && filesFor("character", c.id).some((f) => f.slot !== "Soul ID 학습 세트"));
  const issues = all<Issue>("issues").filter((i) => i.status !== "decided" && i.blocks.includes(e.no));
  const done = shots.filter((s) => s.status === "done").length;
  const cand = shots.filter((s) => s.status === "cand" || s.status === "key").length;
  const none = shots.filter((s) => s.status === "none").length;
  const runCount = shots.reduce((n, s) => n + runsByShot(s.id).length, 0);
  const candCount = shots.reduce((n, s) => n + s.candidates, 0);
  const name = (cid: string) => characters.find((c) => c.id === cid)?.name ?? cid;
  const checklistDone = e.publish ? e.publish.checklist.every((c) => c.done) : false;

  return (
    <>
      <div className="view-title"><h1>에피소드</h1><span className="id">E-02</span><span className="crumb">에피소드 › {e.no}</span></div>
      <div className="detail">
        <section className="card">
          <div className="hero">
            <div className="t"><h2>{e.no} {e.title}</h2><div className="chips"><Status cls={STATUS_CLASS[e.status]}>{STATUS_LABEL[e.status]}</Status>{e.length && <span className="chip">{e.length}</span>}{e.series && <span className="chip">시리즈: {e.series}</span>}{shots.length > 0 && <span className="chip">샷 확정 {done} / {shots.length}</span>}</div></div>
            <div className="actions"><Link className="btn sm" href={`/episodes/${id}?tab=compose`}>프롬프트 조합</Link></div>
          </div>
          <Tabs base={`/episodes/${id}`} tabs={TABS} current={tab} />

          {tab === "over" && (
            <div className="pane">
              <div className="grid2"><Field label="훅 (첫 자막)">{e.hook}</Field><Field label="등장인물">{e.characters.map(name).join(" · ")}</Field><Field label="장소">{e.places.map((p) => places.find((x) => x.id === p)?.short ?? p).join(" · ") || "—"}</Field><Field label="시간 · 조명">{e.lighting || "—"}</Field></div>
              <Sec title="줄거리"><p>{e.summary}</p></Sec>
              <Sec title="습성 태그"><div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{e.habits.map((h) => <span key={h} className="chip">{h}</span>)}</div></Sec>
              {e.continuity.length > 0 && <Sec title="연속성 체크리스트" more="샷 생성 시 참조"><div className="todo">{e.continuity.map((c, i) => <label key={i}><input type="checkbox" defaultChecked={c.done} readOnly /><span>{c.text}</span></label>)}</div></Sec>}
              <Sec title="관계 변화">
                <div className="row-list">{changes.length === 0 && <p className="muted small">없음</p>}{changes.map((ch) => <div key={ch.id} className="iss"><span className="k">{ch.pair}</span><span className="t"><b>{ch.before} → {ch.after}</b><span>{ch.memo}{ch.planned ? " · 예정" : ""}</span></span></div>)}</div>
              </Sec>
            </div>
          )}

          {tab === "shots" && (
            <div className="pane">
              <Lightbox group="frames" images={shots.flatMap((s) => filesFor("shot", s.id).map((f) => ({ id: f.id, url: `/files/${f.id}`, name: f.name, caption: `${e.no} 샷 ${s.no} 시작 프레임` })))} />
              {shots.length === 0 && <div className="empty"><b>샷이 없습니다</b><span>기획 단계에서 샷 리스트를 추가합니다.</span></div>}
              <div className="board">
                {shots.map((s) => {
                  const runs = runsByShot(s.id);
                  return (
                    <details key={s.id} className="shotx" open={s.status === "done"}>
                      <summary className="h"><span className="no">{s.no}</span><span><b>{s.title}</b><span>{s.who} · {s.place} · {s.length} · {s.camera}{s.subtitle ? ` · 자막 ${s.subtitle}` : ""}</span></span><Status cls={SHOT_CLASS[s.status]}>{SHOT_LABEL[s.status]}</Status></summary>
                      <div className="b">
                        <Sec title="씬 프롬프트" more="GPT 요청문 복사 → 결과 입력 → 복사해서 힉스필드에" first>
                          <ShotPromptPanel shotId={s.id} current={promptsFor(s.id)[0] ?? null} versions={promptsFor(s.id).length} aiEnabled={aiEnabled()} gptRequest={gptRequest(s.id) ?? ""} hasRefs={castHasRefs(s.who)} hasFrame={filesFor("shot", s.id).length > 0} />
                        </Sec>
                        <Sec title="시작 프레임" more="힉스필드에서 확정한 키프레임을 올려 두면 모션 프롬프트가 이 프레임 기준으로 나옵니다">
                          <div className="frame">
                            {filesFor("shot", s.id).map((f) => <div key={f.id} className="frame-item"><a className="img" href={`/files/${f.id}`} data-lightbox="frames" data-lightbox-id={f.id} title="크게 보기"><img src={`/files/${f.id}`} alt={f.name} /></a><div className="meta"><span>{f.name}</span><span>{f.by} · {f.at.slice(0, 10)}</span><form action={deleteShotFile}><input type="hidden" name="id" value={f.id} /><button type="submit">삭제</button></form></div></div>)}
                            <UploadForm action={uploadShotFrame} hidden={{ shotId: s.id }} label={filesFor("shot", s.id).length ? "프레임 추가" : "시작 프레임 올리기"} />
                          </div>
                        </Sec>
                        <Sec title="생성 시도">
                        {runs.length === 0 && <div className="run"><div className="m">생성 시도 없음</div></div>}
                        {runs.map((r) => {
                          const vs = variantsByRun(r.id);
                          return (
                            <div key={r.id}>
                              <div className="run"><div><b>시도 {r.n} · {r.stage}</b> <span className="m">· {r.model} · {r.at} · {r.note}</span></div><button className="btn sm ghost" type="button">입력 스냅샷</button></div>
                              {vs.length > 0 && <div className="vars" style={{ marginTop: 8 }}>{vs.map((v) => <div key={v.id} className={`var ${v.state}`}><span className="ph">{v.label}</span><b>{v.label}{v.state === "pick" ? " 확정" : ""}</b><span>{v.note}</span></div>)}</div>}
                            </div>
                          );
                        })}
                        </Sec>
                      </div>
                    </details>
                  );
                })}
              </div>
            </div>
          )}

          {tab === "compose" && (
            <div className="pane">
              {!e.compose && <div className="empty"><b>조합할 샷이 없습니다</b><span>샷 리스트를 먼저 만듭니다.</span></div>}
              {e.compose && (
                <>
                  <p className="muted small" style={{ marginBottom: 8 }}>선택 샷: <b>{e.compose.shot}</b> · 네 블록을 합쳐 최종 프롬프트를 만들고, 스냅샷으로 저장하면 생성 시도가 &quot;입력 준비&quot; 상태로 생깁니다.</p>
                  <div className="form" style={{ marginBottom: 14 }}>
                    <label>단계<select id="stage" defaultValue="1"><option value="1">1 · 키프레임 (Soul 2.0 + Soul ID)</option><option value="2">2 · 영상 (이미지→영상, 시작 프레임 필요)</option></select></label>
                    <label>힉스필드 하위 모델<select id="tool" defaultValue="soul2"><option value="soul2">Soul 2.0 · 스틸</option><option value="soulc">Soul Cinema · 스틸</option><option value="kling" disabled>Kling 3.0 · 영상 (단계 2)</option><option value="veo" disabled>Veo 3.1 · 영상 (단계 2)</option></select></label>
                    <label>카메라 프리셋<select id="cam" defaultValue="none"><option value="none">— (키프레임 단계)</option><option value="static">static</option><option value="push">slow push-in</option></select></label>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {e.compose.blocks.map((b) => <div key={b.n} className="block"><div className="bh"><span className="n">{b.n}</span>{b.title}<span className="muted small" style={{ marginLeft: "auto" }}>{b.version}</span></div><div className="pv">{b.preview}</div></div>)}
                  </div>
                  <Sec title="정체성 · 레퍼런스" more="Soul 모델은 레퍼런스 이미지를 붙이면 프롬프트 입력이 사라지므로 둘 중 하나">
                    <div className="refs">{e.compose.refs.map((r) => <div key={r.order}><span className="o">{r.order}</span><Status cls={r.status}>{r.status === "ok" ? "승인" : "미학습"}</Status><span>{r.label}</span><span className="muted small">· {r.note}</span></div>)}</div>
                  </Sec>
                  <Sec title="조합 결과 · 단계 1 키프레임"><div className="prompt"><div className="ph"><span>English · Soul 2.0</span><CopyButton text={e.compose.keyframe} className="btn sm ghost" /><button className="btn sm" type="button">스냅샷 저장</button></div><pre>{e.compose.keyframe}</pre></div></Sec>
                  <Sec title="단계 2 영상 · 모션 프롬프트" more="시작 프레임 확정 후 활성화 · 외형 서술 없이 움직임만"><div className="prompt"><div className="ph"><span>English · Kling 3.0</span><CopyButton text={e.compose.motion} className="btn sm ghost" /><button className="btn sm" type="button" disabled title="시작 프레임이 없습니다">스냅샷 저장</button></div><pre>{e.compose.motion}</pre></div></Sec>
                  {e.compose.warning && <div className="note warn" style={{ marginTop: 12 }}>{e.compose.warning}</div>}
                </>
              )}
            </div>
          )}

          {tab === "pub" && (
            <div className="pane">
              {!e.publish && <div className="empty"><b>게시 준비 전입니다</b><span>샷이 확정되면 게시 체크리스트가 열립니다.</span></div>}
              {e.publish && (
                <>
                  <Sec title="게시 전 체크리스트" more="미완료 시 상태를 &quot;게시&quot;로 바꿀 수 없음" first>
                    <div className="check">{e.publish.checklist.map((c, i) => <label key={i}><input type="checkbox" defaultChecked={c.done} readOnly /><span>{c.text}</span><span className={`r ${c.bad ? "st bad" : ""}`}>{c.right}</span></label>)}</div>
                  </Sec>
                  <Sec title="게시물 (플랫폼별)">
                    <div className="tw"><table><thead><tr><th>플랫폼</th><th>상태</th><th>예약 / 게시</th><th>최종 파일</th><th>커버</th><th>성과 기록</th></tr></thead><tbody>{e.publish.rows.map((r) => <tr key={r.platform}><td>{r.platform}</td><td><Status>{r.status}</Status></td><td>—</td><td className="muted">미첨부</td><td className="muted">미첨부</td><td className="muted">0건</td></tr>)}</tbody></table></div>
                  </Sec>
                  <Sec title="캡션 초안"><div className="prompt"><div className="ph"><span>공통</span><CopyButton text={e.publish.caption} className="btn sm ghost" /></div><pre>{e.publish.caption}</pre></div></Sec>
                  <div style={{ marginTop: 14, display: "flex", gap: 8 }}><button className="btn sm ghost" type="button">예정으로 추가</button><button className="btn sm" type="button" disabled={!checklistDone} title={checklistDone ? "" : "체크리스트 미완료"}>게시로 변경</button></div>
                </>
              )}
            </div>
          )}
        </section>

        <aside className="col">
          <Card title="제작 진행">
            <div className="vers">
              <div><span className="v num">{shots.length}</span><span>샷</span><span className="muted small">전체</span></div>
              <div><span className="v num">{done}</span><span>확정</span><Status cls="ok"></Status></div>
              <div><span className="v num">{cand}</span><span>후보 검토</span><Status cls="warn"></Status></div>
              <div><span className="v num">{none}</span><span>미생성</span><Status></Status></div>
              <div><span className="v num">{runCount}</span><span>생성 시도</span><span className="muted small">후보 {candCount}</span></div>
            </div>
          </Card>
          {issues.length > 0 && <Card title="막고 있는 미정 항목"><div className="row-list">{issues.map((i) => <Link key={i.id} className="iss" href="/issues"><span className="k">{i.scope.split(" · ")[0]}</span><span className="t"><b>{i.title}</b><span>{i.desc}</span></span></Link>)}</div></Card>}
          {e.series_list && <Card title="같은 시리즈" sub={e.series}><div className="vers">{e.series_list.map((s) => <div key={s.title}><span className={`v ${s.active ? "" : "muted"}`}>{s.no}</span><span className={s.active ? "" : "muted"}>{s.title}</span>{s.active ? <Status cls="warn"></Status> : <span></span>}</div>)}</div></Card>}
        </aside>
      </div>
    </>
  );
}
