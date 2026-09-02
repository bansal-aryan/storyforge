import type { WorldSnapshot } from "../types/world";
import { makeId } from "./ids";
import { createEclipseWorld } from "./eclipseSeed";

export const ASHEN_PORT_NAME = "Ashen Port";

export function createEclipseInheritance(now = Date.now()): WorldSnapshot {
  return createEclipseWorld(now);
}

export function createAshenPort(now = Date.now()): WorldSnapshot {
  const worldId = makeId("wld");
  const locDocks = makeId("loc");
  const locHouse = makeId("loc");
  const locCrypt = makeId("loc");
  const locMarket = makeId("loc");
  const locLantern = makeId("loc");
  const vale = makeId("chr");
  const rowan = makeId("chr");
  const neris = makeId("chr");
  const sable = makeId("chr");
  const torin = makeId("chr");
  const heir = makeId("chr");
  const thread = makeId("thd");
  const sceneId = makeId("scn");
  const ruleId = makeId("rul");
  const evtId = makeId("evt");

  return {
    version: 1,
    id: worldId,
    name: ASHEN_PORT_NAME,
    premise:
      "A dark fantasy harbor city of ledgers, fog, and quiet knives. Political intrigue, not cartoon evil — everyone thinks they are saving something.",
    tone: {
      genre: "dark fantasy",
      adjectives: ["political", "no-pure-evil", "harbor-noir"],
    },
    entities: {
      [locDocks]: {
        id: locDocks,
        kind: "location",
        name: "The Brine Docks",
        summary: "Salt-black piers where grain, gossip, and unpaid debts change hands after dark.",
        tags: ["harbor", "public"],
        secrets: [],
        status: "active",
        createdAt: now,
        updatedAt: now,
      },
      [locHouse]: {
        id: locHouse,
        kind: "location",
        name: "The Counting House",
        summary: "Magistrate Vale's night office: brass lamps, sealed manifests, one empty chair for the heir.",
        tags: ["interior", "power"],
        secrets: ["A false-bottom drawer holds a cracked wax impression of the heir's signet."],
        status: "active",
        createdAt: now,
        updatedAt: now,
      },
      [locCrypt]: {
        id: locCrypt,
        kind: "location",
        name: "The Flooded Crypt",
        summary: "A family vault under high tide. Names on the plaques do not match the parish books.",
        tags: ["hidden", "danger"],
        secrets: [],
        status: "active",
        createdAt: now,
        updatedAt: now,
      },
      [locMarket]: {
        id: locMarket, kind: "location", name: "Tide Market",
        summary: "Canvas awnings snap in the low-water wind; every favor has a price here.",
        tags: ["market", "bargain"], secrets: [], status: "active", createdAt: now, updatedAt: now,
      },
      [locLantern]: {
        id: locLantern, kind: "location", name: "Storm Lantern",
        summary: "A lighthouse above the sea gate. Its dead beam waits for the heir’s signet.",
        tags: ["lighthouse", "finale"], secrets: [], status: "active", createdAt: now, updatedAt: now,
      },
      [vale]: {
        id: vale,
        kind: "character",
        name: "Magistrate Vale",
        summary:
          "The city's tired steward. Keeps the docks running and the council from panic. Loves the missing heir more than the law admits.",
        tags: ["major", "official"],
        secrets: ["Vale delayed reporting the disappearance for three days to search privately."],
        status: "alive",
        createdAt: now,
        updatedAt: now,
      },
      [rowan]: {
        id: rowan, kind: "character", name: "Rowan", summary: "A courier with a quick step and an old debt to Magistrate Vale.",
        tags: ["player", "courier"], secrets: [], status: "alive", createdAt: now, updatedAt: now,
      },
      [neris]: {
        id: neris, kind: "character", name: "Neris", summary: "A tidewise scout who reads currents better than faces, and chooses people over cargo.",
        tags: ["companion", "scout"], secrets: ["Neris once guided the heir beyond the sea gate."], status: "alive", createdAt: now, updatedAt: now,
      },
      [sable]: {
        id: sable, kind: "character", name: "Sable", summary: "A ledger-mage who can read a bargain in any ink, provided it is worth their time.",
        tags: ["recruitable", "mage"], secrets: ["Sable knows the cipher’s last line."], status: "alive", createdAt: now, updatedAt: now,
      },
      [torin]: {
        id: torin, kind: "character", name: "Torin", summary: "A merchant with contested loyalties and enough routes to find a quiet exit.",
        tags: ["recruitable", "merchant"], secrets: ["Torin funded the lighter that carried the heir."], status: "alive", createdAt: now, updatedAt: now,
      },
      [heir]: {
        id: heir,
        kind: "character",
        name: "The Missing Heir",
        summary: "Last seen boarding a grain lighter. The signet ring did not go with them — or so the ledgers claim.",
        tags: ["major", "missing"],
        secrets: ["The heir may have left willingly, carrying a merchant's cipher instead of the ring."],
        status: "unknown",
        createdAt: now,
        updatedAt: now,
      },
      [thread]: {
        id: thread,
        kind: "thread",
        name: "The Absent Signet",
        summary: "Whoever holds the heir's signet can move grain, credit, and votes.",
        tags: ["plot", "open"],
        secrets: [],
        status: "active",
        createdAt: now,
        updatedAt: now,
      },
    },
    relations: [
      {
        id: makeId("rel"),
        fromId: vale,
        toId: locHouse,
        kind: "located_in",
        note: "Works nights here",
      },
      {
        id: makeId("rel"),
        fromId: vale,
        toId: heir,
        kind: "knows",
        note: "Guardian in all but name",
      },
      {
        id: makeId("rel"),
        fromId: thread,
        toId: heir,
        kind: "seeks",
        note: "The signet and the person",
      },
    ],
    events: [
      {
        id: evtId,
        at: 0,
        sceneId,
        title: "Night ledgers",
        body: "Fog on the glass. Vale checks the same column twice. The heir's chair stays empty.",
        entityIds: [vale, locHouse, thread],
        source: "system",
      },
    ],
    rules: [
      {
        id: ruleId,
        text: "Do not kill characters tagged major without a world rule change.",
        severity: "hard",
        createdAt: now,
      },
      {
        id: makeId("rul"),
        text: "No cartoon or pure evil — villains want something sympathetic.",
        severity: "soft",
        createdAt: now,
      },
    ],
    currentScene: {
      id: sceneId,
      title: "Night at the Counting House",
      locationId: locHouse,
      presentEntityIds: [vale],
      openQuestions: ["Where is the heir's signet?", "Who profits if the grain fleet is delayed?"],
      tick: 0,
    },
    proposals: [],
    activity: [
      {
        id: makeId("act"),
        at: now,
        actor: "system",
        summary: "Loaded demo world Ashen Port.",
      },
    ],
    adventure: {
      playerId: rowan,
      party: [
        { entityId: rowan, role: "player", agentControlled: false, archetype: "Courier", disposition: "Restless, loyal", memory: ["Vale called in an old debt."] },
        { entityId: neris, role: "companion", agentControlled: true, archetype: "Tidewise scout", disposition: "Cautious, compassionate", memory: ["The tide took the heir’s boat north."] },
      ],
      map: [
        { entityId: locHouse, x: 18, y: 65, unlocked: true, visited: true, stage: 0 },
        { entityId: locDocks, x: 37, y: 49, unlocked: false, visited: false, stage: 1 },
        { entityId: locCrypt, x: 56, y: 72, unlocked: false, visited: false, stage: 2 },
        { entityId: locMarket, x: 72, y: 43, unlocked: false, visited: false, stage: 3 },
        { entityId: locLantern, x: 88, y: 22, unlocked: false, visited: false, stage: 4 },
      ],
      quest: {
        title: "The Lantern Road", stageIndex: 0,
        stages: [
          { id: "quest_1", index: 0, title: "The Dark Beacon", objective: "Learn why the lighthouse failed.", locationId: locHouse, completionHints: ["Talk with Vale", "Inspect the false ledger"], state: "active", reward: "Brass compass" },
          { id: "quest_2", index: 1, title: "Salt on the Ledger", objective: "Find the grain-lighter’s manifest.", locationId: locDocks, completionHints: ["Inspect the manifest", "Recruit Sable"], state: "locked", reward: "Crypt route" },
          { id: "quest_3", index: 2, title: "Below the Tide", objective: "Recover the heir’s cipher.", locationId: locCrypt, completionHints: ["Enter with a companion action"], state: "locked", reward: "Lighthouse route" },
          { id: "quest_4", index: 3, title: "The Bargain at Low Water", objective: "Decide who gets the cipher.", locationId: locMarket, completionHints: ["Resolve a negotiation"], state: "locked", reward: "Choose a party value" },
          { id: "quest_5", index: 4, title: "Light the Sea Gate", objective: "Relight the lighthouse before the storm.", locationId: locLantern, completionHints: ["Take the final party action"], state: "locked", reward: "A changed Ashen Port" },
        ],
      },
    },
  };
}

export function emptyWorldSkeleton(): null {
  return null;
}
