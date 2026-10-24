import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

const COUNT = 170;

interface Drop {
  x: number;
  y: number;
  z: number;
  len: number;
}

/** Short streaks parented to the camera. Skipped entirely on low quality. */
export function CityRain() {
  const camera = useThree((s) => s.camera);
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const down = useMemo(() => new THREE.Vector3(), []);
  const quat = useMemo(() => new THREE.Quaternion(), []);
  const drops = useMemo<Drop[]>(
    () =>
      Array.from({ length: COUNT }, () => ({
        x: (Math.random() - 0.5) * 34,
        y: (Math.random() - 0.4) * 26,
        z: (Math.random() - 0.15) * 36,
        len: 0.55 + Math.random() * 0.85,
      })),
    [],
  );
  const geo = useMemo(() => new THREE.BoxGeometry(0.035, 0.035, 1), []);
  const mat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#dbeafe',
        transparent: true,
        opacity: 0.28,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      }),
    [],
  );

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    camera.add(mesh);
    return () => {
      camera.remove(mesh);
    };
  }, [camera]);

  useFrame((_, delta) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const dt = Math.min(delta, 0.05);
    down.set(0, -1, 0).applyQuaternion(quat.copy(camera.quaternion).invert());
    const speed = 34;
    for (let i = 0; i < drops.length; i++) {
      const drop = drops[i];
      drop.x += down.x * speed * dt;
      drop.y += down.y * speed * dt;
      drop.z += down.z * speed * dt;
      if (drop.x < -18) drop.x += 36;
      else if (drop.x > 18) drop.x -= 36;
      if (drop.y < -14) drop.y += 28;
      else if (drop.y > 16) drop.y -= 30;
      if (drop.z < -10) drop.z += 40;
      else if (drop.z > 28) drop.z -= 38;
      dummy.position.set(drop.x, drop.y, drop.z);
      dummy.up.set(0, 1, 0);
      dummy.lookAt(drop.x + down.x, drop.y + down.y, drop.z + down.z);
      dummy.scale.set(1, 1, drop.len);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return <instancedMesh ref={meshRef} args={[geo, mat, COUNT]} frustumCulled={false} />;
}
