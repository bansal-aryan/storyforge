import { del, get, set } from "idb-keyval";
import type { WorldSnapshot } from "../types/world";

const KEY = "storyforge:world:v4";

export async function loadWorld(): Promise<WorldSnapshot | null> {
  return (await get<WorldSnapshot>(KEY)) ?? null;
}

export async function saveWorld(snapshot: WorldSnapshot): Promise<void> {
  await set(KEY, snapshot);
}

export async function clearWorld(): Promise<void> {
  await del(KEY);
}
