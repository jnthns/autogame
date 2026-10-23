import { describe, expect, it } from 'vitest';
import { HERO_MAP } from '../src/data/heroes';
import { runMatch } from '../src/sim/runMatch';

describe('simulation records', () => {
  it('records each hero the first time it reaches 3★', () => {
    const match = runMatch({ mode: 'bot', difficulty: 'normal', policy: 'decent', seed: 1 });

    expect(match.threeStars.length).toBeGreaterThan(0);
    expect(match.threeStarRound).toBe(match.threeStars[0].round);
    expect(new Set(match.threeStars.map((star) => star.hid)).size).toBe(match.threeStars.length);
    match.threeStars.forEach((star) => {
      expect(star.cost).toBe(HERO_MAP[star.hid].cost);
      expect(star.round).toBeGreaterThanOrEqual(match.threeStarRound!);
    });
  });
});
