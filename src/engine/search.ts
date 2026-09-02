import type { EntityKind, MemoryHit, WorldSnapshot } from "../types/world";

const STOP = new Set([
  "the",
  "a",
  "an",
  "of",
  "in",
  "on",
  "at",
  "to",
  "for",
  "and",
  "or",
  "who",
  "what",
  "where",
  "when",
  "is",
  "are",
]);

function tokens(query: string): string[] {
  return query
    .toLowerCase()
    .split(/[^a-z0-9']+/i)
    .filter((t) => t.length > 1 && !STOP.has(t));
}

function scoreText(hay: string, toks: string[], weight: number): number {
  const h = hay.toLowerCase();
  let s = 0;
  for (const t of toks) {
    if (h.includes(t)) s += weight;
  }
  return s;
}

export function searchMemory(
  world: WorldSnapshot,
  query: string,
  opts?: { kinds?: EntityKind[]; includeSecrets?: boolean },
): MemoryHit[] {
  const toks = tokens(query);
  if (toks.length === 0) return [];

  const hits: MemoryHit[] = [];
  const kinds = opts?.kinds;
  const includeSecrets = opts?.includeSecrets ?? false;

  for (const entity of Object.values(world.entities)) {
    if (kinds && !kinds.includes(entity.kind)) continue;
    let score = 0;
    score += scoreText(entity.name, toks, 5);
    score += scoreText(entity.tags.join(" "), toks, 3);
    score += scoreText(entity.summary, toks, 2);
    if (includeSecrets) score += scoreText(entity.secrets.join(" "), toks, 4);
    const relNotes = world.relations
      .filter((r) => r.fromId === entity.id || r.toId === entity.id)
      .map((r) => r.note ?? r.kind)
      .join(" ");
    score += scoreText(relNotes, toks, 2);
    if (score > 0) {
      const secretBit =
        includeSecrets && entity.secrets.length
          ? ` Secret: ${entity.secrets[0]}`
          : "";
      hits.push({
        kind: "entity",
        id: entity.id,
        name: entity.name,
        snippet: `${entity.kind} · ${entity.summary}${secretBit}`,
        score,
      });
    }
  }

  for (const event of world.events) {
    let score = 0;
    score += scoreText(event.title, toks, 3);
    score += scoreText(event.body, toks, 2);
    const names = event.entityIds
      .map((id) => world.entities[id]?.name ?? "")
      .join(" ");
    score += scoreText(names, toks, 2);
    if (score > 0) {
      hits.push({
        kind: "event",
        id: event.id,
        name: event.title,
        snippet: event.body,
        score,
      });
    }
  }

  for (const rule of world.rules) {
    const score = scoreText(rule.text, toks, 3);
    if (score > 0) {
      hits.push({
        kind: "rule",
        id: rule.id,
        name: `${rule.severity} rule`,
        snippet: rule.text,
        score,
      });
    }
  }

  hits.sort((a, b) => b.score - a.score);
  return hits.slice(0, 8);
}
