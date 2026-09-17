"use client";

import { useEffect, useState } from "react";
// 🔴 **캐시는 `lib/staffNames.ts` 하나다**(2026-09-17 분리) — 수정 이력 패널이 같은
//    조회를 하므로, 여기에 다시 만들면 같은 화면에서 `staff_accounts` 를 두 번 읽는다.
import { loadStaffNames } from "@/lib/staffNames";

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
