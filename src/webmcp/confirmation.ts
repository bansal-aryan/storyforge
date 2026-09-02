import type { ToolExecuteExtra } from "../types/webmcp";

export type ConfirmationUi = {
  confirmDestructive: (title: string, body: string) => Promise<boolean>;
};

let ui: ConfirmationUi = {
  async confirmDestructive(title, body) {
    if (typeof window !== "undefined") return window.confirm(`${title}\n\n${body}`);
    return false;
  },
};

export function setConfirmationUi(next: ConfirmationUi) {
  ui = next;
}

export function getConfirmationUi(): ConfirmationUi {
  return ui;
}

export async function confirmDestructive(
  extra: ToolExecuteExtra | undefined,
  title: string,
  body: string,
): Promise<boolean> {
  const run = () => ui.confirmDestructive(title, body);
  if (extra?.requestUserInteraction) {
    return extra.requestUserInteraction(run);
  }
  return run();
}
