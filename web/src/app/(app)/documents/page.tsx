import Link from "next/link";
import { all } from "@/lib/db";
import { DOCUMENT_STATUS_CLASS, DOCUMENT_STATUS_LABEL, type ArchiveDocument } from "@/lib/types";
import { Status } from "@/components/ui";
import { importMarkdown } from "./actions";

const CATEGORY_LABEL: Record<string, string> = { episode: "에피소드", asset: "소재", character: "캐릭터", setting: "설정", note: "노트" };

export default async function Documents({ searchParams }: PageProps<"/documents">) {
  const sp = await searchParams;
  const category = typeof sp.category === "string" ? sp.category : "all";
  const documents = all<ArchiveDocument>("documents").filter((doc) => category === "all" || doc.category === category).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return (
    <>
      <div className="view-title"><h1>문서 아카이브</h1><span className="crumb">Markdown을 가져와 검토하고 게시합니다.</span><div className="actions"><a className="btn sm ghost" href="/api/export/markdown">전체 Markdown 내보내기</a></div></div>
      <section className="archive-tools card">
        <form action={importMarkdown}>
          <div><b>Markdown 가져오기</b><span>에피소드·소재·설정 문서를 초안으로 저장합니다. 최대 2MB.</span></div>
          <label className="btn sm">파일 선택<input type="file" name="file" accept=".md,text/markdown,text/plain" required hidden /></label>
          <button className="btn sm ghost" type="submit">가져오기</button>
        </form>
        {sp.error === "file" && <p className="archive-error">올바른 2MB 이하 Markdown 파일을 선택하세요.</p>}
        <p className="note">YAML frontmatter에 <code>title</code>과 <code>category: episode | asset | character | setting | note</code>를 넣으면 자동 분류됩니다.</p>
      </section>

      <div className="archive-tabs">
        {["all", "episode", "asset", "character", "setting", "note"].map((key) => <Link key={key} aria-current={category === key ? "page" : undefined} href={key === "all" ? "/documents" : `/documents?category=${key}`}>{key === "all" ? "전체" : CATEGORY_LABEL[key]}</Link>)}
      </div>
      <section className="archive-list card">
        {documents.map((doc) => <Link key={doc.id} href={`/documents/${doc.id}`}>
          <span className="archive-kind">{CATEGORY_LABEL[doc.category]}</span>
          <span className="archive-title"><b>{doc.title}</b><small>{doc.sourceName ?? "웹 작성"} · v{doc.version} · {doc.updatedByName}</small></span>
          {doc.assigneeName && <span className="archive-owner">담당 {doc.assigneeName}</span>}
          <Status cls={DOCUMENT_STATUS_CLASS[doc.status]}>{DOCUMENT_STATUS_LABEL[doc.status]}</Status>
        </Link>)}
        {!documents.length && <div className="empty"><b>문서가 없습니다</b><span>동료가 만든 Markdown 파일을 가져오면 이곳에서 검토·검수·게시할 수 있습니다.</span></div>}
      </section>
    </>
  );
}
