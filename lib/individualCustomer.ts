import { supabase } from "@/lib/supabaseClient";
import { getCurrentStaffId } from "@/lib/currentStaff";

// 하이픈 등을 제거하고 숫자만 남겨서 동일 인물 판별 기준으로 사용
export function normalizePhone(phone: string): string {
  return (phone || "").replace(/[^0-9]/g, "");
}

// 전화번호로 기존 개인고객을 찾아 연결하거나, 없으면 새로 만들어서 id를 반환.
// 넘겨받은 주소는 이력에 추가(이미 있는 주소면 중복으로 안 쌓임)
export async function getOrCreateIndividualCustomer(
  name: string,
  phone: string,
  addresses: { address: string; location_type: string }[] = []
): Promise<string | null> {
  const normalized = normalizePhone(phone);
  if (!normalized) return null;

  const { data: existing } = await supabase
    .from("individual_customers")
    .select("id")
    .eq("phone_normalized", normalized)
    .maybeSingle();

  let customerId = existing?.id as string | undefined;

  if (!customerId) {
    const staffId = await getCurrentStaffId();
    const { data: created, error } = await supabase
      .from("individual_customers")
      .insert({
        name: name?.trim() || "이름 미상",
        phone,
        phone_normalized: normalized,
        created_by: staffId,
      })
      .select("id")
      .single();
    if (error || !created) return null;
    customerId = created.id;
  }

  for (const addr of addresses) {
    if (!addr.address?.trim()) continue;
    const { data: dup } = await supabase
      .from("individual_customer_addresses")
      .select("id")
      .eq("individual_customer_id", customerId)
      .eq("address", addr.address)
      .eq("location_type", addr.location_type)
      .maybeSingle();
    if (!dup) {
      await supabase.from("individual_customer_addresses").insert({
        individual_customer_id: customerId,
        address: addr.address,
        location_type: addr.location_type,
      });
    }
  }

  return customerId;
}

// 개인고객 이름/연락처 입력 화면에서 "기존에 등록된 개인고객인지" 조회할 때 사용
export async function findIndividualCustomerByPhone(
  phone: string
): Promise<{ id: string; name: string } | null> {
  const normalized = normalizePhone(phone);
  if (!normalized) return null;
  const { data } = await supabase
    .from("individual_customers")
    .select("id,name")
    .eq("phone_normalized", normalized)
    .maybeSingle();
  return data || null;
}
