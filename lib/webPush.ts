// ─────────────────────────────────────────────────────────────────────────────
// 웹 푸시 발송 — VAPID(RFC 8292) + aes128gcm(RFC 8291/8188)
//
// 🔴 **서버 전용이다.** Node `crypto` 를 쓰므로 클라이언트 컴포넌트에서 import 하면
//    빌드가 깨진다. 부르는 곳은 `lib/pushNotify.ts` 하나뿐이다.
//    🔴 **Edge 런타임 라우트에서 부르지 말 것** — Node 런타임이어야 한다.
//
// 🔴 **신규 의존성 0으로 직접 구현한 것은 일부러다.**
//    38차 지시서는 (가) `web-push` 패키지 / (나) 직접 서명 + **페이로드 없는 푸시** 를
//    놓고 고르라고 했는데, 실측해 보니 **암호화까지 Node `crypto` 만으로 된다**
//    (`hkdfSync` · `createECDH` · `aes-128-gcm` 이 전부 있다). 그래서 지시서에 없던
//    **(나+) 직접 서명 + 암호화 페이로드**가 됐고 사용자가 확정했다(2026-09-16).
//    🟢 페이로드를 실을 수 있어 **알림 문구가 정확하고**, 서비스워커가 깨어나 API 를
//    다시 부를 필요가 없다.
//
// 🟢 **RFC 8291 §5 시험 벡터와 바이트 단위로 일치하는 것을 확인하고 옮겨 적었다.**
//    🔴 이 구현을 고치면 **그 시험을 다시 돌릴 것** — 암호가 틀리면 브라우저가 알림을
//    조용히 버려서 「안 온다」로만 나타난다(예외도 안 난다).
//
// 🔴 **페이로드에 고객 정보를 넣지 말 것** — 폰 잠금화면과 데스크탑 배너에 그대로
//    뜬다(38차 0-4). 담는 것은 **종류와 건수**뿐이고, 그 규칙은 `lib/pushNotify.ts` 가 지킨다.
// ─────────────────────────────────────────────────────────────────────────────

import crypto from "crypto";

const b64u = (b: Buffer | Uint8Array | string) => Buffer.from(b as Buffer).toString("base64url");
const fromB64u = (s: string) => Buffer.from(s, "base64url");

export type PushSubscriptionKeys = { endpoint: string; p256dh: string; auth: string };

/** 발송 결과. 🔴 판별자는 문자열이다 — 이 저장소는 `strict: false` 라 참/거짓으로는
 *  타입이 안 좁혀진다(32차가 기록한 함정이고 37차에 `tsc` 가 또 잡았다). */
export type PushSendResult =
  | { kind: "ok" }
  /** 🔴 **그 구독 행을 지워야 한다** — 기기를 바꾸거나 앱을 지운 것이다. */
  | { kind: "gone"; status: number }
  /** 일시적 장애. 🔴 **구독을 버리지 말 것** — 버리면 담당자가 다시 눌러야 한다. */
  | { kind: "error"; status: number | null; message: string };

// ── VAPID JWT (ES256) ───────────────────────────────────────────────────────

/**
 * raw 32바이트 개인키를 Node 가 읽을 수 있는 KeyObject 로 감싼다.
 * 🔴 앞의 고정 바이트열은 P-256 PKCS#8 머리다 — 손대지 말 것.
 */
function privateKeyFromRaw(rawB64u: string) {
  const d = fromB64u(rawB64u);
  if (d.length !== 32) throw new Error(`VAPID 개인키 길이가 32byte 가 아닙니다: ${d.length}`);
  const pkcs8 = Buffer.concat([
    Buffer.from("308141020100301306072a8648ce3d020106082a8648ce3d030107042730250201010420", "hex"),
    d,
  ]);
  return crypto.createPrivateKey({ key: pkcs8, format: "der", type: "pkcs8" });
}

function vapidHeaders(endpoint: string) {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) {
    throw new Error("VAPID 환경변수가 없습니다 (NEXT_PUBLIC_VAPID_PUBLIC_KEY · VAPID_PRIVATE_KEY · VAPID_SUBJECT)");
  }
  const { origin } = new URL(endpoint);
  // 🔴 12시간. 표준 상한은 24시간이고 넘기면 푸시 서비스가 거절한다.
  const exp = Math.floor(Date.now() / 1000) + 12 * 60 * 60;
  const header = b64u(JSON.stringify({ typ: "JWT", alg: "ES256" }));
  const payload = b64u(JSON.stringify({ aud: origin, exp, sub: subject }));
  const data = `${header}.${payload}`;
  // 🔴 `ieee-p1363` 이어야 한다 — 기본값 DER 로 서명하면 푸시 서비스가 401 을 준다.
  const sig = crypto.sign("sha256", Buffer.from(data), {
    key: privateKeyFromRaw(privateKey),
    dsaEncoding: "ieee-p1363",
  });
  return { Authorization: `vapid t=${data}.${b64u(sig)}, k=${publicKey}` };
}

