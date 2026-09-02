import { serializeToolResult } from "../toolResult";
import type { ToolContext } from "./types";

export async function executeProposePlotBranch(input: Record<string, unknown>, ctx: ToolContext) {
  const count = input.count === 2 ? 2 : 3;
  const proposals = ctx.engine.proposePlotBranch({ count }, { actor: ctx.actor });
  const world = ctx.engine.snapshot();
  const data = {
    proposals: proposals.map((p) => {
      const locId = p.patch.type === "advance_scene" ? p.patch.payload.locationId : null;
      const locationName = locId ? world.entities[locId]?.name ?? null : null;
      const beat = p.patch.type === "advance_scene" ? p.patch.payload.beat : p.summary;
      return { id: p.id, title: p.summary, beat, locationName };
    }),
  };
  const summary = data.proposals.map((p, i) => `${i + 1}. ${p.title}: ${p.beat}`).join("\n");
  return serializeToolResult(data, summary);
}

export const proposePlotBranchDef = {
  name: "propose_plot_branch",
  description:
    "Suggests two or three next-scene options as pending proposals. Does not advance time until a human accepts one. Use after you understand the current scene.",
  inputSchema: {
    type: "object",
    properties: {
      count: {
        type: "integer",
        enum: [2, 3],
        description: "How many next-scene options to propose. Default 3.",
      },
    },
    additionalProperties: false,
  },
  annotations: { readOnlyHint: false },
  execute: executeProposePlotBranch,
};
