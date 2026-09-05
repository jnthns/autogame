/**
 * UI timings. These are presentation, not gameplay: they never reach the
 * engine's clock, and they live here rather than in `constants.ts` so a balance
 * phase and a design phase never touch the same file for the same reason.
 */

/** "FIGHT" stamp before the engine's timer starts. */
export const FIGHT_INTRO_MS = 400;
/** Boss name card, on boss rounds only, ahead of the FIGHT stamp. */
export const BOSS_INTRO_MS = 900;
/** Beat between the last tick of combat and resolving the round. */
export const RESULT_DELAY_MS = 500;
/** How long the losing HP bar drains before the result modal appears. */
export const BAR_DRAIN_MS = 360;
/** Stagger between relic and unlock cards dealing into the modal. */
export const CARD_DEAL_STAGGER_MS = 60;
