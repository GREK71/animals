import Link from "next/link";
import { all } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { SHOT_CLASS, SHOT_LABEL, TASK_CLASS, TASK_LABEL, type Activity, type Episode, type Issue, type Shot, type Task } from "@/lib/types";
import { Status } from "@/components/ui";

export default async function Home() {
  const me = await requireUser();
  const episodes = all<Episode>("episodes", undefined, "no");
  const issues = all<Issue>("issues").filter((issue) => issue.status !== "decided");
  const current = episodes.find((episode) => episode.status === "prod") ?? episodes.find((episode) => episode.status === "plan");
  const shots = current ? all<Shot>("shots", { col: "episode_id", val: current.id }, "no") : [];
  const done = shots.filter((shot) => shot.status === "done").length;
  const tasks = all<Task>("tasks").filter((task) => task.status !== "done").sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const myTasks = tasks.filter((task) => task.assigneeId === me.id);
  const activity = all<Activity>("activity").sort((a, b) => b.at.localeCompare(a.at)).slice(0, 5);

  return (
    <>
      <div className="view-title home-title">
        <div><h1>작업 현황</h1><span className="crumb">오늘 이어서 할 작업만 모았습니다.</span></div>
        <div className="actions"><Link className="btn sm" href={current ? `/episodes/${current.id}?tab=shots` : "/episodes"}>제작 화면 열기</Link></div>
      </div>

      <div className="quick-stats" aria-label="프로젝트 요약">
        <Link href="/episodes"><b>{episodes.length}</b><span>에피소드</span></Link>
        <Link href="/tasks"><b className={myTasks.length ? "attention" : ""}>{myTasks.length}</b><span>내 작업</span></Link>
        <Link href="/tasks"><b>{tasks.length}</b><span>진행 작업</span></Link>
        <Link href="/issues"><b className={issues.length ? "attention" : ""}>{issues.length}</b><span>결정 필요</span></Link>
      </div>

      <div className="dashboard">
        <section className="card focus-card">
          <div className="hd">
            <div><span className="eyebrow">현재 제작</span><h2>{current ? `${current.no} · ${current.title}` : "제작 중인 에피소드 없음"}</h2>{current && <p>{current.hook}</p>}</div>
            {current && <Link className="more" href={`/episodes/${current.id}`}>에피소드 상세</Link>}
          </div>
          <div className="bd">
            {current && <div className="progress-line"><span style={{ width: `${shots.length ? (done / shots.length) * 100 : 0}%` }} /></div>}
            <div className="progress-copy"><b>{shots.length ? `${done} / ${shots.length} 샷 확정` : "등록된 샷 없음"}</b><span>{shots.length - done}개 남음</span></div>
            <div className="compact-shots">
              {shots.map((shot) => (
                <Link key={shot.id} href={`/episodes/${shot.episodeId}?tab=shots`}>
                  <span className="mono">{shot.no}</span><b>{shot.title}</b><span>{shot.who} · {shot.place}</span><Status cls={SHOT_CLASS[shot.status]}>{SHOT_LABEL[shot.status]}</Status>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <aside className="dashboard-side">
          <section className="card">
            <div className="hd"><div><h2>내 작업</h2><p>{me.name}님이 맡은 진행 항목</p></div><Link className="more" href="/tasks">작업 보드</Link></div>
            <div className="bd team-task-list">
              {myTasks.slice(0, 4).map((task) => <Link key={task.id} href={`/tasks#${task.id}`}><Status cls={TASK_CLASS[task.status]}>{TASK_LABEL[task.status]}</Status><span><b>{task.title}</b><small>{task.note || "인계 메모 없음"}</small></span></Link>)}
              {!myTasks.length && <p className="muted small">현재 맡은 작업이 없습니다.</p>}
            </div>
          </section>
          <section className="card">
            <div className="hd"><div><h2>결정 필요</h2><p>작업을 막고 있는 항목</p></div><Link className="more" href="/issues">전체</Link></div>
            <div className="bd issue-stack">
              {issues.slice(0, 4).map((issue) => <Link key={issue.id} href={`/issues?sel=${issue.id}`}><b>{issue.title}</b><span>{issue.scope}{issue.blocks !== "—" ? ` · ${issue.blocks}` : ""}</span></Link>)}
              {!issues.length && <p className="muted small">결정할 항목이 없습니다.</p>}
            </div>
          </section>
          <section className="card">
            <div className="hd"><div><h2>최근 팀 활동</h2></div><Link className="more" href="/tasks">전체</Link></div>
            <div className="bd recent-activity">
              {activity.map((item) => <Link key={item.id} href={item.href}><span>{item.actorName.slice(0, 1)}</span><p><b>{item.actorName}</b> {item.text}<small>{item.at.slice(5, 16).replace("T", " ")}</small></p></Link>)}
              {!activity.length && <p className="muted small">아직 팀 활동이 없습니다.</p>}
            </div>
          </section>
        </aside>
      </div>
    </>
  );
}
