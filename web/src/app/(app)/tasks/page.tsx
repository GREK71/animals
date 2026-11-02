import Link from "next/link";
import { all, getDb } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { TASK_CLASS, TASK_LABEL, type Activity, type Task } from "@/lib/types";
import { Status } from "@/components/ui";
import { addTask, claimTask, updateTask } from "./actions";

const COLUMNS: Task["status"][] = ["todo", "doing", "review", "qa", "done"];
const PRIORITY_LABEL = { high: "높음", normal: "보통", low: "낮음" };

export default async function Tasks() {
  const me = await requireUser();
  const tasks = all<Task>("tasks").sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const activity = all<Activity>("activity").sort((a, b) => b.at.localeCompare(a.at)).slice(0, 12);
  const users = getDb().prepare("SELECT id, name FROM users ORDER BY name").all() as { id: number; name: string }[];

  return (
    <>
      <div className="view-title"><h1>팀 작업</h1><span className="crumb">담당자와 인계 상태를 한곳에서 관리합니다.</span></div>
      <details className="task-create card">
        <summary><b>새 작업 추가</b><span>제작에 필요한 다음 행동을 팀에 공유하세요</span></summary>
        <form className="form" action={addTask}>
          <label>제목<input name="title" required placeholder="예: EP.01 샷 2 후보 검토" /></label>
          <label>담당자<select name="assigneeId" defaultValue=""><option value="">미지정</option>{users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select></label>
          <label>우선순위<select name="priority" defaultValue="normal"><option value="high">높음</option><option value="normal">보통</option><option value="low">낮음</option></select></label>
          <label>관련 경로<input name="link" placeholder="/episodes/ep01?tab=shots" /></label>
          <label className="full">인계 메모<textarea name="note" rows={2} placeholder="완료 조건, 참고할 파일, 다음 사람이 알아야 할 내용" /></label>
          <div><button className="btn sm" type="submit">작업 추가</button></div>
        </form>
      </details>

      <div className="task-board">
        {COLUMNS.map((column) => {
          const items = tasks.filter((task) => task.status === column);
          return <section key={column} className="task-column"><header><Status cls={TASK_CLASS[column]}>{TASK_LABEL[column]}</Status><b>{items.length}</b></header><div>
            {items.map((task) => <article id={task.id} className={`task-card priority-${task.priority}`} key={task.id}>
              <div className="task-card-head"><span>{PRIORITY_LABEL[task.priority]}</span>{task.link && <Link href={task.link}>관련 화면 ↗</Link>}</div>
              <h2>{task.title}</h2>
              {task.note && <p>{task.note}</p>}
              <div className="task-meta"><span>{task.assigneeName ? `담당 ${task.assigneeName}` : "담당 미지정"}</span><span>{task.updatedByName} · {task.updatedAt.slice(5, 16).replace("T", " ")}</span></div>
              <form className="task-controls" action={updateTask}>
                <input type="hidden" name="id" value={task.id} />
                <select name="status" defaultValue={task.status} aria-label="상태">{COLUMNS.map((status) => <option key={status} value={status}>{TASK_LABEL[status]}</option>)}</select>
                <select name="assigneeId" defaultValue={task.assigneeId ?? ""} aria-label="담당자"><option value="">미지정</option>{users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select>
                <input type="hidden" name="priority" value={task.priority} />
                <button className="btn sm ghost" type="submit">저장</button>
              </form>
              {task.assigneeId !== me.id && task.status !== "done" && <form action={claimTask}><input type="hidden" name="id" value={task.id} /><button className="task-claim" type="submit">내가 맡기</button></form>}
            </article>)}
            {!items.length && <p className="task-empty">작업 없음</p>}
          </div></section>;
        })}
      </div>

      <section className="card activity-panel"><div className="hd"><div><h2>최근 팀 활동</h2><p>작업 생성·배정·상태 변경 기록</p></div></div><div className="bd activity-list">
        {activity.map((item) => <Link key={item.id} href={item.href}><span className="activity-avatar">{item.actorName.slice(0, 1)}</span><span><b>{item.actorName}</b> {item.text}<small>{item.at.slice(0, 16).replace("T", " ")}</small></span></Link>)}
        {!activity.length && <p className="muted small">아직 기록된 팀 활동이 없습니다.</p>}
      </div></section>
    </>
  );
}
