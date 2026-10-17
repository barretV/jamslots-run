# October Jam Game Picker

Standalone helper app (not the BloomOff game at repo root). Slot-style random game picker for [October Jam on RUN.world](https://run.world/jams/octoberjam).

```bash
cd gamepicker   # from repo root
npm install
npm run dev
```

Dev server: **http://localhost:5290** (port 5290 so it does not clash with the main game on 5173).

Refresh the game list from RUN's API (build-time / CI):

```bash
npm run sync-games
```

## Deploy (shareable link)

The app is static files in `dist` after `npm run build`. Favorites and played history stay in **each visitor's browser** (`localStorage`), not on the server.

**Branch:** deploy from `cursor/gamepicker-mvp-153b` (or merge it into `main` first).

### Vercel (recommended, free)

1. Sign in at [vercel.com](https://vercel.com) and **Add New Project** from GitHub repo `barretV/BloomOff`.
2. Set **Root Directory** to `gamepicker` (Edit next to the repo name).
3. Leave build as **Vite** / `npm run build`, output **dist** (`vercel.json` in this folder sets this).
4. Deploy. Copy the `*.vercel.app` URL and share it.

CLI (from repo root): `cd gamepicker && npx vercel --prod`

### Netlify (free)

1. [app.netlify.com](https://app.netlify.com) → **Add new site** → **Import from Git** → `barretV/BloomOff`.
2. **Base directory:** `gamepicker`
3. Build: `npm run build`, publish: `dist` (`netlify.toml` is already here).
4. Deploy and share the `*.netlify.app` URL.

### Refresh jam games before deploy

```bash
npm run sync-games
npm run build
```

Commit updated `src/data/games.bundle.json` if you want the live list on the site.
