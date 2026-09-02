import { produce } from "immer";
import type {
  ActivityEntry,
  AdventureState,
  Actor,
  AdvanceSceneInput,
  ContinuityReport,
  Entity,
  EntityKind,
  GenerateNpcInput,
  MemoryHit,
  ProposedAction,
  Proposal,
  Relation,
  Scene,
  Tone,
  UpdateEntityInput,
  WorldEvent,
  WorldRule,
  WorldSnapshot,
  WorldSummary,
} from "../types/world";
import { checkContinuity } from "./continuity";
import { displayName, makeId, uniqueName } from "./ids";
import { applyPatch } from "./proposals";
import { searchMemory } from "./search";
import { createAshenPort, createEclipseInheritance } from "./seed";

export type EngineListener = (snap: WorldSnapshot, change: ActivityEntry) => void;

function emptyCounts(): Record<EntityKind, number> {
  return { character: 0, location: 0, item: 0, faction: 0, thread: 0 };
}

function summarizeWorld(world: WorldSnapshot): string {
  const loc = world.currentScene.locationId
    ? world.entities[world.currentScene.locationId]?.name
    : "an unknown place";
  const present = world.currentScene.presentEntityIds
    .map((id) => world.entities[id]?.name)
    .filter(Boolean)
    .join(", ");
  const qs = world.currentScene.openQuestions.slice(0, 2).join(" ");
  return `${world.name} — ${world.tone.genre} (${world.tone.adjectives.join(", ")}). ${world.premise} Current scene (tick ${world.currentScene.tick}): ${world.currentScene.title} at ${loc}. Present: ${present || "no one named"}. Open: ${qs || "none"}.`;
}

export class WorldEngine {
  private world: WorldSnapshot | null = null;
  private listeners = new Set<EngineListener>();

  constructor(initial?: WorldSnapshot) {
    this.world = initial ?? null;
  }

  snapshot(): WorldSnapshot {
    if (!this.world) {
      throw new Error("No world loaded");
    }
    return this.world;
  }

  hasWorld(): boolean {
    return this.world !== null;
  }

