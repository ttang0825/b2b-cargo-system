import { NextResponse } from "next/server";

const REASON_GUIDANCE: Record<string, string> = {
  "서비스 권역/노선 불일치": "안내하신 구간이 현재 저희 서비스 권역과 맞지 않아 부득이하게 진행이 어렵습니다.",
  "최소 거래조건 미충족 (예상 물량 과소)": "예상 운송 물량 기준으로는 저희 서비스 특성상 원활한 지원이 어려울 것으로 판단되었습니다.",
  "취급 불가 품목": "안내하신 품목은 현재 저희가 지원하지 않는 품목입니다.",
  "사업자 정보 확인 불가": "입력하신 사업자 정보를 확인하는 과정에서 확인이 어려운 부분이 있었습니다.",
  "연락 두절": "안내드린 연락처로 연결이 되지 않아 확인이 어려웠습니다.",
  "중복 신청": "이미 접수된 신청 건과 중복되어 별도 안내드립니다.",
  "추가 확인 필요 (전화 상담 예정)": "보다 정확한 안내를 위해 담당자가 곧 전화로 연락드릴 예정입니다.",
  "서류·정보 보완 필요": "신청 시 입력하신 정보 중 확인이 더 필요한 부분이 있어 보완 후 다시 안내드리겠습니다.",
  "성수기 등 일시적 사유": "현재 일시적인 사유로 신규 화주 등록이 지연되고 있어, 잠시 후 다시 안내드리겠습니다.",
  "내부 검토 중": "내부 검토가 진행 중이며, 확인되는 대로 빠르게 안내드리겠습니다.",
};

export async function POST(req: Request) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "서버에 RESEND_API_KEY가 설정되어 있지 않습니다. 이메일 발송 서비스 가입이 먼저 필요합니다." },
      { status: 500 }
    );
  }

  const { email, companyName, contactName, status, reason, customNote } = await req.json();
  if (!email || !status) {
    return NextResponse.json({ error: "이메일과 처리 상태 정보가 필요합니다." }, { status: 400 });
  }

  const isHold = status === "보류";
  const guidance = REASON_GUIDANCE[reason] || customNote || "자세한 사유는 고객센터로 문의해주시면 안내드리겠습니다.";

  const html = `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
      <h2 style="color:#1a1a1a;">WeCarry 화주 등록 신청 결과 안내</h2>
      <p>안녕하세요, ${contactName ? contactName + "님" : "담당자님"}.</p>
      <p><b>${companyName || "귀사"}</b>의 화주 등록 신청이
      <b style="color:${isHold ? "#d9730d" : "#e5484d"};">${status}</b> 처리되었습니다.</p>
      <div style="background:#fff9d6; border-radius:10px; padding:16px; margin:20px 0; font-size:14px;">
        ${guidance}
      </div>
      ${
        isHold
          ? `<p style="font-size:13px; color:#666;">별도 안내 없이도 언제든 다시 신청하실 수 있습니다.</p>`
          : `<p style="font-size:13px; color:#666;">문의사항이 있으시면 고객센터로 편하게 연락해주세요. 상황이 바뀌면 언제든 다시 신청하실 수 있습니다.</p>`
      }
      <p style="font-size:13px; color:#999; margin-top:24px;">WeCarry 운송</p>
    </div>
  `;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "WeCarry 운송 <onboarding@resend.dev>",
        to: [email],
        subject: `[WeCarry] 화주 등록 신청 결과 안내 (${status})`,
        html,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json({ error: data.message || "이메일 발송에 실패했습니다." }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "이메일 발송 중 오류가 발생했습니다." }, { status: 500 });
  }
}
