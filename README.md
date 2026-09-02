# Eclipse Inheritance

A browser-playable fantasy action-adventure prototype built to match the challenge specification exactly: a top-down, readable, cartoon world inspired by TheLast.io, with a human-controlled protagonist and AI companion behavior layered through WebMCP.

This project is intentionally designed as a game first and an AI showcase second. The player is the hero. The companions are real teammates that can speak, act, and propose sensible moves without taking over the story.

## Core fantasy

- Top-down playable world with direct WASD control
- Zelda-like exploration loop in a simpler, cleaner form
- Human protagonist with a fantasy look and readable silhouette
- Companion agents with role-specific behavior and voice interaction
- Stage-by-stage progression with active Portals after boss defeat
- Browser-native deployment for judges and local play

## Visual specification

The project uses a simplified TheLast.io-inspired art language:

- rounded cartoon characters with black outlines
- top-down or slightly elevated camera
- high readability and large silhouettes
- soft fantasy palette with strong contrast
- minimal but polished HUD and UI
- no cluttered dashboard; the world remains the focus

## Game loop

1. Enter the stage and explore the environment
2. Defeat enemies and gather required items
3. Engage the stage boss
4. Defeat the foe and collect the Seal
5. The Portal activates and transports the player forward
6. Continue to the next stage with helper agent suggestions and voice interaction

## Exact project focus

This build follows the specification for:

- Stage 1 vertical slice first
- correct player and Elias visuals
- Sylvara encounter
- Portal activation after boss defeat
- browser-playable action loop
- WebMCP-connected companion system
- simple, clean UI built for judge readability and quick demoability

## Local run

```bash
pnpm install
pnpm dev
```

If your environment blocks package build scripts, run:

```bash
pnpm approve-builds
```

Then rerun:

```bash
pnpm install
pnpm dev
```

## Browser target

The app should run in a modern browser and be deployable for judge access via a public URL. The WebMCP-powered companion layer should be available in a compatible browser environment and gracefully degrade when unavailable.

## Key docs

- [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)
- [docs/MVP_BUILD_PLAN.md](./docs/MVP_BUILD_PLAN.md)
- [docs/DEMO_SCRIPT.md](./docs/DEMO_SCRIPT.md)
