import { serializeError, serializeToolResult } from "../toolResult";
import type { ToolContext } from "./types";

export async function executePlayAsCharacter(input: Record<string, unknown>, ctx: ToolContext) {
  if (typeof input.characterId !== "string" || typeof input.intent !== "string") return serializeError("characterId and intent are required.");
  try {
    const result = ctx.engine.playAsCharacter({ characterId: input.characterId, intent: input.intent }, { actor: ctx.actor });
    return serializeToolResult(result, result.summary, result.proposal ? "pending_confirmation" : "ok");
  } catch (error) { return serializeError(error instanceof Error ? error.message : "Could not play as character."); }
}

export const playAsCharacterDef = {
  name: "propose_companion_action",
  description: "Has a named agent companion suggest dialogue or action in the current quest scene. It stays pending for the player to review before becoming canon.",
  inputSchema: { type: "object", properties: { characterId: { type: "string" }, intent: { type: "string", description: "What the character tries to say or do." } }, required: ["characterId", "intent"], additionalProperties: false },
  annotations: { readOnlyHint: false, untrustedContentHint: true }, execute: executePlayAsCharacter,
};
