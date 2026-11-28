import type { WorkRequest } from "./types";
import { hasSynthesizedPlan } from "./studioGuards";
import {
  createPreviewFixtures,
  createPreviewPlan,
  createPreviewReview,
  previewTeams,
} from "./previewFixtures";

export const isPreviewMode =
  (import.meta as ImportMeta & { env?: { VITE_STUDIO_PREVIEW?: string } }).env
    ?.VITE_STUDIO_PREVIEW === "true";

// No storage, backend calls, or AI calls in preview mode. Reloading resets state.
const requests: WorkRequest[] = isPreviewMode ? createPreviewFixtures() : [];

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

function error(message: string, status: number): Response {
  return json({ message }, status);
}

function checkAbort(signal?: AbortSignal | null): void {
  if (signal?.aborted)
    throw (
      signal.reason ??
      new DOMException("The request was aborted.", "AbortError")
    );
}

function wait(
  milliseconds: number,
  signal?: AbortSignal | null,
): Promise<void> {
  checkAbort(signal);
  return new Promise((resolve, reject) => {
    const onAbort = () => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
      reject(
        signal?.reason ??
          new DOMException("The request was aborted.", "AbortError"),
      );
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, milliseconds);
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

async function readBody(
  init?: RequestInit,
): Promise<Record<string, unknown> | null> {
  try {
    const value: unknown = await new Response(init?.body).json();
    return value !== null && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function validText(value: unknown, maxLength: number): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    value.length <= maxLength
  );
}

function hasAllOpinions(request: WorkRequest): boolean {
  return previewTeams.every((team) =>
    request.opinions.some(
      (opinion) => opinion.team === team && opinion.content.trim(),
    ),
  );
}

export async function studioFetch(
  input: string,
  init?: RequestInit,
): Promise<Response> {
  if (!isPreviewMode) return fetch(input, init);

  checkAbort(init?.signal);
  const method = (init?.method ?? "GET").toUpperCase();
  let path: string;
  try {
    path = new URL(input, "https://studio-preview.invalid").pathname.replace(
      /\/+$/,
      "",
    );
  } catch {
    return error("요청 주소가 올바르지 않습니다.", 400);
  }
  const action =
    /^\/api\/v1\/requests\/([^/]+)\/(opinions|plan|decision)$/.exec(path);
  await wait(
    method === "POST" && (action?.[2] === "opinions" || action?.[2] === "plan")
      ? 600
      : 150,
    init?.signal,
  );
  checkAbort(init?.signal);

  if (path === "/api/v1/health") {
    return method === "GET"
      ? json({ status: "ok", mode: "preview" })
      : error("지원하지 않는 요청 방식입니다.", 405);
  }

  if (path === "/api/v1/requests") {
    if (method === "GET") return json(requests);
    if (method !== "POST") return error("지원하지 않는 요청 방식입니다.", 405);
    const body = await readBody(init);
    checkAbort(init?.signal);
    if (
      !body ||
      !validText(body.title, 120) ||
      !validText(body.description, 4000) ||
      !validText(body.team, 40)
    ) {
      return error(
        "제목, 설명, 팀은 공백이 아닌 문자열이어야 하며 각각 120자, 4000자, 40자 이하여야 합니다.",
        400,
      );
    }
    const created: WorkRequest = {
      id: crypto.randomUUID(),
      title: body.title.trim(),
      description: body.description.trim(),
      team: body.team.trim(),
      plan: null,
      planModel: null,
      planGeneratedAt: null,
      opinions: [],
      status: "PENDING_APPROVAL",
      executionStatus: "NOT_STARTED",
      createdAt: new Date().toISOString(),
      decidedAt: null,
    };
    requests.unshift(created);
    return json(created, 201);
  }

  if (!action) return error("미리보기에서 제공하지 않는 경로입니다.", 404);
  let id: string;
  try {
    id = decodeURIComponent(action[1]);
  } catch {
    return error("지시 식별자가 올바르지 않습니다.", 400);
  }
  const expectedMethod = action[2] === "decision" ? "PATCH" : "POST";
  if (method !== expectedMethod)
    return error("지원하지 않는 요청 방식입니다.", 405);
  const request = requests.find((item) => item.id === id);
  if (!request) return error("지시를 찾을 수 없습니다.", 404);
  if (request.status !== "PENDING_APPROVAL")
    return error("이미 승인 또는 반려된 지시는 변경할 수 없습니다.", 409);

  if (action[2] === "opinions") {
    Object.assign(request, createPreviewReview(request.title));
    return json(request);
  }

  if (action[2] === "plan") {
    if (!hasAllOpinions(request))
      return error(
        "종합 계획을 생성하려면 기획팀, 개발팀, 아트팀 의견이 모두 필요합니다.",
        409,
      );
    Object.assign(request, createPreviewPlan(request.title));
    return json(request);
  }

  const body = await readBody(init);
  checkAbort(init?.signal);
  if (!body || typeof body.approved !== "boolean")
    return error("approved는 불리언이어야 합니다.", 400);
  // Recheck after reading the body in case another decision completed meanwhile.
  if (request.status !== "PENDING_APPROVAL")
    return error("이미 승인 또는 반려된 지시는 변경할 수 없습니다.", 409);
  if (body.approved && !hasAllOpinions(request)) {
    return error(
      "승인하려면 기획팀, 개발팀, 아트팀 의견이 모두 필요합니다.",
      409,
    );
  }
  if (body.approved && !hasSynthesizedPlan(request)) {
    return error("승인하려면 생성된 종합 실행 계획이 필요합니다.", 409);
  }
  request.status = body.approved ? "APPROVED" : "REJECTED";
  request.executionStatus = body.approved
    ? "WAITING_FOR_UNITY"
    : "NOT_STARTED";
  request.decidedAt = new Date().toISOString();
  return json(request);
}
