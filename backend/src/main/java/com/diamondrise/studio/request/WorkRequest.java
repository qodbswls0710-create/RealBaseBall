package com.diamondrise.studio.request;

import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Column;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "work_requests")
public class WorkRequest {
    @Id
    @GeneratedValue
    private UUID id;

    @Column(nullable = false, length = 120)
    private String title;

    @Column(nullable = false, length = 4000)
    private String description;

    @Column(nullable = false, length = 40)
    private String team;

    @Column(length = 12000)
    private String plan;

    @Column(length = 100)
    private String planModel;

    @Column(length = 100)
    private String opinionModel;

    private Instant planGeneratedAt;

    @jakarta.persistence.Lob
    private String planningOpinion;

    @jakarta.persistence.Lob
    private String developmentOpinion;

    @jakarta.persistence.Lob
    private String artOpinion;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private RequestStatus status;

    @Enumerated(EnumType.STRING)
    @Column(name = "execution_status", length = 30)
    private ExecutionStatus executionStatus;

    @Column(nullable = false)
    private Instant createdAt;

    private Instant decidedAt;

    protected WorkRequest() {}

    public WorkRequest(String title, String description, String team) {
        this.title = title;
        this.description = description;
        this.team = team;
        this.status = RequestStatus.PENDING_APPROVAL;
        this.createdAt = Instant.now();
    }

    public void decide(RequestStatus decision) {
        this.status = decision;
        this.decidedAt = Instant.now();
        this.executionStatus = decision == RequestStatus.APPROVED
                ? ExecutionStatus.WAITING_FOR_UNITY
                : ExecutionStatus.NOT_STARTED;
    }

    public void savePlan(String plan, String planModel) {
        this.plan = plan == null ? null : plan.trim();
        this.planModel = planModel;
        this.planGeneratedAt = Instant.now();
    }

    public void saveOpinions(String planning, String development, String art, String model) {
        this.planningOpinion = planning;
        this.developmentOpinion = development;
        this.artOpinion = art;
        this.opinionModel = model;
        this.plan = null;
        this.planModel = null;
        this.planGeneratedAt = null;
    }

    public boolean hasCompleteDepartmentOpinions() {
        return hasText(planningOpinion) && hasText(developmentOpinion) && hasText(artOpinion);
    }

    public boolean hasGeneratedPlan() {
        return hasText(plan) && planGeneratedAt != null;
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    public UUID getId() { return id; }
    public String getTitle() { return title; }
    public String getDescription() { return description; }
    public String getTeam() { return team; }
    public String getPlan() { return plan; }
    public String getPlanModel() { return planModel; }
    public String getOpinionModel() { return opinionModel; }
    public Instant getPlanGeneratedAt() { return planGeneratedAt; }
    public String getPlanningOpinion() { return planningOpinion; }
    public String getDevelopmentOpinion() { return developmentOpinion; }
    public String getArtOpinion() { return artOpinion; }
    public RequestStatus getStatus() { return status; }
    public ExecutionStatus getExecutionStatus() {
        if (executionStatus != null) return executionStatus;
        // Keep existing H2 rows readable after adding the execution status column.
        return status == RequestStatus.APPROVED
                ? ExecutionStatus.WAITING_FOR_UNITY
                : ExecutionStatus.NOT_STARTED;
    }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getDecidedAt() { return decidedAt; }
}
