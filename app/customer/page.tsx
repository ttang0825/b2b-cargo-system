"use client";

import { useEffect, useState } from "react";
import {
  DISPATCH_CANCEL_CUSTOMER_STYLE,
  dispatchCancelCustomerBadge,
} from "@/lib/dispatchCancel";
import {
  filterCancelledForCustomer,
  getPortalCancelNotice,
  type PortalRedispatchMap,
} from "@/lib/portalCancelledDispatches";
import { usePortalRefresh } from "@/lib/portalRefresh";
import Link from "next/link";
import { supabaseCustomer as supabase } from "@/lib/supabaseCustomerClient";
import {
  getDispatchStage,
  getDispatchStageStyle,
  hasDispatchIssue,
  DISPATCH_ISSUE_STYLE,
} from "@/lib/dispatchStage";
import { calcInclusiveAmount } from "@/lib/vat";
import { ANNOUNCEMENT_NOTICE_FIELD, getLastSeen } from "@/lib/portalNotifications";
import InstallAppButton from "@/components/InstallAppButton";

function won(n: number | null | undefined) {
  if (!n) return "-";
  return Math.round(n).toLocaleString("ko-KR") + "원";
}

function shortDateTime(v: string | null | undefined) {
  if (!v) return "-";
  const d = new Date(v);
  return d.toLocaleString("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit",
  });
}

function shortDate(v: string | null | undefined) {
  if (!v) return "-";
  return new Date(v).toLocaleDateString("ko-KR", {
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
  });
}

function ArrowRight({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.3}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 12h17M13.5 5.5 20 12l-6.5 6.5" />
    </svg>
  );
}

type QuoteRow = {
  id: string;
  quote_no: string | null;
  origin: string | null;
  destination: string | null;
  vehicle_type: string | null;
  item: string | null;
  final_amount: number | null;
  created_at: string;
};
type InvoiceRow = {
  id: string;
  customer_charge_total: number | null;
  tax_invoice_issued: boolean | null;
  orders: { order_no: string | null } | null;
};
type DispatchRow = {
  id: string;
  order_id: string | null;
  dispatch_status: string;
  cancel_reason: string | null;
  created_at: string;
  orders: {
    order_no: string | null;
    origin: string | null;
    destination: string | null;
    requested_pickup_at: string | null;
    item: string | null;
    vehicle_type: string | null;
  } | null;
};
type AnnouncementRow = {
  id: string;
  title: string;
  content: string | null;
  created_at: string;
  announced_at: string;
};

