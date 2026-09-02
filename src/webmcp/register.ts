import { engine } from "../engine/instance";
import type { ToolExecuteExtra } from "../types/webmcp";
import { getModelContext } from "./detect";
import { serializeError, serializeToolResult } from "./toolResult";
import { TOOLS } from "./tools";

export async function registerStoryforgeTools(): Promise<{ controller: AbortController; available: boolean }> {
  const controller = new AbortController();
  const context = getModelContext();
  if (!context) return { controller, available: false };

  for (const tool of TOOLS) {
    await context.registerTool({
      ...tool.def,
      execute: async (input: Record<string, unknown>, extra?: ToolExecuteExtra) => {
        if (extra?.signal?.aborted) return serializeToolResult({}, "Cancelled.", "cancelled");
        try {
          return await tool.run(input, { engine, extra, actor: "agent" });
        } catch (error) {
          return serializeError(error instanceof Error ? error.message : "Tool execution failed.");
        }
      },
    }, { signal: controller.signal });
  }
  return { controller, available: true };
}
