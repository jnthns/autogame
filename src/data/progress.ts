import { HEROES, HERO_MAP } from './heroes';
import { TRAITS, type TraitName } from './traits';

export const PROGRESS_STORAGE_KEY = 'om_progress';

export interface ProgressState {
  wins: number;
  botMatches: number;
  traitWins: Partial<Record<TraitName, number>>;
}

export type UnlockReq =
  | { kind: 'wins'; n: number }
  | { kind: 'trait'; trait: TraitName; n: number };

export const EMPTY_PROGRESS: ProgressState = { wins: 0, botMatches: 0, traitWins: {} };

/** Locked roster. Starter heroes have no entry and are always unbound. */
export const HERO_UNLOCKS: Record<string, UnlockReq> = {
  kelpi: { kind: 'wins', n: 1 },
  barng: { kind: 'wins', n: 2 },
  coyot: { kind: 'trait', trait: 'Trickster', n: 2 },
  griff: { kind: 'wins', n: 3 },
  golem: { kind: 'trait', trait: 'Guardian', n: 2 },
  bansh: { kind: 'wins', n: 4 },
  hydra: { kind: 'trait', trait: 'Serpent', n: 3 },
  nuwa: { kind: 'wins', n: 5 },
  camaz: { kind: 'trait', trait: 'Infernal', n: 3 },
  simur: { kind: 'trait', trait: 'Sky', n: 3 },
  levia: { kind: 'wins', n: 8 },
  wendi: { kind: 'trait', trait: 'Colossal', n: 3 },
};

export function loadProgress(): ProgressState {
  try {
    const s = localStorage.getItem(PROGRESS_STORAGE_KEY);
    if (!s) return { ...EMPTY_PROGRESS };
    const d = JSON.parse(s) as Partial<ProgressState>;
    const wins = typeof d.wins === 'number' && d.wins >= 0 ? d.wins : 0;
    const botMatches =
      typeof d.botMatches === 'number' && d.botMatches >= 0 ? d.botMatches : wins;
    return {
      wins,
      botMatches,
      traitWins: d.traitWins && typeof d.traitWins === 'object' ? d.traitWins : {},
    };
  } catch {
    return { ...EMPTY_PROGRESS };
  }
}

export function saveProgress(p: ProgressState): void {
  try {
    localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(p));
  } catch {
    /* ignore */
  }
}

export function unlockReq(id: string): UnlockReq | null {
  return HERO_UNLOCKS[id] ?? null;
}

export function heroUnlocked(id: string, p: ProgressState): boolean {
  const req = HERO_UNLOCKS[id];
  if (!req) return true;
  return unlockCurrent(req, p) >= req.n;
}

export function unlockCurrent(req: UnlockReq, p: ProgressState): number {
  if (req.kind === 'wins') return p.wins;
  return p.traitWins[req.trait] ?? 0;
}

export function unlockLabel(req: UnlockReq): string {
  if (req.kind === 'wins') return req.n === 1 ? 'Win 1 bot match' : `Win ${req.n} bot matches`;
  const syn = req.trait.toUpperCase();
  return req.n === 1
    ? `Win 1 bot match with ${syn} active`
    : `Win ${req.n} bot matches with ${syn} active`;
}

export function unlockedHeroIds(p: ProgressState): string[] {
  return HEROES.filter((h) => heroUnlocked(h.id, p)).map((h) => h.id);
}

export function activeSynergies(heroIds: string[]): TraitName[] {
  const c: Record<string, number> = {};
  heroIds.forEach((id) => {
    const h = HERO_MAP[id];
    if (!h) return;
    h.traits.forEach((t) => {
      c[t] = (c[t] || 0) + 1;
    });
  });
  return (Object.keys(c) as TraitName[]).filter((name) =>
    TRAITS[name].tiers.some(([need]) => c[name] >= need),
  );
}

export function applyMatchWin(
  p: ProgressState,
  boardIds: string[],
): { next: ProgressState; newlyUnlocked: string[] } {
  const before = new Set(unlockedHeroIds(p));
  const next: ProgressState = {
    wins: p.wins + 1,
    botMatches: p.botMatches,
    traitWins: { ...p.traitWins },
  };
  activeSynergies(boardIds).forEach((trait) => {
    next.traitWins[trait] = (next.traitWins[trait] ?? 0) + 1;
  });
  const newlyUnlocked = HEROES.filter((h) => !before.has(h.id) && heroUnlocked(h.id, next)).map(
    (h) => h.id,
  );
  return { next, newlyUnlocked };
}
