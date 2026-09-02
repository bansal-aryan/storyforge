import { nanoid } from "nanoid";

export type IdPrefix =
  | "chr"
  | "loc"
  | "itm"
  | "fac"
  | "thd"
  | "evt"
  | "scn"
  | "rul"
  | "prp"
  | "rel"
  | "wld"
  | "act";

export function makeId(prefix: IdPrefix): string {
  return `${prefix}_${nanoid(10)}`;
}

const GIVEN = [
  "Calder",
  "Neris",
  "Voss",
  "Ilya",
  "Mareth",
  "Quen",
  "Sable",
  "Torin",
  "Wren",
  "Ysolde",
];

const SURNAMES = [
  "Ashlock",
  "Brine",
  "Cinderwell",
  "Dusk",
  "Harrow",
  "Kestrel",
  "Moth",
  "Rook",
  "Salt",
  "Vale",
];

export function displayName(role: string, seed: string): string {
  let h = 0;
  const key = `${role}:${seed}`;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) | 0;
  const given = GIVEN[Math.abs(h) % GIVEN.length];
  const sur = SURNAMES[Math.abs(h >> 4) % SURNAMES.length];
  return `${given} ${sur}`;
}

export function uniqueName(
  name: string,
  existing: string[],
): { name: string; warning?: string } {
  const taken = new Set(existing.map((n) => n.toLowerCase()));
  if (!taken.has(name.toLowerCase())) return { name };
  let i = 2;
  while (taken.has(`${name} (${i})`.toLowerCase())) i++;
  return { name: `${name} (${i})`, warning: `Name "${name}" already exists; saved as "${name} (${i})".` };
}
