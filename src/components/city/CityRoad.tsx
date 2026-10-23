import { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';

interface CityRoadProps {
  points: { x: number; z: number }[];
}

/** Low-profile road chips (no tube — avoids camera clipping through a giant surface). */
export function CityRoad({ points }: CityRoadProps) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const mat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#14101c',
        emissive: '#1e293b',
        emissiveIntensity: 0.08,
        metalness: 0.55,
        roughness: 0.72,
      }),
    [],
  );

  useEffect(() => {
    const mesh = ref.current;
    if (!mesh || points.length < 2) return;
    const step = Math.max(1, Math.floor(points.length / 140));
    let n = 0;
    for (let i = 0; i < points.length; i += step) {
      const p = points[i];
      const next = points[Math.min(points.length - 1, i + step)];
      const yaw = Math.atan2(next.x - p.x, next.z - p.z);
      dummy.position.set(p.x, 0.08, p.z);
      dummy.rotation.set(0, yaw, 0);
      dummy.scale.set(2.4, 0.1, 1.1);
      dummy.updateMatrix();
      mesh.setMatrixAt(n++, dummy.matrix);
    }
    mesh.count = n;
    mesh.instanceMatrix.needsUpdate = true;
  }, [points, dummy]);

  if (points.length < 2) return null;

  return (
    <instancedMesh ref={ref} args={[undefined, mat, Math.ceil(points.length / 2)]} frustumCulled={false}>
      <boxGeometry />
    </instancedMesh>
  );
}
