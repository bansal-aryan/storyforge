import type { UpdateEntityInput } from "../../types/world";
import { serializeError, serializeToolResult } from "../toolResult";
import type { ToolContext } from "./types";

export async function executeUpdateEntity(input: Record<string, unknown>, ctx: ToolContext) {
  if (typeof input.id !== "string") return serializeError("id is required.");
  try {
    const result = ctx.engine.updateEntity(input as unknown as UpdateEntityInput, { actor: ctx.actor });
    return serializeToolResult(result, result.summary, result.proposal ? "pending_confirmation" : "ok");
  } catch (error) {
    return serializeError(error instanceof Error ? error.message : "Could not update entity.");
  }
}

export const updateEntityDef = {
  name: "update_entity",
  description: "Updates one established character, location, item, faction, or plot thread. Agent changes become a pending proposal so the human can keep canon in control.",
  inputSchema: {
    type: "object",
    properties: {
      id: { type: "string" }, name: { type: "string" }, summary: { type: "string" },
      status: { type: "string", enum: ["alive", "dead", "unknown", "destroyed", "active", "resolved"] },
      tagsAdd: { type: "array", items: { type: "string" } }, tagsRemove: { type: "array", items: { type: "string" } },
      secretAdd: { type: "string" },
    }, required: ["id"], additionalProperties: false,
  },
  annotations: { readOnlyHint: false }, execute: executeUpdateEntity,
};
