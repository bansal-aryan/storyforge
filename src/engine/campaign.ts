import type { CampaignStage, EnemyKind, InventoryItem, StageGameplay } from "../types/world";

type StageDefinition = {
  stage: CampaignStage;
  biome: StageGameplay["biome"];
  companion: Pick<StageGameplay["companion"], "id" | "name" | "role" | "weaponId">;
  boss: Pick<StageGameplay["boss"], "id" | "name" | "title" | "maxHp">;
  seal: StageGameplay["seal"];
  objectiveLabels: [string, string, string];
  enemyKinds: [EnemyKind, EnemyKind, EnemyKind, EnemyKind];
  opening: string;
  firstObjective: string;
  weapon: InventoryItem;
};

export const STAGES: Record<CampaignStage, StageDefinition> = {
  1: { stage: 1, biome: { name: "Emberwood Glade", subtitle: "The Seal of Roots", theme: "forest" }, companion: { id: "chr_elias", name: "Elias", role: "Ranger", weaponId: "wpn_elias_bow" }, boss: { id: "chr_sylvara", name: "Sylvara", title: "the Blightweaver", maxHp: 12 }, seal: { id: "itm_roots", name: "Seal of Roots", icon: "✦" }, objectiveLabels: ["West Grove", "South Grove", "Heart Grove"], enemyKinds: ["wolf", "wolf", "vine", "vine"], opening: "The roots whisper beneath the ruins of your childhood village.", firstObjective: "Purify the three Blighted Groves.", weapon: { id: "wpn_ember_axe", name: "Emberwood Axe", kind: "weapon", icon: "◆", description: "A woodsman's axe that staggers blighted foes." } },
  2: { stage: 2, biome: { name: "Drowned Archives", subtitle: "The Seal of Memory", theme: "archives" }, companion: { id: "chr_lira", name: "Lira", role: "Scholar-Mage", weaponId: "wpn_lira_staff" }, boss: { id: "chr_nihil", name: "Nihil", title: "the Name-Eater", maxHp: 16 }, seal: { id: "itm_memory", name: "Seal of Memory", icon: "◈" }, objectiveLabels: ["Hall of Names", "Sunken Scriptoria", "Forbidden Wing"], enemyKinds: ["ink", "wraith", "ink", "wraith"], opening: "Black water reflects shelves whose books have forgotten their authors.", firstObjective: "Restore the three Memory Codices.", weapon: { id: "wpn_tide_glaive", name: "Tideglass Glaive", kind: "weapon", icon: "◇", description: "A drowned archivist's blade that cuts ink-wraiths." } },
  3: { stage: 3, biome: { name: "Crimson Forge", subtitle: "The Seal of Iron", theme: "forge" }, companion: { id: "chr_rook", name: "Rook", role: "Golem Vanguard", weaponId: "wpn_rook_fists" }, boss: { id: "chr_ferrox", name: "Ferrox", title: "the Chain-Smith", maxHp: 20 }, seal: { id: "itm_iron", name: "Seal of Iron", icon: "⬢" }, objectiveLabels: ["Northern Vents", "Slave Pens", "Master Smithy"], enemyKinds: ["forge", "sentinel", "forge", "sentinel"], opening: "Every hammer-blow below the mountain sounds like a prisoner calling for dawn.", firstObjective: "Quench the three Infernal Forges.", weapon: { id: "wpn_cinder_hammer", name: "Cinder Hammer", kind: "weapon", icon: "▣", description: "A freed smith's hammer forged to crack living armor." } },
  4: { stage: 4, biome: { name: "Veilspire Peaks", subtitle: "The Seal of Winds", theme: "peaks" }, companion: { id: "chr_kael", name: "Kael", role: "Sky-Monk", weaponId: "wpn_kael_wind" }, boss: { id: "chr_tempest", name: "Astrax", title: "the Bound Tempest", maxHp: 24 }, seal: { id: "itm_winds", name: "Seal of Winds", icon: "✧" }, objectiveLabels: ["Lower Shrine", "Cloud Monastery", "Central Spire"], enemyKinds: ["storm", "acolyte", "storm", "acolyte"], opening: "Broken temples circle the mountain while lightning climbs upward into the eclipse.", firstObjective: "Calm the three Tempest Shrines.", weapon: { id: "wpn_sky_blades", name: "Skyglass Blades", kind: "weapon", icon: "⌁", description: "Paired blades that hold an edge against the wind." } },
  5: { stage: 5, biome: { name: "Eclipse Citadel", subtitle: "The Seal of Dominion", theme: "citadel" }, companion: { id: "chr_elias", name: "Elias", role: "Ranger Captain", weaponId: "wpn_elias_bow" }, boss: { id: "chr_voss", name: "Aurelian Voss", title: "the Eclipse Usurper", maxHp: 30 }, seal: { id: "itm_dominion", name: "Seal of Dominion", icon: "✺" }, objectiveLabels: ["Shadow Wing", "Prison Wing", "Ritual Wing"], enemyKinds: ["shadow", "knight", "shadow", "knight"], opening: "The Citadel breathes beneath a black sun. Every stolen Seal answers from within.", firstObjective: "Break the three Eclipse Rituals.", weapon: { id: "wpn_dawnblade", name: "Dawnblade", kind: "weapon", icon: "†", description: "The restored heirloom of the Eclipse bloodline." } },
};

const objectivePositions = [[520, 320], [1120, 880], [1700, 350]] as const;
const enemyPositions = [[650, 650], [980, 440], [1370, 870], [1580, 600]] as const;

export function createStageGameplay(stage: CampaignStage, inventory: InventoryItem[], playerMaxHp = 100): StageGameplay {
  const def = STAGES[stage];
  return {
    stage,
    biome: def.biome,
    player: { x: 240, y: 720, hp: playerMaxHp, maxHp: playerMaxHp, essence: 100, weaponId: inventory.find((item) => item.kind === "weapon")?.id ?? "wpn_heir_sword" },
    objectives: def.objectiveLabels.map((label, index) => ({ id: `stage-${stage}-objective-${index + 1}`, x: objectivePositions[index]![0], y: objectivePositions[index]![1], label, completed: false })),
    enemies: def.enemyKinds.map((kind, index) => ({ id: `stage-${stage}-enemy-${index + 1}`, x: enemyPositions[index]![0], y: enemyPositions[index]![1], hp: 4 + stage + (index % 2), maxHp: 4 + stage + (index % 2), alive: true, kind, intent: "idle", attackReadyAt: 0 })),
    companion: { ...def.companion, x: 400, y: 600, hp: 100 + stage * 5, maxHp: 100 + stage * 5, recruited: stage === 5, mode: "follow" },
    boss: { ...def.boss, x: 1900, y: 360, hp: def.boss.maxHp, phase: 1, attackReadyAt: 0, intent: "shielded", awakened: false, defeated: false },
    seal: def.seal,
    sealCollected: false,
    inventory,
    weaponPickups: [{ id: `stage-${stage}-weapon`, x: 900, y: 220, collected: false, item: def.weapon }],
    blessings: [],
    pendingBlessing: false,
    portalActive: false,
    stageComplete: false,
    campaignComplete: false,
    objective: def.firstObjective,
    storyLine: def.opening,
  };
}
