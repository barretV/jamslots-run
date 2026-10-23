import { useMemo } from 'react';
import * as THREE from 'three';

interface CityRoadProps {
  points: { x: number; z: number }[];
}

export function CityRoad({ points }: CityRoadProps) {
  const { asphaltGeo, neonGeo } = useMemo(() => {
    if (points.length < 3) {
      return { asphaltGeo: null, neonGeo: null };
    }
    const vecs = points.map((p) => new THREE.Vector3(p.x, 0.12, p.z));
    const curve = new THREE.CatmullRomCurve3(vecs, false, 'catmullrom', 0.18);
    const segs = Math.min(640, points.length * 2);
    const asphaltGeo = new THREE.TubeGeometry(curve, segs, 1.35, 8, false);
    const neonGeo = new THREE.TubeGeometry(curve, segs, 1.55, 8, false);
    return { asphaltGeo, neonGeo };
  }, [points]);

  if (!asphaltGeo || !neonGeo) return null;

  return (
    <group>
      <mesh geometry={neonGeo}>
        <meshStandardMaterial
          color="#0a1628"
          emissive="#22d3ee"
          emissiveIntensity={0.82}
          metalness={0.7}
          roughness={0.4}
        />
      </mesh>
      <mesh geometry={asphaltGeo}>
        <meshStandardMaterial color="#14101c" emissive="#1a1030" emissiveIntensity={0.15} metalness={0.75} roughness={0.45} />
      </mesh>
    </group>
  );
}
