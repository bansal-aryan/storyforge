import type { GenerateNpcInput } from "../../types/world";
import { serializeError, serializeToolResult } from "../toolResult";
import type { ToolContext } from "./types";

function readInput(input: Record<string, unknown>): GenerateNpcInput {
  if (typeof input.role !== "string" || !input.role.trim()) {
    throw new Error("role is required and must be a non-empty string.");
  }
  const relationship = input.relationship as GenerateNpcInput["relationship"] | undefined;
  return {
    name: typeof input.name === "string" ? input.name : undefined,
    role: input.role,
    secret: typeof input.secret === "string" ? input.secret : undefined,
    locationId: typeof input.locationId === "string" ? input.locationId : undefined,
    tags: Array.isArray(input.tags) ? input.tags.filter((tag): tag is string => typeof tag === "string") : undefined,
    relationship,
  };
}

export async function executeGenerateNpc(input: Record<string, unknown>, ctx: ToolContext) {
  try {
    const result = ctx.engine.generateNpc(readInput(input), { actor: ctx.actor });
    const status = result.proposal ? "pending_confirmation" : "ok";
    return serializeToolResult(result, result.summary, status);
  } catch (error) {
    return serializeError(error instanceof Error ? error.message : "Could not generate NPC.");
  }
}

export const generateNpcDef = {
  name: "generate_npc",
  description: "Creates a character consistent with the world tone and optional relationships. Agent calls create a pending character card the human can accept.",
  inputSchema: {
    type: "object",
    properties: {
      name: { type: "string", description: "Character name. Omit to generate one from the role." },
      role: { type: "string", description: "For example: rival merchant or captain of the watch." },
      secret: { type: "string", description: "Optional secret consistent with lore." },
      locationId: { type: "string", description: "Existing location id where they are based." },
      tags: { type: "array", items: { type: "string" } },
      relationship: {
        type: "object",
        properties: {
          toId: { type: "string" },
          kind: { type: "string", enum: ["knows", "allies", "rivals", "located_in", "owns", "member_of", "secret_about", "seeks"] },
          note: { type: "string" },
        },
        required: ["toId", "kind"],
        additionalProperties: false,
      },
    },
    required: ["role"],
    additionalProperties: false,
  },
  annotations: { readOnlyHint: false },
  execute: executeGenerateNpc,
};