// ── 페이로드 암호화 (aes128gcm) ─────────────────────────────────────────────

function hkdf(salt: Buffer, ikm: Buffer, info: Buffer, len: number): Buffer {
  return Buffer.from(crypto.hkdfSync("sha256", ikm, salt, info, len));
}

function encryptPayload(plaintext: string, sub: PushSubscriptionKeys): Buffer {
  const uaPublic = fromB64u(sub.p256dh);
  const authSecret = fromB64u(sub.auth);
  const salt = crypto.randomBytes(16);

  const ecdh = crypto.createECDH("prime256v1");
  ecdh.generateKeys();
  const asPublic = ecdh.getPublicKey();
  const sharedSecret = ecdh.computeSecret(uaPublic);

  // RFC 8291 §3.3 — 공유 비밀에서 IKM 을 뽑는다
  const keyInfo = Buffer.concat([Buffer.from("WebPush: info\0"), uaPublic, asPublic]);
  const ikm = hkdf(authSecret, sharedSecret, keyInfo, 32);

  const cek = hkdf(salt, ikm, Buffer.from("Content-Encoding: aes128gcm\0"), 16);
  const nonce = hkdf(salt, ikm, Buffer.from("Content-Encoding: nonce\0"), 12);

  // 🔴 마지막 레코드는 0x02 로 끝난다(RFC 8188 §2). 0x01 로 쓰면 브라우저가 버린다.
  const record = Buffer.concat([Buffer.from(plaintext, "utf8"), Buffer.from([0x02])]);
  const cipher = crypto.createCipheriv("aes-128-gcm", cek, nonce);
  const body = Buffer.concat([cipher.update(record), cipher.final(), cipher.getAuthTag()]);

  const rs = Buffer.alloc(4);
  rs.writeUInt32BE(4096, 0);
  const header = Buffer.concat([salt, rs, Buffer.from([asPublic.length]), asPublic]);
  return Buffer.concat([header, body]);
}

// ── 발송 ────────────────────────────────────────────────────────────────────

/**
 * 구독 하나에 푸시를 보낸다. 🔴 **절대 던지지 않는다** — 부르는 쪽이 여러 구독을
 * 훑으므로 하나가 터져서 나머지가 안 가면 안 된다.
 */
export async function sendWebPush(
  sub: PushSubscriptionKeys,
  payload: string,
  ttlSeconds = 12 * 60 * 60
): Promise<PushSendResult> {
  try {
    const body = encryptPayload(payload, sub);
    const res = await fetch(sub.endpoint, {
      method: "POST",
      headers: {
        ...vapidHeaders(sub.endpoint),
        "Content-Encoding": "aes128gcm",
        "Content-Type": "application/octet-stream",
        TTL: String(ttlSeconds),
        // 🔴 「긴급하지 않음」으로 보내면 폰이 모아서 늦게 준다. 접수 알림은 바로 와야 한다.
        Urgency: "high",
      },
      // 🔴 `Buffer` 를 그대로 주면 `tsc` 가 `BodyInit` 에 안 맞다고 한다 —
      //    같은 바이트열을 `Uint8Array` 로 넘긴다(복사가 아니라 뷰다).
      body: new Uint8Array(body),
      // 🔴 응답을 캐시에 태우면 안 된다(원칙 21번과 같은 결).
      cache: "no-store",
    });
    if (res.ok) return { kind: "ok" };
    // 🔴 404·410 은 「그 기기가 없어졌다」는 뜻이다 — 부르는 쪽이 행을 지운다.
    if (res.status === 404 || res.status === 410) return { kind: "gone", status: res.status };
    const text = await res.text().catch(() => "");
    return { kind: "error", status: res.status, message: text.slice(0, 200) };
  } catch (e) {
    return { kind: "error", status: null, message: e instanceof Error ? e.message : String(e) };
  }
}

/** 화면이 구독할 때 넘겨야 하는 공개키. 없으면 null — 버튼을 그리지 않는 근거가 된다. */
export function getVapidPublicKey(): string | null {
  return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || null;
}
