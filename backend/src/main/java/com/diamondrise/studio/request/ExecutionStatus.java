package com.diamondrise.studio.request;

/** Execution lifecycle after a director decision; it never executes code by itself. */
public enum ExecutionStatus {
    NOT_STARTED,
    WAITING_FOR_UNITY,
    READY,
    RUNNING,
    COMPLETED,
    FAILED
}
