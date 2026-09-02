import type { ContinuityReport, MemoryHit, WorldSummary } from "./world";

export type ToolStatus = "ok" | "pending_confirmation" | "cancelled" | "error";

export interface ToolResultEnvelope<T = unknown> {
  status: ToolStatus;
  summary: string;
  data: T;
  content: { type: "text"; text: string }[];
}

export interface WorldSummaryData extends WorldSummary {}

export interface QueryMemoryData {
  hits: MemoryHit[];
  includeSecrets: boolean;
  hint?: string;
}

export interface PlotBranchData {
  proposals: { id: string; title: string; beat: string; locationName: string | null }[];
}

export interface ContinuityData extends ContinuityReport {}
