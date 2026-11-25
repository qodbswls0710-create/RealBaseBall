import { Check, GitMerge, LoaderCircle, ShieldCheck } from "lucide-react";
import type { WorkRequest } from "./types";
import { isPreviewMode } from "./api";
import OpinionText from "./OpinionText";
import { hasSynthesizedPlan } from "./studioGuards";

export default function SynthesisPanel({
  directive,
  ready,
  busy,
  generating,
  onGenerate,
}: {
  directive: WorkRequest;
  ready: boolean;
  busy: boolean;
  generating: boolean;
  onGenerate: (id: string) => void;
}) {
  const generated = hasSynthesizedPlan(directive);
  const pending = directive.status === "PENDING_APPROVAL";
  return (
    <section
      className={`synthesis-panel ${generated ? "synthesis-ready" : ""}`}
      aria-labelledby="synthesis-title"
      aria-busy={generating}
    >
      <header className="synthesis-heading">
        <span className="synthesis-icon">
          <GitMerge size={22} />
        </span>
        <div>
          <span className="section-kicker">DIRECTOR REVIEW / SYNTHESIS</span>
          <h2 id="synthesis-title">세 관점을 하나의 실행 계획으로</h2>
        </div>
        <span className="synthesis-state">
          {generated ? (
            <>
              <Check size={13} />
              계획 생성 완료
            </>
          ) : ready ? (
            "종합 계획 대기"
          ) : (
            "부서 의견 필요"
          )}
        </span>
      </header>
      <p className="synthesis-description">
        기획·개발·아트 의견을 종합하고 전제, 충돌 사항, 구현 순서를 검토합니다.
        종합 계획이 생성되어야 승인을 기록할 수 있습니다.
      </p>
      {generated ? (
        <>
          <div
            className="synthesis-plan"
            tabIndex={0}
            aria-label="종합 계획 원문 및 전제와 충돌 사항"
          >
            <OpinionText content={directive.plan ?? ""} />
          </div>
          <div className="synthesis-meta">
            <span>{directive.planModel ?? "종합 계획 모델"}</span>
            <span>
              {new Date(directive.planGeneratedAt!).toLocaleString("ko-KR")}{" "}
              생성
            </span>
          </div>
        </>
      ) : (
        <div className="synthesis-next">
          <div>
            <strong>
              {ready
                ? "세 부서 의견이 준비되었습니다"
                : "먼저 세 부서의 의견을 모아 주세요"}
            </strong>
            <p>
              {isPreviewMode
                ? "미리보기에서는 정적 샘플 종합 계획을 제공합니다. 실제 AI를 호출하지 않습니다."
                : "종합 계획 생성은 연결된 로컬 백엔드에서 처리합니다. 생성된 계획을 검토한 뒤 최종 결정하세요."}
            </p>
          </div>
          <button
            className="synthesize-button"
            disabled={busy || !ready || !pending}
            onClick={() => onGenerate(directive.id)}
          >
            {generating ? (
              <LoaderCircle className="spin" size={16} />
            ) : (
              <GitMerge size={16} />
            )}
            {generating ? "종합 계획 생성 중…" : "종합 계획 만들기"}
          </button>
        </div>
      )}
      <div className="synthesis-safety">
        <ShieldCheck size={13} />
        <span>
          계획 생성과 승인 기록은 실제 코드 실행이나 에셋 제작을 수행하지
          않습니다.
        </span>
        {generated && pending && (
          <button
            className="text-button"
            disabled={busy}
            onClick={() => onGenerate(directive.id)}
          >
            {generating ? "종합 계획 생성 중…" : "종합 계획 다시 만들기"}
          </button>
        )}
      </div>
    </section>
  );
}
