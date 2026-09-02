import { create } from "zustand";
import type { WorldSnapshot } from "../types/world";
import type { ConfirmationUi } from "../webmcp/confirmation";

type Confirmation = { title: string; body: string; resolve: (approved: boolean) => void };

interface WorldStore {
  snapshot: WorldSnapshot | null;
  selectedId: string | null;
  webmcp: "unknown" | "available" | "unavailable";
  confirmation: Confirmation | null;
  setSnapshot: (snapshot: WorldSnapshot | null) => void;
  select: (id: string | null) => void;
  setWebMcp: (status: WorldStore["webmcp"]) => void;
  askConfirmation: ConfirmationUi["confirmDestructive"];
  resolveConfirmation: (approved: boolean) => void;
}

export const useWorldStore = create<WorldStore>((set, get) => ({
  snapshot: null,
  selectedId: null,
  webmcp: "unknown",
  confirmation: null,
  setSnapshot: (snapshot) => set({ snapshot }),
  select: (selectedId) => set({ selectedId }),
  setWebMcp: (webmcp) => set({ webmcp }),
  askConfirmation: (title, body) => new Promise<boolean>((resolve) => set({ confirmation: { title, body, resolve } })),
  resolveConfirmation: (approved) => {
    const confirmation = get().confirmation;
    confirmation?.resolve(approved);
    set({ confirmation: null });
  },
}));
