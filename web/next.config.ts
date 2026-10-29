import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["better-sqlite3"],
  // 레퍼런스 이미지 업로드 (한 번에 여러 장). 파일당 20MB 제한은 saveUpload에서.
  // proxy.ts가 모든 페이지 요청을 거치므로 프록시 본문 버퍼 한도(기본 10MB)도 같이 올린다.
  experimental: { serverActions: { bodySizeLimit: "60mb" }, proxyClientMaxBodySize: "60mb" },
};

export default nextConfig;
