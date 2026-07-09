import { createClient } from "@supabase/supabase-js";

// Vercel에 배포할 때 이 두 값은 프로젝트 환경변수(Environment Variables)로 설정합니다.
// 로컬에서는 .env.local 파일에 넣습니다. (절대 GitHub에 값 그대로 커밋하지 마세요)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
