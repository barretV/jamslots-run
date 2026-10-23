import { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';

interface CityRoadProps {
  points: { x: number; z: number }[];
}

/** Low-profile road chips (no tube — avoids camera clipping through a giant surface). */
export function CityRoad({ points }: CityRoadProps) {
  const deckRef = useRef<THREE.InstancedMesh>(null);
  const lineRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const deckMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#1c1828',
        emissive: '#334155',
        emissiveIntensity: 0.28,
        metalness: 0.42,
        roughness: 0.62,
      }),
    [],
  );
  const lineMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#fbbf24',
        emissive: '#fde68a',
        emissiveIntensity: 1.1,
        metalness: 0.2,
        roughness: 0.45,
      }),
    [],
  );

  useEffect(() => {
    const deck = deckRef.current;
    const line = lineRef.current;
    if (!deck || points.length < 2) return;
    const step = Math.max(1, Math.floor(points.length / 120));
    let n = 0;
    let ln = 0;
    for (let i = 0; i < points.length; i += step) {
      const p = points[i];
      const next = points[Math.min(points.length - 1, i + step)];
      const yaw = Math.atan2(next.x - p.x, next.z - p.z);
      dummy.position.set(p.x, 0.12, p.z);
      dummy.rotation.set(0, yaw, 0);
      dummy.scale.set(5.2, 0.16, 2.35);
      dummy.updateMatrix();
      deck.setMatrixAt(n++, dummy.matrix);
      if (line && ln % 2 === 0) {
        dummy.position.set(p.x, 0.2, p.z);
        dummy.rotation.set(0, yaw, 0);
        dummy.scale.set(0.55, 0.08, 1.4);
        dummy.updateMatrix();
        line.setMatrixAt(ln / 2, dummy.matrix);
      }
      ln++;
    }
    deck.count = n;
    deck.instanceMatrix.needsUpdate = true;
    if (line) {
      line.count = Math.ceil(ln / 2);
      line.instanceMatrix.needsUpdate = true;
    }
  }, [points, dummy]);

  if (points.length < 2) return null;

  const cap = Math.ceil(points.length / 2);

  return (
    <group>
      <instancedMesh ref={deckRef} args={[undefined, deckMat, cap]} frustumCulled={false}>
        <boxGeometry />
      </instancedMesh>
      <instancedMesh ref={lineRef} args={[undefined, lineMat, cap]} frustumCulled={false}>
        <boxGeometry />
      </instancedMesh>
    </group>
  );
}
