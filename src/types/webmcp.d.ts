export interface ToolExecuteExtra {
  signal?: AbortSignal;
  requestUserInteraction?: <T>(fn: () => Promise<T> | T) => Promise<T>;
}

export interface WebMcpToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations?: {
    readOnlyHint?: boolean;
    untrustedContentHint?: boolean;
  };
  execute: (
    input: Record<string, unknown>,
    extra?: ToolExecuteExtra,
  ) => unknown | Promise<unknown>;
}

export interface ModelContext {
  registerTool(
    def: WebMcpToolDefinition,
    options?: { signal?: AbortSignal; exposedTo?: string[] },
  ): Promise<void>;
  getTools?: (options?: { fromOrigins?: string[] }) => Promise<unknown[]>;
  executeTool?: (
    tool: unknown,
    args: string,
    options?: { signal?: AbortSignal },
  ) => Promise<unknown>;
  addEventListener?: (type: "toolchange", listener: EventListener) => void;
}

declare global {
  interface Document {
    modelContext?: ModelContext;
  }
  interface Navigator {
    modelContext?: ModelContext;
  }
}

export {};
