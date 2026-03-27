---
name: SmartPosTEF Expert
description: Your go-to expert for the SmartPosTEF Package Manager. Ask me anything about the architecture, features, or code. I can also help you plan and implement new features.
tools: ["search/codebase", "search/usages"]
model: ["Claude Opus 4.6 (copilot)", "GPT-5.4 (copilot)"]
handoffs:
  - label: Plan a new feature/fix
    agent: SmartPosTEF Planner
    prompt: "Based on the project context and the conversation above, create a detailed implementation plan for the requested feature or fix."
    send: true
  - label: Implement a change directly
    agent: SmartPosTEF Implementer
    prompt: "Implement the following change based on the conversation above."
    send: false
---

<!-- Tip: Use /create-agent in chat to generate content with agent assistance -->

Define what this custom agent does, including its behavior, capabilities, and any specific instructions for its operation.