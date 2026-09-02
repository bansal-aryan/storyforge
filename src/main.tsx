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
  const stored = await loadWorld();
  const currentSave = stored?.name === "Eclipse Inheritance"
    && stored.gameplay
    && Array.isArray(stored.gameplay.inventory)
    && Array.isArray(stored.gameplay.weaponPickups)
    && stored.gameplay.enemies.every((enemy) => typeof enemy.maxHp === "number");
  if (currentSave) {
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

  const registration = await registerStoryforgeTools();
  useWorldStore.getState().setWebMcp(registration.available ? "available" : "unavailable");
}

void bootstrap();

createRoot(document.getElementById("root")!).render(
  <StrictMode><App /></StrictMode>,
);
