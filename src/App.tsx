import { useCallback, useEffect, useRef, useState } from "react";
import { engine } from "./engine/instance";
import { useWorldStore } from "./store/useWorldStore";

type Point = { x: number; y: number };
type SpeechRecognitionLike = { continuous: boolean; interimResults: boolean; lang: string; onresult: ((event: any) => void) | null; onend: (() => void) | null; start: () => void; stop: () => void };

const WORLD = { width: 2200, height: 1300 };
const PLAYER_SIZE = 16;
const WORLD_MARGIN = 108;
const PORTAL_POINT = { x: 2070, y: 180 };
const obstacles = [
  { x: 350, y: 130, w: 170, h: 120 }, { x: 650, y: 300, w: 190, h: 150 },
  { x: 330, y: 860, w: 230, h: 130 }, { x: 850, y: 680, w: 210, h: 145 },
  { x: 1080, y: 180, w: 190, h: 120 }, { x: 1240, y: 510, w: 135, h: 105 },
  { x: 1430, y: 170, w: 170, h: 115 }, { x: 1510, y: 770, w: 210, h: 145 },
  { x: 1780, y: 930, w: 220, h: 125 }, { x: 1880, y: 520, w: 145, h: 105 },
  { x: 720, y: 1050, w: 180, h: 100 }, { x: 110, y: 380, w: 120, h: 85 },
];
type ControlAction = "up" | "down" | "left" | "right" | "attack" | "heavy" | "dodge" | "interact";
type Controls = Record<ControlAction, string>;
const defaultControls: Controls = { up: "KeyW", down: "KeyS", left: "KeyA", right: "KeyD", attack: "Space", heavy: "KeyF", dodge: "ShiftLeft", interact: "KeyE" };
const controlLabels: Record<ControlAction, string> = { up: "Move up", down: "Move down", left: "Move left", right: "Move right", attack: "Quick attack", heavy: "Heavy attack", dodge: "Dodge", interact: "Interact / collect" };
const prettyKey = (code: string) => code.replace("Key", "").replace("Arrow", "Arrow ").replace("Space", "Spacebar");
const forestDecor = [
  [180, 190, "fern"], [270, 540, "mushrooms"], [570, 150, "flowers"], [610, 760, "fern"],
  [820, 560, "flowers"], [930, 1150, "mushrooms"], [1050, 90, "fern"], [1310, 330, "flowers"],
  [1580, 110, "fern"], [1760, 680, "mushrooms"], [1950, 1160, "flowers"], [2030, 420, "fern"],
  [1180, 1080, "flowers"], [420, 1120, "fern"], [1450, 620, "mushrooms"], [2120, 850, "flowers"],
] as const;
const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
const distanceBetween = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

function StoryCrawl({ onFinish }: { onFinish: () => void }) {
  return <div className="intro-screen" role="dialog" aria-label="The story of Eclipse Inheritance">
    <div className="intro-stars" /><div className="intro-vignette" />
    <div className="crawl-stage"><article className="story-crawl">
      <p className="crawl-kicker">An age of shadow</p><h1>Eclipse Inheritance</h1>
      <p>Long ago, five sacred Seals bound the fury of root, memory, iron, wind, and dominion. Your bloodline guarded them, and beneath their watch the broken realms knew peace.</p>
      <p>Then Lord Aurelian Voss betrayed your house. On the Night of the Black Sun, he murdered your parents in a forbidden rite, tore the ancient power from your infant soul, and scattered the corrupted Seals among his lieutenants.</p>
      <p>He left one mistake behind: you survived.</p>
      <p>Now the permanent eclipse grows wider. Forests rot, drowned histories forget their names, slave-forges devour the innocent, and storms tear temples from the sky. When the fifth Seal falls, Voss will ascend beyond the reach of mortal blades.</p>
      <p>You are the Last Heir. Cross the five realms. Defeat the keepers of the Seals. Gather Elias, Lira, Rook, and Kael to your cause. Restore the inheritance stolen from your blood.</p>
      <p className="crawl-goal">Reclaim all five Eclipse Seals—and end Voss before the world forgets the dawn.</p>
    </article></div>
    <div className="intro-title-lockup"><span>The tale begins in</span><strong>Emberwood Glade</strong></div>
    <button className="intro-skip" onClick={onFinish}>Begin the inheritance</button>
  </div>;
}

