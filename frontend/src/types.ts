export type HealthStatus = "checking" | "connected" | "offline";
export type RequestStatus = "PENDING_APPROVAL" | "APPROVED" | "REJECTED";
export type ExecutionStatus =
  | "NOT_STARTED"
  | "WAITING_FOR_UNITY"
  | "READY"
  | "RUNNING"
  | "COMPLETED"
  | "FAILED";
export type WorkRequest = {
  id: string;
  title: string;
  description: string;
  team: string;
  plan: string | null;
  planModel: string | null;
  planGeneratedAt: string | null;
  opinions: { team: string; content: string; model: string }[];
  status: RequestStatus;
  executionStatus: ExecutionStatus;
  createdAt: string;
  decidedAt: string | null;
};
