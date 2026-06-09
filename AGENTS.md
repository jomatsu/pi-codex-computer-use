# AGENTS.md

Guidance for AI agents working on this repo. Humans: see [CONTRIBUTING.md](CONTRIBUTING.md).

## What this is

A Pi extension exposing OpenAI Codex Computer Use as Pi-native tools:

```text
Pi extension -> Codex app-server -> computer-use MCP server -> Codex Computer Use macOS app/service -> local desktop
```

The extension is a thin client. Codex app-server owns plugin lifecycle, MCP startup, permissions, and elicitations — do not build generic MCP support or a direct `SkyComputerUseClient mcp` backend unless explicitly requested. Read [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) before changing the app-server client, thread manager, or tool layers.

## Coding conventions

- TypeScript, ESM. Node stdlib over new dependencies; runtime deps stay minimal.
- Pi extension APIs from `@earendil-works/pi-coding-agent`; tool schemas via `typebox`; `StringEnum` from `@earendil-works/pi-ai` for string enums.
- Custom tools must throw on errors — never return error-shaped successful results.
- Truncate large text outputs with Pi truncation helpers; preserve image blocks from Computer Use results.
- Serialize all Computer Use calls through the existing queue; Pi may run tools in parallel, the desktop must not.
- Keep app-server method names centralized in `src/protocol.ts`.
- Do not expose raw app-server internals directly to the model.

## Safety rules (non-negotiable)

Computer Use controls the live desktop. Defaults must stay conservative:

- Fail closed in no-UI modes for permission/elicitation requests.
- Bridge app-server elicitations to `ctx.ui.confirm()`; never add broad auto-approval.
- Dev auto-accept (`PI_CUA_DEV_AUTO_ACCEPT_APPS`) is only for explicit safe-app allowlists.
- Never auto-confirm risky UI actions: sending messages, submitting forms, deleting data, financial transactions, account/security changes, transmitting sensitive data, installing software.
- Never log screenshots, base64 payloads, typed text, auth tokens, or full accessibility trees from sensitive apps.

## Key protocol facts

- App-server: `codex app-server --listen stdio://`, newline-delimited JSON (`{id, method, params}`), no Content-Length framing.
- Plugin and MCP server are both named `computer-use`.
- `mcpServer/tool/call` requires a valid thread ID from `thread/start` (`ephemeral: true`); stale threads get one reset-and-retry.
- MCP tools: `list_apps`, `get_app_state`, `click`, `perform_secondary_action`, `set_value`, `select_text`, `scroll`, `drag`, `press_key`, `type_text`.

## Testing

Layered, in order — see [CONTRIBUTING.md](CONTRIBUTING.md) for commands and [docs/TESTING.md](docs/TESTING.md) for the case matrix:

1. Unit tests (`npm run test`) and `npm run typecheck` — always run these; they need no Codex or desktop.
2. Probe scripts against real Codex app-server (`npm run probe:status` etc.).
3. Pi command smoke tests (print mode or tmux).
4. Pi model/tool smoke tests.
5. Real desktop tasks against safe apps only: Finder, TextEdit temp files, Calculator. Never Mail, Messages, browsers with submissions, System Settings, payments, or deletions outside temp directories.

Do not assume macOS permissions (Accessibility, Screen Recording) are granted — handle and report their absence.
