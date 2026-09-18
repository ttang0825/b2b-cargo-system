import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getCurrentStaff } from "@/lib/getCurrentStaff";
import {
  CALL_SCRIPT_MAX_LINES,
  normalizeCallScriptLines,
} from "@/lib/callScript";

// ─────────────────────────────────────────────────────────────────────────────
// 전화응대 매뉴얼 저장 (2026-09-18)
//
// 🔴 **읽기는 이 라우트를 안 거친다** — 화면이 로그인한 직원 세션으로 `call_script`
//    를 직접 읽는다(RLS `staff_read_call_script`). 그래서 GET 이 없다.
//    ⚠️ GET 을 새로 만들게 되면 `force-dynamic` **과** `createServiceClient()` 가
//       둘 다 필요하다(원칙 21번) — `force-dynamic` 만으로는 supabase-js 내부
//       `fetch` 가 Next 의 Data Cache 를 타서 저장 직후 옛 값을 돌려준다.
//
// 🔴 **쓰기는 여기뿐이다.** `call_script` 에는 insert/update 정책이 아예 없어서
//    service_role 인 이 라우트 말고는 아무도 못 쓴다. 화면이 「편집」 버튼을 감추는
//    것과 여기 `role === "admin"` 검사는 **한 벌**이다(원칙 25번) — 화면만 감추면
//    브라우저 콘솔에서 그대로 부를 수 있다.
// ─────────────────────────────────────────────────────────────────────────────

export const dynamic = "force-dynamic";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function POST(req: Request) {
  const currentStaff = await getCurrentStaff();
  if (!currentStaff || currentStaff.role !== "admin") {
    return NextResponse.json(
      { error: "전화응대 매뉴얼은 관리자만 수정할 수 있습니다." },
      { status: 403 }
    );
  }

  const admin = getAdminClient();
  if (!admin) {
    return NextResponse.json(
      { error: "서버에 SUPABASE_SERVICE_ROLE_KEY가 설정되어 있지 않습니다." },
      { status: 500 }
    );
  }

  const body = await req.json().catch(() => null);
  if (!body || !Array.isArray(body.lines)) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  // 🔴 화면과 **같은 함수**로 다듬는다 — 여기서 따로 다듬으면 화면에 보이던 것과
  //    저장된 것이 갈린다.
  const lines = normalizeCallScriptLines(body.lines);
  if (body.lines.length > CALL_SCRIPT_MAX_LINES) {
    return NextResponse.json(
      { error: `줄은 최대 ${CALL_SCRIPT_MAX_LINES}개까지 저장할 수 있습니다.` },
      { status: 400 }
    );
  }

  // ── 덮어쓰기 확인 (원칙 28번과 같은 결) ─────────────────────────────────────
  //
  // 🔴 **이 블록을 빼지 말 것.** 두 관리자가 같은 창을 열어 두고 각자 고치면,
  //    나중에 저장한 쪽이 앞사람 글을 **아무 경고 없이** 지운다. 매뉴얼은 여러 줄을
  //    통째로 바꾸는 저장이라 그 손실이 크다.
  // ⚠️ 행이 아직 없을 수도 있다(마이그레이션 직후) — 그때는 견줄 것이 없으므로 통과.
  const { data: current, error: readError } = await admin
    .from("call_script")
    .select("updated_at")
    .eq("id", true)
    .maybeSingle();

  if (readError) {
    return NextResponse.json({ error: readError.message }, { status: 400 });
  }

  const known: string | null = body.updatedAt ?? null;
  if (current?.updated_at && known && current.updated_at !== known) {
    return NextResponse.json(
      {
        error:
          "그 사이 다른 관리자가 매뉴얼을 저장했습니다. 새로고침해서 바뀐 내용을 확인한 뒤 다시 수정해주세요.",
        conflict: true,
      },
      { status: 409 }
    );
  }

  // 🔴 `upsert` 다 — 마이그레이션이 넣은 행이 있으면 갱신하고, 어떤 이유로든 행이
  //    사라졌으면 다시 만든다. 화면에 「저장은 됐다는데 안 보인다」가 생기지 않는다.
  const { error } = await admin
    .from("call_script")
    .upsert(
      {
        id: true,
        lines,
        updated_at: new Date().toISOString(),
        updated_by: currentStaff.id,
      },
      { onConflict: "id" }
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // 저장된 결과를 그대로 돌려준다 — 화면이 다시 조회하지 않아도 되고,
  // 다음 저장에 쓸 `updatedAt` 기준도 여기서 받는다.
  const { data: saved, error: afterError } = await admin
    .from("call_script")
    .select("lines,updated_at")
    .eq("id", true)
    .maybeSingle();

  if (afterError) {
    return NextResponse.json({ error: afterError.message }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    lines: normalizeCallScriptLines(saved?.lines),
    updatedAt: (saved?.updated_at as string) ?? null,
  });
}
