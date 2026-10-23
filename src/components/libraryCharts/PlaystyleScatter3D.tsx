import { Canvas, useFrame } from '@react-three/fiber';
import { Html, OrbitControls, Stars } from '@react-three/drei';
import { useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import type { ChartGamePoint } from '../../lib/libraryChartModels';
import { CLUSTER_COLORS } from '../../lib/libraryChartModels';

interface PlaystyleScatter3DProps {
  points: ChartGamePoint[];
}

function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return (h % 1000) / 1000;
}

function NebulaPoints({ points }: PlaystyleScatter3DProps) {
  const ref = useRef<THREE.Points>(null);
  const [hovered, setHovered] = useState<ChartGamePoint | null>(null);

  const { positions, colors, meta } = useMemo(() => {
    const positions = new Float32Array(points.length * 3);
    const colors = new Float32Array(points.length * 3);
    const meta: ChartGamePoint[] = [];
    const color = new THREE.Color();
    let i = 0;
    for (const p of points) {
      const j = hashId(p.game.gameId);
      const j2 = hashId(p.game.gameId + 'b');
      const j3 = hashId(p.game.gameId + 'c');
      const spread = 0.22;
      positions[i * 3] = (p.votesNorm - 0.5) * 3.6 + (j - 0.5) * spread;
      positions[i * 3 + 1] = (p.playsNorm - 0.5) * 3.6 + (j2 - 0.5) * spread;
      positions[i * 3 + 2] = (p.todayNorm - 0.5) * 3.6 + (j3 - 0.5) * spread;
      color.set(CLUSTER_COLORS[p.cluster]);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
      meta.push(p);
      i++;
    }
    return { positions, colors, meta };
  }, [points]);

  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.04;
  });

  return (
    <>
      <Stars radius={80} depth={40} count={1200} factor={3} saturation={0.15} fade speed={0.4} />
      <points
        ref={ref}
        onPointerMove={(e) => {
          const idx = e.index;
          if (idx !== undefined && idx >= 0 && idx < meta.length) setHovered(meta[idx]);
        }}
        onPointerOut={() => setHovered(null)}
      >
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
          <bufferAttribute attach="attributes-color" args={[colors, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={0.055}
          vertexColors
          transparent
          opacity={0.92}
          sizeAttenuation
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
      {hovered ? (
        <Html
          position={[0, 0, 0]}
          style={{ pointerEvents: 'none' }}
          className="library-charts-3d-tip library-charts-3d-tip--fixed"
        >
          <div>
            <strong>{hovered.game.title}</strong>
            <div>
              {hovered.game.votes} votes · {hovered.game.totalPlays} plays · +
              {hovered.game.votesToday ?? 0} today
            </div>
          </div>
        </Html>
      ) : null}
    </>
  );
}

export function PlaystyleScatter3D({ points }: PlaystyleScatter3DProps) {
  if (points.length === 0) {
    return <p className="library-charts-empty">No games in this view.</p>;
  }

  return (
    <div className="library-charts-3d-wrap library-charts-3d-wrap--nebula">
      <Canvas camera={{ position: [0, 0.4, 5.2], fov: 52 }}>
        <color attach="background" args={['#000000']} />
        <fog attach="fog" args={['#000000', 4, 14]} />
        <ambientLight intensity={0.25} />
        <NebulaPoints points={points} />
        <OrbitControls enablePan enableZoom autoRotate autoRotateSpeed={0.35} />
      </Canvas>
      <p className="library-charts-legend library-charts-legend--inline">
        <span className="library-charts-legend__dot" style={{ background: CLUSTER_COLORS.rusher }} />
        Rusher
        <span className="library-charts-legend__dot" style={{ background: CLUSTER_COLORS.tactician }} />
        Tactician
        <span className="library-charts-legend__dot" style={{ background: CLUSTER_COLORS.survivor }} />
        Survivor
      </p>
      <p className="library-charts-cap-hint">
        Each star is a game. Drag to orbit, scroll to zoom. Axes: votes, plays, votes today (this list
        only).
      </p>
    </div>
  );
}
