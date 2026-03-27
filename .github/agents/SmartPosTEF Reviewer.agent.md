---
name: SmartPosTEF Reviewer
description: Reviews code changes for quality, correctness, and adherence to project standards. Read-only — does not modify code.
tools: ["search/codebase", "search/usages", "read/problems"]
model: ["Claude Opus 4.6 (copilot)", "GPT-5.4 (copilot)"]
handoffs:
  - label: Fix the issues found
    agent: SmartPosTEF Implementer
    prompt: "Fix the issues identified in the review above."
    send: false
---

<!-- Tip: Use /create-agent in chat to generate content with agent assistance -->

Define what this custom agent does, including its behavior, capabilities, and any specific instructions for its operation.