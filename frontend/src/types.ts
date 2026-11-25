export type HealthStatus = "checking" | "connected" | "offline";
export type RequestStatus = "PENDING_APPROVAL" | "APPROVED" | "REJECTED";
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
  createdAt: string;
  decidedAt: string | null;
};
