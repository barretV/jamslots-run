import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/** UTC calendar day `YYYY-MM-DD`. */
export function utcDayKey(ts = Date.now()) {
  return new Date(ts).toISOString().slice(0, 10);
}

function readJson(path, fallback) {
  if (!existsSync(path)) return fallback;
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return fallback;
  }
}

/**
 * @param {string} root repo root
 * @param {{ gameId: string, votes: number }[]} games from API
 * @param {Record<string, number>} [prevTotals] vote totals from previous bundle (before overwrite)
 */
export function applyVoteDailyTracking(root, games, prevTotals = {}) {
  const baselinePath = join(root, 'src/data/votes-day-baseline.json');
  const historyPath = join(root, 'src/data/vote-sync-history.json');
  const today = utcDayKey();
  const syncedAt = Date.now();

  let baseline = readJson(baselinePath, null);
  const baselineVotes =
    baseline && typeof baseline === 'object' && baseline.votes && typeof baseline.votes === 'object'
      ? baseline.votes
      : null;
  const needsSeed = !baselineVotes || Object.keys(baselineVotes).length === 0;

  if (needsSeed) {
    const votes = {};
    for (const g of games) votes[g.gameId] = g.votes ?? 0;
    baseline = { dayUtc: today, votes };
  } else if (baseline.dayUtc !== today) {
    const votes = { ...prevTotals };
    for (const g of games) {
      if (!(g.gameId in votes)) votes[g.gameId] = g.votes ?? 0;
    }
    baseline = { dayUtc: today, votes };
  }

  for (const g of games) {
    const base = baseline.votes[g.gameId] ?? 0;
    g.votesToday = Math.max(0, (g.votes ?? 0) - base);
  }

  writeFileSync(baselinePath, `${JSON.stringify(baseline)}\n`);

  const totals = {};
  for (const g of games) totals[g.gameId] = g.votes ?? 0;

  const history = readJson(historyPath, { snapshots: [] });
  const snapshots = Array.isArray(history.snapshots) ? history.snapshots : [];
  const last = snapshots[snapshots.length - 1];
  const totalsJson = JSON.stringify(totals);
  const changed = !last || JSON.stringify(last.totals) !== totalsJson;
  if (changed) {
    snapshots.push({ syncedAt, dayUtc: today, totals });
    const maxSnapshots = 240;
    while (snapshots.length > maxSnapshots) snapshots.shift();
    writeFileSync(historyPath, `${JSON.stringify({ snapshots })}\n`);
  }

  return { votesDayUtc: today, syncedAt, historyChanged: changed };
}
