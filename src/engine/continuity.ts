import type {
  ContinuityReport,
  Entity,
  ProposedAction,
  WorldSnapshot,
} from "../types/world";

function majorEntities(world: WorldSnapshot): Entity[] {
  return Object.values(world.entities).filter((e) => e.tags.includes("major"));
}

function mentions(text: string, name: string): boolean {
  return text.toLowerCase().includes(name.toLowerCase());
}

function lethalIntent(text: string): boolean {
  return /\b(kill|murder|assassinate|execute|slay|die|dead)\b/i.test(text);
}

export function checkContinuity(
  world: WorldSnapshot,
  action: ProposedAction,
): ContinuityReport {
  const blockers: string[] = [];
  const warnings: string[] = [];

  const hardRules = world.rules.filter((r) => r.severity === "hard");
  const noKillMajor = hardRules.some((r) =>
    /no killing major|do not kill characters tagged major/i.test(r.text),
  );

  if (action.type === "create_character") {
    const locId = action.input.locationId;
    if (locId && !world.entities[locId]) {
      blockers.push(`Unknown location id "${locId}".`);
    } else if (locId && world.entities[locId].kind !== "location") {
      blockers.push(`"${locId}" is not a location.`);
    }
    const rel = action.input.relationship;
    if (rel && !world.entities[rel.toId]) {
      blockers.push(`Relationship target "${rel.toId}" does not exist.`);
    }
    const same = Object.values(world.entities).find(
      (e) =>
        e.kind === "character" &&
        action.input.name &&
        e.name.toLowerCase() === action.input.name.toLowerCase(),
    );
    if (same) warnings.push(`A character named "${same.name}" already exists.`);
  }

  if (action.type === "update_entity") {
    const entity = world.entities[action.input.id];
    if (!entity) {
      blockers.push(`Unknown entity "${action.input.id}".`);
    } else {
      if (
        action.input.status === "dead" &&
        entity.tags.includes("major") &&
        noKillMajor
      ) {
        blockers.push(
          `Hard rule forbids killing major characters (${entity.name}). Apply a world rule change first, or leave them alive.`,
        );
      }
      if (action.input.status === "dead" && entity.status === "dead") {
        warnings.push(`${entity.name} is already dead.`);
      }
    }
  }

  if (action.type === "advance_scene") {
    const locId = action.input.locationId;
    if (locId && !world.entities[locId]) {
      blockers.push(`Unknown location id "${locId}".`);
    }
    for (const id of action.input.presentEntityIds ?? []) {
      const e = world.entities[id];
      if (!e) {
        blockers.push(`Unknown present entity "${id}".`);
        continue;
      }
      if (e.status === "dead") {
        blockers.push(
          `${e.name} is dead and cannot be present unless the world allows it.`,
        );
      }
    }
  }

  if (action.type === "natural") {
    const text = action.action;
    if (noKillMajor && lethalIntent(text)) {
      for (const major of majorEntities(world)) {
        if (mentions(text, major.name) || action.entityId === major.id) {
          blockers.push(
            `Hard rule forbids killing major characters. "${major.name}" is tagged major.`,
          );
        }
      }
      if (action.intendedStatus === "dead" && action.entityId) {
        const e = world.entities[action.entityId];
        if (e?.tags.includes("major")) {
          blockers.push(
            `Hard rule forbids setting ${e.name} to dead.`,
          );
        }
      }
    }
    if (action.entityId && !world.entities[action.entityId]) {
      blockers.push(`Unknown entity "${action.entityId}".`);
    }
    for (const rule of hardRules) {
      if (
        /pure evil|cartoon evil|mustache/i.test(rule.text) &&
        /pure evil|irredeemable|mustache-twirl/i.test(text)
      ) {
        blockers.push(`Hard rule violated: ${rule.text}`);
      }
    }
    for (const rule of world.rules.filter((r) => r.severity === "soft")) {
      if (rule.text.length > 0 && text.toLowerCase().includes("break tone")) {
        warnings.push(`May conflict with: ${rule.text}`);
      }
    }
  }

  return { ok: blockers.length === 0, blockers, warnings };
}
