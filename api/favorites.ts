import { kv } from '@vercel/kv';

export const config = {
  runtime: 'edge',
};

const HASH_KEY = 'jamslots:favorites';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function kvReady(): boolean {
  return Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

function normalizeCounts(raw: Record<string, unknown> | null): Record<string, number> {
  const counts: Record<string, number> = {};
  if (!raw) return counts;
  for (const [gameId, value] of Object.entries(raw)) {
    const n = typeof value === 'number' ? value : Number(value);
    if (Number.isFinite(n) && n > 0) counts[gameId] = Math.floor(n);
  }
  return counts;
}

export default async function handler(request: Request): Promise<Response> {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS });
  }

  if (!kvReady()) {
    if (request.method === 'GET') {
      return Response.json({ counts: {} }, { headers: CORS });
    }
    return Response.json({ error: 'kv_unconfigured' }, { status: 503, headers: CORS });
  }

  try {
    if (request.method === 'GET') {
      const raw = await kv.hgetall<Record<string, number>>(HASH_KEY);
      return Response.json({ counts: normalizeCounts(raw) }, { headers: CORS });
    }

    if (request.method === 'POST') {
      const body = (await request.json()) as { gameId?: unknown; delta?: unknown };
      const gameId = typeof body.gameId === 'string' ? body.gameId.trim() : '';
      const delta = body.delta === -1 ? -1 : body.delta === 1 ? 1 : 0;
      if (!gameId || delta === 0) {
        return Response.json({ error: 'invalid_body' }, { status: 400, headers: CORS });
      }

      const rawNext = await kv.hincrby(HASH_KEY, gameId, delta);
      let count = Math.max(0, Math.floor(Number(rawNext) || 0));
      if (count === 0) {
        await kv.hdel(HASH_KEY, gameId);
      }
      return Response.json({ gameId, count }, { headers: CORS });
    }

    return new Response('Method Not Allowed', { status: 405, headers: CORS });
  } catch (err) {
    console.error('[api/favorites]', err);
    return Response.json({ error: 'server_error' }, { status: 500, headers: CORS });
  }
}
