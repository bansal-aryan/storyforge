import type { ModelContext } from "../types/webmcp";

export function getModelContext(): ModelContext | null {
  const doc = document as Document & { modelContext?: ModelContext };
  const nav = navigator as Navigator & { modelContext?: ModelContext };
  const ctx = doc.modelContext ?? nav.modelContext;
  if (ctx && typeof ctx.registerTool === "function") return ctx;
  return null;
}
