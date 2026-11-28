package com.diamondrise.studio.request;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface WorkRequestRepository extends JpaRepository<WorkRequest, UUID> {
    List<WorkRequest> findAllByOrderByCreatedAtDesc();
}
