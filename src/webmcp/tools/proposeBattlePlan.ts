import { serializeError, serializeToolResult } from "../toolResult";
import type { ToolContext } from "./types";

export async function executeProposeBattlePlan(_input: Record<string, unknown>, ctx: ToolContext) {
  try {
    const plan = ctx.engine.proposeBattlePlan("agent");
    return serializeToolResult(plan, `Proposed “${plan.headline}” with ${plan.assignments.length} companion assignments. The player must approve it in the game.`);
  } catch (error) { return serializeError(error instanceof Error ? error.message : "Could not propose a battle plan."); }
}

export const proposeBattlePlanDef = {
  name: "propose_battle_plan",
  description: "Creates a grounded multi-companion tactical plan from current canonical battle state. It never executes immediately; the player receives an in-game approval card.",
  inputSchema: { type: "object", properties: {}, additionalProperties: false },
  annotations: { readOnlyHint: false },
  execute: executeProposeBattlePlan,
};
