import { serializeError, serializeToolResult } from "../toolResult";
import type { ToolContext } from "./types";
export async function executeRecruitPartyMember(input: Record<string, unknown>, ctx: ToolContext) {
  if (typeof input.entityId !== "string" || typeof input.archetype !== "string") return serializeError("entityId and archetype are required.");
  try { const result = ctx.engine.recruitPartyMember({ entityId: input.entityId, archetype: input.archetype }, { actor: ctx.actor }); return serializeToolResult(result, result.summary, result.proposal ? "pending_confirmation" : "ok"); } catch (error) { return serializeError(error instanceof Error ? error.message : "Could not recruit party member."); }
}
export const recruitPartyMemberDef = { name: "recruit_party_member", description: "Recruits an available specialist agent into the shared party. Agent recruitment is proposed for the player to approve.", inputSchema: { type: "object", properties: { entityId: { type: "string" }, archetype: { type: "string", description: "Party role, such as ledger-mage or trade guide." } }, required: ["entityId", "archetype"], additionalProperties: false }, annotations: { readOnlyHint: false }, execute: executeRecruitPartyMember };
