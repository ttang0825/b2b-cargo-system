import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getCurrentStaff } from "@/lib/getCurrentStaff";
import {
  quoteSummaryMessage,
  quoteShareLinkMessage,
  QUOTE_SMS_SUBJECT,
} from "@/lib/sms/templates";
import { generateShareToken, quoteShareUrl } from "@/lib/quoteShare";
import { SMS_BYTE_LIMIT, byteLength } from "@/lib/sms/byteLength";
import { resolveSmsSender, contactPhoneForBody } from "@/lib/smsSenderPhone";

// 견적 안내는 자동발송이 아니라 견적 상세의 "견적서 출력(PDF)" 옆 수동 버튼으로만
// 나감(사전조사 1-3 결과 — 견적 상태값이 내부 영업퍼널 단계라 상태 변경마다
// 자동으로 문자를 보내면 의도치 않게 반복 발송될 수 있음). 이 API는 문구·수신번호
// 미리보기만 계산해서 돌려주고(**발송하지 않음**), 실제 발송은
// components/SmsConfirmModal.tsx에서 확인·수정 후 /api/admin/send-sms를
// 호출해야만 일어남(PR #73 리뷰 반영 — 모든 SMS를 발송 직전에 확인·수정할 수
// 있게 해달라는 요청).
export async function POST(req: Request) {
  const staff = await getCurrentStaff();
  if (!staff) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json(
      { error: "서버에 SUPABASE_SERVICE_ROLE_KEY가 설정되어 있지 않습니다." },
      { status: 500 }
    );
  }
  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { quote_id } = await req.json();
  if (!quote_id) {
    return NextResponse.json({ error: "quote_id가 필요합니다." }, { status: 400 });
  }

  const { data: quote, error: quoteError } = await admin
    .from("quotes")
    // 🔴 `share_token` 을 빼지 말 것 — 없으면 매번 새 토큰을 발급해서 **먼저 보낸
    //    문자의 링크가 죽는다**(아래 발급 블록이 있을 때만 만든다).
    .select("id,item,vehicle_type,final_amount,requested_pickup_at,origin,destination,selected_options,guest_phone,company_id,share_token,companies(contact_mobile)")
    .eq("id", quote_id)
    .single();
  if (quoteError || !quote) {
    return NextResponse.json({ error: "견적 정보를 찾을 수 없습니다." }, { status: 404 });
  }

  const phone: string | null = (quote as any).companies?.contact_mobile || quote.guest_phone || null;

  // 발신번호는 반드시 서버에서 세션으로 결정한다(클라이언트 입력값 신뢰 금지)
  const sender = await resolveSmsSender();

  // ⚠️ quotes는 상·하차 조건을 별도 컬럼이 아니라 selected_options(jsonb) 안에
  // 한글 키로 담는다(orders/portal_order_requests는 반대로 flat 컬럼) — CLAUDE.md 참고
  const options = (quote as any).selected_options || {};

  // ── 견적서 공유 링크 ────────────────────────────────────────────────────────
  //
  // 사용자 확정(2026-09-15): **기존 견적안내 문자를 링크 문자로 대체한다.**
  //
  // 🔴 **토큰은 한 번만 발급한다** — 이미 있으면 그대로 쓴다. 보낼 때마다 새로 만들면
  //    화주가 먼저 받은 문자의 링크가 죽는다(같은 견적을 두 번 안내하는 일은 흔하다).
  // 🔴 **백필하지 않는다** — 문자를 보내는 이 자리에서만 생긴다. 미리 만들어 두면
  //    보낸 적 없는 견적서의 링크가 DB 에 쌓인다.
  // ⚠️ 유니크 충돌은 사실상 일어나지 않지만(22자 base62 ≈ 131비트), 발급에 실패하면
  //    **옛 LMS 본문으로 내려간다** — 문자 자체가 안 나가는 것보다 낫다.
  let shareToken: string | null = (quote as any).share_token || null;
  if (!shareToken) {
    const token = generateShareToken();
    const { error: tokenError } = await admin
      .from("quotes")
      .update({ share_token: token, share_token_issued_at: new Date().toISOString() })
      .eq("id", quote_id)
      // 🔴 그 사이 다른 담당자가 발급했으면 덮어쓰지 않는다
      .is("share_token", null);
    if (!tokenError) {
      const { data: fresh } = await admin
        .from("quotes")
        .select("share_token")
        .eq("id", quote_id)
        .single();
      shareToken = (fresh as any)?.share_token || null;
    }
  }

  const message = shareToken
    ? quoteShareLinkMessage({ shareUrl: quoteShareUrl(shareToken) })
    : quoteSummaryMessage({
        item: quote.item,
        vehicleType: quote.vehicle_type,
        finalAmount: quote.final_amount,
        pickupAt: quote.requested_pickup_at,
        origin: (quote as any).origin,
        destination: (quote as any).destination,
        loadCondition: options["상차조건"] || null,
        unloadCondition: options["하차조건"] || null,
        contactPhone: contactPhoneForBody(sender),
        staffName: sender.staffName,
      });

  return NextResponse.json({
    relatedType: "quote",
    relatedId: quote_id,
    templateType: "quote_summary",
    recipientType: "customer",
    recipientPhone: phone,
    message,
    // 🔴 **단문에 제목을 주면 솔라피가 LMS 로 올린다** — 링크 문자는 87byte 라
    //    제목 없이 SMS 로 나가야 한다. 옛 LMS 본문으로 떨어졌을 때만 제목을 준다.
    subject: byteLength(message) > SMS_BYTE_LIMIT ? QUOTE_SMS_SUBJECT : null,
    senderDisplay: sender.display,
    senderStaffName: sender.staffName,
    senderIsStaffPhone: sender.isStaffPhone,
  });
}
