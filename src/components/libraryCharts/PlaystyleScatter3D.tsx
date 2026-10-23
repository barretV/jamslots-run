import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import { useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  buildPlaystylePoints,
  PLAYSTYLE_COLORS,
  type PlaystylePoint,
} from '../../lib/libraryChartModels';
import type { JamGame } from '../../types';

function PointCloud({ points }: { points: PlaystylePoint[] }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const [hovered, setHovered] = useState<PlaystylePoint | null>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    points.forEach((p, i) => {
      dummy.position.set(p.x, p.y, p.z);
      dummy.scale.setScalar(0.045);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      const color = new THREE.Color(PLAYSTYLE_COLORS[p.cluster]);
      mesh.setColorAt(i, color);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  return (
    <>
      <instancedMesh
        ref={meshRef}
        args={[undefined, undefined, Math.max(1, points.length)]}
        onPointerMove={(e) => {
          e.stopPropagation();
          const id = e.instanceId;
          if (id != null) setHovered(points[id] ?? null);
        }}
        onPointerOut={() => setHovered(null)}
      >
        <sphereGeometry args={[1, 8, 8]} />
        <meshStandardMaterial vertexColors />
      </instancedMesh>
      {hovered ? (
        <Html position={[hovered.x, hovered.y + 0.12, hovered.z]} center>
          <div className="library-charts-tooltip">{hovered.title}</div>
        </Html>
      ) : null}
    </>
  );
}

interface PlaystyleScatter3DProps {
  games: JamGame[];
}

export function PlaystyleScatter3D({ games }: PlaystyleScatter3DProps) {
  const points = useMemo(() => buildPlaystylePoints(games), [games]);

  if (points.length === 0) {
    return <p className="library-charts-empty">No games in this view.</p>;
  }

  return (
    <div className="library-charts-panel library-charts-panel--3d">
      <p className="library-charts-caption">
        X = votes · Y = plays · Z = votes today (normalized). Pink = Rusher, cyan = Tactician, amber
        = Survivor.
      </p>
      <Canvas camera={{ position: [2.2, 2, 2.2], fov: 50 }}>
        <color attach="background" args={['#0a0612']} />
        <ambientLight intensity={0.65} />
        <pointLight position={[4, 4, 4]} intensity={1.1} color="#c084fc" />
        <PointCloud points={points} />
        <OrbitControls enablePan enableZoom />
      </Canvas>
      <ul className="library-charts-legend">
        <li><span className="library-charts-swatch" style={{ background: PLAYSTYLE_COLORS.rusher }} /> Rusher</li>
        <li><span className="library-charts-swatch" style={{ background: PLAYSTYLE_COLORS.tactician }} /> Tactician</li>
        <li><span className="library-charts-swatch" style={{ background: PLAYSTYLE_COLORS.survivor }} /> Survivor</li>
      </ul>
    </div>
  );
}
