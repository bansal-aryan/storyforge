import { serializeError, serializeToolResult } from "../toolResult";
import type { ToolContext } from "./types";
export async function executeAdvanceQuestStage(input: Record<string, unknown>, ctx: ToolContext) {
  if (typeof input.action !== "string") return serializeError("action is required.");
  try { const result = ctx.engine.advanceQuestStage({ action: input.action, valueChoice: input.valueChoice as "mercy" | "truth" | "leverage" | undefined }, { actor: ctx.actor }); return serializeToolResult(result, result.summary, result.proposal ? "pending_confirmation" : "ok"); } catch (error) { return serializeError(error instanceof Error ? error.message : "Could not advance quest."); }
}
export const advanceQuestStageDef = { name: "advance_quest_stage", description: "Resolves the active quest objective after the party has acted. Agent resolution becomes a pending proposal. At the bargain stage, provide valueChoice: mercy, truth, or leverage.", inputSchema: { type: "object", properties: { action: { type: "string", description: "The accepted action that resolves the current objective." }, valueChoice: { type: "string", enum: ["mercy", "truth", "leverage"] } }, required: ["action"], additionalProperties: false }, annotations: { readOnlyHint: false }, execute: executeAdvanceQuestStage };
