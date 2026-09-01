import type { MetadataRoute } from "next";
import fs from "node:fs";
import path from "node:path";
import { SITE_URL } from "@/lib/siteUrl";

/**
 * 🔴 **화면 목록을 손으로 적지 않는다** — `app/` 아래 실제 라우트에서 뽑는다.
 *    손으로 적으면 화면이 늘 때마다 조용히 어긋난다(`/status` 가 지워진 뒤에도
 *    목록에 남아 있는 것 같은 사고를 막는다).
 *
 * 🔴 **비공개 경로는 넣지 않는다** — `/admin`·`/customer` 는 noindex 이고
 *    `/api` 는 화면이 아니다. 아래 `PRIVATE` 로 잘라낸다.
 *
 * ⚠️ 빌드 시점에 한 번 도는 서버 코드다(`app/robots.ts` 와 같은 메타데이터 파일
 *    컨벤션). 파일시스템을 읽는 것이 이 자리에서만 안전한 이유다.
 */
const PRIVATE = ["admin", "customer", "api"];

function collectRoutes(dir: string, base = ""): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const name = entry.name;
    // 라우트 그룹·private 폴더·동적 세그먼트는 사이트맵 대상이 아니다
    if (name.startsWith("_") || name.startsWith("(") || name.startsWith("[")) continue;
    if (base === "" && PRIVATE.includes(name)) continue;
    const child = path.join(dir, name);
    const route = `${base}/${name}`;
    if (fs.existsSync(path.join(child, "page.tsx")) || fs.existsSync(path.join(child, "page.ts"))) {
      out.push(route);
    }
    out.push(...collectRoutes(child, route));
  }
  return out;
}

export default function sitemap(): MetadataRoute.Sitemap {
  const appDir = path.join(process.cwd(), "app");
  const routes = ["/", ...collectRoutes(appDir)];
  const lastModified = new Date();
  return routes.map((route) => ({
    // 🔴 `www` 없는 절대 URL 이다(`lib/siteUrl.ts`) — www 를 붙이면 canonical 과
    //    308 리다이렉트가 서로 싸운다.
    url: `${SITE_URL}${route === "/" ? "" : route}`,
    lastModified,
    changeFrequency: route === "/" ? ("weekly" as const) : ("monthly" as const),
    priority: route === "/" ? 1 : 0.7,
  }));
}
