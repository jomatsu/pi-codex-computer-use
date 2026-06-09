import type { ImageContent, TextContent } from "@earendil-works/pi-ai";
import { DEFAULT_MAX_BYTES, DEFAULT_MAX_LINES, formatSize, truncateHead } from "@earendil-works/pi-coding-agent";

export type PiContentBlock = TextContent | ImageContent;

export interface CodexContentBlock {
	type?: string;
	text?: string;
	data?: string;
	mimeType?: string;
	mime_type?: string;
	[key: string]: unknown;
}

export interface ContentConversionOptions {
	maxBytes?: number;
	maxLines?: number;
}

export function convertCodexContentToPiContent(
	content: unknown,
	options: ContentConversionOptions = {},
): PiContentBlock[] {
	if (!Array.isArray(content)) {
		return [{ type: "text", text: stringifyUnknownContent(content) }];
	}

	const blocks: PiContentBlock[] = [];
	for (const raw of content) {
		if (!raw || typeof raw !== "object") {
			blocks.push({ type: "text", text: String(raw) });
			continue;
		}

		const block = raw as CodexContentBlock;
		if (block.type === "text") {
			blocks.push({ type: "text", text: truncateText(block.text ?? "", options) });
			continue;
		}

		if (block.type === "image" && typeof block.data === "string") {
			blocks.push({
				type: "image",
				data: block.data,
				mimeType: block.mimeType ?? block.mime_type ?? "image/jpeg",
			});
			continue;
		}

		blocks.push({ type: "text", text: truncateText(JSON.stringify(block, null, 2), options) });
	}

	return blocks.length > 0 ? blocks : [{ type: "text", text: "(no content)" }];
}

function truncateText(text: string, options: ContentConversionOptions): string {
	const truncation = truncateHead(text, {
		maxBytes: options.maxBytes ?? DEFAULT_MAX_BYTES,
		maxLines: options.maxLines ?? DEFAULT_MAX_LINES,
	});

	if (!truncation.truncated) return truncation.content;

	return `${truncation.content}\n\n[Output truncated: showing ${truncation.outputLines} of ${truncation.totalLines} lines (${formatSize(truncation.outputBytes)} of ${formatSize(truncation.totalBytes)}).]`;
}

function stringifyUnknownContent(content: unknown): string {
	if (content === undefined) return "(no content)";
	if (typeof content === "string") return truncateText(content, {});
	return truncateText(JSON.stringify(content, null, 2), {});
}
