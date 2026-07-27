import { supabase } from "@/lib/supabaseClient";

// 두 직원이 같은 레코드를 동시에 열어 수정할 때, 나중에 저장한 사람이 먼저 저장된
// 내용을 조용히 덮어쓰지 않도록 "내가 불러온 시점의 updated_at"이 그대로인 경우에만
// 저장되게 함(낙관적 잠금). updated_at이 이미 바뀌어 있으면(=그 사이 다른 사람이
// 먼저 저장함) 아무 행도 갱신되지 않고 conflict: true를 돌려줌.
export async function optimisticUpdate(
  table: string,
  id: string,
  payload: Record<string, any>,
  lastKnownUpdatedAt: string | null | undefined
): Promise<{ conflict: boolean; error: string | null }> {
  let query = supabase.from(table).update(payload).eq("id", id);
  query = lastKnownUpdatedAt
    ? query.eq("updated_at", lastKnownUpdatedAt)
    : query.is("updated_at", null);

  const { data, error } = await query.select("id");
  if (error) return { conflict: false, error: error.message };
  if (!data || data.length === 0) {
    return { conflict: true, error: null };
  }
  return { conflict: false, error: null };
}
