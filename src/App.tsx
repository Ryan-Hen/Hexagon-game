// src/App.tsx
import { Suspense, useMemo, useState, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF, Preload } from "@react-three/drei";
import { a, useSpring, useTransition } from "@react-spring/three";

type PlacedTile = { q: number; r: number; type: string; rotation: number };

const HEX_SIZE = 1.05;

// converte coordenadas axiais (q, r) -> posição x,z no mundo (flat-topped hex)
function hexToPixel(q: number, r: number, size = HEX_SIZE): [number, number] {
  const x = size * (Math.sqrt(3) * q + (Math.sqrt(3) / 2) * r);
  const z = size * (3 / 2) * r;
  return [x, z];
}

function generateHexGrid(radius: number) {
  const cells: { q: number; r: number }[] = [];
  for (let q = -radius; q <= radius; q++) {
    const r1 = Math.max(-radius, -q - radius);
    const r2 = Math.min(radius, -q + radius);
    for (let r = r1; r <= r2; r++) cells.push({ q, r });
  }
  return cells;
}

// Modelo animado com react-spring
function TileModel({
  type,
  rotation = [0, 0, 0],
  style,
}: {
  type: string;
  rotation?: [number, number, number];
  style: any; // estilo animado vindo do useTransition
}) {
  const gltf = useGLTF(`/models/${type}.glb`) as any;
  const cloned = useMemo(() => gltf.scene.clone(true), [gltf]);

  return (
    <a.primitive
      object={cloned}
      rotation={rotation}
      position={style.position}
      scale={style.scale}
      // se quiser, pode habilitar opacity se o modelo suportar
    />
  );
}

export default function App() {
  const radius = 6;
  const cells = useMemo(() => generateHexGrid(radius), [radius]);

  const [placed, setPlaced] = useState<PlacedTile[]>([]);
  const [selectedType, setSelectedType] = useState<string>("forest");
  const [previewRotation, setPreviewRotation] = useState(0);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "r") setPreviewRotation((r) => r + Math.PI / 3);
      if (e.key === "R") setPreviewRotation((r) => r - Math.PI / 3);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  const togglePlace = (q: number, r: number) => {
    setPlaced((prev) => {
      const idx = prev.findIndex((t) => t.q === q && t.r === r);
      if (idx >= 0) {
        const copy = [...prev];
        copy.splice(idx, 1);
        return copy;
      }
      const rotation = previewRotation;
      return [...prev, { q, r, type: selectedType, rotation }];
    });
  };

  // Animação suave no preview
  const previewSpring = useSpring({
    rotation: [0, previewRotation, 0],
    config: { mass: 1, tension: 200, friction: 15 },
  });

  // Transições para tiles (entrada e saída)
  // Transições para tiles (entrada e saída)
  const transitions = useTransition(placed, {
    keys: (item) => `${item.q},${item.r}`,
    from: (item) => {
      const [x, z] = hexToPixel(item.q, item.r, HEX_SIZE * 1.1);
      return { position: [x, 1, z], opacity: 0 };
    },
    enter: (item) => {
      const [x, z] = hexToPixel(item.q, item.r, HEX_SIZE * 1.1);
      return { position: [x, 0, z], opacity: 1 };
    },
    leave: (item) => {
      const [x, z] = hexToPixel(item.q, item.r, HEX_SIZE * 1.1);
      return { position: [x, 0, z], opacity: 0 };
    },
    config: { tension: 200, friction: 20 },
  });

  return (
    <>
      {/* UI */}
      <div style={{ position: "absolute", left: 16, top: 16, zIndex: 10 }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <button onClick={() => setSelectedType("forest")}>Forest</button>
          <button onClick={() => setSelectedType("rock")}>Rock</button>
          <button onClick={() => setSelectedType("sand")}>Sand</button>
          <button onClick={() => setSelectedType("water")}>Water</button>
          <button onClick={() => setSelectedType("teste")}>teste</button>
          <button onClick={() => setPlaced([])}>Reset</button>
        </div>
        <div
          style={{
            background: "rgba(255,255,255,0.9)",
            padding: 6,
            borderRadius: 6,
          }}
        >
          <small>Selecionado: {selectedType}</small>
        </div>
      </div>

      {/* Preview */}
      <div style={{ position: "absolute", left: 16, bottom: 16, zIndex: 10 }}>
        <Canvas
          shadows
          camera={{ position: [0, 8, 12], fov: 15 }}
          style={{ height: "100px", width: "100px", border: "1px solid" }}
        >
          <ambientLight intensity={0.5} />
          <directionalLight position={[5, 10, 7]} intensity={1} castShadow />
          <Suspense fallback={null}>
            <a.primitive
              object={useGLTF(`/models/${selectedType}.glb`).scene.clone(true)}
              position={[0, -0.5, 0]}
              rotation={previewSpring.rotation}
            />
            <Preload all />
          </Suspense>
        </Canvas>
      </div>

      {/* Cena principal */}
      <Canvas
        shadows
        camera={{ position: [0, 8, 12], fov: 50 }}
        style={{ height: "100vh", width: "100%" }}
      >
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 10, 7]} intensity={1} castShadow />
        <OrbitControls />

        {/* Grid clicável */}
        {cells.map(({ q, r }) => {
          const [x, z] = hexToPixel(q, r, HEX_SIZE * 1.1);
          const exists = placed.some((t) => t.q === q && t.r === r);
          return (
            <mesh
              key={`${q},${r}`}
              position={[x, 0.01, z]}
              onClick={(e) => {
                e.stopPropagation();
                togglePlace(q, r);
              }}
            >
              <cylinderGeometry
                args={[HEX_SIZE * 0.95, HEX_SIZE * 0.95, 0.02, 6]}
              />
              <meshStandardMaterial
                color={exists ? "orange" : "gray"}
                transparent
                opacity={0.25}
              />
            </mesh>
          );
        })}

        {/* Tiles com animação de entrada e saída */}
        <Suspense fallback={null}>
          {transitions((style, item) => (
            <TileModel
              key={`${item.q},${item.r}`}
              type={item.type}
              rotation={[0, item.rotation, 0]}
              style={style}
            />
          ))}
          <Preload all />
        </Suspense>
      </Canvas>
    </>
  );
}
