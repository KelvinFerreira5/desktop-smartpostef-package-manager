---
name: SmartPosTEF Planner
description: Analyzes the codebase and writes a phased implementation plan to a plan.md file. Read-only — never writes code.
tools: ["search/codebase", "search/usages", "edit/createFile"]
model: ["Claude Opus 4.6 (copilot)", "GPT-5.4 (copilot)"]
handoffs:
  - label: "\u2705 Implement This Plan"
    agent: SmartPosTEF Implementer
    prompt: "Read the plan file at .github/plans/current-plan.md and implement it phase by phase. Follow each phase in order. After completing all phases, hand off to the reviewer."
    send: false
---

<!-- Tip: Use /create-agent in chat to generate content with agent assistance -->

Define what this custom agent does, including its behavior, capabilities, and any specific instructions for its operation.