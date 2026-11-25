import { useEffect, useState } from "react";
import {
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  FolderKanban,
  LoaderCircle,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  ShieldCheck,
  X,
} from "lucide-react";
import { isPreviewMode } from "./api";
import { useStudio } from "./useStudio";
import Modal from "./Modal";
import Sidebar from "./Sidebar";
import ReviewWorkspace from "./ReviewWorkspace";
import { DiamondMark } from "./ui";
import "./requests.css";

function App() {
  const studio = useStudio();
  const {
    health,
    requests,
    activeDirective,
    draft,
    setDraft,
    busy,
    operation,
    notice,
    loadError,
    loading,
    submitRequest,
    decideRequest,
    requestDepartmentOpinions,
    generateSynthesisPlan,
  } = studio;
  const [mobile, setMobile] = useState(() => window.innerWidth < 1080);
  const [sidebarOpen, setSidebarOpen] = useState(
    () => window.innerWidth >= 1080,
  );
  const [activeNav, setActiveNav] = useState("디렉터 워크룸");
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [showApprovalInfo, setShowApprovalInfo] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(max-width: 1079px)");
    const resize = () => {
      setMobile(media.matches);
      setSidebarOpen(!media.matches);
    };
    media.addEventListener("change", resize);
    return () => media.removeEventListener("change", resize);
  }, []);
  const approvedCount = requests.filter(
    (request) => request.status === "APPROVED",
  ).length;
  const pendingCount = requests.filter(
    (request) => request.status === "PENDING_APPROVAL",
  ).length;
  const statusText = {
    checking: "연결 확인 중",
    connected: "로컬 스튜디오 연결됨",
    offline: "백엔드 연결 끊김",
  }[health];
  function navigate(name: string) {
    setActiveNav(name);
    if (mobile) setSidebarOpen(false);
  }
  function selectDirective(id: string) {
    studio.setActiveDirectiveId(id);
    studio.setNotice("");
    navigate("디렉터 워크룸");
  }
  function openRequest() {
    studio.setNotice("");
    if (mobile) setSidebarOpen(false);
    setShowRequestForm(true);
  }
  function openHelp() {
    if (mobile) setSidebarOpen(false);
    setShowApprovalInfo(true);
  }

  return (
    <div
      className={`app-shell ${sidebarOpen ? "sidebar-expanded" : "sidebar-collapsed"}`}
    >
      <a href="#main-content" className="skip-link">
        본문으로 건너뛰기
      </a>
      <Sidebar
        mobile={mobile}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activeNav={activeNav}
        onNavigate={navigate}
        requests={requests}
        activeId={activeDirective?.id}
        busy={busy}
        loading={loading}
        onSelect={selectDirective}
        onNew={openRequest}
        onHelp={openHelp}
      />
      <main id="main-content" className="main-area" tabIndex={-1}>
        <header className="topbar">
          <div className="topbar-leading">
            <button
              className="menu-toggle icon-button"
              type="button"
              aria-label={sidebarOpen ? "사이드바 접기" : "사이드바 펼치기"}
              aria-expanded={sidebarOpen}
              aria-controls="studio-sidebar"
              onClick={() => setSidebarOpen((open) => !open)}
            >
              {mobile ? (
                <Menu size={20} />
              ) : sidebarOpen ? (
                <PanelLeftClose size={19} />
              ) : (
                <PanelLeftOpen size={19} />
              )}
            </button>
            <div className="breadcrumb">
              <span>스튜디오</span>
              <ChevronRight size={13} />
              <strong>{activeNav}</strong>
            </div>
          </div>
          <div className="topbar-actions">
            {isPreviewMode ? (
              <span className="preview-pill">
                <span />
                데모 미리보기 · 샘플 데이터
              </span>
            ) : (
              <div className={`connection-pill ${health}`}>
                <span />
                {statusText}
              </div>
            )}
            <span className="topbar-divider" />
            <span className="top-avatar" title="디렉터">
              D
            </span>
          </div>
        </header>
        <div className="page-content">
          <section className="welcome-row">
            <div>
              <div className="eyebrow">THE DIRECTOR’S WORKROOM</div>
              <h1>{activeNav}</h1>
              <p>하나의 지시, 세 가지 관점. 다음 플레이를 함께 설계합니다.</p>
            </div>
            <button
              className="primary-button"
              onClick={openRequest}
              disabled={busy}
            >
              <Plus size={17} />새 디렉터 지시
            </button>
          </section>
          {loadError && (
            <div className="inline-error page-message" role="alert">
              <CircleHelp size={18} />
              <span>
                {loadError} IntelliJ에서 Spring Boot 백엔드를 실행해 주세요.
              </span>
            </div>
          )}
          {notice && !showRequestForm && (
            <div className="inline-notice page-message" role="status">
              <span>{notice}</span>
              <button
                className="icon-button"
                aria-label="알림 닫기"
                onClick={() => studio.setNotice("")}
              >
                <X size={16} />
              </button>
            </div>
          )}
          <section className="game-project" aria-label="게임 프로젝트">
            <div className="project-brand">
              <DiamondMark />
              <div>
                <span className="section-kicker">GAME PROJECT / 01</span>
                <h2>
                  DIAMOND RISE<span>: ROOKIE</span>
                </h2>
                <p>
                  무명 신인에서 리그의 주인공으로. 야구 커리어 게임 제작
                  스튜디오.
                </p>
              </div>
            </div>
            <div className="project-summary">
              <div>
                <strong>{String(requests.length).padStart(2, "0")}</strong>
                <span>전체 지시</span>
              </div>
              <div>
                <strong>{String(pendingCount).padStart(2, "0")}</strong>
                <span>검토 중</span>
              </div>
              <div>
                <strong>{String(approvedCount).padStart(2, "0")}</strong>
                <span>승인 완료</span>
              </div>
            </div>
            <div className="project-footer">
              <span>
                <i />
                단일 게임 프로젝트
              </span>
              <span>
                UNITY 6 <i /> LOCAL-FIRST STUDIO
              </span>
            </div>
          </section>
          {activeNav !== "디렉터 워크룸" ? (
            <section className="review-empty">
              <div className="empty-icon">
                <FolderKanban size={28} />
              </div>
              <span className="section-kicker">COMING SOON</span>
              <h2>{activeNav}는 준비 중입니다</h2>
              <p>
                현재는 디렉터 지시를 등록하고 세 부서 의견을 검토할 수 있습니다.
                <br />이 메뉴는 기존 버전과 동일하게 아직 제공되지 않습니다.
              </p>
              <button
                className="primary-button"
                onClick={() => navigate("디렉터 워크룸")}
              >
                <ChevronLeft size={16} />
                워크룸으로 돌아가기
              </button>
            </section>
          ) : loading ? (
            <section className="review-empty" role="status">
              <LoaderCircle className="spin" size={28} />
              <h2>스튜디오를 불러오고 있습니다</h2>
            </section>
          ) : activeDirective ? (
            <ReviewWorkspace
              directive={activeDirective}
              requests={requests}
              busy={busy}
              operation={operation}
              onSelect={selectDirective}
              onOpinions={requestDepartmentOpinions}
              onGeneratePlan={generateSynthesisPlan}
              onDecide={decideRequest}
              onHelp={openHelp}
            />
          ) : (
            <section className="review-empty">
              <div className="empty-icon">
                <DiamondMark />
              </div>
              <span className="section-kicker">YOUR NEXT PLAY STARTS HERE</span>
              <h2>첫 디렉터 지시를 등록해 보세요</h2>
              <p>
                하나의 DIAMOND RISE: ROOKIE 프로젝트 안에서
                <br />
                기획·개발·아트팀이 함께 다음 플레이를 설계합니다.
              </p>
              <button className="primary-button" onClick={openRequest}>
                <Plus size={16} />첫 지시 등록
              </button>
            </section>
          )}
          <footer className="page-footer">
            <span>
              DIAMOND RISE <i /> AI DEVELOPMENT STUDIO
            </span>
            <span>좋은 게임은, 좋은 결정에서 시작됩니다.</span>
          </footer>
        </div>
      </main>
      {showRequestForm && (
        <Modal
          titleId="request-title"
          onClose={() => {
            if (!busy) setShowRequestForm(false);
          }}
        >
          <span className="modal-symbol">
            <Plus size={24} />
          </span>
          <span className="section-kicker">NEW DIRECTOR INSTRUCTION</span>
          <h2 id="request-title">다음 플레이를 설계해 주세요.</h2>
          <p className="modal-intro">
            DIAMOND RISE: ROOKIE에 지시를 등록하면
            <br />
            기획·개발·아트팀이 각자의 관점에서 검토합니다.
          </p>
          <form
            className="request-form"
            onSubmit={async (event) => {
              if (await submitRequest(event)) {
                setShowRequestForm(false);
                navigate("디렉터 워크룸");
              }
            }}
          >
            <label>
              지시 제목 <span>필수</span>
              <input
                required
                maxLength={120}
                value={draft.title}
                onChange={(event) =>
                  setDraft({ ...draft, title: event.target.value })
                }
                placeholder="예: 선수 성장 시스템 설계"
                disabled={busy}
              />
            </label>
            <label>
              디렉터 지시 <span>필수</span>
              <textarea
                required
                maxLength={4000}
                rows={6}
                value={draft.description}
                onChange={(event) =>
                  setDraft({ ...draft, description: event.target.value })
                }
                placeholder="원하는 결과, 게임 규칙, 참고할 내용을 구체적으로 설명해 주세요."
                disabled={busy}
              />
              <small>{draft.description.length.toLocaleString()}/4,000</small>
            </label>
            {notice && (
              <div className="inline-error" role="alert">
                {notice}
              </div>
            )}
            <div className="form-actions">
              <button
                className="text-button"
                disabled={busy}
                onClick={() => setShowRequestForm(false)}
                type="button"
              >
                취소
              </button>
              <button className="primary-button" disabled={busy} type="submit">
                {operation === "saving" ? "저장 중…" : "지시 등록"}
                <ArrowRight size={16} />
              </button>
            </div>
          </form>
        </Modal>
      )}
      {showApprovalInfo && (
        <Modal
          titleId="approval-title"
          onClose={() => setShowApprovalInfo(false)}
        >
          <span className="modal-symbol">
            <ShieldCheck size={25} />
          </span>
          <span className="section-kicker">YOUR CALL. ALWAYS.</span>
          <h2 id="approval-title">최종 결정은 디렉터에게.</h2>
          <p className="modal-intro">
            하나의 게임 프로젝트 아래 지시를 등록하고, 세 부서의 독립적인 의견을
            비교한 후 승인 여부를 기록합니다.
          </p>
          <div className="approval-steps">
            <span>
              01<strong>지시 등록</strong>
            </span>
            <ChevronRight size={15} />
            <span>
              02<strong>세 부서 검토</strong>
            </span>
            <ChevronRight size={15} />
            <span>
              03<strong>종합 계획</strong>
            </span>
            <ChevronRight size={15} />
            <span>
              04<strong>결정 기록</strong>
            </span>
          </div>
          <p className="modal-intro">
            세 부서 의견과 생성 완료된 종합 계획이 모두 있어야 승인 기록이
            가능합니다.
          </p>
          <div className="safe-note">
            <ShieldCheck size={18} />
            <span>
              승인은 상태만 변경합니다. 실제 코드 생성, 게임 파일 변경, Unity
              개발 실행은 아직 제공하지 않습니다.
            </span>
          </div>
          <button
            className="primary-button modal-done"
            onClick={() => setShowApprovalInfo(false)}
          >
            확인했습니다
            <Check size={16} />
          </button>
        </Modal>
      )}
    </div>
  );
}

export default App;
