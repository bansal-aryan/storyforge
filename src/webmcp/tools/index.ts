import { advanceQuestStageDef, executeAdvanceQuestStage } from "./advanceQuestStage";
import { applyWorldRuleDef, executeApplyWorldRule } from "./applyWorldRule";
import { checkContinuityDef, executeCheckContinuity } from "./checkContinuity";
import { getAdventureStateDef, executeGetAdventureState } from "./getAdventureState";
import { getWorldSummaryDef, executeGetWorldSummary } from "./getWorldSummary";
import { movePartyDef, executeMoveParty } from "./moveParty";
import { playAsCharacterDef, executePlayAsCharacter } from "./playAsCharacter";
import { queryMemoryDef, executeQueryMemory } from "./queryMemory";
import { recruitPartyMemberDef, executeRecruitPartyMember } from "./recruitPartyMember";
import type { ToolContext } from "./types";

export const TOOLS = [
  { def: getAdventureStateDef, run: executeGetAdventureState },
  { def: getWorldSummaryDef, run: executeGetWorldSummary },
  { def: queryMemoryDef, run: executeQueryMemory },
  { def: movePartyDef, run: executeMoveParty },
  { def: recruitPartyMemberDef, run: executeRecruitPartyMember },
  { def: advanceQuestStageDef, run: executeAdvanceQuestStage },
  { def: checkContinuityDef, run: executeCheckContinuity },
  { def: playAsCharacterDef, run: executePlayAsCharacter },
  { def: applyWorldRuleDef, run: executeApplyWorldRule },
] as const;

export type StoryforgeToolName = (typeof TOOLS)[number]["def"]["name"];

export async function runTool(name: StoryforgeToolName, input: Record<string, unknown>, ctx: ToolContext) {
  const tool = TOOLS.find((candidate) => candidate.def.name === name);
  if (!tool) throw new Error(`Unknown tool ${name}`);
  return tool.run(input, ctx);
}
