import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import type { ChartFilters } from '../../lib/libraryChartFilters';
import { gameMatchesChartFilters } from '../../lib/libraryChartFilters';
import type { ChartGamePoint, NebulaColorMode } from '../../lib/libraryChartModels';
import {
  CLUSTER_COLORS,
  CLUSTER_LABELS,
  colorForPoint,
  computeCentroid,
  computeCloudRadius,
} from '../../lib/libraryChartModels';
import { GameCallout } from './GameCallout';

interface PlaystyleScatter3DProps {
  points: ChartGamePoint[];
  colorMode: NebulaColorMode;
  filters: ChartFilters;
}

function NebulaScene({
  points,
  colorMode,
  filters,
  onHover,
  onSelect,
}: {
  points: ChartGamePoint[];
  colorMode: NebulaColorMode;
  filters: ChartFilters;
  onHover: (p: ChartGamePoint | null) => void;
  onSelect: (p: ChartGamePoint) => void;
}) {
  const ref = useRef<THREE.Points>(null);
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const { camera } = useThree();
  const centroid = useMemo(() => computeCentroid(points), [points]);
  const radius = useMemo(() => computeCloudRadius(points, centroid), [points, centroid]);

  const { positions, colors } = useMemo(() => {
    const positions = new Float32Array(points.length * 3);
    const colors = new Float32Array(points.length * 3);
    const c = new THREE.Color();
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      const match = gameMatchesChartFilters(p.game, filters);
      positions[i * 3] = p.position[0];
      positions[i * 3 + 1] = p.position[1];
      positions[i * 3 + 2] = p.position[2];
      c.set(colorForPoint(p, colorMode));
      if (!match) c.multiplyScalar(0.25);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    return { positions, colors };
  }, [points, colorMode, filters]);

  useEffect(() => {
    const [cx, cy, cz] = centroid;
    const dist = Math.max(1.6, radius * 2.4);
    camera.position.set(cx + dist * 0.15, cy + dist * 0.35, cz + dist);
    camera.lookAt(cx, cy, cz);
    camera.updateProjectionMatrix();
    const ctrl = controlsRef.current;
    if (ctrl) {
      ctrl.target.set(cx, cy, cz);
      ctrl.update();
    }
  }, [camera, centroid, radius]);

  useFrame(() => {
    if (controlsRef.current) {
      controlsRef.current.autoRotate = true;
      controlsRef.current.autoRotateSpeed = 0.35;
    }
  });

  return (
    <>
      <Stars radius={50} depth={30} count={800} factor={2.5} saturation={0.12} fade speed={0.35} />
      <points
        ref={ref}
        onPointerMove={(e) => {
          const idx = e.index;
          if (idx != null && idx >= 0 && idx < points.length) onHover(points[idx]);
        }}
        onPointerOut={() => onHover(null)}
        onClick={(e) => {
          e.stopPropagation();
          const idx = e.index;
          if (idx != null && idx >= 0 && idx < points.length) onSelect(points[idx]);
        }}
      >
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
          <bufferAttribute attach="attributes-color" args={[colors, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={0.12}
          vertexColors
          transparent
          opacity={0.95}
          sizeAttenuation
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
      <OrbitControls
        ref={controlsRef}
        enablePan
        enableZoom
        makeDefault
        autoRotate
        autoRotateSpeed={0.35}
      />
    </>
  );
}

export function PlaystyleScatter3D({ points, colorMode, filters }: PlaystyleScatter3DProps) {
  const [hovered, setHovered] = useState<ChartGamePoint | null>(null);
  const [pinned, setPinned] = useState<ChartGamePoint | null>(null);
  const active = pinned ?? hovered;

  if (points.length === 0) {
    return <p className="library-charts-empty">No games match your library view.</p>;
  }

  return (
    <div className="library-charts-nebula">
      <div className="library-charts-nebula__canvas">
        <Canvas camera={{ fov: 48, near: 0.1, far: 100 }}>
          <color attach="background" args={['#000000']} />
          <fog attach="fog" args={['#000000', 6, 18]} />
          <ambientLight intensity={0.35} />
          <NebulaScene
            points={points}
            colorMode={colorMode}
            filters={filters}
            onHover={setHovered}
            onSelect={(p) => setPinned(p)}
          />
        </Canvas>
        {active ? (
          <div className="library-charts-nebula__callout">
            <GameCallout
              game={active.game}
              pinned={Boolean(pinned)}
              onClose={() => setPinned(null)}
            />
          </div>
        ) : (
          <p className="library-charts-nebula__hint">Hover or tap a star to see the game.</p>
        )}
      </div>
      {colorMode === 'playstyle' ? (
        <p className="library-charts-legend library-charts-legend--below">
          <span className="library-charts-legend__dot" style={{ background: CLUSTER_COLORS.rusher }} />
          {CLUSTER_LABELS.rusher}
          <span className="library-charts-legend__dot" style={{ background: CLUSTER_COLORS.tactician }} />
          {CLUSTER_LABELS.tactician}
          <span className="library-charts-legend__dot" style={{ background: CLUSTER_COLORS.survivor }} />
          {CLUSTER_LABELS.survivor}
        </p>
      ) : (
        <p className="library-charts-cap-hint library-charts-cap-hint--below">
          {colorMode === 'votes' && 'Cool cyan to hot orange by jam votes in this list.'}
          {colorMode === 'plays' && 'Deep indigo to violet by RUN plays in this list.'}
          {colorMode === 'today' && 'Muted blue to gold by new votes today (UTC).'}
        </p>
      )}
    </div>
  );
}
