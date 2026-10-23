import { describe, expect, it } from 'vitest';
import { DEFAULT_DRAFT, MIN_DRAFT_TWO_COSTS, USER_DRAFT_MAX } from '../src/data/constants';
import { HERO_MAP, HEROES } from '../src/data/heroes';
import { draftTwoCosts, isDraftLegal, randomDraft } from '../src/game/draft';
import { createGame } from '../src/game/engine';
import { seeded } from '../src/game/rng';
import { runMatch } from '../src/sim/runMatch';

describe('draft rule', () => {
  it('every generated draft is legal across a seeded sweep', () => {
    const starters = ['anans', 'bunyi', 'anzuu', 'thund', 'kitsu', 'taniw', 'jorm', 'ifrit'];
    for (const ids of [HEROES.map((h) => h.id), starters]) {
      for (let seed = 1; seed <= 50; seed++) {
        const rng = seeded(seed);
        for (let i = 0; i < 40; i++) {
          const draft = randomDraft(rng, ids);
          expect(draft).toHaveLength(USER_DRAFT_MAX);
          expect(new Set(draft).size).toBe(USER_DRAFT_MAX);
          expect(draft.every((id) => ids.includes(id))).toBe(true);
          expect(draft.filter((id) => HERO_MAP[id].cost === 2).length).toBeGreaterThanOrEqual(MIN_DRAFT_TWO_COSTS);
          expect(isDraftLegal(draft)).toBe(true);
        }
      }
    }
  });

  it('rejects drafts with fewer than two 2-costs, and wrong sizes', () => {
    expect(isDraftLegal(['anans', 'bunyi', 'thund', 'kitsu', 'jorm', 'quetz'])).toBe(true);
    expect(isDraftLegal(['anans', 'thund', 'kitsu', 'taniw', 'jorm', 'quetz'])).toBe(false);
    expect(isDraftLegal(['thund', 'kitsu', 'taniw', 'jorm', 'ifrit', 'quetz'])).toBe(false);
    expect(isDraftLegal(['anans', 'bunyi', 'thund', 'kitsu', 'jorm'])).toBe(false);
    expect(isDraftLegal(['anans', 'anans', 'thund', 'kitsu', 'jorm', 'quetz'])).toBe(false);
  });

  it('pre-rule drafts with 0 or 1 two-costs still load and play', () => {
    const legacy = [DEFAULT_DRAFT, ['thund', 'kitsu', 'taniw', 'jorm', 'ifrit', 'quetz']];
    expect(legacy.map(draftTwoCosts)).toEqual([1, 0]);
    for (const draft of legacy) {
      expect(isDraftLegal(draft)).toBe(false);
      expect(() => createGame('bot', { draft })).not.toThrow();
      const match = runMatch({ mode: 'bot', difficulty: 'normal', policy: 'decent', draft, seed: 3 });
      expect(match.rounds.length).toBeGreaterThan(0);
    }
  });
});
