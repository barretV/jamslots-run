import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

interface CityTrafficProps {
  points: { x: number; z: number }[];
}

const VEHICLE_COUNT = 58;

export function CityTraffic({ points }: CityTrafficProps) {
  const carRef = useRef<THREE.InstancedMesh>(null);
  const scooterRef = useRef<THREE.InstancedMesh>(null);
  const curve = useMemo(() => {
    if (points.length < 4) return null;
    const vecs = points.map((p) => new THREE.Vector3(p.x, 0.72, p.z));
    return new THREE.CatmullRomCurve3(vecs, false, 'catmullrom', 0.15);
  }, [points]);

  const offsets = useMemo(
    () =>
      Array.from({ length: VEHICLE_COUNT }, (_, i) => ({
        t: i / VEHICLE_COUNT,
        speed: 0.022 + (i % 7) * 0.005,
        isScooter: i % 3 === 0,
      })),
    [],
  );

  const carColors = useMemo(
    () => [
      new THREE.Color('#22d3ee'),
      new THREE.Color('#f472b6'),
      new THREE.Color('#fbbf24'),
      new THREE.Color('#a78bfa'),
      new THREE.Color('#34d399'),
    ],
    [],
  );
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const vehicleMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        emissiveIntensity: 1.75,
        metalness: 0.45,
        roughness: 0.28,
        vertexColors: true,
      }),
    [],
  );

  useFrame((_, delta) => {
    if (!curve) return;
    const cars = carRef.current;
    const scooters = scooterRef.current;
    let carIdx = 0;
    let scIdx = 0;

    for (let i = 0; i < VEHICLE_COUNT; i++) {
      const o = offsets[i];
      o.t = (o.t + o.speed * delta) % 1;
      const pos = curve.getPointAt(o.t);
      const tan = curve.getTangentAt(o.t).normalize();
      dummy.position.copy(pos);
      dummy.position.y = 1.05;
      dummy.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tan);

      if (o.isScooter && scooters) {
        dummy.scale.set(1.85, 1.85, 1.85);
        dummy.updateMatrix();
        scooters.setMatrixAt(scIdx, dummy.matrix);
        scooters.setColorAt(scIdx, carColors[i % carColors.length]);
        scIdx++;
      } else if (cars) {
        dummy.scale.set(2.05, 2.05, 2.05);
        dummy.updateMatrix();
        cars.setMatrixAt(carIdx, dummy.matrix);
        cars.setColorAt(carIdx, carColors[i % carColors.length]);
        carIdx++;
      }
    }

    if (cars) {
      cars.count = carIdx;
      cars.instanceMatrix.needsUpdate = true;
      if (cars.instanceColor) cars.instanceColor.needsUpdate = true;
    }
    if (scooters) {
      scooters.count = scIdx;
      scooters.instanceMatrix.needsUpdate = true;
      if (scooters.instanceColor) scooters.instanceColor.needsUpdate = true;
    }
  });

  if (!curve) return null;

  return (
    <group>
      <instancedMesh ref={carRef} args={[undefined, vehicleMat, VEHICLE_COUNT]} frustumCulled={false}>
        <boxGeometry args={[2.85, 0.78, 1.35]} />
      </instancedMesh>
      <instancedMesh ref={scooterRef} args={[undefined, vehicleMat, VEHICLE_COUNT]} frustumCulled={false}>
        <boxGeometry args={[1.35, 0.55, 0.65]} />
      </instancedMesh>
    </group>
  );
}
