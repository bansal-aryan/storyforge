import { confirmDestructive } from "../confirmation";
import { serializeError, serializeToolResult } from "../toolResult";
import type { ToolContext } from "./types";

export async function executeApplyWorldRule(input: Record<string, unknown>, ctx: ToolContext) {
  if (typeof input.text !== "string" || (input.severity !== "soft" && input.severity !== "hard")) return serializeError("text and severity (soft or hard) are required.");
  const ok = await confirmDestructive(ctx.extra, "Add world rule?", `${input.severity.toUpperCase()}: ${input.text}`);
  if (!ok) return serializeToolResult({ text: input.text }, "Rule change cancelled.", "cancelled");
  const rule = ctx.engine.applyWorldRule({ text: input.text, severity: input.severity }, { actor: ctx.actor });
  return serializeToolResult({ rule }, `Added ${rule.severity} world rule: ${rule.text}`);
}

export const applyWorldRuleDef = {
  name: "apply_world_rule",
  description: "Adds a durable soft or hard canon constraint. It always asks the human for confirmation because later continuity checks will enforce it.",
  inputSchema: { type: "object", properties: { text: { type: "string", description: "Constraint in natural language." }, severity: { type: "string", enum: ["soft", "hard"] } }, required: ["text", "severity"], additionalProperties: false },
  annotations: { readOnlyHint: false }, execute: executeApplyWorldRule,
};
