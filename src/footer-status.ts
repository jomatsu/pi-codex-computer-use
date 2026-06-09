import type { ExtensionContext } from "@earendil-works/pi-coding-agent";

type ComputerUseFooterState = "idle" | "working" | "permission" | "ready" | "checking" | "disabled" | "error";

export function setComputerUseStatus(
	ctx: Pick<ExtensionContext, "hasUI" | "ui"> | undefined,
	state: ComputerUseFooterState,
	detail?: string,
): void {
	if (!ctx?.hasUI) return;

	const theme = ctx.ui.theme;
	const label = theme.fg("muted", "Computer Use:");
	const value = (() => {
		if (detail) return theme.fg("accent", detail);
		switch (state) {
			case "idle":
				return theme.fg("dim", "idle");
			case "working":
				return theme.fg("accent", "working…");
			case "permission":
				return theme.fg("warning", "permission…");
			case "ready":
				return theme.fg("success", "ready");
			case "checking":
				return theme.fg("accent", "checking…");
			case "disabled":
				return theme.fg("warning", "disabled");
			case "error":
				return theme.fg("error", "error");
		}
	})();

	ctx.ui.setStatus("computer-use", `${label} ${value}`);
}

export function clearComputerUseStatus(ctx: Pick<ExtensionContext, "hasUI" | "ui"> | undefined): void {
	if (ctx?.hasUI) ctx.ui.setStatus("computer-use", undefined);
}
