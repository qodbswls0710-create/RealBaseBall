package com.diamondrise.studio.ai;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/agents")
public class DepartmentAgentController {
    private final DepartmentAgentService agents;

    public DepartmentAgentController(DepartmentAgentService agents) {
        this.agents = agents;
    }

    @GetMapping
    public List<DepartmentAgentService.AgentStatus> list() {
        return agents.listAgents();
    }
}
