import { useRef, useState } from "react";
import {
  ArrowRight,
  ChevronDown,
  CircleHelp,
  ClipboardCheck,
  FolderKanban,
  GitBranch,
  LayoutDashboard,
  Plus,
  Search,
  ShieldCheck,
  UsersRound,
  X,
} from "lucide-react";
import type { WorkRequest } from "./types";
import { useFocusDialog } from "./Modal";
import { DiamondMark } from "./ui";

const navItems = [
  { label: "디렉터 워크룸", icon: LayoutDashboard },
  { label: "업무 보드", icon: ClipboardCheck, upcoming: true },
  { label: "AI 조직", icon: UsersRound, upcoming: true },
  { label: "게임 프로젝트", icon: FolderKanban, upcoming: true },
  { label: "작업 기록", icon: GitBranch, upcoming: true },
];

type Props = {
  mobile: boolean;
  open: boolean;
  onClose: () => void;
  activeNav: string;
  onNavigate: (name: string) => void;
  requests: WorkRequest[];
  activeId?: string;
  busy: boolean;
  loading: boolean;
  onSelect: (id: string) => void;
  onNew: () => void;
  onHelp: () => void;
};

export default function Sidebar(props: Props) {
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLElement>(null);
  useFocusDialog(props.mobile && props.open, ref, props.onClose);
  const filtered = props.requests.filter((request) =>
    request.title.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <>
      {props.mobile && props.open && (
        <button
          className="sidebar-scrim"
          aria-label="메뉴 닫기"
          onClick={props.onClose}
        />
      )}
      <aside
        id="studio-sidebar"
        ref={ref}
        className={`sidebar ${props.open ? "sidebar-open" : ""}`}
        inert={props.mobile && !props.open}
        aria-label="스튜디오 탐색"
        role={props.mobile && props.open ? "dialog" : undefined}
        aria-modal={props.mobile && props.open ? true : undefined}
      >
        <div className="brand-lockup">
          <DiamondMark />
          <div className="sidebar-label">
            <strong>
              DIAMOND RISE<span>AI STUDIO</span>
            </strong>
          </div>
          <button
            className="sidebar-close icon-button"
            aria-label="사이드바 닫기"
            onClick={props.onClose}
          >
            <X size={19} />
          </button>
        </div>
        <div className="workspace-label sidebar-label">
          <span className="live-dot" /> 프로덕션 워크스페이스
        </div>
        <div className="nav-label sidebar-label">스튜디오</div>
        <nav className="main-nav" aria-label="카테고리">
          {navItems.map(({ label, icon: Icon, upcoming }) => (
            <button
              key={label}
              title={!props.open ? label : undefined}
              aria-label={label}
              className={`nav-item ${props.activeNav === label ? "active" : ""}`}
              aria-current={props.activeNav === label ? "page" : undefined}
              onClick={() => props.onNavigate(label)}
            >
              <Icon size={18} strokeWidth={1.7} />
              <span className="sidebar-label">{label}</span>
              {upcoming && <small className="sidebar-label">예정</small>}
            </button>
          ))}
        </nav>
        <div className="sidebar-project sidebar-label">
          <div className="nav-label">
            게임 프로젝트 <span>01</span>
          </div>
          <button
            className="project-tree"
            onClick={() => props.onNavigate("디렉터 워크룸")}
          >
            <DiamondMark small />
            <span>
              DIAMOND RISE: ROOKIE<small>야구 커리어 게임</small>
            </span>
            <ChevronDown size={14} />
          </button>
          <div className="directive-list-header">
            <span>
              디렉터 지시 <b>{props.requests.length}</b>
            </span>
            <button
              className="icon-button"
              aria-label="새 디렉터 지시 등록"
              disabled={props.busy}
              onClick={props.onNew}
            >
              <Plus size={16} />
            </button>
          </div>
          <label className="sidebar-search">
            <Search size={14} />
            <input
              aria-label="디렉터 지시 검색"
              placeholder="지시 검색"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <div className="sidebar-directives">
            {filtered.map((request) => (
              <button
                className={`directive-link ${props.activeId === request.id && props.activeNav === "디렉터 워크룸" ? "selected" : ""}`}
                key={request.id}
                onClick={() => props.onSelect(request.id)}
                disabled={props.busy}
                aria-current={
                  props.activeId === request.id ? "true" : undefined
                }
              >
                <span
                  className={`directive-dot ${request.status.toLowerCase()}`}
                />
                <span>{request.title}</span>
              </button>
            ))}
            {!filtered.length && (
              <p className="sidebar-empty">
                {props.loading
                  ? "불러오는 중…"
                  : search
                    ? "검색 결과가 없습니다."
                    : "등록된 지시가 없습니다."}
              </p>
            )}
          </div>
        </div>
        <div className="sidebar-bottom">
          <button
            className="sidebar-help"
            onClick={props.onHelp}
            aria-label="승인 흐름 안내"
          >
            <CircleHelp size={17} />
            <span className="sidebar-label">
              스튜디오 사용 안내
              <ArrowRight size={14} />
            </span>
          </button>
          <div className="profile">
            <span className="avatar">D</span>
            <div className="sidebar-label">
              <strong>디렉터</strong>
              <span>최종 결정권자</span>
            </div>
            <ShieldCheck size={16} className="sidebar-label" />
          </div>
        </div>
      </aside>
    </>
  );
}
