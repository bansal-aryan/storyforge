import { useState } from "react";
import { engine } from "../engine/instance";
import { useWorldStore } from "../store/useWorldStore";

export function HumanActions() {
  const snap = useWorldStore((s) => s.snapshot)!;
  const [role, setRole] = useState("harbor witness");
  const [scene, setScene] = useState("");
  const locations = Object.values(snap.entities).filter((entity) => entity.kind === "location");
  return <section className="panel human-actions"><div className="section-heading"><span>Human actions</span><small>commits immediately</small></div>
    <label>Introduce an NPC<input value={role} onChange={(e) => setRole(e.target.value)} /></label>
    <button className="primary" onClick={() => engine.generateNpc({ role, locationId: snap.currentScene.locationId ?? undefined }, { actor: "human" })}>Add to world</button>
    <label>Advance scene<input placeholder="Scene title" value={scene} onChange={(e) => setScene(e.target.value)} /></label>
    <button onClick={() => engine.advanceScene({ title: scene || undefined, beat: "The table chooses to move forward.", locationId: snap.currentScene.locationId ?? locations[0]?.id }, { actor: "human" })}>Move time forward</button>
  </section>;
}
