import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

export interface FireworkAnchor {
  x: number;
  y: number;
  z: number;
}

const BURSTS = 12;
const PER = 42;
const COUNT = BURSTS * PER;
const LIFE = 2.15;

const PALETTE = ['#ffd76a', '#fff7d6', '#ff4fa3', '#67e8f9', '#e08a4f', '#c084fc', '#f8fafc'];

interface BurstSim {
  age: Float32Array;
  life: Float32Array;
  origin: Float32Array;
  vel: Float32Array;
  next: number;
  cursor: number;
}

function spawnBurst(
  sim: BurstSim,
  index: number,
  anchor: FireworkAnchor,
  positions: Float32Array,
  lives: Float32Array,
  colors: Float32Array,
) {
  sim.origin[index * 3] = anchor.x;
  sim.origin[index * 3 + 1] = anchor.y;
  sim.origin[index * 3 + 2] = anchor.z;
  sim.age[index] = 0;
  sim.life[index] = LIFE;
  const tint = new THREE.Color(PALETTE[index % PALETTE.length]);
  for (let p = 0; p < PER; p++) {
    const idx = index * PER + p;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const speed = 16 + Math.random() * 28;
    sim.vel[idx * 3] = Math.sin(phi) * Math.cos(theta) * speed;
    sim.vel[idx * 3 + 1] = Math.abs(Math.cos(phi)) * speed * 0.92 + 6;
    sim.vel[idx * 3 + 2] = Math.sin(phi) * Math.sin(theta) * speed;
    positions[idx * 3] = anchor.x;
    positions[idx * 3 + 1] = anchor.y;
    positions[idx * 3 + 2] = anchor.z;
    lives[idx] = 1;
    colors[idx * 3] = tint.r;
    colors[idx * 3 + 1] = tint.g;
    colors[idx * 3 + 2] = tint.b;
  }
}

function parkBurst(index: number, positions: Float32Array, lives: Float32Array) {
  for (let p = 0; p < PER; p++) {
    const idx = index * PER + p;
    positions[idx * 3 + 1] = -800;
    lives[idx] = 0;
  }
}

function skyAnchor(focusX: number, focusZ: number, salt: number): FireworkAnchor {
  const ang = salt * 2.399 + Math.random() * 0.8;
  const rad = 30 + (salt % 5) * 38 + Math.random() * 40;
  return {
    x: focusX + Math.cos(ang) * rad,
    y: 168 + (salt % 4) * 28 + Math.random() * 36,
    z: focusZ + Math.sin(ang) * rad,
  };
}

/** Repeating sky bursts. Readable from cruise height, a handful alive at once. */
export function CityFireworks({
  focusX,
  focusZ,
  spots,
}: {
  focusX: number;
  focusZ: number;
  spots: FireworkAnchor[];
}) {
  const positions = useMemo(() => new Float32Array(COUNT * 3), []);
  const colors = useMemo(() => new Float32Array(COUNT * 3), []);
  const lives = useMemo(() => new Float32Array(COUNT), []);
  const focusRef = useRef({ x: focusX, z: focusZ });
  const spotsRef = useRef(spots);
  focusRef.current = { x: focusX, z: focusZ };
  spotsRef.current = spots;

  const sim = useRef<BurstSim | null>(null);
  if (!sim.current) {
    const next: BurstSim = {
      age: new Float32Array(BURSTS),
      life: new Float32Array(BURSTS),
      origin: new Float32Array(BURSTS * 3),
      vel: new Float32Array(COUNT * 3),
      next: 0.32,
      cursor: 6,
    };
    for (let i = 0; i < 4; i++) {
      spawnBurst(next, i, skyAnchor(focusX, focusZ, i + 1), positions, lives, colors);
      next.age[i] = 0.15 + i * 0.28;
    }
    spawnBurst(next, 4, skyAnchor(focusX, focusZ, 5), positions, lives, colors);
    spawnBurst(next, 5, skyAnchor(focusX, focusZ, 8), positions, lives, colors);
    next.age[4] = 0.22;
    next.age[5] = 0.48;
    for (let i = 6; i < BURSTS; i++) parkBurst(i, positions, lives);
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
            float dist = max(32.0, -mv.z);
            gl_PointSize = clamp(aLife * 2800.0 / dist, 16.0, 42.0);
            gl_Position = projectionMatrix * mv;
          }
        `,
        fragmentShader: /* glsl */ `
          varying float vLife;
          varying vec3 vColor;
          void main() {
            if (vLife < 0.03) discard;
            vec2 p = gl_PointCoord * 2.0 - 1.0;
            float d = dot(p, p);
            if (d > 1.0) discard;
            float glow = pow(1.0 - d, 1.35);
            gl_FragColor = vec4(vColor * 1.55, glow * vLife);
          }
        `,
      }),
    [],
  );

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const s = sim.current;
    if (!s) return;
    const focus = focusRef.current;
    const list = spotsRef.current;
    s.next -= dt;
    if (s.next <= 0) {
      const anchor = skyAnchor(focus.x, focus.z, s.cursor + list.length + 2);
      spawnBurst(s, s.cursor, anchor, positions, lives, colors);
      s.cursor = (s.cursor + 1) % BURSTS;
      s.next = 0.38;
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
        const drag = 1 - t * 0.22;
        positions[idx * 3] = ox + s.vel[idx * 3] * t * drag;
        positions[idx * 3 + 1] = oy + s.vel[idx * 3 + 1] * t * drag - 11 * t * t;
        positions[idx * 3 + 2] = oz + s.vel[idx * 3 + 2] * t * drag;
        lives[idx] = fade;
      }
    }
    (geo.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
    (geo.getAttribute('aLife') as THREE.BufferAttribute).needsUpdate = true;
    (geo.getAttribute('color') as THREE.BufferAttribute).needsUpdate = true;
  });

  return <points geometry={geo} material={mat} frustumCulled={false} renderOrder={20} />;
}
