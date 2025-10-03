// src/App.tsx
import React, { Suspense, useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF, Preload } from "@react-three/drei";

type PlacedTile = { q: number; r: number; type: string };

const HEX_SIZE = 1; // ajuste conforme escala do seu modelo

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

/**
 * TileModel:
 * espera encontrar public/models/{type}.glb
 * (ex: type="tile_hex" -> /models/tile_hex.glb)
 */
function TileModel({
  position,
  type,
}: {
  position: [number, number, number];
  type: string;
}) {
  const gltf = useGLTF(`/models/${type}.glb`) as any;
  const cloned = useMemo(() => gltf.scene.clone(true), [gltf]);
  return <primitive object={cloned} position={position} />;
}

export default function App() {
  const radius = 4;
  const cells = useMemo(() => generateHexGrid(radius), [radius]);

  const [placed, setPlaced] = useState<PlacedTile[]>([]);
  const [selectedType, setSelectedType] = useState<string>("forest"); // nome base do arquivo .glb

  const togglePlace = (q: number, r: number) => {
    setPlaced((prev) => {
      const idx = prev.findIndex((t) => t.q === q && t.r === r);
      if (idx >= 0) {
        const copy = [...prev];
        copy.splice(idx, 1);
        return copy;
      }
      return [...prev, { q, r, type: selectedType }];
    });
  };

  return (
    <>
      {/* UI simples sobreposta */}
      <div style={{ position: "absolute", left: 16, top: 16, zIndex: 10 }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <button onClick={() => setSelectedType("forest")}>Forest</button>
          <button onClick={() => setSelectedType("rock")}>Rock</button>
          <button onClick={() => setSelectedType("sand")}>Sand</button>
          <button onClick={() => setSelectedType("water")}>Water</button>
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

      <Canvas
        shadows
        camera={{ position: [0, 8, 12], fov: 50 }}
        style={{ height: "100vh", width: "100%" }}
      >
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 10, 7]} intensity={1} castShadow />
        <OrbitControls />
        <gridHelper args={[20, 20]} />

        {/* malha clicável mostrando células hexagonais (visualização leve) */}
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
              {/* cylinder com 6 segmentos = hexágono quando visto de cima */}
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
            const [x, z] = hexToPixel(t.q, t.r, HEX_SIZE * 1.0);
            // ajuste Y se seu modelo estiver centrado no meio (ex: colocar y = 0.1)
            return (
              <TileModel
                key={`${t.q},${t.r}`}
                position={[x, 0, z]}
                type={t.type}
              />
            );
          })}
          <Preload all />
        </Suspense>
      </Canvas>
    </>
  );
}
