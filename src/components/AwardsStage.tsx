import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

type Metal = 'silver' | 'gold' | 'bronze';

const PLACES: { metal: Metal; place: string; x: number; h: number; w: number; color: number; deep: number; ink: string }[] = [
  { metal: 'silver', place: '2', x: -2.25, h: 1.12, w: 1.22, color: 0xd5dee8, deep: 0x6d7c8e, ink: '#121820' },
  { metal: 'gold', place: '1', x: 0, h: 1.78, w: 1.42, color: 0xffc93a, deep: 0x8a4e00, ink: '#3a2410' },
  { metal: 'bronze', place: '3', x: 2.25, h: 0.78, w: 1.16, color: 0xe08a4f, deep: 0x6b3414, ink: '#2a1208' },
];

function labelTexture(place: string, ink: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const g = canvas.getContext('2d');
  if (g) {
    g.clearRect(0, 0, 256, 256);
    g.fillStyle = ink;
    g.font = '900 148px Unbounded, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(place, 128, 142);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function blockTexture(css: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 128;
  const g = canvas.getContext('2d');
  if (g) {
    const tint = new THREE.Color(css);
    const wash = tint.clone().lerp(new THREE.Color(0xffffff), 0.55);
    const mid = tint.clone().lerp(new THREE.Color(0xffffff), 0.18);
    const shade = g.createLinearGradient(0, 0, 0, 128);
    shade.addColorStop(0, `#${wash.getHexString()}`);
    shade.addColorStop(0.22, `#${tint.getHexString()}`);
    shade.addColorStop(1, `#${mid.getHexString()}`);
    g.fillStyle = shade;
    g.fillRect(0, 0, 32, 128);
    g.fillStyle = 'rgba(255,255,255,0.72)';
    g.fillRect(0, 0, 32, 5);
    g.fillStyle = 'rgba(255,255,255,0.28)';
    g.fillRect(0, 36, 32, 7);
    g.fillStyle = 'rgba(0,0,0,0.18)';
    g.fillRect(0, 108, 32, 8);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function metalMaterial(color: number, deep: number, rough: number): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    metalness: 0.92,
    roughness: rough,
    emissive: deep,
    emissiveIntensity: 0.22,
    envMapIntensity: 1.15,
  });
}

function buildPlace(spec: (typeof PLACES)[number], textures: THREE.Texture[]): THREE.Group {
  const group = new THREE.Group();
  group.position.x = spec.x;

  const carved = blockTexture(`#${new THREE.Color(spec.color).getHexString()}`);
  textures.push(carved);
  const blockMat = metalMaterial(0xffffff, spec.deep, spec.metal === 'silver' ? 0.28 : 0.34);
  blockMat.map = carved;
  blockMat.emissiveMap = carved;
  blockMat.emissiveIntensity = 0.42;
  blockMat.metalness = 0.62;
  const block = new THREE.Mesh(new THREE.BoxGeometry(spec.w, spec.h, 1.05), blockMat);
  block.position.y = spec.h / 2;
  group.add(block);

  const lip = new THREE.Mesh(
    new THREE.BoxGeometry(spec.w + 0.12, 0.1, 1.16),
    metalMaterial(0xf4efe4, spec.color, 0.18),
  );
  (lip.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.35;
  lip.position.y = spec.h + 0.02;
  group.add(lip);

  const medal = new THREE.Group();
  medal.position.set(0, spec.h + 0.46, 0.08);
  medal.rotation.x = -0.22;
  medal.userData.baseY = medal.position.y;

  const disc = new THREE.Mesh(
    new THREE.CylinderGeometry(0.34, 0.34, 0.1, 40),
    metalMaterial(spec.color, spec.deep, 0.14),
  );
  disc.rotation.x = Math.PI / 2;
  medal.add(disc);

  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(0.34, 0.05, 16, 42),
    metalMaterial(spec.deep, 0x120c08, 0.32),
  );
  medal.add(rim);

  const label = labelTexture(spec.place, spec.ink);
  textures.push(label);
  const face = new THREE.Mesh(
    new THREE.CircleGeometry(0.24, 32),
    new THREE.MeshBasicMaterial({ map: label, transparent: true, toneMapped: false }),
  );
  face.position.z = 0.06;
  medal.add(face);

  const ribbonMat = new THREE.MeshStandardMaterial({
    color: spec.color,
    metalness: 0.4,
    roughness: 0.45,
    emissive: spec.deep,
    emissiveIntensity: 0.3,
    side: THREE.DoubleSide,
  });
  for (const side of [-1, 1]) {
    const ribbon = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.42, 0.03), ribbonMat);
    ribbon.position.set(side * 0.16, -0.28, -0.08);
    ribbon.rotation.z = side * 0.08;
    medal.add(ribbon);
  }

  group.add(medal);
  group.userData.medal = medal;

  const spot = new THREE.SpotLight(0xfff5e2, spec.metal === 'gold' ? 14 : 8, 10, 0.5, 0.7, 1);
  spot.position.set(0, spec.h + 3.8, 2.4);
  spot.target.position.set(0, spec.h * 0.55, 0);
  group.add(spot, spot.target);

  const fill = new THREE.PointLight(spec.color, spec.metal === 'gold' ? 6 : 3, 7, 2);
  fill.position.set(0, spec.h * 0.5, 2.2);
  group.add(fill);

  return group;
}

