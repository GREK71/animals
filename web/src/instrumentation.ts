// 서버 시작 때 DB를 열어 둔다. 계정이 없으면 이때 설정 토큰이 로그에 찍힌다.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { getDb } = await import("./lib/db");
    getDb();
  }
}
