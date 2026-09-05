/**
 * A tiny, timestamped log of what the player just did, so components can
 * animate a reaction without the game state having to carry animation flags.
 *
 * `useGame` appends; components ask `recent()` and attach a class while the
 * event is fresh. Entries are pruned on the next sync, never by a timer.
 */
export type UiEvent =
  | { kind: 'roll' }
  | { kind: 'buy'; hid: string; benchIndex: number }
  | {
      kind: 'merge';
      u: string;
      star: 2 | 3;
      where: 'board' | 'bench';
      r?: number;
      c?: number;
      index?: number;
    }
  | { kind: 'place'; u: string }
  | { kind: 'sell'; benchIndex: number | null; gold: number }
  | { kind: 'gold'; from: number; to: number }
  | { kind: 'synergy'; name: string; lvl: number }
  | { kind: 'blocked'; reason: 'gold' | 'bench'; index: number }
  | { kind: 'fight' }
  | { kind: 'bossIntro'; name: string; kit: string };

export interface StampedUiEvent {
  e: UiEvent;
  t: number;
  k: string;
}

/** Anything older than this is dropped on the next sync. */
export const UI_EVENT_TTL_MS = 1500;

let seq = 0;

export function stamp(e: UiEvent, now = Date.now()): StampedUiEvent {
  return { e, t: now, k: `ui${++seq}` };
}

export function pruneUiEvents(list: StampedUiEvent[], now = Date.now()): StampedUiEvent[] {
  const kept = list.filter((x) => now - x.t < UI_EVENT_TTL_MS);
  return kept.length === list.length ? list : kept;
}

/** The freshest matching event, or undefined once it has aged out. */
export function recent<K extends UiEvent['kind']>(
  list: StampedUiEvent[],
  kind: K,
  match?: (e: Extract<UiEvent, { kind: K }>) => boolean,
  maxAgeMs = UI_EVENT_TTL_MS,
  now = Date.now(),
): Extract<UiEvent, { kind: K }> | undefined {
  for (let i = list.length - 1; i >= 0; i--) {
    const x = list[i];
    if (x.e.kind !== kind) continue;
    if (now - x.t > maxAgeMs) continue;
    const e = x.e as Extract<UiEvent, { kind: K }>;
    if (!match || match(e)) return e;
  }
  return undefined;
}

export function hasRecent(
  list: StampedUiEvent[],
  kind: UiEvent['kind'],
  maxAgeMs = UI_EVENT_TTL_MS,
  now = Date.now(),
): boolean {
  return recent(list, kind, undefined, maxAgeMs, now) !== undefined;
}
