import { serializeError, serializeToolResult } from "../toolResult";
import type { ToolContext } from "./types";
export async function executeMoveParty(input: Record<string, unknown>, ctx: ToolContext) {
  if (typeof input.locationId !== "string") return serializeError("locationId is required.");
  try { const result = ctx.engine.moveParty({ locationId: input.locationId }, { actor: ctx.actor }); return serializeToolResult(result, result.summary, result.proposal ? "pending_confirmation" : "ok"); } catch (error) { return serializeError(error instanceof Error ? error.message : "Could not move party."); }
}
export const movePartyDef = { name: "move_party", description: "Moves the party to an unlocked map location. Agent travel becomes a visible proposal the player can accept.", inputSchema: { type: "object", properties: { locationId: { type: "string", description: "ID of an unlocked destination from get_adventure_state." } }, required: ["locationId"], additionalProperties: false }, annotations: { readOnlyHint: false }, execute: executeMoveParty };
