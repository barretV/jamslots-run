import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { CityBuildingSlot } from '../../lib/citySpiral';

/**
 * Ambient life for the skyline: aviation beacons pulsing on the tall roofs and
 * a few slow lights crossing the sky. Cheap to draw, but the city stops feeling
 * like a static model the moment things blink and drift above it.
 */
export function CityLife({ buildings }: { buildings: CityBuildingSlot[] }) {
  const tall = useMemo(
    () => [...buildings].sort((a, b) => b.height - a.height).slice(0, 140),
    [buildings],
  );

  const beaconGeo = useMemo(() => {
    const count = Math.max(1, tall.length);
    const pos = new Float32Array(count * 3);
    const phase = new Float32Array(count);
    tall.forEach((b, i) => {
      pos[i * 3] = b.x + (Math.random() - 0.5) * 5;
      pos[i * 3 + 1] = b.roofY + 1.5;
      pos[i * 3 + 2] = b.z + (Math.random() - 0.5) * 5;
      phase[i] = Math.random() * 6.283;
    });
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geometry.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1));
    return geometry;
  }, [tall]);

  const beaconMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
        uniforms: { uTime: { value: 0 } },
        vertexShader: /* glsl */ `
          attribute float aPhase;
          uniform float uTime;
          varying float vBlink;
          void main() {
            // Sharp aviation-style pulse, not a slow breathing glow.
            float s = 0.5 + 0.5 * sin(uTime * 1.9 + aPhase);
            vBlink = pow(s, 8.0);
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            float dist = max(24.0, -mv.z);
            gl_PointSize = clamp((5.0 + vBlink * 13.0) * 44.0 / dist, 2.0, 16.0);
            gl_Position = projectionMatrix * mv;
          }
        `,
        fragmentShader: /* glsl */ `
          varying float vBlink;
          void main() {
            vec2 p = gl_PointCoord * 2.0 - 1.0;
            float d = dot(p, p);
            if (d > 1.0) discard;
            float glow = pow(1.0 - d, 1.6);
            vec3 col = mix(vec3(1.0, 0.26, 0.34), vec3(1.0, 0.88, 0.62), vBlink);
            gl_FragColor = vec4(col, glow * (0.16 + vBlink * 0.95));
          }
        `,
      }),
    [],
  );

  const flyers = useMemo(
    () =>
      Array.from({ length: 16 }, (_, i) => ({
        radius: 150 + Math.random() * 270,
        height: 95 + Math.random() * 165,
        speed: (0.035 + Math.random() * 0.045) * (i % 2 === 0 ? 1 : -1),
        phase: Math.random() * 6.283,
        tint: new THREE.Color(['#a5f3fc', '#fbcfe8', '#fde68a'][i % 3]),
      })),
    [],
  );

  const flyerGeo = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(flyers.length * 3);
    const colors = new Float32Array(flyers.length * 3);
    flyers.forEach((f, i) => {
      colors[i * 3] = f.tint.r;
      colors[i * 3 + 1] = f.tint.g;
      colors[i * 3 + 2] = f.tint.b;
    });
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return geometry;
  }, [flyers]);

  const flyerMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
        uniforms: { uTime: { value: 0 } },
        vertexShader: /* glsl */ `
          attribute vec3 color;
          varying vec3 vColor;
          void main() {
            vColor = color;
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            float dist = max(30.0, -mv.z);
            gl_PointSize = clamp(3200.0 / dist, 2.0, 11.0);
            gl_Position = projectionMatrix * mv;
          }
        `,
        fragmentShader: /* glsl */ `
          varying vec3 vColor;
          void main() {
            vec2 p = gl_PointCoord * 2.0 - 1.0;
            float d = dot(p, p);
            if (d > 1.0) discard;
            float glow = pow(1.0 - d, 1.8);
            gl_FragColor = vec4(vColor * 1.6, glow * 0.85);
          }
        `,
      }),
    [],
  );

  const time = useRef(0);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    time.current += dt;
    beaconMat.uniforms.uTime.value = time.current;
    flyerMat.uniforms.uTime.value = time.current;
    const positions = flyerGeo.getAttribute('position') as THREE.BufferAttribute;
    flyers.forEach((f, i) => {
      const angle = f.phase + time.current * f.speed;
      positions.setXYZ(
        i,
        Math.cos(angle) * f.radius,
        f.height + Math.sin(time.current * 0.5 + f.phase) * 9,
        Math.sin(angle) * f.radius,
      );
    });
    positions.needsUpdate = true;
  });

  return (
    <>
      <points geometry={beaconGeo} material={beaconMat} frustumCulled={false} renderOrder={12} />
      <points geometry={flyerGeo} material={flyerMat} frustumCulled={false} renderOrder={13} />
    </>
  );
}
