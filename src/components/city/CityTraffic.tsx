import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

interface CityTrafficProps {
  points: { x: number; z: number }[];
}

const VEHICLE_COUNT = 28;

export function CityTraffic({ points }: CityTrafficProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const curve = useMemo(() => {
    if (points.length < 4) return null;
    const vecs = points.map((p) => new THREE.Vector3(p.x, 0.35, p.z));
    return new THREE.CatmullRomCurve3(vecs, false, 'catmullrom', 0.15);
  }, [points]);

  const offsets = useMemo(
    () =>
      Array.from({ length: VEHICLE_COUNT }, (_, i) => ({
        t: i / VEHICLE_COUNT,
        speed: 0.018 + (i % 5) * 0.004,
        scale: i % 3 === 0 ? 0.55 : 0.38,
      })),
    [],
  );

  const colors = useMemo(() => [new THREE.Color('#22d3ee'), new THREE.Color('#f472b6'), new THREE.Color('#fbbf24'), new THREE.Color('#a78bfa')], []);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame((_, delta) => {
    const mesh = meshRef.current;
    if (!mesh || !curve) return;
    for (let i = 0; i < VEHICLE_COUNT; i++) {
      const o = offsets[i];
      o.t = (o.t + o.speed * delta) % 1;
      const pos = curve.getPointAt(o.t);
      const tan = curve.getTangentAt(o.t).normalize();
      dummy.position.copy(pos);
      dummy.position.y = 0.35 + (i % 2) * 0.05;
      dummy.scale.setScalar(o.scale);
      dummy.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tan);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      mesh.setColorAt(i, colors[i % colors.length]);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  if (!curve) return null;

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, VEHICLE_COUNT]}>
      <boxGeometry args={[1.2, 0.35, 0.7]} />
      <meshStandardMaterial emissiveIntensity={1.2} metalness={0.5} roughness={0.3} />
    </instancedMesh>
  );
}
