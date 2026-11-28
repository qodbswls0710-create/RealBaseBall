import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { isPreviewMode, studioFetch } from "./api";
import type { HealthStatus, WorkRequest } from "./types";
import { hasSynthesizedPlan } from "./studioGuards";

export function useStudio() {
  const [health, setHealth] = useState<HealthStatus>("checking");
  const [requests, setRequests] = useState<WorkRequest[]>([]);
  const [activeDirectiveId, setActiveDirectiveId] = useState("");
  const [draft, setDraft] = useState({ title: "", description: "" });
  const [busy, setBusy] = useState(false);
  const [operation, setOperation] = useState<
    "saving" | "opinions" | "plan" | "decision" | null
  >(null);
  const [notice, setNotice] = useState("");
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);
  const activeDirective =
    requests.find((request) => request.id === activeDirectiveId) ?? requests[0];

  useEffect(() => {
    const controller = new AbortController();
    studioFetch("/api/v1/health", { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("Backend unavailable");
        return response.json();
      })
      .then(() => {
        if (!controller.signal.aborted) setHealth("connected");
      })
      .catch(() => {
        if (!controller.signal.aborted) setHealth("offline");
      });
    studioFetch("/api/v1/requests", { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("지시 목록을 불러오지 못했습니다.");
        return response.json() as Promise<WorkRequest[]>;
      })
      .then((items) => {
        if (controller.signal.aborted) return;
        setRequests(items);
        if (items.length > 0) setActiveDirectiveId(items[0].id);
      })
      .catch((error: Error) => {
        if (!controller.signal.aborted) setLoadError(error.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  async function submitRequest(
    event: FormEvent<HTMLFormElement>,
  ): Promise<boolean> {
    event.preventDefault();
    setBusy(true);
    setOperation("saving");
    setNotice("");
    try {
      const response = await studioFetch("/api/v1/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...draft, team: "공동 프로젝트" }),
      });
      if (!response.ok)
        throw new Error(
          "디렉터 지시를 저장하지 못했습니다. 입력 내용을 확인해 주세요.",
        );
      const created: WorkRequest = await response.json();
      setRequests((current) => [created, ...current]);
      setActiveDirectiveId(created.id);
      setDraft({ title: "", description: "" });
      setNotice("디렉터 지시를 저장했습니다. 세 부서 의견을 요청해 보세요.");
      return true;
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "지시 저장에 실패했습니다.",
      );
      return false;
    } finally {
      setBusy(false);
      setOperation(null);
    }
  }

  async function decideRequest(id: string, approved: boolean) {
    setBusy(true);
    setOperation("decision");
    setNotice("");
    try {
      const response = await studioFetch(`/api/v1/requests/${id}/decision`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approved }),
      });
      if (!response.ok)
        throw new Error("지시 상태를 저장하지 못했습니다. 다시 불러와 주세요.");
      const updated: WorkRequest = await response.json();
      setRequests((current) =>
        current.map((request) => (request.id === id ? updated : request)),
      );
      setNotice(
        approved
          ? "지시 승인을 기록했습니다. 실제 개발 작업은 아직 실행되지 않았습니다."
          : "지시 반려를 기록했습니다.",
      );
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "상태 저장에 실패했습니다.",
      );
    } finally {
      setBusy(false);
      setOperation(null);
    }
  }

  async function requestDepartmentOpinions(id: string) {
    setBusy(true);
    setOperation("opinions");
    setNotice(
      isPreviewMode
        ? "샘플 의견을 불러오는 중입니다. 실제 AI 호출은 수행하지 않습니다."
        : "기획·개발·아트팀이 지시사항을 차례로 검토하고 있습니다. 로컬 모델 응답까지 잠시 걸릴 수 있어요.",
    );
    try {
      const response = await studioFetch(`/api/v1/requests/${id}/opinions`, {
        method: "POST",
      });
      if (!response.ok)
        throw new Error(
          response.status === 503
            ? "Ollama가 응답하지 않습니다. Ollama 실행 상태를 확인해 주세요."
            : "부서 의견을 받지 못했습니다. 잠시 후 다시 시도해 주세요.",
        );
      const updated: WorkRequest = await response.json();
      setRequests((current) =>
        current.map((request) => (request.id === id ? updated : request)),
      );
      setNotice(
        isPreviewMode
          ? "세 부서 샘플 의견을 불러왔습니다. 실제 AI 호출 없이 검토 흐름을 확인할 수 있습니다."
          : "세 부서 의견을 모두 받았습니다. 비교한 뒤 이 지시의 승인 여부를 정해 주세요.",
      );
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "부서 의견 요청에 실패했습니다.",
      );
    } finally {
      setBusy(false);
      setOperation(null);
    }
  }

  async function generateSynthesisPlan(id: string) {
    setBusy(true);
    setOperation("plan");
    setNotice(
      isPreviewMode
        ? "샘플 종합 계획을 불러오는 중입니다. 실제 AI 호출은 수행하지 않습니다."
        : "세 부서 의견을 종합해 디렉터 검토용 계획을 만들고 있습니다.",
    );
    try {
      const response = await studioFetch(`/api/v1/requests/${id}/plan`, {
        method: "POST",
      });
      if (!response.ok)
        throw new Error(
          response.status === 409
            ? "종합 계획을 만들려면 승인 대기 상태와 세 부서 의견이 모두 필요합니다."
            : response.status === 503
              ? "로컬 AI에 연결할 수 없습니다. Ollama 실행 상태를 확인해 주세요."
              : "종합 계획을 생성하지 못했습니다. 잠시 후 다시 시도해 주세요.",
        );
      const updated: WorkRequest = await response.json();
      if (!hasSynthesizedPlan(updated)) {
        throw new Error(
          "완료된 종합 계획과 생성 시각을 받지 못했습니다. 백엔드 업데이트 상태를 확인해 주세요.",
        );
      }
      setRequests((current) =>
        current.map((request) =>
          request.id === id ? { ...request, ...updated } : request,
        ),
      );
      setNotice(
        isPreviewMode
          ? "샘플 종합 계획을 불러왔습니다. 전제·충돌 사항을 확인하고 승인 여부를 결정해 보세요."
          : "종합 계획을 생성했습니다. 전제·충돌 사항과 구현 순서를 검토한 뒤 승인 여부를 결정하세요.",
      );
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "종합 계획 생성에 실패했습니다.",
      );
    } finally {
      setBusy(false);
      setOperation(null);
    }
  }

  return {
    health,
    requests,
    activeDirective,
    activeDirectiveId,
    setActiveDirectiveId,
    draft,
    setDraft,
    busy,
    operation,
    notice,
    setNotice,
    loadError,
    loading,
    submitRequest,
    decideRequest,
    requestDepartmentOpinions,
    generateSynthesisPlan,
  };
}
