import { appendFile } from "node:fs/promises";

export function logDebug(event: string, data: Record<string, unknown> = {}): void {
	if (process.env.PI_CUA_DEBUG !== "1" && !process.env.PI_CUA_LOG) return;

	const entry = JSON.stringify({
		timestamp: new Date().toISOString(),
		event,
		...redact(data),
	});

	if (process.env.PI_CUA_DEBUG === "1") process.stderr.write(`[pi-codex-computer-use] ${entry}\n`);
	const logPath = process.env.PI_CUA_LOG;
	if (logPath) void appendFile(logPath, `${entry}\n`, "utf8").catch(() => undefined);
}

function redact(data: Record<string, unknown>): Record<string, unknown> {
	const redacted: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(data)) {
		if (/screenshot|image|base64|token|secret|password|text/i.test(key)) {
			redacted[key] = "[redacted]";
		} else {
			redacted[key] = value;
		}
	}
	return redacted;
}
