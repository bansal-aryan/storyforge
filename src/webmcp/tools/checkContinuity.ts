import type { EntityStatus } from "../../types/world";
import { serializeToolResult } from "../toolResult";
import type { ToolContext } from "./types";

export async function executeCheckContinuity(input: Record<string, unknown>, ctx: ToolContext) {
  if (typeof input.action !== "string") return serializeToolResult({ ok: false, blockers: ["action is required."], warnings: [] }, "action is required.", "error");
  const data = ctx.engine.checkContinuity({ type: "natural", action: input.action, entityId: typeof input.entityId === "string" ? input.entityId : undefined, intendedStatus: input.intendedStatus as EntityStatus | undefined });
  const summary = data.ok ? `Continuity clear.${data.warnings.length ? ` Warnings: ${data.warnings.join(" ")}` : ""}` : `Continuity blocked: ${data.blockers.join(" ")}`;
  return serializeToolResult(data, summary);
}

export const checkContinuityDef = {
  name: "check_continuity",
  description: "Validates a proposed natural-language action against hard lore rules and known entities. Use before violent, irreversible, or lore-changing actions.",
  inputSchema: {
    type: "object", properties: {
      action: { type: "string", description: "Action to validate, for example 'Kill Magistrate Vale in the docks'." },
      entityId: { type: "string" }, intendedStatus: { type: "string", enum: ["alive", "dead", "unknown", "destroyed", "active", "resolved"] },
    }, required: ["action"], additionalProperties: false,
  }, annotations: { readOnlyHint: true }, execute: executeCheckContinuity,
};
