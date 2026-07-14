import { supabase } from "@/lib/supabaseClient";

// "Q-20260714-001" 형태로, 날짜 + 그날 몇 번째인지를 조합한 번호를 만듭니다.
export async function generateDailyNumber(
  table: "quotes" | "orders",
  prefix: string
): Promise<string> {
  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(
    2,
    "0"
  )}${String(now.getDate()).padStart(2, "0")}`;

  const startOfDay = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  ).toISOString();

  const { count } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true })
    .gte("created_at", startOfDay);

  const seq = String((count || 0) + 1).padStart(3, "0");
  return `${prefix}-${dateStr}-${seq}`;
}
