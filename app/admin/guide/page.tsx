import Link from "next/link";

const TOC = [
  { href: "#start", label: "시작하기 전에" },
  { href: "#companies", label: "① 화주 관리" },
  { href: "#crm", label: "② 활성 화주(CRM)" },
  { href: "#rates", label: "③ 운임기준표" },
  { href: "#quotes", label: "④ 견적 관리" },
  { href: "#orders", label: "⑤ 운송오더" },
  { href: "#drivers", label: "⑥ 차주 관리" },
  { href: "#dispatches", label: "⑦ 배차 관리" },
  { href: "#invoices", label: "⑧ 정산 관리" },
  { href: "#faq", label: "자주 헷갈리는 점" },
];

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: "var(--accent-soft)",
        color: "var(--accent)",
        padding: "12px 16px",
        borderRadius: 12,
        fontSize: 13,
        fontWeight: 500,
        marginTop: 14,
        lineHeight: 1.6,
      }}
    >
      {children}
    </div>
  );
}

function Caution({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: "var(--danger-soft)",
        color: "var(--danger)",
        padding: "12px 16px",
        borderRadius: 12,
        fontSize: 13,
        fontWeight: 500,
        marginTop: 14,
        lineHeight: 1.6,
      }}
    >
      {children}
    </div>
  );
}

