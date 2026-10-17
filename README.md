**Live app:** https://jamslots-run.vercel.app

October Jam slot picker for [RUN.world](https://run.world) games. Spin the reels to pick a random jam entry; favorites and played history stay in your browser (`localStorage`). **Community favorite counts** (★ on posters) use Vercel KV in production; see [docs/FAVORITE_COUNTS.md](docs/FAVORITE_COUNTS.md).

## Local dev

```bash
npm install
npm run dev
```

Open **http://localhost:5290** (port 5290).

Refresh the bundled game list from RUN's API:

```bash
npm run sync-games
```

The live game list auto-updates via a GitHub Action every 6 hours (and on manual workflow dispatch).

## Deploy

Production is on [Vercel](https://vercel.com). Pushes to the `main` branch on GitHub auto-deploy.

Build locally: `npm run build` (output in `dist`).
