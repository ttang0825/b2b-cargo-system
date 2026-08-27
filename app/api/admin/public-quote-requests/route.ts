import { NextResponse } from "next/server";
import { type SupabaseClient } from "@supabase/supabase-js";
import { createServiceClient } from "@/lib/supabaseServiceClient";
import type { ConsentRecord } from "@/lib/consent";
import { getCurrentStaff } from "@/lib/getCurrentStaff";

// Next.js가 GET 응답(및 그 안에서 호출되는 fetch)을 캐시해버리면, 방금 저장한 답변/상태가
// 재조회 시 예전 값으로 보이는 문제가 있었음 — 매 요청마다 실제 DB를 다시 조회하도록 강제
export const dynamic = "force-dynamic";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createServiceClient(url, serviceKey);
}

// 원본 행에 동의 기록을 붙인다.
// 🔴 `consents`는 RLS on + 정책 0개라 anon으로 읽을 수 없다 — 화면이 직접 조회하지 못하므로
// 이 서버 API가 함께 내려준다. 행마다 조회하면 N+1이 되므로 **id 목록으로 한 번만** 조회한다
// (36차 문자 이력에서 이름을 붙일 때 쓴 것과 같은 방식).
async function attachConsents<T extends { id: string }>(
  admin: SupabaseClient,
  subjectType: string,
  rows: T[]
): Promise<(T & { consents: ConsentRecord[] })[]> {
  const ids = rows.map((r) => r.id);
  if (ids.length === 0) return [];

  const { data } = await admin
    .from("consents")
    .select("id,subject_id,consent_type,version,agreed,agreed_at,source")
    .eq("subject_type", subjectType)
    .in("subject_id", ids)
    .order("agreed_at", { ascending: true });

  const bySubject = new Map<string, ConsentRecord[]>();
  (data || []).forEach((c: ConsentRecord & { subject_id: string }) => {
    const list = bySubject.get(c.subject_id) || [];
    list.push(c);
    bySubject.set(c.subject_id, list);
  });

  return rows.map((r) => ({ ...r, consents: bySubject.get(r.id) || [] }));
}

export async function GET() {
  const admin = getAdminClient();
  if (!admin) {
    return NextResponse.json(
      { error: "서버에 SUPABASE_SERVICE_ROLE_KEY가 설정되어 있지 않습니다." },
      { status: 500 }
    );
  }

  const { data, error } = await admin
    .from("public_quote_requests")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ data: await attachConsents(admin, "quote_request", data || []) });
}

export async function POST(req: Request) {
  const admin = getAdminClient();
  if (!admin) {
    return NextResponse.json(
      { error: "서버에 SUPABASE_SERVICE_ROLE_KEY가 설정되어 있지 않습니다." },
      { status: 500 }
    );
  }

  const body = await req.json();
  const { id, action } = body;
  if (!id) {
    return NextResponse.json({ error: "id가 필요합니다." }, { status: 400 });
  }

  if (action === "delete") {
    const staff = await getCurrentStaff();
    if (!staff || staff.role !== "admin") {
      return NextResponse.json({ error: "삭제는 관리자만 할 수 있습니다." }, { status: 403 });
    }
    const { error } = await admin.from("public_quote_requests").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  // action === "update" (기본)
  const payload: Record<string, any> = {};
  if ("status" in body) payload.status = body.status;
  if ("staff_note" in body) payload.staff_note = body.staff_note;
  if ("processed_by" in body) payload.processed_by = body.processed_by;

  const staff = await getCurrentStaff();
  payload.updated_by = staff?.id || null;

  const { error } = await admin.from("public_quote_requests").update(payload).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
