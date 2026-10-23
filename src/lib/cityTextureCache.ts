import * as THREE from 'three';

const cache = new Map<string, THREE.Texture>();
const loader = new THREE.TextureLoader();
loader.setCrossOrigin('anonymous');

function cacheBustUrl(url: string): string {
  return url.includes('?') ? `${url}&jamslots=1` : `${url}?jamslots=1`;
}

function lowercasedHostUrl(url: string): string | null {
  try {
    const u = new URL(url);
    const lowered = u.hostname.toLowerCase();
    if (lowered === u.hostname) return null;
    u.hostname = lowered;
    return u.toString();
  } catch {
    return null;
  }
}

function squareCropTexture(tex: THREE.Texture): THREE.Texture {
  const img = tex.image as HTMLImageElement | undefined;
  if (!img || img.width < 2 || img.height < 2) return tex;
  const side = Math.min(img.width, img.height);
  if (side === img.width && side === img.height) {
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.generateMipmaps = false;
    return tex;
  }
  if (img.width > img.height) {
    const r = img.height / img.width;
    tex.repeat.set(r, 1);
    tex.offset.set((1 - r) / 2, 0);
  } else {
    const r = img.width / img.height;
    tex.repeat.set(1, r);
    tex.offset.set(0, (1 - r) / 2);
  }
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return tex;
}

function loadWithLoader(url: string): Promise<THREE.Texture> {
  const attempts = [url, cacheBustUrl(url), lowercasedHostUrl(url) ?? url].filter(
    (u, i, a) => a.indexOf(u) === i,
  );

  return new Promise((resolve, reject) => {
    let idx = 0;
    const tryNext = () => {
      if (idx >= attempts.length) {
        reject(new Error(`thumbnail: ${url}`));
        return;
      }
      loader.load(
        attempts[idx++],
        (tex) => {
          tex.colorSpace = THREE.SRGBColorSpace;
          resolve(squareCropTexture(tex));
        },
        undefined,
        () => tryNext(),
      );
    };
    tryNext();
  });
}

/** Crisp square poster textures for city billboards. */
export function loadGameThumbnail(url: string): Promise<THREE.Texture> {
  const trimmed = url?.trim();
  if (!trimmed) return Promise.reject(new Error('empty url'));
  const cached = cache.get(trimmed);
  if (cached) return Promise.resolve(cached);

  return loadWithLoader(trimmed).then((tex) => {
    cache.set(trimmed, tex);
    return tex;
  });
}

export function preloadCityThumbnails(urls: string[]): void {
  for (const u of urls) {
    loadGameThumbnail(u).catch(() => {});
  }
}
