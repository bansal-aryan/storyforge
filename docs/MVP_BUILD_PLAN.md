# Eclipse Inheritance MVP Build Plan

## Product north star

Build a browser-playable fantasy action-adventure where the human player explores a readable, stylized world and commands companion agents that feel like real teammates. This is a game first, AI second.

The experience should feel like a polished prototype of a modern action-adventure RPG, with:

- a readable, cartoon fantasy world
- direct and immediate player control
- agentic companions with memory, personality, and initiative
- voice-driven commands and companion dialogue
- a clean demo flow that judges understand in under five minutes

## Judge-first design principle

The judges are not looking for vibe-coded novelty. They are looking for evidence that:

- the world is coherent and playable
- the AI is structured, grounded, and not hallucinating gameplay
- the experience is understandable in a demo
- the underlying systems are robust enough for iteration
- the project feels product-ready rather than technically interesting but empty

The strongest signals are:

- clear gameplay loop
- readable world and strong visual identity
- visible player agency
- explainable AI behavior
- polished stage-based progression

## MVP loop

1. Enter a small explorable scene or biome.
2. Move with WASD and interact with the world.
3. Engage enemies and clear the area.
4. Gather a required item or trigger the next objective.
5. Challenge a boss and defeat the stage enemy.
6. Collect the stage Seal and activate the Portal.
7. Advance to the next stage.
8. Continue with companion suggestions and voice-based commands.

## Must-have gameplay systems

- playable character movement
- direct exploration with a clear objective loop
- enemy encounters and simple combat pressure
- environmental interactables and shrine-based progression
- boss fight tied to a stage victory condition
- Portal activation after boss defeat
- visible stage progression and narrative identity
- human-controlled player with companion support

## Must-have AI systems

- world state awareness
- role-based companion behavior
- memory of recent action and conversation
- task suggestions that are visible before acceptance
- natural language command handling
- grounded responses tied to current location and objective
- safe tool execution over open-ended action

## Must-have visual systems

- readable, stylized environment with clean silhouettes
- top-down cartoon fantasy world
- clean HUD and objective display
- stage-specific atmosphere and readable terrain
- performant browser rendering and lightweight asset strategy

## Target technical architecture

### Rendering

Use a lightweight browser-rendered stack that prioritizes readability and speed:

- React + TypeScript for UI and game shell
- Canvas or DOM-based 2D scene rendering for the playable world
- stylized cartoon shading and flat color blocks
- minimal animation that keeps the world lively but readable

### Game loop architecture

- World engine owns canonical state.
- Renderer is presentation-only.
- Player controls update the engine directly.
- Companions propose and execute actions only through validated game actions.
- Stage gates, Portal activation, and boss defeat are engine-authoritative.

This is critical. The engine must be the historical truth. Agents help, but they do not bypass the world rules.

### Companion architecture

Each companion should have:

- identity and role
- memory of recent events
- current objective and combat awareness
- player-facing voice and personality
- safe action layer with confirmation flows

Recommended structure:

1. perception layer
2. memory layer
3. role + personality layer
4. planner
5. safe execution layer
6. voice and narration layer

## MVP schedule

### Phase 1: Stage 1 playable slice

Goal: deliver a complete first stage that feels like a real game.

Build:

- player movement
- world exploration
- enemy patrols or encounters
- shrine and objective interactions
- Sylvara battle sequence
- Seal collection and Portal activation
- Elias recruitment and companion follow behavior
- readable HUD and stage objective display

This is the minimum milestone that proves the game is playable.

### Phase 2: stage expansion and progression

Goal: show a full adventure structure.

Build:

- stage transitions through active Portals
- additional stage-specific enemies and boss logic
- stage-specific loot and artifact flow
- structured quest progression across multiple locations

### Phase 3: companion voice and AI

Goal: make companions feel like actual teammates.

Build:

- speech and text command support
- voice response layer
- companion suggestions tied to current world state
- task proposal UI
- personality-based reaction text and tactical feedback

### Phase 4: polish and deployability

Goal: make the demo feel polished and judge-friendly.

Build:

- clean HUD and world arrangement
- controller guidance and settings screen
- mobile-safe and browser-safe flow
- deployment-ready config
- accessibility and performance tuning

## Demo flow for judges

The best judge demo is a short moment of play:

- show the player moving through the stage
- show a clear objective and active threat
- show Sylvara encounter and boss defeat
- show the Portal activation sequence
- show Elias responding to a command or suggestion
- explain the WebMCP layer as a grounded companion system rather than a hidden magic box

This tells the story clearly: it is a playable fantasy action-adventure first, with a strong AI layer built in.
