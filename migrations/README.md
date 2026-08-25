# 마이그레이션 실행 방법

이 폴더의 `.sql` 파일은 **GitHub Actions에서 버튼을 눌러** 실행합니다.
Supabase SQL Editor에 손으로 붙여넣던 방식을 대신하는 것입니다.

```
저장소 → 상단 Actions 탭 → 왼쪽 "DB 마이그레이션" → 오른쪽 "Run workflow"
```

`mode` 를 고릅니다.

| mode | 하는 일 |
|---|---|
| `dry-run` | 실행할 파일 목록만 보여주고 **DB를 건드리지 않음** — 항상 이것부터 |
| `apply` | 실제로 반영 |
| `verify` | 운임·동의 데이터 상태 점검 (읽기 전용, `_verify.sql`) |

실행이 끝나면 로그에 SQL 출력이 그대로 남습니다. 🔴 **결과를 사람이 옮겨 적을 필요가
없습니다** — 그동안 번거로웠던 부분이 이것이었습니다.

---

## 처음 한 번만 — Secret 등록

워크플로는 `SUPABASE_DB_URL` 이라는 저장소 Secret 하나만 씁니다.

**① Supabase에서 연결 문자열 복사**

프로젝트 화면 **맨 위 초록색 `Connect` 버튼** → 모달이 열립니다.
(예전의 *Settings → Database → Connection string* 자리가 여기로 옮겨졌습니다.)

🔴 **탭 세 개 중 `Session pooler` 를 고르십시오.**
`Direct connection`(`db.xxx.supabase.co`)은 **IPv6 전용**이라 GitHub Actions 러너
(IPv4)에서 접속이 안 됩니다. Session pooler는 IPv4로 붙고 동작은 직접 연결과 같습니다.

```
postgresql://postgres.<프로젝트ID>:[YOUR-PASSWORD]@aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres
```

⚠️ `[YOUR-PASSWORD]` 를 **대괄호까지 지우고** 실제 데이터베이스 비밀번호로 바꾸십시오.
프로젝트를 만들 때 정한 값이며, 기억나지 않으면 같은 모달의 *Reset database password*
로 새로 정하면 됩니다(앱은 이 비밀번호가 아니라 anon / service_role 키로 붙으므로
영향이 없습니다).

**② GitHub에 등록**

```
저장소 → Settings → Secrets and variables → Actions → New repository secret
  Name:   SUPABASE_DB_URL
  Secret: 위에서 만든 문자열
```

🔴 **이 값은 채팅·이슈·PR 어디에도 붙여넣지 마십시오.** RLS를 우회하는 최고 권한이라
`service_role` 키보다 강합니다. 한 번 저장하면 GitHub 화면에서도 다시 볼 수 없고
실행 로그에는 `***` 로 가려집니다.

**③ (선택) 승인 단계**

`Settings → Environments → production` 에 리뷰어를 지정하면, `apply` 를 눌러도
승인하기 전까지는 실행되지 않습니다. 지정하지 않으면 바로 실행됩니다.

---

## `_migrations` — 어느 파일이 적용됐는지 DB가 기억한다

`_bootstrap.sql` 이 만드는 표입니다. 워크플로는 여기에 없는 파일만 실행합니다.

- 파일 하나 = 트랜잭션 하나. 실패하면 그 파일은 통째로 되돌아가고 이력에도 안 남습니다
- 이력 기록(INSERT)이 마이그레이션과 **같은 트랜잭션** 안에 들어갑니다 —
  "반영은 됐는데 기록이 안 된" 상태가 생기지 않는 이유입니다
- 파일 **사이**는 원자적이지 않습니다. 3개가 대기 중일 때 3번째가 실패하면
  1·2번은 반영된 채로 남습니다

## `_baseline.txt` — 🔴 건드리지 말 것

2026-08-25까지 사람이 이미 실행한 6개 파일 목록입니다. 워크플로는 이 파일들을
**실행하지 않고 "적용됨"으로 등록만** 합니다.

이 장치가 없으면 첫 실행에 6개가 전부 다시 돌고, 그중 17차 두 파일은 INSERT인데
이 테이블에는 유니크 제약이 없어서 **`rate_distance_tiers` 45행 / `rate_vehicle_extra_fees`
3행이 중복으로 더 생깁니다.** 견적은 매칭된 첫 행을 쓰므로 겉으로는 멀쩡해 보이고,
그래서 더 늦게 발견됩니다.

⚠️ **새로 만드는 마이그레이션은 이 목록에 넣지 마십시오.**

---

## 새 마이그레이션 파일을 쓸 때

**파일명**은 `YYYY-MM-DD_무엇.sql`. 실행 순서가 **파일명 오름차순**이라 날짜로 시작해야
합니다. 같은 날 여러 개면 이름 뒤쪽으로 순서를 만드십시오.

**한 번에 통째로 실행됩니다.** 기존 6개 파일처럼 "0단계 백업 / 1단계 확인 / 2단계 실행"으로
나눠 사람이 하나씩 돌리는 구조로 쓰면 안 됩니다.

지킬 것:

- 🔴 `begin;` / `commit;` 을 쓰지 마십시오 — 워크플로가 파일 전체를 이미 한 트랜잭션으로
  감쌉니다(`--single-transaction`). 파일 안에서 커밋하면 그 원자성이 깨집니다
- 🔴 사람이 눈으로 봐야 확인되는 `select` 로 안전장치를 만들지 마십시오. 대신
  **실패하면 트랜잭션을 되돌리는 단언**을 쓰십시오:

  ```sql
  do $$
  declare n int;
  begin
    select count(*) into n from rate_distance_tiers;
    if n <> 135 then
      raise exception '총행수가 135가 아닙니다: %', n;
    end if;
  end $$;
  ```

  이렇게 하면 값이 어긋날 때 **아무것도 반영되지 않고** 워크플로가 빨간불로 멈춥니다
- 되도록 다시 돌려도 안전하게 쓰십시오(`if not exists`, `on conflict do nothing`).
  다만 `_migrations` 가 이미 재실행을 막아주므로 이건 보험입니다
- 🔴 **적용이 끝난 파일의 SQL 문을 나중에 고치지 마십시오.** DB에는 옛 내용이
  반영돼 있는데 파일은 새 내용이 되어 둘이 어긋납니다. 값을 바꾸려면 **새 파일**을
  만드십시오. (주석만 고치는 것은 괜찮습니다 — 워크플로가 경고만 하고 넘어갑니다)

## 운임 값을 바꿀 때

16차에서 정한 것이 그대로 유효합니다.

- 🔴 `/admin/rates` 화면에서 숫자를 클릭하지 마십시오 — **클릭이 곧 저장이고 되돌리기가
  없습니다.** 값 변경은 반드시 이 폴더의 마이그레이션 파일로 남기십시오
- 🔴 `/vehicles` 의 `START_PRICES` 는 DB에서 자동으로 오지 않습니다.
  운임 마이그레이션과 **항상 같은 PR에서 함께** 고치십시오
- 파일 안에 백업 스냅샷(`create table _bak_... as select * from ...`)을 먼저 두는 것을
  권장합니다. 되돌릴 유일한 수단입니다
