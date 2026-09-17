"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

// staff_accounts 이름 조회 결과를 화면 전체에서 재사용 (매 상세화면마다 다시 안 불러오게)
let staffNameCache: Record<string, string> | null = null;
let staffNameCachePromise: Promise<Record<string, string>> | null = null;

async function loadStaffNames(): Promise<Record<string, string>> {
  if (staffNameCache) return staffNameCache;
  if (!staffNameCachePromise) {
    staffNameCachePromise = (async () => {
      const { data } = await supabase.from("staff_accounts").select("id,name");
      const map: Record<string, string> = {};
      (data || []).forEach((s: any) => {
        map[s.id] = s.name;
      });
      staffNameCache = map;
      return map;
    })();
  }
  return staffNameCachePromise;
}

function formatDate(value: string) {
  const d = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;
}

export default function ProcessedByFooter({
  createdBy,
  createdAt,
  updatedBy,
  updatedAt,
}: {
  createdBy?: string | null;
  createdAt?: string | null;
  updatedBy?: string | null;
  updatedAt?: string | null;
}) {
  const [names, setNames] = useState<Record<string, string>>({});

  useEffect(() => {
    loadStaffNames().then(setNames);
  }, []);

  if (!createdBy && !updatedBy) return null;

  const parts: string[] = [];
  if (createdBy) {
    parts.push(`등록: ${names[createdBy] || "알 수 없음"}${createdAt ? ` (${formatDate(createdAt)})` : ""}`);
  }
  if (updatedBy) {
    parts.push(`최종수정: ${names[updatedBy] || "알 수 없음"}${updatedAt ? ` (${formatDate(updatedAt)})` : ""}`);
  }

  return (
    <div
      style={{
        fontSize: 11,
        color: "var(--text-muted)",
        marginTop: 14,
        paddingTop: 10,
        borderTop: "1px dashed var(--border)",
      }}
    >
      {parts.join(" · ")}
    </div>
  );
}
