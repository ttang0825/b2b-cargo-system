/**
 * 이용가이드 화면 캡처 만들기 — `public/guide/*.png` 를 다시 만든다.
 *
 *   NEXT_PUBLIC_SUPABASE_URL=https://mock.supabase.co \
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY=mockanon \
 *   NEXT_PUBLIC_VAPID_PUBLIC_KEY=<아무 base64url 문자열> \
 *   npx next dev -p 3932
 *   node scripts/guide-shots.mjs 3932
 *
 * 🔴 **실계정으로 찍지 말 것.** 이 저장소는 public 이라 화주 상호·담당자 연락처가
 *    담긴 그림을 한 번 커밋하면 **git 이력에서 지워지지 않는다.** 그래서 이 스크립트가
 *    Supabase 응답을 통째로 가로채 **가짜 데이터**를 물려서 찍는다 — 화면 모양은 실물
 *    그대로이고 담기는 값만 가짜다. 아래 `FIXTURE` 에 실제 값을 넣지 말 것.
 *
 * 🔴 **DSF 2 로 찍고 절반 크기로 저장한다** — 그대로 두면 파일이 서너 배가 되고,
 *    1배로 찍으면 글자가 뭉갠다. 가이드의 `figure` 블록에 적는 `width`·`height` 는
 *    **저장된 픽셀의 절반**(= CSS 픽셀)이다.
 *
 * ⚠️ 이 스크립트는 빌드에 들어가지 않는다(`scripts/` 는 `app/` 밖이다). 의존성도
 *    `playwright-core` 하나이고 **`package.json` 에 넣지 않았다** — 캡처를 다시 만들
 *    때만 `npm i --no-save playwright-core` 로 잠깐 받는다.
 */
