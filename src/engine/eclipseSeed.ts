import type { Entity, QuestStage, WorldSnapshot } from "../types/world";
import { createStageGameplay } from "./campaign";

const locationIds = ["loc_emberwood", "loc_archives", "loc_forge", "loc_veilspire", "loc_citadel"];

function entity(
  id: string,
  kind: Entity["kind"],
  name: string,
  summary: string,
  tags: string[],
  now: number,
  secrets: string[] = [],
): Entity {
  return { id, kind, name, summary, tags, secrets, status: kind === "character" ? "alive" : "active", createdAt: now, updatedAt: now };
}

export function createEclipseWorld(now = Date.now()): WorldSnapshot {
  const stages: QuestStage[] = [
    { id: "quest_roots", index: 0, title: "The Seal of Roots", objective: "Purify the groves, defeat Sylvara, and claim the Seal of Roots.", locationId: locationIds[0]!, completionHints: ["Cleanse three blight totems", "Defeat Sylvara", "Collect the Seal", "Enter the Portal"], state: "active", reward: "Seal of Roots" },
    { id: "quest_memory", index: 1, title: "The Seal of Memory", objective: "Reconstruct the true history beneath the flooded library.", locationId: locationIds[1]!, completionHints: ["Free Lira", "Confront Nihil"], state: "locked", reward: "Seal of Memory" },
    { id: "quest_iron", index: 2, title: "The Seal of Iron", objective: "Break the slave-forges and expose the forge-lord's core.", locationId: locationIds[2]!, completionHints: ["Free Rook", "Quench the Heart Forge"], state: "locked", reward: "Seal of Iron" },
    { id: "quest_winds", index: 3, title: "The Seal of Winds", objective: "Calm the eternal storm above Veilspire.", locationId: locationIds[3]!, completionHints: ["Find Kael", "Purify the shrines"], state: "locked", reward: "Seal of Winds" },
    { id: "quest_eclipse", index: 4, title: "The Seal of Dominion", objective: "Break the eclipse and defeat Lord Aurelian Voss.", locationId: locationIds[4]!, completionHints: ["Defeat Malrik", "Confront Voss"], state: "locked", reward: "The restored inheritance" },
  ];

  const entities = [
    entity(locationIds[0]!, "location", "Emberwood Glade", "A sacred forest poisoned by green-black blight, surrounding the ruins of the heir's childhood village.", ["forest", "stage-1", "blighted"], now),
    entity(locationIds[1]!, "location", "Drowned Archives", "A sunken library-city where ink tendrils erase names from history.", ["library", "stage-2", "flooded"], now),
    entity(locationIds[2]!, "location", "Crimson Forge", "A volcanic prison-forge fed by enslaved hands and rivers of fire.", ["forge", "stage-3", "volcanic"], now),
    entity(locationIds[3]!, "location", "Veilspire Peaks", "Storm-wracked temples suspended among pale clouds and broken winds.", ["mountain", "stage-4", "storm"], now),
    entity(locationIds[4]!, "location", "Eclipse Citadel", "Voss's living-shadow fortress beneath a permanent eclipse.", ["citadel", "stage-5", "eclipse"], now),
    entity("chr_heir", "character", "The Last Heir", "The final child of the bloodline that guarded the five Eclipse Seals.", ["player", "major", "heir"], now),
    entity("chr_voss", "character", "Lord Aurelian Voss", "The betrayer who murdered the heir's parents and seeks godhood through the five Seals.", ["villain", "major", "final-boss"], now, ["He fears the restored power of the united Seals."]),
    entity("chr_sylvara", "character", "Sylvara the Blightweaver", "Voss's forest lieutenant and corrupted keeper of the Seal of Roots.", ["boss", "stage-1"], now),
    entity("chr_elias", "character", "Elias", "A wary ranger whose village burned during Voss's purge; he hunts the blight with leaf and bow.", ["companion", "recruitable", "ranger"], now),
    entity("chr_lira", "character", "Lira", "A scholar-mage imprisoned inside a living Memory Crystal.", ["companion", "recruitable", "mage"], now),
    entity("chr_rook", "character", "Rook", "A stone guardian with a molten heart and an unbreakable instinct to protect.", ["companion", "recruitable", "tank"], now),
    entity("chr_kael", "character", "Kael", "A sky-monk who shapes the wind into blades and shields.", ["companion", "recruitable", "monk"], now),
    entity("itm_roots", "item", "Seal of Roots", "The first Eclipse Seal, pulsing with the memory of the First Tree.", ["seal", "stage-1"], now),
    entity("thd_inheritance", "thread", "Eclipse Inheritance", "Reclaim all five Seals, restore the stolen bloodline power, and stop Voss's ascension.", ["main-quest"], now),
  ].reduce<Record<string, Entity>>((all, item) => ({ ...all, [item.id]: item }), {});

  return {
    version: 1,
    id: "wld_eclipse_inheritance",
    name: "Eclipse Inheritance",
    premise: "The last heir must reclaim five corrupted Eclipse Seals, restore their stolen power, and confront Lord Aurelian Voss.",
    tone: { genre: "mythic fantasy adventure", adjectives: ["heroic", "haunted", "hopeful"] },
    entities,
    relations: [
      { id: "rel_heir_emberwood", fromId: "chr_heir", toId: locationIds[0]!, kind: "located_in" },
      { id: "rel_sylvara_roots", fromId: "chr_sylvara", toId: "itm_roots", kind: "owns" },
      { id: "rel_elias_voss", fromId: "chr_elias", toId: "chr_voss", kind: "rivals" },
    ],
    events: [{ id: "evt_return", at: 0, sceneId: "scn_emberwood", title: "The heir returns", body: "The last heir steps into the ruins of home as the corrupted roots begin to stir.", entityIds: ["chr_heir", locationIds[0]!], source: "system" }],
    rules: [
      { id: "rul_canon", text: "Agent actions must be proposed and confirmed before changing canonical world state.", severity: "hard", createdAt: now },
      { id: "rul_portal", text: "A stage Portal activates only after its boss is defeated and its Seal is collected.", severity: "hard", createdAt: now },
    ],
    currentScene: { id: "scn_emberwood", title: "Return to Emberwood", locationId: locationIds[0]!, presentEntityIds: ["chr_heir", "chr_elias", "chr_sylvara"], openQuestions: ["Can the First Tree be saved?", "Why did Voss spare the heir as a child?"], tick: 0 },
    proposals: [],
    activity: [{ id: "act_loaded", at: now, actor: "system", summary: "Loaded Eclipse Inheritance." }],
    adventure: {
      playerId: "chr_heir",
      party: [{ entityId: "chr_heir", role: "player", agentControlled: false, archetype: "Eclipse Heir", disposition: "Determined, compassionate", memory: ["Voss stole the bloodline's power on the night the family fell."] }],
      map: locationIds.map((entityId, index) => ({ entityId, x: 12 + index * 20, y: 68 - index * 11, unlocked: index === 0, visited: index === 0, stage: index })),
      quest: { title: "Eclipse Inheritance", stageIndex: 0, stages },
    },
    gameplay: createStageGameplay(1, [
      { id: "wpn_heir_sword", name: "Heir's Crystal Sword", kind: "weapon", icon: "⚔", description: "A short sword with a blue crystal pommel." },
      { id: "wpn_root_bow", name: "Rootstring Bow", kind: "weapon", icon: "➶", description: "A living bow grown from an uncorrupted root." },
    ]),
  };
}