export default function CustomerHomePage() {
  const [loading, setLoading] = useState(true);
  const [companyName, setCompanyName] = useState("");
  const [pendingQuotes, setPendingQuotes] = useState<QuoteRow[]>([]);
  const [unpaidInvoices, setUnpaidInvoices] = useState<InvoiceRow[]>([]);
  const [activeDispatches, setActiveDispatches] = useState<DispatchRow[]>([]);
  // 🔴 재배차가 접수 중인 오더의 취소 이력 — 조회 화면과 **같은 함수**가 채운다.
  const [redispatch, setRedispatch] = useState<PortalRedispatchMap>(new Map());
  // 🔴 공지는 최근 5건까지 보여준다(PR #103 리뷰). 25차까지는 1건이었다.
  const [announcements, setAnnouncements] = useState<AnnouncementRow[]>([]);
  // 안 읽은 공지 수. 🔴 사이드바 배지와 **같은 규칙**이어야 한다 —
  //   `created_at > 마지막 확인 시각`(기록이 없으면 전부 안 읽음).
  //   두 곳이 어긋나면 "사이드바엔 2인데 홈엔 5" 같은 상태가 된다.
  const [unreadNotices, setUnreadNotices] = useState(0);
  const [noticeLastSeen, setNoticeLastSeen] = useState<string | null>(null);

  async function load() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    // 🔴 홈에서는 "확인함"으로 기록하지 **않는다** — 기록하면 홈을 열어본 것만으로
    //   배지가 사라져서, 화주가 어느 글이 새 글인지 끝내 못 본다.
    //   기록은 `/customer/announcements` 를 실제로 열었을 때만 한다.
    const lastSeen = getLastSeen("announcements");
    setNoticeLastSeen(lastSeen);

    // 🔴 상호 조회를 아래 다섯 건과 **같이** 던진다 — 예전에는 이 한 건을 먼저
    //    `await` 해서 끝난 뒤에야 나머지가 출발했다. 폰처럼 왕복이 느린 곳에서는 그
    //    한 번이 홈 화면 전체를 그만큼 늦춘다(「로그인 뒤 로딩이 길다」, 2026-09-08).
    //    🔴 다시 위로 빼서 먼저 기다리게 만들지 말 것 — 나머지 질의가 이 결과를
    //    쓰지 않으므로 순서를 지킬 이유가 없다.
    const [accountRes, quotesRes, invoicesRes, dispatchesRes, announcementRes, unreadRes] = await Promise.all([
      session
        ? supabase
            .from("customer_accounts")
            .select("companies(name)")
            .eq("auth_user_id", session.user.id)
            .single()
        : Promise.resolve({ data: null }),
      // 「응답 확인하기」 — 화주가 지금 볼 것이 있는 견적(담당자가 견적을 제출한 건)
      supabase
        .from("quotes")
        .select("id,quote_no,origin,destination,vehicle_type,item,final_amount,created_at")
        .eq("status", "견적제출")
        .order("created_at", { ascending: false })
        .limit(5),
      // 「응답 확인하기」 — 아직 입금이 확인되지 않은 정산 건
      supabase
        .from("invoices")
        .select("id,customer_charge_total,tax_invoice_issued,orders(order_no)")
        .eq("payment_received", false)
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("dispatches")
        .select(
          // 🔴 `order_id`·`cancel_reason` 을 빼지 말 것 — 조회 화면과 **같은 규칙**으로
          //    취소 건을 가르고 같은 말을 붙이는 데 둘 다 필요하다.
          "id,order_id,dispatch_status,cancel_reason,pickup_confirmed,delivery_confirmed,issue_occurred,created_at,orders(order_no,origin,destination,requested_pickup_at,item,vehicle_type)"
        )
        // 🔴 3단계 매핑에서 `하차완료`도 「운송완료」 단계다(53차 ⑦ — 화물은 이미 도착했다).
        //    이 줄을 `neq("운송완료")` 하나로 되돌리면 "진행 중인 운송" 블록에
        //    「운송완료」 배지가 달린 행이 나타난다.
        .not("dispatch_status", "in", "(운송완료,하차완료)")
        // 🔴 **취소된 배차를 감추지 않는다**(사용자 지시 2026-09-17) — 재배차를 기다리는
        //    동안은 **아직 진행 중인 운송**이다. 조회 화면에서만 보이고 홈에서는 사라지면
        //    같은 건이 화면마다 다르게 보인다(`lib/dispatchStage.ts` 가 세운 규칙과 같은 결).
        //    ⚠️ **5건보다 넉넉히 받아 온다** — 아래에서 재배차가 끝난 취소 건을 걷어내므로
        //    딱 5건만 받으면 걷어낸 만큼 목록이 비어 보인다.
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("announcements")
        // 🔴 홈은 **제목만** 그린다 — 본문을 그리게 되면 `content_format` 을 함께
        //    받아 `AnnouncementBody` 로 그릴 것(평문을 서식으로 읽으면 줄바꿈이 사라진다).
        .select(`id,title,content,created_at,${ANNOUNCEMENT_NOTICE_FIELD}`)
        .order("created_at", { ascending: false })
        .limit(5),
      // 안 읽은 공지 수는 목록 5건과 따로 센다 — 6건 이상 밀려 있을 수 있어서
      // 불러온 5건으로 세면 실제보다 적게 나온다.
      supabase
        .from("announcements")
        .select("id", { count: "exact", head: true })
        // 🔴 `created_at` 이 아니라 `announced_at` 이다 — 사이드바 배지·목록 NEW 와
        //    **같은 기준**이어야 한다(셋이 갈리면 숫자가 서로 안 맞는다).
        .gt(ANNOUNCEMENT_NOTICE_FIELD, lastSeen || "1970-01-01T00:00:00.000Z"),
    ]);

    setCompanyName(((accountRes?.data as any)?.companies as any)?.name || "");
    setPendingQuotes((quotesRes.data as QuoteRow[]) || []);
    setUnpaidInvoices((invoicesRes.data as unknown as InvoiceRow[]) || []);
    // 🔴 규칙은 화면이 아니라 `lib/portalCancelledDispatches.ts` 에 있다 —
    //    배차·운송 조회와 **같은 함수**를 쓴다.
    const dispatchView = await filterCancelledForCustomer(
      supabase,
      ((dispatchesRes.data as unknown as DispatchRow[]) || []) as any[]
    );
    setActiveDispatches(dispatchView.rows.slice(0, 5) as unknown as DispatchRow[]);
    setRedispatch(dispatchView.redispatch);
    setAnnouncements((announcementRes.data as AnnouncementRow[]) || []);
    setUnreadNotices(unreadRes.count || 0);
    setLoading(false);
  }

  // 🔴 Realtime 이 끊겼을 때의 그물(`lib/portalRefresh.ts`) — 배차·정산 화면과 같은 규칙.
  usePortalRefresh(load);

  useEffect(() => {
    load();

    const channel = supabase
      .channel("customer_home_all")
      .on("postgres_changes", { event: "*", schema: "public", table: "quotes" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "dispatches" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "invoices" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "announcements" }, () => load())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (loading) {
    return <div className="pv2-empty">불러오는 중...</div>;
  }

  const responseCount = pendingQuotes.length + unpaidInvoices.length;

  return (
    <>
      {/* ① 인사 — 🔴 설치 버튼은 제목 줄 **오른쪽 끝**이다(실사용 지적, PR #127).
          본문 흐름 중간에 두면 자리가 애매해서 눈에 안 들어온다.
          이미 설치했거나 설치할 방법이 아예 없으면 **아무것도 그리지 않으므로**
          그때는 이 줄이 제목만 있는 예전 모습 그대로가 된다. */}
      <div className="pv2-page-head">
        <div>
          <h1 className="pv2-h1">{companyName || "위캐리 운송관리"}</h1>
          <p className="pv2-sub">안녕하세요, 새 운송이 필요하신가요?</p>
        </div>
        <InstallAppButton appName="운송관리" className="pv2-install-btn" />
      </div>

      {/* ② 발주 CTA + 응답 확인하기 */}
      <div className="pv2-home-top">
        <Link href="/customer/request" className="pv2-cta">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/portal/wecarry-line.svg" alt="" className="pv2-cta-motif" aria-hidden="true" />
          <span className="pv2-cta-text">
            <span className="pv2-cta-title">새 운송 요청하기</span>
            <span className="pv2-cta-desc">
              출발지·도착지 입력 후 바로 접수
              <br />
              담당자가 확인 후 운임을 확정해드립니다
            </span>
          </span>
          <span className="pv2-cta-arrow">
            <ArrowRight size={30} />
          </span>
        </Link>

        <section className="pv2-card pv2-response" aria-labelledby="pv2-response-title">
          <div className="pv2-block-head">
            <span className="pv2-section-title" id="pv2-response-title">
              응답 확인하기
            </span>
            {responseCount > 0 && <span className="pv2-count-chip">{responseCount}건</span>}
          </div>

          {responseCount === 0 ? (
            <div className="pv2-empty">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/portal/wecarry-eng-cropped.svg" alt="" className="pv2-empty-logo" style={{ width: 92 }} />
              <div className="pv2-empty-title">기다리는 응답이 없습니다</div>
            </div>
          ) : (
            <div className="pv2-response-list">
              {pendingQuotes.map((q) => (
                <div key={q.id} className="pv2-response-row">
                  <span className="pv2-badge-info">견적 도착</span>
                  <div className="pv2-response-body">
                    <div className="pv2-response-title">
                      {q.origin} <span className="pv2-arrow-glyph">→</span> {q.destination}
                    </div>
                    <div className="pv2-response-meta">
                      {[q.quote_no, q.vehicle_type, q.item].filter(Boolean).join(" · ")}
                    </div>
                  </div>
                  <Link href="/customer/quotes" className="pv2-btn-yellow">
                    견적 확인 <ArrowRight size={15} />
                  </Link>
                </div>
              ))}
              {unpaidInvoices.map((i) => (
                <div key={i.id} className="pv2-response-row">
                  <span className="pv2-badge-warn">입금 대기</span>
                  <div className="pv2-response-body">
                    <div className="pv2-response-title">{i.orders?.order_no || "-"} 운송비</div>
                    <div className="pv2-response-meta">
                      부가세 포함 {won(calcInclusiveAmount(i.customer_charge_total || 0))} ·{" "}
                      {i.tax_invoice_issued ? "세금계산서 발행완료" : "세금계산서 발행 예정"}
                    </div>
                  </div>
                  <Link href="/customer/invoices" className="pv2-btn-yellow">
                    정산 확인 <ArrowRight size={15} />
                  </Link>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* ③ 진행 중인 운송 */}
      <section className="pv2-card pv2-block" aria-labelledby="pv2-active-title">
        <div className="pv2-block-head">
          <span className="pv2-section-title" id="pv2-active-title">
            진행 중인 운송
          </span>
          {activeDispatches.length > 0 && (
            <span className="pv2-count-chip">{activeDispatches.length}건</span>
          )}
          <Link href="/customer/dispatches" className="pv2-btn-ghost">
            전체 보기 <ArrowRight size={15} />
          </Link>
        </div>

        {activeDispatches.length === 0 ? (
          <div className="pv2-empty">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/portal/wecarry-eng-cropped.svg" alt="" className="pv2-empty-logo" />
            <div className="pv2-empty-title">진행 중인 운송이 없습니다</div>
          </div>
        ) : (
          <div>
            {activeDispatches.map((d) => (
              <div key={d.id} className="pv2-active-row">
                {/* 🔴 배차 상태 배지는 3단계다(29차). 매핑 정의처는 `lib/dispatchStage.ts` 하나이고
                    배차·운송 조회 화면이 같은 파일을 쓴다 — 여기에 매핑을 다시 적지 말 것.
                    🔴 「문제 발생」은 단계가 아니라 별도 배지다(사용자 확정 6번). */}
                {hasDispatchIssue(d) && (
                  <span
                    className="pv2-status-badge"
                    style={{ background: DISPATCH_ISSUE_STYLE.bg, color: DISPATCH_ISSUE_STYLE.color }}
                  >
                    {DISPATCH_ISSUE_STYLE.label}
                  </span>
                )}
                {/* 🔴 취소된 건은 단계가 「접수」로 돌아가 있으므로(`lib/dispatchStage.ts`)
                    **왜 돌아갔는지를 여기서 말해야 한다** — 배지 하나를 빼면 화주는
                    배차됐던 건이 이유 없이 접수로 되돌아간 것으로 본다.
                    🔴 **재배차가 접수된 뒤에도 배차확정 전까지 계속 뜬다** — 새 배차 카드가
                    취소 이력을 이어받는다. 🔴 `isDispatchCancelled(d.dispatch_status)` 로
                    되돌리지 말 것(그러면 재배차 접수 순간 배지가 사라진다).
                    🔴 말도 판정도 조회 화면과 **같은 함수**가 한다. */}
                {(() => {
                  // 🔴 **취소된 건뿐 아니라 「재배차 접수 중」인 새 배차에도 뜬다**
                  //    (사용자 지시 2026-09-17 — *「이때까지는 배차취소 뱃지가 남아있고
                  //    배차완료가 됐을때 사라지게 하자」*). 판정은 조회 화면과 같은 함수다.
                  const notice = getPortalCancelNotice(d, redispatch);
                  if (!notice) return null;
                  return (
                    <span
                      className="pv2-status-badge"
                      style={{
                        background: DISPATCH_CANCEL_CUSTOMER_STYLE.bg,
                        color: DISPATCH_CANCEL_CUSTOMER_STYLE.color,
                      }}
                    >
                      {dispatchCancelCustomerBadge(notice.reason)}
                    </span>
                  );
                })()}
                <span
                  className="pv2-status-badge"
                  style={{
                    background: getDispatchStageStyle(getDispatchStage(d)).bg,
                    color: getDispatchStageStyle(getDispatchStage(d)).color,
                  }}
                >
                  {getDispatchStageStyle(getDispatchStage(d)).label}
                </span>
                <div className="pv2-active-body">
                  <div className="pv2-active-title">
                    {d.orders?.origin} <span className="pv2-arrow-glyph">→</span> {d.orders?.destination}
                  </div>
                  <div className="pv2-active-meta">
                    {[d.orders?.order_no, d.orders?.item, d.orders?.vehicle_type]
                      .filter(Boolean)
                      .join(" · ")}
                  </div>
                </div>
                <div className="pv2-active-when">상차 {shortDateTime(d.orders?.requested_pickup_at)}</div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ④ 공지사항 — 🔴 캘린더·공지사항이 메뉴에서 빠졌으므로 이 블록이 공지의 유일한
          진입로다. 지우면 /customer/announcements 는 주소를 직접 쳐야만 갈 수 있게 된다. */}
      {announcements.length > 0 ? (
        <section className="pv2-card pv2-block pv2-notices" aria-labelledby="pv2-notice-title">
          <div className="pv2-notices-head">
            <span className="pv2-section-title" id="pv2-notice-title">
              공지사항
            </span>
            {/* 🔴 안 읽은 수는 사이드바 배지와 같은 규칙이다(위 주석 참고).
                0 이면 아예 그리지 않는다 — "안 읽음 0" 은 알림이 아니라 잡음이다. */}
            {unreadNotices > 0 && (
              <span className="pv2-notices-count">안 읽음 {unreadNotices}</span>
            )}
            <Link href="/customer/announcements" className="pv2-btn-ghost">
              전체 공지사항 보기 <ArrowRight size={15} />
            </Link>
          </div>
          <ul className="pv2-notices-list">
            {announcements.map((a) => {
              // 마지막 확인 기록이 없으면 전부 새 글로 본다(공지 페이지와 같은 판정)
              const isNew =
                !noticeLastSeen ||
                new Date((a as any)[ANNOUNCEMENT_NOTICE_FIELD]) > new Date(noticeLastSeen);
              return (
                <li key={a.id} className="pv2-notices-row">
                  <Link href="/customer/announcements" className="pv2-notices-link">
                    {isNew && (
                      <span className="pv2-notices-new" aria-label="안 읽은 공지">
                        NEW
                      </span>
                    )}
                    <span className="pv2-notices-title">{a.title}</span>
                    <span className="pv2-notices-date">{shortDate(a.created_at)}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ) : (
        <section className="pv2-card pv2-block pv2-notice" aria-labelledby="pv2-notice-title">
          <span className="pv2-section-title" id="pv2-notice-title">
            공지사항
          </span>
          <span className="pv2-notice-empty">등록된 공지사항이 없습니다.</span>
          <Link href="/customer/announcements" className="pv2-btn-ghost">
            전체 공지사항 보기 <ArrowRight size={15} />
          </Link>
        </section>
      )}
    </>
  );
}
