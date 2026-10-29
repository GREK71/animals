import fs from "node:fs";
import { NextResponse, type NextRequest } from "next/server";
import { one } from "@/lib/db";
import { filePath } from "@/lib/files";
import { currentUser } from "@/lib/session";
import type { StoredFile } from "@/lib/types";

// 업로드 파일 서빙. 로그인한 사용자만.
export async function GET(_req: NextRequest, ctx: RouteContext<"/files/[id]">) {
  if (!(await currentUser())) return new NextResponse("로그인이 필요합니다.", { status: 401 });
  const { id } = await ctx.params;
  if (!/^f[0-9a-f]{12}$/.test(id)) return new NextResponse("없음", { status: 404 });
  const f = one<StoredFile>("files", id);
  if (!f) return new NextResponse("없음", { status: 404 });
  const p = filePath(f);
  if (!fs.existsSync(/*turbopackIgnore: true*/ p)) return new NextResponse("파일이 사라졌습니다.", { status: 404 });
  const body = fs.readFileSync(/*turbopackIgnore: true*/ p);
  return new NextResponse(body, {
    headers: {
      "content-type": f.mime,
      "content-length": String(body.length),
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
      "content-disposition": `inline; filename*=UTF-8''${encodeURIComponent(f.name)}`,
    },
  });
}
