import { StringEnum } from "@earendil-works/pi-ai";
import { defineTool, type ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import type { ComputerUseToolResult } from "./computer-use-backend.ts";
import type { ComputerUseRuntime } from "./runtime.ts";

export const COMPUTER_USE_TOOL_NAMES = [
	"computer_use_list_apps",
	"computer_use_get_app_state",
	"computer_use_click",
	"computer_use_type_text",
	"computer_use_press_key",
	"computer_use_scroll",
	"computer_use_drag",
	"computer_use_set_value",
	"computer_use_select_text",
	"computer_use_perform_secondary_action",
] as const;

const AppParam = Type.String({ description: "App name, full app path, or unambiguous bundle identifier" });
const ElementIndexParam = Type.String({ description: "Accessibility element index from computer_use_get_app_state" });

export function registerComputerUseTools(pi: ExtensionAPI, runtime: ComputerUseRuntime): void {
	pi.registerTool(
		defineTool({
			name: "computer_use_list_apps",
			label: "Computer Use: List Apps",
			description: "List local Mac apps available to Codex Computer Use, including running and recently used apps.",
			promptSnippet: "List local Mac apps available for desktop Computer Use automation",
			promptGuidelines: [
				"Use computer_use_list_apps when you need to identify the exact app name or bundle identifier before desktop automation.",
			],
			parameters: Type.Object({}),
			async execute(_id, _params, _signal, _onUpdate, ctx) {
				const result = await runtime.callTool(ctx, "list_apps", {});
				return { content: result.content, details: summarizeResult(result) };
			},
		}),
	);

	pi.registerTool(
		defineTool({
			name: "computer_use_get_app_state",
			label: "Computer Use: Get App State",
			description: "Get an app's current accessibility tree and screenshot. Call before interacting with an app and after UI actions to verify state.",
			promptSnippet: "Inspect a Mac app's accessibility tree and screenshot before desktop UI actions",
			promptGuidelines: [
				"Use computer_use_get_app_state before using other computer_use_* tools on an app in each assistant turn.",
				"Use computer_use_get_app_state after desktop UI actions to verify the result before continuing.",
			],
			parameters: Type.Object({
				app: AppParam,
			}),
			async execute(_id, params, _signal, _onUpdate, ctx) {
				const result = await runtime.callTool(ctx, "get_app_state", params);
				return { content: result.content, details: summarizeResult(result) };
			},
		}),
	);

	pi.registerTool(
		defineTool({
			name: "computer_use_click",
			label: "Computer Use: Click",
			description: "Click an app UI element by accessibility element index or screenshot pixel coordinates. Prefer element_index over coordinates.",
			promptSnippet: "Click an element or coordinate in a Mac app through Computer Use",
			promptGuidelines: ["Use computer_use_click only after inspecting the app with computer_use_get_app_state."],
			parameters: Type.Object({
				app: AppParam,
				element_index: Type.Optional(ElementIndexParam),
				x: Type.Optional(Type.Number({ description: "X coordinate in screenshot pixels" })),
				y: Type.Optional(Type.Number({ description: "Y coordinate in screenshot pixels" })),
				click_count: Type.Optional(Type.Integer({ description: "Number of clicks. Defaults to 1" })),
				mouse_button: Type.Optional(StringEnum(["left", "right", "middle"] as const)),
			}),
			async execute(_id, params, _signal, _onUpdate, ctx) {
				const result = await runtime.callTool(ctx, "click", params);
				return { content: result.content, details: summarizeResult(result) };
			},
		}),
	);

	pi.registerTool(
		defineTool({
			name: "computer_use_type_text",
			label: "Computer Use: Type Text",
			description: "Type literal text into the currently focused control of an app. Ensure the correct field is focused first.",
			promptSnippet: "Type literal text into a focused Mac app UI control",
			promptGuidelines: ["Use computer_use_type_text only after focusing the target field with computer_use_click or verifying focus in computer_use_get_app_state."],
			parameters: Type.Object({
				app: AppParam,
				text: Type.String({ description: "Literal text to type" }),
			}),
			async execute(_id, params, _signal, _onUpdate, ctx) {
				const result = await runtime.callTool(ctx, "type_text", params);
				return { content: result.content, details: summarizeResult(result) };
			},
		}),
	);

	pi.registerTool(
		defineTool({
			name: "computer_use_press_key",
			label: "Computer Use: Press Key",
			description: "Press a keyboard key or key combination in an app, using xdotool-style key syntax such as Return, Tab, super+c, or Up.",
			promptSnippet: "Press a key or key combination in a Mac app",
			promptGuidelines: ["Use computer_use_press_key for keyboard shortcuts and navigation after inspecting the target app state."],
			parameters: Type.Object({
				app: AppParam,
				key: Type.String({ description: "Key or key combination to press, e.g. Return, Tab, super+c, Up" }),
			}),
			async execute(_id, params, _signal, _onUpdate, ctx) {
				const result = await runtime.callTool(ctx, "press_key", params);
				return { content: result.content, details: summarizeResult(result) };
			},
		}),
	);

	pi.registerTool(
		defineTool({
			name: "computer_use_scroll",
			label: "Computer Use: Scroll",
			description: "Scroll a scrollable app element in a direction by a number of pages.",
			promptSnippet: "Scroll a Mac app element through Computer Use",
			promptGuidelines: ["Use computer_use_scroll with an element_index from computer_use_get_app_state for a scrollable region."],
			parameters: Type.Object({
				app: AppParam,
				element_index: ElementIndexParam,
				direction: StringEnum(["up", "down", "left", "right"] as const),
				pages: Type.Optional(Type.Number({ description: "Number of pages to scroll. Fractional values are supported. Defaults to 1" })),
			}),
			async execute(_id, params, _signal, _onUpdate, ctx) {
				const result = await runtime.callTool(ctx, "scroll", params);
				return { content: result.content, details: summarizeResult(result) };
			},
		}),
	);

	pi.registerTool(
		defineTool({
			name: "computer_use_drag",
			label: "Computer Use: Drag",
			description: "Drag from one screenshot pixel coordinate to another in an app.",
			promptSnippet: "Drag between screenshot coordinates in a Mac app",
			promptGuidelines: ["Use computer_use_drag only when element-based actions are insufficient and coordinates are known from computer_use_get_app_state."],
			parameters: Type.Object({
				app: AppParam,
				from_x: Type.Number({ description: "Start X coordinate" }),
				from_y: Type.Number({ description: "Start Y coordinate" }),
				to_x: Type.Number({ description: "End X coordinate" }),
				to_y: Type.Number({ description: "End Y coordinate" }),
			}),
			async execute(_id, params, _signal, _onUpdate, ctx) {
				const result = await runtime.callTool(ctx, "drag", params);
				return { content: result.content, details: summarizeResult(result) };
			},
		}),
	);

	pi.registerTool(
		defineTool({
			name: "computer_use_set_value",
			label: "Computer Use: Set Value",
			description: "Set the value of a settable accessibility element in an app.",
			promptSnippet: "Set a value on a settable Mac app accessibility element",
			promptGuidelines: ["Use computer_use_set_value only with an element_index marked settable in computer_use_get_app_state."],
			parameters: Type.Object({
				app: AppParam,
				element_index: ElementIndexParam,
				value: Type.String({ description: "Value to assign" }),
			}),
			async execute(_id, params, _signal, _onUpdate, ctx) {
				const result = await runtime.callTool(ctx, "set_value", params);
				return { content: result.content, details: summarizeResult(result) };
			},
		}),
	);

	pi.registerTool(
		defineTool({
			name: "computer_use_select_text",
			label: "Computer Use: Select Text",
			description: "Select text inside a text element or place the cursor before/after it. Text must match the accessibility tree exactly.",
			promptSnippet: "Select text or place a cursor in a Mac app text element",
			promptGuidelines: ["Use computer_use_select_text with exact text from computer_use_get_app_state, adding prefix/suffix when needed to disambiguate."],
			parameters: Type.Object({
				app: Type.String({ description: "App name or bundle identifier" }),
				element_index: Type.String({ description: "Text element identifier" }),
				text: Type.String({ description: "Target text as shown in the accessibility tree" }),
				selection: Type.Optional(StringEnum(["text", "cursor_before", "cursor_after"] as const)),
				prefix: Type.Optional(Type.String({ description: "Optional text immediately before target" })),
				suffix: Type.Optional(Type.String({ description: "Optional text immediately after target" })),
			}),
			async execute(_id, params, _signal, _onUpdate, ctx) {
				const result = await runtime.callTool(ctx, "select_text", params);
				return { content: result.content, details: summarizeResult(result) };
			},
		}),
	);

	pi.registerTool(
		defineTool({
			name: "computer_use_perform_secondary_action",
			label: "Computer Use: Secondary Action",
			description: "Invoke a secondary accessibility action exposed by an app element, such as open, raise, or collapse.",
			promptSnippet: "Invoke a secondary accessibility action on a Mac app element",
			promptGuidelines: ["Use computer_use_perform_secondary_action only with action names shown in computer_use_get_app_state."],
			parameters: Type.Object({
				app: AppParam,
				element_index: ElementIndexParam,
				action: Type.String({ description: "Secondary accessibility action name" }),
			}),
			async execute(_id, params, _signal, _onUpdate, ctx) {
				const result = await runtime.callTool(ctx, "perform_secondary_action", params);
				return { content: result.content, details: summarizeResult(result) };
			},
		}),
	);
}

function summarizeResult(result: ComputerUseToolResult): Record<string, unknown> {
	return {
		contentTypes: result.content.map((block) => block.type),
		textBlockCount: result.content.filter((block) => block.type === "text").length,
		imageBlockCount: result.content.filter((block) => block.type === "image").length,
		hasStructuredContent: result.structuredContent !== undefined,
		hasMeta: result.meta !== undefined,
	};
}
