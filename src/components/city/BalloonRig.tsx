import { useFrame } from '@react-three/fiber';
import type { MutableRefObject } from 'react';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

export interface FlightInput {
  forward: number;
  strafe: number;
  up: number;
}

interface BalloonRigProps {
  inputRef: MutableRefObject<FlightInput>;
  mode: 'fly' | 'landing' | 'landed';
  landTarget: { x: number; z: number; roofY: number } | null;
  landProgress: number;
  spawn: { x: number; y: number; z: number };
  onPosition: (pos: THREE.Vector3, yaw: number) => void;
}

const MOVE_SPEED = 14;
const VERT_SPEED = 10;
const YAW_SPEED = 1.8;

export function BalloonRig({ inputRef, mode, landTarget, landProgress, spawn, onPosition }: BalloonRigProps) {
  const groupRef = useRef<THREE.Group>(null);
  const yawRef = useRef(0);
  const posRef = useRef(new THREE.Vector3(spawn.x, spawn.y, spawn.z));

  useEffect(() => {
    posRef.current.set(spawn.x, spawn.y, spawn.z);
  }, [spawn.x, spawn.y, spawn.z]);
  const flyStart = useRef(new THREE.Vector3());
  const flyEnd = useRef(new THREE.Vector3());

  const basketMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#78350f', emissive: '#92400e', emissiveIntensity: 0.2 }),
    [],
  );
  const envelopeMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#4c1d95',
        emissive: '#a855f7',
        emissiveIntensity: 0.45,
        metalness: 0.15,
        roughness: 0.55,
      }),
    [],
  );

  useFrame((state, delta) => {
    const g = groupRef.current;
    if (!g) return;

    const input = inputRef.current;
    if (mode === 'landing' && landTarget) {
      if (landProgress <= 0.01) {
        flyStart.current.copy(posRef.current);
        flyEnd.current.set(landTarget.x, landTarget.roofY + 2.2, landTarget.z);
      }
      const t = THREE.MathUtils.smoothstep(landProgress, 0, 1);
      posRef.current.lerpVectors(flyStart.current, flyEnd.current, t);
    } else if (mode === 'landed' && landTarget) {
      posRef.current.set(landTarget.x, landTarget.roofY + 2.2, landTarget.z);
    } else if (mode === 'fly') {
      if (input.strafe !== 0) yawRef.current -= input.strafe * YAW_SPEED * delta;
      const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), yawRef.current);
      const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), yawRef.current);
      const move = new THREE.Vector3();
      move.addScaledVector(forward, input.forward * MOVE_SPEED * delta);
      move.addScaledVector(right, input.strafe * MOVE_SPEED * delta * 0.35);
      posRef.current.add(move);
      posRef.current.y += input.up * VERT_SPEED * delta;
      posRef.current.y = THREE.MathUtils.clamp(posRef.current.y, 4, 80);
    }

    g.position.copy(posRef.current);
    g.rotation.y = yawRef.current;

    const cam = state.camera;
    const camOffset = new THREE.Vector3(0, 5.5, 14).applyAxisAngle(new THREE.Vector3(0, 1, 0), yawRef.current);
    const desired = posRef.current.clone().add(camOffset);
    cam.position.lerp(desired, 1 - Math.pow(0.0002, delta));
    const lookAt = posRef.current.clone().add(new THREE.Vector3(0, 2, 0));
    cam.lookAt(lookAt);

    onPosition(posRef.current.clone(), yawRef.current);
  });

  return (
    <group ref={groupRef}>
      <mesh position={[0, 2.8, 0]} scale={[2.4, 3.2, 2.4]} material={envelopeMat}>
        <sphereGeometry args={[1, 16, 12]} />
      </mesh>
      <mesh position={[0, 0.6, 0]} material={basketMat}>
        <boxGeometry args={[1.1, 0.9, 1.1]} />
      </mesh>
      <mesh position={[0, 1.6, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 1.2, 6]} />
        <meshStandardMaterial color="#44403c" />
      </mesh>
    </group>
  );
}
