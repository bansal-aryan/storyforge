import type { AdvanceSceneInput } from "../../types/world";
import { serializeError, serializeToolResult } from "../toolResult";
import type { ToolContext } from "./types";

export async function executeAdvanceScene(input: Record<string, unknown>, ctx: ToolContext) {
  try {
    const result = ctx.engine.advanceScene(input as AdvanceSceneInput, { actor: ctx.actor });
    return serializeToolResult(result, result.summary, result.proposal ? "pending_confirmation" : "ok");
  } catch (error) {
    return serializeError(error instanceof Error ? error.message : "Could not advance scene.");
  }
}

export const advanceSceneDef = {
  name: "advance_scene",
  description: "Advances the current scene with a clear beat, location, present characters, and open questions. Agent calls wait as a pending proposal until the human accepts.",
  inputSchema: {
    type: "object",
    properties: {
      title: { type: "string" }, locationId: { type: "string" }, beat: { type: "string" },
      presentEntityIds: { type: "array", items: { type: "string" } },
      openQuestions: { type: "array", items: { type: "string" } }, proposalId: { type: "string" },
    }, additionalProperties: false,
  },
  annotations: { readOnlyHint: false }, execute: executeAdvanceScene,
};