  subscribe(fn: EngineListener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private commit(next: WorldSnapshot, change: ActivityEntry): WorldSnapshot {
    this.world = {
      ...next,
      activity: [change, ...next.activity].slice(0, 200),
    };
    this.listeners.forEach((l) => l(this.world!, change));
    return this.world;
  }

  private sync(next: WorldSnapshot, summary: string): WorldSnapshot {
    this.world = next;
    const change: ActivityEntry = { id: makeId("act"), at: Date.now(), actor: "system", summary };
    this.listeners.forEach((listener) => listener(next, change));
    return next;
  }

  private require(): WorldSnapshot {
    if (!this.world) throw new Error("No world loaded");
    return this.world;
  }

  createWorld(input: { name: string; premise: string; tone: Tone }): WorldSnapshot {
    const now = Date.now();
    const sceneId = makeId("scn");
    const snap: WorldSnapshot = {
      version: 1,
      id: makeId("wld"),
      name: input.name,
      premise: input.premise,
      tone: input.tone,
      entities: {},
      relations: [],
      events: [
        {
          id: makeId("evt"),
          at: 0,
          sceneId,
          title: "The world begins",
          body: input.premise,
          entityIds: [],
          source: "system",
        },
      ],
      rules: [],
      currentScene: {
        id: sceneId,
        title: "Opening",
        locationId: null,
        presentEntityIds: [],
        openQuestions: ["What happens first?"],
        tick: 0,
      },
      proposals: [],
      activity: [],
      adventure: {
        playerId: "",
        party: [],
        map: [],
        quest: { title: "Untitled quest", stageIndex: 0, stages: [] },
      },
    };
    const change: ActivityEntry = {
      id: makeId("act"),
      at: now,
      actor: "human",
      summary: `Created world "${input.name}".`,
    };
    return this.commit(snap, change);
  }

  loadAshenPort(): WorldSnapshot {
    const snap = createAshenPort();
    const change = snap.activity[0]!;
    this.world = snap;
    this.listeners.forEach((l) => l(this.world!, change));
    return this.world;
  }

  loadEclipseInheritance(): WorldSnapshot {
    const snap = createEclipseInheritance();
    const change = snap.activity[0]!;
    this.world = snap;
    this.listeners.forEach((l) => l(this.world!, change));
    return this.world;
  }

  load(snap: WorldSnapshot): void {
    this.world = snap;
    const change: ActivityEntry = {
      id: makeId("act"),
      at: Date.now(),
      actor: "system",
      summary: `Loaded world "${snap.name}".`,
    };
    this.world = { ...snap, activity: [change, ...snap.activity].slice(0, 200) };
    this.listeners.forEach((l) => l(this.world!, change));
  }

  toJSON(): WorldSnapshot {
    return this.require();
  }

  getSummary(): WorldSummary {
    const world = this.require();
    const counts = emptyCounts();
    for (const e of Object.values(world.entities)) counts[e.kind] += 1;
    const loc = world.currentScene.locationId
      ? world.entities[world.currentScene.locationId]?.name ?? null
      : null;
    return {
      worldName: world.name,
      premise: world.premise,
      tone: world.tone,
      scene: {
        title: world.currentScene.title,
        tick: world.currentScene.tick,
        locationName: loc,
        present: world.currentScene.presentEntityIds.map(
          (id) => world.entities[id]?.name ?? id,
        ),
        openQuestions: world.currentScene.openQuestions,
      },
      entityCounts: counts,
      pendingProposalCount: world.proposals.filter((p) => p.status === "pending").length,
      recentEvents: world.events.slice(-5).reverse().map((e) => ({
        title: e.title,
        tick: e.at,
      })),
      rules: world.rules.map((r) => ({ text: r.text, severity: r.severity })),
    };
  }

  getSummaryText(): string {
    return summarizeWorld(this.require());
  }

  getAdventureState(): AdventureState {
    return this.require().adventure;
  }

  getActiveQuestStage() {
    const world = this.require();
    return world.adventure.quest.stages[world.adventure.quest.stageIndex];
  }

  private requireStageOne() {
    const gameplay = this.require().gameplay;
    if (!gameplay) throw new Error("This world has no playable stage loaded.");
    return gameplay;
  }

  setPlayerPosition(position: { x: number; y: number }): void {
    const world = this.require();
    if (!world.gameplay) return;
    this.world = produce(world, (draft) => {
      if (draft.gameplay) {
        draft.gameplay.player.x = position.x;
        draft.gameplay.player.y = position.y;
      }
    });
  }

  stageOneInteract(position: { x: number; y: number }): { type: string; summary: string } {
    const world = this.require();
    this.requireStageOne();
    const near = (point: { x: number; y: number }, radius: number) => Math.hypot(position.x - point.x, position.y - point.y) < radius;
    let type = "none";
    let summary = "Nothing here answers your touch.";
    const next = produce(world, (draft) => {
      const game = draft.gameplay!;
      game.player.x = position.x;
      game.player.y = position.y;

      if (game.portalActive && near({ x: 2070, y: 180 }, 38)) {
        type = "portal";
        summary = "The heir enters the Portal. The Drowned Archives awaken beyond it.";
        game.stageComplete = true;
        game.stage = 2;
        game.objective = "Stage 2 — enter the Drowned Archives and seek the Seal of Memory.";
        game.storyLine = "Cold black water reflects an impossible library as the Portal closes behind you.";
        const current = draft.adventure.quest.stages[0];
        const following = draft.adventure.quest.stages[1];
        if (current) current.state = "complete";
        if (following) following.state = "active";
        draft.adventure.quest.stageIndex = 1;
        if (draft.adventure.map[1]) draft.adventure.map[1]!.unlocked = true;
        draft.currentScene = { ...draft.currentScene, id: makeId("scn"), title: "The Drowned Threshold", locationId: following?.locationId ?? null, tick: draft.currentScene.tick + 1 };
        return;
      }

      if (game.sylvara.defeated && !game.sealCollected && near(game.sylvara, 48)) {
        type = "seal";
        summary = "The Seal of Roots is claimed. The Emberwood Portal awakens.";
        game.sealCollected = true;
        if (!game.inventory.some((item) => item.id === "itm_roots")) game.inventory.push({ id: "itm_roots", name: "Seal of Roots", kind: "seal", icon: "✦", description: "The first restored Eclipse Seal." });
        game.portalActive = true;
        game.objective = "Enter the awakened Portal.";
        game.storyLine = "The Seal settles into your palm. Green-gold light races through the roots and ignites the Portal.";
        return;
      }

      const pickup = game.weaponPickups.find((candidate) => !candidate.collected && near(candidate, 38));
      if (pickup) {
        type = "weapon";
        pickup.collected = true;
        game.inventory.push(pickup.item);
        game.player.weaponId = pickup.item.id;
        summary = `${pickup.item.name} collected and equipped.`;
        game.storyLine = `The heir lifts ${pickup.item.name}. Its old magic answers the restored bloodline.`;
        return;
      }

      const grove = game.groves.find((candidate) => !candidate.purified && near(candidate, 34));
      if (grove) {
        type = "grove";
        grove.purified = true;
        const count = game.groves.filter((candidate) => candidate.purified).length;
        summary = `${grove.label} is purified.`;
        game.storyLine = `${grove.label} is cleansed. The blight recoils from the heir's touch.`;
        game.pendingBlessing = true;
        game.objective = count === game.groves.length ? "Clear the blighted guardians and confront Sylvara." : `Purify the remaining groves (${game.groves.length - count} left).`;
        game.sylvara.awakened = count === game.groves.length && game.enemies.every((enemy) => !enemy.alive);
        if (game.sylvara.awakened) { game.sylvara.intent = "idle"; game.sylvara.attackReadyAt = Date.now() + 900; }
        return;
      }

      if (!game.elias.recruited && near(game.elias, 38)) {
        type = "elias";
        summary = "Elias joins the heir's hunt.";
        game.elias.recruited = true;
        game.storyLine = "Elias lowers his bow. “Voss burned my village to erase your bloodline. We hunt together.”";
        if (!draft.adventure.party.some((member) => member.entityId === "chr_elias")) {
          draft.adventure.party.push({ entityId: "chr_elias", role: "companion", agentControlled: true, archetype: "Ranger", disposition: "Watchful, loyal", memory: ["Voss's purge destroyed Elias's village."] });
        }
      }
    });
    if (type === "none") return { type, summary };
    this.commit(next, { id: makeId("act"), at: Date.now(), actor: "human", toolName: "interact", summary });
    return { type, summary };
  }

  stageOneAttack(position: { x: number; y: number }, options: { heavy?: boolean } = {}): { type: string; summary: string } {
    const world = this.require();
    this.requireStageOne();
    const near = (point: { x: number; y: number }, radius: number) => Math.hypot(position.x - point.x, position.y - point.y) < radius;
    let type = "miss";
    let summary = "The blade cuts only blighted air.";
    const next = produce(world, (draft) => {
      const game = draft.gameplay!;
      game.player.x = position.x;
      game.player.y = position.y;
      const range = options.heavy ? 62 : 44;
      const enemy = game.enemies.find((candidate) => candidate.alive && near(candidate, range));
      if (enemy) {
        type = "enemy";
        const blessingDamage = game.blessings.includes("fury") ? 1 : 0;
        const weaponDamage = (game.player.weaponId === "wpn_ember_axe" ? 2 : 1) + (options.heavy ? 1 : 0) + blessingDamage;
        enemy.hp -= weaponDamage;
        enemy.alive = enemy.hp > 0;
        game.player.essence = Math.max(0, game.player.essence - (options.heavy ? 12 : 4));
        summary = enemy.alive ? "A blighted guardian staggers." : "A blighted guardian falls.";
        game.storyLine = summary;
        const ready = game.groves.every((grove) => grove.purified) && game.enemies.every((candidate) => !candidate.alive);
        game.sylvara.awakened = game.sylvara.awakened || ready;
        if (ready) {
          game.sylvara.intent = "idle";
          game.sylvara.attackReadyAt = Date.now() + 900;
          game.objective = "Defeat Sylvara the Blightweaver.";
          game.storyLine = "The last guardian falls. Sylvara descends from the Heart of the First Tree.";
        }
        return;
      }
      if (!game.sylvara.defeated && near(game.sylvara, 60)) {
        if (!game.sylvara.awakened) {
          type = "blocked";
          summary = "Blighted roots shield Sylvara. Purify the groves and defeat their guardians first.";
          game.storyLine = summary;
          return;
        }
        type = "boss";
        const bossDamage = (game.player.weaponId === "wpn_ember_axe" ? 2 : 1) + (options.heavy ? 1 : 0) + (game.blessings.includes("fury") ? 1 : 0);
        game.sylvara.hp = Math.max(0, game.sylvara.hp - bossDamage);
        game.sylvara.phase = game.sylvara.hp <= 4 ? 3 : game.sylvara.hp <= 8 ? 2 : 1;
        game.player.essence = Math.max(0, game.player.essence - (options.heavy ? 14 : 6));
        if (game.sylvara.hp === 0) {
          game.sylvara.defeated = true;
          summary = "Sylvara falls, leaving the Seal of Roots among the dying vines.";
          game.objective = "Collect the Seal of Roots from Sylvara (E).";
        } else {
          summary = `Sylvara reels. ${game.sylvara.hp}/${game.sylvara.maxHp} strength remains.`;
          game.objective = "Defeat Sylvara the Blightweaver.";
        }
        game.storyLine = summary;
      }
    });
    if (type === "miss") return { type, summary };
    this.commit(next, { id: makeId("act"), at: Date.now(), actor: "human", toolName: "attack", summary });
    return { type, summary };
  }

  equipWeapon(itemId: string): void {
    const world = this.require();
    const game = this.requireStageOne();
    const item = game.inventory.find((candidate) => candidate.id === itemId && candidate.kind === "weapon");
    if (!item) throw new Error("That weapon is not in the heir's inventory.");
    const next = produce(world, (draft) => { draft.gameplay!.player.weaponId = itemId; });
    this.commit(next, { id: makeId("act"), at: Date.now(), actor: "human", toolName: "equip_weapon", summary: `${item.name} equipped.` });
  }

  useDodge(): void {
    const world = this.require();
    if (!world.gameplay || world.gameplay.player.essence < 6) return;
    const next = produce(world, (draft) => { draft.gameplay!.player.essence -= 6; });
    this.sync(next, "The heir dodges.");
  }

  chooseBlessing(blessing: "vigor" | "fury" | "wind" | "bond"): void {
    const world = this.require();
    const game = this.requireStageOne();
    if (!game.pendingBlessing) return;
    const next = produce(world, (draft) => {
      const state = draft.gameplay!;
      if (!state.blessings.includes(blessing)) state.blessings.push(blessing);
      state.pendingBlessing = false;
      if (blessing === "vigor") { state.player.maxHp += 20; state.player.hp = Math.min(state.player.maxHp, state.player.hp + 20); }
      if (blessing === "bond") { state.elias.maxHp += 20; state.elias.hp = Math.min(state.elias.maxHp, state.elias.hp + 20); }
      state.storyLine = { vigor: "The First Tree strengthens the heir's living blood.", fury: "Root-fire gathers along every weapon edge.", wind: "The forest wind lightens the heir's step.", bond: "The blessing binds heir and ranger more closely." }[blessing];
    });
    this.commit(next, { id: makeId("act"), at: Date.now(), actor: "human", toolName: "choose_blessing", summary: `The heir accepts the blessing of ${blessing}.` });
  }

  setEliasMode(
    mode: "follow" | "focus" | "guard" | "hold",
    opts: { actor: Actor } = { actor: "human" },
  ): { mode: "follow" | "focus" | "guard" | "hold"; summary: string } {
    const world = this.require();
    const game = this.requireStageOne();
    if (!game.elias.recruited) throw new Error("Elias must be recruited before he can receive tactical commands.");
    if (game.elias.hp <= 0) throw new Error("Elias is wounded and cannot change tactics yet.");
    const summary = `Elias changes stance to ${mode}.`;
    const next = produce(world, (draft) => { draft.gameplay!.elias.mode = mode; });
    this.commit(next, { id: makeId("act"), at: Date.now(), actor: opts.actor, toolName: "command_elias", summary, data: { mode } });
    return { mode, summary };
  }

  getBattlefieldState() {
    const game = this.requireStageOne();
    const equipped = game.inventory.find((item) => item.id === game.player.weaponId);
    const activeEnemies = game.enemies
      .filter((enemy) => enemy.alive)
      .map((enemy) => ({ id: enemy.id, kind: enemy.kind, hp: enemy.hp, maxHp: enemy.maxHp, intent: enemy.intent }));
    return {
      stage: game.stage,
      objective: game.objective,
      player: { hp: game.player.hp, maxHp: game.player.maxHp, essence: game.player.essence, weapon: equipped?.name ?? game.player.weaponId },
      elias: { recruited: game.elias.recruited, hp: game.elias.hp, maxHp: game.elias.maxHp, mode: game.elias.mode },
      groves: { purified: game.groves.filter((grove) => grove.purified).length, total: game.groves.length },
      enemies: activeEnemies,
      sylvara: { awakened: game.sylvara.awakened, defeated: game.sylvara.defeated, hp: game.sylvara.hp, maxHp: game.sylvara.maxHp, phase: game.sylvara.phase, intent: game.sylvara.intent },
      sealCollected: game.sealCollected,
      portalActive: game.portalActive,
      collectibleWeapons: game.weaponPickups.filter((pickup) => !pickup.collected).map((pickup) => pickup.item.name),
    };
  }

  getNextObjectiveGuidance(): { objective: string; recommendedAction: string; reason: string } {
    const game = this.requireStageOne();
    if (game.stageComplete) return { objective: game.objective, recommendedAction: "Continue into the Drowned Archives.", reason: "The Stage 1 vertical slice is complete." };
    if (game.portalActive) return { objective: game.objective, recommendedAction: "Enter the glowing Portal in the northeast.", reason: "Sylvara is defeated and the Seal of Roots is secured." };
    if (game.sylvara.defeated && !game.sealCollected) return { objective: game.objective, recommendedAction: "Collect the Seal where Sylvara fell.", reason: "The Portal cannot activate until the Seal is claimed." };
    if (game.sylvara.awakened) return { objective: game.objective, recommendedAction: game.elias.recruited ? "Set Elias to focus, dodge the root telegraph, and strike Sylvara." : "Recruit Elias, then confront Sylvara.", reason: `Sylvara is exposed in phase ${game.sylvara.phase}.` };
    const unpurified = game.groves.find((grove) => !grove.purified);
    if (unpurified) return { objective: game.objective, recommendedAction: `Travel to ${unpurified.label} and purify its blight totem.`, reason: `${game.groves.filter((grove) => grove.purified).length} of ${game.groves.length} groves are purified.` };
    return { objective: game.objective, recommendedAction: "Defeat the remaining blighted guardians.", reason: `${game.enemies.filter((enemy) => enemy.alive).length} guardians still anchor Sylvara's shield.` };
  }

  combatTick(input: { player: { x: number; y: number }; elias: { x: number; y: number }; dodging: boolean; now: number }): void {
    const world = this.require();
    const game = this.requireStageOne();
    if (game.stageComplete) return;
    let changed = false;
    const next = produce(world, (draft) => {
      const state = draft.gameplay!;
      const damageTarget = (target: "player" | "elias", amount: number) => {
        if (target === "player") {
          if (input.dodging) return;
          state.player.hp = Math.max(0, state.player.hp - amount);
        } else state.elias.hp = Math.max(0, state.elias.hp - amount);
        changed = true;
      };
      for (const enemy of state.enemies) {
        if (!enemy.alive) continue;
        const playerDistance = Math.hypot(enemy.x - input.player.x, enemy.y - input.player.y);
        const eliasAvailable = state.elias.recruited && state.elias.hp > 0 && state.elias.mode === "guard";
        const eliasDistance = Math.hypot(enemy.x - input.elias.x, enemy.y - input.elias.y);
        const target: "player" | "elias" = eliasAvailable && eliasDistance < playerDistance + 70 ? "elias" : "player";
        const targetPoint = target === "player" ? input.player : input.elias;
        const distance = target === "player" ? playerDistance : eliasDistance;
        if (enemy.intent === "windup" && input.now >= enemy.attackReadyAt) {
          if (distance < (enemy.kind === "wolf" ? 62 : 330)) damageTarget(target, enemy.kind === "wolf" ? 9 : 11);
          enemy.intent = "recover"; enemy.attackReadyAt = input.now + (enemy.kind === "wolf" ? 700 : 1250); changed = true;
        } else if (enemy.intent === "recover" && input.now >= enemy.attackReadyAt) {
          enemy.intent = "idle"; changed = true;
        } else if (enemy.intent !== "windup" && enemy.intent !== "recover" && input.now >= enemy.attackReadyAt) {
          if (distance < (enemy.kind === "wolf" ? 54 : 310)) {
            enemy.intent = "windup"; enemy.attackReadyAt = input.now + (enemy.kind === "wolf" ? 430 : 780); changed = true;
          } else if (enemy.kind === "wolf" && distance < 430) {
            const step = 8; enemy.x += ((targetPoint.x - enemy.x) / distance) * step; enemy.y += ((targetPoint.y - enemy.y) / distance) * step; enemy.intent = "chase"; changed = true;
          }
        }
      }
      const boss = state.sylvara;
      if (boss.awakened && !boss.defeated) {
        if (boss.intent === "shielded") { boss.intent = "idle"; boss.attackReadyAt = input.now + 700; changed = true; }
        const playerDistance = Math.hypot(boss.x - input.player.x, boss.y - input.player.y);
        const eliasDistance = Math.hypot(boss.x - input.elias.x, boss.y - input.elias.y);
        const guardIntercepts = state.elias.recruited && state.elias.hp > 0 && state.elias.mode === "guard" && eliasDistance < playerDistance + 90;
        const bossTarget: "player" | "elias" = guardIntercepts ? "elias" : "player";
        const bossTargetPoint = bossTarget === "elias" ? input.elias : input.player;
        const targetDistance = bossTarget === "elias" ? eliasDistance : playerDistance;
        if ((boss.intent === "roots" || boss.intent === "summon") && input.now >= boss.attackReadyAt) {
          if (targetDistance < (boss.intent === "roots" ? 480 : 250)) damageTarget(bossTarget, boss.phase === 3 ? 18 : 13);
          if (boss.intent === "summon") {
            const fallen = state.enemies.find((enemy) => !enemy.alive);
            if (fallen) {
              fallen.alive = true; fallen.hp = Math.min(3, fallen.maxHp); fallen.intent = "idle"; fallen.attackReadyAt = input.now + 800;
              fallen.x = boss.x - 95; fallen.y = boss.y + (boss.phase === 3 ? 75 : -75);
              state.storyLine = "Sylvara tears a fallen guardian back into the fight.";
            }
          }
          boss.intent = "idle"; boss.attackReadyAt = input.now + Math.max(700, 1550 - boss.phase * 220); changed = true;
        } else if (boss.intent === "idle" && input.now >= boss.attackReadyAt) {
          boss.intent = boss.phase === 1 ? "roots" : Math.floor(input.now / 1000) % 2 === 0 ? "summon" : "roots";
          boss.attackReadyAt = input.now + (boss.phase === 1 ? 950 : boss.phase === 2 ? 760 : 620); changed = true;
        } else if (boss.intent === "idle" && targetDistance > 285) {
          const distance = targetDistance || 1;
          const step = 5 + boss.phase * 2;
          boss.x += ((bossTargetPoint.x - boss.x) / distance) * step;
          boss.y += ((bossTargetPoint.y - boss.y) / distance) * step;
          changed = true;
        }
      }
      if (state.player.hp === 0) { state.player.hp = state.player.maxHp; state.player.x = 240; state.player.y = 720; state.storyLine = "The heir awakens at the ruined village shrine."; }
    });
    if (changed) this.sync(next, "Combat state advances.");
  }

  eliasCombatTick(position: { x: number; y: number }): { type: string; summary: string } {
    const world = this.require();
    const game = this.requireStageOne();
    if (!game.elias.recruited || game.elias.hp <= 0 || game.stageComplete) return { type: "idle", summary: "Elias holds position." };
    const candidates = game.enemies.filter((enemy) => enemy.alive).map((enemy) => ({ enemy, distance: Math.hypot(position.x - enemy.x, position.y - enemy.y) })).sort((a, b) => a.distance - b.distance);
    const target = candidates[0];
    const range = game.elias.mode === "focus" ? 330 : game.elias.mode === "hold" ? 270 : 210;
    const bossDistance = Math.hypot(position.x - game.sylvara.x, position.y - game.sylvara.y);
    const canShootBoss = game.sylvara.awakened && !game.sylvara.defeated && bossDistance <= (game.elias.mode === "focus" ? 430 : range);
    if (canShootBoss && (game.elias.mode === "focus" || !target || target.distance > range)) {
      const damage = game.blessings.includes("bond") ? 2 : 1;
      const next = produce(world, (draft) => {
        const boss = draft.gameplay!.sylvara;
        boss.hp = Math.max(0, boss.hp - damage);
        boss.phase = boss.hp <= 4 ? 3 : boss.hp <= 8 ? 2 : 1;
        if (boss.hp === 0) { boss.defeated = true; draft.gameplay!.objective = "Collect the Seal of Roots from Sylvara (E)."; }
      });
      const summary = game.elias.mode === "focus" ? "Elias marks Sylvara and drives an arrow through her heart-vines." : "Elias fires on Sylvara while the heir holds her attention.";
      this.commit(next, { id: makeId("act"), at: Date.now(), actor: "system", toolName: "elias_attack", summary });
      return { type: "boss_shot", summary };
    }
    if (!target || target.distance > range) return { type: "idle", summary: "No enemy is within Elias's bow range." };
    let type = "shot";
    let summary = `Elias strikes ${target.enemy.id} with his ranger bow.`;
    const next = produce(world, (draft) => {
      const draftGame = draft.gameplay!;
      const enemy = draftGame.enemies.find((candidate) => candidate.id === target.enemy.id)!;
      enemy.hp = Math.max(0, enemy.hp - (draftGame.blessings.includes("bond") ? 2 : 1));
      enemy.alive = enemy.hp > 0;
      if (!enemy.alive) { type = "kill"; summary = "Elias drops a blighted guardian with a clean arrow."; }
      if (target.distance < 48) {
        draftGame.elias.hp = Math.max(0, draftGame.elias.hp - 7);
        if (draftGame.elias.hp === 0) { type = "down"; summary = "Elias is wounded and can no longer fight."; }
      }
      const ready = draftGame.groves.every((grove) => grove.purified) && draftGame.enemies.every((candidate) => !candidate.alive);
      draftGame.sylvara.awakened = draftGame.sylvara.awakened || ready;
      if (ready) {
        draftGame.objective = "Defeat Sylvara the Blightweaver.";
        if (draftGame.sylvara.intent === "shielded") { draftGame.sylvara.intent = "idle"; draftGame.sylvara.attackReadyAt = Date.now() + 900; }
      }
    });
    this.commit(next, { id: makeId("act"), at: Date.now(), actor: "system", toolName: "elias_attack", summary });
    return { type, summary };
  }

  damagePlayer(amount: number): void {
    const world = this.require();
    if (!world.gameplay || world.gameplay.stageComplete) return;
    const next = produce(world, (draft) => {
      const player = draft.gameplay!.player;
      player.hp = Math.max(0, player.hp - amount);
      if (player.hp === 0) {
        player.hp = player.maxHp;
        player.x = 240;
        player.y = 720;
        draft.gameplay!.storyLine = "The heir falls back to the village ruins. The bloodline endures.";
      } else {
        draft.gameplay!.storyLine = "The blighted swarm tears at your armor. Keep moving.";
      }
    });
    this.commit(next, { id: makeId("act"), at: Date.now(), actor: "system", summary: "The heir takes damage." });
  }

  getEliasResponse(text: string): string {
    const game = this.requireStageOne();
    if (!game.elias.recruited) return "Find me among the ruined groves first, heir. Then we can hunt as one.";
    const lowered = text.toLowerCase();
    if (game.sylvara.defeated && !game.sealCollected) return "The Seal lies where Sylvara fell. Claim it before the blight regathers.";
    if (game.portalActive) return "The Portal is stable. Cross when you are ready; I will follow.";
    if (lowered.includes("scout") || lowered.includes("ahead")) return game.groves.some((grove) => !grove.purified) ? "The corrupted totems anchor the blight. I marked each grove on your path." : "The groves are clean. Finish the guardians and Sylvara will lose her shield.";
    if (lowered.includes("attack") || lowered.includes("strike")) return "I will keep the roots off your flank. Your blade must break Sylvara's heart-vines.";
    if (lowered.includes("protect") || lowered.includes("guard")) return "Stay mobile. I have your back, but the inheritance answers only to you.";
    return `We have purified ${game.groves.filter((grove) => grove.purified).length} of ${game.groves.length} groves. The forest remembers every step.`;
  }

  moveParty(input: { locationId: string }, opts: { actor: Actor }): { summary: string; proposal?: Proposal } {
    const world = this.require();
    const place = world.adventure.map.find((location) => location.entityId === input.locationId);
    if (!place?.unlocked) throw new Error("That destination is still locked.");
    const location = world.entities[input.locationId];
    if (!location) throw new Error("Unknown destination.");
    const now = Date.now();
    const patch = { type: "move_party" as const, payload: input };
    const summary = `Party travels to ${location.name}.`;
    if (opts.actor === "agent") {
      const proposal: Proposal = { id: makeId("prp"), createdAt: now, toolName: "move_party", summary, patch, level: "soft", status: "pending" };
      const next = produce(world, (draft) => { draft.proposals.unshift(proposal); });
      this.commit(next, { id: makeId("act"), at: now, actor: "agent", toolName: "move_party", summary, data: { proposalId: proposal.id } });
      return { summary, proposal };
    }
    const next = produce(world, (draft) => { applyPatch(draft, patch, now); });
    this.commit(next, { id: makeId("act"), at: now, actor: opts.actor, toolName: "move_party", summary });
    return { summary };
  }

  recruitPartyMember(input: { entityId: string; archetype: string }, opts: { actor: Actor }): { summary: string; proposal?: Proposal } {
    const world = this.require(); const entity = world.entities[input.entityId];
    if (!entity?.tags.includes("recruitable")) throw new Error("That character is not available to recruit.");
    if (world.adventure.party.some((member) => member.entityId === entity.id)) throw new Error(`${entity.name} is already in the party.`);
    const now = Date.now(); const patch = { type: "recruit_party_member" as const, payload: { entityId: entity.id, role: "specialist" as const, agentControlled: true, archetype: input.archetype, disposition: entity.summary.split(".")[0] ?? "Watchful", memory: entity.secrets.slice(0, 1) } };
    const summary = `${entity.name} joins the party as ${input.archetype}.`;
    if (opts.actor === "agent") { const proposal: Proposal = { id: makeId("prp"), createdAt: now, toolName: "recruit_party_member", summary, patch, level: "soft", status: "pending" }; const next = produce(world, (draft) => { draft.proposals.unshift(proposal); }); this.commit(next, { id: makeId("act"), at: now, actor: "agent", toolName: "recruit_party_member", summary, data: { proposalId: proposal.id } }); return { summary, proposal }; }
    const next = produce(world, (draft) => { applyPatch(draft, patch, now); }); this.commit(next, { id: makeId("act"), at: now, actor: opts.actor, toolName: "recruit_party_member", summary }); return { summary };
  }

  advanceQuestStage(input: { action: string; valueChoice?: "mercy" | "truth" | "leverage" }, opts: { actor: Actor }): { summary: string; proposal?: Proposal } {
    const world = this.require(); const stage = this.getActiveQuestStage();
    if (!stage || stage.state !== "active") throw new Error("There is no active quest stage.");
    const now = Date.now(); const patch = { type: "advance_quest_stage" as const, payload: input };
    const summary = `${stage.title} resolved: ${input.action}`;
    if (opts.actor === "agent") { const proposal: Proposal = { id: makeId("prp"), createdAt: now, toolName: "advance_quest_stage", summary, patch, level: "soft", status: "pending" }; const next = produce(world, (draft) => { draft.proposals.unshift(proposal); }); this.commit(next, { id: makeId("act"), at: now, actor: "agent", toolName: "advance_quest_stage", summary, data: { proposalId: proposal.id } }); return { summary, proposal }; }
    const next = produce(world, (draft) => { applyPatch(draft, patch, now); }); this.commit(next, { id: makeId("act"), at: now, actor: opts.actor, toolName: "advance_quest_stage", summary }); return { summary };
  }

  searchMemory(
    query: string,
    opts?: { kinds?: EntityKind[]; includeSecrets?: boolean },
  ): MemoryHit[] {
    return searchMemory(this.require(), query, opts);
  }

  getEntity(id: string): Entity | undefined {
    return this.require().entities[id];
  }

  checkContinuity(action: ProposedAction): ContinuityReport {
    return checkContinuity(this.require(), action);
  }

  generateNpc(
    input: GenerateNpcInput,
    opts: { actor: Actor },
  ): { entity: Entity; proposal?: Proposal; summary: string; warnings: string[] } {
    const world = this.require();
    const report = checkContinuity(world, { type: "create_character", input });
    if (!report.ok) {
      throw new Error(report.blockers.join(" "));
    }
    const now = Date.now();
    const rawName = input.name?.trim() || displayName(input.role, world.id + input.role);
    const names = Object.values(world.entities)
      .filter((e) => e.kind === "character")
      .map((e) => e.name);
    const uniq = uniqueName(rawName, names);
    const warnings = [...report.warnings];
    if (uniq.warning) warnings.push(uniq.warning);

    const entity: Entity = {
      id: makeId("chr"),
      kind: "character",
      name: uniq.name,
      summary: `${input.role} in ${world.name}. ${world.tone.adjectives.join(", ")} tone.`,
      tags: Array.from(new Set([...(input.tags ?? []), "npc", ...input.role.split(" ").slice(0, 2)])),
      secrets: input.secret ? [input.secret] : [],
      status: "alive",
      createdAt: now,
      updatedAt: now,
    };

    let relation: Relation | undefined;
    if (input.relationship) {
      relation = {
        id: makeId("rel"),
        fromId: entity.id,
        toId: input.relationship.toId,
        kind: input.relationship.kind,
        note: input.relationship.note,
      };
    } else if (input.locationId) {
      relation = {
        id: makeId("rel"),
        fromId: entity.id,
        toId: input.locationId,
        kind: "located_in",
      };
    }

    const summary = `NPC ${entity.name} (${input.role}) ${opts.actor === "agent" ? "proposed" : "created"}.`;

    if (opts.actor === "agent") {
      const proposal: Proposal = {
        id: makeId("prp"),
        createdAt: now,
        toolName: "generate_npc",
        summary,
        patch: { type: "create_entity", payload: { entity, relation } },
        level: "soft",
        status: "pending",
      };
      const next = produce(world, (draft) => {
        draft.proposals.unshift(proposal);
      });
      const change: ActivityEntry = {
        id: makeId("act"),
        at: now,
        actor: "agent",
        toolName: "generate_npc",
        summary,
        data: { proposalId: proposal.id, entityId: entity.id },
      };
      this.commit(next, change);
      return { entity, proposal, summary, warnings };
    }

    const next = produce(world, (draft) => {
      applyPatch(draft, { type: "create_entity", payload: { entity, relation } }, now);
    });
    const change: ActivityEntry = {
      id: makeId("act"),
      at: now,
      actor: opts.actor,
      toolName: "generate_npc",
      summary,
      data: { entityId: entity.id },
    };
    this.commit(next, change);
    return { entity, summary, warnings };
  }

  updateEntity(
    input: UpdateEntityInput,
    opts: { actor: Actor },
  ): { entity?: Entity; proposal?: Proposal; summary: string } {
    const world = this.require();
    const report = checkContinuity(world, { type: "update_entity", input });
    if (!report.ok) {
      throw new Error(report.blockers.join(" "));
    }
    const current = world.entities[input.id];
    if (!current) throw new Error(`Unknown entity ${input.id}`);
    const now = Date.now();
    const tags = new Set(current.tags);
    input.tagsAdd?.forEach((t) => tags.add(t));
    input.tagsRemove?.forEach((t) => tags.delete(t));
    const changes = {
      name: input.name ?? current.name,
      summary: input.summary ?? current.summary,
      status: input.status ?? current.status,
      tags: Array.from(tags),
      secrets: input.secretAdd ? [...current.secrets, input.secretAdd] : current.secrets,
    };
    const summary = `Update ${current.name}: ${Object.keys(input).filter((k) => k !== "id").join(", ") || "fields"}.`;
    const patch = { type: "update_entity" as const, payload: { id: input.id, changes } };

    if (opts.actor === "agent") {
      const proposal: Proposal = {
        id: makeId("prp"),
        createdAt: now,
        toolName: "update_entity",
        summary,
        patch,
        level: "soft",
        status: "pending",
      };
      const next = produce(world, (draft) => {
        draft.proposals.unshift(proposal);
      });
      this.commit(next, {
        id: makeId("act"),
        at: now,
        actor: "agent",
        toolName: "update_entity",
        summary,
        data: { proposalId: proposal.id },
      });
      return { proposal, summary };
    }

    const next = produce(world, (draft) => {
      applyPatch(draft, patch, now);
    });
    this.commit(next, {
      id: makeId("act"),
      at: now,
      actor: opts.actor,
      toolName: "update_entity",
      summary,
      data: { id: input.id, warnings: report.warnings },
    });
    return { entity: next.entities[input.id], summary };
  }

  advanceScene(
    input: AdvanceSceneInput,
    opts: { actor: Actor },
  ): { scene?: Scene; proposal?: Proposal; summary: string } {
    const world = this.require();
    if (input.proposalId) {
      return {
        scene: this.applyProposal(input.proposalId).currentScene,
        summary: `Accepted proposal ${input.proposalId}.`,
      };
    }
    const report = checkContinuity(world, { type: "advance_scene", input });
    if (!report.ok) throw new Error(report.blockers.join(" "));
    const now = Date.now();
    const payload = {
      title: input.title ?? `Scene ${world.currentScene.tick + 1}`,
      locationId: input.locationId ?? world.currentScene.locationId,
      beat: input.beat ?? "Time moves forward.",
      presentEntityIds: input.presentEntityIds ?? world.currentScene.presentEntityIds,
      openQuestions: input.openQuestions ?? world.currentScene.openQuestions,
    };
    const summary = `Advance to "${payload.title}".`;
    const patch = { type: "advance_scene" as const, payload };

    if (opts.actor === "agent") {
      const proposal: Proposal = {
        id: makeId("prp"),
        createdAt: now,
        toolName: "advance_scene",
        summary,
        patch,
        level: "soft",
        status: "pending",
      };
      const next = produce(world, (draft) => {
        draft.proposals.unshift(proposal);
      });
      this.commit(next, {
        id: makeId("act"),
        at: now,
        actor: "agent",
        toolName: "advance_scene",
        summary,
        data: { proposalId: proposal.id },
      });
      return { proposal, summary };
    }

    const next = produce(world, (draft) => {
      applyPatch(draft, patch, now);
    });
    this.commit(next, {
      id: makeId("act"),
      at: now,
      actor: opts.actor,
      toolName: "advance_scene",
      summary,
    });
    return { scene: next.currentScene, summary };
  }

  proposePlotBranch(input?: { count?: 2 | 3 }, opts?: { actor: Actor }): Proposal[] {
    const world = this.require();
    const now = Date.now();
    const count = input?.count ?? 3;
    const actor = opts?.actor ?? "agent";
    const locId = world.currentScene.locationId;
    const locations = Object.values(world.entities).filter((e) => e.kind === "location");
    const otherLoc = locations.find((l) => l.id !== locId) ?? locations[0];
    const rivalRel = world.relations.find((r) => r.kind === "rivals");
    const rival = rivalRel ? world.entities[rivalRel.fromId] : undefined;
    const present = world.currentScene.presentEntityIds[0];
    const presentEnt = present ? world.entities[present] : undefined;
    const secretHook = presentEnt?.secrets[0]
      ? `a secret about ${presentEnt.name}`
      : "an unpaid ledger";

    const drafts: { title: string; beat: string; locationId: string | null }[] = [
      {
        title: rival
          ? `${rival.name} makes a move`
          : "Unseen pressure at the docks",
        beat: rival
          ? `${rival.name} forces a confrontation at the current scene. Political, not cartoon-evil.`
          : "A delayed grain fleet and a whispered price appear at the current location.",
        locationId: locId,
      },
      {
        title: "The secret surfaces",
        beat: `Someone alludes to ${secretHook} without stating it outright. The open question tightens.`,
        locationId: locId,
      },
      {
        title: otherLoc ? `To ${otherLoc.name}` : "A change of ground",
        beat: otherLoc
          ? `The scene shifts to ${otherLoc.name}. What could not be said in public might be said here.`
          : "They leave the current room.",
        locationId: otherLoc?.id ?? locId,
      },
    ].slice(0, count);

    const proposals: Proposal[] = drafts.map((d) => ({
      id: makeId("prp"),
      createdAt: now,
      toolName: "propose_plot_branch",
      summary: d.title,
      patch: {
        type: "advance_scene",
        payload: {
          title: d.title,
          locationId: d.locationId,
          beat: d.beat,
          presentEntityIds: world.currentScene.presentEntityIds,
          openQuestions: world.currentScene.openQuestions,
        },
      },
      level: "soft",
      status: "pending",
    }));

    const next = produce(world, (draft) => {
      draft.proposals.unshift(...proposals);
    });
    this.commit(next, {
      id: makeId("act"),
      at: now,
      actor,
      toolName: "propose_plot_branch",
      summary: `Proposed ${proposals.length} next scenes.`,
      data: { ids: proposals.map((p) => p.id) },
    });
    return proposals;
  }

  playAsCharacter(
    input: { characterId: string; intent: string },
    opts: { actor: Actor },
  ): { line: string; event: WorldEvent; proposal?: Proposal; summary: string } {
    const world = this.require();
    const character = world.entities[input.characterId];
    if (!character || character.kind !== "character") {
      throw new Error("characterId must be an existing character");
    }
    const now = Date.now();
    const q = world.currentScene.openQuestions[0];
    const line = `${character.name} (${character.tags.join(", ") || "untagged"}): ${input.intent.trim()} — ${character.summary.split(".")[0]}.${q ? ` They circle the question: ${q}` : ""}`;
    const event: WorldEvent = {
      id: makeId("evt"),
      at: world.currentScene.tick,
      sceneId: world.currentScene.id,
      title: `${character.name} acts`,
      body: line,
      entityIds: [character.id],
      source: opts.actor === "system" ? "system" : opts.actor,
    };
    const summary = line;
    const patch = { type: "log_event" as const, payload: event };

    if (opts.actor === "agent") {
      const proposal: Proposal = {
        id: makeId("prp"),
        createdAt: now,
        toolName: "play_as_character",
        summary: `${character.name} would speak/act.`,
        patch,
        level: "soft",
        status: "pending",
      };
      const next = produce(world, (draft) => {
        draft.proposals.unshift(proposal);
      });
      this.commit(next, {
        id: makeId("act"),
        at: now,
        actor: "agent",
        toolName: "play_as_character",
        summary: proposal.summary,
        data: { proposalId: proposal.id },
      });
      return { line, event, proposal, summary };
    }

    const next = produce(world, (draft) => {
      applyPatch(draft, patch, now);
    });
    this.commit(next, {
      id: makeId("act"),
      at: now,
      actor: opts.actor,
      toolName: "play_as_character",
      summary,
    });
    return { line, event, summary };
  }

  applyWorldRule(
    input: { text: string; severity: "soft" | "hard" },
    opts: { actor: Actor },
  ): WorldRule {
    const world = this.require();
    const now = Date.now();
    const next = produce(world, (draft) => {
      applyPatch(
        draft,
        { type: "add_rule", payload: { text: input.text, severity: input.severity } },
        now,
      );
    });
    const rule = next.rules[next.rules.length - 1]!;
    this.commit(next, {
      id: makeId("act"),
      at: now,
      actor: opts.actor,
      toolName: "apply_world_rule",
      summary: `Added ${input.severity} rule: ${input.text}`,
    });
    return rule;
  }

  applyProposal(id: string): WorldSnapshot {
    const world = this.require();
    const proposal = world.proposals.find((p) => p.id === id);
    if (!proposal) throw new Error(`Unknown proposal ${id}`);
    if (proposal.status !== "pending" && proposal.status !== "edited") {
      throw new Error(`Proposal ${id} is ${proposal.status}`);
    }
    const now = Date.now();
    const next = produce(world, (draft) => {
      applyPatch(draft, proposal.patch, now);
      const p = draft.proposals.find((x) => x.id === id);
      if (p) p.status = "accepted";
    });
    return this.commit(next, {
      id: makeId("act"),
      at: now,
      actor: "human",
      summary: `Accepted: ${proposal.summary}`,
      data: { proposalId: id },
    });
  }

  rejectProposal(id: string): void {
    const world = this.require();
    const proposal = world.proposals.find((p) => p.id === id);
    if (!proposal) throw new Error(`Unknown proposal ${id}`);
    const now = Date.now();
    const next = produce(world, (draft) => {
      const p = draft.proposals.find((x) => x.id === id);
      if (p) p.status = "rejected";
    });
    this.commit(next, {
      id: makeId("act"),
      at: now,
      actor: "human",
      summary: `Rejected: ${proposal.summary}`,
    });
  }

  addLocation(
    input: { name: string; summary: string },
    opts: { actor: Actor },
  ): Entity {
    const world = this.require();
    const now = Date.now();
    const entity: Entity = {
      id: makeId("loc"),
      kind: "location",
      name: input.name,
      summary: input.summary,
      tags: ["location"],
      secrets: [],
      status: "active",
      createdAt: now,
      updatedAt: now,
    };
    const next = produce(world, (draft) => {
      applyPatch(draft, { type: "create_entity", payload: { entity } }, now);
    });
    this.commit(next, {
      id: makeId("act"),
      at: now,
      actor: opts.actor,
      summary: `Added location ${entity.name}.`,
    });
    return entity;
  }
}
