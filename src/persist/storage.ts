import { del, get, set } from "idb-keyval";
import type { WorldSnapshot } from "../types/world";

// Bump this key whenever required campaign fields change. Old IndexedDB saves
// must never be handed directly to React with a newer runtime shape.
const KEY = "storyforge:world:v6";

export async function loadWorld(): Promise<WorldSnapshot | null> {
  return (await get<WorldSnapshot>(KEY)) ?? null;
}

export async function saveWorld(snapshot: WorldSnapshot): Promise<void> {
  await set(KEY, snapshot);
}

export async function clearWorld(): Promise<void> {
  await del(KEY);
}
