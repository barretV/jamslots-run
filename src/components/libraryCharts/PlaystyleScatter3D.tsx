import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import type { ChartFilters } from '../../lib/libraryChartFilters';
import { gameMatchesChartFilters } from '../../lib/libraryChartFilters';
import type { ChartGamePoint, NebulaColorMode } from '../../lib/libraryChartModels';
import {
  colorForPoint,
  computeCloudBoundingSphere,
  nebulaPointSize,
} from '../../lib/libraryChartModels';
import { GameCallout } from './GameCallout';

interface PlaystyleScatter3DProps {
  points: ChartGamePoint[];
  colorMode: NebulaColorMode;
  filters: ChartFilters;
}

const nebulaPointMaterial = new THREE.ShaderMaterial({
  transparent: true,
  depthWrite: true,
  blending: THREE.NormalBlending,
  vertexColors: true,
  vertexShader: `
    attribute float aSize;
    varying vec3 vColor;
    void main() {
      vColor = color;
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      gl_PointSize = aSize * (320.0 / -mvPosition.z);
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  fragmentShader: `
    varying vec3 vColor;
    void main() {
      vec2 uv = gl_PointCoord - vec2(0.5);
      float d = dot(uv, uv);
      if (d > 0.22) discard;
      float alpha = smoothstep(0.22, 0.08, d);
      gl_FragColor = vec4(vColor, alpha * 0.92);
    }
  `,
});

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
  const bounds = useMemo(() => computeCloudBoundingSphere(points), [points]);

  const geometry = useMemo(() => {
    const positions = new Float32Array(points.length * 3);
    const colors = new Float32Array(points.length * 3);
    const sizes = new Float32Array(points.length);
    const c = new THREE.Color();
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      const match = gameMatchesChartFilters(p.game, filters);
      positions[i * 3] = p.position[0];
      positions[i * 3 + 1] = p.position[1];
      positions[i * 3 + 2] = p.position[2];
      c.set(colorForPoint(p, colorMode));
      if (!match) c.multiplyScalar(0.28);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
      sizes[i] = nebulaPointSize(p) * (match ? 1 : 0.65);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    return geo;
  }, [points, colorMode, filters]);

  useEffect(() => {
    const [cx, cy, cz] = bounds.center;
    const persp = camera as THREE.PerspectiveCamera;
    const fov = (persp.fov * Math.PI) / 180;
    const dist = bounds.radius / Math.tan(fov / 2);
    const fit = dist * 1.05;
    camera.position.set(cx + fit * 0.14, cy + fit * 0.22, cz + fit);
    camera.near = Math.max(0.08, fit / 120);
    camera.far = Math.max(80, fit * 12);
    camera.lookAt(cx, cy, cz);
    camera.updateProjectionMatrix();
    const ctrl = controlsRef.current;
    if (ctrl) {
      ctrl.target.set(cx, cy, cz);
      ctrl.minDistance = bounds.radius * 0.35;
      ctrl.maxDistance = bounds.radius * 8;
      ctrl.update();
    }
  }, [camera, bounds]);

  useFrame(() => {
    if (controlsRef.current) {
      controlsRef.current.autoRotate = true;
      controlsRef.current.autoRotateSpeed = 0.28;
    }
  });

  return (
    <>
      <Stars radius={40} depth={24} count={500} factor={2} saturation={0.1} fade speed={0.25} />
      <points
        ref={ref}
        geometry={geometry}
        material={nebulaPointMaterial}
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
      />
      <OrbitControls
        ref={controlsRef}
        enablePan
        enableZoom
        makeDefault
        autoRotate
        autoRotateSpeed={0.28}
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
        <Canvas camera={{ fov: 42, near: 0.1, far: 100 }}>
          <color attach="background" args={['#050510']} />
          <fog attach="fog" args={['#0a0818', 8, 28]} />
          <ambientLight intensity={0.45} />
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
    </div>
  );
}
