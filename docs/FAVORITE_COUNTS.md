# Global favorite counts

JamSlots keeps **your** favorites in `localStorage`. **Community favorite counts** are stored in Vercel KV (Redis) and exposed at `/api/favorites`.

## Production (Vercel)

1. Open the jamslots-run project on [Vercel](https://vercel.com).
2. **Storage** → create or link **KV** (Upstash Redis).
3. Connect the store to the project. Vercel injects `KV_REST_API_URL` and `KV_REST_API_TOKEN`.
4. Redeploy `main`.

No extra env vars are required when KV is linked.

## API

- **GET `/api/favorites`** → `{ counts: { [gameId]: number } }`
- **POST `/api/favorites`** → body `{ gameId, delta: 1 | -1 }` (star adds 1, unstar subtracts 1)

## Share links (short URLs)

- **POST `/api/share-favorites`** → body `{ gameIds: string[] }` → `{ code, gameIds }` (stored in the same KV, ~1 year TTL)
- **GET `/api/share-favorites?code=…`** → `{ code, gameIds }`
- Copied links use `?f=<code>` (8 characters). Long `?favs=id1,id2` still works as a fallback when KV is unavailable.

## Discord / social embeds

- Default Open Graph tags live in `index.html` (site preview + `/api/og-image`).
- Share links (`?f=` or `?favs=`): Vercel **middleware** serves crawlers (Discord, Twitter, etc.) an HTML page from `/api/social-preview` with title, description (game names when possible), and a dynamic OG image showing the favorite count.

Counts live in Redis hash `jamslots:favorites` (`HINCRBY` / `HGETALL`).

## UI

- **★ count** chip on reel covers and library posters (like the plays chip).
- Library sort: **Most favorited** / **Least favorited**.

If KV is not configured, GET returns `{}` and starring still works locally only.

## Local dev

`npm run dev` serves an in-memory mock at `/api/favorites` (counts reset when you restart Vite).

For production parity, use `vercel dev` with KV linked to the project.
