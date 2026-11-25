import { useEffect, useState } from "react";
import {
  ArrowDownLeft,
  Check,
  ChevronDown,
  Code2,
  FileText,
  LoaderCircle,
  Maximize2,
  Palette,
  ShieldCheck,
  Sparkles,
  Target,
} from "lucide-react";
import { isPreviewMode } from "./api";
import { statusLabels } from "./ui";
import type { WorkRequest } from "./types";
import OpinionText from "./OpinionText";
import Modal from "./Modal";
import SynthesisPanel from "./SynthesisPanel";
import { hasSynthesizedPlan, hasDepartmentOpinion } from "./studioGuards";

const departments = [
  {
    name: "기획팀",
    english: "PLANNING",
    role: "시스템 · 밸런스 · 콘텐츠",
    icon: Target,
    className: "team-planning",
  },
  {
    name: "개발팀",
    english: "DEVELOPMENT",
    role: "Unity · 게임플레이 · 도구",
    icon: Code2,
    className: "team-development",
  },
  {
    name: "아트팀",
    english: "ART & DESIGN",
    role: "캐릭터 · UI · 연출",
    icon: Palette,
    className: "team-art",
  },
];

type Props = {
  directive: WorkRequest;
  requests: WorkRequest[];
  busy: boolean;
  operation: "saving" | "opinions" | "plan" | "decision" | null;
  onSelect: (id: string) => void;
  onOpinions: (id: string) => void;
  onGeneratePlan: (id: string) => void;
  onDecide: (id: string, approved: boolean) => void;
  onHelp: () => void;
};

