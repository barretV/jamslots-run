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

Counts live in Redis hash `jamslots:favorites` (`HINCRBY` / `HGETALL`).

## UI

- **★ count** chip on reel covers and library posters (like the plays chip).
- Library sort: **Most favorited** / **Least favorited**.

If KV is not configured, GET returns `{}` and starring still works locally only.

## Local dev

`npm run dev` serves an in-memory mock at `/api/favorites` (counts reset when you restart Vite).

For production parity, use `vercel dev` with KV linked to the project.
