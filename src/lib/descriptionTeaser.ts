const DEFAULT_MAX = 140;

/** One-line teaser for tooltips (not the full description modal). */
export function descriptionTeaser(description: string, maxLen = DEFAULT_MAX): string {
  const trimmed = description.trim().replace(/\s+/g, ' ');
  if (!trimmed) return '';
  if (trimmed.length <= maxLen) return trimmed;

  const slice = trimmed.slice(0, maxLen);
  const lastSpace = slice.lastIndexOf(' ');
  const cut = lastSpace > 80 ? slice.slice(0, lastSpace) : slice.trimEnd();
  return `${cut}…`;
}
