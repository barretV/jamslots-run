import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

export interface FireworkAnchor {
  x: number;
  y: number;
  z: number;
}

const BURSTS = 5;
const PER = 24;
const COUNT = BURSTS * PER;
const LIFE = 1.35;

const PALETTE = ['#ffd76a', '#f8fafc', '#e879f9', '#67e8f9', '#e08a4f'];

interface BurstSim {
  age: Float32Array;
  life: Float32Array;
  origin: Float32Array;
  vel: Float32Array;
  next: number;
  cursor: number;
}

function spawnBurst(sim: BurstSim, index: number, anchor: FireworkAnchor, positions: Float32Array, lives: Float32Array, colors: Float32Array) {
  const ox = anchor.x + (Math.random() - 0.5) * 10;
  const oy = anchor.y + (Math.random() - 0.5) * 6;
  const oz = anchor.z + (Math.random() - 0.5) * 10;
  sim.origin[index * 3] = ox;
  sim.origin[index * 3 + 1] = oy;
  sim.origin[index * 3 + 2] = oz;
  sim.age[index] = 0;
  sim.life[index] = LIFE;
  const tint = new THREE.Color(PALETTE[index % PALETTE.length]);
  for (let p = 0; p < PER; p++) {
    const idx = index * PER + p;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const speed = 8 + Math.random() * 14;
    sim.vel[idx * 3] = Math.sin(phi) * Math.cos(theta) * speed;
    sim.vel[idx * 3 + 1] = Math.abs(Math.cos(phi)) * speed * 0.85;
    sim.vel[idx * 3 + 2] = Math.sin(phi) * Math.sin(theta) * speed;
    positions[idx * 3] = ox;
    positions[idx * 3 + 1] = oy;
    positions[idx * 3 + 2] = oz;
    lives[idx] = 1;
    colors[idx * 3] = tint.r;
    colors[idx * 3 + 1] = tint.g;
    colors[idx * 3 + 2] = tint.b;
  }
}

function parkBurst(index: number, positions: Float32Array, lives: Float32Array) {
  for (let p = 0; p < PER; p++) {
    const idx = index * PER + p;
    positions[idx * 3 + 1] = -400;
    lives[idx] = 0;
  }
}

/** A few recycled sky bursts. One draw call, two alive at a time. */
export function CityFireworks({ anchors }: { anchors: FireworkAnchor[] }) {
  const positions = useMemo(() => new Float32Array(COUNT * 3), []);
  const colors = useMemo(() => new Float32Array(COUNT * 3), []);
  const lives = useMemo(() => new Float32Array(COUNT), []);
  const anchorsRef = useRef(anchors);
  anchorsRef.current = anchors;

  const sim = useRef<BurstSim | null>(null);
  if (!sim.current) {
    const next: BurstSim = {
      age: new Float32Array(BURSTS),
      life: new Float32Array(BURSTS),
      origin: new Float32Array(BURSTS * 3),
      vel: new Float32Array(COUNT * 3),
      next: 1.15,
      cursor: 2,
    };
    const first = anchors[0] ?? { x: 0, y: 80, z: 0 };
    const second = anchors[1] ?? { x: first.x + 18, y: first.y + 6, z: first.z - 12 };
    spawnBurst(next, 0, first, positions, lives, colors);
    spawnBurst(next, 1, second, positions, lives, colors);
    next.age[0] = 0.18;
    next.age[1] = 0.05;
    for (let i = 2; i < BURSTS; i++) parkBurst(i, positions, lives);
    sim.current = next;
  }

  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    g.setAttribute('aLife', new THREE.BufferAttribute(lives, 1));
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return g;
  }, [colors, lives, positions]);

  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
        uniforms: {},
        vertexShader: /* glsl */ `
          attribute float aLife;
          attribute vec3 color;
          varying float vLife;
          varying vec3 vColor;
          void main() {
            vLife = aLife;
            vColor = color;
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = aLife * 16.0 * (90.0 / max(24.0, -mv.z));
            gl_Position = projectionMatrix * mv;
          }
        `,
        fragmentShader: /* glsl */ `
          varying float vLife;
          varying vec3 vColor;
          void main() {
            if (vLife < 0.04) discard;
            vec2 p = gl_PointCoord * 2.0 - 1.0;
            float d = dot(p, p);
            if (d > 1.0) discard;
            gl_FragColor = vec4(vColor, (1.0 - d) * vLife);
          }
        `,
      }),
    [],
  );

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const s = sim.current;
    if (!s) return;
    const list = anchorsRef.current;
    const fallback = list[0] ?? { x: 0, y: 90, z: 0 };
    s.next -= dt;
    if (s.next <= 0 && list.length > 0) {
      const anchor = list[s.cursor % list.length] ?? fallback;
      spawnBurst(s, s.cursor, anchor, positions, lives, colors);
      s.cursor = (s.cursor + 1) % BURSTS;
      s.next = 1.7;
    }
    for (let i = 0; i < BURSTS; i++) {
      if (s.life[i] <= 0) continue;
      s.age[i] += dt;
      const t = s.age[i];
      if (t >= s.life[i]) {
        s.life[i] = 0;
        parkBurst(i, positions, lives);
        continue;
      }
      const fade = 1 - t / s.life[i];
      const ox = s.origin[i * 3];
      const oy = s.origin[i * 3 + 1];
      const oz = s.origin[i * 3 + 2];
      for (let p = 0; p < PER; p++) {
        const idx = i * PER + p;
        const drag = 1 - t * 0.35;
        positions[idx * 3] = ox + s.vel[idx * 3] * t * drag;
        positions[idx * 3 + 1] = oy + s.vel[idx * 3 + 1] * t * drag - 9 * t * t;
        positions[idx * 3 + 2] = oz + s.vel[idx * 3 + 2] * t * drag;
        lives[idx] = fade;
      }
    }
    const posAttr = geo.getAttribute('position') as THREE.BufferAttribute;
    const lifeAttr = geo.getAttribute('aLife') as THREE.BufferAttribute;
    const colorAttr = geo.getAttribute('color') as THREE.BufferAttribute;
    posAttr.needsUpdate = true;
    lifeAttr.needsUpdate = true;
    colorAttr.needsUpdate = true;
  });

  return <points geometry={geo} material={mat} frustumCulled={false} />;
}
