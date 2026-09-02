import { engine } from "../../engine/instance";
import type { Actor } from "../../types/world";
import type { ToolExecuteExtra } from "../../types/webmcp";

export interface ToolContext {
  engine: typeof engine;
  extra?: ToolExecuteExtra;
  actor: Actor;
}
