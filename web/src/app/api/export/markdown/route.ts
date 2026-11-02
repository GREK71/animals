import { NextResponse, type NextRequest } from "next/server";
import { all, one } from "@/lib/db";
import { currentUser } from "@/lib/session";
import type { ArchiveDocument, Asset, Character, Episode, Issue, Place, Task } from "@/lib/types";

function yaml(value: string) {
  return JSON.stringify(value);
}

function documentMarkdown(doc: ArchiveDocument & { id: string }) {
  return [`---`, `id: ${doc.id}`, `title: ${yaml(doc.title)}`, `category: ${doc.category}`, `status: ${doc.status}`, `version: ${doc.version}`, `updated_by: ${yaml(doc.updatedByName)}`, `updated_at: ${doc.updatedAt}`, `---`, ``, doc.content.trim(), ``].join("\n");
}

export async function GET(req: NextRequest) {
  if (!(await currentUser())) return new NextResponse("로그인이 필요합니다.", { status: 401 });
  const id = req.nextUrl.searchParams.get("id");
  if (id) {
    const doc = one<ArchiveDocument>("documents", id);
    if (!doc) return new NextResponse("문서가 없습니다.", { status: 404 });
    return new NextResponse(documentMarkdown(doc), { headers: { "content-type": "text/markdown; charset=utf-8", "content-disposition": `attachment; filename*=UTF-8''${encodeURIComponent(doc.slug + ".md")}`, "cache-control": "private, no-store" } });
  }

  const docs = all<ArchiveDocument>("documents").sort((a, b) => a.category.localeCompare(b.category) || a.title.localeCompare(b.title, "ko"));
  const episodes = all<Episode>("episodes", undefined, "no");
  const characters = all<Character>("characters");
  const places = all<Place>("places");
  const assets = all<Asset>("assets");
  const issues = all<Issue>("issues");
  const tasks = all<Task>("tasks");
  const lines = ["---", "title: Animal House Archive", `exported_at: ${new Date().toISOString()}`, "format: obsidian-compatible-markdown", "---", "", "# Animal House Archive", "", "> 웹 아카이브에서 내보낸 읽기 전용 스냅샷입니다.", ""];
  lines.push("## 작업", "");
  for (const task of tasks) lines.push(`- [${task.status === "done" ? "x" : " "}] **${task.title}** · ${task.assigneeName ?? "미지정"} · ${task.status}${task.note ? ` — ${task.note}` : ""}`);
  lines.push("", "## 결정 항목", "");
  for (const issue of issues) lines.push(`- **${issue.title}** · ${issue.status}${issue.decided ? ` — ${issue.decided}` : ` — ${issue.options}`}`);
  lines.push("", "## 에피소드", "");
  for (const episode of episodes) lines.push(`### ${episode.no} ${episode.title}`, "", `- 상태: ${episode.status}`, `- 훅: ${episode.hook}`, `- 요약: ${episode.summary}`, "");
  lines.push("## 캐릭터", "");
  for (const character of characters) lines.push(`### ${character.name}`, "", `- 종: ${character.species}`, `- 역할: ${character.role}`, `- 소개: ${character.intro}`, "");
  lines.push("## 장소", "");
  for (const place of places) lines.push(`- **${place.name}** · ${place.note}`);
  lines.push("", "## 소재", "");
  for (const asset of assets) lines.push(`- **${asset.name}** · ${asset.kind} · ${asset.status} · ${asset.at}`);
  lines.push("", "# 문서 아카이브", "");
  for (const doc of docs) lines.push(`## ${doc.title}`, "", `> ${doc.category} · ${doc.status} · v${doc.version} · ${doc.updatedByName}`, "", doc.content.trim(), "");
  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(lines.join("\n"), { headers: { "content-type": "text/markdown; charset=utf-8", "content-disposition": `attachment; filename="animal-house-${stamp}.md"`, "cache-control": "private, no-store" } });
}
