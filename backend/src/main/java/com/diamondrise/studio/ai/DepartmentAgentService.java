package com.diamondrise.studio.ai;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
public class DepartmentAgentService {
    private final RestClient ollama;
    private final String model;

    private static final List<DepartmentProfile> DEPARTMENTS = List.of(
            new DepartmentProfile("기획팀", "야구 커리어 루프 · 선수 성장 · 시즌 밸런스",
                    "야구 게임 시스템 기획자입니다. 선수 성장, 경기 루프, 시즌 구조, 보상과 밸런스를 중심으로 실현 가능한 기획 초안을 제안하세요."),
            new DepartmentProfile("개발팀", "Unity · C# · 게임플레이 구조",
                    "Unity 게임플레이 개발자입니다. 선수 성장 규칙, 경기·훈련과의 연결, 저장할 선수 데이터, Unity C# 구현 순서를 검토하세요. 야구 기능에 직접 필요한 내용만 제안하고 MMORPG·경제·사회 시스템을 근거 없이 끌어오지 마세요. 한국어로 짧은 문장을 쓰고, 기술 용어는 처음 나올 때 쉬운 한국어 설명을 붙이세요. 선수의 실제 진행 데이터와 Unity 설정용 ScriptableObject를 혼동하지 마세요. 코드를 실행하거나 파일을 수정하지 마세요."),
            new DepartmentProfile("아트팀", "캐릭터 · UI · 야구장 연출",
                    "게임 아트 디렉터입니다. 캐릭터와 유니폼, UI 정보 위계, 야구장 분위기와 제작 가능한 에셋 목록을 중심으로 아트 브리프 초안을 제안하세요."),
            new DepartmentProfile("QA팀", "테스트 시나리오 · 밸런스 · 회귀 검토",
                    "게임 QA 리드입니다. 재현 조건, 기대 결과, 경계 사례, 회귀 위험을 중심으로 검증 가능한 테스트 계획을 제안하세요.")
    );

    public DepartmentAgentService(
            @Value("${studio.ai.ollama.base-url:http://127.0.0.1:11434}") String baseUrl,
            @Value("${studio.ai.ollama.model:qwen3:4b-instruct-2507-q4_K_M}") String model) {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(Duration.ofSeconds(5));
        requestFactory.setReadTimeout(Duration.ofMinutes(3));
        this.ollama = RestClient.builder()
                .baseUrl(baseUrl)
                .requestFactory(requestFactory)
                .build();
        this.model = model;
    }

    public List<AgentStatus> listAgents() {
        String status = localStatus();
        return DEPARTMENTS.stream()
                .map(department -> new AgentStatus(department.team(), department.specialty(), model, status))
                .toList();
    }

    public PlanDraft generatePlan(String team, String title, String description) {
        return generateDraft(team, title, description, false);
    }

    private PlanDraft generateDraft(String team, String title, String description, boolean projectOpinion) {
        DepartmentProfile department = DEPARTMENTS.stream()
                .filter(candidate -> candidate.team().equals(team))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("지원하지 않는 AI 부서입니다."));

        String systemPrompt = projectOpinion
                ? """
                    당신은 DIAMOND RISE 야구 커리어 게임 개발 스튜디오의 %s입니다.
                    %s

                    디렉터가 한 프로젝트를 판단할 수 있도록 이 부서의 검토 의견을 한국어로 작성하세요.
                    형식은 '핵심 의견', '이 부서의 제안(최대 3개)', '다른 부서와 맞출 점', '확인 질문'으로 간결하게 나누세요.
                    입력에 없는 사실은 만들지 말고 불확실한 점은 질문으로 표시하세요.
                    실행했다고 말하거나 외부 도구를 사용하거나 파일을 수정하지 마세요.
                    """.formatted(department.team(), department.instructions())
                : """
                    당신은 DIAMOND RISE 야구 커리어 게임 개발 스튜디오의 %s입니다.
                    %s

                    디렉터가 검토할 한국어 작업 계획 초안을 작성하세요.
                    목표, 제안 단계(최대 5개), 확인이 필요한 가정 또는 질문을 간결하게 구분하세요.
                    입력에 없는 사실은 만들어내지 말고 불확실한 점은 가정으로 표시하세요.
                    이 초안은 제안일 뿐입니다. 작업을 실행했다고 말하지 말고, 외부 도구를 사용하거나 파일을 수정하지 마세요.
                    """.formatted(department.team(), department.instructions());

        OllamaResponse response = ollama.post()
                .uri("/api/chat")
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of(
                        "model", model,
                        "stream", false,
                        "think", false,
                        "keep_alive", "5m",
                        "options", Map.of("temperature", 0.25, "num_ctx", 4096,
                                "num_predict", projectOpinion ? 360 : 600),
                        "messages", List.of(
                                new ChatMessage("system", systemPrompt),
                                new ChatMessage("user", "요청 제목: " + title + "\n요청 내용:\n" + description)
                        )))
                .retrieve()
                .body(OllamaResponse.class);

        if (response == null || response.message() == null || response.message().content() == null
                || response.message().content().isBlank()) {
            throw new IllegalStateException("로컬 AI가 빈 계획을 반환했습니다.");
        }
        return new PlanDraft(response.message().content().trim(), model);
    }

    public List<DepartmentOpinion> generateProjectOpinions(String title, String description) {
        return DEPARTMENTS.stream()
                .filter(department -> Set.of("기획팀", "개발팀", "아트팀").contains(department.team()))
                .map(department -> {
                    PlanDraft draft = generateDraft(department.team(), title, description, true);
                    return new DepartmentOpinion(department.team(), department.specialty(), draft.content(), draft.model());
                })
                .toList();
    }

    private String localStatus() {
        try {
            OllamaTags tags = ollama.get().uri("/api/tags").retrieve().body(OllamaTags.class);
            if (tags == null) return "OFFLINE";
            Set<String> names = tags.models() == null ? Set.of() : tags.models().stream()
                    .map(OllamaModel::name).collect(java.util.stream.Collectors.toSet());
            return names.contains(model) ? "READY" : "MODEL_REQUIRED";
        } catch (Exception exception) {
            return "OFFLINE";
        }
    }

    private record DepartmentProfile(String team, String specialty, String instructions) {}
    private record ChatMessage(String role, String content) {}
    private record OllamaResponse(ChatMessage message) {}
    private record OllamaTags(List<OllamaModel> models) {}
    private record OllamaModel(String name) {}

    public record PlanDraft(String content, String model) {}
    public record DepartmentOpinion(String team, String specialty, String content, String model) {}
    public record AgentStatus(String team, String specialty, String model, String status) {}
}
