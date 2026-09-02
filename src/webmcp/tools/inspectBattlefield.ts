import { serializeError, serializeToolResult } from "../toolResult";
import type { ToolContext } from "./types";

export async function executeInspectBattlefield(_input: Record<string, unknown>, ctx: ToolContext) {
  try {
    const state = ctx.engine.getBattlefieldState();
    const summary = `${state.objective} The heir has ${state.player.hp}/${state.player.maxHp} health; ${state.companion.name} is ${state.companion.recruited ? `${state.companion.mode} at ${state.companion.hp}/${state.companion.maxHp} health` : "not recruited"}; ${state.enemies.length} guardians remain.`;
    return serializeToolResult(state, summary);
  } catch (error) {
    return serializeError(error instanceof Error ? error.message : "Could not inspect the battlefield.");
  }
}

export const inspectBattlefieldDef = {
  name: "inspect_battlefield",
  description: "Reads the live Eclipse Inheritance battle state: realm, objective, health, active companion stance, remaining enemies, ritual progress, boss phase, pickups, Seal, and Portal. Use before recommending or issuing a combat tactic.",
  inputSchema: { type: "object", properties: {}, additionalProperties: false },
  annotations: { readOnlyHint: true },
  execute: executeInspectBattlefield,
};
