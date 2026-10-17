**Live app:** https://jamslots-run.vercel.app

October Jam slot picker for [RUN.world](https://run.world) games. Spin the reels to pick a random jam entry; favorites and played history stay in your browser (`localStorage`).

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

## Deploy

Production is on [Vercel](https://vercel.com). Pushes to the `main` branch on GitHub auto-deploy.

Build locally: `npm run build` (output in `dist`).
