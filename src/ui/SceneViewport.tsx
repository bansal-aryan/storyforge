import { useEffect, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera, Float, Text, Sky, ContactShadows } from "@react-three/drei";
import { Physics, useSphere, usePlane } from "@react-three/cannon";
import * as THREE from "three";

// --- Constants for the "Genshin-Lite" Aesthetic ---
const WORLD_COLORS = {
  sky: "#B0E0E6", // Powder blue
  ground: "#C2D5A8", // Soft sage green
  player: "#FFFFFF",
  accent: "#FFB7C5", // Cherry blossom pink
  fog: "#DDEEFF",
};

export function SceneViewport({
  setPlayerPos,
  onInteract,
  onAbility,
  onCompanion,
}: {
  setPlayerPos: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>;
  onInteract: () => void;
  onAbility: () => void;
  onCompanion: () => void;
}) {
  const keys = useRef(new Set<string>());
  
  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (["w", "a", "s", "d", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) {
        event.preventDefault();
        keys.current.add(event.key);
      }
      if (event.key.toLowerCase() === "e") onInteract();
      if (event.key === " ") { event.preventDefault(); onAbility(); }
      if (event.key.toLowerCase() === "q") onCompanion();
    };
    const up = (event: KeyboardEvent) => keys.current.delete(event.key);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => { 
      window.removeEventListener("keydown", down); 
      window.removeEventListener("keyup", up); 
    };
  }, [onAbility, onCompanion, onInteract]);

  return (
    <div className="scene-viewport" style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden', background: WORLD_COLORS.sky }}>
      <Canvas shadows>
        <PerspectiveCamera makeDefault position={[0, 12, 15]} fov={50} />
        <OrbitControls 
          enablePan={false} 
          maxPolarAngle={Math.PI / 2.1} 
          minDistance={10} 
          maxDistance={60}
        />
        
        <color attach="background" args={[WORLD_COLORS.sky]} />
        <fog attach="fog" args={[WORLD_COLORS.fog, 10, 80]} />
        
        <Sky sunPosition={[100, 20, 100]} />
        <ambientLight intensity={0.7} />
        <directionalLight 
          position={[10, 20, 10]} 
          intensity={1.2} 
          castShadow 
          shadow-mapSize={[1024, 1024]} 
        />
        
        <Physics gravity={[0, -9.81, 0]} tolerance={0.001}>
          <Ground />
          <Player keys={keys} setPlayerPos={setPlayerPos} />
          
          {/* Stylized "Minimalist" Environment */}
          <FloatingIsland position={[-15, 0, -10]} color="#B8D8BE" />
          <FloatingIsland position={[15, 0, -5]} color="#D8B8BE" />
          <FloatingIsland position={[0, 0, -20]} color="#B8B8D8" />

          <Relic position={[10, 0, -10]} />
          <Enemy position={[-10, 0, 10]} />
        </Physics>

        <ContactShadows opacity={0.4} scale={40} blur={2} far={10} resolution={256} color="#000000" />
      </Canvas>
      <div className="scene-prompt" style={{ 
        position: 'absolute', 
        bottom: '20px', 
        left: '50%', 
        transform: 'translateX(-50%)', 
        color: '#4a4a4a', 
        pointerEvents: 'none',
        fontFamily: 'sans-serif',
        fontSize: '13px',
        fontWeight: '500',
        letterSpacing: '0.05em',
        opacity: 0.6
      }}>
        WASD to explore · E to interact · Space to pulse · Q to command
      </div>
    </div>
  );
}

function Ground() {
  const ref = usePlane(() => ({ rotation: [-Math.PI / 2, 0, 0], position: [0, 0, 0] }));
  return (
    <mesh ref={ref} receiveShadow>
      <planeGeometry args={[200, 200]} />
      <meshStandardMaterial color={WORLD_COLORS.ground} roughness={1} />
    </mesh>
  );
}

function Player({ keys, setPlayerPos }: { keys: React.MutableRefObject<Set<string>>; setPlayerPos: any }) {
  const [ref, api] = useSphere(() => ({
    mass: 1,
    position: [0, 2, 0],
    args: [0.5],
  }));

  const velocity = useRef([0, 0, 0]);
  useEffect(() => api.velocity.subscribe((v) => (velocity.current = v)), [api]);

  useFrame((_state) => {
    const speed = 6;
    let x = 0;
    let z = 0;

    if (keys.current.has("w") || keys.current.has("ArrowUp")) z -= speed;
    if (keys.current.has("s") || keys.current.has("ArrowDown")) z += speed;
    if (keys.current.has("a") || keys.current.has("ArrowLeft")) x -= speed;
    if (keys.current.has("d") || keys.current.has("ArrowRight")) x += speed;

    api.velocity.set(x, velocity.current[1], z);

    // Rotate character to face movement direction
    if (x !== 0 || z !== 0) {
      const targetRotation = Math.atan2(x, z);
      if (ref.current) {
        ref.current.rotation.y = THREE.MathUtils.lerp(ref.current.rotation.y, targetRotation, 0.1);
      }
    }

    // Sync back to React state
    const pos = ref.current?.position;
    if (pos) {
      setPlayerPos({
        x: 50 + (pos.x / 2),
        y: 50 + (pos.z / 2),
      });
    }
  });

  return (
    <group ref={ref} castShadow>
      {/* Minimalist Avatar: Head and Body */}
      <mesh position={[0, 0.8, 0]}>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshStandardMaterial color={WORLD_COLORS.player} />
      </mesh>
      <mesh position={[0, 0.2, 0]}>
        <capsuleGeometry args={[0.4, 0.6, 4, 8]} />
        <meshStandardMaterial color={WORLD_COLORS.player} roughness={0.3} />
      </mesh>
      {/* Visual indicator of direction (Small visor/face) */}
      <mesh position={[0, 0.9, 0.2]}>
        <boxGeometry args={[0.3, 0.1, 0.1]} />
        <meshStandardMaterial color="#333" />
      </mesh>
      <pointLight intensity={0.5} color={WORLD_COLORS.accent} position={[0, 1, 0]} />
    </group>
  );
}

function FloatingIsland({ position, color }: { position: [number, number, number]; color: string }) {
  return (
    <group position={position}>
      <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.5}>
        <mesh castShadow>
          <cylinderGeometry args={[3, 4, 1, 6]} />
          <meshStandardMaterial color={color} roughness={0.8} />
        </mesh>
      </Float>
    </group>
  );
}

function Relic({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <Float speed={3} rotationIntensity={1} floatIntensity={1}>
        <mesh castShadow>
          <octahedronGeometry args={[0.6]} />
          <meshStandardMaterial color="#FFD700" emissive="#FFD700" emissiveIntensity={1} />
        </mesh>
      </Float>
      <Text position={[0, 2.5, 0]} fontSize={0.6} color="#666">Relic</Text>
    </group>
  );
}

function Enemy({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh castShadow>
        <boxGeometry args={[1.2, 1.2, 1.2]} />
        <meshStandardMaterial color="#FF6B6B" roughness={0.5} />
      </mesh>
      <Text position={[0, 2.5, 0]} fontSize={0.6} color="#994444">Blight</Text>
    </group>
  );
}
