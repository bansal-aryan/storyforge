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
  CampaignStage,
} from "../types/world";
import { createStageGameplay, STAGES } from "./campaign";
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
        const nextStage = (game.stage + 1) as CampaignStage;
        const nextDefinition = STAGES[nextStage];
        summary = `The heir enters the Portal. ${nextDefinition.biome.name} awakens beyond it.`;
        const current = draft.adventure.quest.stages[game.stage - 1];
        const following = draft.adventure.quest.stages[nextStage - 1];
        if (current) current.state = "complete";
        if (following) following.state = "active";
        draft.adventure.quest.stageIndex = nextStage - 1;
        if (draft.adventure.map[nextStage - 1]) { draft.adventure.map[nextStage - 1]!.unlocked = true; draft.adventure.map[nextStage - 1]!.visited = true; }
        draft.currentScene = { ...draft.currentScene, id: makeId("scn"), title: `Arrival in ${nextDefinition.biome.name}`, locationId: following?.locationId ?? null, tick: draft.currentScene.tick + 1 };
        const inventory = [...game.inventory];
        const equippedWeapon = game.player.weaponId;
        draft.gameplay = createStageGameplay(nextStage, inventory, game.player.maxHp);
        if (inventory.some((item) => item.id === equippedWeapon)) draft.gameplay.player.weaponId = equippedWeapon;
        return;
      }

      if (game.boss.defeated && !game.sealCollected && near(game.boss, 48)) {
        type = "seal";
        summary = `${game.seal.name} is claimed.`;
        game.sealCollected = true;
        if (!game.inventory.some((item) => item.id === game.seal.id)) game.inventory.push({ id: game.seal.id, name: game.seal.name, kind: "seal", icon: game.seal.icon, description: `A restored Eclipse Seal claimed in ${game.biome.name}.` });
        if (game.stage === 5) {
          game.campaignComplete = true;
          game.stageComplete = true;
          game.objective = "The eclipse is broken. Dawn returns.";
          game.storyLine = "Five Seals answer as one. Voss's stolen godhood shatters, and the first sunrise in a generation touches the Citadel.";
          const finalStage = draft.adventure.quest.stages[4];
          if (finalStage) finalStage.state = "complete";
        } else {
          game.portalActive = true;
          game.objective = "Enter the awakened Portal.";
          game.storyLine = `${game.seal.name} settles into your palm and ignites the way to the next realm.`;
        }
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

      const objective = game.objectives.find((candidate) => !candidate.completed && near(candidate, 34));
      if (objective) {
        type = "objective";
        objective.completed = true;
        const count = game.objectives.filter((candidate) => candidate.completed).length;
        summary = `${objective.label} is restored.`;
        game.storyLine = `${objective.label} answers the heir. One more chain on ${game.boss.name} begins to break.`;
        game.pendingBlessing = true;
        game.objective = count === game.objectives.length ? `Clear the remaining guardians and confront ${game.boss.name}.` : `Complete the remaining stage objectives (${game.objectives.length - count} left).`;
        game.boss.awakened = count === game.objectives.length && game.enemies.every((enemy) => !enemy.alive);
        if (game.boss.awakened) { game.boss.intent = "idle"; game.boss.attackReadyAt = Date.now() + 900; }
        return;
      }

      if (!game.companion.recruited && near(game.companion, 38)) {
        type = "companion";
        summary = `${game.companion.name} joins the heir's quest.`;
        game.companion.recruited = true;
        game.storyLine = `${game.companion.name} recognizes the restored Seal and pledges their strength to the final hunt.`;
        if (!draft.adventure.party.some((member) => member.entityId === game.companion.id)) {
          draft.adventure.party.push({ entityId: game.companion.id, role: "companion", agentControlled: true, archetype: game.companion.role, disposition: "Resolute, loyal", memory: [`Joined the heir in ${game.biome.name}.`] });
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
        const ready = game.objectives.every((grove) => grove.completed) && game.enemies.every((candidate) => !candidate.alive);
        game.boss.awakened = game.boss.awakened || ready;
        if (ready) {
          game.boss.intent = "idle";
          game.boss.attackReadyAt = Date.now() + 900;
          game.objective = `Defeat ${game.boss.name} ${game.boss.title}.`;
          game.storyLine = `The last guardian falls. ${game.boss.name} enters the battlefield.`;
        }
        return;
      }
      if (!game.boss.defeated && near(game.boss, 60)) {
        if (!game.boss.awakened) {
          type = "blocked";
          summary = `${game.boss.name} remains shielded. Complete the three objectives and defeat their guardians first.`;
          game.storyLine = summary;
          return;
        }
        type = "boss";
        const bossDamage = (game.player.weaponId === "wpn_ember_axe" ? 2 : 1) + (options.heavy ? 1 : 0) + (game.blessings.includes("fury") ? 1 : 0);
        game.boss.hp = Math.max(0, game.boss.hp - bossDamage);
        game.boss.phase = game.boss.hp <= game.boss.maxHp / 3 ? 3 : game.boss.hp <= (game.boss.maxHp * 2) / 3 ? 2 : 1;
        game.player.essence = Math.max(0, game.player.essence - (options.heavy ? 14 : 6));
        if (game.boss.hp === 0) {
          game.boss.defeated = true;
          summary = `${game.boss.name} falls, leaving ${game.seal.name} exposed.`;
          game.objective = `Collect ${game.seal.name} from ${game.boss.name} (E).`;
        } else {
          summary = `${game.boss.name} reels. ${game.boss.hp}/${game.boss.maxHp} strength remains.`;
          game.objective = `Defeat ${game.boss.name} ${game.boss.title}.`;
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
      if (blessing === "bond") { state.companion.maxHp += 20; state.companion.hp = Math.min(state.companion.maxHp, state.companion.hp + 20); }
      state.storyLine = { vigor: "The First Tree strengthens the heir's living blood.", fury: "Root-fire gathers along every weapon edge.", wind: "The forest wind lightens the heir's step.", bond: "The blessing binds heir and ranger more closely." }[blessing];
    });
    this.commit(next, { id: makeId("act"), at: Date.now(), actor: "human", toolName: "choose_blessing", summary: `The heir accepts the blessing of ${blessing}.` });
  }

  setCompanionMode(
    mode: "follow" | "focus" | "guard" | "hold",
    opts: { actor: Actor } = { actor: "human" },
  ): { mode: "follow" | "focus" | "guard" | "hold"; summary: string } {
    const world = this.require();
    const game = this.requireStageOne();
    if (!game.companion.recruited) throw new Error(`${game.companion.name} must be recruited before receiving tactical commands.`);
    if (game.companion.hp <= 0) throw new Error(`${game.companion.name} is wounded and cannot change tactics yet.`);
    const summary = `${game.companion.name} changes stance to ${mode}.`;
    const next = produce(world, (draft) => { draft.gameplay!.companion.mode = mode; });
    this.commit(next, { id: makeId("act"), at: Date.now(), actor: opts.actor, toolName: "command_companion", summary, data: { mode } });
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
      companion: { name: game.companion.name, role: game.companion.role, recruited: game.companion.recruited, hp: game.companion.hp, maxHp: game.companion.maxHp, mode: game.companion.mode },
      objectives: { completed: game.objectives.filter((objective) => objective.completed).length, total: game.objectives.length },
      enemies: activeEnemies,
      boss: { name: game.boss.name, title: game.boss.title, awakened: game.boss.awakened, defeated: game.boss.defeated, hp: game.boss.hp, maxHp: game.boss.maxHp, phase: game.boss.phase, intent: game.boss.intent },
      sealCollected: game.sealCollected,
      portalActive: game.portalActive,
      collectibleWeapons: game.weaponPickups.filter((pickup) => !pickup.collected).map((pickup) => pickup.item.name),
    };
  }

  getNextObjectiveGuidance(): { objective: string; recommendedAction: string; reason: string } {
    const game = this.requireStageOne();
    if (game.campaignComplete) return { objective: game.objective, recommendedAction: "Witness the restored dawn.", reason: "All five Eclipse Seals are united and Voss is defeated." };
    if (game.portalActive) return { objective: game.objective, recommendedAction: "Enter the glowing Portal in the northeast.", reason: `${game.boss.name} is defeated and ${game.seal.name} is secured.` };
    if (game.boss.defeated && !game.sealCollected) return { objective: game.objective, recommendedAction: `Collect ${game.seal.name} where ${game.boss.name} fell.`, reason: game.stage === 5 ? "The five Seals can now end the eclipse." : "The Portal cannot activate until the Seal is claimed." };
    if (game.boss.awakened) return { objective: game.objective, recommendedAction: game.companion.recruited ? `Set ${game.companion.name} to focus, dodge the telegraph, and strike ${game.boss.name}.` : `Recruit ${game.companion.name}, then confront ${game.boss.name}.`, reason: `${game.boss.name} is exposed in phase ${game.boss.phase}.` };
    const incomplete = game.objectives.find((objective) => !objective.completed);
    if (incomplete) return { objective: game.objective, recommendedAction: `Travel to ${incomplete.label} and complete its ritual.`, reason: `${game.objectives.filter((objective) => objective.completed).length} of ${game.objectives.length} stage objectives are complete.` };
    return { objective: game.objective, recommendedAction: "Defeat the remaining guardians.", reason: `${game.enemies.filter((enemy) => enemy.alive).length} guardians still anchor ${game.boss.name}'s shield.` };
  }

  combatTick(input: { player: { x: number; y: number }; companion: { x: number; y: number }; dodging: boolean; now: number }): void {
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
        } else state.companion.hp = Math.max(0, state.companion.hp - amount);
        changed = true;
      };
      for (const enemy of state.enemies) {
        if (!enemy.alive) continue;
        const playerDistance = Math.hypot(enemy.x - input.player.x, enemy.y - input.player.y);
        const eliasAvailable = state.companion.recruited && state.companion.hp > 0 && state.companion.mode === "guard";
        const eliasDistance = Math.hypot(enemy.x - input.companion.x, enemy.y - input.companion.y);
        const target: "player" | "elias" = eliasAvailable && eliasDistance < playerDistance + 70 ? "elias" : "player";
        const targetPoint = target === "player" ? input.player : input.companion;
        const distance = target === "player" ? playerDistance : eliasDistance;
        const melee = enemy.kind === "wolf" || enemy.kind === "forge" || enemy.kind === "sentinel" || enemy.kind === "acolyte" || enemy.kind === "knight";
        if (enemy.intent === "windup" && input.now >= enemy.attackReadyAt) {
          if (distance < (melee ? 62 : 330)) damageTarget(target, melee ? 9 + state.stage : 10 + state.stage);
          enemy.intent = "recover"; enemy.attackReadyAt = input.now + (melee ? 700 : 1250); changed = true;
        } else if (enemy.intent === "recover" && input.now >= enemy.attackReadyAt) {
          enemy.intent = "idle"; changed = true;
        } else if (enemy.intent !== "windup" && enemy.intent !== "recover" && input.now >= enemy.attackReadyAt) {
          if (distance < (melee ? 54 : 310)) {
            enemy.intent = "windup"; enemy.attackReadyAt = input.now + (melee ? 430 : 780); changed = true;
          } else if (melee && distance < 430) {
            const step = 8; enemy.x += ((targetPoint.x - enemy.x) / distance) * step; enemy.y += ((targetPoint.y - enemy.y) / distance) * step; enemy.intent = "chase"; changed = true;
          }
        }
      }
      const boss = state.boss;
      if (boss.awakened && !boss.defeated) {
        if (boss.intent === "shielded") { boss.intent = "idle"; boss.attackReadyAt = input.now + 700; changed = true; }
        const playerDistance = Math.hypot(boss.x - input.player.x, boss.y - input.player.y);
        const eliasDistance = Math.hypot(boss.x - input.companion.x, boss.y - input.companion.y);
        const guardIntercepts = state.companion.recruited && state.companion.hp > 0 && state.companion.mode === "guard" && eliasDistance < playerDistance + 90;
        const bossTarget: "player" | "elias" = guardIntercepts ? "elias" : "player";
        const bossTargetPoint = bossTarget === "elias" ? input.companion : input.player;
        const targetDistance = bossTarget === "elias" ? eliasDistance : playerDistance;
        if ((boss.intent === "strike" || boss.intent === "summon") && input.now >= boss.attackReadyAt) {
          if (targetDistance < (boss.intent === "strike" ? 480 : 250)) damageTarget(bossTarget, boss.phase === 3 ? 18 + state.stage : 12 + state.stage);
          if (boss.intent === "summon") {
            const fallen = state.enemies.find((enemy) => !enemy.alive);
            if (fallen) {
              fallen.alive = true; fallen.hp = Math.min(3, fallen.maxHp); fallen.intent = "idle"; fallen.attackReadyAt = input.now + 800;
              fallen.x = boss.x - 95; fallen.y = boss.y + (boss.phase === 3 ? 75 : -75);
              state.storyLine = `${boss.name} tears a fallen guardian back into the fight.`;
            }
          }
          boss.intent = "idle"; boss.attackReadyAt = input.now + Math.max(700, 1550 - boss.phase * 220); changed = true;
        } else if (boss.intent === "idle" && input.now >= boss.attackReadyAt) {
          boss.intent = boss.phase === 1 ? "strike" : Math.floor(input.now / 1000) % 2 === 0 ? "summon" : "strike";
          boss.attackReadyAt = input.now + (boss.phase === 1 ? 950 : boss.phase === 2 ? 760 : 620); changed = true;
        } else if (boss.intent === "idle" && targetDistance > 285) {
          const distance = targetDistance || 1;
          const step = 5 + boss.phase * 2;
          boss.x += ((bossTargetPoint.x - boss.x) / distance) * step;
          boss.y += ((bossTargetPoint.y - boss.y) / distance) * step;
          changed = true;
        }
      }
      if (state.player.hp === 0) { state.player.hp = state.player.maxHp; state.player.x = 240; state.player.y = 720; state.storyLine = `The heir awakens at ${state.biome.name}'s threshold. The inheritance endures.`; }
    });
    if (changed) this.sync(next, "Combat state advances.");
  }

  companionCombatTick(position: { x: number; y: number }): { type: string; summary: string } {
    const world = this.require();
    const game = this.requireStageOne();
    if (!game.companion.recruited || game.companion.hp <= 0 || game.stageComplete) return { type: "idle", summary: `${game.companion.name} holds position.` };
    const candidates = game.enemies.filter((enemy) => enemy.alive).map((enemy) => ({ enemy, distance: Math.hypot(position.x - enemy.x, position.y - enemy.y) })).sort((a, b) => a.distance - b.distance);
    const target = candidates[0];
    const range = game.companion.mode === "focus" ? 330 : game.companion.mode === "hold" ? 270 : 210;
    const bossDistance = Math.hypot(position.x - game.boss.x, position.y - game.boss.y);
    const canShootBoss = game.boss.awakened && !game.boss.defeated && bossDistance <= (game.companion.mode === "focus" ? 430 : range);
    if (canShootBoss && (game.companion.mode === "focus" || !target || target.distance > range)) {
      const damage = game.blessings.includes("bond") ? 2 : 1;
      const next = produce(world, (draft) => {
        const boss = draft.gameplay!.boss;
        boss.hp = Math.max(0, boss.hp - damage);
        boss.phase = boss.hp <= boss.maxHp / 3 ? 3 : boss.hp <= (boss.maxHp * 2) / 3 ? 2 : 1;
        if (boss.hp === 0) { boss.defeated = true; draft.gameplay!.objective = `Collect ${draft.gameplay!.seal.name} from ${boss.name} (E).`; }
      });
      const summary = game.companion.mode === "focus" ? `${game.companion.name} focuses a decisive strike on ${game.boss.name}.` : `${game.companion.name} attacks ${game.boss.name} while the heir holds their attention.`;
      this.commit(next, { id: makeId("act"), at: Date.now(), actor: "system", toolName: "companion_attack", summary });
      return { type: "boss_shot", summary };
    }
    if (!target || target.distance > range) return { type: "idle", summary: `No enemy is within ${game.companion.name}'s attack range.` };
    let type = "shot";
    let summary = `${game.companion.name} strikes ${target.enemy.id}.`;
    const next = produce(world, (draft) => {
      const draftGame = draft.gameplay!;
      const enemy = draftGame.enemies.find((candidate) => candidate.id === target.enemy.id)!;
      enemy.hp = Math.max(0, enemy.hp - (draftGame.blessings.includes("bond") ? 2 : 1));
      enemy.alive = enemy.hp > 0;
      if (!enemy.alive) { type = "kill"; summary = `${draftGame.companion.name} drops a guardian with a clean strike.`; }
      if (target.distance < 48) {
        draftGame.companion.hp = Math.max(0, draftGame.companion.hp - 7);
        if (draftGame.companion.hp === 0) { type = "down"; summary = `${draftGame.companion.name} is wounded and can no longer fight.`; }
      }
      const ready = draftGame.objectives.every((grove) => grove.completed) && draftGame.enemies.every((candidate) => !candidate.alive);
      draftGame.boss.awakened = draftGame.boss.awakened || ready;
      if (ready) {
        draftGame.objective = `Defeat ${draftGame.boss.name} ${draftGame.boss.title}.`;
        if (draftGame.boss.intent === "shielded") { draftGame.boss.intent = "idle"; draftGame.boss.attackReadyAt = Date.now() + 900; }
      }
    });
    this.commit(next, { id: makeId("act"), at: Date.now(), actor: "system", toolName: "companion_attack", summary });
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
        draft.gameplay!.storyLine = `The heir falls back to ${draft.gameplay!.biome.name}'s threshold. The bloodline endures.`;
      } else {
        draft.gameplay!.storyLine = "The blighted swarm tears at your armor. Keep moving.";
      }
    });
    this.commit(next, { id: makeId("act"), at: Date.now(), actor: "system", summary: "The heir takes damage." });
  }

  getCompanionResponse(text: string): string {
    const game = this.requireStageOne();
    if (!game.companion.recruited) return `Find ${game.companion.name} in ${game.biome.name} before issuing companion commands.`;
    const lowered = text.toLowerCase();
    if (game.boss.defeated && !game.sealCollected) return `${game.seal.name} lies where ${game.boss.name} fell. Claim it before their power regathers.`;
    if (game.portalActive) return "The Portal is stable. Cross when you are ready; I will follow.";
    if (lowered.includes("scout") || lowered.includes("ahead")) return game.objectives.some((objective) => !objective.completed) ? `The remaining objectives are marked across ${game.biome.name}.` : `The objectives are complete. Finish the guardians and ${game.boss.name} will lose their shield.`;
    if (lowered.includes("attack") || lowered.includes("strike")) return `I will keep the enemy off your flank. Your weapon must break ${game.boss.name}'s final defense.`;
    if (lowered.includes("protect") || lowered.includes("guard")) return "Stay mobile. I have your back, but the inheritance answers only to you.";
    return `We have completed ${game.objectives.filter((objective) => objective.completed).length} of ${game.objectives.length} objectives in ${game.biome.name}.`;
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