/** 3D awards blocks and medals. Lighting follows the MashKin victory stage. */
export function AwardsStage({ size }: { size: 'hero' | 'votes' }) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.environmentIntensity = 1;
    const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 40);
    camera.position.set(0, 1.55, 6);
    camera.lookAt(0, 1.15, 0);

    const pmrem = new THREE.PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    const env = pmrem.fromScene(room, 0.04);
    scene.environment = env.texture;
    pmrem.dispose();

    scene.add(new THREE.HemisphereLight(0xfff2d8, 0x0e0820, 0.7));
    const key = new THREE.DirectionalLight(0xfff3dc, 2.4);
    key.position.set(-3.2, 7.5, 6);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x8fb6ff, 1.55);
    rim.position.set(3.5, 4.2, -5);
    scene.add(rim);

    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(5.2, 64),
      new THREE.MeshStandardMaterial({
        color: 0x243056,
        metalness: 0.55,
        roughness: 0.42,
        emissive: 0x10182c,
        emissiveIntensity: 0.45,
      }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.02;
    scene.add(floor);

    for (const [radius, opacity] of [[2.4, 0.28], [3.6, 0.16]] as const) {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(radius - 0.03, radius + 0.03, 80),
        new THREE.MeshBasicMaterial({
          color: 0x9fc8ff,
          transparent: true,
          opacity,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          toneMapped: false,
        }),
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.01;
      scene.add(ring);
    }

    const textures: THREE.Texture[] = [];
    const medals: THREE.Object3D[] = [];
    for (const spec of PLACES) {
      const place = buildPlace(spec, textures);
      scene.add(place);
      const medal = place.userData.medal as THREE.Object3D | undefined;
      if (medal) medals.push(medal);
    }

    let frame = 0;
    let stopped = false;
    const clock = new THREE.Clock();

    const fit = () => {
      const width = host.clientWidth;
      const height = host.clientHeight;
      if (width < 2 || height < 2) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      renderer.setSize(width * dpr, height * dpr, false);
      renderer.domElement.style.width = '100%';
      renderer.domElement.style.height = '100%';
      renderer.domElement.style.display = 'block';
      const aspect = width / height;
      camera.aspect = aspect;
      const halfFov = (28 * Math.PI) / 180 / 2;
      const visibleWidth = 6.9;
      const dist = visibleWidth / 2 / (Math.tan(halfFov) * aspect);
      camera.position.set(0, 1.85, dist);
      camera.lookAt(0, 1.4, 0);
      camera.updateProjectionMatrix();
    };

    const observer = new ResizeObserver(fit);
    observer.observe(host);
    fit();

    const paintLabels = () => {
      for (const tex of textures) tex.needsUpdate = true;
    };
    void document.fonts.ready.then(paintLabels);

    const tick = () => {
      if (stopped) return;
      frame = requestAnimationFrame(tick);
      const t = clock.getElapsedTime();
      medals.forEach((medal, i) => {
        const base = medal.userData.baseY as number;
        medal.position.y = base + Math.sin(t * 1.15 + i) * 0.035;
        medal.rotation.y = Math.sin(t * 0.55 + i * 0.7) * 0.16;
      });
      renderer.render(scene, camera);
    };
    tick();

    return () => {
      stopped = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      scene.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(mat)) mat.forEach((item) => item.dispose());
        else mat?.dispose();
      });
      for (const tex of textures) tex.dispose();
      env.texture.dispose();
      room.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(mat)) mat.forEach((item) => item.dispose());
        else mat?.dispose();
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div className={`awards-stage awards-stage--${size}`} ref={hostRef} aria-hidden="true" />;
}
