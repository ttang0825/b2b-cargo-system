import { NextResponse } from "next/server";
import { fetchStartPrices } from "@/lib/startPrices";

// 랜딩 「차량 · 요금 가이드」 모달이 쓰는 공개 조회.
//
// 🔴 `rate_distance_tiers` 는 21차에 잠겨서 anon 으로는 못 읽는다 — 그래서 이 라우트가
//    service_role 로 대신 읽는다. **「10km 이내」 한 칸만 내려준다**(28차 확정 —
//    전체 운임표·추가비 기준은 비공개). 다른 구간·가산 값을 여기에 얹지 말 것.
// 🔴 원칙 21번 — `force-dynamic` 과 `createServiceClient()`(fetchStartPrices 안)가
//    **둘 다** 있어야 한다. 하나만으로는 옛 값이 계속 내려간다.
export const dynamic = "force-dynamic";

export async function GET() {
  const { prices, stale } = await fetchStartPrices();
  return NextResponse.json({ prices, stale }, { headers: { "Cache-Control": "no-store" } });
}
