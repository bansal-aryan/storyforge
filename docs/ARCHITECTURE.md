# Eclipse Inheritance Architecture

This project is a browser-based top-down action-RPG built around the exact visual specification in the game brief. The game language is simple, readable, and playful: a TheLast.io-inspired cartoon fantasy world with direct player control, companion AI, and stage progression that is easy to understand in a browser.

The current implementation is a top-down browser action-RPG called Eclipse Inheritance with a complete five-stage campaign. All stages share one deterministic engine and progression contract while supplying authored biome, objective, enemy, companion, weapon, boss, and Seal data.

## Product principles

- Player-first action: the human controls the Heir directly with simple movement and combat inputs.
- Top-down readability: the battlefield stays visible, clean, and readable at all times.
- TheLast.io art language: soft cartoon forms, black outlines, readable silhouettes, and simple shapes.
- Visible world state: objectives, enemy count, health, shrine status, and companion updates must be instantly understandable.
- Deterministic canon: the game engine decides what is real; agents propose actions but do not silently rewrite World state.
- WebMCP-native companion layer: companions and agents operate through structured tool calls and visible proposals.

## Core gameplay loop

1. The player begins in a small playable area.
2. The player explores with WASD or arrow keys.
3. The player clears enemies, interacts with shrines, and gathers needed items.
4. The player reaches a boss encounter or a stage objective.
5. Once the stage boss is defeated and the Seal is collected, the Portal activates.
6. The player enters the active Portal to continue to the next stage.
7. The companion system offers contextual suggestions and voice-based commands without taking over.

## Global art and UI specification

### Visual language

- Top-down or slightly high-angle 3/4 camera.
- Small cartoon figures with strong silhouettes.
- Big rounded heads, short stubby limbs, soft body shapes, black outlines.
- Flat or lightly cel-shaded color, never realistic.
- Friendly but readable characters even in danger.
- Subtle idle animation and short walk cycles.
- The world remains readable, playful, and simple even under combat pressure.

### UI pattern

The game shell should feel like a clean browser game arena, not a 3D dashboard or a noisy RPG dashboard.

- top bar with minimal browser-like chrome
- main world arena in the center
- HUD panels for health, mana/essence, companion status, and current objective
- bottom action tray with control hints and ability states
- floating objective text during critical loops
- minimal overlays; the world stays the main event

## Exact player and companion design

### Player character: the Heir

- small rounded blob body, slightly taller than wide
- large warm skin-toned head with short dark brown messy hair
- large white eyes with black pupils
- dark teal tunic with a lighter teal collar and gold clasp
- short dark purple cape
- stubby rounded limbs and mittens
- short sword with gold guard and blue crystal pommel
- friendly heroic silhouette

### Companion 1: Elias (Ranger)

- light tan skin, sandy-blond hair with a leaf
- green alert eyes
- dark green hooded cloak and brown tunic
- wooden shortbow with a quiver
- leaf particles and alert scouting movement

### Companion 2: Lira (Scholar-Mage)

- pale skin, dark blue ponytail
- violet eyes
- purple robe with glowing book and crystal staff
- blue runes orbiting her

### Companion 3: Rook (Golem Tank)

- wider stone body with glowing orange cracks
- rounded stone head with glowing orange eye orbs
- thick stubby arms and stone fists
- dust particle trail when moving

### Companion 4: Kael (Sky-Monk)

- light skin, white windswept hair
- pale blue eyes
- white and light-blue robes with wind motion
- wind blades and white trails

## Story model

The player is the last surviving heir of a bloodline that once guarded the five Eclipse Seals.

Lord Aurelian Voss betrayed the family, slaughtered the player’s parents in a ritual, drained the player’s power as a child, and left them for dead to claim the Seals and become a god.

The goal is to reclaim all five Seals, restore the stolen power, and confront Voss.

Each stage contains a lieutenant who holds a Seal, and the player’s companions join the quest for revenge and restoration.

## Stage progression rules

Portal behavior is mandatory and exact:

- Each stage contains exactly one Portal.
- The Portal is inactive and faint until the stage boss is defeated.
- When the boss dies and the Seal is collected, the Portal activates with a swirling, stage-themed effect and clear audio cue.
- The active Portal is large, bright, and unmistakable.
- Walking into the active Portal loads the next stage.
- There is no other travel method between stages.
- Stage 5 has no Portal after Voss is defeated; the ending sequence begins immediately.

