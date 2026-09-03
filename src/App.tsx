import { useCallback, useEffect, useRef, useState } from "react";
import { engine } from "./engine/instance";
import { useWorldStore } from "./store/useWorldStore";
import { parsePartyCommand } from "./voice/commandParser";
import { clearWorld } from "./persist/storage";

type Point = { x: number; y: number };
type SpeechRecognitionLike = { continuous: boolean; interimResults: boolean; maxAlternatives?: number; lang: string; onresult: ((event: any) => void) | null; onerror: ((event: any) => void) | null; onstart: (() => void) | null; onspeechend?: (() => void) | null; onend: (() => void) | null; start: () => void; stop: () => void; abort?: () => void };

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
const voiceProfiles: Record<string, { pitch: number; rate: number; names: string[] }> = {
  chr_elias: { pitch: .88, rate: .94, names: ["Daniel", "Aaron", "Alex", "Google UK English Male"] },
  chr_lira: { pitch: 1.08, rate: .98, names: ["Samantha", "Ava", "Serena", "Google UK English Female"] },
  chr_rook: { pitch: .62, rate: .78, names: ["Ralph", "Fred", "Reed", "Google US English"] },
  chr_kael: { pitch: 1.16, rate: 1.08, names: ["Eddy", "Jamie", "Arthur", "Google UK English Male"] },
  chr_sylvara: { pitch: .78, rate: .84, names: ["Moira", "Tessa", "Karen", "Google UK English Female"] },
  chr_nihil: { pitch: .48, rate: .72, names: ["Albert", "Ralph", "Daniel"] },
  chr_ferrox: { pitch: .56, rate: .82, names: ["Fred", "Reed", "Alex"] },
  chr_tempest: { pitch: 1.28, rate: .9, names: ["Tessa", "Ava", "Moira"] },
  chr_voss: { pitch: .7, rate: .88, names: ["Daniel", "Arthur", "Aaron"] },
  narrator: { pitch: .96, rate: .94, names: ["Samantha", "Daniel", "Google UK English Female"] },
};
const bossLines: Record<string, { awaken: string; phases: [string, string]; defeat: string }> = {
  chr_sylvara: { awaken: "You prune branches and call it courage. Come, little heir. Let the roots judge you.", phases: ["The forest remembers your family's failure.", "If I fall, the blight takes us both!"], defeat: "The roots... chose you." },
  chr_nihil: { awaken: "Names are only cages. I will free you from yours.", phases: ["Was there an Elias? A Lira? You are already forgetting.", "No. I wrote the ending of this bloodline."], defeat: "Remember me... or I become nothing." },
  chr_ferrox: { awaken: "Every chain in this forge was hammered for you.", phases: ["Your fellowship will melt before your eyes.", "I am the fire that outlives kings!"], defeat: "Rook... you were made to obey." },
  chr_tempest: { awaken: "Climb high enough and even heroes learn to fall.", phases: ["The sky has no master!", "Then break with the mountain!"], defeat: "At last... the wind is mine again." },
  chr_voss: { awaken: "Look at the little family you assembled from my ruins.", phases: ["I gave each of them purpose through suffering.", "You inherited nothing but their graves!"], defeat: "You were supposed... to remain afraid." },
};

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
  const [spokenLine, setSpokenLine] = useState<{ speaker: string; text: string } | null>(null);
  const [micEnabled, setMicEnabled] = useState(false);
  const [commandStatus, setCommandStatus] = useState("Type a message or tap Mic to speak.");
  const [controlsOpen, setControlsOpen] = useState(false);
  const [resetArmed, setResetArmed] = useState(false);
  const [fellowshipOpen, setFellowshipOpen] = useState(false);
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
  const autonomyTickRef = useRef(0);
  const dodgingRef = useRef(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const voiceDispatchTimerRef = useRef<number>(0);
  const voiceSessionTimerRef = useRef<number>(0);
  const voiceDispatchedRef = useRef(false);
  const voiceTranscriptRef = useRef("");
  const previousHeroHp = useRef(game?.player.hp ?? 100);
  const previousEliasHp = useRef(game?.companion.hp ?? 100);
  const previousBossState = useRef({ stage: game?.stage ?? 1, awakened: game?.boss.awakened ?? false, phase: game?.boss.phase ?? 1, defeated: game?.boss.defeated ?? false });
  const lastRecommendationRef = useRef("");
  const proactiveTimerRef = useRef<number>(0);
  const enemyHpRef = useRef<Record<string, number>>(Object.fromEntries(game?.enemies.map((enemy) => [enemy.id, enemy.hp]) ?? []));

  useEffect(() => { playerRef.current = player; }, [player]);
  useEffect(() => { eliasRef.current = eliasVisual; }, [eliasVisual]);
  useEffect(() => () => {
    window.clearTimeout(voiceDispatchTimerRef.current);
    window.clearTimeout(voiceSessionTimerRef.current);
    recognitionRef.current?.abort?.();
  }, []);
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

  const speak = useCallback((text: string, speakerId = "narrator", speakerName?: string) => {
    if (!("speechSynthesis" in window)) return;
    const profile = voiceProfiles[speakerId] ?? voiceProfiles.narrator!;
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    utterance.voice = profile.names.map((name) => voices.find((voice) => voice.name.includes(name))).find(Boolean) ?? voices.find((voice) => voice.lang.startsWith("en") && /premium|enhanced|natural/i.test(voice.name)) ?? null;
    utterance.rate = profile.rate; utterance.pitch = profile.pitch; utterance.volume = 1;
    setSpokenLine({ speaker: speakerName ?? (speakerId.startsWith("chr_") ? speakerId.replace("chr_", "") : "Narrator"), text });
    utterance.onend = () => window.setTimeout(() => setSpokenLine((current) => current?.text === text ? null : current), 900);
    window.speechSynthesis.cancel(); window.speechSynthesis.speak(utterance);
  }, []);

  useEffect(() => {
    if (!game) return;
    const previous = previousBossState.current;
    if (previous.stage !== game.stage) previousBossState.current = { stage: game.stage, awakened: false, phase: 1, defeated: false };
    const prior = previousBossState.current;
    const lines = bossLines[game.boss.id];
    if (lines && game.boss.defeated && !prior.defeated) speak(lines.defeat, game.boss.id, game.boss.name);
    else if (lines && game.boss.awakened && !prior.awakened) speak(lines.awaken, game.boss.id, game.boss.name);
    else if (lines && game.boss.phase > prior.phase) speak(lines.phases[game.boss.phase - 2] ?? lines.phases[1], game.boss.id, game.boss.name);
    previousBossState.current = { stage: game.stage, awakened: game.boss.awakened, phase: game.boss.phase, defeated: game.boss.defeated };
  }, [game?.boss.awakened, game?.boss.defeated, game?.boss.phase, game?.stage, speak]);

  useEffect(() => {
    if (!game) return;
    const recommendation = engine.getFellowshipRecommendation();
    if (!recommendation || recommendation.urgency !== "high") return;
    const signature = `${game.stage}:${recommendation.memberId}:${recommendation.headline}`;
    if (lastRecommendationRef.current === signature) return;
    lastRecommendationRef.current = signature;
    const line = `${recommendation.headline}. ${recommendation.reason}`;
    setCommandStatus(`${recommendation.memberName} recommends: ${line}`);
    speak(line, recommendation.memberId, recommendation.memberName);
  }, [game?.boss.intent, game?.companion.hp, game?.player.essence, game?.player.hp, game?.pressure.value, game?.retinue, game?.stage, speak]);

  useEffect(() => {
    if (!game || showIntro || game.stageComplete) return;
    const offerAdvice = () => {
      const advice = engine.getProactiveCompanionLine();
      if (!advice) return;
      setCommandStatus(`${advice.memberName}: ${advice.line}`);
      setVoiceLog((previous) => [`${advice.memberName}: ${advice.line}`, ...previous].slice(0, 4));
      speak(advice.line, advice.memberId, advice.memberName);
    };
    proactiveTimerRef.current = window.setTimeout(offerAdvice, 7000);
    const interval = window.setInterval(offerAdvice, 18000);
    return () => { window.clearTimeout(proactiveTimerRef.current); window.clearInterval(interval); };
  }, [game?.stage, game?.stageComplete, showIntro, speak]);

  const handleInteraction = useCallback(() => {
    if (!game || game.stageComplete) return;
    const result = engine.stageOneInteract(playerRef.current);
    if (result.type !== "none") speak(result.summary, result.type === "recruitment_offer" ? game.companion.id : "narrator", result.type === "recruitment_offer" ? game.companion.name : undefined);
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
      if (time - autonomyTickRef.current > 1100) {
        autonomyTickRef.current = time;
        engine.runTrustedAutonomy();
        const initiative = engine.runCompanionInitiative();
        if (initiative) { setCommandStatus(initiative.summary); setVoiceLog((previous) => [initiative.summary, ...previous].slice(0, 4)); speak(initiative.summary.replace(`${initiative.memberName}: `, ""), initiative.memberId, initiative.memberName); }
      }
      if (game.companion.recruited && game.companion.hp > 0 && time - eliasAttackRef.current > 900) { eliasAttackRef.current = time; const result = engine.companionCombatTick(eliasRef.current); if (result.type !== "idle") { setEliasAttacking(true); window.setTimeout(() => setEliasAttacking(false), 300); } }
      if (game.portalActive && !portalTriggeredRef.current && distanceBetween(playerRef.current, PORTAL_POINT) < 28) { portalTriggeredRef.current = true; engine.stageOneInteract(playerRef.current); }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick); return () => cancelAnimationFrame(raf);
  }, [controls, controlsOpen, game, keys, showIntro]);

  const sendToElias = useCallback((message: string) => {
    if (!message.trim() || !game) { setCommandStatus("Enter a command or question first."); return; }
    const fellowship = [...game.retinue, ...(game.companion.recruited ? [game.companion] : [])];
    const parsed = parsePartyCommand(message, [...fellowship.map((ally) => ally.name), game.companion.name]);
    if (parsed.targetName === game.companion.name && !game.companion.recruited) {
      const response = `${game.companion.name} has not joined yet. Complete their trial: ${game.recruitment.description}`;
      setCommandStatus(response); setVoiceLog((previous) => [response, ...previous].slice(0, 4)); setVoiceInput(""); return;
    }
    const inferredAbilityTarget = parsed.action === "ability" && !parsed.targetName
      ? fellowship.find((ally) => /heal|revive|shield|bulwark/i.test(message) && ally.ability.id === "bulwark")
        ?? fellowship.find((ally) => /pressure|essence|memory|amnesia|stabilize|restore/i.test(message) && ally.ability.id === "clarity")
        ?? fellowship.find((ally) => /interrupt|wind|storm|group|everyone/i.test(message) && ally.ability.id === "gust")
        ?? fellowship.find((ally) => /mark|snipe|strongest|priority/i.test(message) && ally.ability.id === "mark")
      : undefined;
    const inferredSpeaker = !parsed.targetName
      ? fellowship.find((ally) => /heal|hurt|health|protect|defend|shield|survive/i.test(message) && ally.id === "chr_rook")
        ?? fellowship.find((ally) => /memory|remember|puzzle|ritual|objective|pressure|blight|amnesia|heat|corruption|what should|recommend|plan/i.test(message) && ally.id === "chr_lira")
        ?? fellowship.find((ally) => /scout|track|mark|target|strongest|path|where/i.test(message) && ally.id === "chr_elias")
        ?? fellowship.find((ally) => /interrupt|storm|wind|group|everyone|escape|fast/i.test(message) && ally.id === "chr_kael")
        ?? (parsed.action === "guard" ? fellowship.find((ally) => ally.id === "chr_rook") : undefined)
        ?? (parsed.action === "focus" ? fellowship.find((ally) => ally.id === "chr_elias") : undefined)
      : undefined;
    const targets = parsed.everyone ? fellowship : [fellowship.find((ally) => ally.name === parsed.targetName) ?? inferredAbilityTarget ?? inferredSpeaker ?? (game.companion.recruited ? game.companion : fellowship[0])].filter(Boolean);
    if (!targets.length) { const response = "No recruited companion can answer yet."; setCommandStatus(response); setVoiceLog((previous) => [response, ...previous].slice(0, 4)); return; }
    let actionSummary = ""; const target = targets[0]!;
    try {
      if (/\b(trusted|advisory|manual) mode\b/i.test(message)) {
        const mode = /trusted/i.test(message) ? "trusted" : /manual/i.test(message) ? "manual" : "advisory";
        actionSummary = engine.setAutonomy(mode).summary;
      } else if (/\b(combo|combined attack|team attack)\b/i.test(message)) {
        const combo = engine.getAvailableCombos().find((candidate) => candidate.ready && (!parsed.targetName || candidate.members.includes(target.id)));
        actionSummary = combo ? engine.useFellowshipCombo(combo.id).summary : "No trusted companion combo is ready yet.";
      } else if (/\b(battle plan|coordinate everyone|team plan|plan for everyone)\b/i.test(message)) {
        const plan = engine.proposeBattlePlan("human"); actionSummary = `${plan.headline}. Review the assignments before execution.`;
      } else if (/\b(do it|execute|your recommendation|that plan)\b/i.test(message)) actionSummary = engine.applyFellowshipRecommendation().summary;
      else if (/\b(recommend|suggest|plan|what should|best move|advice)\b/i.test(message)) {
        const recommendation = engine.getFellowshipRecommendation();
        actionSummary = recommendation ? `${recommendation.memberName} recommends: ${recommendation.headline}. ${recommendation.reason}` : "Recruit a companion and I can build a fellowship plan.";
      } else if (parsed.action === "ability") actionSummary = targets.map((ally) => engine.useCompanionAbility(ally!.id).summary).join(" ");
      else if (parsed.action === "guard" || parsed.action === "focus" || parsed.action === "hold" || parsed.action === "follow") {
        const tactic: "guard" | "focus" | "hold" | "follow" = parsed.action;
        actionSummary = targets.map((ally) => engine.setFellowshipMemberTactic(ally!.id, tactic).summary).join(" ");
      }
    } catch (error) { actionSummary = error instanceof Error ? error.message : "I can't do that yet."; }
    const response = actionSummary || engine.getCompanionResponse(message, target.id);
    setCommandStatus(`${target.name}: ${response}`); setVoiceLog((previous) => [`You: ${message}`, `${target.name}: ${response}`, ...previous].slice(0, 4)); speak(response, target.id, target.name); setVoiceInput("");
  }, [game, speak]);

  const startVoiceChat = () => {
    if (micEnabled) { recognitionRef.current?.stop(); setCommandStatus("Finishing transcript…"); return; }
    const Recognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!window.isSecureContext) { setCommandStatus("Microphone input requires HTTPS. Typed commands still work."); return; }
    if (!Recognition) { const status = "This browser does not provide speech recognition. Use the Send button or try Chrome/Safari."; setCommandStatus(status); setVoiceLog((previous) => [status, ...previous].slice(0, 4)); return; }
    const recognition = new Recognition() as SpeechRecognitionLike;
    recognition.lang = "en-US"; recognition.continuous = false; recognition.interimResults = true; recognition.maxAlternatives = 1;
    const dispatchTranscript = (transcript: string) => { if (voiceDispatchedRef.current || !transcript.trim()) return; voiceDispatchedRef.current = true; window.clearTimeout(voiceDispatchTimerRef.current); window.clearTimeout(voiceSessionTimerRef.current); setVoiceInput(transcript); setCommandStatus(`Heard: “${transcript}”`); sendToElias(transcript); recognition.stop(); };
    recognition.onstart = () => { voiceDispatchedRef.current = false; voiceTranscriptRef.current = ""; setMicEnabled(true); setCommandStatus("Listening… speak now."); voiceSessionTimerRef.current = window.setTimeout(() => { if (!voiceDispatchedRef.current) { recognition.stop(); setCommandStatus("Listening timed out. Tap Mic and try a shorter command."); } }, 6500); };
    recognition.onresult = (event: any) => {
      let transcript = ""; let final = false;
      for (let index = event.resultIndex ?? 0; index < event.results.length; index += 1) { transcript += `${event.results[index][0]?.transcript ?? ""} `; final ||= Boolean(event.results[index].isFinal); }
      transcript = transcript.trim(); if (!transcript) return;
      voiceTranscriptRef.current = transcript; setVoiceInput(transcript); setCommandStatus(`Hearing: “${transcript}”`);
      window.clearTimeout(voiceDispatchTimerRef.current);
      if (final) dispatchTranscript(transcript);
      else voiceDispatchTimerRef.current = window.setTimeout(() => dispatchTranscript(transcript), 550);
    };
    recognition.onspeechend = () => { window.clearTimeout(voiceDispatchTimerRef.current); voiceDispatchTimerRef.current = window.setTimeout(() => { const transcript = voiceTranscriptRef.current.trim(); if (transcript && !voiceDispatchedRef.current) dispatchTranscript(transcript); else recognition.stop(); }, 180); };
    recognition.onerror = (event: any) => { window.clearTimeout(voiceDispatchTimerRef.current); window.clearTimeout(voiceSessionTimerRef.current); const messages: Record<string, string> = { "not-allowed": "Microphone access was denied. Allow microphone access in browser settings, or use Send.", "audio-capture": "No microphone was detected.", "no-speech": "No speech was detected. Tap Mic and speak after Listening appears.", network: "Speech recognition could not reach the browser service. Typed commands still work." }; setCommandStatus(messages[event.error] ?? `Voice input failed (${event.error ?? "unknown error"}). Typed commands still work.`); setMicEnabled(false); };
    recognition.onend = () => { window.clearTimeout(voiceDispatchTimerRef.current); window.clearTimeout(voiceSessionTimerRef.current); setMicEnabled(false); };
    try { recognitionRef.current = recognition; recognition.start(); } catch (error) { setMicEnabled(false); setCommandStatus(error instanceof Error ? `Could not start the microphone: ${error.message}` : "Could not start the microphone."); }
  };

  const closeIntro = () => { sessionStorage.setItem("storyforge:intro-seen:v1", "yes"); setShowIntro(false); };
  const restartCampaign = async () => {
    await clearWorld();
    sessionStorage.removeItem("storyforge:intro-seen:v1");
    engine.loadEclipseInheritance();
    setVoiceInput("");
    setVoiceLog(["A new inheritance begins. Find Elias and purify the West Grove."]);
    setCommandStatus("Campaign restarted. Type a message or tap Mic to speak.");
    setResetArmed(false);
    setControlsOpen(false);
    setShowIntro(true);
  };
  if (!snapshot || !game) return <div className="loading-screen">Awakening the inheritance…</div>;
  const completedCount = game.objectives.filter((objective) => objective.completed).length;
  const aliveEnemies = game.enemies.filter((enemy) => enemy.alive).length;
  const companionGlyph = game.companion.role.includes("Mage") ? "✧" : game.companion.role.includes("Golem") ? "◆" : game.companion.role.includes("Monk") ? "⌁" : "➶";
  const pendingProposals = snapshot.proposals.filter((proposal) => proposal.status === "pending").slice(0, 3);
  const agentActivity = snapshot.activity.filter((entry) => entry.actor === "agent").slice(0, 5);
  const fellowshipRecommendation = engine.getFellowshipRecommendation();
  const fellowship = [...game.retinue, ...(game.companion.recruited ? [game.companion] : [])];
  const awayMemberIds = new Set(game.initiatives.filter((initiative) => initiative.status === "away").map((initiative) => initiative.memberId));
  const activeInitiative = game.initiatives.find((initiative) => initiative.status === "away");
  const abilityName = (abilityId?: string) => fellowship.find((member) => member.ability.id === abilityId)?.ability.name;
  const camera = { x: clamp(viewport.width / 2 - player.x, viewport.width - WORLD.width, 0), y: clamp(viewport.height / 2 - player.y, viewport.height - WORLD.height, 0) };

  return <div className="game-root clean-game">
    {showIntro && <StoryCrawl onFinish={closeIntro} />}
    {fellowshipOpen && <div className="controls-backdrop" role="dialog" aria-label="Fellowship"><section className="fellowship-modal"><div className="controls-heading"><div><small>Party</small><h2>The Fellowship</h2></div><button onClick={() => setFellowshipOpen(false)}>×</button></div><div className="autonomy-setting"><div><strong>Companion autonomy</strong><span>Manual waits. Advisory allows personal initiatives. Trusted also handles urgent defense.</span></div><div>{(["manual", "advisory", "trusted"] as const).map((mode) => <button className={game.autonomy === mode ? "active" : ""} key={mode} onClick={() => engine.setAutonomy(mode)}>{mode}</button>)}</div></div><div className="fellowship-grid">{[...game.retinue, ...(game.companion.recruited ? [game.companion] : [])].map((ally) => <article key={ally.id}><small>{ally.role} · {ally.bond}</small><h3>{ally.name}</h3><p>{ally.personality}</p><div><span>{ally.hp}/{ally.maxHp} health</span><span>{ally.trust} trust</span></div><strong>{ally.ability.name}</strong><p>{ally.ability.description}</p></article>)}</div>{game.relationships.length > 0 && <section className="relationship-list"><h3>Friendships</h3>{game.relationships.map((relationship) => <p key={relationship.members.join("-")}><b>{relationship.members.map((id) => [...game.retinue, game.companion].find((member) => member.id === id)?.name ?? id).join(" + ")}</b><span>{relationship.status} · {relationship.score}</span><small>{relationship.lastMoment}</small></p>)}</section>}<section className="combo-list"><h3>Team combos</h3>{game.combos.map((combo) => { const available = engine.getAvailableCombos().find((candidate) => candidate.id === combo.id); return <button disabled={!available?.ready} key={combo.id} onClick={() => { const result = engine.useFellowshipCombo(combo.id); speak(result.summary); }}><strong>{combo.name}</strong><span>{combo.description}</span><small>{available ? available.ready ? "Ready" : "Recharging" : "Build trust with both companions to unlock"}</small></button>; })}</section></section></div>}
    {game.pendingBattlePlan && <div className="controls-backdrop" role="dialog" aria-label="Proposed fellowship battle plan"><section className="battle-plan-modal"><small>{game.pendingBattlePlan.source === "agent" ? "WebMCP agent proposal" : "Fellowship proposal"}</small><h2>{game.pendingBattlePlan.headline}</h2><p>{game.pendingBattlePlan.reason}</p><div className="plan-assignments">{game.pendingBattlePlan.assignments.map((assignment) => <div key={assignment.memberId}><b>{assignment.memberName}</b><span>{assignment.action}</span></div>)}</div><div className="plan-actions"><button onClick={() => engine.rejectBattlePlan()}>Not now</button><button className="approve" onClick={() => { const result = engine.approveBattlePlan(); speak(result.summary); }}>Execute plan</button></div></section></div>}
    {confirmation && <div className="controls-backdrop" role="dialog" aria-modal="true" aria-label={confirmation.title}><section className="agent-confirmation"><small>WebMCP requests approval</small><h2>{confirmation.title}</h2><p>{confirmation.body}</p><div><button onClick={() => resolveConfirmation(false)}>Reject</button><button className="approve" onClick={() => resolveConfirmation(true)}>Approve</button></div></section></div>}
    {controlsOpen && <div className="controls-backdrop" role="dialog" aria-label="Edit game controls"><section className="controls-modal"><div className="controls-heading"><div><small>Settings</small><h2>Controls</h2></div><button onClick={() => { setControlsOpen(false); setListeningFor(null); setResetArmed(false); }}>×</button></div><p>Select an action, then press any key to rebind it.</p><div className="control-list">{(Object.keys(controlLabels) as ControlAction[]).map((action) => <div className="control-row" key={action}><span>{controlLabels[action]}</span><button className={listeningFor === action ? "listening" : ""} onClick={() => setListeningFor(action)}>{listeningFor === action ? "Press a key…" : prettyKey(controls[action])}</button></div>)}</div><div className="campaign-reset"><div><strong>Start over</strong><span>Clear campaign progress and return to Stage 1.</span></div><button className={resetArmed ? "confirm-reset" : ""} onClick={() => resetArmed ? void restartCampaign() : setResetArmed(true)}>{resetArmed ? "Confirm restart" : "Restart campaign"}</button>{resetArmed && <button className="cancel-reset" onClick={() => setResetArmed(false)}>Cancel</button>}</div><div className="controls-actions"><button onClick={() => { setControls(defaultControls); localStorage.setItem("storyforge:controls:v1", JSON.stringify(defaultControls)); }}>Restore defaults</button><button className="primary-action" onClick={() => setControlsOpen(false)}>Done</button></div></section></div>}
    {game.pendingBlessing && <div className="blessing-backdrop"><section className="blessing-modal"><small>{game.seal.name} resonates</small><h2>Choose a blessing</h2><p>Each restored objective returns a fragment of your inheritance.</p><div className="blessing-grid"><button disabled={game.blessings.includes("vigor")} onClick={() => engine.chooseBlessing("vigor")}><b>♥</b><strong>Vigor</strong><span>+20 maximum health</span></button><button disabled={game.blessings.includes("fury")} onClick={() => engine.chooseBlessing("fury")}><b>✦</b><strong>Fury</strong><span>Weapons deal +1 damage</span></button><button disabled={game.blessings.includes("wind")} onClick={() => engine.chooseBlessing("wind")}><b>◌</b><strong>Wind</strong><span>Move faster through the realm</span></button><button disabled={game.blessings.includes("bond")} onClick={() => engine.chooseBlessing("bond")}><b>➶</b><strong>Bond</strong><span>{game.companion.name} gains health and double damage</span></button></div></section></div>}
    {game.recruitment.offerReady && <div className="blessing-backdrop"><section className="recruitment-modal"><small>Trust earned · {game.companion.role}</small><h2>{game.companion.name}</h2><p className="companion-personality">{game.companion.personality}</p><blockquote>{game.recruitment.prompt}</blockquote><div className="recruitment-choices">{game.recruitment.choices.map((choice, index) => <button key={choice} onClick={() => { const result = engine.resolveRecruitment(index as 0 | 1); speak(result.summary, game.companion.id, game.companion.name); }}><span>{index === 0 ? "Friendship" : "Alliance"}</span><strong>{choice}</strong></button>)}</div><p className="companion-stakes"><b>Fights for:</b> {game.companion.motivation}<br/><b>Fears:</b> {game.companion.fear}</p></section></div>}
    <div className="minimal-shell" aria-hidden={showIntro}>
      <nav className="hud-nav" aria-label="Game status">
        <div className="hud-brand"><strong>Stage {game.stage}</strong><span>{game.biome.name}</span></div>
        <section className="hud-section player-hud"><div className="hud-label"><span>Last Heir</span><b>{game.player.hp}/{game.player.maxHp}</b></div><div className="mini-meter friendly"><i style={{ width: `${(game.player.hp / game.player.maxHp) * 100}%` }} /></div><small>{game.inventory.find((item) => item.id === game.player.weaponId)?.name} · {game.player.essence} essence</small></section>
        <section className="hud-section objective-hud"><span>{activeInitiative ? `${activeInitiative.memberName} is away · ${activeInitiative.purpose}` : "Current objective"}</span><strong>{game.objective}</strong></section>
        <section className="hud-section elias-hud"><div className="hud-label"><span>{game.companion.name} · {game.companion.mode}</span><b>{game.companion.recruited ? `${game.companion.hp}/${game.companion.maxHp}` : "—"}</b></div><div className="mini-meter friendly"><i style={{ width: `${game.companion.recruited ? (game.companion.hp / game.companion.maxHp) * 100 : 0}%` }} /></div><small>{game.companion.recruited ? `${game.companion.role} active` : "Not recruited"}</small></section>
        <section className="hud-section progress-hud"><span>{game.biome.subtitle} · Party {game.retinue.length + (game.companion.recruited ? 1 : 0)}</span><strong>{completedCount}/3 objectives · {aliveEnemies} threats</strong><div className="pressure-meter" title={game.pressure.description}><i style={{ width: `${game.pressure.value}%` }} /></div><small>{game.pressure.name} {game.pressure.value}/{game.pressure.max} · {game.campaignComplete ? "Dawn restored" : game.sealCollected ? "Seal secured" : game.portalActive ? "Portal active" : "Boss shielded"}</small></section>
        <div className="hud-actions"><span className={`mcp-light ${webmcp}`} title={`WebMCP ${webmcp}`} /><button className={agentPanelOpen ? "active" : ""} onClick={() => setAgentPanelOpen((open) => !open)}>Agent</button><button onClick={() => setFellowshipOpen(true)}>Party</button><button onClick={() => setControlsOpen(true)}>Controls</button><button onClick={() => setShowIntro(true)}>Lore</button></div>
      </nav>
      <main className={`world-panel expanded-world theme-${game.biome.theme} ${game.campaignComplete ? "campaign-complete" : ""}`}>
        <div className="camera-layer" style={{ width: WORLD.width, height: WORLD.height, transform: `translate3d(${camera.x}px, ${camera.y}px, 0)` }}>
        <div className="terrain" /><div className="forest-mist mist-one" /><div className="forest-mist mist-two" /><div className="forest-path path-main" /><div className="forest-path path-branch" />
        <div className="world-boundary boundary-north" /><div className="world-boundary boundary-west" /><div className="world-boundary boundary-east" /><div className="world-boundary boundary-south"><span>Uncrossable Moonwater</span></div>
        {forestDecor.map(([x, y, kind], index) => <div className={`forest-decor ${kind}`} key={`${kind}-${index}`} style={{ left: x, top: y }} />)}
        <div className="village-ruin ruin-top" /><div className="village-ruin ruin-mid" /><div className="village-ruin ruin-bottom" /><div className="ancient-shrine"><span>✧</span></div>
        {obstacles.map((rect, index) => <div key={index} className={`obstacle hard-obstacle formation-${index % 3}`} style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h }} />)}
        {game.objectives.map((objective) => <div key={objective.id} className={`totem stage-objective ${objective.completed ? "purified" : objective.primed ? "primed" : "corrupted"}`} style={{ left: objective.x, top: objective.y }} title={objective.requiredAbility && !objective.primed ? `${objective.label} · Requires ${abilityName(objective.requiredAbility) ?? "a companion ability"}` : objective.label}><small>{objective.label}{objective.requiredAbility && !objective.completed ? <em>{objective.primed ? "Ready for ritual" : `Needs ${abilityName(objective.requiredAbility) ?? "specialist"}`}</em> : null}</small></div>)}
        {game.stage < 5 && <div className={`portal ${game.portalActive ? "active" : "inactive"}`} style={{ left: PORTAL_POINT.x, top: PORTAL_POINT.y }} />}
        {game.weaponPickups.filter((pickup) => !pickup.collected).map((pickup) => <div className="weapon-pickup" key={pickup.id} style={{ left: pickup.x, top: pickup.y }} title={`${pickup.item.name} — press ${prettyKey(controls.interact)}`}><span>{pickup.item.icon}</span><small>{pickup.item.name}</small></div>)}
        {game.retinue.filter((ally) => !awayMemberIds.has(ally.id)).map((ally, index) => <div key={ally.id} className={`companion-avatar retinue-avatar friendly-unit retinue-${index} ${eliasAttacking ? "unit-attacking" : ""}`} style={{ left: player.x - 58 - index * 34, top: player.y + 38 + (index % 2) * 26 }} title={`${ally.name} · ${ally.role}`}><div className="unit-health friendly"><i style={{ width: `${(ally.hp / ally.maxHp) * 100}%` }} /></div><span className="held-weapon bow">{ally.role.includes("Mage") ? "✧" : ally.role.includes("Golem") ? "◆" : ally.role.includes("Monk") ? "⌁" : "➶"}</span><small className="ally-name">{ally.name}</small></div>)}
        <div className={`${game.companion.recruited ? "companion-avatar elias-avatar friendly-unit" : "companion-ghost friendly-unit"} companion-${game.stage} ${awayMemberIds.has(game.companion.id) ? "away-unit" : ""} ${eliasAttacking ? "unit-attacking" : ""} ${eliasDamaged ? "unit-damaged" : ""}`} style={{ left: eliasVisual.x, top: eliasVisual.y }} title={game.companion.recruited ? game.companion.name : `${game.companion.name}'s trial: ${game.recruitment.description}`}><div className="unit-health friendly"><i style={{ width: `${(game.companion.hp / game.companion.maxHp) * 100}%` }} /></div><span className="held-weapon bow">{companionGlyph}</span>{!game.companion.recruited && <small className="recruitment-hint">Trial: {game.recruitment.description}</small>}</div>
        {!game.boss.defeated && <div className={`boss-avatar enemy-unit phase-${game.boss.phase} intent-${game.boss.intent} ${game.boss.awakened ? "awakened" : "shielded"} ${heroAttacking && distanceBetween(player, game.boss) < 65 ? "unit-hit" : ""}`} style={{ left: game.boss.x, top: game.boss.y }}><div className="unit-health enemy"><i style={{ width: `${(game.boss.hp / game.boss.maxHp) * 100}%` }} /></div><span className="sylvara-crown">♠</span><small className="boss-phase">{game.boss.name} · Phase {game.boss.phase}</small>{(game.boss.intent === "strike" || game.boss.intent === "summon") && <span className="boss-telegraph">{game.boss.intent === "strike" ? "POWER STRIKE" : "SUMMONING"}</span>}</div>}
        {game.boss.defeated && !game.sealCollected && <div className="seal-pickup" style={{ left: game.boss.x, top: game.boss.y }} title={game.seal.name}>{game.seal.icon}</div>}
        {game.enemies.filter((enemy) => enemy.alive).map((enemy) => <div key={enemy.id} className={`enemy-avatar enemy-unit styled-enemy intent-${enemy.intent} ${enemy.kind} ${hitEnemyId === enemy.id ? "unit-hit" : ""}`} style={{ left: enemy.x, top: enemy.y }}><div className="unit-health enemy"><i style={{ width: `${(enemy.hp / enemy.maxHp) * 100}%` }} /></div><span className="enemy-face"><i /><i /></span><span className="enemy-detail" />{enemy.intent === "windup" && <span className="attack-telegraph">!</span>}</div>)}
        <div className={`hero-avatar friendly-unit ${heroAttacking ? "unit-attacking" : ""} ${heroDamaged ? "unit-damaged" : ""} ${dodging ? "unit-dodging" : ""}`} style={{ left: player.x, top: player.y }}><div className="unit-health friendly"><i style={{ width: `${(game.player.hp / game.player.maxHp) * 100}%` }} /></div><span className={`held-weapon ${game.player.weaponId}`}>⚔</span></div>
        </div>
        <div className="world-message">{game.storyLine}</div>
        {game.banter.length > 0 && <div className="party-banter" aria-live="polite"><small>Fellowship</small>{game.banter.slice(0, 2).map((line, index) => <p key={`${line.speaker}-${index}`}><b>{line.speaker}</b> {line.line}</p>)}</div>}
        <aside className="party-dock" aria-label="Fellowship abilities">{[...game.retinue, ...(game.companion.recruited ? [game.companion] : [])].map((ally) => { const cooling = ally.ability.readyAt > Date.now(); return <button key={ally.id} disabled={cooling || ally.hp <= 0} onClick={() => { const result = engine.useCompanionAbility(ally.id); speak(result.summary, ally.id, ally.name); }} title={ally.ability.description}><span>{ally.name} · {ally.tactic}</span><strong>{ally.ability.name}</strong><small>{ally.bond} · {ally.trust} trust{cooling ? " · recharging" : " · ready"}</small></button>; })}</aside>
        {agentPanelOpen && <aside className="agent-panel" aria-label="WebMCP agent activity"><header><div><small>Live collaboration</small><strong>WebMCP Agent</strong></div><span className={`agent-status ${webmcp}`}>{webmcp}</span></header><p className="agent-explainer">The agent reads canonical battle state and issues structured, logged commands. Coordinated plans stay yours to approve.</p><div className="agent-tools"><code>inspect_battlefield</code><code>inspect_fellowship</code><code>propose_battle_plan</code><code>command_companion</code><code>explain_next_objective</code></div>{pendingProposals.length > 0 && <section><h3>Needs your decision</h3>{pendingProposals.map((proposal) => <article className="proposal-row" key={proposal.id}><div><small>{proposal.toolName}</small><p>{proposal.summary}</p></div><div><button onClick={() => engine.rejectProposal(proposal.id)}>Reject</button><button className="approve" onClick={() => engine.applyProposal(proposal.id)}>Accept</button></div></article>)}</section>}<section><h3>Agent activity</h3>{agentActivity.length ? agentActivity.map((entry) => <article className="activity-row" key={entry.id}><code>{entry.toolName ?? "agent"}</code><span>{entry.summary}</span></article>) : <p className="agent-empty">Waiting for the first WebMCP tool call. Ask the agent to inspect the battlefield.</p>}</section></aside>}
        {spokenLine && <div className="spoken-caption"><b>{spokenLine.speaker}</b><span>{spokenLine.text}</span></div>}
        {fellowshipRecommendation && <div className={`party-recommendation ${fellowshipRecommendation.urgency}`}><div><small>{fellowshipRecommendation.memberName} suggests</small><strong>{fellowshipRecommendation.headline}</strong><span>{fellowshipRecommendation.reason}</span></div><button onClick={() => { const result = engine.applyFellowshipRecommendation(); speak(result.summary, fellowshipRecommendation.memberId, fellowshipRecommendation.memberName); setCommandStatus(result.summary); }}>Do it</button></div>}
        <div className="companion-command" title={voiceLog[0]}><div className="command-input-row"><input value={voiceInput} onChange={(event) => setVoiceInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); sendToElias(voiceInput); } }} placeholder={game.retinue.length || game.companion.recruited ? "Elias, guard me…" : `Ask about ${game.companion.name}'s trial…`} aria-label="Message the fellowship" /><button className="send-command" onClick={() => sendToElias(voiceInput)}>Send</button><button className={`mic-command ${micEnabled ? "listening" : ""}`} onClick={startVoiceChat}>{micEnabled ? "Stop" : "Mic"}</button></div><p className="command-status" aria-live="polite">{commandStatus}</p></div>
        <div className="hotbar" aria-label="Inventory hotbar">{game.inventory.map((item, index) => <button key={item.id} className={`hotbar-slot ${item.id === game.player.weaponId ? "equipped" : ""} ${item.kind}`} title={item.description} onClick={() => { if (item.kind === "weapon") engine.equipWeapon(item.id); }}><kbd>{index + 1}</kbd><span>{item.icon}</span><small>{item.name}</small></button>)}{Array.from({ length: Math.max(0, 5 - game.inventory.length) }, (_, index) => <div className="hotbar-slot empty" key={`empty-${index}`}><kbd>{game.inventory.length + index + 1}</kbd></div>)}</div>
        {game.campaignComplete && <div className="stage-complete-card ending-card"><small>The eclipse is broken</small><strong>Dawn Inherited</strong><p>Five Seals unite. The companions survive, Voss falls, and light returns to the five realms.</p></div>}
      </main>
    </div>
  </div>;
}
