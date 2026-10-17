import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';

const counts = new Map<string, number>();

function snapshot(): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [gameId, n] of counts) {
    if (n > 0) out[gameId] = n;
  }
  return out;
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function handleFavorites(req: IncomingMessage, res: ServerResponse): boolean {
  const path = req.url?.split('?')[0];
  if (path !== '/api/favorites') return false;

  if (req.method === 'GET') {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ counts: snapshot() }));
    return true;
  }

  if (req.method === 'POST') {
    void readBody(req)
      .then((raw) => {
        const body = JSON.parse(raw) as { gameId?: string; delta?: number };
        const gameId = typeof body.gameId === 'string' ? body.gameId.trim() : '';
        const delta = body.delta === -1 ? -1 : body.delta === 1 ? 1 : 0;
        if (!gameId || delta === 0) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'invalid_body' }));
          return;
        }
        const next = Math.max(0, (counts.get(gameId) ?? 0) + delta);
        if (next === 0) counts.delete(gameId);
        else counts.set(gameId, next);
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ gameId, count: next }));
      })
      .catch(() => {
        res.statusCode = 400;
        res.end();
      });
    return true;
  }

  res.statusCode = 405;
  res.end();
  return true;
}

/** In-memory `/api/favorites` for `vite dev` (resets on server restart). */
export function favoritesDevApiPlugin(): Plugin {
  return {
    name: 'jamslots-favorites-dev-api',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (handleFavorites(req, res)) return;
        next();
      });
    },
  };
}