export default function ReviewWorkspace({
  directive,
  requests,
  busy,
  operation,
  onSelect,
  onOpinions,
  onGeneratePlan,
  onDecide,
  onHelp,
}: Props) {
  const [tab, setTab] = useState("opinions");
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null);
  useEffect(() => {
    setTab("opinions");
    setExpandedTeam(null);
  }, [directive.id]);
  const opinionCount = departments.filter((team) =>
    hasDepartmentOpinion(directive, team.name),
  ).length;
  const ready = opinionCount === 3;
  const planReady = hasSynthesizedPlan(directive);
  const pending = directive.status === "PENDING_APPROVAL";
  const state = pending
    ? ready
      ? planReady
        ? "승인 대기"
        : "종합 계획 대기"
      : "의견 대기"
    : statusLabels[directive.status];
  const date = new Intl.DateTimeFormat("ko-KR", {
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(directive.createdAt));

  return (
    <>
      <section className="directive-panel" aria-label="선택한 디렉터 지시">
        <div className="directive-overline">
          <span className="section-kicker">
            <ArrowDownLeft size={14} />
            DIRECTOR INSTRUCTION
          </span>
          <label className="directive-picker">
            <span className="sr-only">검토할 디렉터 지시 선택</span>
            <select
              value={directive.id}
              disabled={busy}
              onChange={(event) => onSelect(event.target.value)}
            >
              {requests.map((request) => (
                <option value={request.id} key={request.id}>
                  {request.title}
                </option>
              ))}
            </select>
            <ChevronDown size={14} />
          </label>
        </div>
        <div className="directive-title-row">
          <h2>{directive.title}</h2>
          <span className={`status-tag ${directive.status.toLowerCase()}`}>
            <i />
            {state}
          </span>
        </div>
        <p className="directive-description">{directive.description}</p>
        <div className="directive-meta">
          <span>
            <span className="mini-avatar">D</span>디렉터
          </span>
          <span>
            <FileText size={13} />
            {date} 등록
          </span>
          <span className="directive-meta-end">
            DIAMOND RISE: ROOKIE에 속한 지시
          </span>
        </div>
      </section>
      <div className="review-tabs" role="tablist" aria-label="디렉터 지시 검토">
        {[
          { id: "opinions", label: "부서 의견" },
          { id: "details", label: "지시 내용" },
          { id: "decisions", label: "승인 기록" },
        ].map((item, index, items) => (
          <button
            key={item.id}
            role="tab"
            id={`tab-${item.id}`}
            aria-controls={`panel-${item.id}`}
            aria-selected={tab === item.id}
            tabIndex={tab === item.id ? 0 : -1}
            onClick={() => setTab(item.id)}
            onKeyDown={(event) => {
              let next = index;
              if (event.key === "ArrowRight") next = (index + 1) % items.length;
              else if (event.key === "ArrowLeft")
                next = (index + items.length - 1) % items.length;
              else if (event.key === "Home") next = 0;
              else if (event.key === "End") next = items.length - 1;
              else return;
              event.preventDefault();
              setTab(items[next].id);
              document.getElementById(`tab-${items[next].id}`)?.focus();
            }}
          >
            {item.label}
            {item.id === "opinions" && <span>{opinionCount}</span>}
          </button>
        ))}
        <button className="review-help" onClick={onHelp}>
          <ShieldCheck size={14} />
          승인 흐름 안내
        </button>
      </div>
      {tab === "opinions" && (
        <section
          id="panel-opinions"
          role="tabpanel"
          aria-labelledby="tab-opinions"
          className="department-review"
        >
          <div className="review-heading">
            <h2>
              세 부서의 검토 의견
              <span>각자의 전문성으로, 같은 목표를 향해.</span>
            </h2>
            <span className="review-completion">
              <span className="completion-dots">
                {departments.map((team) => (
                  <i
                    key={team.name}
                    className={
                      hasDepartmentOpinion(directive, team.name)
                        ? "complete"
                        : ""
                    }
                  />
                ))}
              </span>
              {opinionCount}/3 검토 완료
            </span>
          </div>
          <div className="opinion-grid">
            {departments.map(
              ({ name, english, role, icon: Icon, className }, index) => {
                const opinion = directive.opinions?.find(
                  (item) => item.team === name && item.content?.trim(),
                );
                return (
                  <article
                    key={name}
                    className={`opinion-card ${className}`}
                    aria-busy={operation === "opinions"}
                  >
                    <div className="opinion-card-header">
                      <div className="opinion-team">
                        <span className="department-avatar">
                          <Icon size={21} strokeWidth={1.8} />
                        </span>
                        <div>
                          <span className="team-english">{english}</span>
                          <h3>{name}</h3>
                        </div>
                      </div>
                      <span className="opinion-index" aria-hidden="true">
                        0{index + 1}
                      </span>
                    </div>
                    <div className="opinion-subheader">
                      <span>{role}</span>
                      <span
                        className={`opinion-state ${opinion ? "complete" : ""}`}
                      >
                        <i />
                        {operation === "opinions"
                          ? isPreviewMode
                            ? "샘플 로딩"
                            : "검토 중"
                          : opinion
                            ? "검토 완료"
                            : "의견 대기"}
                      </span>
                    </div>
                    <div
                      className={`opinion-copy ${!opinion ? "empty-opinion" : ""}`}
                      tabIndex={opinion ? 0 : undefined}
                      aria-label={`${name} 검토 의견`}
                    >
                      {opinion ? (
                        <OpinionText content={opinion.content} />
                      ) : (
                        <>
                          <span className="empty-team-icon">
                            {operation === "opinions" ? (
                              <LoaderCircle className="spin" size={23} />
                            ) : (
                              <Icon size={25} />
                            )}
                          </span>
                          <strong>
                            {operation === "opinions"
                              ? isPreviewMode
                                ? "샘플 의견을 불러옵니다"
                                : "의견을 작성하고 있습니다"
                              : isPreviewMode
                                ? "샘플 의견 대기"
                                : "이 팀의 관점을 기다립니다"}
                          </strong>
                          <p>
                            {isPreviewMode
                              ? "실제 AI를 호출하지 않습니다.\n샘플 의견으로 흐름을 확인하세요."
                              : operation === "opinions"
                                ? "세 부서가 순서대로 검토합니다.\n모두 완료되면 의견이 표시됩니다."
                                : "세 부서 의견을 요청하면\n이 지시에 대한 검토 결과가 표시됩니다."}
                          </p>
                        </>
                      )}
                    </div>
                    <footer className="opinion-card-foot">
                      <span>
                        <span className="model-dot" />
                        {opinion?.model ??
                          (isPreviewMode ? "SAMPLE PREVIEW" : "LOCAL AI AGENT")}
                      </span>
                      <button
                        className="icon-button"
                        aria-label={`${name} 의견 크게 보기`}
                        disabled={!opinion}
                        onClick={() => setExpandedTeam(name)}
                      >
                        <Maximize2 size={15} />
                      </button>
                    </footer>
                  </article>
                );
              },
            )}
          </div>
          <div className="opinions-note">
            <ShieldCheck size={13} />
            <span>
              세 부서의 의견은 제안입니다. 최종 결정은 디렉터가 내립니다.
            </span>
            <span className="local-note">
              {isPreviewMode
                ? "샘플 의견 · 실제 AI 호출 없음"
                : "로컬 모델 순차 검토"}
            </span>
          </div>
        </section>
      )}
      {tab === "details" && (
        <section
          id="panel-details"
          role="tabpanel"
          aria-labelledby="tab-details"
          className="detail-panel"
        >
          <span className="section-kicker">ORIGINAL DIRECTIVE</span>
          <h2>디렉터 지시 원문</h2>
          <p>{directive.description}</p>
          <div className="detail-metadata">
            <span>
              프로젝트 <strong>DIAMOND RISE: ROOKIE</strong>
            </span>
            <span>
              등록 일시{" "}
              <strong>
                {new Date(directive.createdAt).toLocaleString("ko-KR")}
              </strong>
            </span>
          </div>
        </section>
      )}
      {tab === "decisions" && (
        <section
          id="panel-decisions"
          role="tabpanel"
          aria-labelledby="tab-decisions"
          className="detail-panel"
        >
          <span className="section-kicker">DIRECTOR’S DECISION</span>
          <h2>
            {pending
              ? "아직 결정이 기록되지 않았습니다"
              : `${statusLabels[directive.status]} 기록`}
          </h2>
          <p>
            {directive.decidedAt
              ? `${new Date(directive.decidedAt).toLocaleString("ko-KR")}에 디렉터의 결정이 기록되었습니다.`
              : "세 부서 의견을 검토하고 아래에서 승인 또는 반려를 기록해 주세요."}
          </p>
          <div className="safe-note">
            <ShieldCheck size={17} />
            승인은 지시 상태만 변경합니다. 게임 파일 수정이나 개발 실행은
            수행하지 않습니다.
          </div>
        </section>
      )}
      <SynthesisPanel
        directive={directive}
        ready={ready}
        busy={busy}
        generating={operation === "plan"}
        onGenerate={onGeneratePlan}
      />
      <section className="director-dock" aria-label="디렉터 승인 및 의견 요청">
        <div className="dock-copy">
          <span className="dock-icon">
            <ShieldCheck size={21} />
          </span>
          <div>
            <h3>
              {!pending
                ? "디렉터의 결정이 기록되었습니다"
                : ready
                  ? planReady
                    ? "다음 플레이는 디렉터의 결정으로"
                    : "종합 계획을 만든 뒤 최종 결정하세요"
                  : "세 팀의 의견을 모아 주세요"}
            </h3>
            <p>
              {!pending
                ? "이 지시는 검토가 종료되어 의견을 다시 요청할 수 없습니다."
                : "세 부서 의견과 종합 계획이 모두 있어야 승인할 수 있습니다. 실제 개발은 실행되지 않습니다."}
            </p>
          </div>
        </div>
        <div className="dock-actions">
          <button
            className="generate-button"
            disabled={busy || !pending}
            onClick={() => onOpinions(directive.id)}
          >
            {operation === "opinions" ? (
              <LoaderCircle className="spin" size={15} />
            ) : (
              <Sparkles size={15} />
            )}
            {operation === "opinions"
              ? "세 부서 검토 중…"
              : ready
                ? "의견 다시 받기"
                : "세 부서 의견 받기"}
          </button>
          <span className="action-divider" />
          <button
            className="reject-button"
            disabled={busy || !pending}
            onClick={() => onDecide(directive.id, false)}
          >
            반려
          </button>
          <button
            className="approve-button"
            disabled={busy || !pending || !ready || !planReady}
            onClick={() => onDecide(directive.id, true)}
          >
            <Check size={16} />
            승인 기록
          </button>
        </div>
      </section>
      {expandedTeam && (
        <Modal titleId="expanded-title" onClose={() => setExpandedTeam(null)}>
          <span className="section-kicker">DEPARTMENT OPINION</span>
          <h2 id="expanded-title">{expandedTeam} 검토 의견</h2>
          <p className="modal-intro">{directive.title}</p>
          <div className="expanded-opinion">
            <OpinionText
              content={
                directive.opinions?.find(
                  (opinion) => opinion.team === expandedTeam,
                )?.content ?? ""
              }
            />
          </div>
        </Modal>
      )}
    </>
  );
}
