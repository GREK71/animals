import { count, dataDir, getDb, listBackups } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { Card, Field, Sec } from "@/components/ui";
import { addUser, changePassword, makeBackup, removeUser } from "./actions";

export default async function Settings() {
  const me = await requireUser();
  const isAdmin = me.role === "admin";
  const users = getDb().prepare("SELECT id, username, name, role, created_at FROM users ORDER BY id").all() as { id: number; username: string; name: string; role: string; created_at: string }[];
  const backups = listBackups();
  const tables = ["characters", "places", "episodes", "shots", "runs", "variants", "assets", "issues", "prompt_versions"];
  return (
    <>
      <div className="view-title"><h1>설정</h1><span className="id">S-01</span><span className="crumb">프로젝트 · 계정 · 생성 도구 · 백업</span></div>
      <div className="detail">
        <section className="card"><div className="pane">
          <Sec title="계정" more={isAdmin ? "관리자만 계정을 만들고 지울 수 있습니다" : "계정 관리는 관리자에게 요청하세요"} first>
            <div className="tw"><table><thead><tr><th>아이디</th><th>이름</th><th>역할</th><th>생성</th><th></th></tr></thead><tbody>
              {users.map((u) => <tr key={u.id}><td className="mono">{u.username}</td><td>{u.name}{u.id === me.id && <span className="chip role" style={{ marginLeft: 6 }}>나</span>}</td><td>{u.role === "admin" ? "관리자" : "멤버"}</td><td className="muted small">{u.created_at.slice(0, 10)}</td><td>{isAdmin && u.id !== me.id && <form action={removeUser}><input type="hidden" name="id" value={u.id} /><button className="btn sm ghost" type="submit">삭제</button></form>}</td></tr>)}
            </tbody></table></div>
            {isAdmin && <form className="form" action={addUser} style={{ marginTop: 14 }}>
              <label>아이디<input id="new-username" name="username" required pattern="[A-Za-z0-9_.\-]{3,32}" /></label>
              <label>이름<input id="new-name" name="name" /></label>
              <label>비밀번호 (8자 이상)<input id="new-password" name="password" type="password" minLength={8} required /></label>
              <label>역할<select id="new-role" name="role" defaultValue="member"><option value="member">멤버</option><option value="admin">관리자</option></select></label>
              <div style={{ display: "flex", alignItems: "end" }}><button className="btn sm" type="submit">계정 추가</button></div>
            </form>}
          </Sec>
          <Sec title="내 비밀번호 변경" more="바꾸면 다른 기기의 로그인은 모두 풀립니다">
            <form className="form" action={changePassword}><label>새 비밀번호 (8자 이상)<input id="my-password" name="password" type="password" minLength={8} required /></label><div style={{ display: "flex", alignItems: "end" }}><button className="btn sm ghost" type="submit">변경</button></div></form>
          </Sec>
          <Sec title="생성 도구 · 힉스필드">
            <div className="tw"><table><thead><tr><th>단계</th><th>하위 모델</th><th>용도</th><th>상태</th></tr></thead><tbody>
              <tr><td>키프레임</td><td>Soul 2.0</td><td>Soul ID + 프롬프트로 스틸 생성</td><td><span className="st ok">사용</span></td></tr>
              <tr><td>키프레임</td><td>Soul Cinema</td><td>시네마틱 스틸</td><td><span className="st ok">사용</span></td></tr>
              <tr><td>영상</td><td>Kling 3.0</td><td>이미지→영상</td><td><span className="st ok">사용</span></td></tr>
              <tr><td>영상</td><td>Veo 3.1</td><td>이미지→영상</td><td><span className="st ok">사용</span></td></tr>
              <tr><td>영상</td><td>Seedance 2.0</td><td>이미지→영상</td><td><span className="st">미사용</span></td></tr>
            </tbody></table></div>
            <p className="note" style={{ marginTop: 10 }}>로스터가 바뀌면 삭제하지 않고 사용 중지로만 표시합니다. 도구 편집은 다음 단계.</p>
          </Sec>
        </div></section>
        <aside className="col">
          <Card title="백업 · 데이터" sub="SQLite(WAL) + 소재 폴더">
            <div className="grid2" style={{ gridTemplateColumns: "1fr" }}><Field label="데이터 폴더"><span className="mono">{dataDir()}</span></Field><Field label="DB 파일"><span className="mono">archive.sqlite (+ -wal, -shm)</span></Field></div>
            <div className="vers" style={{ marginTop: 12 }}>{tables.map((t) => <div key={t}><span className="v num">{count(t)}</span><span className="mono">{t}</span><span></span></div>)}</div>
            <p className="note" style={{ marginTop: 12 }}>실행 중인 DB는 archive.sqlite만 복사하면 최근 변경이 빠질 수 있습니다. 아래 버튼은 WAL까지 합친 일관된 스냅샷을 backups/ 폴더에 만듭니다. NAS 백업은 데이터 폴더 전체를 대상으로 하세요.</p>
            {isAdmin && <form action={makeBackup} style={{ marginTop: 10 }}><button className="btn sm" type="submit">지금 백업 파일 만들기</button></form>}
            {backups.length > 0 && <div className="vers" style={{ marginTop: 12 }}>{backups.slice(0, 5).map((b) => <div key={b.name}><span className="v">{(b.size / 1024).toFixed(0)}K</span><span className="mono">{b.name}</span><span className="muted small">{b.mtime.slice(0, 16).replace("T", " ")}</span></div>)}</div>}
          </Card>
        </aside>
      </div>
    </>
  );
}
