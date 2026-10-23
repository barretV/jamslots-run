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

  const dailyPath = join(root, 'src/data/vote-daily-history.json');
  const dailyPublic = join(root, 'public/vote-daily-history.json');
  const daily = buildDailyHistoryFromSnapshots(snapshots);
  daily.updatedAt = syncedAt;
  const dailyJson = `${JSON.stringify(daily)}\n`;
  writeFileSync(dailyPath, dailyJson);
  writeFileSync(dailyPublic, dailyJson);

  return { votesDayUtc: today, syncedAt, historyChanged: changed };
}

/** Last totals per UTC day, then day-over-day deltas per game (for charts). */
export function buildDailyHistoryFromSnapshots(snapshots) {
  if (!Array.isArray(snapshots) || snapshots.length === 0) {
    return { daysUtc: [], games: {} };
  }
  const byDay = new Map();
  for (const s of snapshots) {
    if (!s?.dayUtc || !s.totals) continue;
    byDay.set(s.dayUtc, s.totals);
  }
  const daysUtc = [...byDay.keys()].sort();
  if (daysUtc.length === 0) return { daysUtc: [], games: {} };

  const allIds = new Set();
  for (const totals of byDay.values()) {
    for (const id of Object.keys(totals)) allIds.add(id);
  }

  const games = {};
  const gameTotals = {};
  for (const gameId of allIds) {
    const values = [];
    const totals = [];
    let prevTotal = 0;
    for (const day of daysUtc) {
      const total = Number(byDay.get(day)[gameId] ?? prevTotal);
      totals.push(total);
      values.push(Math.max(0, total - prevTotal));
      prevTotal = total;
    }
    if (values.some((v) => v > 0)) {
      games[gameId] = values;
      gameTotals[gameId] = totals;
    }
  }

  return { daysUtc, games, gameTotals };
}
