import type { ToolResultEnvelope, ToolStatus } from "../types/tools";

export function serializeToolResult<T>(
  data: T,
  summary: string,
  status: ToolStatus = "ok",
): ToolResultEnvelope<T> & { toString: () => string } {
  const envelope = {
    status,
    summary,
    data,
    content: [{ type: "text" as const, text: summary }],
    toString() {
      return `${summary}\n---json---\n${JSON.stringify(data)}`;
    },
  };
  return envelope;
}

export function serializeError(message: string, extra?: unknown) {
  return serializeToolResult({ message, extra }, message, "error");
}
