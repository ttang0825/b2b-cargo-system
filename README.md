# B2B 화물운송 통합 운영 시스템 (1단계: 화주 CRM)

## 이 프로젝트는 무엇인가요?
Next.js + Supabase 기반 통합 운영 시스템의 1단계 MVP입니다.
현재는 `/admin/companies` 화면 하나만 있습니다: 화주(영업대상 포함) 목록 조회,
신규 등록, 영업상태 변경.

## 배포 순서 (GitHub + Vercel, 터미널 불필요)

1. GitHub에서 새 저장소(Repository)를 만듭니다. (Public/Private 아무거나 가능)
2. 저장소 페이지에서 "Add file" → "Upload files" 클릭 후, 이 폴더 전체를
   드래그 앤 드롭으로 업로드하고 커밋합니다.
3. vercel.com에 로그인 → "Add New" → "Project" → 방금 만든 GitHub 저장소 선택.
4. 배포 설정 화면에서 "Environment Variables"에 아래 두 값을 추가합니다.
   (Supabase 대시보드 > Project Settings > API 에서 복사)
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. "Deploy" 클릭 → 몇 분 후 실제 접속 가능한 URL이 생성됩니다.

## 주의
- `.env.local` 파일은 절대 GitHub에 올리지 마세요 (.gitignore에 이미 포함됨).
- 현재 Supabase 테이블은 RLS(Row Level Security)가 꺼져 있는 상태입니다.
  내부 관리자만 쓰는 지금 단계에서는 괜찮지만, 화주 고객포털을 열기 전에는
  반드시 RLS를 켜고 권한 정책을 추가해야 합니다.
