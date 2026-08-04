// 로드맵④ POD·인수증 — 카테고리/제한값/에러 라벨의 유일한 정의처.
// DB CHECK 제약조건·Storage 버킷 설정과 반드시 동일하게 유지할 것.
export const DISPATCH_PHOTO_BUCKET = "dispatch-photos";

export const DISPATCH_PHOTO_CATEGORIES = ["dropoff", "pod"] as const;
export type DispatchPhotoCategory = (typeof DISPATCH_PHOTO_CATEGORIES)[number];

export const DISPATCH_PHOTO_CATEGORY_LABELS: Record<DispatchPhotoCategory, string> = {
  dropoff: "하차지 사진",
  pod: "인수증",
};

export function getDispatchPhotoCategoryLabel(category: string | null | undefined): string {
  if (!category) return "-";
  return DISPATCH_PHOTO_CATEGORY_LABELS[category as DispatchPhotoCategory] || category;
}

export const DISPATCH_PHOTO_ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
] as const;

// 브라우저에서 <img>로 바로 미리보기 가능한 형식만 (HEIC/HEIF는 파일카드로 대체)
export const DISPATCH_PHOTO_PREVIEWABLE_MIME_TYPES: string[] = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

export const DISPATCH_PHOTO_MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
export const DISPATCH_PHOTO_MAX_COUNT_PER_CATEGORY = 10;

const MIME_TO_EXTENSION: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
};

export function mimeToSafeExtension(mimeType: string): string | null {
  return MIME_TO_EXTENSION[mimeType] || null;
}

// 배차상태만으로는 하차가 실제로 끝났는지 보장 안 됨(문제발생은 상태 드롭다운으로
// 언제든 직접 선택 가능) — delivery_confirmed와 함께 확인해야 함
export function isDispatchReadyForPhotoUpload(
  dispatchStatus: string | null | undefined,
  deliveryConfirmed: boolean | null | undefined
): boolean {
  if (dispatchStatus === "하차완료" || dispatchStatus === "운송완료") return true;
  if (dispatchStatus === "문제발생" && deliveryConfirmed) return true;
  return false;
}

export const DISPATCH_PHOTO_REASON_LABELS: Record<string, string> = {
  invalid_category: "올바르지 않은 항목입니다.",
  dispatch_not_found: "배차 정보를 찾을 수 없습니다.",
  dispatch_not_ready: "하차완료 이후(또는 하차확인된 문제발생 건)에만 업로드할 수 있습니다.",
  file_too_large: "파일 용량은 10MB 이하만 가능합니다.",
  invalid_mime_type: "지원하지 않는 파일 형식입니다. (JPEG/PNG/WebP/HEIC/HEIF만 가능)",
  too_many_photos: "카테고리당 최대 10장까지 업로드할 수 있습니다.",
  upload_not_found: "업로드된 파일을 찾을 수 없습니다. 다시 시도해주세요.",
  invalid_file: "업로드된 파일이 요청 정보와 일치하지 않습니다.",
  save_failed: "파일 정보를 저장하지 못했습니다.",
  not_found_or_deleted: "삭제되었거나 존재하지 않는 파일입니다.",
  already_deleted: "이미 삭제된 파일입니다.",
  reason_required: "삭제 사유를 입력해주세요.",
  forbidden: "권한이 없습니다.",
  access_denied: "조회 권한이 없습니다.",
};

export function getDispatchPhotoReasonLabel(reason: string | null | undefined): string {
  if (!reason) return "처리할 수 없습니다.";
  return DISPATCH_PHOTO_REASON_LABELS[reason] || `처리할 수 없습니다. (${reason})`;
}
