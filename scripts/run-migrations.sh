#!/usr/bin/env bash
#
# migrations/ 안의 .sql 파일 중 아직 적용되지 않은 것을 순서대로 실행한다.
#
#   사용법:  MODE=dry-run|apply  DATABASE_URL=postgresql://...  scripts/run-migrations.sh
#
# 🔴 이 스크립트는 GitHub Actions에서만 돌립니다. 로컬에서 직접 돌리지 마십시오 —
#    운영 DB에 붙는 스크립트이고, 이 저장소의 관례상 되돌리기가 없는 테이블을 건드립니다.
#
# 설계 메모
#   · 실행 순서는 **파일명 오름차순**입니다. 그래서 파일명이 날짜로 시작해야 합니다.
#   · 파일 하나 = 트랜잭션 하나(`--single-transaction`). 중간에 실패하면 그 파일은
#     통째로 되돌아가고, 이력에도 기록되지 않습니다. 다음 실행 때 다시 시도합니다.
#   · 이력 기록(INSERT)을 같은 트랜잭션 안에 붙입니다. 그래서 "적용은 됐는데 기록이
#     안 된" 상태가 생기지 않습니다 — 이게 중복 실행을 막는 핵심입니다.
#   · 여러 파일이 대기 중이면 앞 파일부터 순서대로 커밋됩니다. 3번째에서 실패해도
#     1·2번은 이미 반영된 상태로 남습니다(파일 사이는 원자적이지 않습니다).

set -euo pipefail

MODE="${MODE:-dry-run}"
MIG_DIR="migrations"
ACTOR="${GITHUB_ACTOR:-unknown}"

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "::error::DATABASE_URL 이 비어 있습니다. GitHub 저장소 Secret 'SUPABASE_DB_URL' 이 등록됐는지 확인하십시오."
  exit 1
fi

# psql 이 트랜잭션 밖에서 조용히 넘어가지 않도록
export PGOPTIONS='--client-min-messages=warning'
PSQL=(psql "$DATABASE_URL" -v ON_ERROR_STOP=1 --no-psqlrc)

echo "▶ 접속 확인"
"${PSQL[@]}" -Atc "select 'ok ' || current_database() || ' / ' || current_user"

echo
echo "▶ 이력 테이블 준비"
"${PSQL[@]}" -f "$MIG_DIR/_bootstrap.sql"

# ── baseline 등록 ────────────────────────────────────────────────────────────
# _baseline.txt 에 적힌 파일은 사람이 이미 실행한 것이므로 "적용됨"으로 기록만 한다.
# 🔴 절대 실행하지 않는다. 실행하면 17차 INSERT 가 중복된다.
echo
echo "▶ baseline 등록 (이미 사람이 실행한 파일)"
while IFS= read -r line; do
  line="${line%%#*}"; line="$(echo "$line" | xargs || true)"
  [[ -z "$line" ]] && continue
  f="$MIG_DIR/$line"
  if [[ ! -f "$f" ]]; then
    echo "::error::_baseline.txt 가 없는 파일을 가리킵니다: $line"
    exit 1
  fi
  sum="$(sha256sum "$f" | cut -d' ' -f1)"
  "${PSQL[@]}" -Atc "insert into _migrations(filename, checksum, applied_by)
                     values ('$line', '$sum', 'baseline')
                     on conflict (filename) do nothing" >/dev/null
  echo "   · $line"
done < "$MIG_DIR/_baseline.txt"

# ── 대기 목록 계산 ───────────────────────────────────────────────────────────
mapfile -t APPLIED < <("${PSQL[@]}" -Atc "select filename from _migrations order by filename")

is_applied() {
  local needle="$1"
  for a in "${APPLIED[@]:-}"; do [[ "$a" == "$needle" ]] && return 0; done
  return 1
}

PENDING=()
for f in $(ls -1 "$MIG_DIR"/*.sql | sort); do
  base="$(basename "$f")"
  [[ "$base" == _* ]] && continue          # _bootstrap.sql 등 밑줄로 시작하는 것은 대상 아님
  is_applied "$base" || PENDING+=("$base")
done

# ── 드리프트 감지 (적용된 파일이 나중에 수정됐는지) ─────────────────────────
echo
echo "▶ 적용된 파일 내용 변경 확인"
DRIFT=0
while IFS='|' read -r fn recorded; do
  [[ -z "$fn" ]] && continue
  [[ -f "$MIG_DIR/$fn" ]] || continue
  [[ -z "$recorded" ]] && continue
  now="$(sha256sum "$MIG_DIR/$fn" | cut -d' ' -f1)"
  if [[ "$now" != "$recorded" ]]; then
    echo "::warning::이미 적용된 마이그레이션이 그 뒤에 수정됐습니다: $fn"
    DRIFT=1
  fi
done < <("${PSQL[@]}" -Atc "select filename || '|' || coalesce(checksum,'') from _migrations")
[[ "$DRIFT" == "0" ]] && echo "   변경 없음"
# 🔴 경고만 하고 멈추지 않습니다. 주석만 고친 경우까지 막으면 이후 마이그레이션이
#    통째로 발이 묶이기 때문입니다. 다만 **적용된 SQL 문 자체는 고치지 마십시오** —
#    DB에는 옛 내용이 반영돼 있는데 파일은 새 내용이라 둘이 어긋나게 됩니다.

# ── 결과 ────────────────────────────────────────────────────────────────────
echo
if [[ ${#PENDING[@]} -eq 0 ]]; then
  echo "▶ 실행할 마이그레이션이 없습니다. (전부 적용됨)"
  exit 0
fi

echo "▶ 실행 대기 ${#PENDING[@]}건"
for p in "${PENDING[@]}"; do echo "   · $p"; done

if [[ "$MODE" != "apply" ]]; then
  echo
  echo "▶ dry-run 이므로 실행하지 않고 끝냅니다."
  echo "  실제로 반영하려면 워크플로를 다시 실행하면서 mode 를 'apply' 로 고르십시오."
  exit 0
fi

# ── 실행 ────────────────────────────────────────────────────────────────────
for base in "${PENDING[@]}"; do
  f="$MIG_DIR/$base"
  sum="$(sha256sum "$f" | cut -d' ' -f1)"
  tmp="$(mktemp)"

  # 마이그레이션 본문 + 이력 기록을 한 트랜잭션으로 묶는다.
  cat "$f"                                                   >  "$tmp"
  printf '\n;\n'                                             >> "$tmp"
  printf "insert into _migrations(filename, checksum, applied_by)\n"  >> "$tmp"
  printf "values ('%s', '%s', '%s');\n" "$base" "$sum" "$ACTOR"       >> "$tmp"

  echo
  echo "════════════════════════════════════════════════════"
  echo "▶ 실행: $base"
  echo "════════════════════════════════════════════════════"
  "${PSQL[@]}" --single-transaction --echo-queries -f "$tmp"
  rm -f "$tmp"
  echo "✔ 반영 완료: $base"
done

echo
echo "▶ 전부 완료. 현재 이력:"
"${PSQL[@]}" -c "select filename, applied_at, applied_by from _migrations order by filename"
