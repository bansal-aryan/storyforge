import { describe, expect, it } from "vitest";
import { WorldEngine } from "../../engine/WorldEngine";
import { createEclipseInheritance } from "../../engine/seed";
import { executeCommandElias } from "./commandElias";
import { executeExplainNextObjective } from "./explainNextObjective";
import { executeInspectBattlefield } from "./inspectBattlefield";

function context(engine: WorldEngine) {
  return { engine, actor: "agent" as const };
}

describe("gameplay WebMCP tools", () => {
  it("returns structured live battlefield state", async () => {
    const result = await executeInspectBattlefield({}, context(new WorldEngine(createEclipseInheritance())));
    expect(result.status).toBe("ok");
    expect(result.data).toMatchObject({ stage: 1, portalActive: false });
  });

  it("returns canonical objective guidance", async () => {
    const result = await executeExplainNextObjective({}, context(new WorldEngine(createEclipseInheritance())));
    expect(result.status).toBe("ok");
    expect("recommendedAction" in result.data && result.data.recommendedAction).toContain("West Grove");
  });

  it("commands Elias and attributes the mutation to the agent", async () => {
    const engine = new WorldEngine(createEclipseInheritance());
    const elias = engine.snapshot().gameplay!.companion;
    const objective = engine.snapshot().gameplay!.objectives[0]!;
    const enemy = engine.snapshot().gameplay!.enemies[0]!;
    engine.stageOneInteract(objective);
    for (let hit = 0; hit < enemy.maxHp; hit += 1) engine.stageOneAttack(enemy);
    engine.stageOneInteract({ x: elias.x, y: elias.y });
    engine.resolveRecruitment(0);
    const result = await executeCommandElias({ mode: "guard" }, context(engine));
    expect(result.status).toBe("ok");
    expect(engine.snapshot().gameplay!.companion.mode).toBe("guard");
    expect(engine.snapshot().activity[0]?.actor).toBe("agent");
  });

  it("rejects invalid tactical modes without changing state", async () => {
    const engine = new WorldEngine(createEclipseInheritance());
    const result = await executeCommandElias({ mode: "berserk" }, context(engine));
    expect(result.status).toBe("error");
    expect(engine.snapshot().gameplay!.companion.mode).toBe("follow");
  });
});
