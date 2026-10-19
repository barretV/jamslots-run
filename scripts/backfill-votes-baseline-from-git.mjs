import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { utcDayKey } from './voteDailyTracking.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const baselinePath = join(root, 'src/data/votes-day-baseline.json');
const today = utcDayKey();
const cutoff = `${today}T00:00:00.000Z`;

function git(cmd) {
  return execSync(cmd, { cwd: root, encoding: 'utf8' }).trim();
}

function bundleFromCommit(sha) {
  for (const path of ['src/data/games.bundle.json', 'public/games.json']) {
    try {
      const raw = git(`git show ${sha}:${path}`);
      const data = JSON.parse(raw);
      if (Array.isArray(data.games) && data.games.length > 0) return data;
    } catch {
      /* try next path */
    }
  }
  return null;
}

let sha = '';
try {
  sha = git(
    `git log -1 --format=%H --before="${cutoff}" -- src/data/games.bundle.json public/games.json`,
  );
} catch {
  sha = '';
}

if (!sha) {
  console.error(`No games bundle commit found before ${cutoff}`);
  process.exit(1);
}

const bundle = bundleFromCommit(sha);
if (!bundle) {
  console.error(`Could not read games list from commit ${sha}`);
  process.exit(1);
}

const votes = {};
for (const g of bundle.games) votes[g.gameId] = g.votes ?? 0;

const baseline = { dayUtc: today, votes, backfilledFromCommit: sha };
writeFileSync(baselinePath, `${JSON.stringify(baseline)}\n`);
console.log(
  `Backfilled UTC day baseline for ${today} from ${sha} (${Object.keys(votes).length} games)`,
);
