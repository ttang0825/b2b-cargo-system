import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServiceClient } from "@/lib/supabaseServiceClient";
import { getCurrentStaff } from "@/lib/getCurrentStaff";

// 문자 발송 이력 통합조회(`/admin/sms-logs`) 전용 조회 API.
//
// 기존 `app/api/admin/sms-logs/route.ts`는 **레코드 1건에 딸린 이력**만 내려주는
// 용도(배차 상세 등에 임베드된 SmsLogPanel)라 related_id가 필수다. 이 라우트는
// 반대로 **전체를 가로질러** 기간·종류·상태·담당자로 걸러서 본다.
//
// 🔴 **관리자 전용.** sms_logs에는 고객 전화번호와 문자 본문이 그대로 들어 있고,
// 이 화면은 "특정 담당자가 보낸 전체"까지 볼 수 있어 직원 활동 조회 성격도 있다
// (지원접속 이력·운영 대시보드와 같은 결이라 같은 기준을 적용).
// ⚠️ middleware.ts의 matcher는 `/api/admin/*`에 적용되지 않으므로(원칙 52번)
// 페이지 차단과 **별개로** 이 라우트에서도 role을 직접 확인해야 한다.

// 요청 파라미터를 읽는 GET이지만, 저장 직후 재조회 시 캐시된 예전 데이터가 나오는
// 사고를 막기 위해 관례대로 붙여둠(원칙 21번)
export const dynamic = "force-dynamic";

/** 한 번에 내려주는 최대 건수. 이 저장소는 아직 페이지네이션이 없어(별도 로드맵) 상한으로 자른다 */
const MAX_ROWS = 200;

