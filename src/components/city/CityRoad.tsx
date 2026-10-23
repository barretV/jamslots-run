import { useMemo } from 'react';
import * as THREE from 'three';

interface CityRoadProps {
  points: { x: number; z: number }[];
}

export function CityRoad({ points }: CityRoadProps) {
  const { tubeGeo, ringGeos } = useMemo(() => {
    if (points.length < 3) {
      return { tubeGeo: null, ringGeos: [] as THREE.BufferGeometry[] };
    }
    const vecs = points.map((p) => new THREE.Vector3(p.x, 0.08, p.z));
    const curve = new THREE.CatmullRomCurve3(vecs, false, 'catmullrom', 0.2);
    const tubeGeo = new THREE.TubeGeometry(curve, Math.min(512, points.length * 2), 0.55, 6, false);

    const ringGeos: THREE.BufferGeometry[] = [];
    for (let i = 8; i < points.length; i += 24) {
      const p = points[i];
      const ring = new THREE.RingGeometry(3.5, 4.2, 32);
      ring.rotateX(-Math.PI / 2);
      ring.translate(p.x, 0.05, p.z);
      ringGeos.push(ring);
    }
    return { tubeGeo, ringGeos };
  }, [points]);

  if (!tubeGeo) return null;

  return (
    <group>
      <mesh geometry={tubeGeo} receiveShadow>
        <meshStandardMaterial
          color="#0a0a12"
          emissive="#1e1b4b"
          emissiveIntensity={0.35}
          metalness={0.85}
          roughness={0.35}
        />
      </mesh>
      {ringGeos.map((g, i) => (
        <mesh key={i} geometry={g}>
          <meshStandardMaterial
            color="#050508"
            emissive="#22d3ee"
            emissiveIntensity={0.25}
            metalness={0.9}
            roughness={0.4}
          />
        </mesh>
      ))}
    </group>
  );
}