## Stage model

### Stage 1 – Emberwood Glade

- sacred forest corrupted by blight
- soft rounded trees, blackened trunks, and glowing green-black sap
- start at the ruins of the player’s childhood village
- first clearing at the family shrine and Sylvara’s initial encounter
- three blighted groves with blight totems
- Heart of the First Tree and the Seed of the First Tree
- refugee camps as optional lower-detail NPCs
- Portal at the Heart of the First Tree; it activates after Sylvara is defeated and the Seal of Roots is collected
- Elias is recruited here

### Stage 2 – Drowned Archives

- sunken library-city of erased history
- dark water, floating books, and ink tendrils
- Grand Atrium, Hall of Names, Submerged Scriptoria, Forbidden Wing, Nihil’s study, Central Codex Altar
- Portal at the Central Codex Altar
- Lira is freed from a living Memory Crystal

### Stage 3 – Crimson Forge

- volcanic industrial slave-forges
- lava rivers, rounded anvils, black-red palette
- Great Anvil Gates, Northern Ice Vents, Master Smithy, slave pens, Heart Forge
- Portal in the Heart Forge area
- Rook is recruited here

### Stage 4 – Veilspire Peaks

- storm-wracked floating temples
- soft white, pale blue, cloud-like terrain and floating platforms
- major tempest arenas, monastery, central spire, pure shrines
- Portal at the top of the Central Spire
- Kael is recruited here

### Stage 5 – Eclipse Citadel

- living-shadow fortress under a permanent eclipse
- outer courtyard, three wings, prison areas, ritual circles, eclipse throne room
- Malrik is fought first; Voss is the final boss
- no Portal after Voss; ending sequence begins immediately

## Companion command and WebMCP architecture

Text commands are the reliable baseline. Browser speech recognition and speech synthesis provide an optional voice layer when supported.

- the player can type or speak a command to the implemented companion, Elias
- Elias responds through browser speech synthesis when available
- WebMCP agents inspect current combat and quest state through structured tools
- players can issue natural-language requests to the browsing agent
- the system stays grounded in current world state rather than free-form off-screen behavior

### Registered tool surface

The judge-facing path uses three purpose-built gameplay tools:

- `inspect_battlefield` reads the live encounter without mutation
- `explain_next_objective` derives a legal next action from quest gates
- `command_companion` applies a reversible tactical stance and logs agent attribution

Additional tools expose world summaries, memory, continuity checks, party and quest proposals, companion dialogue proposals, and confirmed world rules. Story-changing proposals are displayed in the game with Accept and Reject controls.

## World engine architecture

The canonical world truth should live outside React in a deterministic game engine layer.

Core responsibilities:

- player position and stats
- party state and companion trust
- stage and quest progress
- portal activation and stage transitions
- inventory and item acquisition
- boss state and progress gates
- WebMCP tool execution and player confirmation flows

## Implementation recommendation

- Use React + TypeScript for the UI shell, HUD, and browser layout.
- Use a lightweight DOM/CSS or Canvas-based renderer for the top-down game world.
- Keep art readable and cartoon-like using black outlines, soft gradients, and simple shapes.
- Use deterministic state updates so the player sees visible, reliable consequences.
- Keep combat and quest gates data-driven so all five phases obey the same canonical rules.
- Give each phase a distinct visual palette, enemy silhouettes, companion identity, collectible weapon, boss, and narrative objective.
- Retain every successfully recruited companion in the travelling fellowship. The current realm's companion remains directly commandable, while veteran allies render in formation and add bounded support damage.
- Gate recruitment behind authored trials and use a stage-specific pressure meter to make each realm mechanically distinct.
- Persist each companion's personality, motivation, fear, trust, bond, memories, tactic, health, and ability cooldown across realm transitions. Recruitment dialogue choices seed relationship state, and contextual banter exposes that state during play.
- Route speech through per-character rate, pitch, and preferred natural system-voice profiles. Name-aware voice commands can change any recruited member's tactic or activate their signature ability; boss state transitions trigger separate voiced lines and visible captions.

## Delivery strategy

- Build the core game as a browser-native app with no hidden backend dependency for the main loop.
- Keep the first playable prototype minimal but solid.
- Treat WebMCP as a proving layer for agent actions, not as the gameplay itself.
- Prioritize judge-friendly playability and clear demo flow before layered feature expansion.
