import type { CampaignStage, EnemyKind, InventoryItem, StageGameplay } from "../types/world";

type StageDefinition = {
  stage: CampaignStage;
  biome: StageGameplay["biome"];
  companion: Pick<StageGameplay["companion"], "id" | "name" | "role" | "weaponId" | "ability" | "personality" | "motivation" | "fear">;
  boss: Pick<StageGameplay["boss"], "id" | "name" | "title" | "maxHp">;
  seal: StageGameplay["seal"];
  objectiveLabels: [string, string, string];
  enemyKinds: [EnemyKind, EnemyKind, EnemyKind, EnemyKind];
  opening: string;
  firstObjective: string;
  weapon: InventoryItem;
  recruitment: Pick<StageGameplay["recruitment"], "requiredObjectives" | "requiredKills" | "requiresWeapon" | "description">;
  pressure: Omit<StageGameplay["pressure"], "value">;
};

export const STAGES: Record<CampaignStage, StageDefinition> = {
  1: { stage: 1, biome: { name: "Emberwood Glade", subtitle: "The Seal of Roots", theme: "forest" }, companion: { id: "chr_elias", name: "Elias", role: "Ranger", weaponId: "wpn_elias_bow", personality: "Dry-witted, watchful, and protective", motivation: "Make the people responsible for his village answer for it", fear: "Failing another family when they need him", ability: { id: "mark", name: "Hunter's Mark", description: "Marks and wounds the strongest enemy.", cooldownMs: 9000, readyAt: 0 } }, boss: { id: "chr_sylvara", name: "Sylvara", title: "the Blightweaver", maxHp: 12 }, seal: { id: "itm_roots", name: "Seal of Roots", icon: "✦" }, objectiveLabels: ["West Grove", "South Grove", "Heart Grove"], enemyKinds: ["wolf", "wolf", "vine", "vine"], opening: "The roots whisper beneath the ruins of your childhood village.", firstObjective: "Purify the West Grove to prove yourself to Elias.", weapon: { id: "wpn_ember_axe", name: "Emberwood Axe", kind: "weapon", icon: "◆", description: "A woodsman's axe that staggers blighted foes." }, recruitment: { requiredObjectives: 1, requiredKills: 1, requiresWeapon: false, description: "Purify one grove and defeat one guardian." }, pressure: { name: "Blight", max: 100, description: "Corrupted groves steadily poison the party until purified." } },
  2: { stage: 2, biome: { name: "Drowned Archives", subtitle: "The Seal of Memory", theme: "archives" }, companion: { id: "chr_lira", name: "Lira", role: "Scholar-Mage", weaponId: "wpn_lira_staff", personality: "Curious, incisive, and quietly mischievous", motivation: "Restore every name Nihil erased", fear: "Forgetting who she was before the prison", ability: { id: "clarity", name: "Mnemonic Ward", description: "Restores Essence and reduces realm pressure.", cooldownMs: 11000, readyAt: 0 } }, boss: { id: "chr_nihil", name: "Nihil", title: "the Name-Eater", maxHp: 16 }, seal: { id: "itm_memory", name: "Seal of Memory", icon: "◈" }, objectiveLabels: ["Hall of Names", "Sunken Scriptoria", "Forbidden Wing"], enemyKinds: ["ink", "wraith", "ink", "wraith"], opening: "Black water reflects shelves whose books have forgotten their authors. Restore the codices in order or lose yourself.", firstObjective: "Restore the Hall of Names first.", weapon: { id: "wpn_tide_glaive", name: "Tideglass Glaive", kind: "weapon", icon: "◇", description: "A drowned archivist's blade that cuts ink-wraiths." }, recruitment: { requiredObjectives: 2, requiredKills: 1, requiresWeapon: false, description: "Restore two codices in the correct order and defeat an ink-wraith." }, pressure: { name: "Amnesia", max: 100, description: "Touching memories out of order erases health and Essence." } },
  3: { stage: 3, biome: { name: "Crimson Forge", subtitle: "The Seal of Iron", theme: "forge" }, companion: { id: "chr_rook", name: "Rook", role: "Golem Vanguard", weaponId: "wpn_rook_fists", personality: "Literal, gentle, and immovably loyal", motivation: "Prove that a created weapon can choose what it protects", fear: "Losing control of the furnace in his chest", ability: { id: "bulwark", name: "Living Bulwark", description: "Heals the fellowship and absorbs the next assault.", cooldownMs: 13000, readyAt: 0 } }, boss: { id: "chr_ferrox", name: "Ferrox", title: "the Chain-Smith", maxHp: 20 }, seal: { id: "itm_iron", name: "Seal of Iron", icon: "⬢" }, objectiveLabels: ["Northern Vents", "Slave Pens", "Master Smithy"], enemyKinds: ["forge", "sentinel", "forge", "sentinel"], opening: "Every hammer-blow below the mountain sounds like a prisoner calling for dawn. Heavy strikes build lethal heat.", firstObjective: "Claim the Cinder Hammer, then open the Northern Vents.", weapon: { id: "wpn_cinder_hammer", name: "Cinder Hammer", kind: "weapon", icon: "▣", description: "A freed smith's hammer forged to crack living armor." }, recruitment: { requiredObjectives: 1, requiredKills: 2, requiresWeapon: true, description: "Claim the Cinder Hammer, vent a forge, and defeat two sentinels." }, pressure: { name: "Heat", max: 100, description: "Heavy attacks build heat; quenched forges cool it." } },
  4: { stage: 4, biome: { name: "Veilspire Peaks", subtitle: "The Seal of Winds", theme: "peaks" }, companion: { id: "chr_kael", name: "Kael", role: "Sky-Monk", weaponId: "wpn_kael_wind", personality: "Playful, fearless, and impatient with ceremony", motivation: "Free the wind from every cage", fear: "Being bound to one destiny", ability: { id: "gust", name: "Tempest Break", description: "Interrupts enemy attacks and damages every guardian.", cooldownMs: 10000, readyAt: 0 } }, boss: { id: "chr_tempest", name: "Astrax", title: "the Bound Tempest", maxHp: 24 }, seal: { id: "itm_winds", name: "Seal of Winds", icon: "✧" }, objectiveLabels: ["Lower Shrine", "Cloud Monastery", "Central Spire"], enemyKinds: ["storm", "acolyte", "storm", "acolyte"], opening: "Broken temples circle the mountain while lightning climbs upward. The pilgrimage must be climbed in order.", firstObjective: "Begin the pilgrimage at the Lower Shrine.", weapon: { id: "wpn_sky_blades", name: "Skyglass Blades", kind: "weapon", icon: "⌁", description: "Paired blades that hold an edge against the wind." }, recruitment: { requiredObjectives: 2, requiredKills: 2, requiresWeapon: false, description: "Complete the first two pilgrimage shrines and defeat two stormbound foes." }, pressure: { name: "Exposure", max: 100, description: "The storm intensifies until a shrine grants shelter." } },
  5: { stage: 5, biome: { name: "Eclipse Citadel", subtitle: "The Seal of Dominion", theme: "citadel" }, companion: { id: "chr_elias", name: "Elias", role: "Ranger Captain", weaponId: "wpn_elias_bow", personality: "Dry-witted, watchful, and fiercely devoted", motivation: "Bring the whole fellowship home after Voss falls", fear: "Winning the war but losing his friends", ability: { id: "mark", name: "Hunter's Mark", description: "Marks and wounds the strongest enemy.", cooldownMs: 7000, readyAt: 0 } }, boss: { id: "chr_voss", name: "Aurelian Voss", title: "the Eclipse Usurper", maxHp: 30 }, seal: { id: "itm_dominion", name: "Seal of Dominion", icon: "✺" }, objectiveLabels: ["Shadow Wing", "Prison Wing", "Ritual Wing"], enemyKinds: ["shadow", "knight", "shadow", "knight"], opening: "The whole fellowship enters the Citadel beneath a black sun. Break its wings in order before corruption claims you.", firstObjective: "Breach the Shadow Wing with the united fellowship.", weapon: { id: "wpn_dawnblade", name: "Dawnblade", kind: "weapon", icon: "†", description: "The restored heirloom of the Eclipse bloodline." }, recruitment: { requiredObjectives: 0, requiredKills: 0, requiresWeapon: false, description: "Elias returns with every ally you earned." }, pressure: { name: "Corruption", max: 100, description: "Voss drains Essence while his rituals remain active." } },
};

