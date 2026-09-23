# WeCarry 운송 통합 운영 시스템 — 최종 인수인계 문서

> 이 문서는 claude.ai 채팅에서 **Claude Code로 작업 방식을 전환하는 시점**에 작성된
> 최종 버전입니다. 앞으로는 이 문서(또는 `CLAUDE.md`)를 참고해서 Claude Code가
> 작업을 이어갑니다.

> ### 🔴 새 세션은 `HANDOFF.md` 를 먼저 읽으십시오
>
> 저장소 루트에 **`HANDOFF.md`** 가 있습니다. 두 문서는 **역할이 다릅니다.**
>
> | 문서 | 성격 | 언제 |
> |---|---|---|
> | **`HANDOFF.md`** | **지금 시점의 정돈된 스냅샷** | 🔴 **새 세션이 먼저 읽는 입구** |
> | `CLAUDE.md`(이 문서) | 세션별 축적 기록 — **왜 그렇게 했는지의 근거** | 특정 결정의 배경을 되짚을 때 |
>
> 🔴 **`HANDOFF.md` 는 `CLAUDE.md` 의 대체가 아니라 입구입니다.** **이 문서를 요약해서
> 줄이지 마십시오** — 되돌리면 안 되는 결정의 근거가 여기에만 있습니다.
>
> ⚠️ **세션 기록은 2026-09-09 에 `docs/history/` 로 옮겼습니다**(약 65만 자 → 약 14만 자).
> 🔴 **아래 표의 자수는 2026-09-14 에 전수 실측했습니다** — `history-07`·`history-08` 두 행이
> 크게 어긋나 있었는데(71,022 → **38,232** · 32,637 → **18,221**), **데이터 손실이 아니라
> 그 숫자를 써 넣은 커밋(`c37d5b4`)에서부터 틀린 값**이었습니다(그 시점 파일을 꺼내 재서
> 확인했습니다). 🔴 **「줄어들었다」로 읽고 아카이브를 복원하려 들지 마십시오.**
> ⚠️ **2026-09-14(PR #149 직후)에 `history-01`~`06` 도 전수 재측정했습니다** — 여섯 행이 전부
> **약 180자씩 적게** 적혀 있었는데, 분리할 때 붙인 **머리 안내 네 줄**이 빠진 값이었습니다.
> **내용은 그대로이고 표기만 맞춘 것입니다.**
> 🔴 이 문서(`CLAUDE.md`)는 **163,622자**입니다(2026-09-23 PR #184 기록 직후 · 그 앞은 171,216자였습니다) —
> 🟢 **기록을 한 건 더했는데 줄었습니다** — 요약을 루트에 더하면서 오래된 **리워드 1·2·3차 세 건**을
> `docs/history/summaries.md` 로 옮겼기 때문입니다(§5 분리 규칙). 🔴 **그 규칙을 지키십시오.**
> 컨텍스트 예산 판단에 쓰는 값입니다. ⚠️ 같은 날 **394,160 → 200,139 → 157,713자**로 두 번 줄었고
> (앞은 §5 로드맵 완료분 · 뒤는 §5 뒤쪽의 완료된 지시서 차수 목록), 그 앞은 393,241자였습니다.
> 🔴 **줄어든 것을 「없앤 것」으로 읽지 마십시오** — 전부 `docs/history/` 로 옮겼고 한 글자도 안 지웠습니다.
> 🚨 **이 파일은 세션이 시작될 때마다, 그리고 `/compact` 직후에도 통째로 다시 주입됩니다** —
> 그래서 이 숫자가 곧 **질문 하나를 하기도 전에 깔리는 비용**이고, 크면 질문 한 번에 압축이
> 한 번씩 걸립니다(2026-09-22 에 사용자가 그 증상을 신고했습니다).
> 🔴 **그래서 §5 에서 「완료된 것」 두 덩어리를 `docs/history/` 로 옮겼습니다** —
> 로드맵 완료 차수 80건(`roadmap-done.md` 「목록 1」) · 차수별 요약 40건(`summaries.md`).
> 🔴 **그 뒤 같은 날 §5 「뒤쪽 목록」도 옮겼습니다** — 완료된 지시서 차수 **1차 → 31차** + 차수 없음 9건
> (`roadmap-done.md` **「목록 2」** 47,307자 · 840줄) + 남아 있던 차수별 요약 **3건**(`summaries.md` 2,133자).
> 🔴 **두 번 다 한 글자도 안 지웠습니다.** 앞의 것은 빈 줄 뺀 3,119줄 일치 + 블록 단위 바이트 동일로,
> 뒤의 것은 ① **옮긴 일곱 덩어리가 아카이브 안에서 바이트까지 같은 연속 구간인가** ② **남긴 아홉 덩어리가
> 루트에 바이트까지 같은가** ③ **원본 972줄의 줄 다중집합이 하나도 안 줄었는가** ④ **손대지 않은 앞뒤 구간이
> 바이트까지 같은가** 넷으로 대조했습니다.
> 🔴 **이 규칙을 지키십시오 — 루트에는 「지금 상태」와 「다음」만 둡니다.** 끝난 차수의 기록은
> 루트가 아니라 `docs/history/` 로 갑니다. 안 지키면 두 달이면 다시 40만 자가 됩니다
> (PR #134 가 655,000 → 139,000자로 줄였는데 **2주 만에 394,000자로 돌아왔습니다**).
> ⚠️ **`wc -m` 으로 세지 마십시오** — 이 환경은 locale 이 UTF-8 이 아니라 **바이트**가 나옵니다
> (한글 섞인 글은 실제의 약 1.9배). `python3` 의 `len()` 으로 세십시오.
> ⚠️ **`current.md` 는 지금 68,103자입니다**(상한 80,000자 · 2026-09-23 실측) —
> ⚠️ **상한까지 11,897자밖에 안 남았습니다.** 기록 한 건이 7,000~18,000자이니 **다음 한 건에서 갈라야 할 수 있습니다** — `/merge` 때 먼저 재십시오.
> 🚨 **그런데 2026-09-22 의 기록 세 건이 `current.md` 에 없습니다**(운송완료 확인창 스위치 `da05bae` ·
> 미적립 건 탭 `60c8fd1` · 운임 할인 적용 `9307790`) — 그날은 §5 로드맵과 HANDOFF §5-27 에만 적었습니다.
> 🔴 **「기록이 지워졌다」로 읽지 마십시오** — 근거는 그 두 곳에 있고, 갈라낼 때 이 세 건이
> `current.md` 에 없다는 것을 전제로 범위를 셀 것.
> ⚠️ **`current.md` 를 `history-21.md` 로 갈랐습니다**(2026-09-22 · 이용가이드 재작성 #175 ·
> 문자 발송 정리 #176 · 포털 「접수」 카드 #177 · 라보 운임 통일 #178 **4건**을 옮김 ·
> **머리 안내를 뺀 본문을 공백 걷어낸 글자 md5 로 대조해 한 글자도 안 지웠음을 확인**했습니다
> — `9db6fed90a2ad4342622ab77140c20dd`). 🚨 **그런데 그 md5 만으로는 모자랍니다** — 공백을
> 걷어내는 대조는 **개행이 사라진 것을 못 잡습니다.** 이번에 실제로 밟았습니다(구간을
> 이어붙이며 경계 개행을 잃어 `---## 문자 발송 정리` 처럼 **제목이 앞줄에 붙었는데 md5 는
> 그대로 통과**했습니다 · 네 경계에서 총 6개). 🔴 **다음에 가를 때는 「두 파일의 본문을 개행
> 하나로 이으면 원본과 바이트까지 같은가」를 함께 단언하십시오** — 그 단언이 이것을 잡았습니다.
> 🔴 **세 건이 아니라 네 건을 옮긴 것은 의도입니다** —
> 리워드 1차 기록이 혼자 17,875자라 기록 크기가 커졌고, 세 건만 옮기면 다음 차수에 또
> 갈라야 합니다. ⚠️ 그 앞 차례는 `history-20.md` 였습니다(2026-09-20 · 공지사항 간이 서식 #174 ·
> 수정견적 배지 #173 · 배차취소 후속 #172 **3건**을 옮김 · **머리 안내를 뺀 본문을 공백 걷어낸
> 글자 md5 로 대조해 한 글자도 안 지웠음을 확인**했습니다 — `e8240d648f2d0ade7b184e0eeaa6d8b7`).
> 지금은 **58,911자**다.
> ⚠️ 그 앞 차례는 `history-19.md` 였습니다(2026-09-18 · 랜딩 히어로 선명도 #169 ·
> 마감 CTA 배경 #170 · 배차 취소·문제발생 사유 #171 **3건**을 옮김 · **공백을 걷어낸 글자
> md5 대조로 한 글자도 안 지웠음을 확인**했습니다 — `89f7163ba2ad752bc130e231eb28bc26`).
> 지금은 **24,379자**다.
> ⚠️ 그 앞 차례는 `history-18.md` 였습니다(2026-09-18 · 39차 D장 #166 ·
> 내부시스템 소수정 8건 #167 · 목록 기간 「직접지정」 #168 **3건**을 옮김 · **공백을 걷어낸
> 글자 md5 대조로 한 글자도 안 지웠음을 확인**했습니다 — `1d5e04fceeb0a1cd4553eda1948c8ee7`).
> 지금은 **22,727자**다.
> ⚠️ 그 앞 차례는 `history-17.md` 였습니다(2026-09-17 · 39차 #165 · 포털 알림 #164 ·
> 견적번호 중복 #163 **3건**을 옮김 · **공백을 걷어낸 글자 md5 대조로 한 글자도 안 지웠음을
> 확인**했습니다 — `795247489dfc58314f91cfc898336dc1`). 지금은 **19,324자**다.
> ⚠️ 그 앞 차례는 `history-16.md` 였습니다(2026-09-17 · 24시콜 v4 · 37차 ⓐ #159 ·
> 38차 #160 · 포털 B장 #161 · 알림 4건 #162 **5건**을 옮김 · **md5 대조로 한 글자도 안 지웠음을
> 확인**했습니다 — `e636e43c4f0ed5cea14590f07915c430`). 지금은 **74,372자**다.
> ⚠️ 그 앞 차례는 `history-15.md` 였습니다(2026-09-16 ·
> 문서 정합 4차 · 운임기준표 v12 · 추가 수정 6건 **3건**을 옮김 · **md5 대조로 한 글자도
> 안 지웠음을 확인**했습니다 — `684817216e73b2f67787cf92572e281e`). 지금은 **59,653자**다.
> ⚠️ 그 앞 차례는 `history-14.md` 였다(#151~#154 5건 · 그때는 56,783자로 줄었다).
> 어느 파일에 무엇이 있는지는 **§0 의 「이력 찾는 법」** 표를 보십시오.
>
> 🔴 **파일명은 고정입니다.** 갱신할 때 `HANDOFF_v21.md` 같은 새 파일을 만들지 말고
> **그 파일의 내용만 교체**하십시오. 버전은 문서 첫머리에만 적습니다 — 파일명을 바꾸면
> 이 안내와 §9 의 읽는 순서가 깨집니다.

## 0. 이 문서를 읽는 방법 (Claude Code에게)

이 프로젝트는 claude.ai 채팅에서 수십 차례에 걸쳐 기능을 만들어왔고, 만들어진 코드는
**항상 사용자가 GitHub 웹 화면에 직접 복사-붙여넣기하는 방식**으로 반영되었다. 즉:

- 이 문서에 적힌 "완료됨" 항목은 **사용자가 실제로 GitHub에 적용했다고 확인한 것**만 표시
- 일부 항목은 "적용 안내는 했지만 사용자의 최종 확인을 못 받은 상태"일 수 있음 — 실제
  저장소 코드가 이 문서 내용과 다르면 **저장소 쪽이 항상 맞다**
- 작업 방식이 이제 Claude Code로 바뀌므로, 앞으로는 직접 파일을 읽고 수정하면 됨
  (더 이상 "파일을 만들어서 보여주고 사용자가 복붙" 하는 방식이 아님)

---

### 🔴 이력 찾는 법 — 세션 기록은 `docs/history/` 에 있습니다

2026-09-09 에 세션 기록 56건과 §4 를 옮겼습니다. **한 글자도 지우지 않았습니다.**
🔴 **이 문서(루트)에는 세션 기록을 쓰지 않습니다** — 새 기록은 `current.md` 맨 위에 쌓습니다.

| 파일 | 담는 범위 | 크기 |
|---|---|---:|
| `docs/history/history-01.md` | 6차 #49  →  36차 #84   (6건) | 76,983자 |
| `docs/history/history-02.md` | 37차  →  52차 #101   (14건) | 79,781자 |
| `docs/history/history-03.md` | 53차  →  59차 #106 2026-08-29   (7건) | 72,311자 |
| `docs/history/history-04.md` | 60차 #107 2026-08-31  →  65차 #112 2026-09-02   (6건) | 69,928자 |
| `docs/history/history-05.md` | 66차 #113 2026-09-03  →  #122 2026-09-07   (12건) | 79,372자 |
| `docs/history/history-06.md` | #123 2026-09-07  →  #128 2026-09-08   (6건) | 49,780자 |
| `docs/history/history-07.md` | #129 2026-09-08  →  #134 2026-09-09   (6건) | 38,232자 |
| `docs/history/history-08.md` | #135 2026-09-09  →  문서 정합 정리 2026-09-09   (3건) | 18,221자 |
| `docs/history/history-09.md` | 32차 #137 2026-09-09  →  이용약관 terms-v5 #138   (2건) | 14,012자 |
| `docs/history/history-10.md` | 33차 #139 2026-09-10  →  정기계약 배지 후속 #140 2026-09-10   (2건) | 10,689자 |
| `docs/history/history-11.md` | 34차 #141 2026-09-10  →  견적 폼 배지 옐로 #145 2026-09-11   (3건) | 31,233자 |
| `docs/history/history-12.md` | 차수 없음 35차 착수 전 입력 정리 2026-09-11  →  35차 #146 2026-09-14   (2건) | 16,831자 |
| `docs/history/history-13.md` | 랜딩 히어로 계정 신청 #147 2026-09-14  →  36차 A·B장 #150 2026-09-15   (5건) | 34,911자 |
| `docs/history/history-14.md` | 36차 PR 2 #151 2026-09-15  →  월정산 묶음 개편 #154 2026-09-15   (5건) | 31,512자 |
| `docs/history/history-15.md` | 추가 수정 6건 + 리뷰 2건 2026-09-15  →  문서 정합 정리 4차 2026-09-16   (3건) | 22,892자 |
| `docs/history/history-16.md` | 24시콜 v4 차수 변경 반영 2026-09-16  →  알림 4건 #162 2026-09-16   (5건) | 40,559자 |
| `docs/history/history-17.md` | 견적번호 중복 #163 2026-09-16  →  39차 견적문의 폼 정합 #165 2026-09-16   (3건) | 19,324자 |
| `docs/history/history-18.md` | 39차 D장 주소칸 #166 2026-09-16  →  목록 기간 「직접지정」 #168 2026-09-17   (3건) | 22,727자 |
| `docs/history/history-19.md` | 랜딩 히어로 사진·헤더 로고 #169 2026-09-17  →  배차 취소 · 문제발생 사유 #171 2026-09-17   (3건) | 24,379자 |
| `docs/history/history-20.md` | 공지사항 간이 서식 #174 2026-09-17  →  배차취소 후속 #172 2026-09-17   (3건) | 30,001자 |
| `docs/history/history-21.md` | 이용가이드 재작성 #175 2026-09-18  →  라보 운임 통일 #178 2026-09-18   (4건) | 33,587자 |
| `docs/history/current.md` | 견적관리 전화응대 매뉴얼 #179 2026-09-18  →  문자 2종 + 적립 이벤트 안내 페이지 #184 2026-09-23   (8건) | 68,103자 |
| `docs/history/roadmap-done.md` | **목록 1** — §5 로드맵의 완료된 차수 80건(27차 → 알림 4건 #162 2026-09-16) · **목록 2** — 완료된 **지시서** 차수 1차 → 31차 + 차수 없음 9건(5차 법적 문서 → 대표메일 교체 #116) | 124,961자 |
| `docs/history/summaries.md` | **§5 의 차수별 「이후 세션이 알아야 할 것만 요약」 46건** — 리워드 3차 #182  →  66차(맨 위 3건은 2026-09-23 에 옮긴 리워드 1·2·3차 · 맨 아래 3건은 담당자 정보 #121 · 약관 terms-v4 #133 · 66차 정정) | 140,447자 |
| `docs/history/features.md` | 완료된 주요 기능 전체 요약 · 0단계 사전 점검(9차 세션) | 57,382자 |

```bash
# 근거를 찾을 때는 루트와 아카이브를 함께 훑는다
grep -rn "PR #113" docs/history/ CLAUDE.md
```

🔴 **한쪽만 grep 하면 「없앴다」인지 「옮겨졌다」인지 구분되지 않습니다.**

---

## 1. 서비스 개요

**WeCarry 운송** — B2B 화물운송 주선업 통합 운영 시스템. 화주 CRM, 견적/배차/정산 관리,
화주포털, 완전공개 랜딩페이지·견적문의·화주등록신청까지 포함하는 풀스택 시스템.

## 2. 기술 스택 및 배포 구조

- **Next.js 14 (App Router)** + **Supabase (Postgres, Auth, Realtime)** + **Vercel** 배포
- GitHub 저장소: `ttang0825/b2b-cargo-system` (main 브랜치)
- 4중 구조:
  - `/admin/*` — 내부 관리자. **직원별 Supabase Auth 개별 계정 체계로 전환 완료**
    (`staff_accounts` 테이블, role=`admin`/`staff`, middleware.ts가 세션+재직상태 확인).
    공유 `ADMIN_PASSWORD` 방식은 더 이상 안 씀 (env var는 등록만 남아있고 코드에서 미사용)
  - `/customer/*` — 화주포털 (Supabase Auth 개별 계정 + RLS)
  - `/`, `/quote`, `/apply` + 법적 문서 3종(`/terms`·`/privacy`·`/email-policy`) —
    완전 공개(비회원). `/quote`·`/apply` 는 anon INSERT 전용이고 조회는 서버 API 로만.
    🔴 **`/status` 는 62차(PR #109)에 라우트·조회 API·처리방침 행까지 통째로 삭제됐다** —
    비회원 조회 경로는 이제 없다. **되살리지 말 것**(§5 「31차」 항목).
    ⚠️ **§3 원칙 3·11·34 에 남아 있는 `/status` 표기는 일부러 그대로 뒀다** — 그 원칙들이
    말하는 규칙 자체는 유효하고, 원칙 번호·본문을 건드리면 참조가 통째로 깨진다

### 환경변수 (Vercel)
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
`KAKAO_REST_API_KEY`. **보류 중(아직 미등록)**: `RESEND_API_KEY` (이메일 발송용 — 아래
6번 참고). `ADMIN_PASSWORD`는 예전 공유 비밀번호 로그인 방식의 흔적으로 Vercel엔 남아있지만
코드에서는 더 이상 참조하지 않음(직원 계정 재구조화로 대체됨).

### npm 의존성 중 특이사항
- `xlsx-js-style`(xlsx 아님! 스타일링 위해 교체함) — 화주포털 엑셀 다운로드용.
- `@supabase/ssr` — 관리자 개별 로그인(Supabase Auth 세션을 쿠키에 저장해서
  `middleware.ts`(서버)와 브라우저가 같은 세션을 공유) 구현에 사용. `lib/supabaseClient.ts`
  (anon, localStorage 기반 데이터 조회/수정용)와는 완전히 다른 용도라 섞어 쓰면 안 됨
  (원칙 24번 참고)

### 최근 추가된 컬럼 (Supabase SQL 편집기에서 수동으로 추가함, 코드 저장소엔 마이그레이션
파일이 없어 여기 기록)
- `customer_applications`: `industry`(업종, 자유텍스트), `preferred_regions`(이용지역,
  REGIONS 다중선택 콤마구분 문자열), `preferred_vehicle`(이용차량, VEHICLE_TYPES 단일값)
- `public_quote_requests`: `quote_id`(uuid, quotes 참조 — 견적전환 연결),
  `processed_by`(text, 답변 처리자 이름)
- `staff_accounts`(신규 테이블): `id`(uuid, Auth 유저 id와 동일), `name`, `email`,
  `role`(`admin`|`staff`), `status`(`active`|`inactive`), `created_at`. RLS: 본인 행은
  `auth.uid() = id`로 조회 가능 + `anon` 전체 조회 정책도 있음(관리자 화면에서 "처리자
  이름" 표시하려면 다른 직원 이름도 조회해야 해서)
- `companies`/`quotes`/`orders`/`dispatches`/`invoices`/`customer_applications`/
  `public_quote_requests` 7개 테이블에 `created_by`/`updated_by`(uuid,
  `staff_accounts(id)` 참조)/`updated_at`(자동 갱신 트리거) 추가 — 원칙 25번 참고
- `invoices.company_id`를 nullable로 변경 — 게스트(비회원) 고객 오더도 정산 등록이
  되도록 하기 위함 (예전엔 NOT NULL이라 게스트 오더는 정산 자동등록이 조용히 실패했음)
- `support_access_logs`(신규 테이블, 8단계): `staff_id`/`staff_name`,
  `company_id`/`company_name`, `customer_account_id`/`customer_email`, `accessed_at`.
  관리자가 화주포털 계정으로 "지원접속"할 때마다 기록. `public_quote_requests`와
  동일하게 anon 정책 없이 RLS만 켜둠 — 서버 API(`SUPABASE_SERVICE_ROLE_KEY`)로만
  읽고 씀
- `individual_customers`(신규 테이블): 비회원(개인) 고객을 전화번호 기준으로
  식별·누적 관리. `id`/`name`/`phone`/`phone_normalized`(하이픈 등 제거된 숫자만,
  unique index)/`email`/`memo`/`created_by`/`updated_by`/`created_at`/`updated_at`.
  `individual_customer_addresses`(신규 테이블, `customer_locations`와 동일한 패턴의
  주소 이력 연결 테이블): `individual_customer_id`/`address`/`location_type`/
  `created_at`. `orders`/`invoices`에 `individual_customer_id`(uuid,
  `individual_customers(id)` 참조) 컬럼 추가. 두 신규 테이블 모두 RLS는 켜되 anon
  전체허용 정책 적용(원칙 2번과 동일한 패턴 — admin이 anon key로 직접 접속하므로)
- `external_networks`(신규 테이블): 전국24시콜/원콜/화물맨 같은 외부 화물정보망
  목록. `id`/`name`/`is_active`/`sort_order`/`created_by`/`updated_by`. RLS는
  anon 전체허용(원칙 2번과 동일 패턴), 쓰기 권한은
  `app/api/admin/external-networks` 서버 API에서 관리자만 가능하도록 체크
- `dispatches.dispatch_status`의 기존 값 `배차대기`(실제로는 코드 어디서도
  할당되지 않던 죽은 상태값이었음)를 `접수중`으로 재활용해서 배차 프로세스에
  새로 도입 — 배차 등록은 항상 이 상태로 시작함. **주의**: `dispatch_status`
  컬럼에 이 값 목록만 허용하는 CHECK 제약조건(`dispatches_dispatch_status_check`)이
  걸려있어서, 상태값 목록을 코드에서 바꿀 때(`lib/dispatchStatusColors.ts`)는
  이 제약조건도 같이 갱신해야 함 — 한 번 빠뜨려서 배차 등록이 막힌 적 있음
- `dispatches`에 배정방식 관련 컬럼 추가: `assignment_type`(`internal`|`external`,
  기본값 `internal`), `requested_network_ids`(uuid 배열, 접수중 상태에서 선택한
  외부정보망 후보), `confirmed_network_id`(uuid, `external_networks(id)` 참조,
  `on delete set null`), `external_driver_name`/`external_driver_phone`/
  `external_vehicle_plate`(외부정보망을 통해 배정된 차주 정보 — 내부 `drivers`
  테이블에 없는 사람이라 자유텍스트로 저장)
- **상하차 방법 표준화**: `rate_surcharges`의 `상하차방식` 카테고리 옵션명을
  7개(기본운송/지게차/수작업/호이스트/크레인/컨베이어/협의필요)로 교체(기존
  1:1 매핑분은 금액 유지, 기사도움/1인수작업/2인수작업은 `수작업`으로 병합되며
  금액 0 초기화, 계단/엘리베이터는 범위 제외로 삭제). `quotes`/`orders`/
  `portal_order_requests`에 저장된 기존 상차·하차 조건 값도 새 이름으로 일괄
  변경. `public_quote_requests.loading_method`(단일 컬럼)를
  `pickup_loading_method`/`dropoff_loading_method` 2개로 분리 — **주의**:
  `quotes`는 상차/하차 조건이 `load_condition`/`unload_condition` 같은 별도
  컬럼이 아니라 `selected_options`(jsonb) 안에 `상차조건`/`하차조건` 한글 키로
  저장됨. `orders`/`portal_order_requests`는 반대로 진짜 flat 컬럼임 — 이
  차이를 몰라서 `quotes`용 마이그레이션 SQL을 잘못 썼다가 재작성한 적 있음
  (원칙 27번과 같은 이유로, 코드에서 실제 저장 방식부터 확인하는 습관 필요)
- **긴급여부 항목 폐지**: `quotes.selected_options`의 `긴급여부` 키,
  `portal_order_requests.urgency` 컬럼은 과거 데이터 보존을 위해 그대로 둠 —
  신규 저장부터만 이 값이 안 생기도록 화면·로직만 제거함. `rate_surcharges`의
  `긴급여부` 카테고리 행도 완전삭제 대신 화면단에서만 숨김
- **주소 입력 통일화 + 광역권/시군구 자동기입**: `components/AddressSearch.tsx`
  (도로명주소 검색+상세주소 공용 컴포넌트) + `lib/useDaumPostcode.ts`(스크립트
  로드 공용 훅) 신규 — `/quote`·`/apply`·`admin/quotes`·`customer/request`에
  각자 구현되어 있던 다음 주소검색을 이 컴포넌트로 통일 교체, `admin/orders`·
  `admin/orders/[id]`·`admin/companies/[id]`(저장된 주소)·`customer/locations`
  (화주포털 배송지)는 기존에 주소검색 없이 텍스트 직접입력만 가능했던 곳이라
  이번에 신규로 적용함. 다음 주소검색 응답의 `sido`/`sigungu`를 함께 저장하도록
  `companies`(`main_pickup_address`/`main_pickup_sido`/`main_pickup_sigungu`/
  `main_dropoff_*` 3종 신규 — 기존 `main_pickup_region`/`main_dropoff_region`
  체크박스 필드와는 별개로 유지), `customer_locations`, `quotes`, `orders`,
  `public_quote_requests`, `customer_applications`(`main_origin`/
  `main_destination`은 이미 있던 컬럼, sido/sigungu만 신규), `portal_order_requests`
  (스펙 원문엔 없었지만 화면이 AddressSearch로 바뀌는 대상이라 함께 추가),
  `individual_customer_addresses`에 `sido`/`sigungu` 컬럼 추가. **DB 마이그레이션은
  코드와 별개로 사용자가 Supabase SQL 편집기에서 직접 실행해야 함** (§8
  "Claude Code로 넘어가면서 참고할 것" 관례 그대로 — 이 세션에서 SQL 파일을 전달함,
  사용자가 실행 후 8개 테이블 30개 컬럼 전부 생성된 것 확인 완료). 상세주소는
  다른 화면들과 동일하게 별도 컬럼 없이 저장 직전
  도로명주소와 합쳐서 하나의 문자열로 저장(`fullOrigin` 패턴). 화주등록신청 승인
  시(`approve-application/route.ts`) `customer_applications.main_origin`/
  `main_destination`(+sido/sigungu)을 `companies.main_pickup_*`/`main_dropoff_*`에
  매핑하고, `customer_locations`에도 상차지/하차지로 각 1건씩 자동 생성(동일
  주소+타입 조합이 이미 있으면 중복 생성 안 함)
- **운임 정산방식(`settlement_type`)**: `quotes`/`orders`/`dispatches`/`invoices`
  4개 테이블에 `settlement_type text default 'general'`(값:
  `general`/`prepaid`/`postpaid_cod`/`monthly`/`network`, check 제약 4개 테이블
  동일)을 견적 단계 최초 선택 → 오더 → 배차 → 정산까지 승계되는 기준 필드로 추가.
  `settlement_type_change_logs`(신규 테이블: target_table/target_id/before_type/
  after_type/reason/changed_by) — 확정 이후 변경 시 사유를 기록. RLS는 원칙 2번과
  동일하게 anon 전체허용(이 필드를 바꾸는 화면들이 전부 anon 클라이언트로 직접
  쓰는 기존 오더/배차/정산 화면들이라 일관성 유지). `lib/constants.ts`의
  `SETTLEMENT_TYPES`(원칙 39번)가 유일한 정의처
- **차주 수금/지급 운임 표시 구조**: `dispatches`에 `driver_base_fare`(차주
  기본운임)/`driver_vat_included`(부가세 포함여부, 기본 true)/
  `industrial_insurance_applicable`(산재보험료 적용대상 여부, 기본 true,
  3차 세션 보정에서 `industrial_insurance_included`에서 rename — 아래
  참고)/`industrial_insurance_rate`(계산 시점에 실제 적용된 요율%의 스냅샷,
  더 이상 사용자가 직접 입력하지 않음) 컬럼 신규. **주의**: 작업지시서 원안은
  최종 계산 총액을 담을 `driver_total_payout` 컬럼도 신규로 만드는 것이었으나,
  `dispatches`에 이미 이 용도로 쓰이던 `driver_payout`(차주 지급운임, 배차
  등록/목록/상세/정산 자동등록 전체에서 사용 중) 컬럼이 있어서 원칙 27번
  지침대로 새로 만들지 않고 그 컬럼을 그대로 재사용함(계산기 저장 시 이
  컬럼에 최종값을 덮어씀). "주선사 마진"은 `dispatches.margin`이라는 기존
  컬럼이 있길래 처음엔 이것도 재사용하려 했으나, 실제로 값을 넣어보니
  PostgreSQL 생성 컬럼(generated column — `customer_charge - driver_payout`
  자동계산)이라 직접 UPDATE가 안 되는 걸 뒤늦게 발견함(`column "margin" can
  only be updated to DEFAULT` 에러) — 그냥 `driver_payout`만 갱신하고
  `margin`은 DB가 알아서 재계산하도록 둠(별도 저장 코드 없음, 배차 목록의
  "마진"/"마진율" 컬럼은 이 DB `margin` 값 기준 — 아래 3차 세션 보정에서
  도입된 "실질마진(정산기준)"과는 다른 값)
- **차주 수금/지급 운임 표시 구조 — 3차 세션 보정(산재보험료 계산 로직
  수정)**: 3차 세션에서 처음 구현했던 "산재보험료 포함/별도 토글 + 임의
  요율 직접입력" 방식이 실제 제도(화물차주 '노무제공자' 산재보험 — 주선사·
  차주 절반씩(50%) 공동부담, 차주부담분은 원천징수)와 다르다는 게 확인되어
  계산 로직을 교체함. `dispatches`에 `industrial_insurance_base_amount`
  (월보수액)/`industrial_insurance_driver_share`(차주부담분, 원천징수액)/
  `industrial_insurance_broker_share`(주선사부담분, 비용) 3개 컬럼과
  `customer_charge_vat_included`(화주청구금액 부가세 포함여부, 기본 false —
  실질마진을 공급가액 기준으로 계산하려면 필요) 컬럼 신규 추가. 필요경비공제율
  (기본 49.9%)/산재보험료율 총계(기본 1.76%)는 고용노동부가 매년 재고시하는
  값이라 코드에 하드코딩하지 않고 신규 테이블 `insurance_rate_settings`
  (관리자가 운임기준표 화면의 "산재보험료 요율" 탭에서 수정 가능, 원칙 40번 —
  최초엔 `/admin/settings/insurance-rate` 독립 경로였으나 4차 세션에서
  운임기준표 화면 탭으로 이동, 아래 참고)에서
  가장 최근 1행을 읽어서 계산. 사전확인 결과 이 구조를 실사용한 배차 건이
  0건이라(3차 세션 배포 이후 얼마 안 돼서 바로 보정) 기존 데이터 재계산 없이
  바로 구조를 교체함. `lib/settlementCalc.ts`(공급가액 환산/산재보험료
  계산/차주 최종 수금액/실질마진 계산, 6차 세션에서 추가비 반영 예정 주석
  포함)가 유일한 계산 로직처. 배차 상세 "정산 정보"의 "단순마진(참고)"(기존
  DB `margin` 기준)과 "실질마진(정산기준)"(신규, 공급가액 기준+주선사부담
  산재보험료 반영)은 서로 다른 값이므로 화면에서 라벨로 명확히 구분함
- **차주 수금/지급 운임 표시 구조 — 3차 세션 보정 PR 리뷰 라운드**: PR #47
  실사용 테스트 중 나온 피드백을 반영해 세부 조정함. (1) `customer_charge_vat_included`/
  `driver_vat_included` 기본값을 true→false(체크해제)로 변경(DB 컬럼
  default도 함께 변경, 기존 저장값도 일괄 리셋 — 실사용 0건 확인 후 진행).
  (2) 배차 등록/상세의 청구운임·지급운임·차주 기본운임 입력창에 1,000단위
  콤마가 보이도록 `components/MoneyInput.tsx`(값은 순수 숫자 문자열로 관리,
  화면 표시만 콤마 포맷) 신규 — `<input type="number">`는 콤마 표시가
  불가능해서 `type="text"` 기반으로 교체. (3) `invoices`에도
  `customer_charge_vat_included`/`driver_vat_included` 컬럼 추가 —
  배차에서 자동/수동 정산등록 시 승계, 정산관리 목록·상세에 청구금액/
  지급금액 아래 "부가세 포함"/"부가세 별도" 캡션으로 표시. **버그**: 계산기의
  "부가세 포함" 토글은 입력값 해석 방식만 나타낼 뿐, 계산된 `driver_payout`은
  토글 상태와 무관하게 항상 부가세 포함 금액으로 산출되는데(공급가액 계산 후
  부가세를 가산하는 계산식 구조상), 정산관리로 값을 넘길 때 이 결과 금액이
  아니라 입력용 토글을 그대로 복사해서 "부가세 별도"로 잘못 표시되던 문제
  발견·수정 — 계산기를 거친 금액(`driver_base_fare`가 있는 배차)은 항상
  "포함"으로 고정. (4) 정산관리 목록 레이아웃 정리 — 정산월~상태 컬럼은
  `whiteSpace: nowrap`으로 한 줄 고정, 정산방식 배지는 CSS auto-wrap 대신
  라벨의 "/" 위치에서 명시적으로 한 번만 줄바꿈("일반오더/주선사정산"만
  2줄, 나머지는 한 줄)
- **혼적 옵션(4차 세션)**: 동의·할인조건은 견적 단계에서 1회만 수집하고,
  배차 단계는 "실제 혼적됐는지" 실행여부 플래그 1개로 단순화하는 구조.
  `quotes`/`orders`에 각각 `loading_type`(`exclusive`|`mixable`, 기본
  `exclusive`)/`mixed_shipper_consent`(화주동의여부)/`mixed_discount_type`
  (`amount`|`percent`|null)/`mixed_discount_amount`/`mixed_discount_percent`/
  `mixed_note`(주의사항) 동일 6개 컬럼 신규(오더는 견적에서 그대로 승계),
  `dispatches`에는 `mixed_executed`(boolean, 기본 false) 1개만 신규. 혼적
  할인 중 **율(%) 방식만** 회사 자체 정책 기본값을 두는 신규 테이블
  `mixed_loading_discount_settings`(`standard_discount_percent`, 원칙
  40번과 동일한 관리자 수정 가능 단일값 설정 테이블 패턴이나 정부 고시값이
  아니라 회사 정책값이라는 점만 다름 — `/admin/rates` "가산기준" 탭에서
  수정)를 두고, 견적에서 "혼적가능"+"할인유형: 율" 선택 시 이 값을 입력창
  기본값으로만 채움(담당자가 건별 수정 가능, 저장되는 값이 아님). 금액(정액)
  방식은 거리·중량마다 달라지는 게 당연해서 표준값 없이 항상 수동 입력만
  지원. `lib/settlementCalc.ts`의 `applyMixedDiscount()`/`reverseMixedDiscount()`
  (역연산)가 유일한 할인 계산 로직 — `loading_type==='mixable' && mixed_executed`일
  때만 할인이 적용되고, 독차로 실제 운행됐으면(`mixed_executed=false`) 할인
  미적용. **PR #49 실사용 피드백으로 방식 변경**: 최초 구현은 배차의
  화주 청구운임 입력값은 그대로 두고 마진 계산·정산 등록에만 할인 반영
  금액을 몰래 대입하는 방식이었으나, "체크해도 청구운임 숫자 자체가 안
  바뀐다"는 피드백에 따라 **"혼적 실행" 체크박스 자체가 화주 청구운임
  값을 직접 갱신**하도록 변경함 — 체크 시 `applyMixedDiscount()`로 할인을
  차감해 `dispatches.customer_charge`에 바로 저장, 체크 해제 시
  `reverseMixedDiscount()`로 역산해 원래 금액으로 되돌림. 이후 마진
  계산·정산(invoices) 자동/수동 등록은 이 값을 그대로 사용(별도 변환 없음).
  **7차 세션에서 이 문단 전체가 다시 대체됨** — `dispatches.mixed_executed`
  컬럼과 "혼적 실행" 체크박스 자체가 완전히 삭제되고, 대신 운송오더/배차
  목록·상세에 "혼적가능" 배지를 표시하는 방식으로 교체됨. 아래 section 4
  "배차정산정보 단순화 + 혼적가능 표시 개선(v2)" 참고 — 이 항목이 최신 동작 기준.
  🔴 **`mixed_loading_discount_settings` 는 2026-09-09 에 단일 행이 아니라 거리
  3구간이 됐다**(`distance_label`/`distance_to_km` 신설, 3행) —
  위 "단일값 설정 테이블" 설명은 그때까지의 것이다. 한 행만 읽는 헬퍼를 다시
  만들지 말 것(자세한 것은 §5 로드맵의 「운임기준표 v11 B장」).
  🔴 **지금 값은 20 / 35 / 55 다**(DB 실측 2026-09-11 · `verify` ⑩-e).
  ⚠️ **한동안 「15/35/55」로 적혀 있었다** — PR #136 마이그레이션이 15 로 넣었고
  그 뒤 담당자가 `/admin/rates` 에서 30km 구간만 20 으로 올렸다(세 행의
  `updated_at` 이 같고 `updated_by` 가 직원 계정이다). 🔴 **마이그레이션 파일의
  15 를 근거로 되돌리지 말 것 — DB 가 정본이다.**

## 3. 핵심 설계 원칙 (반드시 유지할 것)

1. **admin/customer는 반드시 별도 Supabase 클라이언트** (`lib/supabaseClient.ts` vs
   `lib/supabaseCustomerClient.ts`) — 세션 충돌 방지
2. **RLS 기본**: `companies/quotes/orders/dispatches/invoices` 등 핵심 테이블은
   anon 전체허용(admin이 anon key로 접속하는 구조라서) + authenticated는 본인 회사만
3. **완전공개(비회원) 테이블**(`public_quote_requests`, `customer_applications`)은
   전혀 다른 패턴: **anon INSERT 전용, SELECT 정책 없음.** 관리자 조회·처리는 반드시
   `SUPABASE_SERVICE_ROLE_KEY`를 쓰는 서버 API 라우트(`app/api/admin/*`)를 통해서만.
   방문자 본인 조회(`/status`)도 전화번호로 필터링하는 서버 API를 통해서만 — RLS로
   anon SELECT를 여는 방식은 금지 (다른 사람 정보가 다 보이게 됨)
4. **이 anon-locked 테이블들은 Realtime 구독이 안 됨** (RLS가 realtime broadcast도
   막음). 대신 관리자 화면에서 **15초 폴링**으로 사실상 실시간처럼 보이게 처리함
   (`setInterval` 패턴, `TopNav.tsx`와 각 관리 화면에 이미 구현됨)
5. Realtime 쓰는 새 테이블은 **반드시 `supabase_realtime` publication 등록 확인**
   (`ALTER PUBLICATION supabase_realtime ADD TABLE ...`) — 빠뜨리면 조용히 안 됨
   (announcements 테이블에서 실제로 겪은 버그)
6. **상하차 일시 규칙**: 하차일시는 상차일시보다 최소간격 이후만 선택 가능하고,
   `components/DateTimePicker.tsx`의 `minDateTime`/`minDateTimeLabel` prop으로 구현한다.
   ⚠️ **이 원칙은 오래 낡아 있었고 36차 D장에 실측해서 다시 썼다.**
   ```
     견적 관리(등록·수정)   상차 +30분   🔴 36차 D장에 거리기반(2~5h)에서 바뀌었다
     화주포털 발주요청       상차 +30분   ⚠️ 원칙이 「2시간」이라 적고 있었지만 실제로는
                                        25차 PR #103 리뷰 8번에 이미 30분이었다
     운송오더(등록·상세)     상차 +30분   🔴 **PR #153 에 2시간에서 바뀌었다**(사용자 지시
                                        *"통일되게 30분으로"*). ⚠️ **상세에는 하한이
                                        아예 없었다** — 그때 같이 걸었다
   ```
   🔴 **다섯 화면이 `lib/dropoffGap.ts` 한 정의처를 쓴다** — 화면에 숫자를 다시
   적지 말 것(그래서 갈렸었다). ⚠️ **한동안 「운송오더 +2시간 🟢 안 바꿨다」로 적혀
   있었다** — 그 줄을 근거로 되돌리지 말 것. 🔴 **`calcMinGapHours()`(거리기반)를 되살리지 말 것** —
   10km 건에도 2시간이 강제돼 실제 도착 시각보다 뒤로만 적을 수 있었다.
   🔴 **당착·내착은 예외다**(27차) — 시각이 무관한 선택지라 규칙을 걸면 23:40 상차 건의
   접수가 막힌다. 그 판단은 화면이 한다.
   🟢 **「지금·당착·내착」 칩은 견적 2화면(36차 PR 2)과 운송오더 2화면(PR #153)에 있다** —
   공용 `components/DateTimePicker.tsx` 의 **opt-in prop** 이고 **기본값이 전부 꺼짐**이라
   랜딩 폼은 안 바뀐다. 🔴 **기본값을 켜지 말 것.** ⚠️ 36차 요약이 「운송오더 2화면이
   같은 부품을 쓰니 켜지 말 것」이라 적었는데 **그 화면들은 PR #153 에 켜기로 확정됐다** —
   금지의 대상은 **랜딩 폼**이다.
   🔴 **`quotes` 에는 여전히 도착구분 컬럼이 없다**(28차 결정) — 값은 특이사항 한 줄로
   이어지고 문구·중복 판정은 `lib/arrivalType.ts` 하나가 한다(`arrivalNoteLine` /
   `buildNotesWithArrival`). 자리 채움 시각 `"23:59"` 도 그 파일이 정의처다.
   ⚠️ **상차일시 하한은 견적 관리에 없다** — 35차가 *"지나간 날짜도 고를 수 있어야 한다"*로
   확정했다(끝난 운송을 뒤늦게 입력하는 일이 있다). 🔴 **「현재시각 이후만」으로 되돌리지
   말 것.** 🟢 **안내 문구는 36차 PR 2 에 고쳤다** — 「현재 시각 이후로만
   선택 가능합니다」라고 적고 있었지만 **하한이 걸려 있지 않았다.** 지금은 「지난 날짜도
   고를 수 있습니다 (완료된 운송 입력)」다. 🔴 **그 문구를 근거로 `minDateTime` 을 새로
   붙이지 말 것** — 붙이면 35차 확정이 뒤집힌다.
7. **견적 관리 폼 필드 순서는 전화상담 흐름 고정**: 고객구분 → 품목/물품특성 → 톤수 →
   출발지/도착지 → 거리 → 희망 상차/하차일시 → 운송시간(상차일시 기준
   자동추천) → 왕복/편도 → 상차조건/하차조건 → 차량형태 → 대기시간/경유지수 → 특이사항

   단, `긴급여부`는 화면·신규 저장 로직에서 제거된 항목이며, 과거 데이터 보존용 값만 유지한다.
8. **엑셀 내보내기는 `lib/exportExcel.ts` 공용 함수만 사용** (`exportRowsToExcel`,
   `exportMultiSheetExcel`, `buildExportFilename`). 헤더 스타일(굵게+옐로우 배경)+
   1행 틀고정 자동 적용됨. **`xlsx`가 아니라 `xlsx-js-style` import 필수**
9. **화주 개인정보는 계정별로 분리 저장** — `customer_accounts`(계정 개인정보:
   name/contact_position/contact_mobile/email) vs `companies`(회사 대표정보,
   관리자가 관리). 여러 포털 계정이 있는 화주도 서로 안 덮어씀
10. **탭 제목(metadata)은 각 세그먼트 `layout.tsx`에서 관리.** 클라이언트 컴포넌트는
    metadata export 불가 → 얇은 서버 레이아웃이 클라이언트 컴포넌트를 감싸는 패턴
    (`app/customer/layout.tsx` → `CustomerPortalShell.tsx` 참고)
11. **새 공개 경로(admin도 customer도 아닌 최상위 경로)를 추가하면 반드시
    `components/TopNav.tsx`의 숨김 조건에도 추가할 것** — 안 그러면 관리자 메뉴가
    그 공개 페이지 위에 얹혀서 나타남 (실제로 여러 번 겪은 버그: `/`, `/quote`,
    `/apply`, `/status` 전부 이 조건에 등록되어 있어야 함)
12. **비밀번호 입력창은 `components/PasswordInput.tsx`(표시/숨김 토글) 재사용**
13. **표/카드가 있는 화면은 데스크탑 `<table>`과 모바일 카드가 완전히 별개 JSX** —
    컬럼 추가할 때 양쪽 다 챙길 것 (화주포털 페이지들, `.desktop-only`/`.mobile-only`
    클래스로 전환)
14. **관리자 메뉴는 3개 그룹 드롭다운 구조**: 화주 확보(화주관리·화주신청·공개문의·개인고객) /
    화주 관리(활성화주CRM·화주요청·**리워드 관리**·포털계정정리) /
    운송 운영(견적·오더·**배차·정산·차주**·외부정보망·**운임기준표**).
    새 관리자 메뉴 추가 시 `TopNav.tsx`의 `NAV_GROUPS`에 적절한 그룹으로 넣을 것.
    ⚠️ **운송 운영 순서가 두 번 바뀌었다.** 35차 리뷰 4라운드에 차주가 정산 아래로
    갔고(PR #146 `1d0b14b`, 사용자 지시 *"차주관리는 정산관리 아래에 위치하게"*),
    **36차 리뷰 2라운드에 운임기준표가 맨 위 → 맨 아래로** 갔다(PR #150, 사용자 지시
    *"상단메뉴 운송운영 드롭다운 메뉴에서 「운임기준표」가 제일 아래로 가게 설정"*).
    날마다 쓰는 화면이 아니라 값을 고칠 때만 여는 설정이라 운송 흐름 넷을 위로 올린 것이다.
    🔴 **이 원칙 본문이 한동안 옛 순서를 적고 있었다** — 코드를 고칠 때 여기도 같이 고칠 것
    (원칙이 코드와 어긋나면 다음 세션이 원칙을 근거로 되돌린다).
    🔴 **그리고 `HANDOFF.md` §3 화면 구성도 같이 고칠 것** — 35차가 이 원칙은 고쳤는데
    HANDOFF 가 그 「여기」에 안 들어가서 **두 문서가 갈렸다**(2026-09-14 문서 정합 3차에
    발견·수정). 메뉴는 **두 곳에 적혀 있다**는 것을 잊지 말 것.
    🔴 **상단바는 36차부터 `sticky` 라 그 아래에서 `sticky` 를 쓰면 가려진다** —
    새로 쓰는 곳은 `top` 에 **`var(--admin-topnav-h)`**(globals.css · 데스크탑 79px ·
    ≤700px 71px)를 더할 것. 36차 PR 2 가 견적 계산창에서 실제로 겪었다(59px 가림).
    🔴 숫자를 화면마다 적지 말 것 · 🔴 `.top-nav-inner` 의 여백이나 로고 크기를 바꾸면
    **그 변수도 다시 잴 것**
15. **관리자 화면의 알림 배지는 항상 같은 폭을 차지하도록 `visibility` 토글 방식**
    사용 (조건부 렌더링 금지) — 배지 유무로 메뉴 레이아웃이 밀리는 버그 방지.
    `components/NavCountBadge.tsx`가 이 패턴의 공용 구현체(관리자 TopNav +
    화주포털 `CustomerPortalShell.tsx` 둘 다 재사용) — 새로운 메뉴 배지가
    필요하면 새로 만들지 말고 이 컴포넌트를 가져다 쓸 것
16. **거절/보류 처리에는 표준화된 사유 드롭다운**이 있음
    (`components/ApplicationDetailModal.tsx`의 `REJECT_REASONS`/`HOLD_REASONS`) —
    새로운 사유가 필요하면 이 배열에 추가
17. **Daum 주소검색으로 채워지는 입력창엔 반드시 `autoComplete="off"`** — 브라우저
    자체 자동완성 드롭다운이 뜨면서 입력창에 위/양옆만 테두리가 생기는(아래는 안
    생기는) 버그가 있었음. `quote`/`apply`/`customer/request`/`admin/quotes`의
    출발지·도착지 입력에 전부 적용되어 있음, 새로 주소검색 입력창 만들 때도 반드시
    추가할 것
18. **목록+상세모달 패턴**: 목록에 모든 필드를 다 넣지 말고 핵심 컬럼만(옆스크롤
    없이) 보여준 뒤, 행 클릭 시 별도 모달 컴포넌트에서 전체 정보+처리 버튼을 다루는
    구조. `components/ApplicationDetailModal.tsx`가 참고 예시 (화주등록신청 화면에
    적용됨) — 비슷한 화면 만들 때 이 패턴 재사용
19. **회사(`companies`)나 포털 계정을 삭제할 때는 연결된 Supabase Auth 유저도 반드시
    명시적으로 같이 삭제할 것** — DB 행만 지우면 Auth 쪽 계정이 고아로 남아서, 같은
    이메일로 나중에 재가입할 때 "이미 등록된 이메일" 오류가 남 (Auth는 DB FK cascade
    범위 밖이라 자동으로 안 지워짐). 회사 삭제는 `app/api/admin/delete-company/route.ts`,
    개별 계정 삭제는 `app/api/admin/delete-portal-account/route.ts` 참고. 이미 생긴
    고아 계정은 `/admin/account-cleanup`에서 이메일로 검색해서 정리 가능
20. **상단메뉴 드롭다운은 열려있는 상태에서 바깥 빈 곳을 클릭하면 닫히게** 되어 있음
    (`document`에 `mousedown` 리스너, `TopNav.tsx`·`CustomerPortalShell.tsx` 둘 다
    적용) — 새로운 드롭다운 UI 만들 때도 이 패턴 재사용
21. **서비스롤 GET API 라우트는 `export const dynamic = "force-dynamic"` 과
    `lib/supabaseServiceClient.ts` 의 `createServiceClient()` 가 **둘 다** 필요하다.**
    🔴 **`force-dynamic` 만으로는 안 막힌다** — 그 지시자는 *라우트 렌더링*만 동적으로
    만들 뿐이고, 라우트 안에서 **supabase-js 가 내부적으로 쓰는 `fetch` 는 그대로
    Next 의 Data Cache 를 탄다.** 55차에 프로덕션 빌드로 재현했다 — DB 를 4종에서
    20종으로 바꾸고 서버를 재시작하지 않았더니 API 가 **세 번 연속 4종**을 내려줬다.
    `createServiceClient()` 가 `global.fetch` 에 `cache: "no-store"` 를 주입해서
    막는다(서비스롤 GET 라우트 11개 전환 완료). 클라이언트에서 그 API 를 부를 때도
    `fetch(url, { cache: "no-store" })` 를 붙일 것.
    ⚠️ **이 원칙은 55차 이전에 "force-dynamic 만 붙이면 된다"로 적혀 있었고 그게
    틀렸다** — 그 시절에 만든 라우트는 전부 이 버그를 갖고 있었다(문자 이력·직원
    목록·공개문의·대시보드가 저장 직후 옛 값을 보여줄 수 있는 상태였다).
22. **anon-locked 테이블(`public_quote_requests`, `customer_applications`)을 anon
    클라이언트로 직접 SELECT하면 에러 없이 조용히 빈 결과만 돌아옴** (RLS가 막지만
    에러를 던지지 않음) — admin 쪽 어느 컴포넌트에서든 이 테이블을 조회할 땐 예외
    없이 서버 API(`SUPABASE_SERVICE_ROLE_KEY`)를 거칠 것. 실제로 견적전환 프리필
    기능에서 이 실수로 데이터가 하나도 안 채워지는 버그가 있었음 (원칙 3번 위반 시
    증상이 바로 이렇게 나타남 — 참고용으로 기록)
23. **알림 배지를 즉시 갱신해야 하면 `lib/notifyBadgeRefresh.ts`의
    `notifyBadgeRefresh()`를 처리 완료 시점에 호출할 것** — anon-locked 테이블은
    Realtime이 안 돼서 `TopNav.tsx`가 15초 폴링에만 의존하는데, 이 함수를 호출하면
    폴링을 기다리지 않고 바로 배지를 재조회함. 새로운 처리 액션(승인/거절/답변저장
    등)을 추가할 때도 이 호출을 빠뜨리지 말 것
24. **관리자 로그인/로그아웃은 `lib/supabaseAdminAuthClient.ts`(`supabaseAdminAuth`)
    로만 부를 것.** ⚠️ **19차(50차 세션)에 이 원칙의 전제가 바뀌었다** — 그전에는
    `lib/supabaseClient.ts`가 anon·localStorage라 "절대 섞지 말 것"이었지만, 지금은
    **둘 다 `createBrowserClient`(쿠키 세션)이고 브라우저에서 모듈 싱글턴이라 같은
    인스턴스**다. 그래도 이름은 갈라 둔다 — 이름이 곧 용도 표시라 데이터 조회 코드에서
    `auth`를 만지지 않게 막아준다. "지금 로그인한 직원이 누구/무슨 role인지" 필요할 때는
    새로 만들지 말고 기존 헬퍼 재사용: 클라이언트 컴포넌트는 `lib/currentStaff.ts`의
    `getCurrentStaffId()`(id만)/`getCurrentStaffRole()`(role만, "admin"|"staff"|null),
    서버 API 라우트는 `lib/getCurrentStaff.ts`의 `getCurrentStaff()`(id+name+role+status,
    쿠키 기반)
25. **직원 계정 관련 권한/이력 체크는 반드시 "화면단 + 서버단" 이중 체크**: 화면에서
    버튼을 숨기거나 비활성화하는 것만으로는 브라우저 콘솔에서 직접 fetch를 호출해
    우회할 수 있음. 삭제·운임기준표 수정처럼 관리자 전용이어야 하는 기능은 반드시
    서버 API 라우트에서도 `getCurrentStaff().role === "admin"` 확인 후에만 처리하도록
    구현할 것 (`app/api/admin/delete-record/route.ts`, `app/api/admin/rates/route.ts`,
    `app/api/admin/staff/route.ts`가 이 패턴의 예시). 등록/수정 시 처리자를 자동 기록할
    때도 마찬가지로 클라이언트 컴포넌트는 `getCurrentStaffId()`로 `created_by`/
    `updated_by`를 채우고, 화면에는 `components/ProcessedByFooter.tsx`로 "등록: 이름
    (날짜) · 최종수정: 이름 (날짜)"를 표시
26. **여러 화면의 단순 레코드 삭제는 `app/api/admin/delete-record/route.ts` 공용
    API를 거칠 것** (`{ table, id }` POST, 허용된 테이블 목록으로 제한) — 매번 새
    라우트를 만들지 않아도 되고, 관리자 권한 체크가 한 곳에 모여있어 빠뜨릴 위험이
    적음. 화주(`delete-company`)나 포털계정(`delete-portal-account`)처럼 Auth 유저
    정리 등 부가 로직이 필요한 삭제는 기존처럼 전용 라우트를 쓰되, 그 라우트 안에도
    반드시 관리자 체크를 넣을 것
27. **`alter table X add column if not exists Y ... references Z(id)`는 컬럼이
    이미 존재하면 REFERENCES 절이 조용히 무시됨** — 예전부터 남아있던 레거시 컬럼이
    있으면 새 마이그레이션의 외래키가 실제로는 안 걸려서, 엉뚱한 테이블을 참조하는
    옛날 제약조건이 그대로 남는 버그가 생김 (실제로 `quotes.created_by`가 안 쓰던
    `profiles` 테이블을 참조하고 있어서 `created_by` 자동기록 기능이 FK 위반으로
    막혔던 사고 있었음). 새 컬럼을 추가하는 마이그레이션을 쓰기 전에는 `select
    column_name, data_type from information_schema.columns where table_name = '...'`
    로 그 컬럼이 이미 있는지, `select conname, pg_get_constraintdef(oid) from
    pg_constraint where conname = '..._fkey'`로 기존 제약조건이 뭘 참조하는지 먼저
    확인하는 습관을 들일 것
28. **여러 필드를 한 번에 수정하는 "정보 수정" 폼이 있는 상세화면(화주/오더/배차/
    정산)은 `lib/optimisticUpdate.ts`의 `optimisticUpdate()`로 저장할 것** — 내가
    불러온 시점의 `updated_at`과 실제 DB의 `updated_at`이 다르면(그 사이 다른 직원이
    먼저 저장함) 조용히 덮어쓰지 않고 `components/ConflictWarning.tsx`로 경고 +
    새로고침/그래도 덮어쓰기 선택지를 보여줌. 상태값 하나만 바꾸는 단순 드롭다운
    (예: 견적 상태변경)에는 굳이 적용 안 해도 됨 — 여러 필드를 동시에 편집하는
    화면 위주로 적용
29. **Supabase magic link로 임시 로그인(관리자 지원접속 등)을 구현할 때는
    `admin.auth.admin.generateLink({ type: "magiclink", email })`로 받은
    `properties.hashed_token`을, 클라이언트에서 `auth.verifyOtp({ token_hash, type:
    "magiclink" })`로만 검증할 것 — `email`을 같이 넘기면 "Only the token_hash and
    type should be provided" 에러로 검증이 항상 실패함** (실제로 8단계 지원접속
    기능에서 이 실수로 접속이 전혀 안 되는 버그가 있었음). `app/api/admin/
    support-login/route.ts` + `app/customer/support-verify/page.tsx`가 참고 예시
30. **"본인 계정 정보 수정"처럼 role 상관없이 누구나 접근 가능해야 하는 API는, 수정
    대상 id를 클라이언트가 아니라 반드시 서버에서 `getCurrentStaff()`로 직접 구해서
    사용할 것** — 클라이언트가 `{ id, name }`처럼 id를 같이 보내는 방식은 브라우저
    콘솔에서 다른 직원의 id로 바꿔 보내면 그 사람 정보를 수정할 수 있는 권한 상승
    구멍이 생김. `app/api/admin/my-account/route.ts`가 참고 예시 — 요청 바디에서
    `name`만 받고, 어느 행을 수정할지는 쿠키 세션의 `currentStaff.id`로만 결정함
    (원칙 25번의 "화면단+서버단 이중체크"와는 별개로, role 무관 self-service API는
    애초에 대상 id 자체를 클라이언트 입력값으로 안 받는 방식으로 막을 것)
31. **앱 내부 경로로 이동하는 링크는 반드시 `next/link`의 `<Link href=...>`를 쓸 것 —
    순수 HTML `<a href="/admin/...">`을 쓰면 클라이언트 사이드 전환 대신 브라우저
    전체 새로고침(하드 리로드)이 발생함.** 실제로 `TopNav.tsx`의 드롭다운 메뉴
    항목 전부와 화주포털(`CustomerPortalShell.tsx`) 전체가 이 실수로 페이지
    이동마다 하드 리로드되고 있었고, 그 때문에 TopNav가 매번 처음부터 다시
    마운트되면서 로그인정보 조회가 끝나기 전까지 잠깐 기본값(권한 없음) 상태로
    보이는 깜빡임까지 생겼던 적이 있음(체감 성능 저하의 진짜 원인이었음 — 원칙
    24번 캐싱 최적화만으로는 해결이 안 됐던 이유). `tel:` 링크나 같은 페이지 안의
    `#해시` 앵커(`admin/guide`)처럼 원래 하드 네비게이션이 필요한 경우만 예외.
    새 링크를 추가할 때 `<a href=`로 시작하는 코드를 쓰고 있다면 내부 경로가
    아닌지 반드시 확인할 것
32. **`support_access_logs`처럼 순수 이력(로그) 목적의 테이블이 `companies`/
    `customer_accounts` 등 실제 데이터를 참조할 때는 FK에 `on delete set null`을
    걸고, 표시용 텍스트 스냅샷 컬럼(`company_name`/`customer_email`처럼)을 같이
    저장해둘 것** — `on delete` 옵션 없이(기본 RESTRICT) FK를 걸면, 원본이 삭제될
    때 이 로그 테이블이 참조를 잡고 있다는 이유만으로 업체/계정 삭제 자체가 막혀버림
    (실제로 겪은 버그: 지원접속 이력이 하나라도 있는 업체는 완전삭제가 FK 위반으로
    실패했음). 반대로 `orders`/`quotes`/`invoices`처럼 실제 업무 기록이 있는 테이블은
    이렇게 풀지 말 것 — 그 경우엔 삭제가 막히는 게 의도된 동작(화주 상세화면도
    삭제 전에 관련 견적/오더/정산 건수를 확인해서 있으면 완전삭제를 막고 "거래중단"
    상태변경을 안내함). "이 데이터가 지워질 때 삭제를 막아야 하는지 vs 로그만
    남기고 통과시켜야 하는지"를 테이블 성격에 따라 판단할 것
33. **삭제/저장 등 액션 실패 시 에러를 표시할 state는 페이지 최초 로딩 실패용
    state와 반드시 분리할 것** — 화주 상세화면(`companies/[id]/page.tsx`)이
    `handleDelete()` 실패 시 로딩 실패용 `error` state를 그대로 재사용하고 있어서,
    `if (error || !company) return <전체화면 에러>` 가드에 걸려 이미 불러온 상세
    화면 전체가 "정보를 불러오지 못했습니다"로 덮여버리는 버그가 있었음(개인고객
    상세화면에도 같은 패턴이 있어서 같이 수정함). 액션 실패는 항상 별도 state(예:
    `deleteError`/`actionError`)로 받아서 인라인 에러 배너로만 보여줄 것 — 이미
    로드된 화면 데이터를 오류 메시지로 통째로 덮어쓰면 안 됨
34. **저장/등록 폼(`<form onSubmit={...}>`)에는 `lib/preventEnterSubmit.ts`의
    `handleFormKeyDown`을 `onKeyDown`으로 붙일 것** — 입력 중 습관적으로 누르는
    Enter키가 브라우저 기본 동작으로 폼을 그대로 제출시켜서, 아직 다 작성하지 않은
    정보가 실수로 저장/등록되는 문제를 막기 위함(`textarea`는 줄바꿈 용도라 예외).
    다만 **로그인 폼**(Enter로 로그인은 일반적인 관례)과 **전화번호/이메일로
    조회하는 검색 폼**(`/status`, `/quote/status`, `/apply/status`,
    `/admin/account-cleanup` — 저장이 아니라 단순 조회라 Enter 실행이 자연스러움)은
    예외로 붙이지 않음. 새 등록/수정 폼을 추가할 때도 이 핸들러를 빠뜨리지 말 것
35. **전화번호를 입력받는 `<input>`은 예외 없이 `lib/constants.ts`의
    `formatPhoneNumber()`를 `onChange`에 물려서 입력 즉시 자동으로 하이픈(-)이
    표시되게 할 것** — 대부분의 화면(화주 대표번호, 담당자 연락처, 차주 연락처,
    공개 견적문의/화주등록신청 연락처 등)은 이미 적용되어 있었지만, 개인고객
    상세수정·운송오더/견적 등록의 "개인/신규 고객" 연락처 입력처럼 빠진 곳이
    있었음. 새로 전화번호 입력창을 추가할 때 빠뜨리지 말 것(검색용 입력창도
    사람이 눈으로 확인하기 편하도록 동일하게 적용 — 조회 로직은 어차피 숫자만
    비교하도록 정규화해서 비교하므로 하이픈이 있어도 조회에 지장 없음)
36. **원칙 28번(낙관적 잠금)을 쓰는 상세화면에서, 그 화면 안의 다른 "즉시 저장"
    액션(상태 드롭다운 변경, 체크박스 등)은 DB에 쓴 뒤 반드시 `load()`로 전체를
    다시 불러올 것 — 부분(payload 필드만) 병합으로 로컬 state를 갱신하고 넘어가면
    안 됨.** `updated_at`은 DB 트리거가 자동으로 갱신하는데, 로컬에 남은
    `updated_at`을 안 갱신한 채로 곧이어 낙관적 잠금 저장(`optimisticUpdate`)을
    실행하면 그 차이 때문에 "다른 직원이 방금 수정함"으로 잘못 판단해 경고가 뜸
    (실제로는 같은 사용자 본인이 방금 한 조작인데도). 배차 상세화면의 배차상태
    변경·상차/하차 완료 체크에서 실제로 겪은 버그 — 두 액션 모두 부분 병합을
    `load()` 호출로 바꿔서 해결함
37. **주소(도로명주소+상세주소)를 입력받는 화면은 예외 없이
    `components/AddressSearch.tsx` 공용 컴포넌트를 재사용할 것** — 원칙 12번
    (`PasswordInput`)과 같은 이유. 다음 주소검색 스크립트 로드는
    `lib/useDaumPostcode.ts` 훅이 대신 처리하므로 페이지에서 직접
    `<script id="daum-postcode-script">`를 붙이지 말 것. 이 컴포넌트는 검색으로
    주소를 채우면 `sido`/`sigungu`도 함께 콜백으로 넘겨주고 상세주소를 자동
    초기화함 — 직접 타이핑(수동 수정)한 경우엔 sido/sigungu를 알 수 없으므로
    빈 값으로 넘어오는 게 정상 동작. 상세주소는 별도 컬럼 없이 저장 직전
    도로명주소와 공백으로 합쳐서 하나의 문자열 컬럼에 저장하는 게 이 프로젝트
    전체의 기존 관례(`fullOrigin`/`fullDestination` 패턴) — 새 주소 필드를
    추가할 때도 이 패턴을 따르고, DB에 별도 "상세주소" 컬럼을 새로 만들지 말 것.
    ⚠️ **`customer_locations` 는 예외다** — 20차가 `address_detail` 을 이미 만들어 뒀고
    화주포털이 그 칸에 나눠 저장한다. 🔴 **그 표에 쓰는 코드에서 `fullOrigin` 식으로
    합치지 말 것**(2026-09-15 · 관리자 화주 상세가 실제로 합쳐 넣고 있어서 포털과 모양이
    갈려 있었다). 이 `fullOrigin` 관례는 상세주소 칸이 **없는** 표(`quotes`·`orders`)에
    적용되는 것이다. 🔴 **상호도 제 칸이다**(`company_name`, 2026-09-15 신설) —
    `location_name`(별칭)에 밀어 넣지 말 것
38. **`TopNav.tsx`처럼 루트 레이아웃(`app/layout.tsx`)에서 전체 사이트에 항상
    렌더링되는 컴포넌트에는 `useSearchParams()`를 직접 쓰지 말 것 — 반드시
    `<Suspense>`로 감싼 얇은 래퍼(`export default`)와 실제 로직을 담은 내부
    컴포넌트로 분리할 것.** 감싸지 않으면 Next.js가 정적 생성 시
    "useSearchParams should be wrapped in a suspense boundary" 오류를 내며
    Vercel 빌드 전체가 실패함 — `admin/quotes`/`admin/orders`처럼 이미
    `Suspense`로 감싸져 있는 목록 페이지들과 달리, TopNav는 사이트 전체에
    영향을 주기 때문에 실수하면 전체 배포가 막힘. 로컬에 Supabase 환경변수가
    없는 개발 환경에서는 대부분 페이지가 그보다 먼저 다른 이유로 실패해서 이
    문제가 가려질 수 있으니, `useSearchParams`를 쓰는 화면을 추가/수정했으면
    실제 Vercel 배포(Preview) 로그로 최종 확인하는 습관을 들일 것
39. **"확정 이후에는 사유를 남겨야만 바꿀 수 있는" 필드는 일반 편집폼
    (`editForm`+`handleSave`)에 섞지 말고, 별도의 즉시저장 컨트롤 + 전용 모달로
    분리할 것.** 여러 필드를 한 번에 묶어 저장하는 일반 폼 안에 넣으면 사유 입력을
    강제할 방법이 없음(다른 필드와 함께 조용히 같이 저장돼버림). `settlement_type`
    (운임 정산방식)이 이 패턴의 첫 사례 — `components/SettlementTypeChangeModal.tsx`
    (사유 미입력 시 저장 버튼 비활성화) + `lib/settlementTypeChangeLog.ts`
    (`settlement_type_change_logs`에 before/after/사유 기록)로 구현. 화면마다
    "확정 전" 자유편집 허용 여부는 그 화면의 실제 상태값 흐름을 보고 판단할 것
    (오더는 `["배차완료","운송중","운송완료"].includes(status)`일 때부터 —
    접수·배차중은 화주와 세부조율 중이라 자유 수정 허용, 배차는
    `dispatch_status !== "접수중"`일 때부터 사유 필요 — 정산관리는 아직
    확정/잠금 개념 자체가 없어서 일단 항상 사유 필요. 바뀔 때마다 `load()`로
    전체 재조회하는 것도 원칙 36번과 동일하게 지킬 것)
40. **정부 고시로 매년 바뀌는 요율(산재보험료율, 필요경비공제율 등)은 코드에
    하드코딩하지 말고 관리자가 수정 가능한 설정 테이블로 저장할 것.**
    `insurance_rate_settings`(`expense_deduction_rate`/`insurance_rate_total`)가
    이 패턴의 첫 사례 — `lib/insuranceRateSettings.ts`의
    `getLatestInsuranceRateSettings()`로 항상 최신 1행만 조회해서 계산에 쓰고,
    수정 화면(운임기준표 `/admin/rates` 화면의 "산재보험료 요율" 탭 — 4차
    세션에서 독립 경로에서 이 탭으로 이동, 아래 참고)은 조회는 누구나, 수정은
    관리자만(원칙 25번 이중 체크) 가능하도록 구현. 비슷하게 "이 값은 언젠가
    법령/고시가 바뀔 수 있다"는 값을 새로 다룰
    때는 상수 파일에 넣지 말고 이 패턴을 재사용할 것
41. **`components/DateTimePicker.tsx`가 다루는 "YYYY-MM-DDTHH:mm"(타임존
    오프셋 없음) 문자열은, Supabase에 저장/조회할 때 절대 그대로 주고받지
    말고 `lib/localDateTime.ts`의 `localInputToISOString()`(저장 시)/
    `toLocalDateTimeInput()`(불러오기 시)로 반드시 변환할 것.** 오프셋 없는
    문자열을 그대로 insert/update하면, 대상 컬럼이 `timestamptz`일 때
    Postgres/PostgREST가 이를 UTC로 오인식해서 실제 저장 시각이 KST 기준
    최대 9시간 밀리고(날짜가 바뀌는 경우도 있음), 반대로 DB에서 읽은 값을
    `.slice(0, 16)`처럼 그냥 잘라서 input에 넣으면 UTC 시각이 로컬 시각인 것처럼
    잘못 표시됨 — 실제로 견적 희망 상차·하차 일시가 "오늘 저녁 상차 + 내일
    아침 하차"처럼 자정을 넘는 조합일 때 저장 직후 목록/상세에 다른 시각으로
    보이는 버그로 나타났음(5차 세션에서 발견·수정). 새로운 datetime 저장
    지점을 추가할 때도 이 두 헬퍼를 거칠 것 — `new Date(v)`가 오프셋 없는
    문자열을 브라우저 로컬 시각으로 해석한다는 점을 이용해 정확히 변환함
42. **화주포털과 admin이 같은 데이터(견적/오더/배차/정산)를 다루는 화면을
    만들거나 계산 로직을 바꿀 때는, 반대쪽 화면에도 동일하게 반영해야
    하는지 항상 확인할 것 — 한쪽에만 적용하고 넘어가면 두 화면이 서서히
    어긋난다.** 단, 차주 지급운임·산재보험료·마진처럼 애초에 화주에게
    노출되면 안 되는 내부 정산 정보는 예외(화주포털에는 처음부터 의도적으로
    뺄 것 — 무엇을 빼야 하는지는 그 정보가 "화주가 알아도 되는 정보인지"로
    판단, 원칙 3·9번과 같은 결의 문제). 실제로 혼적가능 배지(`MixableBadge`)/
    최종금액 부가세 포함가 병기/배차·운송조회 품목 표시가 admin에는 이미
    있었는데 화주포털 견적확인·배차조회·정산확인 화면에는 빠져있던 사례가
    있었음(9차 세션 "0단계 사전점검" 이후 화주포털 표시 개선 세션에서
    발견·수정, 아래 완료된 주요 기능 참고). 새 기능을 admin에 추가할 때마다
    "이거 화주포털에도 보여줘야 하는 정보인가?"를 습관적으로 자문할 것
43. **목록형 화면에 검색·정렬이 필요하면 `lib/useListSearchSort.ts` 공용
    훅을 재사용할 것** — 화면마다 로컬로 검색 필터링·정렬 로직을 새로
    구현하지 말 것(원칙 12·37번의 `PasswordInput`/`AddressSearch`와 같은
    공용화 패턴). `searchFields`(포함검색 대상 필드를 뽑는 함수)/
    `sorters`(정렬 키별로 비교값을 뽑는 함수 맵)/기본 정렬키를 인자로
    받는 범용 설계라 화면마다 필드명이 달라도 그대로 재사용 가능(11차
    세션에서 화주포털 5개 화면에 최초 적용, admin으로 확장할 때도 같은
    훅을 그대로 가져다 쓸 것 — 새로 만들지 말 것). **페이지네이션은
    이 훅이 다루지 않는다** — 🟢 **그것은 `lib/useListPagination.ts` 가 맡는다**
    (PR #144 신설, 원칙 43번과 같은 결의 공용 부품이다). 이 훅으로 걸러·정렬한
    배열을 그 훅에 넘겨 자르는 순서이고, 화면마다 새로 만들지 말 것
44. **레코드를 "확정"해서 잠그는 기능(정산확정 등)을 만들 때는, 저장
    시점에 클라이언트가 들고 있는 잠금 상태(`locked`)를 그대로 믿지 말고
    서버가 매번 최신 값을 다시 조회해서 확인할 것.** 클라이언트 state는
    페이지를 새로고침하기 전까지 오래된 값일 수 있어서, 그 값만으로
    "잠겼는지"를 판단하면 이미 확정된 건도 우회해서 저장할 수 있는 구멍이
    생김. `invoices.locked` 도입(로드맵 ① 정산 마감·확정·잠금, 12차
    세션)이 이 패턴의 첫 사례 — `app/api/admin/invoices/save/route.ts`가
    저장 직전 `select("*")`로 fresh 조회 후 `locked`면 관리자+사유입력
    (`components/AmendmentReasonModal.tsx`, 원칙 39번과 같은 결)만 허용
    하고, `invoice_amendment_logs`에 수정 전/후 스냅샷을 남김. 확정
    자체는 별도 관리자 전용 API(`app/api/admin/invoices/confirm/route.ts`)
    로만 가능하고, 그 API가 쓰는 필드(`locked`/`confirmed_at`/
    `confirmed_by`)는 일반 저장 API의 화이트리스트에서 빠져 있어 일반
    저장 경로로는 건드릴 수 없음(원칙 25번과 같은 이중체크 정신). 앞으로
    다른 화면에 비슷한 "확정/잠금" 기능이 필요하면 이 구조를 그대로
    재사용할 것
45. **기존 필드를 새 구조로 대체할 때, 구형 필드가 다른 코드에서 여전히
    필요할 수 있다면 완전히 지우지 말고 "읽기 전용으로 얼려두기 +
    신규→구형 단방향 호환 매핑"만 적용할 것 — 절대 구형 값에서 신규
    필드로 역방향 동기화하지 않는다.** 역방향 동기화를 만들면 두 값이
    서로 다른 시점에 서로를 덮어쓰는 경합이 생겨 어느 쪽이 진짜 값인지
    알 수 없어짐. `settlement_type`(5개 값 enum) → `collection_method`
    (수금방식: `broker`/`driver_direct`) + `billing_cycle`(청구주기:
    `per_order`/`monthly`) + `direct_collection_point`(선착불 지급조건:
    `pickup`/`dropoff`/`undecided`) 이원화(로드맵 ②-A, 13차 세션)가 이
    패턴의 첫 사례 — `lib/settlementLabels.ts`의
    `mapToLegacySettlementType()`이 신규 필드 조합을 구형 값으로 변환
    가능한 경우에만(표현 불가능한 조합은 매핑하지 않고 구형 값을 그대로
    둠) 저장 시점에 같이 써주는 방식으로 구현. 신규 필드를 저장하는 모든
    지점(견적/오더/배차/정산 등록·수정, 오더→배차, 배차→정산 자동생성)에서
    이 함수를 한 번씩 호출해 구형 필드가 조용히 낡은 값으로 남지 않게 할
    것 — 다만 매핑이 안 되는 조합이면 구형 필드는 손대지 않고 그대로
    둔다(기존 DEFAULT 값 유지, 억지로 채우지 않음)
46. **화주별로 나중에 바뀔 수 있는 설정값(정산 마감일 등)을 기준으로 과거에
    저장된 레코드를 다시 찾을 때는, "현재 설정으로 역산한 값"과 정확히
    일치하는지 비교하지 말 것 — 설정이 바뀌면 과거 레코드를 영영 못 찾게
    된다.** 대신 그 레코드가 가진, 설정 변경과 무관하게 항상 참인 성질로
    찾을 것. 월정산 묶음(로드맵 ②-B, 14차 세션)이 이 패턴의 첫 사례 —
    화주의 정산 마감일(`billing_cutoff_day`)을 나중에 지정하면, 마감일
    미설정 상태(달력월 기준)로 만들어졌던 과거 묶음을 조회할 때 "화주의
    현재 마감일로 역산한 `period_start`/`period_end`"와 그 묶음에 실제
    저장된 값이 서로 어긋나 영영 못 찾는 버그가 있었음(확정건을 클릭해도
    상세가 안 뜨고, 그 안의 세금계산서 발행 버튼도 같이 사라져 보였음 —
    사실 둘 다 같은 원인). `period_end`는 마감일 설정과 무관하게 항상 그
    정산월 라벨과 같은 달력월 안에 온다는 성질(기간 계산 방식상 불변)을
    이용해, 정확한 기간 일치 비교 대신 "`period_end`가 이 달력월 범위
    안에 있는지"로 기존 묶음을 찾도록 고쳐서 해결 — 찾은 묶음이 있으면
    그 묶음 고유의 저장된 기간을 그대로 쓰고, 없을 때만(신규 생성용)
    현재 마감일 설정 기준으로 기간을 계산한다
47. **정산 건 생성 시점 스냅샷으로 얼려둔 금액 필드(`invoices.customer_charge_total`/
    `driver_payout_total`)에 나중에 발생하는 추가 금액(현장 추가비 등)을
    반영해야 할 때는, 그 스냅샷 필드 자체를 직접 UPDATE하지 말 것 — 대신
    별도 로그 테이블에 원본을 남기고, 화면에 보여줄 때만 스냅샷 + 로그
    합계를 실시간으로 더해서 표시할 것.** 현장 추가비(로드맵③, 16차 세션)가
    이 패턴의 첫 사례 — `invoices.customer_charge_total`은 1-2 조사에서
    이미 "생성 후에는 앱의 어떤 화면·API로도 수정할 방법이 없는 상태"임이
    확인됐고, 이 상태를 깨지 않기로 결정함(3-1 원칙). 다만 이 원칙을 지키면
    "이미 확정된 화면 요소(월정산 묶음의 항목 스냅샷 등)가 새 추가비를
    반영하도록 새로고침하는 기능"도 동일하게 "스냅샷 자체는 안 바꾸고 표시만
    다시 계산" 방식으로 만들어야 한다는 게 뒤늦게 드러남 — 기존
    `refresh_item_snapshot` 함수가 "invoice의 현재 값을 그대로 재복사"하는
    방식이라, invoice 값 자체가 원칙상 절대 안 바뀌는 한 이 함수를 몇 번을
    호출해도 새로 등록된 추가비가 전혀 반영되지 않는(화면엔 "새로고침"
    버튼이 있지만 실제로는 아무 것도 안 바뀌는) 죽은 기능이 될 뻔했음 —
    함수의 계산식 자체를 "invoice 값 + 그 이후 등록된 로그 합계"로 고쳐서
    해결. 비슷하게 스냅샷+로그 조합을 설계할 때는 "새로고침/재계산" 기능이
    실제로 로그 쪽 변화를 반영하는지 끝까지 따라가서 확인할 것.
    ⚠️ **예외 하나(35차 PR #146의 A-7 「배차 기준으로 금액 다시 맞추기」)** — 「생성
    시점에 **틀리게** 얼려진 기준 금액」을 바로잡는 재동기화는 이 원칙의 대상이 아니다.
    이 원칙이 막는 것은 **「나중에 생긴 추가 금액을 스냅샷에 섞는 것」**이고, A-7은
    **애초에 잘못 복사된 기준값**을 배차 기준으로 다시 맞추는 것이다(사유 입력 필수 ·
    담당자 화면 경로). 추가비는 여전히 로그로 더하고 스냅샷에 넣지 않으며, 재동기화 때
    넣는 추가비도 `created_at <= invoice.created_at`인 것뿐이다(빼면 두 번 청구된다).
    🔴 **이 예외를 근거로 「추가비도 스냅샷에 넣자」로 넓히지 말 것** — 그러면 원칙
    자체가 무의미해진다
48. **`invoices.order_id`가 지금까지 "한 오더 = 정산 건 최대 1개"라는
    암묵적 UI 관례(정산관리 "신규 정산 등록" 드롭다운이 이미 정산 건 있는
    오더를 후보에서 제외)로 사실상 유일했더라도, DB 유니크 제약은 아니므로
    앞으로 예외가 생길 수 있다는 것을 잊지 말 것.** 현장 추가비(로드맵③,
    16차 세션)의 "정정청구 invoice"가 이 예외의 첫 사례 — 확정된 월정산
    묶음에 이미 담긴 건에 새 추가비가 생기면, 기존 확정 금액은 절대 안
    바꾸고 같은 `order_id`로 새 invoice를 하나 더 만들어 다음 묶음에
    담기게 함. 이후로 `invoices` 테이블을 `order_id` 기준으로 조회하는
    코드에서 `.maybeSingle()`을 쓰면 2행 이상일 때 에러를 던지므로(기존
    자동정산등록 함수 2곳이 실제로 이 패턴이었음), 존재 여부만 확인하려면
    `.limit(1)` + 배열 길이 확인으로 바꿀 것 — 앞으로 `invoices`를
    `order_id`로 조회하는 새 코드를 짤 때도 "이 오더에 정산 건이 2개
    이상일 수 있다"는 전제를 깔고 짤 것
49. **대용량 private 파일은 서버 인증 후 Signed Upload URL을 발급하고,
    파일 바이트는 클라이언트가 Storage로 직접 업로드한다. 메타데이터 확정과
    signed download URL 발급은 반드시 서버 API(service_role)가 처리하며,
    anon 키로 파일 스토리지에 직접 쓰거나 메타데이터 테이블에 직접 쓰는
    방식은 (일반 내부 업무 테이블과 달리) 실제 비용·악용 위험이 있으므로
    허용하지 않는다.** POD·인수증(로드맵④, 17차 세션)이 이 패턴의 첫 사례 —
    당초 "admin 라우트가 로그인으로 보호되니 anon 키로 Storage에 직접
    쓰는 것도 안전하다"고 설계했다가, anon 키 자체가 브라우저 번들에
    노출되는 값이라 로그인 화면을 거치지 않고도 그 키만으로 Storage API를
    직접 호출할 수 있다는 점이 뒤늦게 지적되어 전면 재설계함(일반 테이블
    anon insert는 유출돼도 저장비용 문제가 없지만, Storage anon insert는
    실제 저장·대역폭 비용이 발생하고 임의 파일 호스팅에 악용될 수 있어
    위험 성격이 다름). 업로드는 upload-url API(재직 직원이면 role 무관
    가능, 배차상태+파일크기+MIME+개수를 매 요청 fresh 재조회로 검증) →
    클라이언트가 그 URL로 Storage에 직접 업로드 → finalize API(Storage에
    실제로 올라간 객체의 크기·MIME을 재조회해서 요청값이 아니라 그 값을
    진실로 사용, `dispatch_photos` 행 생성)의 3단계로 구현.
    `dispatch_photos`는 anon/authenticated 전부 RLS로 막혀있고(정책 자체를
    안 만듦) service_role 서버 API로만 접근, 클라이언트는 `storage_path`를
    직접 다루지 않고 항상 `photo_id`로만 열람용 signed URL을 요청함(4번
    참고, 임의 경로로 다른 배차 파일에 접근하는 것 방지)
50. **카테고리·상태값처럼 "허용값 목록" 상수를 확장할 때는, 그 상수를
    순회하며 컴포넌트별 state 객체를 인덱싱하는 모든 곳을 찾아서 그 state가
    새로 추가된 값까지 키로 갖고 있는지 확인할 것 — 이 프로젝트는 strict
    모드가 아니라서 `tsc`가 이 불일치를 잡아주지 못하고 런타임에서만
    크래시로 드러난다.** 클레임·사고(로드맵⑤, 18차 세션 PR #67 리뷰)에서
    실제로 겪은 사고 — `DISPATCH_PHOTO_CATEGORIES`를 `["dropoff","pod"]`
    2종에서 `["dropoff","pod","claim"]` 3종으로 늘렸는데, 이 상수를
    `.map()`으로 순회하며 사진을 카테고리별로 보여주는 화면 2곳
    (`admin/dispatches/[id]/page.tsx`의 "POD·인수증" 섹션,
    `components/DispatchPhotosPanel.tsx`)이 여전히 dropoff/pod 2종 키만
    가진 `photos` state를 그대로 인덱싱하고 있어서, `category==='claim'`
    차례에 `photos['claim']`이 `undefined`가 되고 그 `.length`를 읽으려다
    "Application error: a client-side exception has occurred"로 배차
    상세·화주포털 배차조회 양쪽 다 즉시 크래시났음(빌드는 두 번 다 정상
    통과했었음 — 인덱스 키 타입이 상수보다 좁아도 에러를 안 내는 프로젝트
    설정 때문에 `tsc`가 못 잡아냄). 이런 상수를 확장할 때는 (1) 그 상수를
    `.map()`/`.forEach()`로 순회하는 모든 곳을 찾고, (2) 그중 새로 추가된
    값을 다루면 안 되는 화면(예: 특정 카테고리는 별도 섹션에서 전용으로
    관리)이 있다면 그 상수 전체가 아니라 실제로 다뤄야 할 값만 담은
    로컬 배열(`["dropoff","pod"] as const`)로 순회 대상을 명시적으로
    좁힐 것 — "상수 하나 늘렸을 뿐인데 그 상수를 참조하는 모든 곳이
    자동으로 안전하게 확장될 것"이라고 가정하지 말 것
51. **화면에 이미 인라인으로 구현된 "표시시점 합산/재계산" 로직을, 이번엔
    여러 레코드를 한 번에 훑는 대량 집계 용도로도 써야 할 때는 기존 코드를
    그대로 복붙하지 말고, 같은 규칙을 지키는 별도 함수로 새로 분리해서 만들
    것 — 단, 그 규칙 자체(어떤 걸 포함하고 어떤 걸 제외하는지)는 절대
    바뀌면 안 된다.** 운영 대시보드(로드맵⑥, 19차 세션)의 매출·마진 집계가
    이 패턴의 첫 사례 — 현장 추가비(로드맵③) "invoice 총액+활성 추가비
    표시시점 합산" 로직은 이미 정산관리 목록·상세/화주포털/월정산묶음 4곳에
    각자 인라인으로 구현돼 있었지만, 그 4곳은 전부 "화면에 로드된 소수
    invoice 1건씩"을 다루는 형태라 "최근 12개월 전체 invoice"를 한 번에
    집계하는 대시보드 용도로는 쿼리 형태 자체가 안 맞았음. 그래서
    `lib/dashboardExtraChargeAgg.ts`에 3규칙(active만 / `correction_invoice_id`
    없는 것만 / 그 오더의 가장 최근 invoice 생성일 이후 것만)을 그대로
    지키는 신규 함수를 작성 — 기존 코드는 재사용하지 않았지만 규칙은 100%
    동일하게 맞춰서, 나중에 원본 로직이 바뀌면 이 신규 함수도 같이 바뀌어야
    한다는 점을 놓치지 않도록 함(원칙47 "표시시점 합산" 정신의 대량집계 버전)
52. **admin 화면의 접근 제어를 `middleware.ts`에만 추가하고 끝내면 안 된다 —
    `middleware.ts`의 matcher(`/admin/:path*`)는 `/api/admin/*` 서버 API
    라우트에는 전혀 적용되지 않는다(파일 자체에 이미 이 사실이 주석으로
    명시돼 있음).** 페이지 라우트를 미들웨어로 막아뒀다고 해서 그 페이지가
    호출하는 API까지 자동으로 보호되는 게 아니므로, 관리자 전용 화면을
    만들 때는 (a) `middleware.ts`의 admin 전용 경로 체크에 새 페이지 경로를
    추가하는 것과 별개로 (b) 그 화면이 쓰는 API 라우트 각각에도 원칙25·30번과
    동일한 `getCurrentStaff().role !== "admin"` 서버단 체크를 반드시 넣을
    것 — 운영 대시보드(로드맵⑥, 19차 세션)에서 `/admin/dashboard` 페이지와
    `/api/admin/dashboard-stats` API 양쪽에 이 이중 체크를 적용한 것이 이
    패턴의 첫 명시적 사례(그 전에도 원칙25번 정신 자체는 지켜지고 있었지만,
    "미들웨어와 API가 서로 다른 두 개의 방어선"이라는 사실 자체를 이번에
    처음 문서화함)
53. **클라이언트가 anon 키로 직접 테이블을 update하는 기존 화면(상태
    드롭다운·체크박스 등)에, 서버 비밀키가 필요한 부가기능(SMS 발송 등)을
    나중에 추가해야 할 때는, 그 update가 일어나는 모든 지점을 서버 API로
    옮기는 대규모 리팩터링을 하지 말 것.** 대신 DB update가 성공한 직후
    client가 "그 결과를 다시 조회해서 처리하는" 가벼운 서버 API를
    fire-and-forget(await 없이 호출, 응답을 기다리거나 실패를 처리하지
    않음 — 실패해도 원래 액션엔 전혀 영향 없어야 함)으로 추가 호출하는
    방식을 쓸 것. SMS 발신 연동(23차 세션, 배차확정/상차완료/하차완료)이
    이 패턴의 첫 사례 — `dispatch_status`를 바꾸는 지점이 실제로는 배차
    상세의 확정버튼·상태드롭다운·체크박스, 배차 목록의 상태드롭다운까지
    4곳에 흩어져 있었는데(사전조사로 처음 확인됨), 이 4곳을 전부 서버
    API로 옮기는 대신 각 지점 끝에 `lib/notifyDispatchSms.ts`의
    `notifyDispatchStatusSms()` 한 줄만 추가 — 이 함수가 부르는
    `/api/admin/notify-dispatch-status`가 dispatch를 다시 조회해서
    (client 값을 안 믿고) 수신자·문구를 정하고 발송함. "이 필드가 바뀌는
    지점이 한 곳뿐일 것"이라고 가정하지 말고, 실제로 몇 곳에서 그 필드를
    바꾸는지 먼저 grep으로 전부 찾아본 뒤 이 패턴을 적용할 것 — 실제로도
    이 프로젝트는 같은 상태값을 여러 화면(목록+상세)이 각자 update하는
    구조가 흔해서(원칙 46·48번 등에서도 비슷한 다중 진입점 이슈가 있었음),
    "자동 트리거를 건다"고 하면 먼저 그 트리거 대상 필드를 바꾸는 코드가
    정말 한 곳뿐인지부터 확인하는 습관이 필요함
54. **사진 위에 글자를 얹어야 할 때, 가독성용 어두운 덮개(그라데이션)는 화면 전체가
    아니라 "사진 요소 자신" 위에 얹을 것 — 정지점을 %로 주고 전체에 깔면 뷰포트 폭이
    바뀔 때마다 글자와 사진의 관계가 달라진다.** 랜딩 히어로(37차)가 이 패턴의 첫
    사례 — 덮개를 히어로 전체에 깔고 `linear-gradient(90deg, … 34%, … 80%)`처럼 주었더니
    정지점이 뷰포트 폭 기준이라, 1280에서는 멀쩡하던 것이 1920에서는 본문 끝과 사진
    시작이 맞물려 **트럭이 제목 위로 올라오고 차체 로고가 글자 뒤로 비쳤음**(텍스트는
    가운데 정렬된 컨테이너에 묶여 있고 사진은 뷰포트 오른쪽에 붙어 있어서, 둘이 서로 다른
    기준으로 움직였기 때문). 덮개를 사진 위에만 얹어 사진 왼쪽 끝이 배경색으로 녹아들게
    하면 **본문은 항상 단색 배경 위에 놓이므로 어떤 사진이 와도 읽힌다.**
    ⚠️ 이런 문제는 **이미지 자리가 회색 상자인 자리표시자 상태에서는 눈에 띄지 않는다** —
    사진이 들어올 자리에 대표 이미지를 임시로 넣고 여러 폭(최소 1280·1920·800)에서
    렌더링해 보는 것이 유일하게 확실한 확인 방법이다(37차에 실제로 이 방법으로 발견함,
    임시 이미지는 커밋 전 삭제)
55. **조회가 실패했을 때 "빈 목록"으로 보이는 코드를 쓰지 말 것 — `error` 를 반드시
    받아서 화면에 띄운다. 그리고 정렬·필터를 컬럼 이름에 기대지 말 것.**
    `const { data } = await supabase...` 는 조회가 실패하면 `data` 가 null 이라
    **조용히 빈 배열**이 되고, 화면은 "저장된 것이 없습니다"를 보여준다 — **저장은
    성공했는데 목록에 안 나타나는** 상태가 되어 원인을 짚을 단서가 하나도 안 남는다.
    55차에 실제로 겪었다: `customer_locations` 에 없는 `created_at` 으로 `.order()` 를
    걸어 PostgREST 가 `42703` 을 돌려줬는데 그 에러를 버려서 **배송지 목록이 통째로
    비었다.** 같은 표를 읽는 다른 4곳은 `order` 절이 없어 멀쩡했고, 그래서 화면 하나만
    비는 형태로 나타났다. 🔴 컬럼 이름이 확실하지 않으면 **정렬은 불러온 뒤 코드에서**
    하고, 스키마는 `_verify.sql` 의 컬럼 목록으로 **실측부터** 볼 것(짐작 금지).
56. **검증용 목(mock)은 실제 DB 보다 **더 엄격하거나 최소한 같아야** 한다 — 헐거우면
    "내 시험이 통과했다"가 "동작한다"를 뜻하지 않게 된다.**
    55차에 한 세션에서 세 번 걸렸다 — 목이 (1) 모르는 컬럼으로 정렬해도 무시하고
    통과시켰고(원칙 55번 버그를 못 잡음) (2) `limit` 을 통째로 무시했고("최근 N건만"을
    못 잼) (3) `gt` 를 항상 참으로 통과시켰다("안 읽은 수"를 못 잼). 셋을 실제 DB
    수준으로 고치고 나서야 버그가 400 으로 재현됐고 검증이 의미를 가졌다.
    🔴 **새 질의 방식(연산자·페이징·헤더)을 처음 쓸 때는 목이 그것을 진짜로 흉내내는지
    먼저 확인할 것.** 흉내내지 못하면 그 검증 결과는 근거가 아니다.
57. **화주포털(`.portal-v2`) 폼에는 네이티브 `<select>` 와 `<input type="date">` 를 쓰지
    않는다 — `components/pv2/Pv2Select.tsx` · `Pv2DatePicker.tsx` 를 쓸 것.**
    네이티브 요소의 **펼친 목록과 달력은 브라우저·OS 가 그린다** — 항목 높이·모서리·hover
    색·빈칸 문구(`연도-월-일`)를 CSS 로 바꿀 수 없어서, 트리거만 시안 모양이고 속은 옛
    모양인 상태가 된다(25차가 실제로 그랬고 26차 지적 5·6·7·8·9번이 전부 이것이다).
    🔴 **열림은 화면 전체에서 하나뿐이어야 하므로 두 컴포넌트가 같은 레지스트리
    (`pv2Popover.ts`)를 쓴다** — 따로 두면 달력을 여는 순간 드롭다운이 열린 채 겹친다.
    🔴 **접근성을 직접 넣었으니 지우지 말 것**(`role="listbox"`·`aria-expanded`·↑↓·Enter·
    Space·Esc·Home·End) — 네이티브를 버리면 브라우저가 주던 키보드 조작이 통째로 사라진다.
    🔴 **폭·flex 같은 바깥 레이아웃은 트리거가 아니라 래퍼(`wrapClassName`/`wrapStyle`)에
    준다** — 트리거에 남기면 절대 배치된 팝오버의 기준이 어긋난다.
    ⚠️ 이 원칙은 **포털 한정**이다. 관리자·공개 화면은 네이티브 `select` 그대로 두며,
    포털 안에서도 27·28차가 새로 그리는 화면에 네이티브를 다시 넣지 말 것.
58. **`box-shadow` 는 그 요소의 border-box 를 따라간다 — 체크박스·라디오에 글로우를 걸면
    원형이어도 사각형이 그려진다. 그리고 특성도가 같은 규칙끼리는 선언 순서가 이기므로,
    레이아웃이 어긋날 때 규칙 순서를 바꿔 고치지 말 것.**
    26차에 둘 다 실제로 겪었다. (a) `.portal-v2 input:focus` 에 옐로 3px 글로우를 걸었더니
    **17px 원형 라디오에 옅은 노랑 사각박스**가 생겼다 — 선택자에서
    `:not([type="checkbox"]):not([type="radio"])` 를 빼지 말고, 그 둘에는 `:focus-visible`
    로 **둥근 outline 링**을 줄 것(키보드 접근성은 유지해야 한다). (b) `.pv2-selectwrap`
    (0,0,1,0) 과 `.pv2-load-slot`(0,0,1,0) 의 특성도가 같아 뒤에 온 쪽이 이겨서 버튼 폭이
    시안과 달랐다 — 🔴 **순서로 고치면 다음에 누가 정렬할 때 조용히 되돌아간다.**
    `.pv2-selectwrap.pv2-load-slot` 처럼 **두 클래스로 특성도를 올려서** 고칠 것.

---

## 4. 완료된 주요 기능 · 4-1. 0단계 사전 점검

🔴 **`docs/history/features.md` 로 옮겼습니다.** 절 번호는 참조가 깨지지 않게 그대로 둡니다.

## 5. 다음 예정 작업 (우선순위 순)

직원 계정·권한·이력 재구조화 스펙(1~8단계)은 전부 완료되었습니다. 0단계 사전점검
(9차 세션)에서 잡았던 로드맵 ①~⑥(정산 마감·확정·잠금 → 정산방식별 수금·지급
구조 → 현장 추가비 → POD·인수증 → 클레임·사고 → 운영 대시보드)도 19차 세션까지
전부 완료되었습니다. **현재 진행 중인 트랙은 "랜딩페이지 공개 준비"**이며(1차 사전조사 →
2차 긴급 안전 수정 → 3차 로고·파비콘 → 4차 용어·메뉴·신규 페이지 → 5차 법적 문서+푸터 →
6차 스티키 헤더·법적 문서 모달·견적서 엑셀 → 7차 확정 문구 교체 → 8차 대표번호·SMS·견적서
용어 → 9차 약관 배상 조항·보험 제거 → 10차 담당자별 발신번호·견적안내 LMS →
11차 레이아웃 전면 개편·헤더 옐로 → 12차 정합성·상수·진입경로·이미지 구조 →
13차 랜딩 섹션 신설(운송관리·안전책임) → 14차 동의 절차 →
15차 거리 구간 매칭 버그 수정 →
16차 운임 기준 교체 →
17차 차급 9종 확장 → 20차 전체(3-1·3-2·3-3·3-4) → 18차 이용약관 동의 →
19차 anon RLS 정리 ① → 21차 anon RLS 정리 ②+④ → 22차 운임 매트릭스 보정 + 차급 11종 →
23차 화주포털 사전조사 → 24차 화주포털 화면 ① → 25차 화면 ②(발주 흐름) →
26차 시안 정합 → **27차 견적 흐름까지 완료**.
🔴 **차수 순서가 한 번 바뀌었다** —
20차 지시서가 *"시행일 2026-09-07이 확정되면서 약관 동의가 유일한 Go-Live 차단 코드 작업이
되어 18차로 올라갔고 가산기준은 19차로 밀렸다"*고 확정했다. 그래서 **18차=약관 동의 /
19차=가산기준 / 20차=화주포털 DB·법적 기반**이며, 20차 중 3-4만 먼저 처리했다.
그 사이 **차수 없는 작업 2건**이 있었다 — 41차 "랜딩 진입 경로"(히어로 CTA 2개 + 로그인
화면 계정 신청 링크)와 **47차 "SQL 마이그레이션 GitHub Actions 자동화"**),
사용자가 작업지시서를 차수별로 전달하는 방식으로 진행 중입니다.
**작업지시서 차수와 세션 차수가 다르므로 헷갈리지 말 것**
(1차=25차 세션, 2차=26차, 3차=27차, 4차=28차, 5차=30차, 6차=31차, 7차=32차, 8차=33차,
9차=34차, 10차=35차, 11차=37차, 12차=39차, 13차=40차, 14차=43차, 15차=44차, 16차=45차, 17차=46차, 20차 3-4=47차, 20차 3-1·3-2·3-3=48차, 18차=49차, 19차=50차, 21차=51차,
**22차=52차 · 23차=53차 · 24차=54차 · 25차=55차 · 26차=56차 · 27차=57차 · 28차=58차 ·
29차=60차 · 30차=61차** 세션(🔴 **53·54차는 같은 세션이다** —
조사를 먼저 하고 이어서 구현했다. 🔴 **59차는 차수를 쓰지 않은 P0 선행 작업이다**) — 29차는
별첨 미전달로 5차 사전조사만 수행한 세션, 36차는 지시서 없이 사용자 요청으로 진행한 문자 이력 화면,
41차는 차수 없는 소수정, **38차·42차는 각각 12차·14차의 사전조사 전용 세션(코드·DB 무변경)**.
15차 사전조사·보완조사 2회도 차수를 쓰지 않았다).
⚠️ **동의 절차가 두 번 밀렸다.** 원래 11차로 예약돼 있었는데 11차 지시서가 레이아웃 개편으로
와서 12차로, 12차 지시서가 정합성 작업으로 와서 다시 **14차**로 밀렸다. 실행 순서대로 다시
붙인 결과가 아래이며, **17차 · 20차 전체 · 18차 · 19차 · 21차 · 22차 · 23차 · 24차 · 25차 ·
26차 · 27차 · 28차 · 29차까지 끝났다** —
🟢 **Go-Live 차단이던 이용약관 동의가 49차에 해소됐다**(시행일 2026-09-07).
🔴 **19차는 가산기준이 아니라 anon RLS 정리 ①이 됐고, 21차가 ②+④(실제로 잠그기)였다**
(사용자 확정 2026-08-26). **가산기준은 미정으로 밀렸다.**
🟢 **가산기준은 22차에 대부분 처리됐다**(18톤 하향 · 8·15톤 신설 · 물품특성 2행).
🔴 **화주포털 화면 개편은 다섯 번 밀린 끝에 24·25차가 됐다** — 21·22 → 22·23 → 23·24 →
**24·25**. 23차가 화면이 아니라 사전조사가 되면서 한 번 더 밀린 것이다. 실행 순서대로 번호를
붙이는 원칙 때문이니, **예고 번호가 아니라 실제 실행 순서**를 기준으로 볼 것.
🔴 **차수가 또 밀렸다 — 일곱 번째다.** 55차 로드맵은 *"다음은 26차(견적 흐름)"* 라고
적었는데 실제 26차 지시서는 **시안 정합**이었고, 27차가 견적 흐름이 되면서 **관리자 연동
조사가 28차, 조회 흐름이 29차**로 확정됐다(사용자 결정 2026-08-28).
🔴 **예고 번호가 아니라 실제 실행 순서를 기준으로 볼 것.**

⚠️ **완료된 차수 80건(27차 → 알림 4건 #162)은 `docs/history/roadmap-done.md` 로 옮겼습니다**
(2026-09-22 · 한 글자도 안 지웠고 md5 와 바이트로 대조했습니다). 🔴 **없앤 것이 아니라 옮긴 것이니**
근거를 찾을 때는 `grep -rn "…" docs/history/ CLAUDE.md` 로 **양쪽을 함께** 보십시오.
아래에는 **PR #173 이후 14건과 「보류 · 미정 · 뒤로 미룸」 줄만** 남깁니다.
```
  ——   수정견적 배지 + 수정 이력 + 리뷰 5건 (차수 없음)  ✅ 완료 (PR #173 merge `e80f32c` —
        🔴 **DB 변경 있음**(마이그레이션 1건 · `_migrations` **40 → 41행**) · 신규 의존성 0 ·
        랜딩 0줄 · 공개 화면 0줄 · `lib/legal/` 0줄 · `globals.css` **순수 추가**(+21 / −0) ·
        화주포털은 **배지 한 곳뿐** · 커밋 8개 · 파일 17개 · **+1,554 / −81** ·
        실사용 리뷰 **2라운드(5건)**. 🔴 **차수를 소비하지 않았다.**
        🔴 **여덟 건이고 그중 여섯이 한 뿌리다** — PR #172 가 「승인 뒤 금액 조정」을 정식
        경로로 만들면서 화주가 알 자리·담당자가 되짚을 자리·견적서 표기·조정하러 가는 길이
        한꺼번에 필요해졌다. **따로따로 되돌리지 말 것** ·
        🚨 **표를 새로 만들지 않았다 — `activity_logs` 를 되살렸다**(21차가 「쓸 일이 생기면
        정책을 만들면 된다」로 남긴 표 · 원칙 27번). **그런데 그 표의 `user_id` 가 죽은
        `profiles` 를 참조하고 있었다** — `quotes.created_by` 사고와 **같은 시대·같은 원인**
        이고, 그대로 뒀으면 **화면에 아무 증상 없이 이력이 한 줄도 안 쌓였다.**
        🔴 **레거시 표를 되살릴 때는 제약·인덱스를 반드시 실측할 것** ·
        🔴 **`record_change_logs` 같은 표를 새로 만들지 말 것** ·
        🔴 **배지 신호는 `revised_at` 이고 `updated_at` 이 아니다**(PR #164 의 교훈 — 되돌리면
        거의 모든 견적에 붙는다) · 🔴 **`수주` + 금액이 실제로 바뀐 때만** 찍는다 ·
        🔴 **소멸 판정은 배차 단계다**(`orders.status` 로 재면 `하차완료` 건이 화주 눈에는
        완료인데 배지만 남는다) · 🔴 **`Pv2RevisedMark` 와 `Pv2UpdatedMark` 를 합치지 말 것** ·
        🚨 **④ 는 이 PR 이 만든 결함이었다** — 이력을 오더 상세에만 붙였는데 금액을 바꾸는
        자리는 **견적 쪽이 더 많다**(PR #172 가 그 경로를 만든 이유다). 고친 자리는 화면이
        아니라 **`syncQuoteAmountToOrders()` 안**이다(원칙 53번과 같은 결) ·
        ⚠️ **⑥ 은 36차 E장의 「기본운임을 덮어쓰지 않는다」를 뒤집은 것이다** — 그때의 사용자
        원문도 **「기본운임에서 + - 되어서」**였고 그 세션이 「조정 줄을 더하는」 쪽으로 읽었다.
        🔴 **`lib/quoteAdjustment.ts` 의 옛 문장을 근거로 되돌리지 말 것**(같은 커밋에서 고쳤다) ·
        🔴 **E장의 걱정(되짚을 수 없다)은 수정 이력이 답한다 — `FIELD_SPECS.quotes` 에서
        `base_fare` 를 빼지 말 것** · 🔴 **화주 견적서 식으로 맞춘다**(관리자 식으로 맞추면
        화주 쪽에 반올림 차액만큼 조정 줄이 **새로 생긴다**) ·
        🔴 **⑦ 사유 이름만 바꿨고 코드(`fare_disagreement`)는 그대로**(CHECK 가 없어 코드를
        바꾸면 옛 행이 이름을 잃는다) · 🔴 **`driverFault` 를 `true` 로 되돌리지 말 것**
        (우리 가격 문제를 차주 이력에 세면 그 숫자를 아무도 못 믿는다 — PR #171 이 열어 둔
        물음의 답) · 🔴 **취소 배차만 남은 오더에 「배차 상세보기」+「+ 배차 등록」 둘 다**
        (`linkedDispatchId` 하나로 가르면 재배차 버튼이 사라진다 — 지금까지가 그 상태였다) ·
        🔴 **⑧ 취소건 숨기기는 기본 꺼짐 + 감춘 건수 표시**(기본으로 감추면 없어진 것으로
        오해한다) · 🔴 **조회에서 `.neq()` 로 빼지 말 것**(상한이 취소 건을 못 센다) ·
        🔴 **⑤ 「전화로 처리함」을 지우거나 숨기지 말 것**(PR #167 ① — 유일한 탈출구) ·
        ⚠️ **거짓 ❌ 11건 — 전부 하네스가 틀렸다**(목에 `customer_accounts` 누락 8 ·
        **쿠키 세션 미주입으로 `isAdmin` false** 2 · middleware 307 1) ·
        🟢 단위 **62** · 렌더 **47** · 프리렌더 **46**(항목 `diff` 0) · 함정 5번 `fuser` ·
        ⚠️ **PR 본문이 리뷰 5건을 안 담은 채로 있었다** — 🔴 **리뷰가 붙으면 PR 본문도 같이
        고칠 것**(그 본문이 곧 기록이다))
  ——   공지사항 간이 서식 + 미리보기 + 수정 (차수 없음)  ✅ 완료 (PR #174 merge `94e60d3` —
        🔴 **DB 변경 있음**(마이그레이션 1건 · `_migrations` **41 → 42행**) ·
        🟢 **신규 의존성 0** · 랜딩 0줄 · 공개 화면 0줄 · `lib/legal/` 0줄 ·
        관리자 다른 화면 0줄 · `globals.css` **순수 추가**(+223 / −0) · 커밋 4개 ·
        파일 11개 · **+1,215 / −39** · 실사용 리뷰 라운드 **0**.
        🔴 **차수를 소비하지 않았다.**
        🚨 **지시서가 통째로 뒤집혔다** — v1 은 **정식 편집기 도입**(Tiptap + sanitize-html)
        이었고 0-2 가 *"이것은 「신규 의존성 0」을 처음으로 깨는 작업입니다"* 로 시작했다.
        착수 전 보고를 받은 **사용자가 작업량을 보고 범위를 줄였다**(*"너무 작업량이
        과해지는게 아닌지 우려스럽다. 최소한의 수정으로 글자볼드, 글자크기, 글자컬러,
        이모티콘을…"*) → **ⓐ 간이 서식**. 🔴 **그래서 「신규 의존성 0」이 그대로 지켜졌다 —
        「지시서에 있으니 Tiptap 을 넣자」로 되돌리지 말 것** ·
        🚨 **안전 구조가 정식 편집기와 반대다** — HTML 을 받아서 골라내는 것이 아니라
        **전부 이스케이프한 뒤 허락한 표기만 태그로 만들어 낸다**(통과시키는 HTML 이 애초에
        없어서 정화 라이브러리가 필요 없다). 🔴 **이스케이프를 미루거나 건너뛰지 말 것 —
        그 한 줄이 이 구조의 전부다** · 🔴 **`[html]` 같은 통과 표기를 만들지 말 것** ·
        🔴 **정의처는 `lib/announcementMarkup.ts` 하나 · 그리는 부품은
        `components/AnnouncementBody.tsx` 하나**(미리보기 전용 렌더러를 따로 만들지 말 것 —
        그 순간 미리보기가 거짓말이 된다) · `dangerouslySetInnerHTML` 은 그 파일에서만 ·
        🔴 **`content_format`(`plain`|`markup`)이 옛 공지의 줄바꿈을 지킨다** — 기존 1행에
        줄바꿈이 실재해(`_verify.sql` ㉙-f) 없었으면 275자가 한 줄로 뭉개졌다.
        **옛 행까지 markup 으로 읽도록 바꾸지 말 것** ·
        🚨 **「새 공지」 판정이 `created_at` → `announced_at` 으로 옮겨졌다**
        (`ANNOUNCEMENT_NOTICE_FIELD`) — 오타를 고쳐도 「화주에게 다시 알림」(기본 꺼짐)을
        켜야 새 글로 뜬다. 🔴 **되돌리지 말 것** · **쓰는 곳이 셋이다** ·
        🔴 **백필(`announced_at = created_at`)을 빼면 옛 공지가 통째로 되살아난다** ·
        🔴 **이미지 올리기(지시서 C장)는 안 했다**(사용자 「사진은 나중에」) ·
        🟢 갈아탈 길은 열려 있다(`content_format` 이 본문마다 저장된다) ·
        🟢 `_verify.sql` **㉙** 신설 · 🟢 **거짓 ❌ 0건**)
  ——   이용가이드 재작성 + 시각 개편 (차수 없음)  ✅ 완료 (PR #175 merge `78f5a33` —
        🟢 **DB 0** · 마이그레이션 0 · `_migrations` **42행 그대로** · 🟢 **신규 의존성 0** ·
        `lib/legal/` 0줄 · 관리자 화면 0줄 · `globals.css` **순수 추가**(+391 / −0) ·
        커밋 4개 · 파일 19개 · **+1,636 / −100** · 실사용 리뷰 **3라운드**.
        🔴 **차수를 소비하지 않았다.** 사용자 지시 *"알림기능등 새로 업데이트 된 내용 적용해서
        재작성. 좀더 친절하고 상세한 내용을"*.
        🔴 **PR #149 이후 아홉 차수가 가이드에 하나도 반영돼 있지 않았다** — 웹 푸시 · 화면
        안 알림·알림음 · 조회기간 직접지정 · 「업데이트」/「수정견적」 표시 · 배차 취소 표시 ·
        배송지 상호 칸 · 공지 서식. 🔴 **그보다 나쁜 것은 「지금 화면에 없는 말」**(「상담 중」 —
        PR #164 가 「확인중」으로 바꿨다)**을 적고 있던 것이다.** 🔴 **화면을 바꾸는 차수는
        이 글도 같이 볼 것** — 안 보면 조용히 거짓말이 된다 ·
        🔴 **항목 14 → 21개**(`notify`·`quote`·`dispatch`·`invoice`·`period`·`notice`·`marks`) ·
        🔴 **기존 항목 id 14개를 한 글자도 안 바꿨다**(`?topic=` 이 곧 URL 이다) ·
        🟢 **첫 커밋은 화면 파일 0줄**(있는 블록만 조합 — PR #149 구조가 그렇게 되어 있다) ·
        🔴 **`table` 은 묶음(`group`)에 든 항목에 넣지 말 것**(공개 화면에서 **조용히 사라진다**) ·
        🔴 **`table` 행 · `faq` 답 · `steps` 제목 · `cards` 라벨 · `figure` 캡션에 `**` 금지**
        (그 자리는 원문 그대로 그려 별표가 글자로 보인다) · 🔴 **`titleSub` 는 묶음 안에만** ·
        🔴 **`GuideIcon` 20종은 인라인 SVG 이고 이름 목록은 `lib/guideContent.ts` 에 있다** —
        방향을 뒤집으면 정의처가 화면 부품을 import 한다. **`PortalIcon` 과 합치지 말 것** ·
        🚨 **캡처 6장은 실계정이 아니다** — `scripts/guide-shots.mjs` 가 Supabase 응답을
        가로채 **가짜 값**을 물려 찍는다(이 저장소는 public 이라 실계정 캡처는 git 이력에서
        지워지지 않는다 — PR #148 이 캡처를 안 넣은 셋째 이유를 **없앤 것**이다).
        🔴 **실계정으로 다시 찍지 말 것** · **DSF 2 로 찍어 절반 크기로 저장**하고
        `width`·`height` 를 **구조 단언이 파일과 대조**한다 · 합계 360KB ·
        🔴 **CSS 는 공개(`.guide-*`)와 포털(`.pv2-guide-*`) 두 벌을 일부러 따로 적었다** —
        포털 토큰은 `.portal-v2` 안에만 있어 한쪽으로 몰면 **한 화면이 무채색**이 된다 ·
        🔴 **`figure` 는 `width: auto`**(`100%` 면 248px 캡처가 늘어나 뭉갠다) ·
        🚨 **고객센터 시간이 전 화면 09:00 ~ 19:00 이 됐다**(리뷰 2·3라운드) — 상수를 둘로
        갈랐다가 **같은 날 도로 합쳤다.** 🔴 **다시 둘로 가르지 말 것** ·
        🔴 **`GuideBlock` 의 `only?: "public" | "portal"` 도 함께 지웠다 — 다시 만들지 말 것**
        (화면을 가르는 일은 `scope` 가 한다) ·
        🚨 **로그인 화면의 시간 줄은 둘이고 뜻이 다르다** — 「접수 기준 당일 발급」 위의 것은
        **문의 시간이 아니라 발급 약속**이고 31차가 **랜딩 FAQ 와 일부러 맞춰 둔 값**이다.
        🔴 **그 셋(로그인 · `/apply` 접수완료 · 랜딩 FAQ)은 한쪽만 고치지 말 것**(이번에 셋을
        함께 올렸다) · 🔴 **랜딩 푸터 운영시간 줄은 그대로 비어 있다** ·
        🟢 구조 단언 **19항목** · 두 화면 렌더링 가로 넘침 **0** · 프리렌더 **46**(항목 `diff` 0) ·
        🟢 **거짓 ❌ 0건**)
  ——   문자 발송 정리 (차수 없음)     ✅ 완료 (PR #176 merge `4f2e1b8` — 커밋 **7개**
        (조사 2 + 구현 5) · 파일 **16개** · **+1,204 / −203** ·
        🔴 **DB 변경 있음**(마이그레이션 1건 · `_migrations` 42 → **43행**) · 신규 의존성 0 ·
        화주포털 0줄 · 공개 화면 0줄 · 랜딩 0줄 · `globals.css` 0줄 · `lib/legal/` 0줄 ·
        실사용 리뷰 라운드 **0**. 🔴 **차수를 소비하지 않았다.**
        🚨 **지시서의 「DB 변경 없을 것으로 봄」이 틀렸다** — `sms_logs_template_type_check` 가
        **8종 고정**이라 코드를 먼저 올리면 고객 문자가 나가기는 하는데 **이력만 조용히 안
        남는다**(`sendSmsWithLog` 는 던지지 않아 화면에 증상이 0이다). **DB 가 먼저다** ·
        🔴 **폐지하는 두 종을 CHECK 목록에서 빼지 않았다** — 빼면 옛 행이 제약을 어기고
        재발송 경로가 깨진다. **8종 → 9종이다** ·
        🔴 **옛 CHECK 정의에서 따옴표 문자열을 정규식으로 뽑아 새 목록이 모르는 값이 있으면
        멈춘다** — 이 표는 저장소에 정의가 없어 「8종」이 코드에서 온 추정이었다.
        정의 전문을 `raise notice` 로 남긴다(되돌리기 근거) ·
        🟢 **로컬 Postgres 16 에 운영 표를 복제해 실제로 돌렸고 단언 부정 시험 4건이 전부
        멈추고 롤백되는 것까지 확인했다**(함정 31번) ·
        🔴 **A장 — 상차·하차완료 문자 폐지**(사용자 *「알림으로만 충분하다」*). 화주는
        운송관리 알림으로 받는다. 🔴 **라벨·타입·CHECK 의 두 값은 남긴다** — 지우면
        `/admin/sms-logs` 에 영문 코드가 나오고 종류 필터에서 옛 건을 못 찾고 재발송이
        타입에서 막힌다. 🔴 **재발송은 일부러 안 막았다**(원문 그대로라 틀린 문자가 아니다) ·
        🔴 **B장 — 배차확정 두 통**(차주 「화물정보 안내」 = `dispatch_confirmed` **키 그대로** +
        고객 「배차확정 안내」 = `dispatch_confirmed_customer` 신설). **차주가 먼저다** ·
        🔴 **라우트는 한 번에 한 통만 돌려주고 큐는 화면이 든다** — 수동 버튼이 한 통만
        띄워야 해서 배열로 안 만들었다 · 🔴 **공용 `SmsConfirmModal` 에 선택 prop `step`
        하나만 더했다**(다른 다섯 호출부 diff 0) ·
        🚨 **`key={preview.templateType}` 가 없으면 둘째 창에 첫 통의 본문과 수신번호가 그대로
        남는다** — 빼고 렌더링해 보니 **고객에게 차주 문구가 차주 번호로** 나갔다 ·
        🚨 **§5-4·§5-23 의 「차주 정보 비노출」은 화면 기준이다** — 이 문자로는 보낸다
        (사용자 확정). 처리방침 제4조 3행이 **이제 사실과 맞는다.** 🔴 **그 줄을 근거로
        고객 문자에서 기사 정보를 빼지 말 것** · 🔴 **포털 화면에 띄우지도 말 것** ·
        🔴 **빈 칸 규칙이 두 문구에서 정반대다** — 차주는 **줄째 뺀다**(「미정」·「-」 금지 ·
        사용자 *「기입되어 있는 선안에서」*), 고객은 **「미등록」**(이 문자의 목적이 기사 정보
        확인이라 줄째 빠지면 담당자가 모른다). **같게 만들지 말 것** ·
        🔴 **차주 문자에 화주 대표 연락처·운임·수수료 0건** · **고객 문자에 운임·품목·특이사항 0건** ·
        🔴 **`dispatches.external_vehicle_type` 신설** — 비면 오더의 **요청 차종**으로
        떨어지는데 그것을 먼저 쓰면 문자가 **스스로를 확인해 항상 맞는 것처럼 보인다**
        (운영 배차 22건이 전부 외부 배정이다) ·
        🚨 **곁다리 — 날짜가 9시간 어긋나고 있었다**(Vercel 함수가 UTC 인데 `getHours()` 를
        썼다. KST 09:00 건은 **날짜까지 하루 앞으로** 밀렸다). `Intl` 에 `Asia/Seoul` 을
        명시해 고쳤고 **되돌리지 말 것**. 🟢 배차확정 문자 이력이 0건이라 실피해는 없었다 ·
        🔴 **하차 `23:59` 는 당착·내착 자리 채움이라 날짜만 찍는다**(운영 3건 실재 ·
        `ARRIVAL_FILLER_TIME` import · **새 리터럴 0건**) ·
        🔴 **C장 — 머리말 `SMS_HEADER` 하나**(7종 + LMS 제목 · 그 제목에는 띄어쓰기가 있었다).
        🔴 **이메일 2건은 범위 밖**(diff 0) · 🔴 **이미 나간 문자 본문을 고치지 않는다** ·
        🟢 **견적 링크 문자는 상수로 바꾼 뒤에도 87byte 그대로다**(여유 3byte) ·
        🚨 **재발송이 87byte 견적 링크 문자에 제목을 붙여 LMS 로 올리고 있었다** — 조건을
        두 곳에 따로 적은 것이 원인이라 **`smsSubjectFor()` 한 함수**로 모았다.
        🔴 **`template_type` 만 보는 쪽으로 되돌리지 말 것**(판정 기준은 **본문 길이**다) ·
        🔴 **견적 버튼 「견적서 문자 발송」** — 🔴 「링크 문자 발송」으로 바꾸지 말 것
        (링크 생성이 실패하면 옛 요약 LMS 로 내려가 그때는 틀린 이름이 된다) ·
        ⚠️ **거짓 ❌ 3건 — 전부 내 시험이 틀렸다.** 둘은 **내가 쓴 주석에 금지 문자열을 그대로
        적어** 완료조건 grep 에 주석 자신이 걸린 것이고(**함정 10번의 일곱·여덟 번째**),
        하나는 이모지 정규식에 **화살표(U+2192)**를 넣은 것인데 그것은 EUC-KR 안의 기호이고
        `origin/main` 에 이미 4건 있던 문자다 ·
        ⚠️ **프리렌더를 `git stash` 로 재려다 커밋 뒤라 같은 코드를 두 번 잰 무의미한 비교가
        됐다** — `git worktree` 로 `origin/main` 을 따로 빌드해 **46개 항목 diff 0** 을 확인했다.
        🔴 **커밋한 뒤에는 `stash` 가 기준선을 만들지 못한다** ·
        🟢 자세한 것은 **HANDOFF §5-25**)
  ——   포털 「접수」 카드 + `/apply`·`/quote` 모바일 정리 (차수 없음)  ✅ 완료 (PR #177 merge
        `f4c0c11` — 🟢 **DB 0** · 마이그레이션 0 · `_migrations` **43행 그대로** · 신규 의존성 0 ·
        `globals.css` **0줄** · `lib/legal/` **0줄** · 관리자 화면 **0줄** · 커밋 7개 ·
        파일 12개 · **+680 / −51** · 실사용 리뷰 **3라운드 7건**.
        🔴 **차수를 소비하지 않았다.**
        🔴 **코드를 열기 전에 운영 DB 를 쟀다**(`_verify.sql` **㉛** 신설 · 읽기 전용) —
        **수주인데 오더 없음 0 · 오더인데 배차 없음 0**. 막힌 데이터가 아니라 **승인부터
        담당자가 배차를 등록하기까지 화면이 비어 있던 것**이 원인이라 **DB 변경이 0** 이 됐다ㆍ
        🔴 **오더를 자동 생성해서 메우지 말 것**(27차 확정 · 사유는
        `app/api/customer/approve-quote/route.ts` 가 적고 있다) — 대신 **DB 에 아무것도 만들지
        않는 가상 카드**다 · 🔴 **정의처는 `lib/portalPendingDispatches.ts` 하나이고 조회 화면과
        홈이 같이 쓴다** · 🔴 **두 갈래를 다 센다**(수주인데 오더 없음 + 오더인데 배차 없음) —
        ①만 만들면 **오더가 생기는 순간 카드가 사라졌다 배차 후 다시 나타난다** ·
        🔴 **②의 상태 조건(`접수`·`배차중`)을 지우지 말 것**(PR #167 ⑦ 과 같은 두 단계 판정) ·
        🔴 **가상 행의 `order_id`·`updated_at` 은 `null` 이어야 한다**(앞은 취소 배지가 붙을 길,
        뒤는 화주 본인의 승인에 「업데이트」 알약이 뜬다) · 🔴 **접수 시각은
        `approved_by_customer_at`** · 🔴 **오더번호가 없으면 「견적 …」 접두어로** ·
        ⚠️ **구멍 하나 — `orders.quote_id` 가 비면 카드가 둘이 된다**(관리자 「견적 연결」이
        잇는 길이고 실측 0건) ·
        🔴 **곁다리 — `WON_QUOTE_STATUS` 정의처를 `lib/quoteStatusLabels.ts` 로 옮겼다**
        (`lib/unlinkedWonQuotes.ts` 가 관리자 클라이언트를 import 해서 포털이 가져다 쓰면
        **포털 번들에 관리자 세션이 딸려 들어간다** — 원칙 1번) ·
        🔴 **`/apply` 문구를 두 번 고쳤다** — 「간편하게 전화로 신청하세요」 → 「전화로 신청도
        가능합니다」(중간 판본) → **「전화로도 신청 가능합니다」**. 권유형·중간 판본 둘 다
        되돌리지 말 것 · 🔴 **이메일이 `[아이디] @ [도메인]` + 고르기 11종이 됐다**
        (`EmailField` · **저장값은 문자열 하나** · **별도 state 없이 값에서 갈라 읽는다** ·
        **도메인 칸을 잠그지 않는다** · 제출 직전 형식 검사) ·
        🚨 **모바일 동의 설명글 — 내 판단이 리뷰에서 뒤집혔다**(수집·이용 목적 고지라 약관
        요약만 감췄다가, 보고 후 **두 카드 모두 + `/quote` 까지** 확정). 🔴 **그 옛 판단을
        근거로 되살리지 말 것** · 🔴 **대신 「전문 보기」와 거부권 문단은 반드시 남긴다** ·
        🔴 **`/apply` 전화 카드 271 → 165px**(문구는 한 글자도 안 지웠다 · 데스크탑 불변) ·
        🔴 **`/quote` 에 거부권 한 줄 신설 — 원래 통째로 없었다**(`ConsentRefusalNote` 공용
        부품 · 정의처 `CONSENT_REFUSAL_NOTICE` 하나 · **감춤 대상이 아니다**) ·
        🔴 **모바일 폼 항목 제목 14 → 15px · 600 → 700 · `#4A4945`**(`landing-field-label`
        손잡이 **18곳** — 값이 인라인 style 이라 CSS 로는 못 이긴다 · **16px 로 올리지 말 것**) ·
        ⚠️ **접힌 「자세히」 블록을 펼쳐 전수로 셀 것**(겉만 보면 `/apply` 5 · `/quote` 7 인데
        실제는 **10 · 16**) ·
        ⚠️ **거짓 ❌ 3건 — 전부 내 측정이 틀렸다**(뷰포트 비율 1 · 임의의 절대값 2).
        🔴 **같은 화면에서 감춘 것만 되살려 전후를 재는** 방식으로 바꿨다 ·
        🟢 프리렌더 **46**(`origin/main` 과 항목 diff 0) · 단위 21 · 렌더 117항목 ·
        🟢 **사용자가 코드 밖에서 할 일 0** — 화주포털 새로고침뿐)
  ——   운임기준표 — 라보를 다마스 값으로 통일 (차수 없음)  ✅ 완료 (PR #178 merge `5f0d969` —
        🔴 **DB 변경 있음**(`rate_distance_tiers` UPDATE **15칸** · INSERT·DELETE 0 ·
        `_migrations` 43 → **44행**) · 🟢 **제품 코드 0줄**(`app`·`components`·`lib`·`public`
        변경 파일 0) · 화주포털 0줄 · 공개 화면 0줄 · 랜딩 0줄 · `globals.css` 0줄 ·
        신규 의존성 0 · 파일 **2개** · **+229 / −1** · 리뷰 라운드 **0**.
        🔴 **차수를 소비하지 않았다**(v11·v12 와 같은 취급).
        사용자 지시 *"다마스, 라보는 기본 30000원으로 정하자. 그 이후거리 금액도 모두
        다마스기준으로 통일하자."*
        🔴 **코드를 열기 전에 DB 를 쟀고 그것이 지시의 뜻을 바꿨다** — **다마스 「10km
        이내」는 이미 30,000 이었다**(v12 A장). 그래서 실제로 바뀐 것은 **라보 15칸을
        다마스 값으로 내린 것**뿐이고 **다마스는 0칸**이다 ·
        🚨 **실측이 예상 밖의 것을 잡았다 — 라보 두 칸이 5,000 배수가 아니었다**
        (110km **85,100** · 400km **225,100** · ㉒-b `오천배수아님_다마스라보` = 2).
        v12 A장이 넣은 값은 85,000·225,000 이라 **`/admin/rates` 에서 담당자가 고치다 난
        100원 오타**로 보인다(그 화면은 **클릭이 곧 저장**이고 되돌리기가 없다).
        🟢 이번 통일이 그 두 칸도 정리했다(80,000 · 215,000) ·
        🔴 **「85,100 이 의도한 값」으로 되돌리지 말 것**(5,000 격자를 깨고 반올림이 못 흡수한다) ·
        🔴 **차급 역전 검사를 완화했다 — 다마스↔라보 한 쌍만 동가 허용**(마이그레이션 ④(5) +
        **`_verify.sql` ⑥-b** 두 곳을 같은 커밋에서). 🔴 **`<=` 를 전부 `<` 로 바꾸지 말 것** —
        나머지 11쌍의 동가까지 통과해 검사가 헐거워진다. 🟢 재서 확인했다(다마스=라보 0 ·
        **라보<다마스 는 여전히 1**) ·
        🔴 **값을 수식으로 만들지 않았다 — 같은 표의 다마스 행을 그대로 복사**한다
        (PR #142 가 라보 400km 초과에서 겪은 자리) ·
        🟢 **게시가 영향 0** — `PUBLISHED_START_PRICE_TONS` 6종에 다마스·라보가 없다.
        ⚠️ **다만 견적은 DB 를 매번 읽어 `apply` 가 끝난 순간부터 새 금액이다** ·
        🟢 대기료(`rate_vehicle_extra_fees`)는 두 차급이 **이미 같았다**(손댈 것 0) ·
        ⚠️ **보고한 우려 — 라보 마진이 줄어든다**(라보가 더 큰 차이고 실측 지급 중앙값도
        35,000 vs 32,500 · 10km 이내 지급 상한 26,087원이라 **역마진**). **다마스가 이미
        같은 상태였고**(v12 A장) 라보가 그 자리로 온 것이다. 🔴 **되돌리려면 먼저 물을 것** ·
        🟢 **로컬 Postgres 16 에 운영 195칸을 복제해 실제로 돌렸고**(함정 31번) 부정 시험
        **5건이 전부 멈추고 롤백**된다 · 멱등 확인(2회차 0칸) · 🟢 **거짓 ❌ 0건**)
  ——   견적관리 전화응대 매뉴얼 (차수 없음)  ✅ 완료 (PR #179 merge `4bc1c76` —
        🔴 **DB 변경 있음**(마이그레이션 1건 · `_migrations` **44 → 45행**) · 신규 의존성 0 ·
        화주포털 0줄 · 공개 화면 0줄 · 랜딩 0줄 · `lib/legal/` 0줄 ·
        `globals.css` **순수 추가**(+231 / −0) · 파일 **6개** · **+903 / −12** ·
        실사용 리뷰 라운드 **0**. 🔴 **차수를 소비하지 않았다.**
        사용자 요청 *"견적관리에서 전화응대 메뉴얼 창이 있으면 좋겠다. 자동계산결과 창아래
        따로 창이 있어서 마찬가지로 스크롤 따라 가게(모바일버전은 생략). … 줄칸을 늘릴수
        있고 줄일수 있게 설정. 줄칸 앞에 넘버링만 있으면 된다"* ·
        🔴 **사용자 확정 「전 직원 공유 · 관리자만 편집」**(「직원마다 자기 것」을 안 골랐다) ·
        🚨 **쓰기 정책을 아예 안 만들었다 — 이것이 안전 구조다.** 읽기만 RLS 정책
        (`staff_read_call_script` · 조건은 **`public.is_active_staff()`**)을 열고 쓰기는
        service_role 저장 API 뿐이다. 🔴 **insert/update/delete 정책을 만들지 말 것**
        (만드는 순간 `staff` 가 콘솔에서 통째로 갈아엎는다) · 🔴 **`is_active_staff()` 를
        빼지 말 것**(화주도 `authenticated` 라 화주가 내부 매뉴얼을 읽는다) ·
        🔴 **행은 하나뿐이다**(`id boolean primary key` + `check (id)`) — 원칙 40번의
        「가장 최근 1행」 방식이 PR #136 에서 3행이 되며 겪은 사고를 구조로 막았다.
        **여러 행으로 열지 말 것** · 🔴 **줄 목록은 jsonb 배열**(행으로 두면 `sort_order`
        재정렬 + 저장이 쪼개져 절반만 반영된다) ·
        🔴 **넘버링을 저장하지 말 것 — CSS 카운터다**(적어 두면 줄 하나 지울 때마다
        아래 번호를 사람이 고친다) ·
        🔴 **sticky 를 계산 카드에서 `.quote-side` 로 올렸다** — 형제 둘을 같은 `top` 으로
        각각 sticky 로 두면 **서로 겹친다.** 되돌리지 말 것 · `align-self: start` 를 빼지 말 것 ·
        🔴 **안에서 스크롤하는 것은 매뉴얼 목록뿐**(전체를 스크롤시켰더니 계산 결과가
        화면 밖으로 밀렸다 — 렌더링해서 발견). `min-height: 0` 셋이 한 벌이다 ·
        ⚠️ **폼이 접혀 있으면 안 따라온다 — 고장이 아니다**(sticky 는 자기 격자 칸 안에서만
        움직인다 · 접힘은 따라갈 거리가 −470px · 펼치면 900px). **계산 패널도 전부터 같았다** ·
        🚨 **`lib/callScript.ts` 에 `lib/supabaseClient` 를 들이지 말 것** — 넣었더니
        `next build` 가 *"Failed to collect page data"* 로 멈췄다(PR #151 과 같은 자리) ·
        🔴 **덮어쓰기 경고(409)를 빼지 말 것**(원칙 28번과 같은 결) ·
        🔴 **모바일은 CSS 로만 감춘다**(≤700px — `.desktop-only` 의 760px 이 아니다) ·
        🟢 로컬 Postgres 16 복제 · 부정 시험 **5건이 전부 의도한 단언에서 멈추고 롤백** ·
        ⚠️ **그중 둘은 처음에 엉뚱한 단언이 걸렸다**(PR #178 의 교훈과 같은 자리) ·
        🚨 **단언 하나가 되돌림을 「10줄인가」로 재서 2회차에 멀쩡한 DB 를 멈춰 세웠다** —
        시험 직전 값과 견주도록 고쳤다. **마이그레이션 단언에 고정 숫자를 쓸 때는
        「재실행 시점에도 그 숫자인가」를 볼 것** · 🟢 멱등 확인 · 프리렌더 **46**(항목 diff 0) ·
        ⚠️ 거짓 ❌ 2건(둘 다 내 측정 — `::before` 의 `content` 는 `counter(cs)` 문자열
        그대로 나온다 · sticky 를 900px 스크롤로 쟀다))
  ——   기업고객 리워드 1차 · 내부 기반 (차수 없음)  ✅ 완료 (PR #180 merge `f322f7d` ·
        커밋 **13개**(조사 3 · A·B·C 장 3 · 문서 1 · **실사용 리뷰 6**) ·
        🔴 **DB 변경 있음**(마이그레이션 **2건** · `_migrations` 45 → **47행**) ·
        신규 의존성 0 · 화주포털 0줄 · 공개 화면 0줄 · 랜딩 0줄 · 문자 0줄 · `lib/legal/` 0줄 ·
        `globals.css` **순수 추가**(+144 / −0) · 파일 **28개** · 프리렌더 46 → **47** ·
        실사용 리뷰 **5라운드 13건**. 🔴 **차수를 붙이지 않았다**(로드맵의 「다음 = 24시콜 ⓑ」와
        번호가 부딪히지 않게 — 지시서가 그렇게 정했다).
        직접 영업한 기업 화주에게 운임 **공급가액의 5%**를 적립하는 **선택형** 프로모션이고
        1차는 **내부 기반만**이다(포털·문자·사용은 2·3차) ·
        🔴 **코드를 열기 전에 운영 DB 를 쟀고 그것이 설계를 바꿨다**(`_verify.sql` **㉜** 신설) —
        부가세 구분은 **정산까지 승계되고 포함가 건이 2건 실재**(그대로 5%를 걸면 과다 적립) ·
        현장 추가비는 **구조상 섞이지만 지금 0행** · 건별 입금확인은 **화면이 아니라 서버
        라우트** · 월정산 DB 함수는 **고칠 필요가 없다** ·
        ⚠️ **활성 화주는 7건이 아니라 3건**이고 🔴 **「활성」은 단일 값이 아니라
        `ACTIVE_CUSTOMER_STATUSES` 여섯 값의 집합**이다(`status='활성'` 로 재면 0이 나온다 —
        내 쿼리가 틀렸다) · ⚠️ **`broker + per_order` 가 0건**이라 지금 도는 것은 묶음 쪽뿐이다 ·
        🔴 **표 셋 다 RLS on + 정책 0개**이고 서버 라우트 다섯이 유일한 통로다(화주와 직원이
        **둘 다 `authenticated` 롤**이라 정책을 열면 화주가 남의 회사 적립금을 읽는다) ·
        ⚠️ **`public.is_active_staff()` 라는 길이 있는데 일부러 안 썼다**(돈 데이터 + 그 함수
        실전 이력이 이틀치) — **그 사유를 지우지 말 것** ·
        🔴 **잔액 컬럼을 만들지 않았다** — 원장 합계의 **표시 시점 계산**이다(`outstanding_amount`
        가 스냅샷이라 선착불 화주가 영영 안 고쳐졌던 사고 · 36차 C장) ·
        🚨 **중복 적립의 최종 방어선은 DB UNIQUE** 이고 위반(`23505`)은 「이미 적립됨」이라
        조용히 넘어간다. 🔴 **화면·서버에서만 막지 말 것** ·
        🔴 **`source_id` 에 FK 를 걸지 않았다 — 지시서와 다른 판단이다**(다형 참조라 FK 자체가
        불가능하고, 없는 편이 `set null` 보다 강하다 — 정산을 지워도 `source_id` 가 남아
        **UNIQUE 가 계속 막는다**. `set null` 이면 그 순간 **재적립이 가능해진다**) ·
        🔴 **설정 넷이 각각 독립**이고(`enabled`·`portal_visible`·`reward_method`·
        `sms_notification_enabled`) **둘은 1차에서 아무도 안 읽는다**(2차용 — 화면에
        「2차 작업 후 동작합니다」를 붙였다). 🔴 **「안 쓰이니 지우자」로 지우지 말 것** ·
        🔴 **`enabled = false` 는 「신규 적립 중단」**이고 기존 적립금을 없애지 않는다 ·
        🚨 **트리거가 둘**이다(건별 `payment_received` · 월정산 묶음 `paid`) —
        🔴 **월정산도 원장은 운송건별**이고 묶음 한 줄짜리를 만들지 말 것 ·
        🔴 **묶음 항목 조건(`released_at is null`)은 DB 함수가 쓰는 것과 같아야 한다** ·
        🔴 **해제 = 회수**이고 원본 적립행은 남으며 **재적립은 수동 조정으로만** 된다 ·
        🔴 **지시서의 「브라우저가 부르니 `await` 하지 말라」를 뒤집었다** — 입금확인이 이미
        서버 라우트를 거치고, 서버리스 함수는 응답 뒤 **얼어붙어서** fire-and-forget 이면
        **적립이 아예 안 나간다**(3초 상한 + `await` · 절대 던지지 않는다) ·
        🔴 **적립 실패가 입금확인을 막지 않는다** — 정산 상세의 **읽기 전용 한 줄**이 실패를
        보여주고 **그 줄에 버튼을 만들지 말 것**(수동은 화주 상세의 「수동 조정」) ·
        ⚠️ **그 화면은 저장하면 목록으로 나가므로 적립이 실패했을 때만 머무르게** 했다 ·
        🔴 **적립 기준은 기본 운임 공급가액 하나**다(`splitVat` · 요율은 캠페인에서 읽고
        `earn_rate_snapshot` 에 남긴다) — 🔴 **1.1 로 직접 나누지 말 것** ·
        🚨 **리뷰 5라운드가 확정 셋을 뒤집었다 — 아래 요약 블록을 반드시 볼 것** ·
        🚨 **선착불이 「제외」에서 「포함」으로 뒤집혔다**(2026-09-21 · 시점 = 주선수수료 입금 ·
        금액 = 운임 전체). ⚠️ **1차 착수 때의 제외 근거**(「기준이 될 금액과 시점이 존재하지
        않는다」 · HANDOFF §5-12)**를 읽고 되돌리지 말 것** — `lib/rewardCalc.ts` 머리말에
        그 이력을 남겨 뒀다. 🔴 다만 **「부담이 크다」로 적지 말 것**은 그대로 유효하다 ·
        🚨 **선착불 운임은 저장된 부가세 구분을 보지 않는다**(2026-09-21 · 적힌 금액이 곧
        운임이다 — 🔴 `broker` 로 넓히지 말 것 · 🔴 `rewardBaseAmount` 호출부에서
        `collectionMethod` 를 빼면 **조용히 옛 동작으로 떨어진다**) ·
        🚨 **적립 단위가 같은 날 두 번 바뀌었다** — 1원 절사 → 100원 → **10원**.
        🔴 **되돌리지 말 것**(100원은 월 정산에서 실제로 100원을 깎았다) ·
        🟢 로컬 Postgres 16 복제 + 부정 시험 **5건이 전부 의도한 단언에서 멈추고 롤백** ·
        **PostgREST 만 흉내낸 목을 진짜 DB 위에 얹어** 컴파일한 원본을 그대로 돌렸다
        (UNIQUE·CHECK 는 DB 가 막는다) · 전수 20만 건 계산 어긋남 0 · 프리렌더 항목 `diff` ·
        ⚠️ **거짓 ❌ 1건은 내 시험 자산 결함**(Playwright 는 **나중에 등록한 route 가 먼저**
        걸리는데 넓은 `**/rest/v1/**` 를 뒤에 둬 `staff_accounts` 를 덮었다 — PR #173 과 같은 자리) ·
        ⚠️ **함정 10번 아홉·열 번째**(완료조건 grep 이 내 주석의 `0.05`·`/ 1.1` 에 걸렸다) ·
        🚨 **사용자 몫 — 원장 3행이 옛 부가세 기준으로 굳어 있다**(merge 시점에 정정 전 ·
        중간 판본 Preview 에서 버튼을 눌러 8,300원으로 쌓였고 지금 기준은 9,000원이다).
        🔴 **다시 눌러도 안 바뀌고**(UNIQUE) **원장은 append-only** 라, 화주 상세의
        **수동 조정 `+700`** 이 경로다 ·
        🚨 **이벤트 안내 페이지를 고치기 전에는 링크를 보내지 말 것**
        (「별도 신청 없이 자동 적립」이라 적혀 있는데 실제는 **선택된 기업만**이다 ·
        표시광고법 제3조 · HANDOFF §5-3) · 🚨 **세무사·변호사 확인**(운임 할인 = 매출 에누리 /
        상품권 = 접대비·판촉비 · **포인트는 회사 귀속인데 상품권 실물은 담당자 개인이 받는다** ·
        충당부채) — **검수 지점 아홉 → 열하나** · 🟢 자세한 것은 **HANDOFF §5-27**)
  ——   기업고객 리워드 2차 · 화주포털 + 문자 (차수 없음)  ✅ 완료 (PR #181 merge `6fd237e` ·
        커밋 **7개** · 파일 **23개** · 🔴 **DB 변경 있음**(마이그레이션 1건 ·
        `_migrations` 47 → **48행**) · 신규 의존성 0 · 랜딩 0줄 · `lib/legal/` 0줄 ·
        `globals.css` **순수 추가**(+90 / −0) · 프리렌더 47 → **48** ·
        실사용 리뷰 **1라운드(방향 전환 1건)**. 🔴 **차수를 붙이지 않았다**(1차와 같은 취급).
        사용자 확정 **「1,2,3 문자안내까지 / 적립내역까지 / 조사해서 바로 진행」** —
        🔴 **지시서 없이 진행한 차수다** ·
        🔴 **코드를 열기 전에 운영 DB 를 쟀고 그것이 DB 변경을 만들어 냈다**(`_verify.sql` ㉞) —
        🚨 **`sms_logs` 는 `template_type` 뿐 아니라 `related_type` 에도 CHECK 가 있었다**
        (처음엔 `template_type` 만 보고 있었다). 코드를 먼저 올리면 **문자는 나가는데
        이력만 조용히 안 남는다**(`sendSmsWithLog` 는 안 던져 화면에 증상이 0) ·
        🔴 **폐지 두 종을 목록에서 빼지 않았다**(4 → 5 · 9 → 10) ·
        🚨 **마이그레이션 `allowed` 배열은 「최종 목록」이어야 한다** — 옛 목록으로 뒀더니
        재실행 때 **자기가 넣은 값을 「모르는 값」으로 보고 멈췄다**(PR #179 와 같은 교훈) ·
        🚨 **리뷰가 방향을 뒤집었다 — 문자는 자동이 아니다**(사용자 물음
        *"merge하면 문자가 확인절차 없이 자동으로 바로 나가나?"* → **「확인창을 붙인다」**).
        그대로 뒀으면 **이 시스템에서 사람 확인 없이 나가는 유일한 문자**가 됐다 ·
        🔴 **`sendSmsWithLog` 를 `lib/rewardNotify.ts` 에 다시 들이지 말 것** ·
        🔴 **창이 떠 있는 동안 목록으로 나가지 않는다**(`afterSmsRef`) ·
        🔴 **`RELATED_TYPES` · `SmsPreview.relatedType` · DB CHECK 셋이 같아야 한다** ·
        🔴 **`portal_visible` 이 꺼져 있으면 메뉴·홈 카드·금액이 통째로 없다** —
        「0원」이나 참여 안내를 띄우지 말 것(**선택된 기업만** 참여한다 · 표시광고법 제3조) ·
        🔴 **회수·조정 줄도 보여주되 사유(`description`)는 안 준다**(실측에 적립합 8,300 +
        조정 700 = 잔액 9,000 이 이미 있어, 적립 줄만 주면 **목록 합과 잔액이 안 맞는다**) ·
        🟢 **전 과정 실제 발송 0통** · 시험 31 + 6 + 17 + 18 + 12건 ·
        ⚠️ **거짓 ❌ 넷 — 전부 내 측정이 틀렸다**(포털 저장 키가 `customer-portal-auth` ·
        `<textarea>` 는 `inputValue()` · 입금일 칸 · `resolveSmsSender()` 가 터진 것은
        **코드를 고쳤다**) · 🟢 자세한 것은 바로 아래 요약)
  ——   기업고객 리워드 3차 · 예상 적립금 + 리워드 안내 문자 (차수 없음)  ✅ 완료
        (PR #182 merge `0ba72f6` · 커밋 **9개** · 파일 **23개** ·
        🔴 **DB 변경 있음**(마이그레이션 **2건** · `_migrations` 48 → **50행**) ·
        신규 의존성 0 · 랜딩 0줄 · `lib/legal/` 0줄 · `globals.css` **순수 추가**(+47 / −0) ·
        프리렌더 **47**(항목 diff 0) · 실사용 리뷰 **1라운드(방향 전환 1건)**.
        🔴 **차수를 붙이지 않았다**(1·2차와 같은 취급).
        🚨 **리뷰 한 줄이 채널의 주종을 뒤집었다** — *"기본적으로 화주포털에는 리워드
        상황을 노출안하는 경우가 많을 것 같다. … 그래서 문자로 현 리워드 상황을
        알려주는게 중요하다."* **포털이 주**이던 것이 **문자가 주**가 됐고 포털은
        원하는 화주에게만 켜 주는 선택지다. 🔴 **앞으로 「포털에서 보면 되니까」로
        문자를 줄이지 말 것** ·
        🚨 **그래서 결함 하나가 드러났다** — 적립·차감 문자가 둘 다 「운송관리에서
        적립 내역을 확인하실 수 있습니다」로 끝나는데 **`portal_visible` 이 꺼진
        화주에게는 그 메뉴가 아예 없다**(없는 화면을 찾아가라는 말이었다).
        `portalLine()` 한 곳으로 모아 **켜진 화주에게만** 적고 🔴 **기본값은
        「안 붙인다」**(인자를 안 넘긴 호출부가 생겼을 때 거짓말이 아니라 **말을
        아끼는 쪽**으로 떨어져야 한다) ·
        🚨 **코드를 열기 전에 운영 DB 를 쟀고 그것이 설계를 두 번 정했다**
        (`_verify.sql` **㉟** 신설) — **포털 노출이 켜진 유일한 화주가 정산 13건이
        전부 미입금인 월정산 화주**이고 원장이 0행이었다(그 화주가 화면을 열면
        **0원만 보인다** — 사용자 지적 그대로) · `reward_ledger` 에 **「사용·차감」
        유형도 「어디에 썼는가」 칸도 없었다** ·
        🔴 **예상을 `balance` 에 더하지 않는다**(원칙 47번과 같은 결) · **못 셌으면
        `null` 이고 줄을 안 그린다**(원칙 55번) · **「예정」을 빼지 말 것** ·
        🚨 **`description` 을 쓰지 않았다** — 2차가 「화주에게 절대 주지 않는다」고
        못박은 내부 메모다. **`reward_ledger.customer_note`**(화주에게 보이는 한 줄)를
        신설했고 🔴 **두 칸을 합치지 말 것** ·
        🔴 **`transaction_type` 에 `use` 를 추가하지 않았다**(운임 할인/상품권이
        미결이라 지금 늘리면 그 설계를 여기서 못 박는다) ·
        🚨 **새 문자 `reward_status`(적립 현황 안내)가 두 자리에 있다** — 화주 상세의
        **수동 버튼**(🔴 **관리자 전용 블록 밖**)과 **배차 운송완료 확인창**(월정산
        화주가 건건이 받는다) · 🔴 **`autoCreateInvoiceIfNeeded` 뒤여야 한다**(순서를
        바꾸지 말 것) · 🔴 **2026-09-18 에 폐지한 상차·하차완료 문자와 다른 것이다**
        (그것은 운송 상태 안내, 이것은 적립 안내) ·
        🔴 **`reward_earned`(쌓였다)와 합치지 말 것** · 🔴 **`enabled` 가 꺼지면 안
        만든다**(적립 안내는 반대로 `enabled` 를 안 본다 — **둘을 같게 만들지 말 것**) ·
        🔴 **「현재 적립금」은 0원이어도 적는다** · **알릴 숫자가 하나도 없으면 안 만든다** ·
        🔴 **브라우저 통로는 `lib/notifyRewardSms.ts` 하나**(부르는 화면이 셋) ·
        🔴 **`dispatch_id` 를 받으면 화주도 정산 건도 서버가 다시 조회한다**(원칙 53번) ·
        **`.maybeSingle()` 을 쓰지 말 것**(원칙 48번) ·
        🚨 **`lib/rewardCampaign.ts` 신설(의존성 0)** — `loadActiveCampaign` 이
        `getCurrentStaff()` 를 들이는 파일 안에 있어 화주 라우트가 `previewRewards` 를
        쓰면 직원 인증 코드가 딸려 들어왔다. 🟢 옛 이름은 재수출로 그대로 쓴다 ·
        🟢 로컬 Postgres 16 복제 · 부정 시험 **8건이 전부 의도한 단언에서** 멈추고 롤백 ·
        시험 **105건** · **실제 발송 0통** ·
        ⚠️ **렌더링이 결함을 둘 잡았다**(홈 카드 「원원」 · 차감 줄의 같은 말 두 번) ·
        ⚠️ **거짓 ❌ 6건 — 전부 내 측정이 틀렸다**(주석이 내 grep 에 걸린 것 2 ·
        **Playwright 가 나중에 등록한 route 를 먼저 거는 것 2** — PR #180 과 같은 자리) ·
        🟢 자세한 것은 바로 아래 요약)
  ——   리워드 — 「운송완료 확인창」만 따로 끄는 스위치 (차수 없음)  ✅ 완료
        (merge `da05bae` · 🔴 **DB 변경 있음**(마이그레이션 1건 · `_migrations` 50 → **51행** ·
        🚨 **`apply` 를 merge 전에 끝냈다**) · 신규 의존성 0 · 화주포털 0줄 · 공개 화면 0줄 ·
        랜딩 0줄 · `lib/legal/` 0줄 · **배차 상세·목록 0줄** · `globals.css` **순수 추가**(+16 / −0) ·
        파일 **7개** · **+137 / −10** · 프리렌더 **48**(항목 diff 0) · 실사용 리뷰 라운드 **0**.
        🔴 **차수를 소비하지 않았다.** 3차(PR #182)가 보고하고 답을 못 받은 채 남겨 둔 항목이다.
        사용자 요청 *"운송완료 확인창만 따로 끄는 스위치 만들어줘."* ·
        🚨 **「문자를 보내는가」가 아니라 「무엇이 창을 띄우는가」를 갈랐다** — 부모는 그대로
        `sms_notification_enabled` 이고 신설한 **`sms_on_delivery_enabled`** 는 그 아래
        **운송완료 자리 하나만** 끈다(부모가 꺼지면 자식과 무관하게 셋 다 안 나간다) ·
        🔴 **화주 상세의 수동 「적립 안내 문자」 버튼은 이 칸을 보지 않는다** — 끈 뒤에도
        담당자가 보낼 수 있어야 한다. **수동 버튼에 이 칸을 걸지 말 것** ·
        🔴 **기본값이 `true` 다**(설정 넷과 반대) — 실측(`_verify.sql` ㉞-a)에 **세 화주가 전부
        문자 안내를 켜 두고 있어서**, 기본을 끔으로 두면 **아무도 끄지 않았는데** 세 화주의
        운송완료 안내가 조용히 멈춘다. ⚠️ 그중 하나는 **포털 계정이 0개**라(㉞-b) 그 화주에게는
        문자가 유일한 창이다(3차의 「문자가 주다」). 🔴 **「번거로우니 기본을 끄자」로 뒤집지 말 것** ·
        🔴 **저장 API 도 `!== false` 다** — 🔴 `=== true` 로 바꾸지 말 것(이 칸을 모르는 요청
        하나가 그 화주를 꺼 버린다) ·
        🔴 **`trigger` 는 필수 인자이고 서버가 판정한다** — 요청 바디에서 받지 않는다(화면이
        「수동」이라 주장하면 꺼 둔 창이 되살아난다 · 원칙 30·53번). **선택 인자로 두지 말 것**
        (새 호출부가 빠뜨리면 **조용히 옛 동작으로 떨어진다** — PR #180 의 `collectionMethod`
        와 같은 자리). 🟢 그 덕에 **배차 상세·목록 두 화면이 한 줄도 안 바뀌었다** ·
        🚨 **DB 가 코드보다 먼저다** — 반대면 없는 컬럼이 select 에 실려 42703 이 나고,
        `buildRewardStatusSmsPreview` 는 통째로 try/catch 라 **확인창이 아예 안 뜬다** ·
        🟢 관문 진리표 **11건**(부모 × 자식 × 부른 자리 전수 + 멤버십 행 없음 + 「컬럼 없는 DB」) ·
        구조 단언 **21건** · 렌더링 **12건**(읽기 전용 ON/OFF/— 세 상태 · 체크박스 활성·기본값·
        안내문·흐리게 · 390/1280px 가로 넘침 0) ·
        ⚠️ **거짓 ❌ 2건 — 둘 다 내 시험이 틀렸다**(`{...null}` 이 빈 객체라 「멤버십 행 없음」이
        **기본 행으로 둔갑**한 것 · 같은 문구가 체크박스 라벨과 읽기 전용 행에 하나씩 있는 것을
        통째로 세서 2가 나온 것 — **함정 10번과 같은 자리**) ·
        🟢 **곁다리 — `_verify.sql` ㉞-e 의 기준선이 낡아 있었다**(「48이어야 한다」인데 실측 50).
        🔴 **살아 있는 기준선은 마지막 절 하나만 보도록 고쳤다** — 두 곳에 적으면 반드시 한쪽이 낡는다 ·
        ⚠️ **프리렌더 실측이 48 이다** — 3차 기록의 「47」과 다르다. `origin/main` 도 48 이라
        **이번 변경 때문이 아니다**(항목 diff 0). 🔴 **47 을 근거로 무엇이 줄었다고 읽지 말 것** ·
        🟢 자세한 것은 **HANDOFF §5-27**)
  ——   리워드 — 「미적립 건」 탭 (차수 없음)  ✅ 완료 (merge `60c8fd1` ·
        🟢 **DB 0** · 마이그레이션 0 · `_migrations` **51행 그대로** · 신규 의존성 0 ·
        화주포털 0줄 · 공개 화면 0줄 · 랜딩 0줄 · 문자 0줄 · 배차 0줄 ·
        `globals.css` **순수 추가** · 프리렌더 **48**(항목 diff 0) · 실사용 리뷰 라운드 **0**.
        🔴 **차수를 소비하지 않았다.** 3차(PR #182)가 「다음에 할 일」로 남긴 마지막 항목이다.
        사용자 요청 *"미적립 건 목록도 만들어줘."* ·
        🚨 **적립은 「입금 체크가 바뀌는 순간」에만 나서**, 그 순간을 놓친 건과 관문에 걸린
        건은 **원장이 비어 있는데 화면에 증상이 0**이었다. 🔴 **그보다 나빴던 것은
        `previewRewards` 가 내던 `reason` 이 화면 어디에도 안 그려지고 있던 것이다** ·
        🔴 **세 갈래로 가른다 — 한 숫자로 합치지 말 것**:
        **입금 대기**(아직 입금 전 · **정상**) / **적립 가능**(입금됐는데 원장에 없음 ·
        소급 대상) / **대상 아님**(관문에 걸림 · 입금돼도 영영 안 쌓인다).
        ⚠️ 실측(`_verify.sql` **㊱-b** 신설)상 지금 미적립 **13건이 전부 「입금 대기」**이고
        **조용히 막힌 건은 0건**이라, 합쳐 세면 「미적립 13건」이 **사고처럼 읽힌다** ·
        🔴 **주의가 필요한 것을 맨 위로 정렬한다**(날짜순으로만 늘어놓으면 봐야 할 한 줄이 묻힌다) ·
        🔴 **판정을 두 벌로 만들지 않았다** — 소급(`findUnaccruedPaid`)과 목록(`findUnaccrued`)이
        **같은 `scanUnaccrued()`** 를 쓴다(갈라 짜면 「목록엔 적립 가능인데 소급 버튼이 안 잡는」
        상태가 난다 · 원칙 51번). 소급은 그 결과를 `receipt_confirmed && !reason` 으로 거를 뿐이다 ·
        🔴 **사유 라벨 정의처를 `lib/rewardCalc.ts` 로 올렸다**(`REWARD_SKIP_REASON_LABEL`) —
        2026-09-22 까지 **`components/InvoiceRewardLine.tsx` 안에만** 있었다.
        🔴 **화면 파일에 다시 적지 말 것**(두 벌이 되면 같은 사유가 화면마다 다른 말이 된다) ·
        🔴 **읽기 전용 라우트다** — 목록을 여는 것만으로 돈이 움직이면 안 된다.
        **적립 버튼을 만들지 말 것**(소급은 관리자 전용 한 곳뿐) ·
        🚨 **곁다리 ① 원장 조회 `.in()` 에 uuid 가 최대 500개 실렸다**(URL 18KB → 414 위험).
        414 가 나면 **「원장에 없다」로 읽혀 멀쩡히 쌓인 건이 소급 대상으로 뜬다.**
        100개씩 나눠 묻게 고쳤고 🔴 **`.in()` 을 빼고 캠페인 전체를 읽는 쪽으로 바꾸지 말 것**
        (기본 1,000행 상한에 **에러 없이** 잘려 같은 증상이 조용히 난다) ·
        🚨 **곁다리 ② 리워드 관리 네 탭이 390px 에서 페이지를 밀고 있었다**
        (기업별 현황 **313px** · 이력 43px · 새 탭 201px — 제목과 탭까지 옆으로 밀려 나갔다).
        `.reward-tablewrap`(overflow-x: auto)을 네 탭에 붙여 **전부 0px**.
        ⚠️ **응급 처치다** — 제대로 하려면 모바일을 카드로 따로 그려야 한다(원칙 13번) ·
        🟢 단위 **21건**(세 갈래 전수 + 소급이 **리팩터링 전과 같은 것만** 잡는가 + 청크 3회) ·
        구조 단언 **19건** · 렌더링 **11건**(정렬 · 사유 문구 · 막힌 건은 **0원이 아니라 「—」** ·
        **「0건」과 「못 불러왔다」가 다른 말인가** · 390/1280px 넘침 0) ·
        ⚠️ **거짓 ❌ 5건 — 전부 내 시험이 틀렸다**(목에 `dispatches` 표 누락 · 멤버십 목에
        `campaign_id` 누락으로 **전부 not_member 로 둔갑** · 🚨 **선착불 적립액을 5,000 으로
        기대한 것**(선착불은 **저장된 부가세 구분을 안 본다** — 5,500 이 맞다 · 2026-09-21 확정) ·
        잘못 쓴 shell 식 · **내 주석이 내 grep 에 걸림** — 함정 10번, 이 세션 세 번째) ·
        ⚠️ **탭 두 개가 활성처럼 보여 의심했는데 클래스를 재 보니 하나뿐이었다**(내 눈이 색을
        잘못 읽었다) — 🔴 **화면을 눈으로 판정하지 말고 재라**)
  ——   리워드 — 운임 할인 적용 (차수 없음)  ✅ 완료 (merge `9307790` ·
        🔴 **DB 변경 있음**(마이그레이션 1건 · 원장 유형 3 → **4종**(`freight_discount`) ·
        `invoices.reward_discount_amount` 신설 · `_migrations` 51 → **52행** ·
        🚨 **`apply` 를 merge 전에 끝냈다**) · 신규 의존성 0 · 랜딩 0줄 · 공개 폼 0줄 ·
        `lib/legal/` 0줄 · 문자 **문구** 0줄 · 배차 화면 0줄 · 묶음 라우트 0줄 ·
        `globals.css` **순수 추가**(+71 / −0) · 파일 **12개** · **+1,253 / −7** ·
        프리렌더 **48**(`origin/main` 워크트리와 항목 diff 0) · 실사용 리뷰 라운드 **0**.
        🔴 **차수를 소비하지 않았다.** 1차가 `reward_method = 'freight_discount'` 를 저장만 하고
        **읽는 코드를 0건**으로 남겨 둔 자리다. 사용자 요청 *"운임 할인 적용도 만들어줘."* ·
        🔴 **코드를 열기 전에 운영 DB 를 쟀고 그것이 설계를 정했다**(`_verify.sql` **㊲** 신설) —
        ⓐ **지금 쓸 수 있는 화주가 0명**(잔액 9,000 / 0 / 0 · 최소 사용액 50,000)
        ⓑ **선착불 3건에는 걸 수 없다**(화주가 차주에게 직접 내서 **위캐리가 끊는 청구서가 없다**)
        ⓒ **월정산 묶음 스냅샷 함수 둘이 `customer_charge_total` 만 읽는다**(둘 다 저장소 밖) ·
        🚨 **그래서 `customer_charge_total` 자체를 「깎은 뒤 금액」으로 뒀다 — 이것이 이 차수의 전부다.**
        할인은 **화주가 낼 돈을 바꾸는데** 금액을 보여주는 자리가 **여덟 곳이 넘어서**(관리자 목록·상세 ·
        포털 정산확인·홈·월별통계 · 대시보드 · 미수금 · 월정산 묶음) 한 곳만 빠뜨리면 **화면마다
        금액이 갈린다**(36차 C장 미수금 신고가 정확히 그 모양이었다). 🟢 이 방식이면 읽는 자리가
        **저절로 전부 맞고 저장소 밖 묶음 DB 함수 둘을 한 글자도 안 고쳐도 된다**(로컬에 그 함수를
        그대로 떠다 놓고 스냅샷이 1,100,000 → **1,045,000** 으로 따라오는 것을 확인했다) ·
        🔴 **깎기 전 금액은 `+ reward_discount_amount` 로 언제든 돌아온다** ·
        🔴 **원칙 47번을 어기는 것이 아니다** — 그 원칙이 막는 것은 「나중에 생긴 **추가** 금액
        (현장 추가비)을 스냅샷에 섞는 것」이고 이것은 담당자가 사유를 적고 내리는 **청구 금액 결정**
        이다(35차 A-7 과 같은 결 · 사유 필수 · `invoice_amendment_logs` 기록 · 확정 건 차단).
        🔴 **이 판단을 근거로 「추가비도 스냅샷에 넣자」로 넓히지 말 것** ·
        🚨 **그래서 `resync` 에 한 줄이 필요했다** — 그 라우트는 배차 값으로 그 컬럼을 **다시 쓴다.**
        그대로 뒀으면 **재동기화가 할인을 조용히 지워** 원장에는 「썼다」가 남고 청구서만 제값으로
        돌아갔다(**화면에 증상 0**). 🔴 **같은 커밋에서 고쳤다 — 떼어 놓지 말 것** ·
        🔴 **마진도 깎은 뒤 금액으로 센다**(할인은 매출 에누리이고 화면의 표시 시점 마진도 그 컬럼을 읽는다) ·
        🔴 **원장은 그대로 append-only** — 처음은 `freight_discount` 한 줄(−금액) · 고칠 때는 그 줄을
        두고 **차액만큼 `adjustment` 한 줄**. 부분 UNIQUE 에 `transaction_type` 이 들어 있어
        **한 정산 건에 할인 한 줄**이 저절로 강제되고, `adjustment` 는 `source_type='manual'` 이라
        그 색인에서 빠져 **몇 번이고 고칠 수 있다**(무엇을 언제 얼마로 바꿨는지가 줄로 남는다) ·
        🔴 **`enabled = false` 가 막지 않는다** — 그 칸은 「신규 적립 중단」이고 이미 쌓인 적립금을
        못 쓰게 하는 칸이 아니다. **되돌리지 말 것** ·
        🔴 **관문은 늘릴 때만 전부 본다** — 해제·감액이 잔액·최소사용액에 걸리면 잘못 건 할인을
        **영영 못 되돌린다**(잠금·확정 묶음만 양쪽 다 막는다) ·
        🔴 **확정 묶음은 막고 draft 는 통과시킨다** — 통과시킨 뒤 서버가 `refresh_item_snapshot` 을
        부른다(저장소 밖 함수를 **고치지 않고 조합해 쓴다** · §5 의 지침) ·
        🔴 **깎은 뒤 금액이 0 보다 커야 한다**(1원은 남긴다) — 0 이면 `is_billing_batch_candidate` 가
        그 건을 **묶음 후보에서 빼 버린다** ·
        🔴 **적립은 깎은 뒤 금액의 5%** — 할인은 **입금 전에만** 걸 수 있고 적립은 입금 확인 때 나므로
        순서가 엇갈릴 일이 없다. **`rewardBaseAmount` 에서 할인을 도로 더하지 말 것**(깎아 준 돈에
        적립까지 붙으면 같은 돈이 두 번 혜택이 된다) ·
        🔴 **세금계산서는 자동으로 안 바꾼다**(사용자 확정) — 대신 화면이 그 사실과 깎은 뒤 금액을 적는다 ·
        🚨 **문자는 자동이 아니다** — 서버는 차감 안내 **문구만** 만들고 담당자가 확인창에서 [발송]을
        눌러야 나간다(2차 확정) · 🔴 **`sendSmsWithLog` 를 라우트에 들이지 말 것** ·
        🔴 **포털 적립내역에 `discount`(운임 할인) 갈래를 새로 뺐다** — 「차감」과 섞이면 회수·착오
        보정과 구분이 안 된다 · 🔴 **포털 정산확인에 할인 줄**(데스크탑·모바일 **두 벌** · 원칙 13번) —
        안 적으면 화주는 **까닭 없이 줄어든 금액**만 본다. 🔴 **`portal_visible` 로 감추지 말 것**
        (그 칸은 「적립 현황을 보여줄까」이고 이것은 **본인 청구서의 한 줄**이다) ·
        🟢 단위 **39** · **DB 16**(로컬 Postgres 16 복제 · 적용 → 증액 → 해제 전 단계에서 청구·잔액·
        묶음 스냅샷을 전수 · UNIQUE · 확정 묶음 거절) · 마이그레이션 부정 시험(의도한 단언에서 멈추고
        롤백 · 처음엔 엉뚱한 단언에 걸려 고쳤다) · 멱등 확인 · 구조 **20** · 렌더 **33** · 포털 **10** ·
        ⚠️ **거짓 ❌ 6건 — 전부 내 시험이 틀렸다**(접두어가 더 긴 이름까지 문 grep · 이미 있던 낱말을
        안 센 것 · import 줄을 안 센 것 · **기존 주석이 내 grep 에 걸린 것**(함정 10번) ·
        🚨 **하네스가 500 인데 「블록이 없다」가 ✅ 로 나온 것** — 서버 컴포넌트에 함수 prop 을 넘겼다.
        🔴 **그래서 「하네스가 그려졌는가」를 선행 단언으로 넣었다**) ·
        🟢 자세한 것은 **HANDOFF §5-27**)
  ——   견적관리 소수정 2건 + 신규 화주 빠른 등록 창구 (차수 없음)  ✅ 완료 (PR #183 merge
        `e997196` · 🟢 **DB 0** · 마이그레이션 0 · `_migrations` **52행 그대로** ·
        🟢 **신규 의존성 0** · 화주포털 0줄 · 공개 화면 0줄 · 랜딩 0줄 · 문자 0줄 ·
        `lib/legal/` 0줄 · `globals.css` **순수 추가**(+152 / −0) · 파일 **9개** ·
        **+838 / −130** · 프리렌더 48 → **49** · 실사용 리뷰 **1라운드(1건)**.
        🔴 **차수를 소비하지 않았다.** 사용자 요청 세 줄을 한 PR 로 묶은 것이다 ·
        **① 차량 형태 설명** — 마우스를 올리면(`title`) + 고른 뒤 칸 아래 한 줄로
        **두 겹**이다(모바일에는 hover 가 없어서 한 겹만으로는 안 보인다).
        🔴 **정의처는 `lib/vehicleBodyTypes.ts` 의 `BODY_TYPE_INFO` 하나**이고 화면에
        다시 적지 말 것 · 🔴 **26종을 다 적었다**(견적 12 + 차주 14) — 모르는 차종이면
        **빈 문자열이고 줄을 안 그린다**(선택지에서 사라지지 않는다) ·
        🔴 **가산금액을 적지 않았다** — 값은 `rate_surcharges`(DB)가 정본이고 글에 적으면
        **담당자가 `/admin/rates` 에서 고친 순간 거짓말이 된다** ·
        🔴 **네이티브 `<select>` 를 그대로 뒀다**(원칙 57번은 **포털 한정**이다 —
        관리자에 `Pv2Select` 를 끌어오지 말 것) ·
        **② 화주 업체 검색 키보드** — ↑↓·Enter·Esc·Home/End.
        🔴 **`components/CompanySearchBox.tsx` 로 뺐다** — 견적관리와 운송오더에 **같은
        드롭다운이 복사돼 있었다**(원칙 43번과 같은 결). 프리필 로직은 화면마다 다르므로
        `onSelect` 콜백으로 그대로 남겼다 ·
        🔴 **처음엔 아무 줄도 안 짚는다(`active = -1`)** — 0 으로 두면 글자를 치는 동안
        첫 줄이 계속 반전돼 **고른 것처럼 보인다** · 🔴 **결과가 바뀌면 `-1` 로 되돌린다**
        (안 되돌리면 목록이 줄었을 때 **사라진 줄을 짚은 채로 Enter 가 눌린다**) ·
        🔴 **Enter 는 짚은 줄이 있을 때만 가로챈다** — 늘 가로채면 원칙 34번
        (`handleFormKeyDown`)이 가려진다 · 🔴 **반전은 `:hover` 가 아니라 `.is-active`**
        (키보드로 내려가는데 마우스가 놓인 줄이 같이 반전되면 어느 것이 골라질지 모른다) ·
        `role="combobox"`/`listbox`/`option` · `aria-activedescendant` — **지우지 말 것** ·
        **③ 신규 화주 빠른 등록 창구** `/admin/companies/new` — 등록 → 계정 발급 →
        상세 이동/계속 등록이 **한 화면**이다.
        🚨 **조사가 요청의 뜻을 바꿨다** — 기존 등록 폼의 상태 기본값이 **`미접촉`** 이라
        그 폼으로 넣은 화주는 **활성화주 CRM 목록에 안 뜬다**(`ACTIVE_CUSTOMER_STATUSES`
        여섯 값 밖이다). 사용자가 말한 「활성화주를 바로 등록」은 **지름길이 없던 것이
        아니라 도달할 수 없던 것**이었다. 🔴 **그래서 빠른 등록은 `견적요청`으로 넣는다** ·
        🔴 **기존 폼의 `미접촉` 기본값은 안 건드렸다** — 그 폼은 영업 대상을 쌓는 자리라
        뜻이 다르다. **둘을 같게 만들지 말 것** ·
        🔴 **항목 정의는 `lib/companyFields.ts` 하나를 그대로 쓴다**(원칙 33번 · **네 번째
        입구**다) — 키가 없으면 **던진다**(조용히 빈 칸을 그리면 저장이 반쪽이 된다) ·
        🔴 **홈 카드 격자가 아니라 제목 줄 버튼이다** — 그 파일 주석이 **카드는 4의 배수**
        라고 못박고 있어서 아홉 번째 카드를 넣으면 줄이 깨진다 ·
        **④ 실사용 리뷰 1건 — 「신규화주등록 버튼 아래에 줄은 삭제하자」**.
        🚨 **내가 만든 결함이 아니라 원래 있던 결함이다** — `.btn` 에
        `text-decoration: none` 이 없어서 **`<Link className="btn…">` 열일곱 곳**에
        브라우저 기본 밑줄이 그어져 있었다(홈에 옐로 버튼이 생기며 눈에 띈 것뿐이다).
        🔴 **`.btn` 한 곳에서 고쳤다 — 화면마다 덧칠하지 말 것** ·
        ⚠️ **눈으로는 로고에도 밑줄이 있는 줄 알았는데 재 보니 0건이었다**(SVG 아트웍이다) —
        🔴 **화면을 눈으로 판정하지 말고 잴 것**(이 세션 두 번째) ·
        🟢 tsc 0 · 렌더 **39 + 7** · 구조 **30** · 프리렌더 **49**(늘어난 항목이
        `/admin/companies/new` 하나인 것을 `diff` 로 확인 · `origin/main` 워크트리와 대조) ·
        ⚠️ **거짓 ❌ 6건 — 전부 내 시험이 틀렸다**(다섯이 **주석이 내 grep 에 걸린 것** —
        **함정 10번, 이 세션 네 번째**다. 주석 줄을 걷어내고 세는 도우미를 만들어 고쳤다.
        나머지 하나는 `COMPANY_FIELDS` 가 **에러 메시지 문구에도** 있어 3건인 것) ·
        🟢 **물음 셋이 전부 닫혔다**(사용자 확정 2026-09-22 — *"홈 카드 격자는 지금 위치 좋다.
        차량 설명문구도 적절하다. 빠른 등록 9항목 충분하다."*). **셋 다 현행 유지이고 코드 0 · DB 0** ·
        🔴 **「카드 4개를 채워 홈 격자로 옮기자」로 되살리지 말 것**(제목 줄 버튼이 확정이다) ·
        🔴 **`BODY_TYPE_INFO` 26종 문구를 「초안이니 다시 쓰자」로 갈아엎지 말 것**(실무 확인을 받았다) ·
        🔴 **빠른 등록 항목을 늘리지 말 것** — 아홉이 충분하다는 확인이다. 늘리면 「빠른」 등록이 아니게 된다)
  ——   문자 2종 추가 + 적립 이벤트 안내 페이지 신설 (차수 없음)  ✅ 완료 (PR #184 merge
        `f984f47` · 커밋 **5개**(구현 2 + 실사용 리뷰 3) · 파일 **19개** · **+1,488 / −44** ·
        🔴 **DB 변경 있음**(마이그레이션 1건 · `_migrations` 52 → **53행** ·
        🚨 **`apply` 를 merge 전에 끝냈다**) · 신규 의존성 0 · 화주포털 0줄 · 랜딩 0줄 ·
        `lib/legal/` 0줄 · 관리자 다른 화면 0줄 · `globals.css` **순수 추가**(+190 / −0) ·
        프리렌더 48 → **49** · 실사용 리뷰 **2라운드 3건**. 🔴 **차수를 소비하지 않았다.**
        사용자 요청 세 건을 한 PR 로 묶은 것이다 ·
        **① 견적 「정보 회신 요청」 문자**(`quote_info_request`) — 상·하차지 상세주소·현장
        담당자 연락처를 회신해 달라는 문자. 🔴 **큐가 아니라 별도 버튼이다** — *「보낼 수도
        있고 보내지 않을 수도 있다」*가 이 문자의 성격이라 큐로 이으면 **안 보낼 때마다
        확인창을 닫아야 한다.** 🔴 **큐 구조로 되돌리지 말 것** ·
        🚨 **제3자 개인정보를 청하는 문자라 사전 동의 안내 두 줄이 있다** — 현장 담당자는
        화주 본인이 아니고 **문자에는 체크박스를 둘 수 없어 그 줄이 유일한 고지**다(47차 선례).
        🔴 **빼지 말 것** · 🔴 **`share_token` 을 읽지도 발급하지도 않는다**(정보를 청하는
        문자인데 공유 링크가 생긴다) ·
        **② 리워드 「이용 안내」 문자**(`reward_intro`) — 화주 상세 리워드 패널의 버튼.
        🔴 **리워드 문자가 넷이 됐고 서로 다른 시점을 가리킨다 — 합치지 말 것**
        (`intro` 제도 소개 / `status` 쌓일 예정 / `earned` 쌓였다 / `deducted` 썼다) ·
        🔴 **`reward_status` 와 안 만드는 조건이 정반대다** — 저쪽은 알릴 숫자가 없으면 안
        만드는데 이 문자는 **계정 발급 직후라 잔액이 보통 0** 이다. 같은 조건을 걸면 **정작
        보내야 할 때 안 나간다**(그래서 금액을 아예 안 적는다) ·
        🔴 **관문은 `enabled` + `sms_notification_enabled` 둘뿐이고
        `sms_on_delivery_enabled` 는 보지 않는다**(그 칸은 운송완료 자리 하나만 끄는 것이다 ·
        걸면 그 스위치를 끈 화주에게 제도 소개조차 못 보낸다) ·
        🚨 **`campaign.earn_rate` 는 분수다**(`0.0500`) — 그대로 넘기면 **「0.05%」**가 찍힌다.
        🔴 **`* 100` 을 빼지 말 것** ·
        **③ 적립 이벤트 안내 페이지 `/reward-event`** — 사용자가 초안 HTML 을 주며
        *「이 페이지 참고해서 페이지 문구를 고치고 저장소안에 안내 페이지를 새로 만들자」* ·
        🚨 **초안 문구 다섯 곳이 실제 동작과 달라 고쳤다**(전부 코드로 대조) —
        「별도 신청 없이 **자동 적립**」(실제는 **선택된 고객사만** · 표시광고법 제3조) ·
        「종료 후 3개월은 50,000원 미만도 전액 사용」(그런 예외 **없음**) ·
        「**소멸 예정** 사전 안내」(원장에 `expiry` 유형이 없어 알리는 코드 **0곳**) ·
        「미납·연체 시 사용 정지」(그런 관문 없음 — 반대로 **입금 전에만** 쓴다) ·
        「**운송 취소** 시 적립 취소」(트리거는 **입금 확인의 해제**) ·
        🔴 **첫 줄이 이 페이지가 생긴 이유다** — 그 문구 때문에 직전 커밋에서 문자에 링크를
        **일부러 빼 뒀다.** 🔴 **외부 페이지 주소로 되돌리지 말 것**(문구가 고쳐졌는지 우리가
        알 수 없다) · **초안에 없어서 더한 셋**: 선착불 불가 · 입금 전에만 · 담당자가 적용 ·
        🚨 **숫자를 하드코딩하지 않고 캠페인을 읽는다 — 실측이 그 필요를 증명했다**
        (초안은 기간 시작을 `2026년 9월 1일` 로 적었는데 **DB 는 2026-08-07** 이다) ·
        🔴 **본문 정의처는 `lib/rewardEventContent.ts` 하나**(문자와 이 페이지가 같은 제도를
        설명한다 — 두 벌이 되면 한쪽만 고쳐진다) ·
        🔴 **색인하지 않는다(세 겹)** — layout `robots` · `app/robots.ts` disallow ·
        **`app/sitemap.ts` 의 `NOINDEX`**. 🚨 **셋째를 빠뜨리기 쉽다** — 그 파일은 목록을
        손으로 적지 않고 **`app/` 아래를 훑어서** 뽑으므로, `/q/[token]`(동적)과 달리
        **정적 경로는 가만히 두면 사이트맵에 실려** 「사이트맵은 실어 놓고 페이지는 색인 거부」
        라는 **서로 싸우는 신호**가 간다. 🟢 실측 사이트맵 **7개 그대로** ·
        🔴 **`TopNav` 숨김 조건에 `/reward-event`**(원칙 11번 — 빼면 화주가 문자로 받아 연
        페이지 위에 관리자 메뉴가 얹힌다) · 🔴 **서버 컴포넌트다**(`/q/[token]` 과 반대 —
        어느 화주의 정보도 담지 않는 제도 설명이다) · 🔴 **`force-dynamic` +
        `createServiceClient()` 둘 다**(원칙 21번) ·
        🚨 **화면 부품을 `page.tsx` 밖으로 뺐다 — Next 가 막는다**(`tsc --noEmit` 은 통과하고
        `next build` 만 *"RewardEventView is not a valid Page export field"* 로 멈춘다).
        🔴 **되돌리지 말 것** · 🟢 곁다리로 **하네스가 화면과 같은 JSX·같은 CSS 를 그대로**
        그릴 수 있게 됐다 · ⚠️ **헤더를 새로 만들지 않았다**(공개 헤더는 두 종류뿐 ·
        초안의 `/login` 은 없는 경로이고 `/customer/login` 이 맞다) ·
        ⚠️ **지시와 달리 색인하지 않는다** — 실제 독자가 **문자로 링크를 받은 고객사**다.
        🟢 켜기로 하면 세 곳만 되돌리면 되고 본문에 「선정된 고객사 한정」이 남아 있다 ·
        **④ 리뷰 1라운드 — LMS 제목 전면 폐지.** 🚨 **13판본 전수 렌더링으로 재 보니 제목이
        실제로 붙던 것은 견적안내 폴백 LMS 한 종뿐이었다**(나머지 열둘은 이미 제목이 없었다) ·
        🔴 **그 한 종은 본문에 머리말이 없어 제목이 유일한 브랜드 표시였다** → 머리말을
        **본문 첫 줄로 옮겼다**(336 → 349byte). 🔴 **둘을 따로 되돌리지 말 것** ·
        🟢 **문자 종류는 안 바뀐다**(솔라피는 `type` 이 없으면 **본문 길이로** 가른다) ·
        🚨 **제목 판정이 실은 세 곳이었다**(`send-quote-sms` 도 자기 판정을 갖고 있었다 —
        2026-09-18 에 같은 원인으로 고친 자리다). 셋 다 `smsSubjectFor` 로 모았다 ·
        🚨 **미리보기 라우트 둘의 `subject` 가 죽은 코드였다**(확인창이 서버로 안 돌려보낸다 ·
        이 PR 이 만든 것 하나 포함) · 🔴 **`smsSubjectFor()` 를 「항상 null 이니 지우자」로
        지우지 말 것**(판정이 한 곳에 있다는 것이 그 결함을 막는 구조다) ·
        **⑤ 리뷰 1라운드 — `/reward-event` 404 는 코드 문제가 아니었다**(코드 변경 0).
        브랜치에서 **200** 이고(대조군 `/nope-not-a-route` 404) 빌드 매니페스트에도 있다.
        🔴 **원인은 문자 본문의 주소가 `SITE_URL`(운영 고정)이라 Preview 에서 누르면
        `main` 기준 운영으로 가는 것**이다 — merge 되면 사라진다. 🔴 **`SITE_URL` 을
        환경변수로 빼지 말 것**(Preview 체크 누락 함정) · ⚠️ **이 환경은 프록시가 외부 주소를
        막아 `000` 이 나온다**(대조군 `/guide` 도 `000`) — 🔴 **「사이트가 죽었다」로 읽지 말 것** ·
        **⑥ 리뷰 2라운드 — 🚨 같은 날 문의 줄 방향이 두 번 바뀌었다.**
        1라운드 *「문의 전화번호랑 담당자 이름은 빼자. 대신 대표번호를」* → 두 문자만
        대표번호로 고정하고 전용 함수를 뒀는데, 2라운드 *「모든 문자메세지의 마지막에 문의
        부분에 담당자의 연락처를 남기자」* 가 그것을 뒤집었다. **열세 판본이 `contactLine()`
        하나만 쓴다** · 🔴 **`supportContactLine()` 같은 전용 함수를 다시 만들지 말 것**
        (두 문자만 다르게 두려는 판단은 이미 한 번 접혔다) · 🔴 **템플릿 머리 주석에 두 지시를
        둘 다 남겼다**(한쪽만 적으면 다음 세션이 되돌린다) ·
        🔴 **번호·이름을 코드에 적지 않았다 — 이 저장소는 public 이다.** 값은
        `staff_accounts.sms_sender_phone` + 이름에서 온다(`resolveSmsSender()` →
        `contactPhoneForBody()` → `contactLine()`). 🟢 담당자가 바뀌면 문구도 따라 바뀐다 ·
        🟢 **등록된 번호가 없을 때만 대표번호로 떨어지는 갈래는 그대로**(솔라피 미등록 번호를
        안내하면 고객이 걸어도 받을 사람이 없다) ·
        🔴 **견적서 링크 문자만 예외이고 사용자가 확인한 예외다** — 그 문자에는 애초에 문의
        부분이 없고 한 줄을 더하면 **87 → 120byte LMS** 가 된다(대표번호 형태는 102byte).
        실측을 보고했고 **「SMS 로 남긴다」**를 골랐다. 🔴 **「모든 문자」를 근거로 넣지 말 것** —
        그 확정과 숫자를 `quoteShareLinkMessage` 주석에 남겼다(기존 주석은 **대표번호 기준
        102byte 만** 적어 낡아 있었다) ·
        🟢 tsc 0 · 프리렌더 **49**(`origin/main` 워크트리와 항목 diff 0 · 두 라운드 모두) ·
        사이트맵 7개 · 마이그레이션 부정 시험 4건 + 멱등 · 관문 진리표 9 · 문자 전수 13판본 ·
        부정 타입 시험 2 · 렌더 28 + 6 + 12 · 구조 22 + 16 + 9 · **실제 발송 0통** ·
        ⚠️ **렌더링이 결함 하나를 잡았다**(개인정보 안내 둘째 줄의 들여쓰기 공백이 문자에
        그대로 찍히고 있었다 — 코드만 읽었으면 못 봤다) ·
        ⚠️ **거짓 ❌ 4건 — 전부 내 기대값이 틀렸다**(import 줄을 안 센 것 2 · 정의 줄까지 센 것 1 ·
        🚨 **내가 쓴 주석이 내 단언에 걸린 것 1** — **함정 10번이고 열 번을 넘었다**) ·
        ⚠️ **첫 프리렌더 측정이 0 이었는데 「전부 성공」이 아니라 빌드가 컴파일에서 멈춘 것**
        이었다 — 🔴 **0 이면 로그를 볼 것** · 🟢 자세한 것은 `docs/history/current.md` 맨 위)
  ——   24시콜 ⓑ 견적 폼 → ⓒ 정산 엑셀   🔴 **보류**(사용자 확정 2026-09-22 —
        *"24시콜 가져오기 작업 일체는 일단 보류하자"*). 🔴 **「다음」 표시를 지운 것이고
        없앤 것이 아니다** — ⓐ(PR #159)는 이미 들어가 있고 되돌리지 말 것 ·
        🔴 **ⓑ 는 목록 행만으로는 안 된다** — 상하차 방법·시점·특이사항·상세주소가
        통째로 안 온다(2026-09-16 샘플 실측). **다시 꺼낼 때는 창 위쪽 입력 폼을 어떻게
        가져올지부터 정할 것**(OCR 은 v4 가 이미 버렸다 — 아래 v4 블록)
  ——   **다음 차수 미정**   ⚠️ 24시콜이 보류되면서 로드맵에 `← 다음` 이 없다.
        ⚠️ **2026-09-22 에 admin 공개문의 배지를 닫아서 남은 후보가 하나로 줄었다** —
        **내부 정합 ② 화주·차주**(아래 · 뒤로 미뤄 둔 것)뿐이고, 🔴 **그것도 「그 값으로
        무엇을 할지」가 정해지기 전에는 착수하지 말 것**(사유는 아래 v4 블록).
        ⚠️ **「차수 없는 소수정은 0건」이라 적혀 있었지만 2026-09-23 에 한 건이 더 들어갔다**
        (문자 2종 + 이벤트 안내 페이지 #184 — 사용자 요청으로 온 것이고 로드맵 후보가
        아니었다). 🔴 **「0건이니 할 일이 없다」로 읽지 말 것** — 사용자 요청은 로드맵과
        별개로 들어온다
  ——   내부 정합 ② 화주·차주 (CRM 항목 신설)  🔴 **뒤로 미뤘다**(옛 37차 · 2026-09-16) —
        🔴 **거래조건은 36차가 가져갔다** · 사유는 아래 v4 블록
  ——   admin 공개문의 배지   ✅ **닫았다**(사용자 확정 2026-09-22 · 🔴 **코드 0 · DB 0**).
        55차(2026-08-27) 리뷰 5번에서 나와 「랜딩 「문의·신청 현황 조회」 삭제」와 한 차수로
        묶자고 미뤄 둔 것이고, **묶음의 나머지 절반은 62차에 끝났다.**
        🚨 **그런데 배지 쪽 요구사항 본문이 어디에도 안 남아 있다** — 전수로 훑으면 스무
        곳이 **이름만** 되풀이하고 `git` 은 얕은 복제(65커밋)라 그 시점까지 못 간다.
        🟢 **그 사이 실물은 채워졌다** — 배지는 `status='신규'` 를 15초 폴링 +
        `notifyBadgeRefresh()` 로 세고 있고, **38차(PR #160)가 그 위에 화면 안 배너 ·
        알림음 · 웹 푸시까지 얹었다**(`lib/adminIntakeAlert.ts` 의 `publicQuotes`).
        🔴 **「로드맵에 있었으니 뭔가 해야 한다」로 되살리지 말 것** — 되살리려면
        **무엇이 불편한지 새로 듣는 것이 먼저다**(짐작으로 만들면 엉뚱한 것을 만든다) ·
        ⚠️ **나머지 둘은 원래대로다** — 「보험 문구 정합」은 30차에 `INSURANCE_ENABLED` 를
        켜면서 이미 맞춰졌고, 「접수 안내 문자」는 **애초에 없는 기능**이라(61차 ⑨) 만들려면
        `/quote`·`/apply` API 에 발송 트리거를 붙이는 **별도 차수**다.
        🔴 **둘을 소수정으로 되돌리지 말 것**
```
🔴 **문자 2종 + 적립 이벤트 안내 페이지(PR #184 merge `f984f47`) 이후 세션이 알아야 할 것만 요약** — 전문은 `docs/history/current.md` 맨 위:
```
  🚨 방향이 두 번 바뀌었다 문의 줄이 하루 안에 **담당자 → 대표번호 → 담당자**로 갔다.
                  최종은 **담당자 번호·이름**이고 **열세 판본이 `contactLine()` 하나**를 쓴다.
                  🔴 **`supportContactLine()` 같은 전용 함수를 다시 만들지 말 것**(두 문자만
                  다르게 두려는 판단은 이미 접혔다) · 🔴 **템플릿 머리 주석에 두 지시를 둘 다
                  남겼다** — 한쪽만 읽고 되돌리지 말 것
  🔴 번호는 코드에 없다 이 저장소는 **public** 이라 실제 번호·이름을 커밋하지 않았다. 값은
                  `staff_accounts.sms_sender_phone` + 이름 → `resolveSmsSender()` →
                  `contactPhoneForBody()` → `contactLine()` 로 온다.
                  🟢 담당자가 바뀌면 문구도 따라 바뀐다 · 🟢 **등록된 번호가 없을 때만
                  대표번호로 떨어지는 갈래는 그대로**(미등록 번호를 안내하면 받을 사람이 없다) ·
                  ⚠️ **그래서 사용자 몫이 하나** — 그 계정의 발신번호가 등록돼 있어야 한다
  🔴 링크 문자는 예외 견적서 링크 문자(**87byte SMS**)에는 문의 줄이 없다 — 한 줄을 더하면
                  **120byte LMS** 가 된다(대표번호 형태는 102byte). 실측을 보고했고 사용자가
                  **「SMS 로 남긴다」**를 골랐다. 🔴 **「모든 문자」를 근거로 넣지 말 것** —
                  그 확정을 `quoteShareLinkMessage` 주석에 남겼다
  🚨 LMS 제목은 0건  어떤 문자에도 제목을 붙이지 않는다(사용자: *「[web발신] 상단에 볼드체
                  제목글처럼 들어간 건 없는게 낫지 않나? 아래 내용과 중복된다」*).
                  🚨 **전수로 재 보니 제목이 실제로 붙던 것은 견적안내 폴백 LMS 한 종뿐**이고
                  나머지 열둘은 이미 없었다 · 🔴 **그 한 종은 본문에 머리말이 없어 제목이
                  유일한 브랜드 표시였다** → 머리말을 본문 첫 줄로 옮겼다. **둘을 따로
                  되돌리지 말 것** · 🟢 **종류는 안 바뀐다**(솔라피는 **본문 길이로** 가른다) ·
                  🔴 **`smsSubjectFor()` 가 항상 null 이어도 지우지 말 것**(판정이 한 곳에
                  있다는 것이 「라우트마다 제목이 다시 생기는」 결함을 막는다)
  🚨 판정이 세 곳이었다 `smsSubjectFor` 주석이 「두 곳」이라 적고 있었지만 **`send-quote-sms`
                  도 자기 판정을 갖고 있었다**(2026-09-18 에 같은 원인으로 고친 자리다).
                  ⚠️ 미리보기 라우트 둘의 `subject` 는 **죽은 코드**였다(확인창이 서버로
                  안 돌려보낸다). 🔴 **주석이 「몇 곳」이라 적는 것을 믿지 말고 grep 할 것**
  🔴 리워드 문자가 넷 `reward_intro`(제도 소개) / `status`(쌓일 예정) / `earned`(쌓였다) /
                  `deducted`(썼다). 🔴 **합치지 말 것** · 🔴 **`intro` 는 `status` 와 안 만드는
                  조건이 정반대다**(계정 발급 직후라 잔액이 보통 0 — 같은 조건이면 정작
                  보내야 할 때 안 나간다. 그래서 금액을 안 적는다) ·
                  🔴 **`sms_on_delivery_enabled` 를 보지 않는다**(그 칸은 운송완료 자리만 끈다)
  🔴 안내 페이지 세 겹 `/reward-event` 는 **색인하지 않는다** — layout `robots` ·
                  `app/robots.ts` · **`app/sitemap.ts` 의 `NOINDEX`**.
                  🚨 **셋째를 빠뜨리기 쉽다** — 그 파일은 **`app/` 아래를 훑어서** 목록을
                  만들므로 `/q/[token]`(동적)과 달리 **정적 경로는 저절로 안 빠진다.**
                  🔴 **`TopNav` 숨김 조건에도 있다**(원칙 11번) · 🟢 사이트맵 7개 그대로
  🚨 초안이 다섯 곳 틀렸다 「자동 적립」·「3개월 예외」·「소멸 사전 안내」·「연체 시 정지」·
                  「운송 취소 시 취소」가 전부 실제 관문과 달라 **지우거나 고쳤다.**
                  🔴 **본문 정의처는 `lib/rewardEventContent.ts` 하나**이고 조건·기간은
                  **캠페인에서 읽는다**(초안의 기간 시작이 이미 낡아 있었다 — DB 는 2026-08-07)
  🚨 page.tsx 는 막는다 화면 부품을 `components/RewardEventView.tsx` 로 뺀 것은 **Next 가
                  `page.tsx` 의 다른 이름 있는 export 를 막기 때문**이다. `tsc --noEmit` 은
                  **통과하고** `next build` 만 멈춘다. 🔴 **되돌리지 말 것**
  ⚠️ 404 는 우리 탓이 아니었다 문자 속 링크는 `SITE_URL`(운영 고정)이라 Preview 에서 누르면
                  **`main` 기준 운영**으로 간다. 🔴 **`SITE_URL` 을 환경변수로 빼지 말 것** ·
                  ⚠️ **이 환경은 프록시가 외부 주소를 막아 `000`** 이다(대조군으로 확인) —
                  🔴 **「사이트가 죽었다」로 읽지 말 것.** 로컬 dev + 대조군으로 잰다
  ⚠️ 거짓 ❌ 4건     전부 내 기대값이 틀렸다 — import 줄을 안 센 것 2 · 정의 줄까지 센 것 1 ·
                  🚨 **내가 쓴 주석이 내 단언에 걸린 것 1**(**함정 10번 · 열 번을 넘었다**).
                  ⚠️ **첫 프리렌더가 0 이었는데 「전부 성공」이 아니라 컴파일에서 멈춘 것**
                  이었다 — 🔴 **0 이면 로그를 볼 것**
  🟢 사용자 몫      **DB 는 merge 전에 `apply` 를 끝냈다**(`_migrations` **53행**) · 필수 0 ·
                  ⚠️ 발신번호 등록 확인 · ⚠️ 리워드 멤버십을 먼저 켤 것 ·
                  🟢 **이벤트 안내 페이지 문구 검수 항목이 닫혔다**(리워드 1차부터 열려 있었다) ·
                  🚨 세무사·변호사 검수(열하나)는 그대로
  🔴 답을 못 받은 것 굵은 LMS 제목을 **견적안내 폴백 LMS 가 아닌 다른 문자**에서 봤는지.
                  전수로는 그 한 종뿐이었다 — 다른 답이 오면 **내 측정이 놓친 자리가 있다**
```

🔴 **견적관리 소수정 + 빠른 등록 창구(PR #183 merge `e997196`) 이후 세션이 알아야 할 것만 요약** — 전문은 위 로드맵:
```
  🚨 「활성 등록」이 없었다 기존 화주 등록 폼의 상태 기본값이 **`미접촉`** 이라 그 폼으로 넣은
                  화주는 **활성화주 CRM 목록에 안 뜬다**(`ACTIVE_CUSTOMER_STATUSES` 밖).
                  사용자가 말한 「활성화주를 바로 등록」은 **지름길이 없던 것이 아니라
                  도달할 수 없던 것**이었다. 🔴 **빠른 등록은 `견적요청`으로 넣는다** ·
                  🔴 **기존 폼의 `미접촉` 은 안 건드렸다**(영업 대상을 쌓는 자리다) —
                  **둘을 같게 만들지 말 것**
  🔴 입구가 넷이다   화주 항목의 정의처는 여전히 **`lib/companyFields.ts` 하나**이고
                  `/admin/companies/new` 가 **네 번째 입구**다(등록 · 수정 · 신청 승인 · 빠른 등록).
                  🔴 **화면에 배열을 새로 적지 말 것**(원칙 33번 — 그래서 한 번 갈렸었다) ·
                  🔴 **키가 없으면 던진다**(조용히 빈 칸을 그리면 저장이 반쪽이 된다)
  🔴 홈 카드는 4의 배수 「+ 신규 화주 등록」은 **카드가 아니라 제목 줄 버튼**이다 —
                  `app/admin/page.tsx` 주석이 카드는 4의 배수라고 못박고 있어서
                  아홉 번째 카드를 넣으면 줄이 깨진다. 🔴 **카드로 옮기려면 4개를 채울 것**
  🔴 검색 상자는 공용  **`components/CompanySearchBox.tsx`** — 견적관리·운송오더 **두 곳에
                  복사돼 있던 드롭다운**을 합쳤다(원칙 43번과 같은 결). 프리필은 화면마다
                  달라서 `onSelect` 콜백으로 남겼다 · 🔴 **처음엔 `-1`**(0 이면 타이핑 중에
                  첫 줄이 고른 것처럼 반전된다) · 🔴 **결과가 바뀌면 `-1` 로 되돌린다**
                  (안 되돌리면 **사라진 줄을 짚은 채 Enter** 가 눌린다) ·
                  🔴 **Enter 는 짚은 줄이 있을 때만 가로챈다**(늘 가로채면 원칙 34번이 가려진다) ·
                  🔴 **반전은 `:hover` 가 아니라 `.is-active`** · aria 3종을 지우지 말 것
  🔴 차종 설명은 두 겹 마우스 올림(`title`) + 고른 뒤 칸 아래 한 줄. **모바일에 hover 가 없어서
                  한 겹으로는 안 보인다.** 정의처는 **`lib/vehicleBodyTypes.ts` 의
                  `BODY_TYPE_INFO` 하나**(26종) · 🔴 **가산금액을 적지 말 것** — 값은
                  `rate_surcharges`(DB)가 정본이라 담당자가 고치는 순간 거짓말이 된다 ·
                  🔴 **네이티브 `<select>` 를 그대로 뒀다**(원칙 57번은 **포털 한정**)
  🚨 `.btn` 밑줄은 원래 결함 리뷰 1건(*「신규화주등록 버튼 아래에 줄은 삭제하자」*)의 정체는
                  `.btn` 에 `text-decoration: none` 이 없어 **`<Link className="btn…">`
                  열일곱 곳**에 브라우저 기본 밑줄이 그어져 있던 것이다(내가 만든 것이 아니라
                  **옐로 버튼이 홈에 생기며 눈에 띈 것**). 🔴 **화면마다 덧칠하지 말 것**
  ⚠️ 거짓 ❌ 6건     전부 내 시험이 틀렸다 — **다섯이 주석이 내 grep 에 걸린 것**
                  (**함정 10번 · 이 세션 네 번째**). 🔴 **완료조건을 낱말 수로 잴 때는
                  주석 줄을 걷어내고 셀 것**(`grep -vE '^\s*(//|\*|/\*|\{/\*)'`) ·
                  나머지는 `COMPANY_FIELDS` 가 **에러 메시지 문구에도** 있어 3건인 것 ·
                  ⚠️ **눈으로 로고에도 밑줄이 있는 줄 알았는데 재 보니 0건**(SVG 아트웍) —
                  🔴 **화면을 눈으로 판정하지 말고 잴 것**(이 세션 두 번째)
  🟢 물음 셋이 닫혔다 사용자 확정(2026-09-22) — *"홈 카드 격자는 지금 위치 좋다. 차량 설명문구도
                  적절하다. 빠른 등록 9항목 충분하다."* **셋 다 현행 유지이고 코드 0 · DB 0** ·
                  🔴 **홈 격자로 옮기자 · 26종 문구를 다시 쓰자 · 항목을 늘리자로 되살리지 말 것**
  🟢 사용자 몫 0     **DB 할 일 0**(마이그레이션 없음 · `_migrations` 52행 그대로) · 남은 물음 0
```

🔴 **운임 할인 적용(merge `9307790`) 이후 세션이 알아야 할 것만 요약** — 전문은 위 로드맵:
```
  🚨 청구액이 깎은 뒤  **`invoices.customer_charge_total` 자체가 할인을 뺀 값이다.** 깎은 금액은
                  **`reward_discount_amount`**(0 이상)에 따로 적고, 깎기 전은 **둘을 더하면** 된다.
                  🔴 **왜 이렇게 했나** — 금액을 보여주는 자리가 **여덟 곳이 넘어서**(관리자
                  목록·상세 · 포털 정산확인·홈·월별통계 · 대시보드 · 미수금 · 월정산 묶음) 한 곳만
                  빠뜨리면 **화면마다 금액이 갈린다**(36차 C장 미수금 신고가 그 모양이었다).
                  🟢 이 방식이면 읽는 자리가 **저절로 전부 맞고 저장소 밖 묶음 DB 함수 둘을
                  한 글자도 안 고쳐도 된다**(둘 다 그 컬럼만 읽는다 · `_verify.sql` ㊲-e 실측) ·
                  🔴 **원칙 47번을 어기는 것이 아니다**(그 원칙이 막는 것은 「나중에 생긴 **추가**
                  금액을 섞는 것」 · 이것은 35차 A-7 과 같은 결의 **청구 금액 결정**이다)
  🚨 resync 가 한 줄   **「배차 기준 재동기화」가 그 컬럼을 다시 쓴다.** 그대로 뒀으면
                  **재동기화가 할인을 조용히 지워** 원장에는 「썼다」가 남고 청구서만 제값으로
                  돌아갔다(**화면에 증상 0**). 🔴 **떼어 놓지 말 것** ·
                  🔴 **마진도 깎은 뒤 금액으로 센다**(할인은 매출 에누리다)
  🔴 원장은 append-only 처음은 **`freight_discount` 한 줄(−금액)** · 고칠 때는 그 줄을 두고
                  **차액만큼 `adjustment` 한 줄**. 부분 UNIQUE 에 `transaction_type` 이 들어 있어
                  **한 정산 건에 할인 한 줄**이 저절로 강제되고, `adjustment` 는 `manual` 이라
                  그 색인에서 빠져 **몇 번이고 고칠 수 있다**
  🔴 enabled 는 안 본다 `enabled = false` 는 **「신규 적립 중단」**이고 이미 쌓인 적립금을 못 쓰게
                  하는 칸이 아니다. 🔴 **되돌리지 말 것** · 🔴 **`portal_visible` 도 안 본다** ·
                  🔴 **`reward_method` 도 안 본다**(그 칸은 담당자 메모이고 관문이 아니다)
  🔴 관문 여덟       참여 · 캠페인 · 사용 종료일 · **선착불 불가**(화주가 차주에게 직접 내서
                  **위캐리가 끊는 청구서가 없다**) · 잠금 · **입금 완료 불가** · **확정 묶음 불가**
                  (draft 는 통과시키고 서버가 `refresh_item_snapshot` 을 부른다) · 청구액 · 잔액 ·
                  최소 사용액. **정의처는 `lib/rewardUse.ts` 하나다** ·
                  🔴 **관문은 늘릴 때만 전부 본다** — 해제·감액이 잔액에 걸리면 잘못 건 할인을
                  **영영 못 되돌린다** · 🔴 **깎은 뒤 금액이 0 보다 커야 한다**(1원은 남긴다 —
                  0 이면 `is_billing_batch_candidate` 가 묶음 후보에서 뺀다)
  🔴 적립은 깎은 뒤 5% 할인은 **입금 전에만** 걸 수 있고 적립은 입금 확인 때 나므로 순서가
                  엇갈릴 일이 없다. 🔴 **`rewardBaseAmount` 에서 할인을 도로 더하지 말 것**
                  (깎아 준 돈에 적립까지 붙으면 같은 돈이 두 번 혜택이 된다)
  🔴 자동인 것이 없다  **세금계산서는 자동으로 안 바꾼다**(사용자 확정 · 화면이 그 사실을 적는다) ·
                  **문자도 자동이 아니다**(서버는 차감 안내 문구만 만들고 담당자가 [발송]을 누른다)
  🔴 포털에 두 자리   적립내역의 **`discount`(운임 할인) 갈래**(「차감」과 섞으면 회수·착오 보정과
                  구분이 안 된다) · 정산확인의 **「리워드 운임 할인 −N원 적용」**(데스크탑·모바일
                  **두 벌** · 원칙 13번). 🔴 **`portal_visible` 로 감추지 말 것** — 그것은
                  **본인 청구서의 한 줄**이다
  ⚠️ 지금은 못 쓴다   실측(㊲-c)상 **최소 사용액 50,000 에 닿는 화주가 0명**이다(9,000 / 0 / 0).
                  🔴 **「시험할 건이 없으니」로 관문을 풀지 말 것**
  ⚠️ 거짓 ❌ 6건     전부 내 시험이 틀렸다 — grep 기대값 다섯(접두어가 더 긴 이름까지 문 것 ·
                  이미 있던 낱말 · import 줄 · **기존 주석이 걸린 것**(함정 10번))과,
                  🚨 **하네스가 500 인데 「블록이 없다」가 ✅ 로 나온 것**(서버 컴포넌트에 함수
                  prop 을 넘겼다). 🔴 **「하네스가 그려졌는가」를 선행 단언으로 넣을 것**
  ⚠️ 사용자 몫      🟢 **DB 는 merge 전에 apply 를 끝냈다**(`_migrations` **52행**) ·
                  ⚠️ 담당자에게 한 줄(정산 상세에서 **관리자만** 할인을 걸 수 있고 **사유가 필수**다) ·
                  🚨 이벤트 안내 페이지 문구 · 🚨 세무사·변호사 검수(열하나 — **운임 할인은
                  매출 에누리**라는 판단이 이제 실제로 돈다)
```

⚠️ **그 앞 43건의 요약(기업고객 리워드 3차 #182 → 66차 이용약관 개정)은 `docs/history/summaries.md` 로**
**옮겼습니다**(2026-09-22 40건 · 2026-09-23 에 **리워드 1·2·3차 세 건**을 더 옮김 · 둘 다 md5·바이트 대조).
🔴 **루트에 남긴 것은 최근 3건뿐이고 없앤 것이 아닙니다** — **운임 할인 `9307790` · 견적관리 소수정 #183 ·
문자 2종 + 이벤트 페이지 #184** 입니다. 「PR #NNN 이후 세션이 알아야 할 것」이 루트에 안 보이면
**그 파일을 먼저 볼 것.**
🔴 **다음 `/merge` 때도 같은 규칙을 지키십시오** — 요약을 루트에 더하면 **오래된 것을 같은 수만큼**
`summaries.md` 로 옮깁니다. 안 지키면 이 파일이 다시 40만 자가 됩니다.

🔴 **월정산 묶음 — 다음 작업의 출발점(사전조사 2026-09-15)** — 전문은 `docs/history/current.md` 맨 위:
```
  🔴 실측이 먼저다   정산 5건(월정산 **2** · 건별 3) · 묶음 **1건이고 그나마 draft**
                  (확정 0 · 결제일 0 · 연체 0) · 🔴 **월정산 2건 중 묶음에 담긴 것 0건** ·
                  화주 540 중 결제일 설정 2 · 마감일 0(36차가 비운 대로 월말)
  🔴 결함은 넷      ① **자동 생성이 없다**(운송완료 → invoice 는 자동인데 묶음은 손으로) ·
                  ② **묶음 안에 견적·운송 정보가 없다**(오더번호+금액 네 칸뿐) ·
                  ③ **결제일이 화주 설정과 안 이어진다**(36차 `payment_due_basis` 를 안 읽고
                     손입력이라 0건) · ④ **마감일 이후가 통째로 없다**(`overdue` 를 화면은
                     그릴 줄 아는데 **세팅하는 코드가 0곳**, 스케줄러도 `purge.yml` 뿐)
  🟢 사용자 확정    **(A) 표시 + 연체 자동 판정** — 마감 지난 draft 에 배지, 납부기한 지난
                  확정 묶음은 매일 도는 작업이 「연체」로. 🔴 **확정·세금계산서·입금은
                  담당자가 손으로 누른다**(자동 확정 아님) ·
                  🔴 **(B) 자동 확정을 고르지 않은 이유** — 마감일에 금액이 굳으면 늦게
                  등록된 건은 보충 묶음으로만 넣을 수 있다. **돈이 걸린 상태를 코드가
                  마음대로 바꾸지 않는 선**이고 원칙 44번과 같은 결이다
  🔴 로직이 밖에 있다 **묶음 DB 함수 12개가 저장소에 없다**(14차 산출물 · 마이그레이션
                  자동화 47차보다 먼저). 🔴 **DB 함수를 고치지 말고 앱에서 기존 함수를
                  조합해 쓸 것** — 고치면 또 저장소 밖 로직이 된다. 목록은 `verify` ⑱-e
  ⚠️ 컬럼 이름      활성 항목은 **`released_at is null`** 이고 **`is_active` 는 없다**
                  (진단 SQL 에 그렇게 적었다가 42703 으로 멈췄다 — PR #152 와 같은 실수)
  ⚠️ 절 번호        `_verify.sql` 에 절을 더할 때 **파일 끝만 보지 말 것** — ⑰ 이 이미
                  있어서 겹쳤다. `grep -n "^-- [①-⑳]"` 로 세고 붙인다
  🟢 포털 0줄       화주포털은 묶음을 한 줄도 읽지 않는다(내부 전용)
```

🔴 **36차 착수 전 — 화주 거래조건 (2026-09-14 전달)**
🟢 **A장으로 처리됐다**(PR #150, 2026-09-15). 🔴 **그래도 이 블록을 지우지 말 것** — 무엇을 왜
그렇게 정했는지의 출발점이고, **아래 「기획 세션 조사」 중 `billing_cutoff_day` 가 이미 있다는
지적이 실제로 지시서 전제를 뒤집었다.** ⚠️ 다만 **결과가 제안과 다르다** — 아래 「설계 제안」의
「기준 + 값 두 칸」은 리뷰에서 **마감이 월말로 고정되면서 한 칸이 됐고**, ⭕ 로 확정됐던
**여신 한도는 빠졌다**(사용자 *"여신한도는 지금 뺀다"*). 🔴 **이 블록의 ⭕ 를 근거로 되살리지 말 것.**
🔴 **아래 「사용자 원문」과 「사용자 확정」은 요약하거나 고치지 말 것** — 지시서가 범위를
정할 근거다. 그 아래 「기획 세션 조사」와 「설계 제안」은 **조사·제안이지 확정이 아니다.**

```
 [사용자 원문]
  화주정보 상세 수정에서 거래조건에서 건별인지 월별정산인지 구분하는 드롭다운 방식의
  옵션이 있으면 좋겠고, 정산마감일과 결제일등 상세한 정보들도 기입이 되어야한다.

 [사용자 확정 2026-09-14]
  결제일의 뜻   "화주가 우리에게 결제하는 일이다. 이는 화주마다 다르다"
               🔴 화주 → 위캐리 **입금일**이다. 차주 지급일이 아니다
               🔴 화주마다 다르므로 한 가지 형식으로 고정할 수 없다
  포털 노출     🔴 **내부 전용** — 화주포털·견적서·엑셀 0줄(정기계약 배지와 같은 취급)
  추가 항목     ⭕ 여신 한도 / 미수 상한
               ⭕ 세금계산서 발행 방식 (정발행 / 역발행 / 발행 안 함)
               ❌ 경리·정산 담당자 연락처 — 이번에는 안 넣는다
               ❌ 계약 운임 기준 — 별도 단가표가 필요해져 36차 범위 밖이다
```

🔴 **기획 세션 조사 — 전부 코드로 다시 잴 것**(이것은 「어디를 먼저 보라」는 안내다)
```
  🔴 `companies.billing_cutoff_day`(정산 마감일)가 **이미 있다** — 원칙 46번 본문이 그
     이름을 그대로 적는다. 🔴 **신설하지 말 것.** 이번 일은 「만드는 것」이 아니라
     **화주 상세 화면에 없다면 노출하는 것**일 가능성이 크다. 두 벌이면 월정산 묶음이 갈린다
  🔴 `billing_cycle`(`per_order`/`monthly`)은 `quotes`·`orders`·`dispatches`·`invoices`
     에 있다(원칙 45번). **화주(`companies`) 레벨 기본값이 있는지는 미확인** — 없으면
     그것이 이번에 만들 칸이다
  🔴 원칙 46번이 **정확히 이 자리의 사고 기록**이다 — 마감일을 나중에 지정했더니 과거
     월정산 묶음을 영영 못 찾는 버그가 났다. **마감일을 화면에서 고칠 수 있게 만드는
     순간 그 경로가 다시 열린다** → 저장 전 「과거 묶음은 바뀌지 않습니다」 확인 창 필요
  🔴 원칙 45번 — **역방향 동기화 금지.** 화주 값 → 오더 **복사**는 하되 되돌리지 말 것
  🔴 `lib/companyFields.ts` 가 화주 항목의 **유일한 정의처**다(33차) — 화면에 배열을
     새로 만들지 말 것(입구가 등록·수정·승인 **셋**이라 또 갈린다)
  🔴 `portal_order_requests` 에 `billing_cycle` 을 더하지 말라는 금지가 이미 있다
     (*「월정산은 화주별 계약이라 담당자가 정한다」*) — 🟢 **이번 일이 그 문장의 이행이다.**
     🔴 다만 **화주가 고르게 하지는 말 것**
  🔴 정기계약(33차 5컬럼)과 **축이 다르다** — 정기계약이 아니어도 월정산일 수 있고
     정기계약인데 건별일 수 있다. 🔴 `recurring_contract_frequency` 에 담지 말 것
  ⚠️ 화주 말과 담당자 말이 다르다 — 내부 전용이므로 **담당자 말로** 적을 것
     (`getCustomerBillingCycleLabel()`(화주 말)을 관리자 화면에 끌어오지 말 것)
```

⚠️ **결제일 설계 제안 — 확정이 아니다.** 「화주마다 다르다」이므로 한 칸으로는 안 되고,
기획 세션 제안은 **기준 + 값 두 칸**이다.
```
  payment_due_basis   기준   마감일 기준 / 매월 고정일 / 세금계산서 발행일 기준 / 협의
  payment_due_value   값     숫자 (N일  또는  1~31 · 말일)
    예)  마감일 기준 + 30  →  말일 마감분을 익월 30일 이내
         매월 고정일 + 25  →  매월 25일
         협의              →  값 없음. 미수금 알림·정산 예정일 자동계산에서 제외
```
🔴 **두 칸이라야 「정산 예정일」을 계산할 수 있다** — 한 칸 자유 입력은 지금은 편하지만
미수금 알림과 정산 예정일 자동계산에 **영영 못 쓴다.** 🔴 **더 나은 구조가 보이면 보고하고
확정을 받을 것.**

🔴 **36차 지시서가 반드시 정할 것 넷** — 🟢 **넷 다 정해졌다**(PR #150):
**① 기본값이다**(강제 아님 · 오더·발주요청에 복사하고 그 뒤로는 그 건의 값이 이긴다) ·
**② 화면 문구로 말하지 않았다** — 마감일을 **화면에서 못 고치게** 만들어(입력칸·저장 경로를 둘 다 막음)
원칙 46번의 경로 자체를 닫았다. 🔴 **확인 창을 만들 자리가 없어진 것이지 빠뜨린 것이 아니다** ·
**③ 여신 한도는 아예 뺐다**(값만 받기도 안 한다) · **④ 빈 값은 「미정」으로 그대로 둔다.**
```
  ①  화주 값은 「기본값(제안)」인가 「강제」인가 — 권장은 **기본값**(오더 등록 때 복사하고
     담당자가 고칠 수 있으며 그 뒤로는 오더 값이 이긴다). 강제면 화주 설정을 바꾸는 순간
     **진행 중인 건의 정산방식이 조용히 바뀐다**
  ②  과거 오더·정산은 **따라오지 않는다**는 것을 화면에 어떻게 말할 것인가 (원칙 46번)
  ③  여신 한도는 **값만 받을 것인가, 넘으면 경고까지 할 것인가** — 권장은 값만
     (경고는 「어디서 무엇을 막을지」가 별개 설계다)
  ④  기존 539개 화주의 빈 값을 어떻게 둘 것인가 — 🔴 **일괄로 「건별」을 채우지 말 것**
     (「안 정했다」와 「건별로 정했다」가 구분이 안 된다)
```

🔴 **24시콜 가져오기 — 설계 정리 v4(2026-09-16) · 37차 착수 전에 반드시 읽을 것**
🔴 **ⓑ·ⓒ 는 2026-09-22 에 보류됐다**(사용자 확정 — *"24시콜 가져오기 작업 일체는 일단
보류하자"*). **이 블록을 지우지 말 것** — ⓐ(PR #159)가 이미 운영에 들어가 있고, 다시
꺼낼 때 전제를 처음부터 다시 조사하지 않으려면 이 기록이 필요하다.
v4 도 저장소에 없다(기획 채팅 산출물). 🔴 **작업지시서가 아니라 결정 기록이고 코드·DB 변경 0 이다.**
🔴 **v3 를 대체했다 — 아래 v3 대조 블록은 「무엇이 왜 낡았나」의 근거로만 남긴다.**
```
  🔴 입력 방식이 통째로 바뀌었다  OCR·캡쳐 → **창에서 드래그 복사 → 붙여넣기 → 라벨 기반 파싱**.
                  🟢 그래서 v3 의 선행 조건 둘이 **없어졌다** — 「한국어 인식 데이터를 받을 수
                  있는가」·「캡쳐 칸 위치 고정 · 화면 배율 대응」. 🔴 **OCR 로 되돌리지 말 것**
  🔴 순서가 아니라 라벨  파싱은 **라벨로 가른다**(칸 순서를 믿지 않는다 — 24시콜이 화면을 고치면
                  순서는 바뀌어도 라벨은 남는다). 🔴 **못 읽은 라벨은 조용히 버리지 말고 화면에
                  표시할 것**(원칙 55번과 같은 결 — 조용한 실패가 가장 나쁘다)
  🔴 서버에 안 보낸다  붙여넣은 텍스트를 **서버에 보내지도 저장하지도 않는다** — 브라우저에서
                  갈라 입력칸에 넣고 버린다. 🟢 그래서 **처리방침 변경 0 · 개인정보 보관 0** 이다.
                  🔴 「서버에서 파싱하자」로 바꾸면 그 성질이 통째로 사라진다
  🔴 차수 확정      **ⓐ 가 37차다**(2026-09-16). 그다음 ⓑ → ⓒ. 🔴 **옛 37차(CRM 항목 신설)는
                  뒤로 미뤘다** — 화주 539건 중 활성 **7건**이고 36차가 만든 거래조건 칸이
                  **539건 전부 비어 있다.** 🔴 **값이 동작을 일으키지 않는 칸은 아무도 안 채운다.**
                  🟢 영업 활동 기록도 지금은 아니다(사용자 확인: *「539건을 아직 거의 안 돌렸다」*)
  🟢 샘플 받았다   **2026-09-16 에 화물등록 창 캡처 + 목록 행 복사 텍스트를 받았다** —
                  v4 가 못박은 「샘플 없이 지시서를 쓰지 않는다」의 선행 조건이 풀렸다.
                  실측 결과는 **바로 아래 블록**이고 🔴 **ⓐ 지시서는 그 값을 전제로 쓴다**
  🔴 공개 저장소     샘플의 **실제 차주·의뢰자 정보를 커밋·PR·목 데이터에 넣지 말 것**
```
🔴 **샘플 실측 (2026-09-16 · 사용자가 화물등록 창 캡처 + 복사 텍스트 제공) — ⓐ 지시서의 전제다**
🔴 **실제 차주·의뢰자 정보는 저장소에 넣지 않았다**(이 저장소는 public) — 아래 값은 전부 가짜로 바꾼 것이고
숫자만 원본이다(구조·계산을 재려면 숫자가 필요하다).
```
  🔴 복사한 것은 창이 아니라 「하단 목록 행」이다
        붙여넣은 텍스트는 **헤더 줄 + 데이터 줄 두 줄**이고 **탭 구분 · 40열**이다
        (`화물번호 · SMS · 상태 · 처리시간 · 공유 · 혼적 · 고객명 · … · 왕복 · 정산일`).
        🔴 **창 위쪽 입력 폼은 드래그 복사가 안 된다** — 사용자가 복사한 것은 창 **아래쪽
        목록 그리드**의 한 행이다. v4 가 말한 「창에서 드래그 복사」의 실제 모습이 이것이다.
        🟢 **v4 의 「순서가 아니라 라벨로 가른다」가 실측으로 뒷받침됐다** — 헤더 줄이 곧
        라벨이라 24시콜이 열 순서를 바꿔도 이름으로 찾을 수 있다
  🔴 그래서 빠지는 것이 열 가지다
        목록 행에 **없는** 것 — **메모**(의뢰자 특이사항) · **거리(31.7km)** · **금액(55,000)** ·
        **합계(80,000)** · **할인액** · **수수료율(18%)** · **상세주소**(시/구/동까지만) ·
        **상하차 방법**(없음·지게차·수작업·호이스트·크레인·컨베이어) · **상차/하차 시점**
        (지금·당일·내일·월착·당착/내착) · **화물중량(1.00톤 이하)** · 독차/혼적은 빈 칸으로만.
        🟢 **ⓐ(배차 정보 채우기)에는 이것으로 충분하다** — 차주 이름·연락처·차량번호·
        운송료·수수료·화물번호가 전부 있다. 🔴 **부족해지는 것은 ⓑ(견적 폼)다** —
        상하차 방법·시점·특이사항·상세주소가 통째로 안 온다.
        **ⓑ 지시서는 「목록 행만으로는 안 된다」를 전제로 써야 한다**
  🟢 부가세 미결이 닫혔다   🔴 **결론은 「수수료 15,000 을 그대로 넣는다」다**(사용자 확정
        2026-09-16 — *"선착불 오더에서 적힌 수수료는 부가세 포함가이다"*). **35차의
        「`brokerage_fee` 는 부가세 포함가 기입」과 그대로 맞물린다** — ⓐ 는 변환 없이 넣는다.
        🔴 **「×1.1 해서 16,500 을 넣어야 한다」는 내 제안이었고 뒤집혔다 — 되살리지 말 것.**
        ⚠️ **다만 24시콜 화면의 산술은 다르게 보인다** — `합계 80,000 × 1.1 = 88,000` ·
        `88,000 − 산재 350 = 87,650`(화면의 「송금할운임(부가세포함)」과 **정확히 일치**)
        이므로 **화면상으로는 합계 80,000 이 공급가액**이고 그 안의 15,000 도 공급가액처럼
        읽힌다. 🔴 **그래도 실무 기준이 이긴다** — 합계·송금액은 **화주↔차주 운임 흐름**의
        계산이고, 수수료는 그와 별개로 **차주가 위캐리에 내는 돈**이다(35차 확정).
        ⚠️ **두 시스템이 같은 건의 수수료 공급가액을 다르게 본다**(24시콜 15,000 /
        우리 13,636 = 15,000÷1.1) — **세금계산서 대조에서 어긋날 수 있다.** 어긋나는 줄이
        나오면 이 문단을 볼 것
  🟢 v3 §1-9 불일치도 풀렸다  「차주 실수령 65,000 vs 송금할 운임 87,650」이 안 맞는다던 것 —
        **87,650 은 화주가 차주에게 줄 총액**(합계 부가세포함 − 차주 산재)이고 **65,000 은
        그중 차주 몫**이다. 차주가 받아서 수수료를 낸다. 🟢 **35차 선착불 모델과 맞는다**
  🔴 산재는 범위 밖이다     **ⓐ 는 산재를 다루지 않는다**(사용자 확정 2026-09-16 —
        *"산재는 일단 고려하지 말자"*). `industrial_insurance_*` 컬럼을 건드리지 말 것.
        ⚠️ **닫힌 것이 아니라 미뤄둔 것이다** — 기준액이 실제로 갈려 있다:
        24시콜은 **합계(80,000) 기준 + 10원 절사**(`floor(80,000 × (1−49.9%)) = 40,080` →
        `floor(40,080 × 1.76%/2) = 352` → **350**, 화면값과 일치)이고 우리
        `calcSettlement()` 는 **`driverBaseFare`(65,000) 기준이라 286** 이다.
        🔴 **나중에 산재를 맞추기로 하면 이 문단부터 볼 것** — 그때도 **말없이 재계산하면
        24시콜 정산서와 대조가 어긋난다**(v12 C장 반올림과 같은 자리)
  🔴 접수중은 범위 밖이다   **ⓐ 는 접수중 배차를 다루지 않는다**(사용자 확정 2026-09-16 —
        *"접수중 배차는 일단 다루지 말자"*). 🟢 **그래서 위 ④ 의 걱정이 없어졌다** —
        차주 기본운임 칸이 `dispatch_status !== "접수중"` 일 때만 그려지는데, 그 상태를
        아예 안 다루므로 칸이 항상 화면에 있다. 🔴 **붙여넣기 칸을 접수중 배차에도 그리지
        말 것**(값을 받아도 넣을 자리가 없다)
  🔴 「화주명」이 우리 회사다   목록 행의 `화주명` = **(주)디자인에그**(= 위캐리)이고, 실제 고객은
        창 왼쪽의 **「의뢰자」**다. 🔴 **`화주명` 을 `companies` 에 매핑하지 말 것** —
        그러면 모든 24시콜 건의 화주가 우리 회사가 된다
  🔴 수수료율 18% 를 믿지 말 것  화면에 「수수료적용 **18** %」가 있지만 실제는
        `15,000 / 80,000 = 18.75%` 이고 역산 기준액도 83,333 으로 안 맞는다.
        **버튼의 기본 요율이고 15,000 은 손으로 넣은 값**으로 보인다 — 🔴 **요율로 금액을
        재계산하지 말고 금액을 그대로 쓸 것**
  🔴 파싱 규칙(실측)     구분자 **탭** · 빈 칸은 **빈 문자열로 남는다**(라벨이 사라지지 않는다) ·
        🔴 **줄 끝의 빈 칸은 잘린다**(샘플은 헤더 40열인데 데이터가 38개에서 끝났다 —
        `왕복`·`정산일`이 빈 칸이라 사라졌다). **길이가 같다고 전제하지 말 것** ·
        금액에 **콤마가 있고 「원」은 없다**(`65,000`) · 날짜는 `2026-09-07` ·
        처리시간은 **연도 없이** `09-07 11:30` · 선택형도 함께 온다(`공유`·`Y`·`선/착불`)
  🟢 말이 맞는 자리     화면의 상차 **「지금」** · 하차 **「당일」** · **「당착/내착」** 체크와
        화물정보의 `지금상 당착-A` 가 **36차 PR 2 의 「지금·당착·내착」 칩과 같은 개념**이다
  ⚠️ 이사 화물이 섞인다   샘플 메모가 *「이사짐_이사보조…」* 다. 🔴 **위캐리는 이사를 취급하지
        않는다**(34차·65차 확정 · 고객 접점 문구에서 뺐다). 24시콜에서 가져오는 건에는
        섞여 들어오므로 **그 메모를 화주 접점 화면에 그대로 내보내지 말 것**
```

🔴 **v4 7장 「착수 전 확인」 중 코드로 잴 수 있는 넷을 실측했다(2026-09-16) — 지시서는 이 값을 전제로 쓸 것**
```
  ① external_order_no   🔴 **정말 없다.** `grep -rn "external_order_no" --include=*.ts --include=*.tsx
                        --include=*.sql .` 가 **0건**이다(코드·마이그레이션 양쪽). v3 조사 그대로이고
                        **신설이 맞다**(연결 열쇠 · unique)
  ② brokerage_fee       자리는 배차 상세 **「정산 정보」 카드 → 「선착불 정산 정보」 블록** 안이고
                        **`settlementValue.collection_method === "driver_direct"` 일 때만 그려진다.**
                        🔴 **그 칸에는 부가세 토글이 없다** — 라벨이 「주선수수료(**부가세 포함가**, 원)」
                        로 못박혀 있고 아래 캡션이 `toSupplyAmount()`(÷1.1)로 공급가액·부가세를 보여줄
                        뿐이다. `VatBasisSelect` 는 **화주 청구금액**과 **차주 지급운임** 두 칸에만 붙는다.
                        🔴 **그래서 ⓐ 가 「합계」를 `customer_charge` 에 넣을 때는
                        `customer_charge_vat_included` 를 함께 정해야 한다**(기본값이 `false` = 부가세 별도).
                        🔴 **선착불이 아니면 그 블록 자체가 안 그려진다** — 24시콜 건은 수금방식이
                        먼저 선착불이어야 `brokerage_fee` 칸이 화면에 나타난다.
                        ⚠️ 주석 실측 — **DB 에 5,000(포함가)과 4,545(공급가액)가 섞여 있다**
  ③ 저장 경로가 셋       🔴 **이것이 ⓐ 지시서가 가장 크게 놓치기 쉬운 자리다.** 한 번 붙여넣은 값이
                        **서로 다른 세 state 와 세 저장 버튼**으로 흩어진다 —
                          차주 이름·연락처·차량번호·확정 정보망  →  `externalDriverName` 등 **별도 state** ·
                            저장은 **`handleConfirm()`**(배정방식 카드의 「배차확정」 · `assignment_type==="external"` 분기)
                          화주 청구금액·부가세 구분 등             →  `editForm` · 저장은 **`handleSave()`**
                          차주 기본운임                           →  `payoutCalcForm` · 저장은 **`handlePayoutCalcSave()`**
                        🔴 **붙여넣기 칸 하나가 두 카드에 걸쳐 값을 채운다** — 자리는 **배정방식 카드 위**가
                        자연스럽다(맨 위에서 붙여넣고 아래로 내려가며 확인). 🔴 **줄 번호로 찾지 말 것**
                        (35차가 이 화면을 크게 고쳤다 · 지금 **2,525줄**)
  ④ driver_base_fare    🔴 **`driver_payout` 에 직접 넣지 말 것.** `handlePayoutCalcSave()` 가
                        `calcSettlement()` 결과로 **`driver_payout` 을 덮어쓴다** — 직접 넣으면 계산기를
                        여는 순간 사라지고 24시콜 「송금할 운임」과 대조할 근거도 없어진다.
                        ⚠️ **그 칸은 「차주 운임 상세 계산」 접이식 안이고 `dispatch_status !== "접수중"`
                        일 때만 그려진다** — 접수중 배차에 붙여넣으면 그 칸이 화면에 없다
```

🔴 **「캡처만으로 되는가」 — 두 축을 가를 것(2026-09-16 사용자 질문)**
```
  🟢 세션에게 주는 것   **캡처가 낫다.** 이번에 캡처만으로 복사 텍스트에 **없는 것 열 가지**를
        잡았다(메모 · 거리 · 합계 · 할인액 · 수수료율 · 상세주소 · 상하차 방법 · 상차/하차
        시점 · 화물중량 · 독차/혼적). **복사 텍스트는 목록 한 행이라 창보다 좁다.**
        ⚠️ **다만 숫자는 내가 눈으로 읽는 것이라 판독 오류가 날 수 있다** — 이번에는
        `80,000 × 1.1 − 350 = 87,650` 이 화면값과 맞아떨어져서 확신할 수 있었다.
        🟢 **서로 맞물리는 값이 화면에 같이 있으면**(합계 ↔ 송금할 운임처럼) **검산이 되어
        안전하다** · ⚠️ 작은 글씨·잘린 부분은 못 읽는다(이번 캡처도 하단 목록은 열 제목만
        보이고 데이터 행이 안 보였다)
  🔴 기능이 쓰는 것     **캡처가 아니라 복사 텍스트다. 바꾸지 말 것.**
        이미지를 붙여넣어 읽으려면 OCR 이 필요하고, 그 길은 둘 다 막혀 있다 —
        ① **서버로 이미지를 보내 OCR API 호출**: v4 가 확정한 **「서버에 보내지도 저장하지도
        않는다」가 통째로 무너지고** 처리방침 변경 · 비용 · 계약이 따라온다
        ② **브라우저 내장 OCR**: 한국어 정확도가 낮고 학습 데이터가 수 MB 라 번들이 무거워진다.
        🔴 **v3 가 OCR 이었고 v4 가 그것을 버린 이유가 정확히 이것이다 — 되돌리지 말 것.**
        🟢 **목록 행 복사가 실제로 된다는 것이 확인됐으므로 OCR 이 필요 없다**
  🔴 섞지 말 것        「사용자가 캡처를 편하게 준다」와 「기능이 캡처를 읽는다」는 **다른 얘기다.**
        앞은 기획·조사 단계의 편의이고 뒤는 제품 설계다
```

🔴 **24시콜 가져오기 설계서(v3, 2026-09-11)와의 대조 — ⚠️ v4 가 대체했다(위 블록)**
🔴 **아래는 지우지 말 것** — v3 의 어느 부분이 왜 낡았는지가 여기에만 있다.
설계서는 저장소에 없다(기획 채팅 산출물). 35차가 그 설계서를 **일부 이행했고 일부 낡게 만들었다.**
```
  🟢 이행됨   §8 「35차에 먼저 넣을 것」 2건이 이 차수에 들어갔다 —
             ① 선착불 받을 돈(A-1) ② 정산 자동등록 공용 함수화(A-6, `lib/autoCreateInvoice.ts`)
  ⛔ 착수 전  ⓐ 배차 정보 채우기 · ⓑ 견적 폼 · ⓒ 정산 엑셀. 엑셀을 **읽는** 코드 0건 ·
             `dispatches.external_order_no` 없음
  🔴 낡았다   §5 매핑표가 *"margin(생성컬럼) = 24시콜 수수료 → 자동 일치"* 라고 적는데,
             **35차가 선착불 마진의 출처를 `brokerage_fee ÷ 1.1` 로 바꿨다.**
             ⓐ 가 `brokerage_fee` 를 안 쓰면 배차 목록의 단순마진만 맞고 **정산 미수금·
             대시보드 마진이 0**이 되며 정산확정에서 0원 확인 창에 걸린다.
             → **§5 에 `brokerage_fee` 행을 더해야 한다**
  ⚠️ 미결     그 행의 **부가세 기준**. 설계서 자신의 실측(*"송금할 운임(부가세포함) =
             합계 × 1.1 − 산재"*)은 **합계 80,000 이 공급가액**임을 뜻하므로 수수료 15,000 도
             공급가액인데, 35차는 `brokerage_fee` 를 **포함가 기입**으로 확정했다.
             그대로 넣으면 마진이 **10% 적게** 잡힌다 — ⓐ 지시서가 정할 것
             ⚠️ 설계서 §1-9 는 차주 실수령을 **운송료 65,000** 이라 하는데 송금할 운임은
             **합계 기준 87,650** 이라 서로 안 맞는다 — 24시콜 화면 실물 확인이 필요하다
  🟢 닫힘     `customer_charge_vat_included` 는 **`false`(기본값)가 맞다** — 마이그레이션
             `2026-09-11_settlement_vat_and_fee.sql` 의 「합계가 포함가면 true 를 넣으라」
             경고는 위 근거로 닫힌다
  🟢 답 나옴  §7 「차주 운임을 `driver_base_fare` 에 넣을지 `driver_payout` 에 직접 넣을지」
             → **`driver_base_fare`** 다. `handlePayoutCalcSave()` 가 그 값으로 산재·부가세를
             계산해 **`driver_payout` 에 최종값을 덮어쓴다** — 직접 넣으면 계산기를 여는
             순간 덮어써지고 24시콜 「송금할 운임」과 대조할 근거도 사라진다
  🔴 낡았다   **v12 C장이 견적 계산에 만원 격자 반올림을 넣었다**
             (`lib/roundToUnit.ts` · 다마스·라보 5,000 / 나머지 10,000 · PR #158).
             🔴 **24시콜에서 가져온 실거래 금액은 격자값이 아니다.** ⓐ 가 값을 그대로
             넣는 것은 괜찮지만 **견적 재계산을 한 번이라도 거치면** 금액이 격자로
             올라가 **24시콜 원본과 갈린다**(예: 87,650 → 90,000).
             → **ⓐ 지시서에 「가져온 금액은 재계산하지 않는다」를 못박을 것**
  🟢 쉬워짐   위 ⚠️ 미결의 **부가세 기준**이 정리하기 쉬워졌다 — v12 가 견적서 금액 줄
             라벨을 **「공급가액 (부가세 별도)」**로 통일했고(PR #155·#158 · 여섯 곳),
             설계서 실측의 *「합계 80,000 이 공급가액」*과 **말이 맞는다.**
             🔴 **미결이 닫힌 것은 아니다** — `brokerage_fee` 를 **포함가로 기입**하는
             35차 확정은 그대로라, 그 행의 기준은 **여전히 ⓐ 지시서가 정한다.**
             🔴 **라벨이 맞은 것과 `brokerage_fee` 기입 기준은 다른 축이다**
```

🔴 **35차 착수 전 — 사용자가 배포본을 쓰면서 파악한 수정 항목 (2026-09-11 전달)**
🟢 **13건 전부 PR #146 에서 처리됐다**(2026-09-14). 🔴 **그래도 이 블록을 지우지 말 것** —
무엇을 왜 그렇게 고쳤는지의 출발점이고, 아래 「내가 코드에서 확인한 것」 중 **7번·10번·13번은
실제로 전제가 갈렸던 자리**라 근거가 여기에만 있다.
**작업지시서는 이 목록을 받아서 쓴다.** 🔴 **아래 「사용자 원문」은 요약하거나 고치지 말 것** —
지시서가 범위를 정할 근거다. 그 아래 「내가 코드에서 확인한 것」은 **내 조사이지 사용자 결정이 아니다.**

```
 [운송오더]
  1  운송오더 관리에 들어가면 바로 신규오더 등록창으로 시작하게 하자
  2  운송오더시 금액부분도 표시 및 기입 필요하다
  3  신규 운송오더 등록 메뉴·구성이 화주운송관리의 화물등록과 일치해야 한다
     (수정된 견적관리도 참고)
  4  회사명 입력 시 기존 운송 기록이 있는 업체는 최신 운송 오더 정보가 자동 기입
  5  화주 청구금액에 부가세 별도 / 부가세 포함 선택 옵션
     — 선착불 오더시 부가세 포함가를 화주가 차주에게 지불하는 경우도 있다
  6  선착불 오더시 수수료는 부가세 포함가로 기입

 [배차관리]
  7  🔴 운송완료하고 운임정보까지 다 적었는데 정산관리에서 차주지급액 등이
     표시가 안 되고 정산확정이 안 된다 (사용자 추측: 지나간 날짜에 운임료를 수정해서?)

 [정산관리]
  8  선착불은 위캐리가 화주에게 세금계산서 발행 불필요.
     다만 주선 수수료는 **차주에게 세금계산서 발행완료** 옵션이 있어야 한다
  9  선착불 오더시 수수료는 부가세 포함가로 기입  (6번과 같은 건)
 10  「수수료 지급자」 항목 불필요 — 수수료는 무조건 차주가 지급함
 11  선착불은 화주가 차주에게 직접 지급하므로, 운송완료되면 입금·지급이 완료로 되어야 한다

 [운영대시보드]
 12  화주포털 월별통계의 구성·디자인을 참고해 더 다양한 정보가 정리되어 보이게
 13  🔴 위캐리는 **마진 금액**이 중요하다 — 마진 금액 기준으로 통계를 낸다.
     전체 운임료 견적은 참고용으로 작게 들어가도 된다
```

🔴 **내가 코드에서 확인한 것 (지시서가 전제를 틀리지 않도록)**
```
  7번   🔴 **날짜 때문이 아닐 가능성이 크다.** `invoices` 의 금액은 **정산 건 생성 시점의
        스냅샷**이고 그 뒤 배차에서 운임을 고쳐도 따라오지 않는다(원칙 47번 · 신규 정산
        등록이 `insert` 로 배차 값을 복사한다). **정산 건이 배차 운임을 적기 전에 먼저
        만들어졌을 가능성**이 가장 크다 — 그렇다면 이것은 「버그」가 아니라 **스냅샷을
        갱신할 경로가 없는 것**이고, 원칙 47번을 건드리는 설계 결정이 된다.
        🔴 **정산확정이 막히는 자리는 따로 두 군데다**(`invoices/[id]` `handleConfirmSettlement`) —
        선착불에서 ① 수수료 > 0 인데 입금완료 미체크 ② 수수료 = 0 인데 지급자가 「면제」가
        아님. 그리고 **확정 버튼 자체가 `admin` 롤에게만 보인다.**
        ⚠️ **셋 중 무엇인지 먼저 가릴 것** — 답에 따라 35차 범위인지 별건인지가 갈린다
 10번   「수수료 지급자」는 `dispatches`·`invoices` 의 **`brokerage_fee_payer` 컬럼**이고
        화면 세 곳(배차 상세 · 정산 상세 · 정산 목록 계산)이 쓴다. 🔴 **값 중 `waived`
        (면제)가 정산확정 게이트에 실제로 쓰이고 있다**(위 ②) — 화면에서 빼는 것과
        컬럼·게이트를 없애는 것은 다른 작업이다. **어디까지인지 지시서가 정해야 한다**
  5·6·9 🟢 **27차가 이미 정한 것과 충돌하지 않는다** — 「선착불이면 견적서에 입금 계좌를
        그리지 않는다」(5라운드 확답: *"주선수수료는 화주가 주는 경우는 없다"*)는 그대로다.
        다만 **부가세 포함/별도 축이 하나 더 생기므로** `customer_charge_vat_included`
        (이미 있는 컬럼)와 어떻게 맞물리는지 지시서가 짚어야 한다
 12·13 🔴 대시보드는 **관리자 전용이고 API 도 `role === "admin"` 이중 체크**다(원칙 52번).
        🔴 마진은 값이 둘이다 — DB 생성 컬럼 `dispatches.margin`(단순마진)과
        `lib/settlementCalc.ts` 의 **실질마진**(공급가액 기준 + 주선사부담 산재보험료).
        **어느 쪽으로 통계를 낼지 지시서가 정해야 한다** — 섞으면 숫자가 안 맞는다.
        ⚠️ 포털 월별통계를 참고하더라도 **`--pv2-*` 는 `.portal-v2` 스코프 안에만 있다**
        (28차 조사 §7 · PR #145 에서 실측). 끌어오려면 `.pv2-tokens` 를 **추가**해야 한다
   3번  🟢 화주포털 발주 폼 블록 순서는 **① 구간 ② 일정 ③ 화물·차량 ④ 요청사항**이고
        견적관리(34·PR #143)가 그 순서·라벨·필수 강조까지 맞춰둔 상태다 — 오더도 같은
        기준을 쓰면 된다. 🔴 **포털 부품(`Pv2Select` 등)을 끌어오지 말 것**(같은 이유)
```
⚠️ **13건 중 코드·DB 를 안 건드리고 되는 것은 하나도 없다** — 전부 35차(또는 그 분할) 범위다.

🔴 **내부 정합이 또 밀렸다 — 열한 번째다.** 30~32차 → 32~34차 → 33~35차 → 34~36차 →
**35~36차**. 이번에는 34차 지시서가 「내부 정합 ①」이 아니라 **견적관리 화면 개편**으로
와서 오더가 35차로 넘어갔다. **예고 번호가 아니라 실제 실행 순서를 기준으로 볼 것.**
🟢 **35차는 2026-09-14 에 끝났고 36차 A·B장도 2026-09-15 에 끝났다**(PR #146 · #150).
⚠️ **이 문단은 2026-09-14 시점의 글이라 「다음」 표시가 낡았다** — 그 뒤로 36차 PR 2 ·
37차 24시콜 ⓐ · 38차 접수 알림이 전부 끝났다. 🔴 **지금 「다음」은 §5 로드맵 표의
`← **다음**` 한 곳만 볼 것**(2026-09-16 기준 **24시콜 ⓑ**).
🔴 **37차 자리가 바뀐 것은 그대로 유효하다** — **거래조건은 36차가 가져갔고**, CRM 항목
신설(업종·잠재등급·주요 노선 등)과 차주는 **뒤로 미뤘다**(사유는 v4 블록).
⚠️ **이 줄은 「남은 「차수 없는 소수정」은 admin 공개문의 배지 하나뿐이다」였는데**
**2026-09-22 에 그 항목을 닫았다** — 차수 없는 소수정은 지금 **0건**이다(위 로드맵).

🔴 **공개 화면이 6개가 됐다(PR #131·#132) — 다음 세션이 가장 먼저 알아야 할 것** —
전문은 위 두 「차수 없음」 기록:
```
  🔴 /q 는 색인 밖    **공개 화면이 8개가 됐다**(36차 PR 2 — `/q/[token]` 견적서 공유 링크).
                      다만 **noindex 라 아래 「색인 대상 7개」에 안 들어간다** — `app/q/layout.tsx`
                      의 `robots:{index:false}` + `app/robots.ts` 의 `disallow` **두 겹**이고,
                      `app/sitemap.ts` 는 동적 세그먼트를 건너뛰어 **저절로 빠진다**(손댈 것 없음).
                      🔴 `TopNav.isPublicPath` 에 `/q/` 가 있다(원칙 11번)
  색인 대상 7개        `/` · `/quote` · `/apply` · **`/guide`** · `/terms` · `/privacy` ·
                      `/email-policy` (= `sitemap.xml` 의 7 URL — ⚠️ **`/guide` 는 2026-09-14
                      신설**이고 `app/sitemap.ts` 가 라우트에서 자동으로 뽑으므로 코드 변경 0). ⚠️ 여기에 noindex 인 포털 진입 2개
                      (`/customer/login` · `/customer/support-verify`)가 더 있다
  🔴 `/guide` 진입 2곳  랜딩 「운송관리 소개」 카드 · **포털 로그인 화면**. ⚠️ **포털 홈 링크는
                      2026-09-14 에 뺐다**(PR #149) — 로그인한 화주는 포털 메뉴의
                      **「이용가이드」(`/customer/guide`)**로 간다. 🔴 **포털 홈에 되살리지 말 것**
  🔴 포털은 noindex     `/customer/guide` 도 `app/customer/layout.tsx` 를 상속해 noindex 이고
                      `sitemap.xml` 에 **넣지 않는다**(`app/sitemap.ts` 가 `/customer` 를 걸러낸다)
  🔴 삭제됐다          `/about`(회사소개) · `/vehicles`(차량·요금 안내) — 2026-09-08.
                      **없어진 것이 아니라 없애기로 확정한 것이다.** "왜 없지" 하고
                      되살리지 말 것. 필요해지면 **신규 제작**이다
  🔴 헤더 2종뿐         `components/landing/LandingHeader.tsx`(31차 시안 — `/`·`/quote`·
                      `/apply`) · `components/PublicPageHeader.tsx`(로고만 — 법적 문서
                      3종 + `/customer/login`·`/customer/support-verify`).
                      ⚠️ `components/LandingHeader.tsx`(37차)는 **파일째 없어졌다**
  🔴 푸터 링크          `SiteFooter` 에는 **법적 문서 3종뿐**이다(전자상거래법 제10조).
                      일반 페이지 링크 배열(`FOOTER_LINKS`)과 `showPageLinks` prop 은
                      **둘 다 없앴다 — 다시 만들지 말 것**
  🔴 라우트는 남긴다     `/terms`·`/privacy`·`/email-policy` 는 **모달과 별개로 살아 있어야
                      한다**(분쟁 시 시점 지목 · `robots.ts` Allow · `/apply` 「전문 보기」).
                      모달 하단 「전체 페이지에서 보기」 링크만 없앤 것이다
  🔴 지우지 말 것        `lib/companyInfo.ts` 의 `COMPANY_GREETING_*` — 읽는 화면은 0곳이지만
                      **인사말 초안이 남은 유일한 곳**이다
  ⚠️ 곁다리 발견        `BackToHomeLink` 의 「왔던 자리로 복귀」는 **30차 랜딩 교체 이후
                      한 번도 동작하지 않았다**(`?from=landing` 을 붙이는 곳이 0곳).
                      지금은 항상 `/` 맨 위로 간다 — 고치지 않았다(범위 밖)
  🟢 프리렌더 기준선     **46** (🔴 **2026-09-16 재실측 · v12 C장 merge 직후**).
                      🟢 **46 과 같았다** — 개수뿐 아니라 **46개 항목이 `diff` 0** 이다.
                      🟢 **`/q/[token]`(PR #151)은 이 목록에 없다** — 동적 세그먼트라
                      프리렌더 대상이 아니다(추측이 아니라 실측으로 확인했다).
                      🔴 **환경변수 없이 `npm run build` 를 돌렸을 때의 값이다** — 더미
                      `NEXT_PUBLIC_SUPABASE_*` 를 넣고 빌드하면 **실패가 0건**이라 비교
                      자체가 안 된다. 그 조건이 여태 어디에도 안 적혀 있었다.
                      ⚠️ **그 앞 값은 2026-09-14 실측이었다.**
                      ⚠️ **45 → 46 은 `/customer/guide` 하나가 늘어난 것이다**(PR #149,
                      항목을 `diff` 로 갈랐다). 그 앞 **44 → 45 는 `/guide`** 였다.
                      ⚠️ 그 전 이력 — 한동안 **43** 이라 적혀 있었고, `/about` 이 빠져 43 이
                      된 뒤 **32차가 `/admin/change-password` 를 더해 44** 가 됐는데 여기만
                      안 고쳤다. `/vehicles` 는 64차 ③ 이후 동적 라우트라 원래 목록에 없다.
                      🔴 **개수만 세지 말 것** — 늘어난 항목을 `diff` 로 확인해야 한다(35차 교훈)
```

⚠️ **완료된 지시서 차수 목록(1차 → 31차 · 차수 없음 9건)과 차수별 요약 3건을 `docs/history/` 로 옮겼습니다**
(2026-09-22 · **47,307자 · 840줄** + 2,133자 · **한 글자도 안 지웠고** 옮긴 일곱 덩어리가 아카이브 안에서
**바이트까지 같은 연속 구간인지** 대조했습니다 — `history-21` 이 공백 걷어낸 md5 만으로 개행 손실을 못 잡은 교훈).
🔴 **없앤 것이 아니라 옮긴 것이니** 근거를 찾을 때는 `grep -rn "…" docs/history/ CLAUDE.md` 로 **양쪽을 함께** 보십시오.

| 옮긴 것 | 어디로 |
|---|---|
| 완료된 지시서 차수 **1차 → 31차** + 차수 없음 9건 + 해소된 잔여 항목 4건 | `docs/history/roadmap-done.md` **「목록 2」** |
| 차수별 요약 **3건**(담당자 정보 #121 · 약관 terms-v4 #133 · 66차 정정) | `docs/history/summaries.md` 맨 아래 |

🔴 **아래에 남긴 것은 아직 살아 있는 9건뿐입니다** — 미정 차수 1건(③ anon GRANT 회수) · 확정 1건(월정산 (A)) ·
가산기준 잔여 1건 · 사용자가 배포본에서 확인할 것 2건 · 변호사 검토 1건 · 14차 잔여 6가지 · 답 대기 1건 ·
범위 밖 목록 1건. 🔴 **루트에는 「지금 상태」와 「다음」만 둡니다**(§0 머리의 규칙).

⚠️ **옮긴 목록의 마지막 줄은 「③(anon GRANT 회수) · 상차 시각 지정 가산 · 5톤급 재검토는 미정」이었는데
셋 중 하나가 낡아 있었습니다** — 🟢 **5톤급 재검토는 PR #135(v11)에 해소됐습니다**(근거와 「되돌리지 말 것」은
아래 「가산기준 조정」에 그대로 있습니다). 🟢 **남은 미정은 둘입니다** — **③ anon GRANT 회수**(바로 아래)와
**상차 시각 지정 가산 신설**(아래 「가산기준 조정」).

- 🔴 **③(anon GRANT 회수)은 미정 차수다.** RLS 가 이미 막고 있어 **추가 방어이며 급하지
  않다.** 함께 정할 것: 묶음 후보 뷰의 anon GRANT 회수(지금은 `security_invoker` 로만
  막혀 있다) · `dispatch_extra_charges` 의 컬럼 GRANT 정리.
  ⚠️ **`dispatch_extra_charges` 에는 여전히 직원 정책이 없다**(19차 그대로) —
  `authenticated` 전체 SELECT 를 주면 화주가 차주 지급액을 읽는다.
- 🟢 **「월정산」이 (A) 로 확정됐다**(2026-08-29, 사용자) — 담당자 화면은 그대로 두고 포털
  2화면만 화주 말로 바꾸되 **「청구: 월정산」을 별도 줄로** 뺀다. **30~32차의 전제가 풀렸다.**
  🔴 **(B)·(C) 를 다시 꺼내지 말 것** — 비교와 사유는 58차 ⑤ 에 있다.
- ⏸️ **가산기준 조정 — 22차에 대부분 끝났고 하나가 남았다.**
  🟢 **22차(52차 세션)에서 처리된 것**: 파손주의 `30,000 → 15,000` · 장척/중량
  `20%+80,000 → 15%+40,000` · **18톤 전 구간 ×0.89** · **8톤·15톤 신설**(11차급 165행).
  ⚠️ **「18톤 전 구간 ×0.89」와 「200km 이내만 −5.5%(341,000)」는 v11(PR #135)이
  덮어썼다** — 지금 165칸은 전부 `ROUND(차주지급 × 1.15, -3)` 이다. 22차 계수를
  근거로 되돌리지 말 것. 🟢 다만 **200km 구간이 차급 간격이 가장 좁다는 성질은
  그대로**이고 HANDOFF §5-1 에 표로 남아 있다.
  🔴 **아직 안 한 것 하나 — 별도 차수로 할 것**:
  - 🔴 **상차 시각 지정 가산 신설**(예고 +8,000) — `rate_surcharges` 에 **그 카테고리 자체가
    없는 것을 22차에 확인했다.** 새 카테고리 설계 + 견적 계산의 `selections` 배열 변경이
    따라오므로 코드 변경이 있는 차수다(22차는 값만 바꾸는 차수라 일부러 미뤘다).
  - ~~🔴 **5톤급 `base_fare` 재검토**~~ → 🟢 **v11(PR #135)에 해소됐다** —
    전 차급을 `ROUND(차주지급 × 1.15, -3)` 로 다시 깔았고 5톤 마진이 **17.3%** 다
    (98,000 → **115,000**, 게시가라 만원 단위로 맞춘 예외 칸). 🔴 **「실거래 42건에서
    마진 중앙값 13.6%(목표 17% 미달)」을 근거로 다시 조정하지 말 것** — 그 값은
    **v11 이전 운임에서 잰 것**이다.
  ⚠️ **11톤·25톤은 손대지 말 것** — 11톤은 검증됐고(완료 36건, +19.6%), 25톤은 완료 3건이라
  판단 불가다. **15톤·장척/중량도 관찰 대상**이니 실거래가 쌓이기 전에 또 만지지 말 것.
- ⚠️ **사용자가 배포본에서 확인할 것(18차 잔여)**: `/apply`에 체크박스가 **정확히 2개**이고
  약관 요약·거부권 문구가 읽을 만한지 / `/quote`에는 **약관 문구가 없는지**(사용자 결정대로).
  🟢 **DB 쪽은 해소됐다(52차)** — 사용자가 신청을 한 건 넣었고 `verify` ⑧-c 에
  `terms / terms-v1 / 1건`, ⑧-b 에 `application/terms → 원본 있음 1 · **고아 0**` 이 떴다.
  14차가 못박은 "join 까지 볼 것"까지 확인된 것이므로 **다시 확인할 필요 없다.**
- ⚠️ **사용자가 배포본에서 확인할 것(16·17·22차 잔여)** — 전부 **로그인이 필요하거나
  브라우저에서 봐야 하는 것**이라 이 환경에서 확인할 수 없다:
  `/vehicles` 시작가 **48,000원부터** / `/admin/quotes` 거리 `10.4` · `1톤` → **60,000원**,
  `5톤` · 대기 `90` → **50,000원** / 🔴 **`/admin/rates` 표에 8톤·15톤 포함 11개 열**이
  뜨고 18톤 값이 내려갔는지(22차) / 🔴 **`/customer/request` 희망 톤수가 11종**인지
  (21차에 6→9종, 22차에 9→11종. **여기는 대형이 나와야 맞는 곳**이다 — 46차 기준이
  21차에 바뀌었으니 "6개여야 한다"는 옛 기록에 속지 말 것).
  🟢 **운임기준표·동의 데이터 자체는 47차부터 `verify` 워크플로로 세션이 직접 확인한다**
  — 남은 것은 "화면에 어떻게 보이는가"뿐이다.
- 🔴 **변호사 검토 항목이 하나 늘었다(47차)** — `lib/legal/privacy.ts:211`의 제4조 표에
  **"운송을 의뢰한 고객에게 차주 성명·연락처·차량번호·차량 종류를 제공한다"**는 행이 있는데,
  **사용자 결정(2026-08-25)은 차주 정보를 화주에게 노출하지 않는 것**이다. 하지 않기로 한 일이
  기재된 상태이며 위반은 아니지만 사실과 다르다. 🔴 **임의로 고치지 말 것**(법적 문서다).
  아래 "동의 절차 잔여 6가지"의 2번(고지 항목 개편)과 **같은 차수에 함께 다루는 것이 맞다.**
  🟢 **⚠️ 위 문단은 2026-09-18 에 낡았다 — 그 행은 이제 「사실과 다른 기재」가 아니다.**
  「문자 발송 정리」(PR #176)가 **고객용 배차확정 문자**(`dispatch_confirmed_customer`)를 신설해
  **차주 성명·연락처·차량번호·차종을 실제로 화주에게 보낸다**(`lib/sms/templates.ts` · 비면 「미등록」).
  🔴 **그래서 방향이 뒤집혔다 — 「비노출이라고 적혀 있다」를 근거로 그 문자에서 기사 정보를 빼지 말 것.**
  🔴 **반대로 화주포털 화면에는 여전히 띄우지 않는다**(HANDOFF §5-4·§5-23 은 **화면 기준**이다).
  🔴 **그러니 「제4조를 고쳐야 한다」가 아니라 「제4조는 그대로 두고 화면·문자의 경계를 지킨다」가 지금 상태다** —
  변호사 검토 대상으로 남는 것은 **아래 "동의 절차 잔여 6가지"의 2번(고지 항목 개편)** 쪽이다.
  ⚠️ **HANDOFF §7 「법무」는 이미 이렇게 고쳐져 있었다** — 이 줄만 낡아서 두 문서가 갈려 있었다.
- 🔴 **14차에서 하지 않고 남긴 것 6가지**(43차 세션 — 지시서 7장이 기록을 요구한 항목):
  1. ~~🔴 **파기 로직이 없다**~~ → 🟢 **「차수 없음: 보유기간 만료 파기 장치」(PR #122)에서
     해소됐다.** `scripts/purge-expired.sql` 을 `.github/workflows/purge.yml` 이 **매일
     03:10 KST** 에 돌린다(제7조의 「5일 이내」 때문에 주 1회로는 안 된다).
     🔴 **`quote_id is null`·`company_id is null`·`status <> '승인됨'` 세 조건을 빼지 말 것** —
     거래 기록(5년)까지 지운다. 기산점은 신설한 `processed_at` 이고 `updated_at` 을 쓰면 안 된다.
     ⚠️ **자동화된 것은 이 둘뿐이다** — 제3조 자체기준의 나머지 4행은 「거래 종료일」·
     「동의 철회 시」 처럼 이벤트 기반이라 그 시점을 담는 컬럼부터 없다(범위 밖).
  2. **동의 문구 고지 4항목 개편**(수집항목·보유기간·거부권) — 두 문구 모두 개인정보보호법
     제15조 2항을 아직 다 갖추지 못했다. **변호사 검토와 함께** 할 일.
     ⚠️ **49차에 `/apply` 약관 동의 문구가 새로 생겼으니 그것도 같은 검토 대상**이다
     (요약 문장·거부권 안내 모두 초안이다)
  3. **마케팅 동의** — 담당자(연락처) 단위. `subject_type='phone'` + `individual_customers.
     phone_normalized`와 같은 정규화 방식을 재사용하면 테이블을 안 늘리고 붙는다
  4. `public_quote_requests`의 **anon INSERT 정책 제거** — 서버 API 실사용 검증 후
  5. ~~**`/customer/request`의 제3자 개인정보**(상·하차지 담당자 이름·연락처)~~ →
     🟢 **47차(20차 3-4)에서 해소됨.** 동의 체크박스 + `consents` 저장 + 서버 게이트까지 완료
  6. **화주 상세에 동의 표시**(신청서 경유 조회) — 필요해지면
- ⚠️ **답을 못 받고 남겨둔 것 1건(13차 리뷰)**: `/apply` **접수 완료 화면**의 기존
  "홈으로 돌아가기" 버튼은 홈 맨 위로 간다. 신청을 마치고 떠나는 자리라 그게 맞다고 판단해
  그대로 뒀고 리뷰에서 보고했으나 답이 없었다 — 폼 화면의 "← 홈으로"처럼 왔던 자리로
  돌려보내려면 `BackToHomeLink`로 교체하면 된다(한 줄).
- 그 밖에 아직 범위 밖인 것: ~~**`/vehicles`·`/about` 디자인 재구성**~~ → 🟢 **없어진
  항목이다** — 두 화면을 **2026-09-08 에 통째로 삭제**했다(PR #132, 사용자 확정 "나중에
  필요하면 새로 다시 만들면 된다"). 다시 만들 때는 재구성이 아니라 신규 제작이다,
  ~~**스크롤 모션**(레이아웃 확정 후 별도 세션)~~ → 🟢 **「차수 없음: 랜딩 모션」(PR #123)에
  완료됐다** — 🔴 **랜딩 한정이다.** `/vehicles`·`/about`·폼 3화면에는 리빌이 없고,
  토큰(`--mo-*`)도 `.landing-page` 스코프 안에만 있다. 다른 공개 화면에 넣으려면
  스코프부터 정해야 한다(`globals.css` 에 두지 말 것 — 관리자 31화면이 공유한다),
  ~~**`/vehicles`에 냉장·냉동 등 나머지 차량형태를 노출할지 여부**~~ → 🟢 **그 화면이
  없어져 해당 없다**(PR #132). ⚠️ **랜딩 ④ 차량 섹션의 12종은 그대로 살아 있다** —
  `components/landing/data.ts` 의 `vehicles` 가 정의처다, FAQ(보류), 푸터 디자인(5차 결정대로
  보류), 견적서 PDF에 로고 미표시(대표번호는 33차에 반영됨),
  관리자·화주포털 헤더 로고(랜딩만 적용됨),
  ~~OG 공유 이미지~~ · ~~SEO 일괄(metadataBase·canonical·Open Graph·OG 이미지·sitemap.xml)~~
  → 🟢 **63차(차수 없는 도메인 반영)에 전부 완료됐다.** ⚠️ **남은 것은 서치콘솔·서치
  어드바이저 등록뿐**이고 그건 코드가 아니라 사용자가 DNS 에 TXT 를 넣고 사이트맵을
  제출하는 일이다(급하지 않다), 성능 점검
  (Lighthouse mobile, LCP/CLS/INP, Hero 이미지 `next/image` — 37차에 자리표시자를
  일반 `<img>`로 뒀으므로 실제 사진을 넣을 때 `next/image` 전환을 함께 검토할 것)

### 인프라 리전 (2026-08-12 확인·조치 완료)

- **Supabase 프로젝트: `ap-northeast-2`(Northeast Asia, 서울)**
- **Vercel 함수 리전: 서울 `icn1`** — 원래 Vercel 기본값인 워싱턴(`iad1`)이었던 것을
  이 날 서울로 변경 후 재배포함(Hobby 플랜이라 리전 1개만 선택 가능). 이 설정은
  `vercel.json`이 아니라 **Vercel 대시보드(Settings → Functions → Function Region)에만
  존재**하므로 코드로는 확인할 수 없음 — 나중에 값을 확인해야 하면 대시보드를 보거나,
  배포된 사이트 응답 헤더 `x-vercel-id`의 **두 번째** 지역 코드를 볼 것(첫 번째는 접속
  지점이라 함수 리전과 무관하게 한국에서 접속하면 `icn1`로 나옴 — 헷갈리기 쉬움).
- 이 설정이 실제로 영향을 주는 범위: **서버 API 라우트(`app/api/**`, 전부 Node 런타임)**.
  `middleware.ts`는 Edge 런타임이라 전 세계 엣지에 배포되므로 이 설정과 무관하고,
  화면 대부분의 데이터 조회는 브라우저가 anon 키로 Supabase에 직접 붙어서 Vercel을
  아예 거치지 않음(원칙 2번 구조). 즉 리전 변경으로 빨라지는 건 SMS 발송·정산 저장·
  대시보드 집계·POD 업로드처럼 **서버를 거치는 작업들**임.
- **앞으로 서버 쪽 성능을 판단할 때 이 사실을 전제로 할 것**: 함수와 DB가 둘 다 서울에
  있으므로 서버 API의 DB 왕복은 이제 국내 지연(수 ms) 수준임. 예전에 "업로드·조회가
  느리다"는 피드백이 나왔던 건들(17차 세션 POD 업로드 등)은 이 변경 전 환경이었다는
  점을 감안할 것.

이 트랙과 별개로 남아있는 우선순위는:

1. 카카오 알림톡 자동화 — 사업자 인증·발신프로필 심사가 필요해 **미리 신청 절차부터
   시작하는 것을 권장** (승인에 시간 걸림)
2. 화주포털 발주요청 2차 기능(화주 직접 오더 입력)
3. ~~커스텀 도메인 연결~~ → 🟢 **끝났다**(`wecarrylogis.co.kr`, 2026-09-01 · 63차).
   공개 화면 UX 고도화는 그대로 보류 중
4. 유료 플랜 전환 (🟢 **화주 목록 페이지네이션은 PR #144 에 끝났다** — 여기서 뺀다)
5. ~~운영 대시보드(로드맵⑥) 고도화~~ — 🟢 **35차(PR #146)에 대부분 해소됐다.**
   기간 선택 UI(프리셋 5개 + 월 직접 선택, 서버 `?months=` 까지) · 월별 마진 세로 막대
   그래프 · 마진 기준 재편 · 엑셀 다운로드(시트 5종) · 부가세 포함가 병기가 들어갔다.
   🔴 **차트 라이브러리는 안 썼다** — 인라인 CSS 막대다(의존성 0). 되돌려 라이브러리를
   넣을 이유가 생기면 그때 판단할 것.
   **남은 것**: 섹션별 API 분리(데이터가 커지면) · 🔴 **390px 가로 스크롤**(516px,
   35차 이전부터 있던 것 — 휴대폰에서도 볼지 정해야 한다)
6. ~~**SMS 문구·발송 방식 정리**~~ — **33차·35차에 이어 2026-09-18 「문자 발송 정리」로
   마무리됨**(HANDOFF §5-25). 🔴 **문자는 이제 7종이고 배차확정이 두 통**(차주 「화물정보
   안내」 + 고객 「배차확정 안내」)이며 **머리말이 `[위캐리운송]` 하나**다. 상차·하차완료
   문자는 폐지됐다. 23차의 "발송 직전 확인 모달" 방식은 그대로 유지되고 있음.
   **남은 후보**(전부 사용자가 원할 때만): (a) 나머지 여섯 종에도 LMS 제목 넣기 —
   본문 첫 줄이 이미 "[위캐리운송] xxx 안내"라 제목을 붙이면 알림창에 같은 말이 두 번
   나오므로 **첫 줄을 빼는 작업이 같이 필요**함(35차에서 범위 문제로 미룸),
   (b) 견적안내에 유효기간 한 줄 — `quotes`에
   컬럼은 없고 "발행일+7일" 규칙이 견적서 PDF·엑셀·약관 제7조 2항에 있음, (c) 견적안내에
   운송관리 링크 — **게스트 견적은 계정이 없어** 링크가 무의미하므로 회원 건에만 붙이는
   분기가 필요, ~~(d) 문자 발송 이력 통합조회 화면~~ — **36차에 완료**(`/admin/sms-logs`)

## 6. 보류 중인 작업 (나중에 이어서 진행)

- **Resend 이메일 발송 활성화**: 코드는 이미 만들어져 있음(계정정보 발송, 거절/보류
  사유 안내 발송). resend.com 가입 → API 키 발급 → Vercel에 `RESEND_API_KEY` 환경변수
  등록만 하면 즉시 작동. 관련 파일: `app/api/admin/send-portal-credentials-email/route.ts`,
  `app/api/admin/send-application-status-email/route.ts`
- **사업자등록번호 진위확인**: 국세청 "사업자등록정보 진위확인 및 상태조회" API 필요.
  공공데이터포털(data.go.kr) 가입·신청 절차부터 시작해야 함. 현재는 자동 하이픈
  포맷팅만 되어 있고 실제 진위확인은 안 됨

---

## 7. 자주 막히는 지점 (문제 생기면 여기부터 확인)

- **admin에서 새 anon-locked 테이블(공개문의류) 만들 때**: SELECT 정책 절대 열지
  말 것, 서버 API + 폴링 패턴 재사용 (원칙 3, 4번)
- **화주 회사(`companies`) 테이블 컬럼명 확인 시 주의**: 사업자등록번호는
  `biz_reg_no`(business_reg_no 아님!) — 실제로 잘못된 이름으로 코드를 짰다가
  고친 이력 있음. 🔴 **컬럼명이 불확실하면 `lib/companyFields.ts` 의 `COMPANY_FIELDS`
  를 먼저 확인할 것**(33차 신설 — 화주 항목의 유일한 정의처다).
  ⚠️ **이 자리는 오래 `companies_id_page_final.tsx` 의 `BASIC_FIELDS`/`SALES_REF_FIELDS`
  를 가리키고 있었는데 그 파일은 존재하지 않는다** — 33차 착수 전 확인에서 드러났다
- **새 공개 페이지 추가 시 TopNav 숨김조건 누락 주의** (원칙 11번)
- **표/카드 이중관리**: 컬럼 하나 추가할 때 데스크탑/모바일 버전 둘 다 확인
  (원칙 13번)
- **화주신청 승인 API 재실행 방지**: `application.company_id`가 이미 있으면 중복
  승인 차단하는 로직이 `approve-application/route.ts`에 있음 — 이 체크를 실수로
  지우면 중복 화주 생성 버그 재발함
- **회사/계정 삭제할 때 Auth 유저 빠뜨리지 말 것** (원칙 19번) — 빠뜨리면 이메일이
  "이미 등록됨"으로 막히는데 관리자 화면 어디에도 원인이 안 보여서 디버깅이 어려움
- **Vercel Preview(PR) 배포에서 로그인이 안 되거나 "서버에 OOO가 설정되어 있지
  않습니다" 에러가 뜨면**: 십중팔구 환경변수가 Production에만 등록되고 Preview에는
  체크가 안 되어 있는 경우임. Vercel 프로젝트 → Settings → Environment Variables에서
  각 변수의 적용 환경에 Preview도 켜져 있는지 확인
- **git push 직후 곧바로 PR을 merge하면 마지막 커밋이 반영 안 될 수 있음** (실제로
  한 번 겪음 — GitHub이 최신 push를 미처 인식하기 전에 merge가 실행된 것으로 추정).
  merge 전에 PR의 head 커밋 sha가 방금 push한 커밋과 일치하는지 확인하고 merge할 것
- **`created_by`/`updated_by` 같은 새 외래키 컬럼을 여러 테이블에 한 번에 추가하는
  마이그레이션을 짤 때**: 그중 한 테이블에 레거시로 남아있던 동명의 컬럼이 있으면
  `add column if not exists`가 조용히 아무것도 안 하고 넘어가서, 새로 의도한
  참조(`staff_accounts`)가 아니라 예전 참조가 그대로 남을 수 있음 (원칙 27번,
  `quotes.created_by`가 실제로 이렇게 `profiles` 테이블을 참조하고 있어서 FK 위반
  에러가 났던 사고 있었음). insert/update가 "FK violates constraint" 에러를 내는데
  값 자체는 멀쩡해 보인다면, `pg_get_constraintdef`로 그 제약조건이 진짜 어디를
  참조하는지부터 확인할 것
- **정산(`invoices`) 관련 화면 작업할 때**: `company_id`는 nullable이라 게스트
  (비회원) 고객 오더도 정산이 가능함 — 화면에서 화주명을 표시할 때
  `companies?.name`만 보지 말고 반드시 `orders.guest_name`도 fallback으로 같이
  처리할 것 (안 그러면 개인고객 정산 건은 목록에 이름이 안 뜸)
- **직원(staff) 권한 관련 기능을 테스트할 때**: 관리자 계정만 테스트하면 권한 체크가
  실제로 걸리는지 확인이 안 됨 — 반드시 role이 `staff`인 계정으로도 로그인해서
  삭제 버튼이 안 보이는지, 운임기준표가 조회 전용인지 등을 같이 확인할 것
- **가끔 `invalid JWT: unable to parse or verify signature ... unrecognized JWT kid
  <nil> for algorithm ES256` 에러가 뜨는 경우**: 이 프로젝트에서 지금까지 두 번
  겪었음(`/admin/account-cleanup` 검색 중 한 번, 화주등록신청 승인 처리 중 한 번) —
  둘 다 **재시도하면 바로 해결됨**. Supabase 프로젝트 쪽 JWT 서명키 검증 과정에서
  생기는 일시적 문제로 보이며, 코드 버그로 보이진 않음. 이 에러가 뜨면 당황하지 말고
  같은 동작을 한 번 더 시도해볼 것 — 계속 반복되면 그때 Supabase 대시보드 →
  Settings → API의 JWT 설정을 확인
- **"페이지 전환/메뉴 클릭이 느리다"는 피드백을 받으면 네트워크 중복 호출부터
  의심하기 쉽지만, 먼저 새로 추가한 링크가 `<a href>`가 아니라 `next/link`의
  `Link`인지부터 확인할 것** (원칙 31번) — `<a href>`로 된 내부 링크 하나만 있어도
  그 링크를 쓰는 화면 전체가 하드 리로드되어 다른 모든 성능 최적화가 무색해짐.
  실제로 이 프로젝트에서 캐싱·middleware 최적화를 다 하고도 체감 개선이 없었던
  이유가 결국 이것이었음
- **삭제 API가 "violates foreign key constraint" 에러를 내는데 화면에 그 이유가
  안 보인다면**: 실제 업무 데이터(견적/오더/정산 등)가 남아있어서 막힌 게 맞는지,
  아니면 `support_access_logs`처럼 순수 이력용 테이블이 `on delete` 옵션 없는
  FK로 걸려있어서 불필요하게 막힌 건지부터 구분할 것 (원칙 32번). 후자라면 로그
  테이블 쪽 FK를 `on delete set null`로 바꾸는 게 맞고, 전자라면 막히는 게
  의도된 동작이니 건드리지 말 것
- **`enum` 같은 상태값 컬럼에 새 값을 추가했는데 insert/update가 "violates check
  constraint" 에러를 내면**: `lib/dispatchStatusColors.ts` 같은 코드 쪽 옵션
  목록만 바꾸고 DB의 CHECK 제약조건은 그대로 둔 경우가 많음. 코드 저장소에
  마이그레이션 파일이 없어서 이런 제약조건의 존재 자체를 놓치기 쉬움 —
  `select conname, pg_get_constraintdef(oid) from pg_constraint where
  conrelid = '테이블명'::regclass`로 그 테이블에 걸린 제약조건을 먼저 확인하는
  습관을 들일 것 (`dispatches.dispatch_status`에 실제로 이 문제가 있었음)
- **낙관적 잠금(원칙 28번) 쓰는 상세화면에서 "방금 내가 한 조작인데 다른 직원이
  수정했다고 뜬다"는 신고를 받으면**: 그 화면 안에 상태 드롭다운·체크박스처럼
  낙관적 잠금 없이 즉시 저장되는 다른 액션이 있는지부터 확인할 것 (원칙 36번).
  그 액션이 로컬 `updated_at`을 안 갱신하고 넘어가면 다음 낙관적 저장이 오탐함
- **`quotes` 테이블의 견적 조건값(상차조건/하차조건/차량형태/물품특성/운송시간/
  왕복편도 등)을 SQL로 직접 수정하려 할 때**: `load_condition`처럼 별도 컬럼이
  있을 거라고 짐작하지 말 것 — 전부 `selected_options`(jsonb) 안에 한글 키로
  묶여서 저장됨. 반면 `orders`/`portal_order_requests`는 반대로 진짜 flat
  컬럼임. 이 둘을 혼동해서 마이그레이션 SQL을 잘못 짜고 재작성한 적 있음 —
  UPDATE 문 쓰기 전에 그 테이블 저장 코드(`.insert()`/`.update()` payload 모양)
  를 먼저 확인할 것
- **`manual_source_note`(화주 상세의 "출처 설명")는 출처분류가 "기타"일 때만
  쓰는 전용 칸** — 다른 승인/등록 흐름에서 임의 텍스트를 저장할 목적으로
  재사용하지 말 것(과거 `/apply` 승인 처리가 이 칸에 신청 메모를 넣었다가,
  출처분류를 "기타"로 바꾸는 순간 엉뚱한 텍스트가 나타나는 버그가 있었음).
  분류에 안 묶이는 자유 메모는 `companies.notes`(일반 메모)에 넣을 것
- **여러 목록 화면이 같은 상세 페이지(`/admin/companies/[id]` 등)를 공유할 때**:
  URL이 항상 같은 접두어로 시작해서, `TopNav.tsx`의 `pathname.startsWith()` 기반
  활성메뉴 판정이 실제로 어느 목록에서 들어왔는지와 무관하게 한쪽 메뉴만 계속
  활성표시할 수 있음(실제로 `/admin/companies/[id]`가 "화주 확보"/`admin/companies`
  쪽으로만 항상 표시되고, "화주 관리"/`admin/customers`에서 들어가도 마찬가지였던
  버그 있었음). 상세 화면을 여러 목록에서 공유한다면 `?from=xxx` 같은 출처
  파라미터(`?from_order` 패턴과 동일)를 목록→상세 이동 시 붙이고, `TopNav.tsx`와
  상세화면의 "목록으로" 링크 둘 다 이 파라미터를 참고하도록 만들 것
- **로컬/샌드박스에서는 `npm run build`가 잘 되는데 Vercel 배포에서만
  실패한다면**: 십중팔구 `NEXT_PUBLIC_SUPABASE_URL` 등 환경변수 차이 때문에
  로컬에서는 도달하지 못했던 코드 경로가 Vercel(진짜 환경변수 있음)에서는
  실행되면서 드러나는 문제임. 실제로 `TopNav.tsx`에 `useSearchParams()`를
  Suspense 없이 추가했을 때, 로컬 빌드는 대부분 페이지가 Supabase 환경변수
  누락으로 그보다 먼저 실패해서 이 문제가 안 보였지만 Vercel에서는 바로
  드러났음(원칙 38번). Vercel 빌드 로그의 정확한 에러 메시지부터 확인할 것 —
  로컬에서 안 나던 에러라고 원인불명 취급하지 말고, "로컬은 조건이 다르다"는
  것부터 의심할 것
- **기존 컬럼을 재사용하려고 `update()`했는데 "column ... can only be updated
  to DEFAULT" 에러가 나면**: 그 컬럼이 PostgreSQL 생성 컬럼(generated column —
  다른 컬럼으로부터 자동 계산되는 컬럼)이라 직접 값을 못 넣는 것임. 원칙 27번
  사전확인 쿼리(`information_schema.columns`)는 컬럼이 "존재하는지"는 잡아내지만
  "생성 컬럼인지"까지는 안 알려줌 — 이 에러를 실제로 만난 적 있음
  (`dispatches.margin`을 재사용하려다가 발견, 알고 보니
  `customer_charge - driver_payout` 자동계산 컬럼이었음). 의심되면
  `select column_name, is_generated, generation_expression from
  information_schema.columns where table_name = '...'`로 먼저 확인하고, 생성
  컬럼이면 그 컬럼은 update 대상에서 빼고 원인이 되는 컬럼만 갱신하면 DB가
  알아서 재계산함
- **날짜/시간 입력창(`DateTimePicker`) 값을 저장했는데 목록/상세에서 다른
  시각으로 보인다면**: 십중팔구 오프셋 없는 로컬 문자열을 그대로
  Supabase에 넘겨서 생기는 타임존 버그임(원칙 41번) — 새 datetime 저장
  코드를 짤 때 `lib/localDateTime.ts`의 `localInputToISOString()`(저장)/
  `toLocalDateTimeInput()`(불러오기)를 거치지 않고 값을 그대로 넣거나
  `.slice(0, 16)`처럼 문자열을 잘라서 쓰고 있는지부터 확인할 것. 실제로
  견적/운송오더의 희망 상차·하차일시가 이 문제를 겪었고, 자정을 넘는
  일시 조합(저녁 상차+익일 아침 하차)일 때 날짜까지 바뀌어서 특히 눈에
  띄었음
- **정산방식(`settlement_type`) 관련 화면 작업할 때**: 오더/배차/정산 3개
  화면에만 조회·수정 UI가 있고, **견적 상세/수정 화면에는 없음**(등록 시
  1회 입력만 가능) — "4개 화면 전부 있다"고 가정하고 코드를 찾으면 헛수고임
  (0단계 조사, 9차 세션에서 확인)
- **`invoices.receivable_amount`/`payable_amount`는 죽은 컬럼**임 — 저장은
  되지만 어느 화면도 이 값을 읽지 않음. 실제 화면에 쓰이는 값은
  `customer_charge_total`/`driver_payout_total`이므로, 정산 금액을 다루는
  코드를 새로 짤 때 이 두 컬럼 이름과 헷갈리지 말 것(0단계 조사, 9차 세션)
- **정산관리(`invoices`) 상세 저장 중 메인 저장(상태/세금계산서/입금/
  차주지급)은 12차 세션(정산 마감·확정·잠금)부터 서버 API
  (`app/api/admin/invoices/save/route.ts`)를 거치도록 바뀜** — 저장
  직전 `locked`를 fresh 조회해서 확정된 건은 관리자+사유입력만 허용함
  (원칙 44번). **다만 정산방식 변경(`handleSettlementTypeChange`)은
  여전히 anon 클라이언트 직접 update**임 — 화면단에서 잠긴 건이면
  버튼을 비활성화해두긴 했지만 서버단 잠금 체크는 아직 없어서, 브라우저
  콘솔로 직접 호출하면 확정된 건의 정산방식을 우회해서 바꿀 수 있는
  잔여 위험이 있음(0단계 조사 9차 세션에서 처음 발견, 12차 세션에서
  메인 저장 경로만 해소하고 이 경로는 범위 밖으로 남겨둠 — 필요해지면
  같은 패턴으로 서버 API화할 것)
- **"먼저 조회해서 없으면 insert" 패턴을 쓸 때**: 애플리케이션 레벨의
  사전조회만으로는 완전히 동시에 들어오는 두 요청(true race)을 못 막음 —
  반드시 대상 컬럼에 DB UNIQUE 제약을 걸고, insert가 유니크 위반 에러
  (Postgres 코드 `23505`)를 던지면 그걸 잡아서 다시 조회 후 기존 행을
  반환하는 이중 처리로 만들 것. `dispatch_photos`의 finalize API(로드맵④,
  17차 세션 — `storage_path` UNIQUE + `23505` 캐치)가 이 패턴의 실제 구현
  사례. 사전조회만 하고 DB 유니크 제약을 빠뜨리면, 평소엔 문제없다가 네트워크
  재시도 등으로 같은 요청이 거의 동시에 두 번 들어오는 드문 상황에서만
  중복 행이 생기는 재현하기 어려운 버그가 됨
- **admin·화주포털이 같이 읽는 공용 테이블(`dispatch_photos` 등)에 화주포털
  노출 금지인 새 카테고리·값을 추가할 때**: "화주포털 화면이 이 값을 안
  보여주니 안전하다"고 넘기지 말고, 그 테이블을 읽는 화주포털 서버 API가
  이미 카테고리·타입 필터 없이 통째로 조회하고 있는지부터 확인할 것.
  `dispatch_photos`에 `claim` 카테고리를 추가하려던 로드맵⑤(18차 세션)
  사전조사에서, 화주포털 list API(`app/api/customer/dispatch-photos/
  list/route.ts`)가 `dispatch_id`로만 필터하고 카테고리는 전혀 안 거르고
  있어서 `claim`을 추가하는 순간 API 응답 자체에 클레임 사진 메타데이터가
  그대로 실려 나갈 뻔했음(화면이 그 필드를 안 보여주는 것과, API가 애초에
  안 주는 것은 완전히 다른 방어선 — 원칙 3·9번과 같은 결). 새 값을 추가하기
  전에 화주포털 쪽 조회 지점부터 훑어보고, 없다면 허용목록(allow-list) 필터를
  명시적으로 추가할 것 — 금지목록(deny-list)보다 나중에 카테고리가 하나 더
  늘어도 자동으로 안전한 허용목록 쪽이 더 안전함
- **공용 CSS 클래스(`.field input` 등)의 값을 바꾸고 싶을 때는, 그 클래스를 몇
  곳이 같이 쓰는지부터 확인하고 전역 변경 대신 스코프 래퍼 클래스를 쓸 것.**
  `/quote`·`/apply` 입력창을 16px로 올려야 했을 때(iOS Safari가 16px 미만 입력창에
  포커스하면 화면을 자동 확대함) `.field input`(14px)을 그냥 고치면 관리자 화면 등
  16곳이 전부 같이 바뀜 — 두 페이지 최상위에 `.public-form` 래퍼를 두고 그 안에서만
  올리는 방식으로 처리함(26차 세션). **이때 새 규칙이 기존 규칙과 특성도가 같으면
  (`.public-form input`과 `.field input` 둘 다 0,0,1,1) 나중에 선언된 쪽이 이기므로,
  반드시 기존 규칙보다 아래에 배치해야 적용됨** — 위에 두면 조용히 안 먹힘
- **랜딩(`/`)은 TopNav가 숨겨지는 독립 화면이므로(원칙 11번) `.nav-mobile-toggle`/
  `.nav-desktop-group` 같은 TopNav 전용 클래스가 전혀 적용되지 않는다.** 랜딩 헤더에
  모바일 대응이 있는 줄 알고 넘어가면 안 됨 — 실제로 링크 4개가 `flexWrap` 없이 한 줄에
  붙어 있어서 360px에서 81px 가로 오버플로우(진짜 가로 스크롤)가 발생하고 있었음
  (26차 세션에서 `components/LandingHeader.tsx`로 분리해 해소). 랜딩에 UI를 추가할
  때는 TopNav 클래스를 끌어오지 말고 랜딩 전용(`.landing-*`)으로 새로 만들 것 —
  동작 방식(바깥 클릭 시 닫힘 등)만 참고하면 됨
- **모바일 레이아웃이 깨졌다는 신고를 받으면 눈으로 보고 짐작하지 말고
  `document.documentElement.scrollWidth === clientWidth`로 실측할 것.** 가로 스크롤은
  원인 요소가 화면 밖에 있어서 스크린샷만으로는 어느 요소인지 특정하기 어려운데,
  뷰포트 밖으로 나간 요소를 `getBoundingClientRect()`로 전수 조사하면 바로 찾을 수
  있음(26차 세션에서 Playwright로 이 방식을 씀). 흔한 원인 순서: `min-width`가 큰
  요소 → `white-space: nowrap` → 고정 px 폭 → `100vw`+padding → 줄바꿈 안 되는 긴
  텍스트 → `absolute`/`fixed` 요소
- **검색엔진 색인 차단은 `robots.txt`만으로 끝내면 안 됨** — robots.txt는 크롤을
  막을 뿐 이미 색인된 결과의 삭제를 보장하지 않음. 핵심 방어선은 각 세그먼트
  `layout.tsx`의 `robots: { index: false, follow: false }` metadata이고 `app/robots.ts`의
  `Disallow`는 보조임(둘 다 유지할 것, 26차 세션에서 `/admin`·`/customer`·`/status`에
  적용). 원칙 25번의 "화면단+서버단 이중체크"와 같은 결
- **`brand/` 폴더의 로고·파비콘은 이미 가공된 파일이다 — 디자이너 원본(Illustrator
  내보내기)으로 다시 덮어쓰지 말 것.** 원본 워드마크는 viewBox가 `0 0 1000 200`인데
  실제 아트웍은 969×139만 차지해서, CSS로 `height:28px`를 줘도 **로고가 19px로 작게
  렌더링되는** 문제가 있었음(빈 여백까지 높이에 포함되기 때문). 그래서 viewBox를 아트웍
  bbox+여백으로 크롭해둔 상태(`9 25 982 151`)이고, 길이 0짜리 흰색 `<line>` 잔여물도
  제거되어 있음. 로고가 갑자기 작아 보이면 누가 원본으로 덮어썼는지부터 의심할 것.
  자세한 가공 내역·주의사항은 `brand/README.md` 참고
- **워드마크(`components/BrandLogo.tsx`)는 반드시 인라인 SVG여야 한다 — `<img src>`나
  `next/image`로 바꾸면 안 됨.** 루트에 `fill="currentColor"`가 걸려 있어 부모의 `color`를
  상속받는 구조라(다크 배경에서 흰색 전환 가능), 이미지로 참조하면 색이 검정으로 고정되어
  어두운 배경에서 로고가 안 보임. 반대로 **파비콘은 배경색이 채워진 디자인이라
  `currentColor` 처리가 없음** — 둘의 색상 처리 방식이 다르다는 걸 기억할 것.
  또 `brand/wecarry-logo.svg`와 이 컴포넌트는 같은 그림의 사본 2개이므로 **로고가 바뀌면
  반드시 둘 다 갱신**해야 함
- **랜딩 헤더에 요소를 추가하면 360px 가로 스크롤을 반드시 재확인할 것.** 워드마크
  종횡비가 6.50:1로 가로가 길어서(모바일 24px 높이 → 폭 156px) 여유가 거의 없음 —
  현재 360px에서 로고 우측 끝 180px, CTA 우측 끝 336px로 **남는 폭이 24px뿐**임.
  27차에서 로고를 넣을 때 이 여유를 확보하려고 모바일 높이를 24px로 낮췄고, 20px 이하로
  더 내리면 로고 안의 한글 "위캐리 운송" 판독이 어려워지므로 임의로 줄이지 말 것
- **파비콘은 `app/icon.svg`·`app/apple-icon.png`(App Router 파일 컨벤션)에 있고
  `brand/`에 사본을 두지 않았다.** Next.js가 이 두 파일을 보고 `<link rel="icon">`/
  `<link rel="apple-touch-icon">`을 자동 생성하므로 `metadata.icons`를 따로 적을 필요가
  없음. 파비콘을 바꿔야 하면 `brand/`가 아니라 이 두 경로를 고칠 것(`brand/`에는 미사용
  대안인 다크 버전만 보관 중)
- **클라이언트 컴포넌트에 prop으로 넘긴 값은 화면에 안 보여도 페이지 소스(HTML)에 그대로
  남는다.** Next.js가 클라이언트 컴포넌트의 props를 HTML 안의 RSC 데이터로 직렬화해서
  같이 내려보내기 때문 — "화면에 가려놨으니 안전하다"는 판단이 통하지 않는 지점.
  30차에서 푸터 이메일 난독화(`components/ObfuscatedEmail.tsx`)를 만들 때 실제로 겪었음:
  주소를 prop으로 받게 만들었더니 화면에는 `아이디 [at] 도메인`으로 가려졌는데
  페이지 소스에는 완성된 주소가 그대로 실려 나갔다(자동검증이 잡아냄). **컴포넌트가 상수를
  직접 import하도록 바꿔서 해결** — import한 값은 별도 JS 번들에만 들어가고 HTML에는 전혀
  나타나지 않음. 비슷하게 "감춰야 하는 값"을 다룰 때는 화면 렌더링 결과만 보지 말고
  `curl`로 실제 HTML 소스를 받아서 확인할 것(차주 지급액·내부 단가 등도 같은 결의 문제).
  다만 이건 **스크래핑 난이도를 올리는 수준일 뿐 보안 경계가 아님** — 진짜 노출되면 안 되는
  값은 원칙 49번처럼 애초에 서버 밖으로 내보내지 않는 방식으로 막을 것
- **하위 세그먼트 `layout.tsx`에 `description`을 안 적으면 루트 `app/layout.tsx`의
  description을 그대로 상속받는다.** 루트 description이 내부 시스템 설명("화주 CRM ·
  견적 · 배차 · 정산 통합 관리")이었던 탓에 `/quote`·`/apply` 같은 공개 페이지가
  검색결과에 이 문구로 노출될 상태였음(26차 세션에서 정비). 새 공개 페이지를 추가할
  때는 title뿐 아니라 description도 같이 지정할 것. 또 루트에 `title.template`을
  걸면 하위 title에 브랜드명이 이중으로 붙으므로(`견적 문의 | 위캐리 운송 | 위캐리
  운송`), 템플릿을 새로 도입한다면 하위 title에서 브랜드명을 빼거나 `title.absolute`를
  쓸 것 — 현재는 템플릿을 일부러 두지 않는 방식으로 통일되어 있음
- **"목록 표의 칸 구분이 이상하다"는 신고를 받으면, 그 표에 긴 텍스트(문자 본문·오류
  메시지·메모)를 통째로 넣은 칸이 있는지부터 볼 것.** 표는 칸 폭이 서로 밀고 당기는
  구조라, 한 칸에 여러 줄짜리 긴 글이 들어가면 그 칸이 세로로 길어지는 데 그치지 않고
  **옆 칸까지 눌러버린다**(36차 PR #85에서 문자 발송 이력 목록이 실제로 이랬음).
  칸을 조금씩 넓혔다 좁혔다 하며 맞추려 하지 말고, **긴 본문은 팝업으로 빼고 목록에는
  `-webkit-line-clamp`로 2줄 미리보기만 두는 것**이 정답이다. 곁들여 쓸 만한 것:
  날짜+시각처럼 붙어 있는 값은 2줄로 나누면 칸이 확 줄고, 한글이 단어 중간에서 끊기면
  `word-break: keep-all`을 준다. **레이아웃을 눈으로 짐작하지 말고** 임시 스텁 페이지에
  극단적인 표본(가장 긴 오류 메시지, 가장 긴 품목명, 값이 비어 있는 행)을 넣어
  실제로 렌더링해 보고 컬럼 폭을 실측할 것
- 🔴 **`set` 접두사가 붙는 이름을 grep할 때는 대소문자 경계를 의심할 것.**
  `setAccountId`·`setThirdPartyAgreed`는 `set` + **대문자**로 이어져서 **소문자
  `accountId`·`thirdPartyAgreed` 패턴에 걸리지 않는다.** 47차에 이걸 보고 "이 state는 한 번도
  채워진 적이 없다"고 **오진해서 사용자에게 잘못 보고했고**, 같은 이유로 스텁 생성 스크립트의
  치환이 실패해 브라우저 시험이 헛돌았다(한 세션에 두 번). React state는 `x` / `setX` 쌍이라
  이 함정이 특히 잘 걸린다 — **`-i`를 붙이거나 `[Aa]ccountId`처럼 쓰거나, 선언부를 직접 열어
  확인할 것.** "grep이 안 나온다"를 "코드에 없다"로 곧장 읽지 말 것.
- **이 실행 환경은 `node_modules`가 설치돼 있지 않은 상태로 시작한다 — `npm ci`를 먼저
  돌릴 것.** 그리고 `npx tsc --noEmit 2>&1 | tail -5` 같은 형태로 확인하면 `$?`가 tsc가 아니라
  **파이프 끝(`tail`)의 종료코드**를 읽어서, 실제로는 "Cannot find module 'react'"가 수백 줄
  나고 있는데 "통과"로 잘못 판단하게 된다(44차에서 실제로 겪음). tsc 결과는 파이프를 걸지 말고
  파일로 받은 뒤 종료코드와 줄 수를 같이 볼 것
- **임시 스텁 페이지는 서버 컴포넌트로 만들 것** — `"use client"`를 붙이면 `searchParams`가
  들어오지 않아 쿼리로 상태를 갈라 확인할 수 없다(44차). 또 루트 레이아웃의 `TopNav`가
  Supabase 환경변수 없이는 예외를 던져 스텁 라우트가 500이 되므로, **더미
  `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY`를 넣고 dev 서버를 띄울 것**
  (더미라 실제 DB에 닿지 않는다). `_`로 시작하는 폴더가 라우팅되지 않는 것은 43차 참고
- 🔴 **가로 목록을 코드로 천천히 밀 때 `scrollLeft` 만 쓰면 덜덜거린다 — 브라우저가
  그 값을 정수 픽셀로 반올림한다.** 실측(70차): `scrollLeft` 에 10.25 를 넣으면 10,
  10.5 를 넣으면 11 이 되고 **카드의 화면 좌표도 정수로만** 움직인다. 한 프레임에 1px 이
  안 되는 속도(예: 22px/s = 0.37px/프레임)면 어떤 프레임은 0px, 어떤 프레임은 1px 씩 가서
  눈에 덜덜거림으로 보인다. **속도를 올려도 정수가 딱 떨어지지 않는 한 그대로다.**
  🔴 **정수부는 `scrollLeft`, 소수부는 안쪽 줄의 `transform` 이 나눠 싣게 할 것**
  (`components/landing/useAutoMarquee.ts`). 그래야 네이티브 터치·관성을 그대로 쓰면서
  소수 픽셀까지 그려진다 — `transform` 만 쓰면 손으로 넘기는 것을 직접 구현해야 하고
  그게 64차가 겪은 「덜덜거림」의 원인이다.
  ⚠️ 그 전에 **`el.scrollLeft` 를 읽어서 더하는 방식**도 같은 반올림 때문에 **1px 에서
  멈춘다** — 위치는 코드가 소수까지 따로 누적할 것. **두 단계를 다 거쳐야 한다.**
  ⚠️ **`scroll-snap-type` 이 걸려 있으면 그 전에 아예 안 움직인다** — 매 프레임 미는
  소수 픽셀을 스냅이 가장 가까운 지점으로 되돌린다(`proximity` 여도 그렇다).
- **한글이 "관리합니 / 다"처럼 어절 중간에서 끊기면 `word-break: keep-all`을 섹션 단위로
  걸 것**(한 어절이 칸보다 긴 극단적인 경우를 위해 `overflow-wrap: break-word`를 같이 준다).
  그리고 **그 자리를 `<br />`로 고정해서 해결하려 들지 말 것** — 이 사이트의 본문 폰트
  (SUIT)와 표시용 폰트(Space Grotesk)는 **전부 CDN에서 받아온다**(`app/layout.tsx`).
  폰트가 늦게 뜨거나 못 뜨면 글자 폭이 달라져서 줄바꿈 위치가 통째로 바뀌므로, 특정 폰트
  폭에 맞춰 넣은 `<br />`는 다른 환경에서 오히려 어색한 줄바꿈을 만든다(37차 랜딩에서
  운송관리 카드 제목이 실제로 이랬음 — 데스크탑에 맞춰 고정했더니 모바일에서 "내역이"만
  남는 3줄이 됐고, `<br />`를 빼니 해결됨). **시안이 의도한 줄바꿈만 `<br />`로 남길 것**
- 🔴 **`public/` 에는 "저장소 코드가 참조하지 않지만 지우면 안 되는 파일"이 여럿 있다 —
  「안 쓰이는 파일」로 보고 정리하지 말 것.** 앞의 넷은 **외부가 절대 URL 로 가져다 쓰는**
  것이라 지우면 회수가 안 되고, 뒤의 셋은 **JSON·서비스워커가 문자열로만 가리켜서**
  `.ts`/`.tsx` 를 grep 하면 0건으로 나온다.
```
  public/naverd2a4fd031fc1d5c8e06b2ca3aace4eb8.html   네이버 소유확인 — 지우면 소유확인이
                                                      풀리고 사이트맵·수집요청이 무효가 된다
  public/email/wecarry-logo-400.png / -white.png      직원 메일 서명 — 이미 발송된 메일이 깨진다
  public/landing/service-04-moving.jpg                wecarry24.co.kr 이 쓴다
  public/og-wecarry-1200x630.jpg                      카톡·검색 미리보기 (코드는 lib/siteUrl.ts 참조)

  public/icons/*.png (6개)                           설치형 앱 아이콘 — manifest 2종이
                                                      JSON 문자열로만 가리킨다
  public/offline.html                                 오프라인 안내 — sw.js 가 문자열로만
                                                      가리킨다. 🔴 두 앱이 같이 쓴다
  public/{customer,admin}/sw.js                       서비스워커 — 위치가 곧 담당 구역이라
                                                      루트로 옮기면 안 된다
```
  ⚠️ **`grep` 으로 "참조 0건"이 나와도 근거가 되지 않는다** — 이 파일들은 원래 코드에서
  참조되지 않는 것이 정상이다. `public/email/README.md`·`public/icons/README.md` 가 그
  경고를 담고 있는 전례다(67차 ④ · PWA 차수 ⑥).

---
- 🔴 **「이미지가 늦게 떠서 버벅인다」는 신고를 받으면 파일 크기부터 의심하지 말 것 —
  그 섹션이 화면 위에서 몇 px 지점에 있는지부터 재라.** 브라우저는 지연로딩(`loading="lazy"`)
  이미지를 **뷰포트에서 약 1250px 앞**에서야 받기 시작한다. 그 거리 안팎에 섹션이 있으면
  **스크롤해서 보이는 바로 그 순간에 받기 시작**해서 회색 상자가 스친다 — 용량과 무관하다.
  실제로 랜딩 `#work` 가 모바일에서 y=2161px 이라 딱 그 경계에 걸려 있었고(PR #119),
  이미지를 5.4MB 줄여도 팝인은 371ms → 339ms 로 **거의 그대로였다.** 해소한 것은
  **그 한 장만 `loading="eager"` 로 바꾼 것**이다(`fetchPriority="low"` 를 같이 줘서 히어로와
  대역폭을 다투지 않게 한다). 🔴 **한 화면의 이미지를 전부 eager 로 만들지 말 것** — 첫 화면이
  느려진다. 경계에 걸린 **첫 장만** 바꾼다.
- 🔴 **스크롤 타이밍 버그를 재현할 때 `waitUntil: "load"` 로 기다리거나 rAF 로 스크롤 속도를
  재면 재현되지 않는다.** 전자는 리소스가 다 받아진 뒤라 대역폭이 비어 있고, 후자는 CPU
  스로틀에 눌려 1.5초짜리 스크롤이 15초가 되어 그 사이 이미지가 다 도착한다(둘 다 「전·후
  똑같이 문제 없음」이라는 **무의미한 비교**가 나온다). **`domcontentloaded` 로 열고 →
  1.5초 기다렸다가 → `setTimeout` 으로 벽시계 1.5초에 걸쳐 내려갈 것** — 사람이 착지해서 바로
  스크롤하는 것과 같다. ⚠️ 그리고 **고친 뒤에는 `load` 이벤트가 안 걸린다**(이미 `complete`
  라서) — 「카드가 보이는 순간 `img.complete && naturalWidth > 0` 인가」로 재야 한다. 이걸
  몰라서 「측정 실패 3/3」이 나왔는데 그게 사실은 성공 신호였다.
- 🔴 **이 환경에서 FCP·LCP 를 재서 성능을 판단하지 말 것** — 프록시가 폰트 CDN
  (`fonts.googleapis.com`·`cdn.jsdelivr.net`)을 막아 **그 대기 시간이 그대로 섞여 들어간다**
  (실측 FCP 13,240ms · LCP 17,600ms — 우리 페이지의 값이 아니다). 믿을 수 있는 것은
  **전송 바이트**(네트워크 조건과 무관한 산술값)와 **요소 타이밍**(카드 노출 ↔ 이미지 도착
  간격)뿐이다.
- ⚠️ **이미지를 다시 인코딩할 때는 「눈에 안 보인다」를 수치로 확인할 것** — 원본과 재인코딩본을
  **실제 표시 크기로 줄인 뒤** 픽셀 차이를 재면 된다(PIL 로 `ImageChops.difference` + `ImageStat`).
  랜딩 히어로는 품질 90 으로 3045KB → 992KB 인데 표시 크기 기준 **평균 차이 0.27~1.67 / 255**
  (0.1~0.7%)였다. 🔴 **원본을 덮어쓰기 전에 그 파일이 git 어느 커밋에 있는지 기록에 남길 것**
  (랜딩 이미지는 61차 커밋이다) — 재인코딩은 세대 손실이라 되돌릴 길이 그것뿐이다.
- 🔴 **`<details>` 의 높이는 애니메이션할 수 없다 — `grid-template-rows: 0fr → 1fr` 트릭을
  쓰되 안쪽에 `overflow: hidden` 겹을 하나 더 둘 것.** `height: auto` 는 보간되지 않고,
  그리드 트릭만 쓰면 **안쪽 요소의 `margin` 이 클리핑 밖에 남아 닫힌 상태에도 틈이 생긴다**
  (랜딩 WHY 는 `margin: 6px 0 26px 76px` 라 32px 이 남았다). 그래서 `.landing-acc-body`
  (그리드) > `.landing-acc-clip`(overflow hidden) 두 겹이다 — 한 겹으로 줄이지 말 것.
  ⚠️ **만들기 전에 그 브라우저에서 실제로 보간되는지 먼저 재볼 것** — 이 저장소는
  Chromium 141 에서 0 → 83px / 280ms 로 도는 것을 확인하고 착수했다.
- 🔴 **스크롤 리빌이 「다시 재생되는가」를 잴 때 「화면 안에 opacity 0 인 요소가 있는가」로
  재지 말 것 — 처음 등장하는 요소가 정상적으로 0에서 시작하는 것까지 잡힌다.**
  그 지표는 「한 번만 재생」이든 「반복 재생」이든 똑같이 걸려서 둘을 구분하지 못한다.
  🟢 **재야 할 것은 「보이는 상태의 요소가 다시 숨겨지는 순간」**이고, `MutationObserver`
  로 클래스가 떼어지는 순간을 잡아 그때 `getBoundingClientRect()` 가 화면 안이었는지
  보면 된다(PR #123 에서 이 방식으로 0건을 확인했다).
- ⚠️ **모션 값을 잴 때는 재생 시간보다 넉넉히 기다릴 것** — 620ms 짜리를 900ms 뒤에
  쟀더니 `opacity: 0.99` 가 나와 거짓 ❌ 가 두 번 났다. 전환이 끝난 값을 원하면
  **`transition-duration` + `transition-delay` 의 합보다 두 배쯤** 기다리는 편이 안전하다.
- 🔴 **`middleware.ts` 의 matcher(`/admin/:path*`)는 그 아래 정적 파일까지 전부 잡는다 —
  아이콘·서비스워커처럼 로그인과 무관하게 내려가야 하는 파일을 그 세그먼트에 두면
  `PUBLIC_PATHS` 에 함께 넣어야 한다.** 안 넣으면 **화면에는 아무 증상이 없고**(응답이
  에러가 아니라 307 리다이렉트라 콘솔도 조용하다) 「아이콘이 안 뜬다」·「설치가 안 된다」로만
  나타나 원인을 찾기 어렵다. 28차 PR #77(관리자 파비콘)과 PWA 차수(`/admin/apple-icon.png`)
  에서 **두 번 겪었다.** 🔴 **반대로 화면·API 경로는 절대 넣지 말 것** — 그 순간 로그인 없이
  열린다. 🟢 **가능하면 애초에 루트(`public/`)에 둬서 matcher 를 피할 것**(manifest 를 그렇게
  했다) — 인증이 열리는 면이 늘지 않는다.
- 🔴 **설치형 앱(PWA)의 구역(`scope`)에 끝 슬래시를 붙이지 말 것.** 이 저장소의 홈 주소는
  `/admin`·`/customer` 이고 **Next 가 `/admin/` 을 `/admin` 으로 308 리다이렉트한다.**
  구역 판정은 **문자열 접두 비교**라 `/admin` 은 `/admin/` 안에 들어가지 않아서, 구역을
  `/admin/` 로 두면 **앱이 켜지자마자 자기 구역 밖으로 나가** 창에 주소 띠가 남고
  서비스워커도 홈 화면을 못 맡는다(PR #127 에서 실제로 겪었다). 🔴 **`trailingSlash: true`
  나 `start_url` 을 하위 화면으로 돌려서 우회하지 말 것** — 전자는 사이트 전체 URL 규칙을
  바꾸고, 후자는 로그인한 사람이 홈으로 가는 순간 다시 구역 밖이 된다.
  ⚠️ **`.webmanifest` 는 JSON 이라 주석을 못 단다** — 사유는 `app/{customer,admin}/layout.tsx`
  의 `manifest:` 옆에 있다. 🔴 **구역이 얽힌 것을 검증할 때는 시작 주소를 실제로 열어
  「리다이렉트가 끝난 최종 주소」로 잴 것**(하위 화면만 보면 이 결함을 못 잡는다).
- 🔴 **브라우저가 한 번만 쏘는 이벤트(`beforeinstallprompt` 등)를 `useEffect` 에서 듣지
  말 것 — 하이드레이션 전에 지나가면 영영 못 받는다.** 화면이 무거울수록 잘 놓쳐서
  **「어떤 날은 되고 어떤 날은 안 된다」**로 나타난다(설치 버튼이 실제로 그랬다).
  `lib/installPromptCapture.ts` 처럼 **HTML 을 읽는 순간 도는 인라인 스크립트가 먼저 잡아
  `window` 에 넣어두고, 리액트는 그것을 읽는 방식**을 쓸 것.
- 🔴 **서비스워커의 담당 구역은 스크립트가 놓인 위치가 **최대치**를 정한다 — 그보다 넓히려면
  `Service-Worker-Allowed` 헤더로 서버가 허락해야 하고, 등록할 때 `scope` 도 같이 넘겨야
  한다(🔴 **둘은 한 벌이라 한쪽만 고치면 등록이 조용히 실패한다**). 그래서 `public/customer/sw.js` ·
  `public/admin/sw.js` 처럼 세그먼트 안에 둔다. 🔴 **루트로 옮기면 한 워커가 두 시스템과
  랜딩까지 삼킨다.** 그리고 이 저장소는 **전 화면이 실시간 데이터라 앱 셸이 없다** —
  🔴 **화면(HTML)과 API 응답을 캐싱하면 화주가 낡은 배차 상태·정산 금액을 본다.**
  캐시는 화이트리스트로만 두고, 대상을 바꾸면 캐시 이름의 `VERSION` 을 함께 올릴 것.
- ⚠️ **검증용 Playwright 는 `npm i --no-save playwright-core` 로 넣을 것** —
  `package.json`·`package-lock.json` 변경 0 을 유지해야 하는 차수가 대부분이다.
  브라우저는 `/opt/pw-browsers/chromium-1194/chrome-linux/chrome` 에 이미 있다.
- 🔴 **「모바일에서 목록이 엉망이다」는 신고를 받으면 눈으로 짐작하지 말고 표 폭을 재라.**
  실측(34차, 390px): 견적 **880** · 오더 **610** · 배차 **914** · 정산 **1056px**.
  🔴 **감싸개에 `overflow-x: auto` 가 없으면 페이지 자체가 옆으로 밀려**(scrollWidth
  627·931·1073) 제목·필터까지 잘려 나간다 — 그 상태가 「엉망」의 정체다. 칸을 조금씩
  넓혔다 좁혔다 하지 말고 **모바일은 카드로 따로 그릴 것**(원칙 13번).
  🔴 **CSS 로 표를 접는 방법**(`display:block` + `td::before`)**을 쓰지 말 것** — 모든
  `<td>` 에 `data-label` 을 달아야 하고, 무엇보다 **「모바일에서만 이 열을 생략」이 안 된다**
  (열을 지우면 데스크탑에서도 지워진다). `components/AdminMobileList.tsx` 를 쓸 것.
- 🔴 **화면 폭을 넓혔는데 「입력칸이 더 좁아졌다」면 그 격자가 `auto-fill` 인지부터 볼 것.**
  `.form-grid` 는 `repeat(auto-fill, minmax(200px, 1fr))` 이라 **넓힌 폭이 칸 폭이 아니라
  열 수로 간다** — 34차에 폭을 1100 → 1560 으로 넓혔더니 견적 폼이 **2열 282px →
  4열 203px** 로 오히려 좁아졌다. 홈 카드도 같은 이유로 **4칸 2줄이 6열**이 됐다.
  🟢 고치는 법 둘: 최소 폭을 올려 열이 덜 늘게 하거나(`minmax(260px, …)`), 그 화면이
  **짝으로 읽혀야 하는 격자면 열 수를 못박는다**(견적 폼 2열 · 홈 카드 4열).
- 🔴 **관리자 화면에만 적용할 CSS 는 `.container` 를 고치지 말고 `.admin-wide` 안에서 할 것.**
  `.container` 를 쓰는 39개 파일 중 **7개가 화주포털**이고 `SiteFooter`·`PublicPageHeader`·
  `LegalDoc` 을 통해 **공개 화면 6개**도 쓴다. `app/admin/layout.tsx` 가 자식을 그 클래스로
  감싸고 있다. ⚠️ **`TopNav` 는 그 래퍼 밖(루트 레이아웃)이라 따로 걸어야 한다** —
  `.top-nav-inner` 는 `TopNav` 한 곳만 쓰고 그 컴포넌트가 `/customer`·공개 경로에서
  `null` 을 돌려주므로 관리자 전용으로 봐도 된다.
- 🔴 **`position: absolute`/`fixed` 부품을 잴 때는 하네스에 「그 부품이 실제로 놓이는
  자리」를 먼저 만들 것 — 평평한 페이지에 얹어 재면 반드시 거짓 ❌ 가 난다.**
  38차에 같은 거짓 ❌ 를 **두 번** 겪었다. 알림음 창은 `right: 0` 이라 **상단바 오른쪽 끝**에
  있어야 맞는데 하네스가 화면 **왼쪽**에 뒀더니 「창이 왼쪽 밖으로 나간다」가 났고,
  포털 것은 `up-left` 라 **사이드바 발치**에 있어야 맞는데 화면 **위쪽**에 뒀더니
  「위로 넘친다」가 났다. **둘 다 코드는 멀쩡했다.**
  🟢 고치는 법은 간단하다 — 하네스에서 그 화면의 **진짜 뼈대 클래스**를 쓰면 된다
  (포털은 `.pv2-shell > .pv2-sidebar > .pv2-sidebar-foot`, 관리자는 오른쪽 정렬 flex).
  ⚠️ 관리자 상단바 부품은 **`/pcheck` 같은 임시 라우트에서도 `TopNav` 가 그대로 그려지므로**
  그 자리에서 바로 잴 수 있다(`/admin/*` 은 middleware 가 막는다).
- 🔴 **완료조건이 `grep -c "낱말"` 로 세는 것이면, 내가 쓰는 주석에 그 낱말을 넣지 말 것 —
  주석 한 줄이 검사를 통과시키거나 실패시킨다.**
  37차에 한 번, 38차에 **두 번** 더 겪었다(전부 `setInterval`). 「되풀이 타이머를 새로
  만들지 않았다」를 그 낱말 수로 재는데, *「여기에 `setInterval` 을 넣지 말 것」*이라고
  적는 순간 그 수가 하나 는다. 🟢 **뜻이 같은 다른 말로 적는다**(「되풀이 타이머」).
  ⚠️ 반대로 **`grep` 결과가 0이 아니라고 코드에 그것이 있다고 단정하지도 말 것** —
  문서 정합 4차가 경고 주석 27줄에 걸렸던 것과 같은 자리다.

## 8. Claude Code로 넘어가면서 참고할 것

- 이 프로젝트는 지금까지 **사용자가 매번 파일을 GitHub 웹 UI에 직접 복사해서
  적용하는 방식**으로 진행되었음. Claude Code부터는 저장소를 직접 읽고 수정하면 됨
- 사용자는 **개발 초보자**임 — 전문 용어를 풀어서 설명하고, 변경사항을 적용하기
  전에 무엇을 왜 하는지 간단히 설명해주는 게 좋음
- 중요한 변경(특히 DB 스키마, 결제/계정 관련 로직)은 **바로 main에 반영하지 말고
  검토받을 것을 권장**
- **⚠️ 사용자가 "CLAUDE.md 업데이트 해줘"라고 하면 PR을 만들지 말고 `main`에 바로
  반영(commit + push)할 것 — 31차 세션에서 사용자가 명시적으로 정한 규칙.**
  이 문서만 바뀌는 커밋은 실행되는 코드가 아니라 배포에 영향이 없고, 매번 PR을
  만들어 확인받는 것이 번거롭기 때문. 지금까지도 사용자가 그때그때 "merge해줘"라고
  지시해 왔던 것을 상시 규칙으로 확정한 것임.
  **적용 범위는 CLAUDE.md 단독 변경일 때뿐** — 코드 변경이 섞여 있으면 기존대로
  PR을 만들어 확인받을 것(코드가 한 줄이라도 포함되면 이 규칙은 적용되지 않음).
- 이 문서를 프로젝트 저장소 루트에 `CLAUDE.md`라는 이름으로도 저장해두면, Claude
  Code가 세션 시작 시 자동으로 읽어서 참고함

---

## 9. 새 세션에서 이어가는 방법

**🔴 읽는 순서**

```
  ① HANDOFF.md   저장소 루트. 지금 시점의 스냅샷 — 먼저 읽는다
  ② CLAUDE.md    이 문서. 세션별 축적 기록 — 그 결정을 왜 그렇게 했는지 되짚을 때
       ├ 3장  핵심 설계 원칙 (되돌리면 안 되는 것)
       ├ 5장  다음 예정 작업 (로드맵·차수)
       └ 7장  자주 막히는 지점
  ③ 해당 차수의 세션 기록  🔴 **`docs/history/`** 에 있다 — §0 「이력 찾는 법」 표
                          최신은 `current.md` 최상단, 옛것은 `history-01~10.md`
```

🔴 **`HANDOFF.md` 만 읽고 끝내지 마십시오** — 스냅샷이라 "왜"가 빠져 있습니다.
🔴 **`CLAUDE.md` 를 요약해서 줄이지 마십시오** — 대체가 아니라 입구입니다.

직원 계정·권한·이력 재구조화 스펙(1~8단계)은 전부 완료되어 main에 merge되었습니다.
Claude Code에서: 저장소를 열고 "인수인계 문서(HANDOFF.md → CLAUDE.md 순서로)를
참고해서 5번 "다음 예정 작업"부터 이어서 진행해줘" 같은 식으로 시작하면 됩니다.

실제 저장소 코드가 이 문서와 다르면 **저장소가 항상 맞습니다.**
