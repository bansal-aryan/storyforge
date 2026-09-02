import { serializeError, serializeToolResult } from "../toolResult";
import type { ToolContext } from "./types";

export async function executeExplainNextObjective(_input: Record<string, unknown>, ctx: ToolContext) {
  try {
    const guidance = ctx.engine.getNextObjectiveGuidance();
    return serializeToolResult(guidance, `${guidance.recommendedAction} ${guidance.reason}`);
  } catch (error) {
    return serializeError(error instanceof Error ? error.message : "Could not explain the next objective.");
  }
}

export const explainNextObjectiveDef = {
  name: "explain_next_objective",
  description: "Explains the next valid gameplay action from canonical world state without inventing progress or bypassing quest gates.",
  inputSchema: { type: "object", properties: {}, additionalProperties: false },
  annotations: { readOnlyHint: true },
  execute: executeExplainNextObjective,
};
