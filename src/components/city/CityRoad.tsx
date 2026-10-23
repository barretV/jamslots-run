import { useMemo } from 'react';
import * as THREE from 'three';

interface CityRoadProps {
  points: { x: number; z: number }[];
}

export function CityRoad({ points }: CityRoadProps) {
  const roadGeo = useMemo(() => {
    if (points.length < 3) return null;
    const vecs = points.map((p) => new THREE.Vector3(p.x, 0.14, p.z));
    const curve = new THREE.CatmullRomCurve3(vecs, false, 'catmullrom', 0.18);
    const segs = Math.min(640, points.length * 2);
    return new THREE.TubeGeometry(curve, segs, 1.65, 8, false);
  }, [points]);

  if (!roadGeo) return null;

  return (
    <mesh geometry={roadGeo}>
      <meshStandardMaterial
        color="#14101c"
        emissive="#22d3ee"
        emissiveIntensity={0.42}
        metalness={0.78}
        roughness={0.42}
      />
    </mesh>
  );
}
