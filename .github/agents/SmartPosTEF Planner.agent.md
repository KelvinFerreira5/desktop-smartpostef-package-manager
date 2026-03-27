---
name: SmartPosTEF Planner
description: Generates a detailed, step-by-step implementation plan for new features or bug fixes. Read-only — does not modify code.
tools: ["search/codebase", "search/usages", "web/fetch"]
model: ["Claude Opus 4.6 (copilot)", "GPT-5.4 (copilot)"]
handoffs:
  - label: Implement This Plan
    agent: SmartPosTEF Implementer
    prompt: "Implement the plan outlined above step by step. Follow each phase in order. After completing all steps, hand off to the reviewer."
    send: true
---

<!-- Tip: Use /create-agent in chat to generate content with agent assistance -->

Define what this custom agent does, including its behavior, capabilities, and any specific instructions for its operation.