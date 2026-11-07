import type { JamGame } from '../types';

export type WinnerSection = 'editors' | 'special' | 'votes' | 'story';

/** Ribbon used on the city. Ranked metals beat a special category on the same game. */
export type PrizeMetal = 'gold' | 'silver' | 'bronze' | 'place' | 'special';

/** Special categories are told apart by their own medal on the podium. */
export type SpecialKind = 'sticky' | 'money' | 'social' | 'theme';

export interface OctoberPrize {
  id: string;
  section: WinnerSection;
  /** 1-based place inside a ranked section. Omitted for special categories. */
  place?: number;
  metal: PrizeMetal;
  category: string;
  specialKind?: SpecialKind;
  title: string;
  amount: number;
  /** Story/video winners are not jam games, so their art comes from the jam feed. */
  thumbnailUrl?: string;
  creatorName?: string;
  /** Story/video entries live on run.world rather than as playable jam games. */
  linkUrl?: string;
}

export const OCTOBER_SECTIONS: { id: WinnerSection; heading: string }[] = [
  { id: 'editors', heading: "Game Editor's Picks" },
  { id: 'special', heading: 'Special Categories' },
  { id: 'votes', heading: 'Game Votes' },
  { id: 'story', heading: 'Story and Video Votes' },
];

export const OCTOBER_PRIZES: OctoberPrize[] = [
  {
    id: 'editors-1',
    section: 'editors',
    place: 1,
    metal: 'gold',
    category: "Editor's Pick",
    title: 'MONSTER CONGA! [NEW UPDATE!]',
    amount: 15000,
  },
  {
    id: 'editors-2',
    section: 'editors',
    place: 2,
    metal: 'silver',
    category: "Editor's Pick",
    title: 'The Humans Are Coming',
    amount: 3000,
  },
  {
    id: 'editors-3',
    section: 'editors',
    place: 3,
    metal: 'bronze',
    category: "Editor's Pick",
    title: 'Mawborn',
    amount: 2000,
  },
  {
    id: 'editors-4',
    section: 'editors',
    place: 4,
    metal: 'place',
    category: "Editor's Pick",
    title: 'Tap Tap Terror',
    amount: 1200,
  },
  {
    id: 'editors-5',
    section: 'editors',
    place: 5,
    metal: 'place',
    category: "Editor's Pick",
    title: 'Grayford: Undead Open World Hustle',
    amount: 800,
  },
  {
    id: 'special-sticky',
    section: 'special',
    metal: 'special',
    category: 'Most Sticky',
    specialKind: 'sticky',
    title: 'Night of Spiders',
    amount: 500,
  },
  {
    id: 'special-money',
    section: 'special',
    metal: 'special',
    category: 'Best Monetization',
    specialKind: 'money',
    title: 'MONSTER CONGA! [NEW UPDATE!]',
    amount: 500,
  },
  {
    id: 'special-social',
    section: 'special',
    metal: 'special',
    category: 'Best Social Features',
    specialKind: 'social',
    title: 'FRAGTOWN: Holloween Event',
    amount: 500,
  },
  {
    id: 'special-theme',
    section: 'special',
    metal: 'special',
    category: 'Best Use of Theme',
    specialKind: 'theme',
    title: 'Not on the List: Mash Crasher',
    amount: 500,
  },
  {
    id: 'votes-1',
    section: 'votes',
    place: 1,
    metal: 'gold',
    category: 'Game Votes',
    title: 'GULP',
    amount: 2000,
  },
  {
    id: 'votes-2',
    section: 'votes',
    place: 2,
    metal: 'silver',
    category: 'Game Votes',
    title: 'Tag Team Terror',
    amount: 1200,
  },
  {
    id: 'votes-3',
    section: 'votes',
    place: 3,
    metal: 'bronze',
    category: 'Game Votes',
    title: 'HollowHeart',
    amount: 800,
  },
  {
    id: 'story-1',
    section: 'story',
    place: 1,
    metal: 'gold',
    category: 'Story and Video',
    title: 'The Spirit of the Dying Lake',
    amount: 1000,
    creatorName: 'SuperNinja745',
    linkUrl: 'https://run.world/SuperNinja745/the-spirit-of-the-dying-lake',
    thumbnailUrl:
      'https://res.cloudinary.com/venusseriesai/image/upload/v1792688703/run-tv/content/image/ugc/Q2UzeMUsXIPNom1Byga7eXt7iSW2_the-spirit-of-the-dying-lake_thumb.png',
  },
  {
    id: 'story-2',
    section: 'story',
    place: 2,
    metal: 'silver',
    category: 'Story and Video',
    title: 'When the Darkness Watches',
    amount: 600,
    creatorName: 'phoenix09',
    linkUrl: 'https://run.world/phoenix09/the-silence-before-the-scream',
    thumbnailUrl:
      'https://res.cloudinary.com/venusseriesai/image/upload/v1792772996/run-tv/content/image/ugc/VlNQOjryDOP7ZzKbmgBCCRcLaL73_the-silence-before-the-scream_thumb.png',
  },
  {
    id: 'story-3',
    section: 'story',
    place: 3,
    metal: 'bronze',
    category: 'Story and Video',
    title: 'ASTRA: The Last Monster Hunter',
    amount: 400,
    creatorName: 'IonicStork411',
    linkUrl: 'https://run.world/IonicStork411/astra-the-last-monster-hunter-2',
    thumbnailUrl:
      'https://res.cloudinary.com/venusseriesai/image/upload/v1793001233/run-tv/content/image/ugc/Aoom45HapqPHmeGxT2NK7KXBjJ82_astra-the-last-monster-hunter-2_thumb.png',
  },
];

