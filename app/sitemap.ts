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

/**
 * 🚨 **정적 경로인데 색인하지 않는 화면** — 2026-09-22 신설.
 *
 * `PRIVATE` 와 다른 목록이다. 저쪽은 **세그먼트 통째로** 빼는 것이고 이것은
 * **그 경로 하나**만 뺀다.
 *
 * 🔴 **왜 필요한가** — 이 파일은 목록을 손으로 적지 않고 `app/` 아래를 훑는다.
 *    `/q/[token]` 은 **동적 세그먼트라 저절로 빠지지만**(`[` 로 시작하는 폴더를
 *    건너뛴다) `/reward-event` 처럼 **정적 경로는 가만히 두면 실린다.**
 *    그러면 「사이트맵은 실어 놓고 페이지는 `robots: index:false`」라는
 *    **서로 싸우는 신호**가 검색엔진에 간다.
 *
 * 🔴 **새 화면을 색인에서 빼기로 했으면 세 곳을 함께 볼 것**:
 *      ① 그 화면 `layout.tsx` 의 `robots: { index: false, follow: false }`  (핵심)
 *      ② `app/robots.ts` 의 `disallow`                                      (보조)
 *      ③ 이 목록                                                            (사이트맵)
 */
const NOINDEX = ["/reward-event"];

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
  const routes = ["/", ...collectRoutes(appDir)].filter((r) => !NOINDEX.includes(r));
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
