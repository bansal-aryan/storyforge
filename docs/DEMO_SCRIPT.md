# Eclipse Inheritance Demo Script

Keep the demo under three minutes and keep it simple, playable, and clear.

## Demo structure

1. Introduce the game as a browser-playable fantasy action-adventure inspired by a clean top-down action RPG.
2. Show the world: the player avatar, enemy threats, shrine, objective marker, and a minimal HUD.
3. Show direct player control using WASD and clear action feedback.
4. Trigger the Sylvara encounter and explain the boss logic.
5. Show the Portal becoming active only after the defeat and Seal collection.
6. Introduce Elias as a companion that can speak, react, and help the player without taking over the game.
7. Demonstrate a natural-language or voice command and show the companion’s grounded response.
8. Explain the WebMCP integration and how companion tools are tied to world state rather than free-form nonsense.
9. Close on the broader vision: a full five-stage progression with exact story and portal-based world travel.

## Short script

“Eclipse Inheritance is a browser-playable fantasy action-adventure with a top-down, readable cartoon look inspired by TheLast.io. The player controls the Heir directly, explores the world, defeats enemies, and drives the story. The companions are not random assistants; they are structured teammates connected through WebMCP and grounded in the current game state.

In this Stage 1 slice, the player enters Emberwood Glade, fights Sylvara, and defeats her to claim the Seal of Roots. Once the boss is down, the Portal activates and allows progress to the next stage. Elias joins at this point and can provide tactical suggestions and spoken commands.

The key idea is that the human remains in charge. Agents propose, react, and support. They do not rewrite the story or move the player without consent. That keeps the game fun, readable, and trustworthy.”

## Judge-facing points

- The game is playable in the browser.
- The visual style is simple, readable, and intentional.
- The player controls a direct fantasy hero rather than a passive spectator.
- The world progression is clear and deterministic.
- The AI system is visible and grounded.
- The project is a real game prototype with a strong story and world structure.

## Fallback if WebMCP is unavailable

If the browser does not expose WebMCP in the moment, the demo should still work using a local fallback mode where the same game state and companion logic are still visible and the same actions are available through a controlled interface. The experience should remain coherent even without full WebMCP activation.