function useKeyState() {
  const keys = useRef<Record<string, boolean>>({});
  useEffect(() => {
    const down = (event: KeyboardEvent) => { keys.current[event.code] = true; if (["Space", "KeyE", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "KeyW", "KeyA", "KeyS", "KeyD"].includes(event.code)) event.preventDefault(); };
    const up = (event: KeyboardEvent) => { keys.current[event.code] = false; };
    window.addEventListener("keydown", down); window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, []);
  return keys;
}

export default function App() {
  const snapshot = useWorldStore((state) => state.snapshot);
  const webmcp = useWorldStore((state) => state.webmcp);
  const confirmation = useWorldStore((state) => state.confirmation);
  const resolveConfirmation = useWorldStore((state) => state.resolveConfirmation);
  const game = snapshot?.gameplay;
  const keys = useKeyState();
  const [player, setPlayer] = useState<Point>(() => game?.player ?? { x: 240, y: 720 });
  const [eliasVisual, setEliasVisual] = useState<Point>(() => game?.companion ?? { x: 400, y: 600 });
  const [viewport, setViewport] = useState({ width: window.innerWidth, height: window.innerHeight - 92 });
  const [heroAttacking, setHeroAttacking] = useState(false);
  const [eliasAttacking, setEliasAttacking] = useState(false);
  const [heroDamaged, setHeroDamaged] = useState(false);
  const [eliasDamaged, setEliasDamaged] = useState(false);
  const [hitEnemyId, setHitEnemyId] = useState<string | null>(null);
  const [dodging, setDodging] = useState(false);
  const [showIntro, setShowIntro] = useState(() => !new URLSearchParams(window.location.search).has("demo") && sessionStorage.getItem("storyforge:intro-seen:v1") !== "yes");
  const [agentPanelOpen, setAgentPanelOpen] = useState(() => new URLSearchParams(window.location.search).has("demo"));
  const [voiceLog, setVoiceLog] = useState<string[]>(["Companion link ready. Recruit your ally to issue tactical commands."]);
  const [voiceInput, setVoiceInput] = useState("");
  const [micEnabled, setMicEnabled] = useState(false);
  const [controlsOpen, setControlsOpen] = useState(false);
  const [listeningFor, setListeningFor] = useState<ControlAction | null>(null);
  const [controls, setControls] = useState<Controls>(() => {
    try { return { ...defaultControls, ...JSON.parse(localStorage.getItem("storyforge:controls:v1") ?? "{}") }; } catch { return defaultControls; }
  });
  const playerRef = useRef(player);
  const eliasRef = useRef(eliasVisual);
  const attackCooldownRef = useRef(0);
  const portalTriggeredRef = useRef(false);
  const eliasAttackRef = useRef(0);
  const combatTickRef = useRef(0);
  const dodgingRef = useRef(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const previousHeroHp = useRef(game?.player.hp ?? 100);
  const previousEliasHp = useRef(game?.companion.hp ?? 100);
  const enemyHpRef = useRef<Record<string, number>>(Object.fromEntries(game?.enemies.map((enemy) => [enemy.id, enemy.hp]) ?? []));

  useEffect(() => { playerRef.current = player; }, [player]);
  useEffect(() => { eliasRef.current = eliasVisual; }, [eliasVisual]);
  useEffect(() => {
    if (!game) return;
    playerRef.current = { x: game.player.x, y: game.player.y };
    eliasRef.current = { x: game.companion.x, y: game.companion.y };
    setPlayer(playerRef.current);
    setEliasVisual(eliasRef.current);
    portalTriggeredRef.current = false;
    setVoiceLog([`${game.biome.name}: find ${game.companion.name} and break ${game.boss.name}'s defenses.`]);
  }, [game?.stage]);
  useEffect(() => { if (game && !game.companion.recruited) setEliasVisual({ x: game.companion.x, y: game.companion.y }); }, [game?.companion.recruited, game?.companion.x, game?.companion.y]);
  useEffect(() => {
    if (game && game.player.hp === 100 && game.player.x === 240 && game.player.y === 720 && distanceBetween(playerRef.current, game.player) > 20) setPlayer({ x: game.player.x, y: game.player.y });
  }, [game?.player.hp, game?.player.x, game?.player.y]);
  useEffect(() => {
    const resize = () => setViewport({ width: window.innerWidth, height: window.innerHeight - (window.innerWidth <= 900 ? 76 : 92) });
    window.addEventListener("resize", resize); return () => window.removeEventListener("resize", resize);
  }, []);
  useEffect(() => {
    if (!game) return;
    if (game.player.hp < previousHeroHp.current) { setHeroDamaged(true); window.setTimeout(() => setHeroDamaged(false), 360); }
    if (game.companion.hp < previousEliasHp.current) { setEliasDamaged(true); window.setTimeout(() => setEliasDamaged(false), 360); }
    const struck = game.enemies.find((enemy) => enemy.hp < (enemyHpRef.current[enemy.id] ?? enemy.hp));
    if (struck) { setHitEnemyId(struck.id); window.setTimeout(() => setHitEnemyId(null), 300); }
    previousHeroHp.current = game.player.hp; previousEliasHp.current = game.companion.hp;
    enemyHpRef.current = Object.fromEntries(game.enemies.map((enemy) => [enemy.id, enemy.hp]));
  }, [game]);

  const speak = useCallback((text: string) => {
    if (!("speechSynthesis" in window)) return;
    const utterance = new SpeechSynthesisUtterance(text); utterance.rate = 1; utterance.pitch = 1.08;
    window.speechSynthesis.cancel(); window.speechSynthesis.speak(utterance);
  }, []);

  const handleInteraction = useCallback(() => {
    if (!game || game.stageComplete) return;
    const result = engine.stageOneInteract(playerRef.current);
    if (result.type !== "none") speak(result.summary);
    if (result.type === "recruitment_offer") setVoiceLog((previous) => [`${game.companion.name} completed their trial and wants an honest answer.`, ...previous].slice(0, 4));
  }, [game, speak]);

  const handleAttack = useCallback(() => {
    if (!game || game.stageComplete) return;
    const now = performance.now(); if (now - attackCooldownRef.current < 280) return;
    attackCooldownRef.current = now; setHeroAttacking(true); window.setTimeout(() => setHeroAttacking(false), 260); engine.stageOneAttack(playerRef.current);
  }, [game]);

  const handleHeavyAttack = useCallback(() => {
    if (!game || game.stageComplete || game.player.essence < 12) return;
    const now = performance.now(); if (now - attackCooldownRef.current < 520) return;
    attackCooldownRef.current = now; setHeroAttacking(true); window.setTimeout(() => setHeroAttacking(false), 420); engine.stageOneAttack(playerRef.current, { heavy: true });
  }, [game]);

  const handleDodge = useCallback(() => {
    if (dodgingRef.current || !game || game.player.essence < 6) return;
    engine.useDodge(); dodgingRef.current = true; setDodging(true); window.setTimeout(() => { dodgingRef.current = false; setDodging(false); }, 340);
  }, [game]);

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (listeningFor) {
        event.preventDefault();
        const next = { ...controls, [listeningFor]: event.code };
        setControls(next); localStorage.setItem("storyforge:controls:v1", JSON.stringify(next)); setListeningFor(null); return;
      }
      if (showIntro || controlsOpen) return;
      if (/^Digit[1-9]$/.test(event.code)) {
        const item = game?.inventory[Number(event.code.slice(-1)) - 1];
        if (item?.kind === "weapon") engine.equipWeapon(item.id);
      }
      if (event.code === controls.interact) handleInteraction();
      if (event.code === controls.attack) handleAttack();
      if (event.code === controls.heavy) handleHeavyAttack();
      if (event.code === controls.dodge) handleDodge();
    };
    window.addEventListener("keydown", down); return () => window.removeEventListener("keydown", down);
  }, [controls, controlsOpen, game?.inventory, handleAttack, handleDodge, handleHeavyAttack, handleInteraction, listeningFor, showIntro]);

  useEffect(() => {
    if (!game || showIntro || controlsOpen || game.stageComplete) return;
    let raf = 0; let lastPositionSync = 0;
    const tick = (time: number) => {
      const current = playerRef.current; let dx = 0; let dy = 0;
      if (keys.current[controls.up]) dy -= 1; if (keys.current[controls.down]) dy += 1;
      if (keys.current[controls.left]) dx -= 1; if (keys.current[controls.right]) dx += 1;
      if (dx || dy) {
        const length = Math.hypot(dx, dy) || 1;
        const speed = dodgingRef.current ? 8.2 : game.blessings.includes("wind") ? 3.45 : 2.8;
        const candidate = { x: clamp(current.x + (dx / length) * speed, WORLD_MARGIN, WORLD.width - WORLD_MARGIN), y: clamp(current.y + (dy / length) * speed, WORLD_MARGIN, WORLD.height - WORLD_MARGIN) };
        const collides = obstacles.some((rect) => { const nearestX = clamp(candidate.x, rect.x, rect.x + rect.w); const nearestY = clamp(candidate.y, rect.y, rect.y + rect.h); return (candidate.x - nearestX) ** 2 + (candidate.y - nearestY) ** 2 < PLAYER_SIZE ** 2; });
        if (!collides) { playerRef.current = candidate; setPlayer(candidate); }
      }
      if (game.companion.recruited && game.companion.mode !== "hold") {
        const target = { x: playerRef.current.x - 38, y: playerRef.current.y + 28 };
        const currentElias = eliasRef.current;
        const distance = distanceBetween(currentElias, target);
        const followRate = distance > 220 ? .16 : distance > 90 ? .095 : .055;
        const nextElias = { x: currentElias.x + (target.x - currentElias.x) * followRate, y: currentElias.y + (target.y - currentElias.y) * followRate };
        eliasRef.current = nextElias;
        setEliasVisual(nextElias);
      }
      if (time - lastPositionSync > 250) { engine.setPlayerPosition(playerRef.current); lastPositionSync = time; }
      if (time - combatTickRef.current > 120) { combatTickRef.current = time; engine.combatTick({ player: playerRef.current, companion: eliasRef.current, dodging: dodgingRef.current, now: Date.now() }); }
      if (game.companion.recruited && game.companion.hp > 0 && time - eliasAttackRef.current > 900) { eliasAttackRef.current = time; const result = engine.companionCombatTick(eliasRef.current); if (result.type !== "idle") { setEliasAttacking(true); window.setTimeout(() => setEliasAttacking(false), 300); } }
      if (game.portalActive && !portalTriggeredRef.current && distanceBetween(playerRef.current, PORTAL_POINT) < 28) { portalTriggeredRef.current = true; engine.stageOneInteract(playerRef.current); }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick); return () => cancelAnimationFrame(raf);
  }, [controls, controlsOpen, game, keys, showIntro]);

  const sendToElias = useCallback((message: string) => {
    if (!message.trim() || !game) return;
    const lowered = message.toLowerCase();
    if (lowered.includes("hold")) engine.setCompanionMode("hold");
    else if (lowered.includes("guard") || lowered.includes("protect")) engine.setCompanionMode("guard");
    else if (lowered.includes("focus") || lowered.includes("attack")) engine.setCompanionMode("focus");
    else if (lowered.includes("follow")) engine.setCompanionMode("follow");
    const response = engine.getCompanionResponse(message);
    setVoiceLog((previous) => [`You: ${message}`, `${game.companion.name}: ${response}`, ...previous].slice(0, 4)); speak(response); setVoiceInput("");
  }, [game, speak]);

  const startVoiceChat = () => {
    const Recognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!Recognition) { setVoiceLog((previous) => ["Speech recognition is unavailable here. The text command remains active.", ...previous].slice(0, 4)); return; }
    const recognition = new Recognition() as SpeechRecognitionLike;
    recognition.lang = "en-US"; recognition.continuous = false; recognition.interimResults = false;
    recognition.onresult = (event: any) => sendToElias(event.results[0][0].transcript.trim()); recognition.onend = () => setMicEnabled(false);
    recognition.start(); recognitionRef.current = recognition; setMicEnabled(true);
  };

  const closeIntro = () => { sessionStorage.setItem("storyforge:intro-seen:v1", "yes"); setShowIntro(false); };
  if (!snapshot || !game) return <div className="loading-screen">Awakening the inheritance…</div>;
  const completedCount = game.objectives.filter((objective) => objective.completed).length;
  const aliveEnemies = game.enemies.filter((enemy) => enemy.alive).length;
  const companionGlyph = game.companion.role.includes("Mage") ? "✧" : game.companion.role.includes("Golem") ? "◆" : game.companion.role.includes("Monk") ? "⌁" : "➶";
  const pendingProposals = snapshot.proposals.filter((proposal) => proposal.status === "pending").slice(0, 3);
  const agentActivity = snapshot.activity.filter((entry) => entry.actor === "agent").slice(0, 5);
  const camera = { x: clamp(viewport.width / 2 - player.x, viewport.width - WORLD.width, 0), y: clamp(viewport.height / 2 - player.y, viewport.height - WORLD.height, 0) };

  return <div className="game-root clean-game">
    {showIntro && <StoryCrawl onFinish={closeIntro} />}
    {confirmation && <div className="controls-backdrop" role="dialog" aria-modal="true" aria-label={confirmation.title}><section className="agent-confirmation"><small>WebMCP requests approval</small><h2>{confirmation.title}</h2><p>{confirmation.body}</p><div><button onClick={() => resolveConfirmation(false)}>Reject</button><button className="approve" onClick={() => resolveConfirmation(true)}>Approve</button></div></section></div>}
    {controlsOpen && <div className="controls-backdrop" role="dialog" aria-label="Edit game controls"><section className="controls-modal"><div className="controls-heading"><div><small>Settings</small><h2>Controls</h2></div><button onClick={() => { setControlsOpen(false); setListeningFor(null); }}>×</button></div><p>Select an action, then press any key to rebind it.</p><div className="control-list">{(Object.keys(controlLabels) as ControlAction[]).map((action) => <div className="control-row" key={action}><span>{controlLabels[action]}</span><button className={listeningFor === action ? "listening" : ""} onClick={() => setListeningFor(action)}>{listeningFor === action ? "Press a key…" : prettyKey(controls[action])}</button></div>)}</div><div className="controls-actions"><button onClick={() => { setControls(defaultControls); localStorage.setItem("storyforge:controls:v1", JSON.stringify(defaultControls)); }}>Restore defaults</button><button className="primary-action" onClick={() => setControlsOpen(false)}>Done</button></div></section></div>}
    {game.pendingBlessing && <div className="blessing-backdrop"><section className="blessing-modal"><small>{game.seal.name} resonates</small><h2>Choose a blessing</h2><p>Each restored objective returns a fragment of your inheritance.</p><div className="blessing-grid"><button disabled={game.blessings.includes("vigor")} onClick={() => engine.chooseBlessing("vigor")}><b>♥</b><strong>Vigor</strong><span>+20 maximum health</span></button><button disabled={game.blessings.includes("fury")} onClick={() => engine.chooseBlessing("fury")}><b>✦</b><strong>Fury</strong><span>Weapons deal +1 damage</span></button><button disabled={game.blessings.includes("wind")} onClick={() => engine.chooseBlessing("wind")}><b>◌</b><strong>Wind</strong><span>Move faster through the realm</span></button><button disabled={game.blessings.includes("bond")} onClick={() => engine.chooseBlessing("bond")}><b>➶</b><strong>Bond</strong><span>{game.companion.name} gains health and double damage</span></button></div></section></div>}
    {game.recruitment.offerReady && <div className="blessing-backdrop"><section className="recruitment-modal"><small>Trust earned · {game.companion.role}</small><h2>{game.companion.name}</h2><p className="companion-personality">{game.companion.personality}</p><blockquote>{game.recruitment.prompt}</blockquote><div className="recruitment-choices">{game.recruitment.choices.map((choice, index) => <button key={choice} onClick={() => { const result = engine.resolveRecruitment(index as 0 | 1); speak(result.summary); }}><span>{index === 0 ? "Friendship" : "Alliance"}</span><strong>{choice}</strong></button>)}</div><p className="companion-stakes"><b>Fights for:</b> {game.companion.motivation}<br/><b>Fears:</b> {game.companion.fear}</p></section></div>}
    <div className="minimal-shell" aria-hidden={showIntro}>
      <nav className="hud-nav" aria-label="Game status">
        <div className="hud-brand"><strong>Stage {game.stage}</strong><span>{game.biome.name}</span></div>
        <section className="hud-section player-hud"><div className="hud-label"><span>Last Heir</span><b>{game.player.hp}/{game.player.maxHp}</b></div><div className="mini-meter friendly"><i style={{ width: `${(game.player.hp / game.player.maxHp) * 100}%` }} /></div><small>{game.inventory.find((item) => item.id === game.player.weaponId)?.name} · {game.player.essence} essence</small></section>
        <section className="hud-section objective-hud"><span>Current objective</span><strong>{game.objective}</strong></section>
        <section className="hud-section elias-hud"><div className="hud-label"><span>{game.companion.name} · {game.companion.mode}</span><b>{game.companion.recruited ? `${game.companion.hp}/${game.companion.maxHp}` : "—"}</b></div><div className="mini-meter friendly"><i style={{ width: `${game.companion.recruited ? (game.companion.hp / game.companion.maxHp) * 100 : 0}%` }} /></div><small>{game.companion.recruited ? `${game.companion.role} active` : "Not recruited"}</small></section>
        <section className="hud-section progress-hud"><span>{game.biome.subtitle} · Party {game.retinue.length + (game.companion.recruited ? 1 : 0)}</span><strong>{completedCount}/3 objectives · {aliveEnemies} threats</strong><div className="pressure-meter" title={game.pressure.description}><i style={{ width: `${game.pressure.value}%` }} /></div><small>{game.pressure.name} {game.pressure.value}/{game.pressure.max} · {game.campaignComplete ? "Dawn restored" : game.sealCollected ? "Seal secured" : game.portalActive ? "Portal active" : "Boss shielded"}</small></section>
        <div className="hud-actions"><span className={`mcp-light ${webmcp}`} title={`WebMCP ${webmcp}`} /><button className={agentPanelOpen ? "active" : ""} onClick={() => setAgentPanelOpen((open) => !open)}>Agent</button><button onClick={() => setControlsOpen(true)}>Controls</button><button onClick={() => setShowIntro(true)}>Lore</button></div>
      </nav>
      <main className={`world-panel expanded-world theme-${game.biome.theme} ${game.campaignComplete ? "campaign-complete" : ""}`}>
        <div className="camera-layer" style={{ width: WORLD.width, height: WORLD.height, transform: `translate3d(${camera.x}px, ${camera.y}px, 0)` }}>
        <div className="terrain" /><div className="forest-mist mist-one" /><div className="forest-mist mist-two" /><div className="forest-path path-main" /><div className="forest-path path-branch" />
        <div className="world-boundary boundary-north" /><div className="world-boundary boundary-west" /><div className="world-boundary boundary-east" /><div className="world-boundary boundary-south"><span>Uncrossable Moonwater</span></div>
        {forestDecor.map(([x, y, kind], index) => <div className={`forest-decor ${kind}`} key={`${kind}-${index}`} style={{ left: x, top: y }} />)}
        <div className="village-ruin ruin-top" /><div className="village-ruin ruin-mid" /><div className="village-ruin ruin-bottom" /><div className="ancient-shrine"><span>✧</span></div>
        {obstacles.map((rect, index) => <div key={index} className={`obstacle hard-obstacle formation-${index % 3}`} style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h }} />)}
        {game.objectives.map((objective) => <div key={objective.id} className={`totem stage-objective ${objective.completed ? "purified" : "corrupted"}`} style={{ left: objective.x, top: objective.y }} title={objective.label}><small>{objective.label}</small></div>)}
        {game.stage < 5 && <div className={`portal ${game.portalActive ? "active" : "inactive"}`} style={{ left: PORTAL_POINT.x, top: PORTAL_POINT.y }} />}
        {game.weaponPickups.filter((pickup) => !pickup.collected).map((pickup) => <div className="weapon-pickup" key={pickup.id} style={{ left: pickup.x, top: pickup.y }} title={`${pickup.item.name} — press ${prettyKey(controls.interact)}`}><span>{pickup.item.icon}</span><small>{pickup.item.name}</small></div>)}
        {game.retinue.map((ally, index) => <div key={ally.id} className={`companion-avatar retinue-avatar friendly-unit retinue-${index} ${eliasAttacking ? "unit-attacking" : ""}`} style={{ left: player.x - 58 - index * 34, top: player.y + 38 + (index % 2) * 26 }} title={`${ally.name} · ${ally.role}`}><div className="unit-health friendly"><i style={{ width: `${(ally.hp / ally.maxHp) * 100}%` }} /></div><span className="held-weapon bow">{ally.role.includes("Mage") ? "✧" : ally.role.includes("Golem") ? "◆" : ally.role.includes("Monk") ? "⌁" : "➶"}</span><small className="ally-name">{ally.name}</small></div>)}
        <div className={`${game.companion.recruited ? "companion-avatar elias-avatar friendly-unit" : "companion-ghost friendly-unit"} companion-${game.stage} ${eliasAttacking ? "unit-attacking" : ""} ${eliasDamaged ? "unit-damaged" : ""}`} style={{ left: eliasVisual.x, top: eliasVisual.y }} title={game.companion.recruited ? game.companion.name : `${game.companion.name}'s trial: ${game.recruitment.description}`}><div className="unit-health friendly"><i style={{ width: `${(game.companion.hp / game.companion.maxHp) * 100}%` }} /></div><span className="held-weapon bow">{companionGlyph}</span>{!game.companion.recruited && <small className="recruitment-hint">Trial: {game.recruitment.description}</small>}</div>
        {!game.boss.defeated && <div className={`boss-avatar enemy-unit phase-${game.boss.phase} intent-${game.boss.intent} ${game.boss.awakened ? "awakened" : "shielded"} ${heroAttacking && distanceBetween(player, game.boss) < 65 ? "unit-hit" : ""}`} style={{ left: game.boss.x, top: game.boss.y }}><div className="unit-health enemy"><i style={{ width: `${(game.boss.hp / game.boss.maxHp) * 100}%` }} /></div><span className="sylvara-crown">♠</span><small className="boss-phase">{game.boss.name} · Phase {game.boss.phase}</small>{(game.boss.intent === "strike" || game.boss.intent === "summon") && <span className="boss-telegraph">{game.boss.intent === "strike" ? "POWER STRIKE" : "SUMMONING"}</span>}</div>}
        {game.boss.defeated && !game.sealCollected && <div className="seal-pickup" style={{ left: game.boss.x, top: game.boss.y }} title={game.seal.name}>{game.seal.icon}</div>}
        {game.enemies.filter((enemy) => enemy.alive).map((enemy) => <div key={enemy.id} className={`enemy-avatar enemy-unit styled-enemy intent-${enemy.intent} ${enemy.kind} ${hitEnemyId === enemy.id ? "unit-hit" : ""}`} style={{ left: enemy.x, top: enemy.y }}><div className="unit-health enemy"><i style={{ width: `${(enemy.hp / enemy.maxHp) * 100}%` }} /></div><span className="enemy-face"><i /><i /></span><span className="enemy-detail" />{enemy.intent === "windup" && <span className="attack-telegraph">!</span>}</div>)}
        <div className={`hero-avatar friendly-unit ${heroAttacking ? "unit-attacking" : ""} ${heroDamaged ? "unit-damaged" : ""} ${dodging ? "unit-dodging" : ""}`} style={{ left: player.x, top: player.y }}><div className="unit-health friendly"><i style={{ width: `${(game.player.hp / game.player.maxHp) * 100}%` }} /></div><span className={`held-weapon ${game.player.weaponId}`}>⚔</span></div>
        </div>
        <div className="world-message">{game.storyLine}</div>
        {game.banter.length > 0 && <div className="party-banter" aria-live="polite"><small>Fellowship</small>{game.banter.slice(0, 2).map((line, index) => <p key={`${line.speaker}-${index}`}><b>{line.speaker}</b> {line.line}</p>)}</div>}
        <aside className="party-dock" aria-label="Fellowship abilities">{[...game.retinue, ...(game.companion.recruited ? [game.companion] : [])].map((ally) => { const cooling = ally.ability.readyAt > Date.now(); return <button key={ally.id} disabled={cooling || ally.hp <= 0} onClick={() => engine.useCompanionAbility(ally.id)} title={ally.ability.description}><span>{ally.name}</span><strong>{ally.ability.name}</strong><small>{ally.bond} · {ally.trust} trust{cooling ? " · recharging" : " · ready"}</small></button>; })}</aside>
        {agentPanelOpen && <aside className="agent-panel" aria-label="WebMCP agent activity"><header><div><small>Live collaboration</small><strong>WebMCP Agent</strong></div><span className={`agent-status ${webmcp}`}>{webmcp}</span></header><p className="agent-explainer">The agent reads canonical battle state and issues structured, logged commands. Story-changing proposals stay yours to approve.</p><div className="agent-tools"><code>inspect_battlefield</code><code>command_companion</code><code>explain_next_objective</code></div>{pendingProposals.length > 0 && <section><h3>Needs your decision</h3>{pendingProposals.map((proposal) => <article className="proposal-row" key={proposal.id}><div><small>{proposal.toolName}</small><p>{proposal.summary}</p></div><div><button onClick={() => engine.rejectProposal(proposal.id)}>Reject</button><button className="approve" onClick={() => engine.applyProposal(proposal.id)}>Accept</button></div></article>)}</section>}<section><h3>Agent activity</h3>{agentActivity.length ? agentActivity.map((entry) => <article className="activity-row" key={entry.id}><code>{entry.toolName ?? "agent"}</code><span>{entry.summary}</span></article>) : <p className="agent-empty">Waiting for the first WebMCP tool call. Ask the agent to inspect the battlefield.</p>}</section></aside>}
        <div className="companion-command" title={voiceLog[0]}><div className="stance-buttons">{(["follow", "focus", "guard", "hold"] as const).map((mode) => <button key={mode} disabled={!game.companion.recruited} className={game.companion.mode === mode ? "active" : ""} onClick={() => engine.setCompanionMode(mode)}>{mode}</button>)}</div><input value={voiceInput} disabled={!game.companion.recruited} onChange={(event) => setVoiceInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") sendToElias(voiceInput); }} placeholder={game.companion.recruited ? `Command ${game.companion.name}…` : `Recruit ${game.companion.name} to issue commands`} /><button disabled={!game.companion.recruited} onClick={startVoiceChat}>{micEnabled ? "Listening" : "Voice"}</button></div>
        <div className="hotbar" aria-label="Inventory hotbar">{game.inventory.map((item, index) => <button key={item.id} className={`hotbar-slot ${item.id === game.player.weaponId ? "equipped" : ""} ${item.kind}`} title={item.description} onClick={() => { if (item.kind === "weapon") engine.equipWeapon(item.id); }}><kbd>{index + 1}</kbd><span>{item.icon}</span><small>{item.name}</small></button>)}{Array.from({ length: Math.max(0, 5 - game.inventory.length) }, (_, index) => <div className="hotbar-slot empty" key={`empty-${index}`}><kbd>{game.inventory.length + index + 1}</kbd></div>)}</div>
        {game.campaignComplete && <div className="stage-complete-card ending-card"><small>The eclipse is broken</small><strong>Dawn Inherited</strong><p>Five Seals unite. The companions survive, Voss falls, and light returns to the five realms.</p></div>}
      </main>
    </div>
  </div>;
}