export async function GET(req: Request) {
  const staff = await getCurrentStaff();
  if (!staff || staff.role !== "admin") {
    return NextResponse.json({ error: "관리자만 조회할 수 있습니다." }, { status: 403 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json(
      { error: "서버에 SUPABASE_SERVICE_ROLE_KEY가 설정되어 있지 않습니다." },
      { status: 500 }
    );
  }
  const admin = createServiceClient(url, serviceKey);

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from"); // ISO, 기간 필터(없으면 전체)
  const templateType = searchParams.get("template_type");
  const status = searchParams.get("status");
  const sentBy = searchParams.get("sent_by");
  const q = (searchParams.get("q") || "").trim();

  let query = admin.from("sms_logs").select("*", { count: "exact" });
  if (from) query = query.gte("sent_at", from);
  if (templateType) query = query.eq("template_type", templateType);
  if (status) query = query.eq("status", status);
  if (sentBy) query = query.eq("sent_by", sentBy);
  if (q) {
    // PostgREST의 or() 문법은 콤마·괄호로 조건을 구분하므로 검색어에 그대로 들어가면
    // 필터가 깨진다. 검색어에서는 빼고 넘긴다.
    const safe = q.replace(/[(),]/g, " ").trim();
    if (safe) {
      query = query.or(
        `recipient_phone.ilike.%${safe}%,sender_phone.ilike.%${safe}%,message_content.ilike.%${safe}%`
      );
    }
  }

  const { data, error, count } = await query.order("sent_at", { ascending: false }).limit(MAX_ROWS);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const rows = data || [];

  // 보낸 사람 이름 — sent_by(uuid)를 이름으로 바꿔서 내려준다.
  // 담당자 필터 드롭다운에 쓸 전체 직원 목록도 같이 준다(발송 이력이 없는 직원도
  // 골라볼 수 있어야 하므로 결과에 등장하는 사람만 모으면 안 됨).
  const { data: staffRows } = await admin.from("staff_accounts").select("id,name").order("name");
  const nameById: Record<string, string> = {};
  (staffRows || []).forEach((s: any) => {
    nameById[s.id] = s.name;
  });

  // ── 받는 사람 이름·업체 ────────────────────────────────────────────────
  // sms_logs에는 **번호만** 남는다(발송 시점 스냅샷). 번호만 보면 누구인지 알 수 없어서
  // related_type/related_id로 원본 레코드를 찾아 이름을 붙여준다(PR #85 리뷰 요청).
  // ⚠️ 이 이름은 **지금 시점의 원본 값**이라 발송 당시와 다를 수 있고(업체명 변경 등),
  // 원본이 삭제됐으면 비어 있다 — 그래서 로그에 이름을 따로 저장하지는 않았다.
  //    저장하려면 컬럼 추가(=DB 변경)가 필요하고, 이 화면은 "지금 누구에게 갔는지"를
  //    확인하는 용도라 조회 시점에 붙이는 편이 맞다고 판단했다.
  // 종류별로 한 번씩만 조회한다(최대 4회).
  const idsOf = (type: string) =>
    Array.from(
      new Set(rows.filter((r: any) => r.related_type === type && r.related_id).map((r: any) => r.related_id))
    );

  // 배차는 **같은 배차 건이라도 받는 사람이 갈린다** — 배차확정은 차주에게,
  // 상차·하차완료는 고객에게 나가므로 recipient_type을 보고 골라야 한다.
  const dispatchNames: Record<string, { driver: string | null; customer: string | null }> = {};
  const dispatchIds = idsOf("dispatch");
  if (dispatchIds.length > 0) {
    const { data: dispatches } = await admin
      .from("dispatches")
      .select(
        "id,assignment_type,external_driver_name,drivers(name),orders(guest_name,companies(name),individual_customers(name))"
      )
      .in("id", dispatchIds);
    (dispatches || []).forEach((d: any) => {
      const order = d.orders;
      dispatchNames[d.id] = {
        // 외부정보망 배정 건은 drivers 테이블에 행이 없고 자유텍스트로만 존재함
        driver: (d.assignment_type === "internal" ? d.drivers?.name : d.external_driver_name) || null,
        customer:
          order?.companies?.name || order?.individual_customers?.name || order?.guest_name || null,
      };
    });
  }

  const quoteNames: Record<string, string | null> = {};
  const quoteIds = idsOf("quote");
  if (quoteIds.length > 0) {
    const { data: quotes } = await admin
      .from("quotes")
      .select("id,guest_name,companies(name)")
      .in("id", quoteIds);
    (quotes || []).forEach((q: any) => {
      quoteNames[q.id] = q.companies?.name || q.guest_name || null;
    });
  }

  const applicationNames: Record<string, string | null> = {};
  const applicationIds = idsOf("application");
  if (applicationIds.length > 0) {
    const { data: applications } = await admin
      .from("customer_applications")
      .select("id,company_name,contact_name")
      .in("id", applicationIds);
    (applications || []).forEach((a: any) => {
      applicationNames[a.id] = a.company_name || a.contact_name || null;
    });
  }

  // 포털계정 이력은 related_id가 customer_accounts.id라 화주 상세로 바로 못 간다 —
  // 소속 회사를 찾아서 링크를 만들어준다(그 화면에 계정 목록과 이력이 함께 있음).
  const accountIds = idsOf("portal_account");
  const companyIdByAccount: Record<string, string> = {};
  const accountNames: Record<string, string | null> = {};
  if (accountIds.length > 0) {
    const { data: accounts } = await admin
      .from("customer_accounts")
      .select("id,company_id,name,companies(name)")
      .in("id", accountIds);
    (accounts || []).forEach((a: any) => {
      if (a.company_id) companyIdByAccount[a.id] = a.company_id;
      accountNames[a.id] = a.companies?.name || a.name || null;
    });
  }

  function recipientNameFor(row: any): string | null {
    if (row.related_type === "dispatch") {
      const found = dispatchNames[row.related_id];
      if (!found) return null;
      return row.recipient_type === "driver" ? found.driver : found.customer;
    }
    if (row.related_type === "quote") return quoteNames[row.related_id] || null;
    if (row.related_type === "application") return applicationNames[row.related_id] || null;
    if (row.related_type === "portal_account") return accountNames[row.related_id] || null;
    return null;
  }

  function linkFor(row: any): { href: string; label: string } | null {
    if (row.related_type === "dispatch") return { href: `/admin/dispatches/${row.related_id}`, label: "배차 보기" };
    if (row.related_type === "quote") return { href: `/admin/quotes/${row.related_id}`, label: "견적 보기" };
    if (row.related_type === "application") return { href: "/admin/applications", label: "신청서 목록" };
    if (row.related_type === "portal_account") {
      const companyId = companyIdByAccount[row.related_id];
      return companyId ? { href: `/admin/companies/${companyId}`, label: "화주 보기" } : null;
    }
    return null;
  }

  return NextResponse.json({
    data: rows.map((r: any) => ({
      ...r,
      sent_by_name: r.sent_by ? nameById[r.sent_by] || null : null,
      recipient_name: recipientNameFor(r),
      link: linkFor(r),
    })),
    // 상한에 걸렸는지 알려주려고 전체 건수도 같이 내려줌
    total: count ?? rows.length,
    limit: MAX_ROWS,
    staffOptions: (staffRows || []).map((s: any) => ({ id: s.id, name: s.name })),
  });
}
