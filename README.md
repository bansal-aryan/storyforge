# Eclipse Inheritance

Eclipse Inheritance is a browser action-RPG about collaborating with an agent-controlled ranger during live combat. The human controls the Last Heir directly; a WebMCP agent can inspect canonical battlefield state, explain the next valid objective, and change Elias's tactical stance without inventing items, skipping quest gates, or taking control of the player.

This repository contains the complete five-phase Eclipse campaign. Each realm has its own objectives, enemy cast, recruitable companion, collectible weapon, multi-phase boss, Seal, visual theme, and gated transition into the next chapter.

## Why WebMCP

Traditional game companions either follow fixed scripts or make the player stop fighting to navigate tactical menus. WebMCP lets an external agent understand the live encounter through structured browser tools and help while the player remains in control.

A judge can ask the agent to:

> Inspect the battlefield, explain what I should do next, and have Elias guard me.

The agent reads the real game state, returns grounded guidance, calls a reversible tactical command, and the result appears immediately in the HUD and WebMCP activity panel.

## Playable loop

1. Explore a scrolling forest with WASD or arrow keys.
2. Earn each companion's trust through a realm-specific recruitment trial; every recruited ally stays with the fellowship for the rest of the campaign.
3. Complete realm-specific objectives while managing Blight, Amnesia, Heat, Exposure, and Corruption.
4. Fight telegraphed enemies with quick attacks, heavy attacks, and dodges.
5. Command the active companion to follow, guard, focus, or hold while veteran allies fight beside you.
6. Defeat Sylvara, Nihil, Ferrox, Astrax, and Voss; unite all five Eclipse Seals.

Companions are persistent individuals rather than interchangeable bonuses. Recruitment ends with a dialogue choice that establishes trust and a remembered promise. Each friend keeps health, trust, bond level, tactical stance, memories, and an identity-specific ability: Elias's Hunter's Mark, Lira's Mnemonic Ward, Rook's Living Bulwark, or Kael's Tempest Break. The fellowship comments on objectives and ability use as it travels.

## WebMCP implementation

The app registers structured tools from `document.modelContext` or `navigator.modelContext` during startup. All tools operate on the same deterministic `WorldEngine` used by the game.

The three judge-facing gameplay tools are:

- `inspect_battlefield` — reads health, objectives, enemies, boss phase, recruitment trial, persistent fellowship, realm pressure, pickups, Seal state, and Portal state.
- `explain_next_objective` — recommends only actions allowed by the current canonical quest state.
- `command_companion` — changes the active companion between `follow`, `guard`, `focus`, and `hold`; the reversible action is attributed to the agent and shown in the activity panel.

Additional world-model tools demonstrate memory search, continuity validation, human-approved story proposals, and durable world rules. Mutating story operations create pending proposals. The player can accept or reject them in the game. Destructive rule changes use WebMCP's user-interaction callback when available.

## Run locally

Requirements: Node.js 20+ and pnpm 11.

```bash
pnpm install --frozen-lockfile
pnpm dev
```

Open `http://127.0.0.1:5173/` in the ChatGPT desktop app's in-app browser, or Chrome 149+ with WebMCP testing enabled.

For recording, `http://127.0.0.1:5173/?demo=1` skips the lore crawl and opens the WebMCP activity panel.

## Controls

- Move: WASD or arrow keys
- Quick attack: Space
- Heavy attack: F
- Dodge: Left Shift
- Interact or collect: E
- Equip hotbar items: 1–9

Controls can be rebound from the in-game settings panel.

## Verify

```bash
pnpm test
pnpm build
```

The test suite covers every phase and Seal gate through the final ending, plus combat telegraphs, boss phases, weapons, blessings, companion combat, battlefield inspection, canonical objective guidance, and agent-attributed tactical commands.

## Judge testing instructions

1. Open the public deployment in a WebMCP-capable browser.
2. Click **Begin the inheritance**, recruit Elias near the starting area, and open **Agent** in the top navigation.
3. Ask the browsing agent: “Inspect the battlefield, explain the next objective, and set Elias to guard.”
4. Confirm that the browser calls `inspect_battlefield`, `explain_next_objective`, and `command_companion`.
5. Confirm that Elias's HUD stance becomes `guard` and `command_companion` appears under **Agent activity**.
6. Continue through Sylvara, the Seal, and the Portal to verify the deterministic stage gates.

No account or credentials are required. Progress is stored locally in IndexedDB.

## Deployment

The app is a static Vite site with no required environment variables.

- Install command: `pnpm install --frozen-lockfile`
- Build command: `pnpm build`
- Output directory: `dist`

See [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) for the release checklist and [docs/DEMO_SCRIPT.md](./docs/DEMO_SCRIPT.md) for the judge-focused recording plan.

## License

MIT — see [LICENSE](./LICENSE).
