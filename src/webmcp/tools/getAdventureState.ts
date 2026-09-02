import { serializeToolResult } from "../toolResult";
import type { ToolContext } from "./types";

export async function executeGetAdventureState(_input: Record<string, unknown>, ctx: ToolContext) {
  const world = ctx.engine.snapshot(); const adventure = ctx.engine.getAdventureState(); const activeStage = ctx.engine.getActiveQuestStage();
  const data = {
    player: world.entities[adventure.playerId]?.name ?? "Unknown player",
    party: adventure.party.map((member) => ({ name: world.entities[member.entityId]?.name ?? member.entityId, role: member.role, agentControlled: member.agentControlled, archetype: member.archetype, memory: member.memory })),
    currentLocation: world.currentScene.locationId ? world.entities[world.currentScene.locationId]?.name : null,
    activeStage,
    map: adventure.map.map((location) => ({ id: location.entityId, name: world.entities[location.entityId]?.name ?? location.entityId, unlocked: location.unlocked, visited: location.visited })),
  };
  return serializeToolResult(data, `The party is at ${data.currentLocation ?? "an unknown place"}. Active quest: ${activeStage?.title ?? "complete"} — ${activeStage?.objective ?? "The Lantern Road is finished."}`);
}

export const getAdventureStateDef = { name: "get_adventure_state", description: "Returns the player, agent party, current location, active quest stage, and available destinations. Use before choosing an adventure action.", inputSchema: { type: "object", properties: {}, additionalProperties: false }, annotations: { readOnlyHint: true }, execute: executeGetAdventureState };