function FieldTable({
  rows,
}: {
  rows: { name: string; desc: string }[];
}) {
  return (
    <table style={{ marginTop: 12 }}>
      <thead>
        <tr>
          <th style={{ width: 180 }}>필드</th>
          <th>설명</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.name}>
            <td className="cell-nowrap" style={{ fontWeight: 600 }}>
              {r.name}
            </td>
            <td>{r.desc}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Section({
  id,
  title,
  desc,
  children,
}: {
  id: string;
  title: string;
  desc?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="card"
      style={{ padding: 24, marginBottom: 20, scrollMarginTop: 90 }}
    >
      <h2 style={{ fontSize: 19, marginTop: 0, marginBottom: 6 }}>{title}</h2>
      {desc && (
        <p style={{ fontSize: 13.5, color: "var(--text-muted)", marginTop: 0, marginBottom: 16 }}>
          {desc}
        </p>
      )}
      {children}
    </section>
  );
}

export default function GuidePage() {
  return (
    <main className="container">
      <div className="page-header">
        <div>
          <h1 className="page-title">이용 가이드</h1>
          <p className="page-desc">
            처음 이 시스템을 쓰는 직원을 위한 화면별 상세 안내입니다. 최종
            업데이트: 2026-07-15
          </p>
        </div>
      </div>

      {/* 목차 */}
      <div
        className="card"
        style={{ padding: 16, marginBottom: 20, display: "flex", gap: 8, flexWrap: "wrap" }}
      >
        {TOC.map((t) => (
          <a key={t.href} href={t.href} className="nav-chip">
            {t.label}
          </a>
        ))}
      </div>

      {/* 시작하기 전에 */}
      <Section
        id="start"
        title="시작하기 전에 — 꼭 알아야 할 핵심 개념"
        desc="아래 두 가지만 이해하면 나머지 8개 화면은 훨씬 쉽게 느껴집니다."
      >
        <h3 style={{ fontSize: 14.5 }}>1) 하나의 화주가 거치는 여정</h3>
        <p style={{ fontSize: 13.5, lineHeight: 1.7 }}>
          이 시스템은 <strong>영업대상 발굴 → 상담 → 견적 → 수주 → 배차 → 운송완료 → 정산 → 재영업</strong>
          까지 한 화주(업체)의 전체 생애주기를 하나의 "영업상태" 값으로 관리합니다. 화주 한 곳이
          아래 순서대로 자동으로(또는 수동으로) 승격됩니다.
        </p>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 6,
            alignItems: "center",
            fontSize: 12.5,
            margin: "12px 0",
          }}
        >
          {[
            "미접촉",
            "연락시도",
            "연락완료",
            "추후연락",
            "제안서발송",
            "견적요청",
            "견적발송",
            "첫거래완료",
            "재거래발생",
            "반복화주",
            "월정산화주",
          ].map((s, i, arr) => (
            <span key={s} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span className="badge">{s}</span>
              {i < arr.length - 1 && <span style={{ color: "var(--text-muted)" }}>→</span>}
            </span>
          ))}
        </div>
        <p style={{ fontSize: 13.5, lineHeight: 1.7 }}>
          이 상태값 하나가 <strong>화주 관리, 활성 화주(CRM), 견적, 정산</strong> 화면을 전부
          연결합니다. 예를 들어 견적을 저장하면 "견적요청"으로, 정산을 3번째 등록하면
          "반복화주"로 시스템이 자동으로 상태를 올려줍니다 (뒤로는 되돌리지 않습니다).
        </p>

        <h3 style={{ fontSize: 14.5, marginTop: 20 }}>2) 화면 간 자동 연동</h3>
        <p style={{ fontSize: 13.5, lineHeight: 1.7 }}>
          견적 → 오더 → 배차 → 정산은 서로 자동으로 상태를 맞춰줍니다. 예를 들어 배차상태를
          "운송완료"로 바꾸면 오더상태도 자동으로 같이 바뀌고, 그 차주의 누적 운송건수도 자동으로
          +1 됩니다. 그래서 <strong>대부분의 화면에서 직접 숫자를 계산하거나 다른 화면에 가서
          수동으로 상태를 맞출 필요가 없습니다.</strong>
        </p>
        <Tip>
          💡 헷갈리면 이 순서만 기억하세요: <strong>견적 관리 → 운송오더 → 배차 관리 → 정산 관리</strong>.
          이 4개 화면을 이 순서로 채워나가면 됩니다.
        </Tip>
        <Caution>
          ⚠️ 이 시스템은 현재 별도 로그인 없이 링크로 접속하는 내부용 도구입니다. 외부 화주나
          관계자에게 이 링크를 공유하지 마세요.
        </Caution>
      </Section>

      {/* ① 화주 관리 */}
      <Section
        id="companies"
        title="① 화주 관리 (영업대상 + 화주 통합)"
        desc="모든 업체(영업대상~실제 화주)가 모이는 가장 큰 목록입니다. 새 업체를 알게 되면 무조건 여기서부터 시작합니다."
      >
        <h3 style={{ fontSize: 14 }}>목록 화면 구성</h3>
        <p style={{ fontSize: 13.5, lineHeight: 1.7 }}>
          상단 탭(수도권 중소업체 / 프랜차이즈 / 패키징공장 / 직접 등록)으로 출처를 필터링할 수
          있고, 각 출처는 색상으로 구분됩니다. 목록에서 영업상태를 바로 클릭해서 바꿀 수 있고,
          "견적요청" 이전 단계인 업체에는 <strong>"CRM 전환"</strong> 버튼이 나타납니다 — 누르면
          영업상태가 "견적요청"으로 바뀌면서 <a href="#crm">활성 화주(CRM)</a> 목록에 나타나기
          시작합니다.
        </p>

        <h3 style={{ fontSize: 14, marginTop: 18 }}>신규 업체 등록 시 입력 항목</h3>
        <p style={{ fontSize: 13.5 }}>"+ 신규 업체 등록" 버튼을 누르면 5개 그룹으로 나뉘어 있습니다.</p>
        <FieldTable
          rows={[
            { name: "기본 정보", desc: "회사명*, 업종, 세부업종, 광역권/시군구, 주소, 대표번호(숫자만 입력하면 자동 하이픈), 웹사이트, 취급 품목, 사업자등록번호" },
            { name: "담당자 정보", desc: "담당자명, 직책, 휴대폰(자동 하이픈), 이메일" },
            { name: "거래 정보", desc: "추천 차량(톤수+차량형태 선택), 결제조건, 담당직원, 주요 상차/하차지역(태그로 중복 선택)" },
            { name: "출처", desc: "직접등록 업체만 해당 — 수도권 중소업체/프랜차이즈/패키징공장/기타 중 선택 (기타는 직접 설명 입력)" },
            { name: "영업 정보", desc: "영업상태, 화주등급(S~D, 휴면), 다음 연락 예정일, 메모" },
          ]}
        />

        <h3 style={{ fontSize: 14, marginTop: 18 }}>상세페이지에서 더 볼 수 있는 것</h3>
        <p style={{ fontSize: 13.5, lineHeight: 1.7 }}>
          행을 클릭하면 상세페이지로 이동합니다. "정보 수정"을 누르면 위 등록 항목 외에도
          영업 참고 정보(우선순위, 영업난이도, 종합점수 등 — 주로 엑셀로 가져온 업체에 자동으로
          채워져 있습니다), 거래조건·실적(누적 오더수/매출/마진/미수금 — 이 4개는 정산이 쌓이면
          시스템이 자동 계산하므로 직접 수정할 필요가 거의 없습니다), 저장된 주소(상차지/하차지)까지
          확인·수정할 수 있습니다.
        </p>
        <Caution>
          ⚠️ "완전삭제"는 이 업체에 견적·오더·정산 기록이 하나라도 있으면 실행되지 않습니다.
          단순히 목록에서 안 보이게 하고 싶다면 영업상태를 "거래중단" 또는 "휴면화주"로
          바꿔주세요.
        </Caution>
      </Section>

      {/* ② 활성 화주 (CRM) */}
      <Section
        id="crm"
        title="② 활성 화주 (CRM)"
        desc="화주 관리 목록 중 '견적요청' 이상 진행된 곳만 골라 보여주는 화면입니다. 별도 등록 기능은 없습니다."
      >
        <p style={{ fontSize: 13.5, lineHeight: 1.7 }}>
          실제 거래가 진행 중인 화주만 빠르게 확인하고 싶을 때 씁니다. 회사명, 업종, 지역, 담당자,
          연락처, 결제조건, 누적오더, 미수금, 등급, 거래상태 외에도 <strong>이 화주의 가장 최근
          배차 진행상태</strong>가 자동으로 표시되어, 지금 어느 화주의 운송이 진행 중인지 한눈에
          볼 수 있습니다.
        </p>
        <FieldTable
          rows={[
            { name: "제외 버튼", desc: "행 끝의 '제외'를 누르면 이 화주가 목록에서 빠집니다. 삭제가 아니라 영업상태를 '휴면화주'로 바꾸는 것이며, 데이터는 그대로 남고 화주 관리 목록에는 계속 보입니다." },
            { name: "정보 수정", desc: "이 화면에서는 직접 수정할 수 없습니다. 행을 클릭해 화주 상세페이지로 이동한 뒤 수정하세요." },
          ]}
        />
        <Tip>
          💡 오늘 어떤 화주에게 연락해야 할지 모르겠다면, 여기가 아니라 <a href="#companies">화주
          관리</a>에서 "다음 연락 예정일" 기준으로 확인하는 게 더 정확합니다. 이 화면은 "이미
          거래 중인 화주 현황판" 용도입니다.
        </Tip>
      </Section>

      {/* ③ 운임기준표 */}
      <Section
        id="rates"
        title="③ 운임기준표"
        desc="견적 자동계산의 기준이 되는 숫자표입니다. 여기 숫자를 바꾸면 이후 모든 신규 견적에 즉시 반영됩니다."
      >
        <h3 style={{ fontSize: 14 }}>화면 구성 3단</h3>
        <FieldTable
          rows={[
            { name: "거리구간 × 톤수 매트릭스", desc: "가장 위 표. 거리구간(행) × 차량 톤수(열)별 기본운임입니다." },
            { name: "가산기준 카드들", desc: "차량형태 / 상하차방식 / 물품특성 / 운송시간 / 긴급여부 / 왕복편도별 요율(%) 또는 고정 가산금액." },
            { name: "톤수별 부가요금표", desc: "톤수별 무료 대기시간(분), 초과 시 30분당 요금, 경유지 1곳당 요금." },
          ]}
        />
        <h3 style={{ fontSize: 14, marginTop: 18 }}>수정 방법</h3>
        <p style={{ fontSize: 13.5, lineHeight: 1.7 }}>
          숫자를 <strong>클릭하면 바로 그 자리에서</strong> 입력창으로 바뀝니다. Enter로 저장,
          Esc로 취소됩니다. 기본운임을 하나 바꾸면 "다른 구간에도 같은 비율을 적용할까요?"라는
          팝업이 뜨는데, 여기서 <strong>해당 톤수 전체</strong> / <strong>전체 테이블(모든 톤수)</strong>
          / <strong>이 칸만</strong> 중 선택할 수 있습니다. 비율 적용 시 100원 단위로 반올림됩니다.
        </p>
        <Caution>
          ⚠️ 이 표는 모든 신규 견적 금액에 즉시, 소급 없이 영향을 줍니다. 실수로 잘못 바꾸면
          바로 다음 견적부터 금액이 틀어지니, 가급적 대표/사업총괄만 수정하는 것을 권장합니다.
        </Caution>
      </Section>

      {/* ④ 견적 관리 */}
      <Section
        id="quotes"
        title="④ 견적 관리"
        desc="거리와 조건을 입력하면 운임기준표를 기준으로 자동 계산되고, 그대로 저장하면 견적번호가 발급됩니다."
      >
        <h3 style={{ fontSize: 14 }}>입력 항목</h3>
        <FieldTable
          rows={[
            { name: "고객", desc: "'기존 화주'(회사명 검색 후 선택) 또는 '개인/신규 고객'(고객명, 연락처 직접입력) 중 선택" },
            { name: "출발지 / 도착지", desc: "주소검색(다음 우편번호) 또는 직접 입력 + 상세주소. 기존 화주 선택 시 저장된 상차/하차지 주소가 뱃지로 나타나 클릭 한 번으로 채울 수 있고, 이번 주소를 화주 주소록에 새로 저장하는 체크박스도 있습니다." },
            { name: "거리(km)* / 톤수*", desc: "필수 입력. 이 두 값으로 운임기준표에서 기본운임을 찾습니다." },
            { name: "차량형태 / 상하차방식 / 물품특성 / 운송시간 / 긴급여부 / 왕복편도", desc: "6개 항목 모두 운임기준표의 가산기준과 연결된 단일 선택 옵션입니다." },
            { name: "대기시간(분) / 경유지 수", desc: "무료 대기시간 초과분, 경유지 개수만큼 자동 가산됩니다." },
            { name: "품목", desc: "자유 입력" },
            { name: "첫거래지원 할인(10%)", desc: "체크하면 최종금액에서 10% 할인 적용" },
          ]}
        />
        <p style={{ fontSize: 13.5, lineHeight: 1.7, marginTop: 12 }}>
          입력하는 동안 우측 "자동 계산 결과" 패널에 기본운임부터 각 가산 항목, 최종 견적금액까지
          실시간으로 표시됩니다(부가세 별도). <strong>"견적 저장"</strong>을 누르면 견적번호가
          자동으로 발급되고(예: Q-20260714-001), 기존 화주라면 영업상태가 자동으로 "견적요청"
          이상으로 올라갑니다.
        </p>
        <Tip>
          💡 목록 상단의 [오늘][이번주][이번달][전체] 필터로 원하는 기간의 견적만 빠르게 볼 수
          있습니다.
        </Tip>
      </Section>

      {/* ⑤ 운송오더 */}
      <Section
        id="orders"
        title="⑤ 운송오더"
        desc="수주가 확정된 건, 또는 견적 없이 바로 접수된 건을 등록하는 화면입니다. 배차 전 단계입니다."
      >
        <h3 style={{ fontSize: 14 }}>입력 항목</h3>
        <FieldTable
          rows={[
            { name: "고객", desc: "견적과 동일하게 '기존 화주' 또는 '개인/신규 고객' 선택" },
            { name: "출발지* / 도착지*", desc: "필수 입력" },
            { name: "차량", desc: "자유 입력 (예: '1톤 탑차')" },
            { name: "상차 예정일시 / 하차 예정일시", desc: "달력+시간 선택 UI" },
            { name: "상차 조건 / 하차 조건", desc: "지게차/도크, 기사도움, 1인수작업, 2인수작업, 계단/엘리베이터, 크레인/장비협의, 협의 중 선택" },
            { name: "품목 / 특이사항", desc: "자유 입력" },
          ]}
        />
        <p style={{ fontSize: 13.5, lineHeight: 1.7, marginTop: 12 }}>
          견적 상세페이지에서 <strong>"운송오더 생성"</strong> 버튼을 누르면 이 화면으로 넘어오면서
          출발지·도착지·차량·품목이 자동으로 채워집니다. 저장하면 오더번호가 자동 발급됩니다(예:
          O-20260714-001). 목록에서 배차상태를 직접 바꿀 수도 있지만, 보통은 <a href="#dispatches">배차
          관리</a>에서 배정하면 자동으로 맞춰지므로 여기서 직접 바꿀 일은 많지 않습니다.
        </p>
      </Section>

      {/* ⑥ 차주 관리 */}
      <Section
        id="drivers"
        title="⑥ 차주 관리"
        desc="배차에 쓸 차주(기사) 풀입니다. 화물정보망 의존도를 낮추기 위해 자체 차주풀을 계속 쌓아가는 것이 목표입니다."
      >
        <h3 style={{ fontSize: 14 }}>신규 차주 등록 시 입력 항목</h3>
        <FieldTable
          rows={[
            { name: "차주명* / 연락처", desc: "연락처는 숫자만 입력하면 자동으로 하이픈이 붙습니다." },
            { name: "차량번호(첫 차량) / 톤수 / 차량형태", desc: "톤수 6종, 차량형태 11종(카고~기타/협의) 중 선택. 차량은 등록 후 상세페이지에서 여러 대 추가 가능합니다." },
            { name: "운행 가능지역 / 선호 노선", desc: "지역 태그를 클릭해서 중복 선택" },
            { name: "정산 계좌", desc: "은행명 + 계좌번호 자유 입력" },
            { name: "사업자 여부", desc: "'사업자' 선택 시 사업자등록번호 입력란이 추가로 나타남" },
            { name: "체크박스 5종", desc: "냉장/냉동 가능, 리프트 가능, 지게차 가능, 화물운송자격증 보유, 적재물배상보험 가입" },
          ]}
        />
        <h3 style={{ fontSize: 14, marginTop: 18 }}>상세페이지에서 추가로 관리하는 것</h3>
        <p style={{ fontSize: 13.5, lineHeight: 1.7 }}>
          보험 만기일, 평점(0~5), 클레임 이력을 기록할 수 있고, <strong>"+ 차량 추가"</strong>로
          한 차주가 여러 대의 차량을 보유한 경우도 등록할 수 있습니다. <strong>누적 운송건수는
          직접 입력하는 항목이 아니라</strong>, 배차 상태가 "운송완료"로 바뀔 때마다 시스템이
          자동으로 집계합니다.
        </p>
        <Caution>
          ⚠️ 배차 기록이 있는 차주는 삭제할 수 없습니다.
        </Caution>
      </Section>

      {/* ⑦ 배차 관리 */}
      <Section
        id="dispatches"
        title="⑦ 배차 관리"
        desc="접수된 운송오더에 차주를 배정합니다. 오더상태·차주 운송건수와 자동으로 연동됩니다."
      >
        <h3 style={{ fontSize: 14 }}>신규 배차 입력 항목</h3>
        <FieldTable
          rows={[
            { name: "배차할 운송오더*", desc: "'접수' 또는 '배차중' 상태인 오더만 후보로 나타납니다." },
            { name: "배정할 차주*", desc: "오더가 요구하는 톤수와 같은 차량을 가진 차주가 자동 추천되고, 운행 가능지역까지 겹치면 📍 표시로 우선 표시됩니다. 추천에 없으면 이름으로 직접 검색 가능." },
            { name: "화주 청구운임 / 차주 지급운임", desc: "오더가 견적과 연결되어 있으면 청구운임이 자동으로 채워집니다. 둘 다 입력하면 예상 마진이 실시간으로 표시됩니다." },
            { name: "메모", desc: "자유 입력" },
          ]}
        />
        <p style={{ fontSize: 13.5, lineHeight: 1.7, marginTop: 12 }}>
          "배차 확정"을 누르면 오더상태도 자동으로 "배차완료"로 바뀝니다. 이후 목록에서 배차상태를
          바꿔나가면(상차완료 → 운송완료 등) 오더상태도 계속 같이 맞춰지고, <strong>"운송완료"로
          바뀌는 순간 해당 차주의 누적 운송건수가 자동으로 +1</strong>됩니다 (실수로 되돌리면
          -1 처리되니 안심하고 고쳐도 됩니다).
        </p>
      </Section>

      {/* ⑧ 정산 관리 */}
      <Section
        id="invoices"
        title="⑧ 정산 관리"
        desc="운송완료된 오더를 정산 처리합니다. 화주의 누적 실적과 영업상태 승격이 여기서 자동으로 계산됩니다."
      >
        <h3 style={{ fontSize: 14 }}>신규 정산 입력 항목</h3>
        <FieldTable
          rows={[
            { name: "정산할 운송오더*", desc: "상태가 '운송완료'이면서 아직 정산 등록이 안 된 오더만 후보로 나타납니다." },
            { name: "정산월 / 입금 예정일", desc: "정산월은 오늘 기준 월이 기본값으로 채워집니다." },
            { name: "화주 청구금액 / 차주 지급금액", desc: "배차 정보가 있으면 자동으로 채워집니다. 수정도 가능하며, 입력하면 수수료(마진)가 실시간으로 표시됩니다." },
          ]}
        />
        <p style={{ fontSize: 13.5, lineHeight: 1.7, marginTop: 12 }}>
          정산을 등록하면, 해당 화주의 <strong>누적 오더수·누적 매출·누적 마진·미수금이 그
          화주의 정산 기록 전체를 다시 세어서 자동으로 재계산</strong>됩니다(과거에 정산을 삭제한
          적이 있어도 항상 정확합니다). 동시에 화주 영업상태가 정산 건수에 따라 자동 승격됩니다:
          1건째 "첫거래완료" → 2건째 "재거래발생" → 3건째부터 "반복화주".
        </p>
        <p style={{ fontSize: 13.5, lineHeight: 1.7 }}>
          세금계산서 발행 여부, 입금 완료 여부, 차주 지급 완료 여부는 목록이 아니라 행을 클릭한
          상세페이지에서 체크 처리합니다. 입금 완료로 체크하면 미수금도 자동으로 다시
          계산됩니다.
        </p>
      </Section>

      {/* FAQ */}
      <Section id="faq" title="자주 헷갈리는 점">
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 4 }}>
              Q. 화주 관리랑 활성 화주(CRM)는 뭐가 다른가요?
            </div>
            <div style={{ fontSize: 13.5, color: "var(--text-muted)", lineHeight: 1.6 }}>
              같은 데이터입니다. 화주 관리는 <strong>전체</strong>(영업 시작 전 업체 포함), 활성
              화주(CRM)는 그중 <strong>견적요청 이상 진행된 곳만</strong> 골라 보여주는
              화면입니다. 등록·수정은 항상 화주 관리(또는 상세페이지)에서 합니다.
            </div>
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 4 }}>
              Q. 업체나 차주를 삭제했는데 안 지워져요.
            </div>
            <div style={{ fontSize: 13.5, color: "var(--text-muted)", lineHeight: 1.6 }}>
              견적·오더·배차·정산 기록이 하나라도 연결돼 있으면 완전삭제가 막힙니다. 데이터
              정합성을 지키기 위한 의도된 제한입니다. 안 보이게만 하고 싶으면 상태값을
              "거래중단"/"휴면화주"로 바꿔주세요.
            </div>
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 4 }}>
              Q. 배차상태나 오더상태를 손으로 직접 바꿔도 되나요?
            </div>
            <div style={{ fontSize: 13.5, color: "var(--text-muted)", lineHeight: 1.6 }}>
              가능은 하지만 보통은 필요 없습니다. 배차 관리에서 상태를 바꾸면 오더상태·차주
              운송건수까지 자동으로 같이 맞춰지므로, 되도록 배차 관리 화면에서만 상태를
              바꾸는 것을 권장합니다.
            </div>
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 4 }}>
              Q. 화주의 누적 매출/마진 숫자가 이상해 보여요.
            </div>
            <div style={{ fontSize: 13.5, color: "var(--text-muted)", lineHeight: 1.6 }}>
              이 숫자들은 직접 입력하는 값이 아니라 정산 기록을 기준으로 자동 계산되는
              값입니다. 정산을 삭제하거나 수정했다면 다음 정산 등록 시점에 자동으로 다시
              맞춰집니다. 그래도 이상하면 관리자에게 문의해주세요.
            </div>
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 4 }}>
              Q. 운임기준표를 고쳤는데 예전 견적 금액도 바뀌나요?
            </div>
            <div style={{ fontSize: 13.5, color: "var(--text-muted)", lineHeight: 1.6 }}>
              아니요. 이미 저장된 견적은 그 순간의 금액이 그대로 저장되어 있어 바뀌지 않습니다.
              운임기준표 수정은 <strong>그 이후에 새로 계산하는 견적</strong>에만 영향을 줍니다.
            </div>
          </div>
        </div>
      </Section>

      <p style={{ fontSize: 12.5, color: "var(--text-muted)", textAlign: "center", marginTop: 8 }}>
        실제 화면과 다르거나 설명이 부족한 부분을 발견하면 관리자에게 알려주세요. 이 가이드는
        시스템이 업데이트될 때마다 함께 갱신됩니다.
      </p>
    </main>
  );
}
