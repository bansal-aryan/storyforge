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
        if (extra?.signal?.aborted) {
          engine.recordToolActivity(tool.def.name, "Tool call cancelled before execution.");
          return serializeToolResult({}, "Cancelled.", "cancelled");
        }
        try {
          const activityBefore = engine.snapshot().activity[0]?.id;
          const result = await tool.run(input, { engine, extra, actor: "agent" });
          const latestActivity = engine.snapshot().activity[0];
          const toolAlreadyLogged = latestActivity?.id !== activityBefore
            && latestActivity?.actor === "agent"
            && latestActivity?.toolName === tool.def.name;
          if (!toolAlreadyLogged) {
            engine.recordToolActivity(tool.def.name, result.summary ?? `${tool.def.name} completed.`);
          }
          return result;
        } catch (error) {
          const message = error instanceof Error ? error.message : "Tool execution failed.";
          engine.recordToolActivity(tool.def.name, `Failed: ${message}`);
          return serializeError(message);
        }
      },
    }, { signal: controller.signal });
  }
  return { controller, available: true };
}
