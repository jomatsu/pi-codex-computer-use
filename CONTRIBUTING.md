# Contributing

Thanks for helping improve pi-codex-computer-use. Contributions from humans and automated agents are both welcome. Agents should also read [AGENTS.md](AGENTS.md); everyone should skim [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) before touching the app-server or tool layers.

## Setup

Requirements for full local testing: macOS, Pi, Codex CLI (`codex` on `PATH`), Codex.app with the Computer Use plugin. Unit tests and typechecking work anywhere.

```bash
npm install
npm run typecheck
npm run test
```

Run the extension in Pi directly from the repo:

```bash
pi -e .        # or: npm run dev
```

For install-path testing, the repo's `.pi/settings.json` already references the package, or use `pi install ./path/to/pi-codex-computer-use`.

## Development principles

- TypeScript, ESM, Node stdlib over dependencies. Runtime deps are intentionally minimal (just `typebox`); don't add MCP SDKs, zod, execa, etc. without discussion.
- Tool schemas use TypeBox, with `StringEnum` from `@earendil-works/pi-ai` for string enums.
- Custom tools throw on errors — never return error-shaped successful results.
- Truncate large text outputs with Pi truncation helpers; always preserve image blocks.
- All Computer Use calls go through the single queue. Never call desktop actions concurrently.
- Safety defaults are non-negotiable: fail closed without UI, no broad auto-approval, no logging of screenshots/typed text/auth tokens.

## Test layers

Work up these layers as your change demands. [docs/TESTING.md](docs/TESTING.md) has the detailed case matrix.

**A. Unit tests** (`npm run test`) — no Codex, no desktop. JSONL routing, timeouts, elicitation handling, content conversion, queue serialization, status formatting. Use fake app-server streams.

**B. App-server probes** — exercise the real Codex app-server with no Pi model involved:

```bash
npm run probe:status
npm run probe:list-apps
npm run probe:get-state -- Finder
```

**C. Pi command smoke tests** — run the extension in Pi and exercise `/computer-use status|install|reload|restart|enable|disable|diagnose`. Print mode works for scripted checks:

```bash
pi --approve -p "/computer-use status"
```

**D. Pi tool smoke tests** — prompt the model to use the tools:

```bash
pi --approve --tools computer_use_list_apps -p "Use computer_use_list_apps and report only the first app name."
```

**E. Real desktop tasks** — safe, reversible apps only: Finder navigation, TextEdit temp files, Calculator arithmetic. Never test against Mail, Messages, browsers with form submission, System Settings, payments, or anything destructive outside temp directories.

## Tmux dev loop

`npm run dev:tmux` creates a `pi-cua-dev` session with panes for tests, an interactive `pi -e .` session, log tailing, and probes. Automate interactions with:

```bash
tmux send-keys -t pi-cua-dev:0.1 "/computer-use status" C-m
tmux capture-pane -t pi-cua-dev:0.1 -p
```

## Dev environment variables

```bash
PI_CUA_DEBUG=1                                   # debug logs to stderr
PI_CUA_LOG=/tmp/pi-codex-computer-use.log        # structured log file
PI_CUA_DEV_AUTO_ACCEPT_APPS=Finder,TextEdit,Calculator   # auto-accept app prompts (safe apps only)
PI_CUA_IDLE_TIMEOUT_MS=60000                     # shorter idle shutdown for testing
```

`PI_CUA_DEV_AUTO_ACCEPT_APPS` is strictly a dev convenience for safe apps. Note that accepted grants can persist in Codex's own permission store across runs. Never extend auto-accept to risky apps or broad patterns, and never auto-confirm risky UI actions.

One-time manual setup that cannot be automated: Codex login, and macOS Accessibility + Screen Recording permission grants (TCC prompts).

## Pull requests

- `npm run typecheck && npm run test` must pass (CI enforces this).
- Add or update unit tests for behavior changes; fixture data from probe output is great for content-conversion tests.
- For changes touching the app-server protocol, tool schemas, or permission flow, describe which test layers (B–E) you ran locally — CI can only run layer A.
- Keep PRs focused; update README/docs when behavior or configuration changes.
