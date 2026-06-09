import { describe, expect, it } from "vitest";
import { convertCodexContentToPiContent } from "../src/content.ts";

describe("convertCodexContentToPiContent", () => {
	it("converts text and image blocks", () => {
		const result = convertCodexContentToPiContent([
			{ type: "text", text: "hello" },
			{ type: "image", data: "abc123" },
		]);

		expect(result).toEqual([
			{ type: "text", text: "hello" },
			{ type: "image", data: "abc123", mimeType: "image/jpeg" },
		]);
	});

	it("truncates long text", () => {
		const result = convertCodexContentToPiContent([{ type: "text", text: "a\nb\nc" }], { maxLines: 2, maxBytes: 1000 });
		expect(result[0]).toMatchObject({ type: "text" });
		if (result[0]?.type === "text") {
			expect(result[0].text).toContain("Output truncated");
		}
	});

	it("stringifies unknown content", () => {
		const result = convertCodexContentToPiContent({ ok: true });
		expect(result).toHaveLength(1);
		expect(result[0]?.type).toBe("text");
	});
});
