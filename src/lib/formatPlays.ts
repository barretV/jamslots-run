/** Compact play count for cover chips (e.g. 1200 → 1.2K). */
export function formatPlays(count: number): string {
  const n = Math.max(0, Math.floor(count));
  if (n < 1000) return String(n);
  if (n < 1_000_000) {
    const k = n / 1000;
    if (k >= 100) return `${Math.floor(k)}K`;
    const rounded = k >= 10 ? Math.floor(k) : Math.round(k * 10) / 10;
    return `${rounded}K`.replace(/\.0K$/, 'K');
  }
  const m = n / 1_000_000;
  if (m >= 100) return `${Math.floor(m)}M`;
  const rounded = m >= 10 ? Math.floor(m) : Math.round(m * 10) / 10;
  return `${rounded}M`.replace(/\.0M$/, 'M');
}
