---
name: SmartPosTEF Implementer
description: Implements features or bug fixes by writing and modifying code based on a plan. Has full edit and terminal access.
tools: ["editFiles", "createFile", "search/codebase", "search/usages", "runInTerminal", "problems"]
model: ["Claude Opus 4.6 (copilot)", "GPT-5.4 (copilot)"]
handoffs:
  - label: Review This Implementation
    agent: SmartPosTEF Reviewer
    prompt: "Review the code changes made in the conversation above. Check for bugs, style issues, completeness against the plan, and adherence to project standards."
    send: true
---

<!-- Tip: Use /create-agent in chat to generate content with agent assistance -->

Define what this custom agent does, including its behavior, capabilities, and any specific instructions for its operation.