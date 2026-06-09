import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { COMPUTER_USE_TOOL_NAMES, registerComputerUseTools } from "./computer-use-tools.ts";
import { clearComputerUseStatus, setComputerUseStatus } from "./footer-status.ts";
import { ComputerUseRuntime } from "./runtime.ts";
import {
	checkComputerUseStatus,
	formatComputerUseStatus,
	installComputerUse,
	reloadComputerUseMcpServers,
} from "./status.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SKILLS_DIR = resolve(__dirname, "../skills");

export default function piCodexComputerUse(pi: ExtensionAPI): void {
	const runtime = new ComputerUseRuntime();
	let toolsEnabled = true;

	registerComputerUseTools(pi, runtime);

	pi.on("resources_discover", () => ({
		skillPaths: [SKILLS_DIR],
	}));

	pi.on("session_start", (_event, ctx) => {
		runtime.setContext(ctx);
		runtime.resetSession();
		setComputerUseToolsEnabled(pi, toolsEnabled);
		setComputerUseStatus(ctx, toolsEnabled ? "idle" : "disabled");
	});

	pi.on("agent_end", async (_event, ctx) => {
		runtime.setContext(ctx);
		await runtime.shutdown();
		setComputerUseStatus(ctx, toolsEnabled ? "idle" : "disabled");
	});

	pi.on("session_shutdown", async (_event, ctx) => {
		clearComputerUseStatus(ctx);
		await runtime.shutdown();
	});

	pi.registerCommand("computer-use", {
		description: "Manage Codex Computer Use integration: status, enable, disable, install, reload, restart, diagnose",
		getArgumentCompletions(prefix) {
			return ["status", "enable", "disable", "install", "reload", "restart", "diagnose"]
				.filter((value) => value.startsWith(prefix))
				.map((value) => ({ value, label: value }));
		},
		handler: async (args, ctx) => {
			runtime.setContext(ctx);
			const [subcommand = "status"] = args.trim().split(/\s+/).filter(Boolean);

			if (subcommand === "status") {
				await runStatusCommand(pi, ctx, "checking", () => checkComputerUseStatus(ctx.cwd), toolsEnabled);
				return;
			}

			if (subcommand === "enable") {
				toolsEnabled = true;
				setComputerUseToolsEnabled(pi, true);
				if (ctx.hasUI) {
					setComputerUseStatus(ctx, "idle");
					ctx.ui.notify("Computer Use tools enabled", "info");
				} else {
					console.log("Computer Use tools enabled.");
				}
				pi.sendMessage({ customType: "computer-use", content: "Computer Use tools enabled.", display: true });
				return;
			}

			if (subcommand === "disable") {
				toolsEnabled = false;
				setComputerUseToolsEnabled(pi, false);
				await runtime.shutdown();
				if (ctx.hasUI) {
					setComputerUseStatus(ctx, "disabled");
					ctx.ui.notify("Computer Use tools disabled", "info");
				} else {
					console.log("Computer Use tools disabled.");
				}
				pi.sendMessage({ customType: "computer-use", content: "Computer Use tools disabled and runtime shut down.", display: true });
				return;
			}

			if (subcommand === "install") {
				await runStatusCommand(pi, ctx, "installing", installComputerUse, toolsEnabled);
				return;
			}

			if (subcommand === "reload") {
				await runStatusCommand(pi, ctx, "reloading MCP", reloadComputerUseMcpServers, toolsEnabled);
				return;
			}

			if (subcommand === "restart") {
				await runtime.shutdown();
				if (ctx.hasUI) {
					setComputerUseStatus(ctx, toolsEnabled ? "idle" : "disabled");
					ctx.ui.notify("Computer Use runtime restarted; it will lazy-start on next use", "info");
				} else {
					console.log("Computer Use runtime restarted; it will lazy-start on next use.");
				}
				pi.sendMessage({ customType: "computer-use", content: "Computer Use runtime restarted; it will lazy-start on next use.", display: true });
				return;
			}

			if (subcommand === "diagnose") {
				await runStatusCommand(pi, ctx, "diagnosing", async () => {
					const status = await checkComputerUseStatus(ctx.cwd);
					return {
						...status,
						message: `${status.message}\n\nDiagnostics:\n- PI_CUA_DEBUG=${process.env.PI_CUA_DEBUG ?? "unset"}\n- PI_CUA_DEV_AUTO_ACCEPT_APPS=${process.env.PI_CUA_DEV_AUTO_ACCEPT_APPS ?? "unset"}\n- If app access prompts appear, approve them in the Pi UI.\n- If macOS permission prompts appear, grant Accessibility and Screen Recording to Codex Computer Use.`,
					};
				}, toolsEnabled);
				return;
			}

			const message = `Unknown Computer Use command '${subcommand}'. Try /computer-use status, enable, disable, install, reload, restart, or diagnose.`;
			if (ctx.hasUI) ctx.ui.notify(message, "warning");
			else console.log(message);
			pi.sendMessage({ customType: "computer-use", content: message, display: true });
		},
	});
}

async function runStatusCommand(
	pi: ExtensionAPI,
	ctx: Pick<ExtensionContext, "cwd" | "hasUI" | "ui">,
	verb: string,
	fn: () => Promise<Awaited<ReturnType<typeof checkComputerUseStatus>>>,
	toolsEnabled: boolean,
): Promise<void> {
	if (ctx.hasUI) setComputerUseStatus(ctx, "checking", verb === "checking" ? undefined : `${verb}…`);
	const status = await fn();
	const content = `${formatComputerUseStatus(status)}${toolsEnabled ? "" : "\n\nComputer Use Pi tools are currently disabled. Run /computer-use enable to allow tool calls."}`;

	if (ctx.hasUI) {
		setComputerUseStatus(ctx, toolsEnabled ? statusReasonToFooterState(status.reason) : "disabled");
		ctx.ui.notify(status.reason === "ready" ? "Computer Use ready" : `Computer Use: ${status.reason}`, status.reason === "ready" ? "info" : "warning");
	} else {
		console.log(content);
	}

	pi.sendMessage({
		customType: "computer-use",
		content,
		display: true,
		details: { ...status, toolsEnabled },
	});
}

function statusReasonToFooterState(reason: string): "ready" | "error" {
	return reason === "ready" ? "ready" : "error";
}

function setComputerUseToolsEnabled(pi: ExtensionAPI, enabled: boolean): void {
	const active = new Set(pi.getActiveTools());
	for (const name of COMPUTER_USE_TOOL_NAMES) {
		if (enabled) active.add(name);
		else active.delete(name);
	}
	pi.setActiveTools([...active]);
}
