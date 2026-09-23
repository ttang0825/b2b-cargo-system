// POST /api/admin/send-quote-info-request — 「정보 회신 요청」 문자의 **확인창 미리보기**
//
// 사용자 요청(2026-09-22): *"견적문자 보내면서 추가로 문자를 하나더 보내면 좋겠다.
//   상,하차지 상세주소와 상,하차지 담당자 연락처를 문자로 회신해 달라는 문자메세지.
//   이 메세지는 화주통화 내용에 따라 보낼수도 있고 보내지 않을수도 있다."*
//
// 🚨 **이 라우트는 문자를 보내지 않는다.** 문구·수신번호만 만들어 돌려주고, 실제 발송은
//    담당자가 `components/SmsConfirmModal.tsx` 에서 [발송]을 눌러야 일어난다
//    (`/api/admin/send-sms`). 이 저장소의 문자 전부가 같은 자세다(PR #73 리뷰).
//    🔴 **`sendSmsWithLog` 를 이 라우트에 들이지 말 것.**
//
// 🔴 **`send-quote-sms` 와 합치지 말 것.** 저쪽은 견적서 링크를 보내면서 **토큰을
//    발급**한다(한 번만 · 보낼 때만). 이 문자는 토큰과 아무 상관이 없는데 한 라우트로
//    묶으면 *"주소만 물어보려고 눌렀는데 견적서 링크가 생겼다"* 가 된다.
//
// 🔴 발신번호는 **서버가 세션으로 정한다** — 클라이언트 입력값을 믿지 않는다(35차).

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getCurrentStaff } from "@/lib/getCurrentStaff";
import {
  quoteInfoRequestMessage,
} from "@/lib/sms/templates";
import { resolveSmsSender, contactPhoneForBody } from "@/lib/smsSenderPhone";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  // 🔴 **재직 직원이면 role 무관이다** — 문자를 보내는 다른 경로와 같은 기준이다.
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

  const { quote_id } = await req.json().catch(() => ({}) as any);
  if (!quote_id) {
    return NextResponse.json({ error: "quote_id가 필요합니다." }, { status: 400 });
  }

  // 🔴 **`share_token` 을 읽지 않는다** — 이 문자는 링크를 보내지 않으므로 토큰을
  //    건드릴 이유가 없다(위 주석).
  const { data: quote, error: quoteError } = await admin
    .from("quotes")
    .select("id,origin,destination,guest_phone,company_id,companies(contact_mobile)")
    .eq("id", quote_id)
    .single();
  if (quoteError || !quote) {
    return NextResponse.json({ error: "견적 정보를 찾을 수 없습니다." }, { status: 404 });
  }

  // 견적 문자와 **같은 수신번호 규칙**이다(회원이면 담당자 휴대폰, 게스트면 입력값)
  const phone: string | null =
    (quote as any).companies?.contact_mobile || (quote as any).guest_phone || null;

  const sender = await resolveSmsSender();

  // 🔴 **문의 줄은 담당자 번호·이름이다**(사용자 확정 2026-09-23) — 열세 판본이 전부 같다.
  //    번호가 등록돼 있지 않으면 `contactPhoneForBody` 가 대표번호로 떨어뜨린다.
  const message = quoteInfoRequestMessage({
    origin: (quote as any).origin,
    destination: (quote as any).destination,
    contactPhone: contactPhoneForBody(sender),
    staffName: sender.staffName,
  });

  return NextResponse.json({
    relatedType: "quote",
    relatedId: quote_id,
    templateType: "quote_info_request",
    recipientType: "customer",
    recipientPhone: phone,
    message,
    senderDisplay: sender.display,
    senderStaffName: sender.staffName,
    senderIsStaffPhone: sender.isStaffPhone,
  });
}
