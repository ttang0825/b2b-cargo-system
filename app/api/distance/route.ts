import { NextResponse } from "next/server";

type GeoResult = { x: string; y: string } | null;

// 주소를 좌표(경도x, 위도y)로 변환 (카카오 로컬 API)
async function geocode(address: string, key: string): Promise<GeoResult> {
  const url = `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(
    address
  )}`;
  const res = await fetch(url, {
    headers: { Authorization: `KakaoAK ${key}` },
  });
  if (!res.ok) return null;
  const data = await res.json();
  const doc = data?.documents?.[0];
  if (!doc) return null;
  return { x: doc.x, y: doc.y };
}

export async function POST(req: Request) {
  const key = process.env.KAKAO_REST_API_KEY;
  if (!key) {
    return NextResponse.json(
      { error: "서버에 카카오 API 키(KAKAO_REST_API_KEY)가 설정되어 있지 않습니다." },
      { status: 500 }
    );
  }

  let origin: string, destination: string;
  try {
    const body = await req.json();
    origin = (body.origin || "").trim();
    destination = (body.destination || "").trim();
  } catch {
    return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }

  if (!origin || !destination) {
    return NextResponse.json(
      { error: "출발지와 도착지를 모두 입력해주세요." },
      { status: 400 }
    );
  }

  try {
    const [originGeo, destGeo] = await Promise.all([
      geocode(origin, key),
      geocode(destination, key),
    ]);

    if (!originGeo) {
      return NextResponse.json(
        { error: `출발지 주소를 찾을 수 없습니다: "${origin}". 도로명주소로 다시 입력해보세요.` },
        { status: 400 }
      );
    }
    if (!destGeo) {
      return NextResponse.json(
        { error: `도착지 주소를 찾을 수 없습니다: "${destination}". 도로명주소로 다시 입력해보세요.` },
        { status: 400 }
      );
    }

    const directionsUrl =
      `https://apis-navi.kakaomobility.com/v1/directions` +
      `?origin=${originGeo.x},${originGeo.y}` +
      `&destination=${destGeo.x},${destGeo.y}` +
      `&priority=RECOMMEND`;

    const res = await fetch(directionsUrl, {
      headers: { Authorization: `KakaoAK ${key}` },
    });
    const data = await res.json();

    const meters = data?.routes?.[0]?.summary?.distance;
    if (!meters) {
      return NextResponse.json(
        {
          error:
            data?.routes?.[0]?.result_msg ||
            "경로를 계산할 수 없습니다. 두 지점이 실제 도로로 연결되어 있는지 확인해주세요.",
        },
        { status: 400 }
      );
    }

    const distanceKm = Math.round((meters / 1000) * 10) / 10;
    return NextResponse.json({ distance_km: distanceKm });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "거리 계산 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