const objectivePositions = [[520, 320], [1120, 880], [1700, 350]] as const;
const enemyPositions = [[650, 650], [980, 440], [1370, 870], [1580, 600]] as const;

export function createStageGameplay(stage: CampaignStage, inventory: InventoryItem[], playerMaxHp = 100, retinue: StageGameplay["retinue"] = [], campaign?: Pick<StageGameplay, "autonomy" | "relationships" | "combos">): StageGameplay {
  const def = STAGES[stage];
  const supportingAllies = retinue.filter((ally) => ally.id !== def.companion.id);
  return {
    stage,
    biome: def.biome,
    player: { x: 240, y: 720, hp: playerMaxHp, maxHp: playerMaxHp, essence: 100, weaponId: inventory.find((item) => item.kind === "weapon")?.id ?? "wpn_heir_sword" },
    objectives: def.objectiveLabels.map((label, index) => ({ id: `stage-${stage}-objective-${index + 1}`, x: objectivePositions[index]![0], y: objectivePositions[index]![1], label, completed: false })),
    enemies: def.enemyKinds.map((kind, index) => ({ id: `stage-${stage}-enemy-${index + 1}`, x: enemyPositions[index]![0], y: enemyPositions[index]![1], hp: 4 + stage + (index % 2), maxHp: 4 + stage + (index % 2), alive: true, kind, intent: "idle", attackReadyAt: 0 })),
    companion: { ...def.companion, x: 400, y: 600, hp: 100 + stage * 5, maxHp: 100 + stage * 5, recruited: stage === 5, mode: "follow", tactic: "follow", trust: stage === 5 ? 80 : 0, bond: stage === 5 ? "trusted" : "new", memories: stage === 5 ? ["Returned to the Citadel with the fellowship intact."] : [] },
    retinue: supportingAllies,
    autonomy: campaign?.autonomy ?? "advisory",
    relationships: campaign?.relationships ?? [],
    combos: campaign?.combos ?? [
      { id: "windguided-arrow", name: "Windguided Arrow", members: ["chr_elias", "chr_kael"], description: "Kael bends the wind around Elias's shot, striking every enemy.", readyAt: 0, cooldownMs: 16000 },
      { id: "runic-bulwark", name: "Runic Bulwark", members: ["chr_lira", "chr_rook"], description: "Lira inscribes Rook's armor, healing and shielding the fellowship.", readyAt: 0, cooldownMs: 18000 },
    ],
    pendingBattlePlan: null,
    recruitment: { ...def.recruitment, offerReady: false, prompt: `${def.companion.name} studies the heir in silence. Why should they risk everything for this fellowship?`, choices: ["We protect one another—no one gets left behind.", "Help me win, and I will help you achieve your purpose."] },
    guardiansDefeated: 0,
    pressure: { ...def.pressure, value: 0 },
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
    banter: supportingAllies.length ? [{ speaker: supportingAllies[0]!.name, line: "New realm. Same promise: nobody faces it alone." }] : [],
  };
}
