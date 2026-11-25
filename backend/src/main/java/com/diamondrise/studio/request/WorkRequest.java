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

    @jakarta.persistence.Lob
    private String planningOpinion;

    @jakarta.persistence.Lob
    private String developmentOpinion;

    @jakarta.persistence.Lob
    private String artOpinion;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private RequestStatus status;

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
    }

    public void savePlan(String plan, String planModel) {
        this.plan = plan;
        this.planModel = planModel;
    }

    public void saveOpinions(String planning, String development, String art, String model) {
        this.planningOpinion = planning;
        this.developmentOpinion = development;
        this.artOpinion = art;
        this.plan = String.join("\n\n", planning, development, art);
        this.planModel = model;
    }

    public UUID getId() { return id; }
    public String getTitle() { return title; }
    public String getDescription() { return description; }
    public String getTeam() { return team; }
    public String getPlan() { return plan; }
    public String getPlanModel() { return planModel; }
    public String getPlanningOpinion() { return planningOpinion; }
    public String getDevelopmentOpinion() { return developmentOpinion; }
    public String getArtOpinion() { return artOpinion; }
    public RequestStatus getStatus() { return status; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getDecidedAt() { return decidedAt; }
}
