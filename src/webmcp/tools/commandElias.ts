import { serializeError, serializeToolResult } from "../toolResult";
import type { ToolContext } from "./types";

const modes = ["follow", "focus", "guard", "hold"] as const;
type EliasMode = (typeof modes)[number];

export async function executeCommandElias(input: Record<string, unknown>, ctx: ToolContext) {
  if (!modes.includes(input.mode as EliasMode)) return serializeError("mode must be follow, focus, guard, or hold.");
  try {
    const result = ctx.engine.setCompanionMode(input.mode as EliasMode, { actor: ctx.actor });
    return serializeToolResult(result, `${result.summary} This reversible tactical command is now visible in the game HUD.`);
  } catch (error) {
    return serializeError(error instanceof Error ? error.message : "Could not command Elias.");
  }
}

export const commandEliasDef = {
  name: "command_companion",
  description: "Issues a reversible live combat command to the active stage companion after recruitment. follow stays near the heir, guard intercepts attacks, focus prioritizes the boss, and hold maintains position. Inspect the battlefield first.",
  inputSchema: {
    type: "object",
    properties: { mode: { type: "string", enum: modes, description: "The ranger's tactical stance." } },
    required: ["mode"],
    additionalProperties: false,
  },
  annotations: { readOnlyHint: false },
  execute: executeCommandElias,
};
