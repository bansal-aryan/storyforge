import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { engine } from "./engine/instance";
import { loadWorld, saveWorld } from "./persist/storage";
import { useWorldStore } from "./store/useWorldStore";
import { registerStoryforgeTools } from "./webmcp/register";
import { setConfirmationUi } from "./webmcp/confirmation";

async function bootstrap() {
  let stored = null;
  try {
    stored = await loadWorld();
  } catch (error) {
    console.warn("The saved campaign could not be read; starting a fresh inheritance.", error);
  }
  const currentSave = stored?.name === "Eclipse Inheritance"
    && stored.gameplay
    && Array.isArray(stored.gameplay.inventory)
    && Array.isArray(stored.gameplay.weaponPickups)
    && Array.isArray(stored.gameplay.enemies)
    && stored.gameplay.enemies.every((enemy) => typeof enemy.maxHp === "number")
    && Array.isArray(stored.gameplay.retinue)
    && Array.isArray(stored.gameplay.banter)
    && typeof stored.gameplay.pressure?.value === "number"
    && typeof stored.gameplay.recruitment?.offerReady === "boolean"
    && typeof stored.gameplay.companion?.ability?.id === "string"
    && Array.isArray(stored.gameplay.companion?.memories)
    && Array.isArray(stored.gameplay.relationships)
    && Array.isArray(stored.gameplay.combos)
    && typeof stored.gameplay.autonomy === "string";
  if (currentSave && stored) {
    engine.load(stored);
  }
  else engine.loadEclipseInheritance();
  useWorldStore.getState().setSnapshot(engine.snapshot());
  setConfirmationUi({ confirmDestructive: useWorldStore.getState().askConfirmation });

  let saveTimer = 0;
  engine.subscribe((snapshot) => {
    useWorldStore.getState().setSnapshot(snapshot);
    window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(() => { void saveWorld(snapshot); }, 180);
  });

  try {
    const registration = await registerStoryforgeTools();
    useWorldStore.getState().setWebMcp(registration.available ? "available" : "unavailable");
  } catch (error) {
    console.warn("WebMCP registration was unavailable; gameplay will continue normally.", error);
    useWorldStore.getState().setWebMcp("unavailable");
  }
}

void bootstrap().catch((error) => {
  console.error("Campaign bootstrap failed; recovering with a fresh world.", error);
  engine.loadEclipseInheritance();
  useWorldStore.getState().setSnapshot(engine.snapshot());
});

createRoot(document.getElementById("root")!).render(
  <StrictMode><App /></StrictMode>,
);
