/**
 * Monster Mash Honorable Mentions, in the order of the "Monster Mash Honorable
 * Mentions" row on run.world/catalog (catalog tag `monmashhm`, ordered by `sortOrder`).
 * The city ceremony plays them as a fast pass after the prize winners, five per wave.
 */
export interface HonorableMention {
  title: string;
  gameId: string;
  creatorName: string;
}

/** Honorable mentions are shown in waves of this size. */
export const HONOR_WAVE_SIZE = 5;

export const HONORABLE_MENTIONS: readonly HonorableMention[] = [
  { title: "THE HOLLOW", gameId: "5KZ4nZJBK8bI6qMKzqtj", creatorName: "kondwamimfune" },
  { title: "Night of Spiders", gameId: "oDTwHCE6KzBgrAUlSByy", creatorName: "JollyGhost505" },
  { title: "Graveyard Groove", gameId: "cvzqspBF7CwNOxJmJXhT", creatorName: "PixelSmith" },
  { title: "Hatch & Mash", gameId: "srML5Xy8pkUb2ioehMnx", creatorName: "KindaMADStudios" },
  { title: "Monster Mash", gameId: "BFuA4u3znCw6B2n4ELT6", creatorName: "DamRyeong" },
  { title: "CHIMERUNE", gameId: "N2DUnydkVOWMqeUENdS8", creatorName: "Coshus" },
  { title: "Lord of The Ooze", gameId: "MaoCSrNV1SFxFqF0prmq", creatorName: "Xelryk" },
  { title: "DMN HELLBIND", gameId: "vqpmLl39ZIhvZSTqMVwr", creatorName: "tyrileytattoos" },
  { title: "Monsters of Myth", gameId: "y2CLCEq2zVhvRxSrYZOD", creatorName: "ChopJohn" },
  { title: "Rampage: Hell on Wheels", gameId: "AwuzZZrHxFb4T1PkSLia", creatorName: "SilverBolt106" },
  { title: "Flesh & Stitch", gameId: "GxA3slSOMWSUr1yxCqOH", creatorName: "sariguldev" },
  { title: "Last Call at the Monster Mash", gameId: "2SxY7SO5KVvs49ekw19K", creatorName: "Shiiii" },
  { title: "Pull of the Dead", gameId: "vdWDZapLjqwJbKcMbKQe", creatorName: "Paultheaweso" },
  { title: "Machine Gun Vampire", gameId: "vOHAxlj6jY8lEv1VwrdC", creatorName: "Pixelfox" },
  { title: "Yokai Tamer (YOKAIROGUE UPDATE)", gameId: "wK8MUA1b5rVOFBhZpf4d", creatorName: "imcharliesparks" },
  { title: "Remnants: A Monster’s Mourning", gameId: "Kc0TRoHpgdhZuHbvWRDr", creatorName: "PuneetMakes" },
  { title: "Medusa's Masterpieces", gameId: "ozRJolSHTA1UU6PPxKpf", creatorName: "RampagingRams" },
  { title: "Zombie #8", gameId: "rAn0rzG4hwwTf54IvP0y", creatorName: "F12Crowd" },
  { title: "Hordes Of The Hollow", gameId: "qDzsM6rhCQRiESWBZXuE", creatorName: "ScottCUK" },
  { title: "Hollow Eyes", gameId: "aeNZ4dIamckuZKXcjgPT", creatorName: "OjaskaraStudio" },
  { title: "The Third Direction", gameId: "B5e49Zdq28lXReFSBKl6", creatorName: "gautamjain" },
  { title: "Trick or Treat - Maple Falls", gameId: "AFjPSjQH9kbcCl57sgO3", creatorName: "MaplePhoenix" },
  { title: "Monster Attack", gameId: "YdBm8kKnvoKUWXa5eLP0", creatorName: "TBrewerton" },
  { title: "ANASTOMOSIS", gameId: "IGxEgfpqd6Jt7QkIci0a", creatorName: "HyperDash861" },
  { title: "Monster Masquerade", gameId: "5MPCB2cnt2AQ6J4Pwsmu", creatorName: "PoweredUp" },
];
