import * as THREE from 'three';

/**
 * MeshStandardMaterial with a per-instance HDR glow colour.
 *
 * Three's `instanceColor` multiplies the *diffuse* colour only, so an
 * InstancedMesh cannot vary its emissive output per instance out of the box.
 * We inject an `aGlow` instanced attribute straight into `totalEmissiveRadiance`
 * so every building / window strip / sign can carry its own neon colour, and
 * values pushed above 1 are exactly what the UnrealBloom pass picks up.
 */
export interface NeonMaterialOptions {
  color?: THREE.ColorRepresentation;
  /** Base emissive tint; usually white so aGlow is the colour. */
  emissive?: THREE.ColorRepresentation;
  /** Global multiplier applied on top of the per-instance aGlow. */
  emissiveIntensity?: number;
  metalness?: number;
  roughness?: number;
  vertexColors?: boolean;
  /** Attribute name holding the per-instance glow (default `aGlow`). */
  glowAttribute?: string;
  flatShading?: boolean;
  /** View-dependent wet sheen. Used on street decks. */
  sheen?: boolean;
}

export function createNeonMaterial(opts: NeonMaterialOptions = {}): THREE.MeshStandardMaterial {
  const glowAttribute = opts.glowAttribute ?? 'aGlow';
  const mat = new THREE.MeshStandardMaterial({
    color: opts.color ?? '#181230',
    emissive: opts.emissive ?? '#ffffff',
    emissiveIntensity: opts.emissiveIntensity ?? 1,
    metalness: opts.metalness ?? 0.35,
    roughness: opts.roughness ?? 0.45,
    vertexColors: opts.vertexColors ?? false,
    flatShading: opts.flatShading ?? false,
  });

  mat.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
attribute vec3 ${glowAttribute};
varying vec3 vNeonGlow;`,
      )
      .replace('#include <begin_vertex>', `#include <begin_vertex>
  vNeonGlow = ${glowAttribute};`);

    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
varying vec3 vNeonGlow;`)
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
  totalEmissiveRadiance = vNeonGlow * emissive;
  ${
    opts.sheen
      ? `float wetNd = clamp(abs(dot(normalize(normal), normalize(vViewPosition))), 0.0, 1.0);
  totalEmissiveRadiance += vec3(0.11, 0.2, 0.3) * pow(1.0 - wetNd, 2.5);`
      : ''
  }`,
      );
  };
  mat.customProgramCacheKey = () => `neon-glow:${glowAttribute}:${opts.sheen ? 'wet' : 'dry'}`;
  return mat;
}

export interface InstanceBatch {
  matrices: THREE.Matrix4[];
  /** Per-instance HDR emissive colour. */
  glows: THREE.Color[];
  /** Per-instance diffuse tint (instanceColor). */
  colors: THREE.Color[];
}

export function emptyBatch(): InstanceBatch {
  return { matrices: [], glows: [], colors: [] };
}

/** Build an InstancedMesh from a batch + a per-instance glow attribute. */
export function buildInstancedMesh(
  batch: InstanceBatch,
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
): THREE.InstancedMesh | null {
  const count = batch.matrices.length;
  if (count === 0) return null;
  const geo = geometry.clone();
  const glow = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const c = batch.glows[i] ?? new THREE.Color(0, 0, 0);
    glow[i * 3] = c.r;
    glow[i * 3 + 1] = c.g;
    glow[i * 3 + 2] = c.b;
  }
  geo.setAttribute('aGlow', new THREE.InstancedBufferAttribute(glow, 3));

  const mesh = new THREE.InstancedMesh(geo, material, count);
  mesh.frustumCulled = false;
  for (let i = 0; i < count; i++) {
    mesh.setMatrixAt(i, batch.matrices[i]);
    if (batch.colors[i]) mesh.setColorAt(i, batch.colors[i]);
  }
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.count = count;
  return mesh;
}

/** HSL helper used across the city for consistent neon hues. */
export function neonColor(hue: number, sat: number, light: number, intensity = 1): THREE.Color {
  const c = new THREE.Color();
  c.setHSL(hue, sat, light);
  c.multiplyScalar(intensity);
  return c;
}

/**
 * Voxel tower material: standard PBR shading plus a procedural window grid
 * computed from world position, so one InstancedMesh gives every tower
 * correctly-scaled, individually flickering neon windows for free.
 */
export function createVoxelTowerMaterial(opts: {
  color?: THREE.ColorRepresentation;
  metalness?: number;
  roughness?: number;
  windowStrength?: number;
  /** Horizontal spacing between windows, in world units. */
  cols?: number;
  /** Vertical spacing between window floors, in world units. */
  rows?: number;
  /** Base glow applied to the whole facade (unlit haze), 0..1. */
  ambient?: number;
  /** Fraction of windows that are lit, 0..1. */
  litRatio?: number;
} = {}): THREE.MeshStandardMaterial {
  const cellU = opts.cols ?? 1.65;
  const cellV = opts.rows ?? 1.95;
  const strength = opts.windowStrength ?? 1;
  const ambient = opts.ambient ?? 0.02;
  const litRatio = opts.litRatio ?? 0.62;

  const mat = new THREE.MeshStandardMaterial({
    color: opts.color ?? '#0a0818',
    emissive: '#ffffff',
    emissiveIntensity: 1,
    metalness: opts.metalness ?? 0.6,
    roughness: opts.roughness ?? 0.55,
    vertexColors: true,
  });
  const uTime = { value: 0 };
  mat.userData.uTime = uTime;

  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = uTime;
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
attribute vec3 aGlow;
varying vec3 vNeonGlow;
varying vec3 vWorldPos;
varying vec3 vObjNormal;`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
  vNeonGlow = aGlow;
  vObjNormal = normal;
  vWorldPos = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;`,
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
uniform float uTime;
varying vec3 vNeonGlow;
varying vec3 vWorldPos;
varying vec3 vObjNormal;`,
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
{
  vec3 nrm = normalize(vObjNormal);
  float upFace = step(0.72, abs(nrm.y));

  float u = (abs(nrm.x) > abs(nrm.z)) ? vWorldPos.z : vWorldPos.x;
  vec2 p = vec2(u, vWorldPos.y) / vec2(${cellU.toFixed(3)}, ${cellV.toFixed(3)});
  vec2 g = fract(p);
  vec2 id = floor(p);

  float rnd = fract(sin(dot(id, vec2(12.9898, 78.233))) * 43758.5453);
  float lit = step(fract(rnd * 11.0), ${litRatio.toFixed(3)});
  float blinkers = step(0.8, fract(rnd * 7.13));
  float phase = sin(uTime * (1.7 + rnd * 4.5) + rnd * 57.0);
  float blink = smoothstep(-0.2, 0.45, phase);
  lit *= mix(1.0, blink, blinkers);

  // Occasional dark floors and rare fully-lit service strips break up the
  // graph-paper regularity.
  float floorRnd = fract(sin(floor(p.y) * 91.7 + 3.1) * 1271.3);
  lit *= step(0.20, floorRnd);
  float stripRnd = fract(sin(floor(p.x) * 57.3) * 3457.1);
  lit = max(lit, step(0.93, stripRnd));

  // Panel inset: lit glass sits inside the frame of each window cell.
  float winX = smoothstep(0.18, 0.30, g.x) * (1.0 - smoothstep(0.68, 0.80, g.x));
  float winY = smoothstep(0.24, 0.38, g.y) * (1.0 - smoothstep(0.62, 0.74, g.y));
  float win = winX * winY * lit;

  // Coherent window palette: mostly the tower's own warm tint, with a few
  // cyan / magenta panels so the grid still shimmers without turning into a
  // rainbow speckle.
  vec3 wc = vNeonGlow;

  vec3 glow = wc * win * (1.0 - upFace) * ${strength.toFixed(3)};
  glow += vNeonGlow * upFace * 0.06;
  glow += vec3(0.5, 0.5, 0.55) * ${ambient.toFixed(3)};

  totalEmissiveRadiance = glow * emissive;
}`,
      );
  };

  mat.customProgramCacheKey = () =>
    `voxel-tower:v5:${cellU}:${cellV}:${strength}:${ambient}:${litRatio}`;
  return mat;
}
