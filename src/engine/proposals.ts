import type { WorldPatch, WorldSnapshot } from "../types/world";
import { makeId } from "./ids";

export function applyPatch(world: WorldSnapshot, patch: WorldPatch, now: number): void {
  switch (patch.type) {
    case "create_entity": {
      const { entity, relation } = patch.payload;
      world.entities[entity.id] = { ...entity, updatedAt: now };
      if (relation) world.relations.push(relation);
      break;
    }
    case "update_entity": {
      const current = world.entities[patch.payload.id];
      if (!current) throw new Error(`Unknown entity ${patch.payload.id}`);
      world.entities[patch.payload.id] = {
        ...current,
        ...patch.payload.changes,
        id: current.id,
        kind: current.kind,
        createdAt: current.createdAt,
        updatedAt: now,
      };
      break;
    }
    case "advance_scene": {
      const p = patch.payload;
      const tick = world.currentScene.tick + 1;
      const sceneId = makeId("scn");
      world.currentScene = {
        id: sceneId,
        title: p.title,
        locationId: p.locationId,
        presentEntityIds: p.presentEntityIds,
        openQuestions: p.openQuestions,
        tick,
      };
      world.events.push({
        id: makeId("evt"),
        at: tick,
        sceneId,
        title: p.title,
        body: p.beat,
        entityIds: p.presentEntityIds,
        source: "system",
      });
      break;
    }
    case "add_rule": {
      world.rules.push({
        id: makeId("rul"),
        text: patch.payload.text,
        severity: patch.payload.severity,
        createdAt: now,
      });
      break;
    }
    case "add_relation": {
      world.relations.push(patch.payload);
      break;
    }
    case "log_event": {
      world.events.push(patch.payload);
      break;
    }
    case "move_party": {
      const mapLocation = world.adventure.map.find((location) => location.entityId === patch.payload.locationId);
      if (!mapLocation) throw new Error(`Unknown map location ${patch.payload.locationId}`);
      mapLocation.visited = true;
      world.currentScene = {
        ...world.currentScene,
        id: makeId("scn"),
        title: `At ${world.entities[patch.payload.locationId]?.name ?? "a new place"}`,
        locationId: patch.payload.locationId,
        tick: world.currentScene.tick + 1,
      };
      world.events.push({
        id: makeId("evt"), at: world.currentScene.tick, sceneId: world.currentScene.id,
        title: `Party travels to ${world.entities[patch.payload.locationId]?.name ?? "a new place"}`,
        body: "The party takes the Lantern Road together.",
        entityIds: world.adventure.party.map((member) => member.entityId), source: "system",
      });
      break;
    }
    case "recruit_party_member": {
      if (!world.adventure.party.some((member) => member.entityId === patch.payload.entityId)) world.adventure.party.push(patch.payload);
      break;
    }
    case "advance_quest_stage": {
      const current = world.adventure.quest.stages[world.adventure.quest.stageIndex];
      if (!current) throw new Error("No active quest stage");
      current.state = "complete";
      if (patch.payload.valueChoice) world.adventure.quest.valueChoice = patch.payload.valueChoice;
      const next = world.adventure.quest.stages[world.adventure.quest.stageIndex + 1];
      if (next) {
        next.state = "active";
        world.adventure.quest.stageIndex += 1;
        const nextMap = world.adventure.map.find((location) => location.entityId === next.locationId);
        if (nextMap) nextMap.unlocked = true;
      }
      world.events.push({
        id: makeId("evt"), at: world.currentScene.tick, sceneId: world.currentScene.id,
        title: `${current.title} resolved`, body: patch.payload.action,
        entityIds: world.adventure.party.map((member) => member.entityId), source: "system",
      });
      break;
    }
  }
}
