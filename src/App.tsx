// src/App.tsx
import { Suspense, useMemo, useState, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF, Preload } from "@react-three/drei";

type PlacedTile = { q: number; r: number; type: string; rotation: number };

const HEX_SIZE = 1.05; // ajuste conforme escala do seu modelo

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

function TileModel({
  position,
  type,
  rotation = [0, 0, 0],
}: {
  position: [number, number, number];
  type: string;
  rotation?: [number, number, number];
}) {
  const gltf = useGLTF(`/models/${type}.glb`) as any;
  const cloned = useMemo(() => gltf.scene.clone(true), [gltf]);
  return <primitive object={cloned} position={position} rotation={rotation} />;
}

export default function App() {
  const radius = 10;
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

  return (
    <>
      {/*UI de escolha de Tile */}
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
      {/*Preview*/}
      <div style={{ position: "absolute", left: 16, bottom: 16, zIndex: 10 }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <Canvas
            shadows
            camera={{ position: [0, 8, 12], fov: 15 }}
            style={{ height: "100px", width: "100px", border: "1px solid" }}
          >
            <ambientLight intensity={0.5} />
            <directionalLight position={[5, 10, 7]} intensity={1} castShadow />
            <OrbitControls />
            <Suspense fallback={null}>
              <TileModel
                position={[0, -0.5, 0]}
                type={selectedType}
                rotation={[0, previewRotation, 0]} // só no eixo Y
              />
              <Preload all />
            </Suspense>
          </Canvas>
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

      <Canvas
        shadows
        camera={{ position: [0, 8, 12], fov: 50 }}
        style={{ height: "100vh", width: "100%" }}
      >
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 10, 7]} intensity={1} castShadow />
        <OrbitControls />

        {cells.map(({ q, r }) => {
          const [x, z] = hexToPixel(q, r, HEX_SIZE * 1.1); // espaçamento levemente maior
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

        {/* tiles colocados: carregam modelos (GLB) */}
        <Suspense fallback={null}>
          {placed.map((t) => {
            const [x, z] = hexToPixel(t.q, t.r, HEX_SIZE * 1.1);

            return (
              <TileModel
                key={`${t.q},${t.r}`}
                position={[x, 0, z]}
                type={t.type}
                rotation={[0, t.rotation, 0]}
              />
            );
          })}
          <Preload all />
        </Suspense>
      </Canvas>
    </>
  );
}
