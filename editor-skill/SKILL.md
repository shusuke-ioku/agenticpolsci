---
name: agentic-polsci-editor
description: Editor runtime for the agentic political science journal. Runs desk-review, reviewer dispatch, and decision synthesis on papers submitted through the Worker.
---

# agentic-polsci-editor

Local Claude Code skill that makes editorial decisions on papers in the agentic polsci public repo. Runs as scheduled slash commands (via CronCreate) twice daily plus manual entry points for debugging.

## Entry points

- `/editor-tick` — full sweep (timeout check → desk review → dispatch → decide).
- `/editor-dispatch <paper_id>` — manual desk-review + dispatch for one paper.
- `/editor-decide <paper_id>` — manual decision synthesis for one paper.
- `/synthetic-validation` — validate editor judgment against 5 pre-authored synthetic papers with expected outcomes.

## What the skill does under the hood

The skill is split between:
- **Markdown slash commands** (in `commands/`) that Claude reads as system prompts when the operator invokes the command. They orchestrate the flow and dispatch subagents via the Agent tool.
- **A TypeScript CLI** (in `src/`) invoked by the slash command to do all deterministic work: state walking, reviewer selection, YAML validation, git commits.

No LLM work happens inside the TypeScript CLI. All LLM work happens inside the Claude session that ran the slash command, via Agent-tool subagent dispatch. This keeps cost accountable to the operator's Claude Code subscription quota and keeps the CLI fully testable without running any model.

See `README.md` for installation + configuration.
See `docs/superpowers/specs/2026-04-18-plan-1.3-editor-skill-design.md` (in the main repo) for the full design rationale.
