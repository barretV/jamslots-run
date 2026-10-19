import { kv } from '@vercel/kv';

export const config = {
  runtime: 'edge',
};

const KEY_PREFIX = 'jamslots:share:';
const MAX_IDS = 200;
const MAX_ID_LEN = 64;
const CODE_LEN = 8;
const TTL_SECONDS = 60 * 60 * 24 * 365;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function kvReady(): boolean {
  const kvRest = Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
  const upstash = Boolean(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN,
  );
  return kvRest || upstash;
}

function normalizeIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (typeof item !== 'string') continue;
    const id = item.trim();
    if (!id || id.length > MAX_ID_LEN || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
    if (out.length >= MAX_IDS) break;
  }
  return out;
}

function randomCode(): string {
  const alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const bytes = new Uint8Array(CODE_LEN);
  crypto.getRandomValues(bytes);
  let out = '';
  for (let i = 0; i < CODE_LEN; i++) {
    out += alphabet[bytes[i]! % alphabet.length];
  }
  return out;
}

function isValidCode(code: string): boolean {
  return /^[a-zA-Z0-9]{6,12}$/.test(code);
}

export default async function handler(request: Request): Promise<Response> {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS });
  }

  if (!kvReady()) {
    return Response.json({ error: 'kv_unconfigured' }, { status: 503, headers: CORS });
  }

  try {
    if (request.method === 'GET') {
      const url = new URL(request.url);
      const code = (url.searchParams.get('code') ?? '').trim();
      if (!isValidCode(code)) {
        return Response.json({ error: 'invalid_code' }, { status: 400, headers: CORS });
      }
      const raw = await kv.get<string>(KEY_PREFIX + code);
      if (!raw) {
        return Response.json({ error: 'not_found' }, { status: 404, headers: CORS });
      }
      let gameIds: string[] = [];
      try {
        const parsed = JSON.parse(raw) as unknown;
        gameIds = normalizeIds(parsed);
      } catch {
        return Response.json({ error: 'corrupt' }, { status: 500, headers: CORS });
      }
      if (gameIds.length === 0) {
        return Response.json({ error: 'not_found' }, { status: 404, headers: CORS });
      }
      return Response.json({ code, gameIds }, { headers: CORS });
    }

    if (request.method === 'POST') {
      const body = (await request.json()) as { gameIds?: unknown };
      const gameIds = normalizeIds(body.gameIds);
      if (gameIds.length === 0) {
        return Response.json({ error: 'invalid_body' }, { status: 400, headers: CORS });
      }

      for (let attempt = 0; attempt < 5; attempt++) {
        const code = randomCode();
        const key = KEY_PREFIX + code;
        const existing = await kv.get(key);
        if (existing != null) continue;
        await kv.set(key, JSON.stringify(gameIds), { ex: TTL_SECONDS });
        return Response.json({ code, gameIds }, { headers: CORS });
      }

      return Response.json({ error: 'code_collision' }, { status: 503, headers: CORS });
    }

    return new Response('Method Not Allowed', { status: 405, headers: CORS });
  } catch (err) {
    console.error('[api/share-favorites]', err);
    return Response.json({ error: 'server_error' }, { status: 500, headers: CORS });
  }
}