import { chromium } from "playwright-core";
import { writeFileSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";

const PORT = process.argv[2] || "3932";
const BASE = `http://localhost:${PORT}`;
const EXE = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const OUT = "public/guide";

const UID = "11111111-1111-1111-1111-111111111111";
const CID = "22222222-2222-2222-2222-222222222222";

const SESSION = {
  access_token: "mock", token_type: "bearer", expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: "mock",
  user: { id: UID, email: "guide@example.com", aud: "authenticated", role: "authenticated" },
};

// 🔴 전부 가짜다 — 상호·주소·금액 어느 것도 실제 거래가 아니다.
const FIXTURE = {
  customer_accounts: [{
    id: UID, auth_user_id: UID, company_id: CID, name: "김담당", email: "guide@example.com",
    contact_position: "물류팀", contact_mobile: "010-0000-0000",
    is_active: true, must_change_password: false,
    companies: { id: CID, name: "시험상사" },
  }],
  quotes: [
    {
      id: "q1", quote_no: "Q20260918-001", origin: "경기 화성시 동탄산단로 12",
      destination: "서울 강남구 테헤란로 152", vehicle_type: "5톤", item: "전자부품 12파렛트",
      base_fare: 320000, final_amount: 340000, status: "견적제출",
      selected_options: { 차량형태: "윙바디", 상차조건: "지게차", 하차조건: "지게차" },
      loading_type: "exclusive", collection_method: "broker", billing_cycle: "per_order",
      direct_collection_point: null, notes: "",
      requested_pickup_at: "2026-09-19T09:00:00+09:00",
      requested_dropoff_at: "2026-09-19T14:00:00+09:00",
      created_at: "2026-09-18T01:10:00+00:00", updated_at: "2026-09-18T02:00:00+00:00",
      revised_at: null,
    },
    {
      id: "q2", quote_no: "Q20260917-004", origin: "인천 서구 가좌로 8",
      destination: "충북 청주시 흥덕구 산단로 40", vehicle_type: "1톤", item: "포장자재",
      base_fare: 150000, final_amount: 150000, status: "수주",
      selected_options: { 차량형태: "카고" },
      loading_type: "mixable", collection_method: "broker", billing_cycle: "per_order",
      direct_collection_point: null, notes: "",
      requested_pickup_at: "2026-09-17T13:00:00+09:00",
      requested_dropoff_at: "2026-09-17T18:00:00+09:00",
      created_at: "2026-09-17T02:00:00+00:00", updated_at: "2026-09-17T06:00:00+00:00",
      revised_at: null,
    },
  ],
  quote_items: [
    { id: "qi1", item_name: "기본운임 (5톤 · 92km)", amount: 300000 },
    { id: "qi2", item_name: "가산 (윙바디 · 지게차)", amount: 20000 },
  ],
  dispatches: [
    {
      id: "d1", order_id: "o1", dispatch_status: "배차확정", cancel_reason: null,
      pickup_confirmed: false, delivery_confirmed: false,
      issue_occurred: false, issue_reason: null,
      created_at: "2026-09-18T01:00:00+00:00", updated_at: "2026-09-18T02:20:00+00:00",
      orders: {
        order_no: "O20260918-002", origin: "경기 화성시 동탄산단로 12",
        destination: "서울 강남구 테헤란로 152",
        requested_pickup_at: "2026-09-19T09:00:00+09:00",
        item: "전자부품 12파렛트", vehicle_type: "5톤", loading_type: "exclusive",
        collection_method: "broker", billing_cycle: "per_order", direct_collection_point: null,
      },
    },
    {
      id: "d2", order_id: "o2", dispatch_status: "접수중", cancel_reason: null,
      pickup_confirmed: false, delivery_confirmed: false,
      issue_occurred: false, issue_reason: null,
      created_at: "2026-09-17T23:00:00+00:00", updated_at: "2026-09-17T23:10:00+00:00",
      orders: {
        order_no: "O20260918-001", origin: "인천 서구 가좌로 8",
        destination: "충북 청주시 흥덕구 산단로 40",
        requested_pickup_at: "2026-09-18T13:00:00+09:00",
        item: "포장자재", vehicle_type: "1톤", loading_type: "mixable",
        collection_method: "broker", billing_cycle: "per_order", direct_collection_point: null,
      },
    },
  ],
  orders: [{ id: "o1", quote_id: "q2", order_no: "O20260918-002" }],
  announcements: [{
    id: "a1", title: "추석 연휴 배차 안내", content: "연휴 기간 배차가 조기 마감됩니다.",
    content_format: "plain", is_active: true,
    created_at: "2026-09-16T00:00:00+00:00", announced_at: "2026-09-16T00:00:00+00:00",
  }],
  customer_locations: [],
  customer_presets: [],
  portal_order_requests: [],
  invoices: [],
  rate_surcharges: [],
};

function table(url) {
  const m = url.match(/\/rest\/v1\/([a-z_]+)/);
  return m ? m[1] : "";
}

/** 잘라 담을 자리들. `sel` 이 없으면 뷰포트 통째로. */
const SHOTS = [
  // 🔴 사이드바는 **머리(메뉴)와 발치(알림 버튼)를 따로** 찍는다 — 통째로 찍으면
  //    가운데가 빈 1000px 짜리 세로 그림이 되어 글 사이에 넣을 수 없다.
  { name: "menu", path: "/customer", w: 1360, h: 1000, sel: ".pv2-sidebar", maxH: 620 },
  { name: "notify-buttons", path: "/customer", w: 1360, h: 1000, sel: ".pv2-foot-account", pad: 10 },
  { name: "quote-card", path: "/customer/quotes", w: 1160, h: 1200, sel: ".pv2-main-inner", maxH: 420 },
  { name: "dispatch-card", path: "/customer/dispatches", w: 1160, h: 1200, sel: ".pv2-main-inner", maxH: 460 },
  { name: "order-form", path: "/customer/request", w: 1160, h: 1600, sel: ".pv2-main-inner", maxH: 640 },
  // 「직접 지정」을 눌러 **펼쳐진 상태**로 찍는다 — 접힌 채로 찍으면 날짜 칸이 안 보여
  // 이 항목이 설명하려는 것이 그림에 없다.
  {
    name: "period", path: "/customer/quotes", w: 1160, h: 900,
    clickText: "직접 지정", sel: ".pv2-filter-row", pad: 8,
  },
];

const ctxOpts = { viewport: { width: 1360, height: 1000 }, locale: "ko-KR", timezoneId: "Asia/Seoul", deviceScaleFactor: 2 };

const browser = await chromium.launch({ executablePath: EXE });
const ctx = await browser.newContext(ctxOpts);

await ctx.route("**/rest/v1/**", (r) => {
  const t = table(r.request().url());
  const rows = FIXTURE[t] || [];
  const accept = r.request().headers()["accept"] || "";
  // `.single()` 은 객체를, `count:"exact", head:true` 는 본문 없이 헤더만 본다.
  const body = accept.includes("vnd.pgrst.object") ? JSON.stringify(rows[0] || null) : JSON.stringify(rows);
  r.fulfill({
    status: 200, contentType: "application/json",
    headers: { "content-range": `0-${Math.max(rows.length - 1, 0)}/${rows.length}` },
    body,
  });
});
await ctx.route("**/auth/v1/**", (r) =>
  r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ...SESSION, data: { session: SESSION, user: SESSION.user } }) }));
await ctx.addInitScript((s) => {
  try { localStorage.setItem("customer-portal-auth", JSON.stringify(s)); } catch {}
}, SESSION);

mkdirSync(OUT, { recursive: true });

for (const shot of SHOTS) {
  const page = await ctx.newPage();
  await page.setViewportSize({ width: shot.w, height: shot.h });
  await page.goto(BASE + shot.path, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2600);
  if (shot.clickText) {
    await page.getByRole("button", { name: shot.clickText, exact: true }).first().click();
    await page.waitForTimeout(400);
  }
  const el = shot.sel ? await page.$(shot.sel) : null;
  const box = el ? await el.boundingBox() : null;
  const pad = shot.pad || 0;
  const clip = box
    ? {
        x: Math.max(Math.round(box.x) - pad, 0),
        y: Math.max(Math.round(box.y) - pad, 0),
        width: Math.round(box.width) + pad * 2,
        height: Math.round(Math.min(box.height, shot.maxH || box.height)) + pad * 2,
      }
    : undefined;
  const buf = await page.screenshot({ clip });
  const file = `${OUT}/${shot.name}.png`;
  writeFileSync(file, buf);
  // DSF 2 로 찍었으니 절반으로 줄여 저장한다(글자는 또렷하고 파일은 가볍다).
  execFileSync("python3", ["-c", `
from PIL import Image
im = Image.open("${file}")
im = im.resize((im.width // 2, im.height // 2), Image.LANCZOS).convert("RGB")
im.save("${file}", optimize=True)
print("${shot.name}", im.width, "x", im.height)
`]);
  await page.close();
}

await browser.close();
console.log("done");
