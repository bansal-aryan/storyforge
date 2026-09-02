import { serializeToolResult } from "../toolResult";
import type { ToolContext } from "./types";

export async function executeGetWorldSummary(_input: Record<string, unknown>, ctx: ToolContext) {
  const data = ctx.engine.getSummary();
  return serializeToolResult(data, ctx.engine.getSummaryText());
}

export const getWorldSummaryDef = {
  name: "get_world_summary",
  description:
    "Returns the current world premise, tone, scene, who is present, open questions, and entity counts. Use at the start of a session and after the world changes.",
  inputSchema: {
    type: "object",
    properties: {},
    additionalProperties: false,
  },
  annotations: { readOnlyHint: true },
  execute: executeGetWorldSummary,
};
