import { MIN_DRAFT_TWO_COSTS, USER_DRAFT_MAX } from '../data/constants';
import { HERO_MAP, HEROES } from '../data/heroes';
import type { Rng } from './rng';

export function draftTwoCosts(draft: readonly string[]): number {
  return draft.filter((id) => HERO_MAP[id]?.cost === 2).length;
}

/** A full draft of distinct known heroes with at least MIN_DRAFT_TWO_COSTS 2-costs. */
export function isDraftLegal(draft: readonly string[]): boolean {
  return (
    draft.length === USER_DRAFT_MAX &&
    new Set(draft).size === draft.length &&
    draft.every((id) => id in HERO_MAP) &&
    draftTwoCosts(draft) >= MIN_DRAFT_TWO_COSTS
  );
}

/**
 * The draft to resume from a saved value: its unlocked ids, or `fallback` when
 * nothing usable is left. A full saved draft that breaks the 2-cost rule (saved
 * before the rule existed) is replaced, never resumed.
 */
export function restoreDraft(saved: unknown, unlocked: readonly string[], fallback: readonly string[]): string[] {
  const allow = new Set(unlocked);
  const fresh = fallback.filter((id) => allow.has(id)).slice(0, USER_DRAFT_MAX);
  if (!Array.isArray(saved)) return fresh;
  const kept = saved
    .filter((id: unknown): id is string => typeof id === 'string' && allow.has(id))
    .slice(0, USER_DRAFT_MAX);
  return kept.length && (kept.length < USER_DRAFT_MAX || isDraftLegal(kept)) ? kept : fresh;
}

/**
 * Uniform over legal drafts drawn from `ids`. If `ids` cannot form a legal
 * draft (too few heroes or 2-costs), returns an unconstrained draft instead.
 */
export function randomDraft(rng: Rng, ids: readonly string[] = HEROES.map((h) => h.id)): string[] {
  const satisfiable = ids.length >= USER_DRAFT_MAX && draftTwoCosts(ids) >= MIN_DRAFT_TWO_COSTS;
  for (;;) {
    const pool = ids.slice();
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const draft = pool.slice(0, USER_DRAFT_MAX);
    if (!satisfiable || isDraftLegal(draft)) return draft;
  }
}
