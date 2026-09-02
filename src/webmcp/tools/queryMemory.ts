import { serializeToolResult } from "../toolResult";
import type { ToolContext } from "./types";

export async function executeQueryMemory(input: Record<string, unknown>, ctx: ToolContext) {
  const query = String(input.query ?? "");
  const includeSecrets = Boolean(input.includeSecrets);
  const hits = ctx.engine.searchMemory(query, { includeSecrets });
  const hint =
    hits.length === 0 ? "No matches. Try a character name or location." : undefined;
  const summary =
    hits.length === 0
      ? hint!
      : hits.map((h, i) => `${i + 1}. [${h.kind}] ${h.name} — ${h.snippet}`).join("\n");
  return serializeToolResult({ hits, includeSecrets, hint }, summary);
}

export const queryMemoryDef = {
  name: "query_memory",
  description:
    "Searches characters, locations, items, factions, plot threads, and history by keywords. Use to stay consistent with established lore before creating or changing anything.",
  inputSchema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Natural language or keywords (name, place, secret, faction).",
      },
      includeSecrets: {
        type: "boolean",
        description: "If true, search hidden secrets. Default false.",
      },
    },
    required: ["query"],
    additionalProperties: false,
  },
  annotations: { readOnlyHint: true, untrustedContentHint: true },
  execute: executeQueryMemory,
};
