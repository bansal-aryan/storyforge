import { serializeError, serializeToolResult } from "../toolResult";
import type { ToolContext } from "./types";

export async function executeInspectFellowship(_input: Record<string, unknown>, ctx: ToolContext) {
  try {
    const state = ctx.engine.getFellowshipState();
    return serializeToolResult(state, `The fellowship has ${state.members.length} active members in ${state.autonomy} mode. ${state.recommendation ? `${state.recommendation.memberName} recommends ${state.recommendation.headline}.` : "No recommendation is available yet."}`);
  } catch (error) { return serializeError(error instanceof Error ? error.message : "Could not inspect the fellowship."); }
}

export const inspectFellowshipDef = {
  name: "inspect_fellowship",
  description: "Reads every recruited companion's health, trust, relationship state, tactic, ability readiness, combos, autonomy mode, current recommendation, and pending coordinated plan.",
  inputSchema: { type: "object", properties: {}, additionalProperties: false },
  annotations: { readOnlyHint: true },
  execute: executeInspectFellowship,
};
