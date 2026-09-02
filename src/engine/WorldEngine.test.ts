import { describe, expect, it } from "vitest";
import { WorldEngine } from "./WorldEngine";
import { createAshenPort, createEclipseInheritance } from "./seed";

describe("WorldEngine", () => {
  it("createWorld sets scene tick 0", () => {
    const engine = new WorldEngine();
    const snap = engine.createWorld({
      name: "Test",
      premise: "A quiet island.",
      tone: { genre: "folk", adjectives: ["gentle"] },
    });
    expect(snap.currentScene.tick).toBe(0);
  });

  it("generateNpc as human appears in entities immediately", () => {
    const engine = new WorldEngine(createAshenPort());
    const { entity, proposal } = engine.generateNpc(
      { role: "dock clerk" },
      { actor: "human" },
    );
    expect(proposal).toBeUndefined();
    expect(engine.snapshot().entities[entity.id]?.name).toBe(entity.name);
  });

  it("generateNpc as agent creates pending proposals", () => {
    const engine = new WorldEngine(createAshenPort());
    const { entity, proposal } = engine.generateNpc(
      { role: "rival merchant", secret: "Knows the heir's cipher" },
      { actor: "agent" },
    );
    expect(proposal?.status).toBe("pending");
    expect(engine.snapshot().entities[entity.id]).toBeUndefined();
    expect(engine.snapshot().proposals[0]?.id).toBe(proposal?.id);
  });

  it("query_memory finds secret only when includeSecrets", () => {
    const engine = new WorldEngine(createAshenPort());
    const vale = Object.values(engine.snapshot().entities).find(
      (e) => e.name === "Magistrate Vale",
    )!;
    const secretWord = vale.secrets[0]!.split(" ")[2]!;
    const hidden = engine.searchMemory(secretWord, { includeSecrets: false });
    const shown = engine.searchMemory("delayed reporting", { includeSecrets: true });
    expect(hidden.every((h) => !h.snippet.includes("delayed"))).toBe(true);
    expect(shown.some((h) => h.id === vale.id)).toBe(true);
  });

  it("checkContinuity blocks killing major without rule", () => {
    const engine = new WorldEngine(createAshenPort());
    const vale = Object.values(engine.snapshot().entities).find(
      (e) => e.name === "Magistrate Vale",
    )!;
    const report = engine.checkContinuity({
      type: "natural",
      action: "Kill Magistrate Vale in the docks",
      entityId: vale.id,
      intendedStatus: "dead",
    });
    expect(report.ok).toBe(false);
    expect(report.blockers.length).toBeGreaterThan(0);
    expect(() =>
      engine.updateEntity({ id: vale.id, status: "dead" }, { actor: "human" }),
    ).toThrow(/major/i);
  });

  it("advanceScene increments tick and logs event", () => {
    const engine = new WorldEngine(createAshenPort());
    const before = engine.snapshot().currentScene.tick;
    const events = engine.snapshot().events.length;
    engine.advanceScene(
      { title: "Dawn on the piers", beat: "The fog thins." },
      { actor: "human" },
    );
    expect(engine.snapshot().currentScene.tick).toBe(before + 1);
    expect(engine.snapshot().events.length).toBe(events + 1);
  });

  it("applyProposal then snapshot matches human-created entity", () => {
    const engine = new WorldEngine(createAshenPort());
    const { entity, proposal } = engine.generateNpc(
      { role: "rival merchant", name: "Sable Brine" },
      { actor: "agent" },
    );
    expect(proposal).toBeDefined();
    engine.applyProposal(proposal!.id);
    expect(engine.snapshot().entities[entity.id]?.name).toBe("Sable Brine");
  });

  it("moves the party only to an unlocked Lantern Road node", () => {
    const engine = new WorldEngine(createAshenPort());
    const [start, locked] = engine.getAdventureState().map;
    expect(() =>
      engine.moveParty({ locationId: locked!.entityId }, { actor: "human" }),
    ).toThrow("locked");
    engine.moveParty({ locationId: start!.entityId }, { actor: "human" });
    expect(engine.snapshot().currentScene.locationId).toBe(start!.entityId);
  });

  it("recruits a specialist and advances the five-stage quest", () => {
    const engine = new WorldEngine(createAshenPort());
    const sable = Object.values(engine.snapshot().entities).find(
      (entity) => entity.name === "Sable",
    )!;
    engine.recruitPartyMember(
      { entityId: sable.id, archetype: "Ledger-mage" },
      { actor: "human" },
    );
    expect(
      engine.getAdventureState().party.some((member) => member.entityId === sable.id),
    ).toBe(true);
    engine.advanceQuestStage(
      { action: "Vale reveals the failed beacon ledger." },
      { actor: "human" },
    );
    expect(engine.getAdventureState().quest.stages[0]!.state).toBe("complete");
    expect(engine.getAdventureState().quest.stages[1]!.state).toBe("active");
    expect(engine.getAdventureState().map[1]!.unlocked).toBe(true);
  });

  it("seeds Eclipse Inheritance without Ashen Port story residue", () => {
    const world = createEclipseInheritance();
    expect(world.premise).toContain("five corrupted Eclipse Seals");
    expect(world.entities.loc_emberwood?.name).toBe("Emberwood Glade");
    expect(Object.values(world.entities).some((entity) => entity.summary.includes("harbor"))).toBe(false);
    expect(world.gameplay?.portalActive).toBe(false);
  });

  it("enforces the Stage 1 boss, Seal, and Portal gates", () => {
    const engine = new WorldEngine(createEclipseInheritance());
    const game = engine.snapshot().gameplay!;

    expect(engine.stageOneAttack({ x: game.sylvara.x, y: game.sylvara.y }).type).toBe("blocked");
    for (const grove of game.groves) engine.stageOneInteract({ x: grove.x, y: grove.y });
    for (const enemy of game.enemies) {
      for (let hit = 0; hit < enemy.maxHp; hit += 1) engine.stageOneAttack({ x: enemy.x, y: enemy.y });
    }
    expect(engine.snapshot().gameplay?.sylvara.awakened).toBe(true);

    for (let hit = 0; hit < game.sylvara.maxHp; hit += 1) engine.stageOneAttack({ x: game.sylvara.x, y: game.sylvara.y });
    expect(engine.snapshot().gameplay?.sylvara.defeated).toBe(true);
    expect(engine.snapshot().gameplay?.portalActive).toBe(false);

    engine.stageOneInteract({ x: game.sylvara.x, y: game.sylvara.y });
    expect(engine.snapshot().gameplay?.sealCollected).toBe(true);
    expect(engine.snapshot().gameplay?.portalActive).toBe(true);

    engine.stageOneInteract({ x: 2070, y: 180 });
    expect(engine.snapshot().gameplay?.stageComplete).toBe(true);
    expect(engine.getAdventureState().quest.stageIndex).toBe(1);
  });

  it("collects and equips a level weapon in the canonical hotbar inventory", () => {
    const engine = new WorldEngine(createEclipseInheritance());
    const pickup = engine.snapshot().gameplay!.weaponPickups[0]!;
    expect(engine.stageOneInteract({ x: pickup.x, y: pickup.y }).type).toBe("weapon");
    expect(engine.snapshot().gameplay?.inventory.some((item) => item.id === pickup.item.id)).toBe(true);
    expect(engine.snapshot().gameplay?.player.weaponId).toBe(pickup.item.id);
  });

  it("telegraphs enemy attacks before applying avoidable damage", () => {
    const engine = new WorldEngine(createEclipseInheritance());
    const enemy = engine.snapshot().gameplay!.enemies[0]!;
    const position = { x: enemy.x, y: enemy.y };
    engine.combatTick({ player: position, elias: position, dodging: false, now: 1000 });
    expect(engine.snapshot().gameplay?.enemies[0]?.intent).toBe("windup");
    expect(engine.snapshot().gameplay?.player.hp).toBe(100);
    engine.combatTick({ player: position, elias: position, dodging: false, now: 1500 });
    expect(engine.snapshot().gameplay?.player.hp).toBeLessThan(100);
  });

  it("offers and applies a blessing after purifying a grove", () => {
    const engine = new WorldEngine(createEclipseInheritance());
    const grove = engine.snapshot().gameplay!.groves[0]!;
    engine.stageOneInteract({ x: grove.x, y: grove.y });
    expect(engine.snapshot().gameplay?.pendingBlessing).toBe(true);
    engine.chooseBlessing("vigor");
    expect(engine.snapshot().gameplay?.player.maxHp).toBe(120);
    expect(engine.snapshot().gameplay?.pendingBlessing).toBe(false);
  });

  it("starts Sylvara's attack scheduler and damages the heir after a telegraph", () => {
    const engine = new WorldEngine(createEclipseInheritance());
    const game = engine.snapshot().gameplay!;
    for (const grove of game.groves) engine.stageOneInteract({ x: grove.x, y: grove.y });
    for (const enemy of game.enemies) for (let hit = 0; hit < enemy.maxHp; hit += 1) engine.stageOneAttack({ x: enemy.x, y: enemy.y });
    const awakened = engine.snapshot().gameplay!.sylvara;
    expect(awakened.intent).toBe("idle");
    const position = { x: awakened.x, y: awakened.y };
    engine.combatTick({ player: position, elias: position, dodging: false, now: awakened.attackReadyAt + 1 });
    const telegraph = engine.snapshot().gameplay!.sylvara;
    expect(telegraph.intent).toBe("roots");
    const health = engine.snapshot().gameplay!.player.hp;
    engine.combatTick({ player: position, elias: position, dodging: false, now: telegraph.attackReadyAt + 1 });
    expect(engine.snapshot().gameplay!.player.hp).toBeLessThan(health);
  });

  it("lets a focused Elias contribute damage against Sylvara", () => {
    const engine = new WorldEngine(createEclipseInheritance());
    const game = engine.snapshot().gameplay!;
    engine.stageOneInteract({ x: game.elias.x, y: game.elias.y });
    for (const grove of game.groves) engine.stageOneInteract({ x: grove.x, y: grove.y });
    for (const enemy of game.enemies) for (let hit = 0; hit < enemy.maxHp; hit += 1) engine.stageOneAttack({ x: enemy.x, y: enemy.y });
    engine.setEliasMode("focus");
    const before = engine.snapshot().gameplay!.sylvara.hp;
    const result = engine.eliasCombatTick({ x: game.sylvara.x, y: game.sylvara.y });
    expect(result.type).toBe("boss_shot");
    expect(engine.snapshot().gameplay!.sylvara.hp).toBeLessThan(before);
  });
});
