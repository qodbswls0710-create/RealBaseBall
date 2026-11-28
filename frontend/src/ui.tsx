export const statusLabels = {
  PENDING_APPROVAL: "검토 중",
  APPROVED: "승인 완료",
  REJECTED: "반려",
};

export const executionStatusLabels = {
  NOT_STARTED: "실행 전",
  WAITING_FOR_UNITY: "Unity 프로젝트 연결 대기",
  READY: "실행 준비 완료",
  RUNNING: "실행 중",
  COMPLETED: "실행 완료",
  FAILED: "실행 실패",
};
export function DiamondMark({ small = false }: { small?: boolean }) {
  return (
    <span className={`diamond-mark ${small ? "small" : ""}`} aria-hidden="true">
      <svg viewBox="0 0 40 40" fill="none">
        <path
          d="M20 3 37 20 20 37 3 20Z"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path d="m20 10 10 10-10 10-10-10Z" fill="currentColor" opacity=".15" />
        <path
          d="M15 25V15h4c7 0 7 10 0 10Zm8-10 3 10m-1.5-5H28"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}