/** Cutscene order matches the winners page. Story prizes are not games. */
export const TOUR_PRIZE_IDS: readonly string[] = [
  'editors-1',
  'editors-2',
  'editors-3',
  'editors-4',
  'editors-5',
  'special-sticky',
  'special-money',
  'special-social',
  'special-theme',
  'votes-1',
  'votes-2',
  'votes-3',
];

export const RIBBON_COLOR: Record<PrizeMetal, string> = {
  gold: '#ffd76a',
  silver: '#e7eef8',
  bronze: '#e08a4f',
  place: '#67e8f9',
  special: '#e879f9',
};

const METAL_RANK: Record<PrizeMetal, number> = {
  gold: 5,
  silver: 4,
  bronze: 3,
  place: 2,
  special: 1,
};

export function normalizeWinnerTitle(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

/** Case-insensitive title match. FRAGTOWN falls back to the closest Halloween title. */
export function matchWinnerGame(title: string, games: JamGame[]): JamGame | null {
  const want = normalizeWinnerTitle(title);
  if (!want) return null;
  const exact = games.find((g) => normalizeWinnerTitle(g.title) === want);
  if (exact) return exact;
  if (want.includes('fragtown')) {
    const hits = games.filter((g) => normalizeWinnerTitle(g.title).includes('fragtown'));
    const themed = hits.find((g) => /halloween|holloween/.test(normalizeWinnerTitle(g.title)));
    return themed ?? hits[0] ?? null;
  }
  return null;
}

export interface ResolvedPrize {
  prize: OctoberPrize;
  game: JamGame | null;
}

export function resolveOctoberPrizes(games: JamGame[]): ResolvedPrize[] {
  return OCTOBER_PRIZES.map((prize) => ({
    prize,
    game: matchWinnerGame(prize.title, games),
  }));
}

/** Best city ribbon per game. Gold from any ranked list beats a special-only prize. */
export function ribbonByGameId(games: JamGame[]): Map<string, PrizeMetal> {
  const map = new Map<string, PrizeMetal>();
  for (const { prize, game } of resolveOctoberPrizes(games)) {
    if (!game) continue;
    const prev = map.get(game.gameId);
    if (!prev || METAL_RANK[prize.metal] > METAL_RANK[prev]) map.set(game.gameId, prize.metal);
  }
  return map;
}

export function formatPrizeMoney(amount: number): string {
  return `$${amount.toLocaleString('en-US')}`;
}

export function unmatchedWinnerTitles(games: JamGame[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const { prize, game } of resolveOctoberPrizes(games)) {
    if (game || seen.has(prize.title)) continue;
    seen.add(prize.title);
    out.push(prize.title);
  }
  return out;
}
