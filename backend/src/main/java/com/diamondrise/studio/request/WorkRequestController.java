package com.diamondrise.studio.request;

import com.diamondrise.studio.ai.DepartmentAgentService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClientException;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/requests")
public class WorkRequestController {
    private final WorkRequestRepository repository;
    private final DepartmentAgentService agents;

    public WorkRequestController(WorkRequestRepository repository, DepartmentAgentService agents) {
        this.repository = repository;
        this.agents = agents;
    }

    @GetMapping
    public List<RequestView> list() {
        return repository.findAllByOrderByCreatedAtDesc().stream().map(RequestView::from).toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public RequestView create(@Valid @RequestBody CreateRequest request) {
        WorkRequest saved = repository.save(new WorkRequest(
                request.title().trim(), request.description().trim(), request.team().trim()));
        return RequestView.from(saved);
    }

    @PostMapping("/{id}/plan")
    public RequestView generatePlan(@PathVariable UUID id) {
        WorkRequest workRequest = repository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "요청을 찾을 수 없습니다."));
        if (workRequest.getStatus() != RequestStatus.PENDING_APPROVAL) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "승인 대기 중인 요청만 계획을 만들 수 있습니다.");
        }
        if (!workRequest.hasCompleteDepartmentOpinions()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "기획·개발·아트팀 의견이 모두 모인 뒤 종합 계획을 만들 수 있습니다.");
        }
        try {
            DepartmentAgentService.PlanDraft draft = agents.synthesizeProjectPlan(
                    workRequest.getTitle(), workRequest.getDescription(),
                    workRequest.getPlanningOpinion(), workRequest.getDevelopmentOpinion(),
                    workRequest.getArtOpinion());
            workRequest.savePlan(draft.content(), draft.model());
            return RequestView.from(repository.save(workRequest));
        } catch (ResourceAccessException exception) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "로컬 AI에 연결할 수 없습니다. Ollama가 실행 중인지 확인해 주세요.", exception);
        } catch (RestClientException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                    "로컬 AI가 계획 초안을 만들지 못했습니다.", exception);
        } catch (IllegalStateException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                    "로컬 AI가 유효한 계획 초안을 반환하지 않았습니다.", exception);
        }
    }

    @PostMapping("/{id}/opinions")
    public RequestView generateOpinions(@PathVariable UUID id) {
        WorkRequest workRequest = repository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "프로젝트를 찾을 수 없습니다."));
        if (workRequest.getStatus() != RequestStatus.PENDING_APPROVAL) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "승인 대기 중인 프로젝트만 의견을 받을 수 있습니다.");
        }
        try {
            List<DepartmentAgentService.DepartmentOpinion> opinions = agents.generateProjectOpinions(
                    workRequest.getTitle(), workRequest.getDescription());
            workRequest.saveOpinions(opinions.get(0).content(), opinions.get(1).content(),
                    opinions.get(2).content(), opinions.get(0).model());
            return RequestView.from(repository.save(workRequest));
        } catch (ResourceAccessException exception) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "로컬 AI에 연결할 수 없습니다. Ollama가 실행 중인지 확인해 주세요.", exception);
        } catch (RestClientException | IllegalStateException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                    "부서 의견을 모두 생성하지 못했습니다. 다시 시도해 주세요.", exception);
        }
    }

    @PatchMapping("/{id}/decision")
    public RequestView decide(@PathVariable UUID id, @Valid @RequestBody DecisionRequest request) {
        WorkRequest workRequest = repository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "요청을 찾을 수 없습니다."));
        if (workRequest.getStatus() != RequestStatus.PENDING_APPROVAL) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "이미 처리된 요청입니다.");
        }
        if (request.approved() && !workRequest.hasCompleteDepartmentOpinions()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "승인 전에 세 부서 의견을 모두 받아야 합니다.");
        }
        if (request.approved() && !workRequest.hasGeneratedPlan()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "승인 전에 세 부서 의견을 종합한 실행 계획을 먼저 만들어 주세요.");
        }
        RequestStatus status = request.approved() ? RequestStatus.APPROVED : RequestStatus.REJECTED;
        workRequest.decide(status);
        return RequestView.from(repository.save(workRequest));
    }

    public record CreateRequest(
            @NotBlank @Size(max = 120) String title,
            @NotBlank @Size(max = 4000) String description,
            @NotBlank @Size(max = 40) String team) {}

    public record DecisionRequest(boolean approved) {}

    public record DepartmentOpinionView(String team, String content, String model) {}

    public record RequestView(UUID id, String title, String description, String team, String plan,
                              String planModel, Instant planGeneratedAt,
                              List<DepartmentOpinionView> opinions, RequestStatus status,
                              Instant createdAt, Instant decidedAt) {
        static RequestView from(WorkRequest request) {
            return new RequestView(request.getId(), request.getTitle(), request.getDescription(),
                    request.getTeam(), request.hasGeneratedPlan() ? request.getPlan() : null,
                    request.hasGeneratedPlan() ? request.getPlanModel() : null,
                    request.getPlanGeneratedAt(),
                    opinionsFrom(request), request.getStatus(),
                    request.getCreatedAt(), request.getDecidedAt());
        }

        private static List<DepartmentOpinionView> opinionsFrom(WorkRequest request) {
            return List.of(
                    new DepartmentOpinionView("기획팀", request.getPlanningOpinion(), request.getOpinionModel()),
                    new DepartmentOpinionView("개발팀", request.getDevelopmentOpinion(), request.getOpinionModel()),
                    new DepartmentOpinionView("아트팀", request.getArtOpinion(), request.getOpinionModel()))
                    .stream().filter(opinion -> opinion.content() != null && !opinion.content().isBlank()).toList();
        }
    }
}
