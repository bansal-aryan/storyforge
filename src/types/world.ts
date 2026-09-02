export type EntityKind =
  | "character"
  | "location"
  | "item"
  | "faction"
  | "thread";

export type RelationKind =
  | "knows"
  | "allies"
  | "rivals"
  | "located_in"
  | "owns"
  | "member_of"
  | "secret_about"
  | "seeks";

export type EntityStatus =
  | "alive"
  | "dead"
  | "unknown"
  | "destroyed"
  | "active"
  | "resolved";

export interface Entity {
  id: string;
  kind: EntityKind;
  name: string;
  summary: string;
  tags: string[];
  secrets: string[];
  status: EntityStatus;
  createdAt: number;
  updatedAt: number;
}

export interface Relation {
  id: string;
  fromId: string;
  toId: string;
  kind: RelationKind;
  note?: string;
}

export interface WorldEvent {
  id: string;
  at: number;
  sceneId: string;
  title: string;
  body: string;
  entityIds: string[];
  source: "human" | "agent" | "system";
}

export interface Scene {
  id: string;
  title: string;
  locationId: string | null;
  presentEntityIds: string[];
  openQuestions: string[];
  tick: number;
}

export interface WorldRule {
  id: string;
  text: string;
  severity: "soft" | "hard";
  createdAt: number;
}

export interface Tone {
  genre: string;
  adjectives: string[];
}

export type ConfirmationLevel = "none" | "soft" | "destructive";

export type PartyRole = "player" | "companion" | "specialist";

export interface PartyMember {
  entityId: string;
  role: PartyRole;
  agentControlled: boolean;
  archetype: string;
  disposition: string;
  memory: string[];
}

export interface MapLocation {
  entityId: string;
  x: number;
  y: number;
  unlocked: boolean;
  visited: boolean;
  stage: number;
}

export interface QuestStage {
  id: string;
  index: number;
  title: string;
  objective: string;
  locationId: string;
  completionHints: string[];
  state: "locked" | "active" | "complete";
  reward?: string;
}

export interface AdventureState {
  playerId: string;
  party: PartyMember[];
  map: MapLocation[];
  quest: {
    title: string;
    stageIndex: number;
    stages: QuestStage[];
    valueChoice?: "mercy" | "truth" | "leverage";
  };
}

export type CampaignStage = 1 | 2 | 3 | 4 | 5;
export type EnemyKind = "wolf" | "vine" | "ink" | "wraith" | "forge" | "sentinel" | "storm" | "acolyte" | "shadow" | "knight";

export interface StageEnemy {
  id: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  alive: boolean;
  kind: EnemyKind;
  intent: "idle" | "chase" | "windup" | "recover";
  attackReadyAt: number;
}

export interface InventoryItem {
  id: string;
  name: string;
  kind: "weapon" | "seal" | "quest";
  icon: string;
  description: string;
}

export interface StageGameplay {
  stage: CampaignStage;
  biome: { name: string; subtitle: string; theme: "forest" | "archives" | "forge" | "peaks" | "citadel" };
  player: { x: number; y: number; hp: number; maxHp: number; essence: number; weaponId: string };
  objectives: Array<{ id: string; x: number; y: number; label: string; completed: boolean }>;
  enemies: StageEnemy[];
  companion: { id: string; name: string; role: string; x: number; y: number; hp: number; maxHp: number; recruited: boolean; weaponId: string; mode: "follow" | "focus" | "guard" | "hold" };
  boss: { id: string; name: string; title: string; x: number; y: number; hp: number; maxHp: number; phase: 1 | 2 | 3; attackReadyAt: number; intent: "shielded" | "idle" | "strike" | "summon"; awakened: boolean; defeated: boolean };
  seal: { id: string; name: string; icon: string };
  sealCollected: boolean;
  inventory: InventoryItem[];
  weaponPickups: Array<{ id: string; x: number; y: number; item: InventoryItem; collected: boolean }>;
  blessings: Array<"vigor" | "fury" | "wind" | "bond">;
  pendingBlessing: boolean;
  portalActive: boolean;
  stageComplete: boolean;
  campaignComplete: boolean;
  objective: string;
  storyLine: string;
}

export type WorldPatch =
  | {
      type: "create_entity";
      payload: { entity: Entity; relation?: Relation };
    }
  | {
      type: "update_entity";
      payload: { id: string; changes: Partial<Omit<Entity, "id" | "kind" | "createdAt">> };
    }
  | {
      type: "advance_scene";
      payload: AdvanceScenePayload;
    }
  | {
      type: "add_rule";
      payload: { text: string; severity: "soft" | "hard" };
    }
  | {
      type: "add_relation";
      payload: Relation;
    }
  | {
      type: "log_event";
      payload: WorldEvent;
    }
  | {
      type: "move_party";
      payload: { locationId: string };
    }
  | {
      type: "recruit_party_member";
      payload: PartyMember;
    }
  | {
      type: "advance_quest_stage";
      payload: { action: string; valueChoice?: "mercy" | "truth" | "leverage" };
    };

export interface AdvanceScenePayload {
  title: string;
  locationId: string | null;
  beat: string;
  presentEntityIds: string[];
  openQuestions: string[];
}

export interface Proposal {
  id: string;
  createdAt: number;
  toolName: string;
  summary: string;
  patch: WorldPatch;
  level: ConfirmationLevel;
  status: "pending" | "accepted" | "rejected" | "edited";
}

export interface ActivityEntry {
  id: string;
  at: number;
  actor: "human" | "agent" | "system";
  toolName?: string;
  summary: string;
  data?: unknown;
}

export interface WorldSnapshot {
  version: 1;
  id: string;
  name: string;
  premise: string;
  tone: Tone;
  entities: Record<string, Entity>;
  relations: Relation[];
  events: WorldEvent[];
  rules: WorldRule[];
  currentScene: Scene;
  proposals: Proposal[];
  activity: ActivityEntry[];
  adventure: AdventureState;
  gameplay?: StageGameplay;
}

export interface ContinuityReport {
  ok: boolean;
  blockers: string[];
  warnings: string[];
}

export interface MemoryHit {
  kind: "entity" | "event" | "rule";
  id: string;
  name: string;
  snippet: string;
  score: number;
}

export interface WorldSummary {
  worldName: string;
  premise: string;
  tone: Tone;
  scene: {
    title: string;
    tick: number;
    locationName: string | null;
    present: string[];
    openQuestions: string[];
  };
  entityCounts: Record<EntityKind, number>;
  pendingProposalCount: number;
  recentEvents: { title: string; tick: number }[];
  rules: { text: string; severity: "soft" | "hard" }[];
}

export type Actor = "human" | "agent" | "system";

export interface GenerateNpcInput {
  name?: string;
  role: string;
  secret?: string;
  locationId?: string;
  tags?: string[];
  relationship?: {
    toId: string;
    kind: RelationKind;
    note?: string;
  };
}

export interface UpdateEntityInput {
  id: string;
  name?: string;
  summary?: string;
  status?: EntityStatus;
  tagsAdd?: string[];
  tagsRemove?: string[];
  secretAdd?: string;
}

export interface AdvanceSceneInput {
  title?: string;
  locationId?: string;
  beat?: string;
  presentEntityIds?: string[];
  openQuestions?: string[];
  proposalId?: string;
}

export type ProposedAction =
  | { type: "create_character"; input: GenerateNpcInput }
  | { type: "update_entity"; input: UpdateEntityInput }
  | { type: "advance_scene"; input: AdvanceSceneInput }
  | { type: "natural"; action: string; entityId?: string; intendedStatus?: EntityStatus };
