import { notFound } from "next/navigation";
import { all, getDb, one } from "@/lib/db";
import { DOCUMENT_STATUS_CLASS, DOCUMENT_STATUS_LABEL, type ArchiveDocument, type DocumentVersion } from "@/lib/types";
import { Status } from "@/components/ui";
import MarkdownView from "@/components/MarkdownView";
import { saveDocument } from "../actions";

const CATEGORY_LABEL: Record<string, string> = { episode: "에피소드", asset: "소재", character: "캐릭터", setting: "설정", note: "노트" };

export default async function DocumentDetail({ params, searchParams }: PageProps<"/documents/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  const doc = one<ArchiveDocument>("documents", id);
  if (!doc) notFound();
  const versions = all<DocumentVersion>("document_versions", { col: "document_id", val: id }).sort((a, b) => b.version - a.version);
  const users = getDb().prepare("SELECT id, name FROM users ORDER BY name").all() as { id: number; name: string }[];

  return (
    <>
      <div className="view-title"><h1>{doc.title}</h1><span className="chip">{CATEGORY_LABEL[doc.category]}</span><Status cls={DOCUMENT_STATUS_CLASS[doc.status]}>{DOCUMENT_STATUS_LABEL[doc.status]}</Status><div className="actions"><a className="btn sm" href={`/documents/${id}?edit=1#editor`}>문서 편집</a><a className="btn sm ghost" href={`/api/export/markdown?id=${id}`}>Markdown 받기</a></div></div>
      {sp.conflict === "1" && <div className="conflict-banner"><b>다른 사용자가 먼저 저장했습니다.</b><span>최신 내용을 다시 확인한 뒤 변경을 합쳐 저장하세요. 기존 내용은 덮어쓰지 않았습니다.</span></div>}
      {sp.saved && <div className="saved-banner">v{sp.saved}으로 저장했습니다.</div>}
      <div className="document-layout">
        <section className="card document-preview"><div className="hd"><div><h2>게시 미리보기</h2><p>사람이 읽는 화면과 내보내기 결과의 본문입니다.</p></div></div><div className="bd"><MarkdownView content={doc.content} /></div></section>
        <aside className="document-side">
          <details id="editor" className="card document-editor" open={sp.edit === "1"}>
            <summary><b>편집 및 단계 변경</b><span>현재 v{doc.version}</span></summary>
            <form action={saveDocument} className="form">
              <input type="hidden" name="id" value={id} />
              <input type="hidden" name="version" value={doc.version} />
              <label className="full">제목<input name="title" defaultValue={doc.title} required /></label>
              <label>분류<select name="category" defaultValue={doc.category}>{Object.entries(CATEGORY_LABEL).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
              <label>단계<select name="status" defaultValue={doc.status}><option value="draft">초안</option><option value="review">검토</option><option value="qa">검수</option><option value="published">게시</option></select></label>
              <label className="full">담당자<select name="assigneeId" defaultValue={doc.assigneeId ?? ""}><option value="">미지정</option>{users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select></label>
              <label className="full">Markdown<textarea name="content" rows={22} defaultValue={doc.content} required /></label>
              <label className="full">버전 메모<input name="memo" placeholder="무엇을 바꿨는지" /></label>
              <div><button className="btn sm" type="submit">새 버전 저장</button></div>
            </form>
          </details>
          <section className="card version-panel"><div className="hd"><div><h2>버전 기록</h2><p>덮어쓰기 없이 저장된 변경 이력</p></div></div><div className="bd">
            {versions.map((version) => <div key={version.id}><b>v{version.version}</b><span>{version.memo}</span><small>{version.by} · {version.at.slice(0, 16).replace("T", " ")}</small></div>)}
          </div></section>
        </aside>
      </div>
    </>
  );
}
