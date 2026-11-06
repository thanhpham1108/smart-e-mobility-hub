# Submission 3 — Design

The [course brief](../BTL_SoftwareEngineering_HK26_v1.pdf) requires a deployment view, a development/implementation view, a class diagram with descriptions of **every method shown**, and optional test cases. The team will continue the six module assignments from Submissions 1 and 2.

This directory contains the shared starting point for the team. The [task assignment](task_assignment.md) names each module owner, expected contribution, and review handoff. The [architecture baseline](architectural-design/architecture_baseline.md) records the common design decisions; the two PlantUML views under `deployment-view/` and `development-view/` are drafts for all six members to review before the report is assembled.

Each member should place their module class diagram in `class-diagram/`, its complete method catalogue in `method-design/`, and its bonus test cases in `test-cases/`. Keep editable `.puml` sources alongside exported diagram images. Names and states must match the approved use-case catalogue and Submission 2 diagrams.

The reference architecture uses browser clients, one application process, JSON fixtures/in-memory state, and a telemetry simulator. These are logical deployment choices for the design document; no specific programming framework or production database is required by the brief.
