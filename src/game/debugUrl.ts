/**
 * Dev-only URL overrides so `npm run screens` can jump straight to a state.
 *
 *   ?screen=home|modes|build|settings|game&mode=bot&round=8&phase=plan|combat&theme=dark
 *
 * Returns null outside a dev build so nothing reaches production behaviour.
 */
import { MATCH_DEFAULTS } from '../data/constants';
import type { GameMode, Screen } from './types';

export interface DebugUrlState {
  screen?: Screen;
  mode?: GameMode;
  round?: number;
  phase?: 'plan' | 'combat';
  theme?: 'light' | 'dark';
}

const SCREENS: Screen[] = ['home', 'modes', 'build', 'game', 'settings'];
const MODES: GameMode[] = ['practice', 'bot', 'marathon', 'gauntlet'];

function params(): URLSearchParams | null {
  if (typeof window === 'undefined') return null;
  try {
    return new URLSearchParams(window.location.search);
  } catch {
    return null;
  }
}

export function debugRoundFromUrl(): number | undefined {
  const q = params();
  if (!q) return undefined;
  const n = Number(q.get('round'));
  if (!Number.isFinite(n) || n < 1 || n > MATCH_DEFAULTS.matchRounds) return undefined;
  return Math.floor(n);
}

export function debugStateFromUrl(): DebugUrlState | null {
  if (!import.meta.env.DEV) return null;
  const q = params();
  if (!q) return null;
  const screen = q.get('screen');
  const mode = q.get('mode');
  const phase = q.get('phase');
  const theme = q.get('theme');
  const state: DebugUrlState = {
    screen: SCREENS.includes(screen as Screen) ? (screen as Screen) : undefined,
    mode: MODES.includes(mode as GameMode) ? (mode as GameMode) : undefined,
    round: debugRoundFromUrl(),
    phase: phase === 'combat' || phase === 'plan' ? phase : undefined,
    theme: theme === 'dark' || theme === 'light' ? theme : undefined,
  };
  return Object.values(state).some((v) => v !== undefined) ? state : null;
}
