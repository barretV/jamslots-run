import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

/**
 * Neon grade pass: saturation lift, a touch of contrast, a violet/warm split and
 * a soft vignette. Runs in linear HDR space, before OutputPass applies tone
 * mapping + sRGB, so blacks stay deep and neon stays rich.
 */
const GradeShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    uVignette: { value: 0.42 },
    uSaturation: { value: 1.12 },
    uContrast: { value: 1.06 },
    uWarm: { value: 0.25 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uVignette;
    uniform float uSaturation;
    uniform float uContrast;
    uniform float uWarm;
    varying vec2 vUv;

    void main() {
      vec4 tex = texture2D(tDiffuse, vUv);
      vec3 c = tex.rgb;

      float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
      c = mix(vec3(l), c, uSaturation);
      c = (c - 0.5) * uContrast + 0.5;

      // Violet shadows / warm highlights — the classic neon-city split tone.
      c = mix(c, c * vec3(1.05, 0.95, 1.13), uWarm);

      vec2 q = vUv - 0.5;
      q.x *= 1.04;
      float v = smoothstep(0.98, 0.30, length(q));
      c *= mix(1.0, v, uVignette);

      gl_FragColor = vec4(max(c, 0.0), tex.a);
    }
  `,
};

interface CityPostFXProps {
  bloomStrength?: number;
  bloomRadius?: number;
  bloomThreshold?: number;
  bloomScale?: number;
}

/**
 * Manual EffectComposer wiring for R3F. Bloom is what actually sells the neon:
 * emissive colours above 1 in the scene bleed their light into the frame.
 *
 * Order matters: bloom runs in linear HDR, OutputPass then tone maps + encodes
 * to sRGB, and the grade runs last in display space. Grading before the tone
 * map would push every dark linear value below 0.5 toward black and crush the
 * whole night sky.
 */
export function CityPostFX({
  bloomStrength = 1.1,
  bloomRadius = 0.72,
  bloomThreshold = 0.72,
  bloomScale = 0.5,
}: CityPostFXProps) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const dpr = useThree((s) => s.viewport.dpr);

  const { composer, bloom, grade } = useMemo(() => {
    const composer = new EffectComposer(gl);
    composer.addPass(new RenderPass(scene, camera));

    const bloom = new UnrealBloomPass(
      new THREE.Vector2(256, 256),
      bloomStrength,
      bloomRadius,
      bloomThreshold,
    );
    composer.addPass(bloom);

    composer.addPass(new OutputPass());

    const grade = new ShaderPass(GradeShader);
    composer.addPass(grade);

    return { composer, bloom, grade };
  }, [gl, scene, camera]);

  useEffect(() => {
    bloom.strength = bloomStrength;
    bloom.radius = bloomRadius;
    bloom.threshold = bloomThreshold;
  }, [bloom, bloomStrength, bloomRadius, bloomThreshold]);

  useEffect(() => {
    composer.setPixelRatio(dpr);
    composer.setSize(size.width, size.height);
    if (bloomScale < 1) {
      bloom.setSize(
        Math.max(1, Math.round(size.width * dpr * bloomScale)),
        Math.max(1, Math.round(size.height * dpr * bloomScale)),
      );
    }
  }, [composer, bloom, size.width, size.height, dpr, bloomScale]);

  useEffect(
    () => () => {
      composer.dispose();
      grade.dispose?.();
    },
    [composer, grade],
  );

  useFrame(() => {
    composer.render();
  }, 1);

  return null;
}
