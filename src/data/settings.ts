import type { CombatSpeed, Difficulty } from '../game/types';

export type { CombatSpeed, Difficulty };

export interface SettingsState {
  battlegroundId: string;
  darkMode: boolean;
  difficulty: Difficulty;
  defaultSpeed: CombatSpeed;
  reduceVfx: boolean;
  reduceMotion: boolean;
}

export const SETTINGS_STORAGE_KEY = 'om_settings';
export const DEFAULT_BATTLEGROUND_ID = 'plain';

export const DEFAULT_SETTINGS: SettingsState = {
  battlegroundId: DEFAULT_BATTLEGROUND_ID,
  darkMode: false,
  difficulty: 'normal',
  defaultSpeed: 1,
  reduceVfx: false,
  reduceMotion: false,
};

function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

function parseDifficulty(v: unknown): Difficulty {
  return v === 'hard' || v === 'mythic' ? v : 'normal';
}

function parseSpeed(v: unknown): CombatSpeed {
  return v === 2 || v === 4 ? v : 1;
}

export function loadSettings(): SettingsState {
  try {
    const s = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!s) {
      return { ...DEFAULT_SETTINGS, reduceMotion: prefersReducedMotion() };
    }
    const d = JSON.parse(s) as Partial<SettingsState>;
    const id = typeof d.battlegroundId === 'string' && d.battlegroundId ? d.battlegroundId : DEFAULT_BATTLEGROUND_ID;
    return {
      battlegroundId: id,
      darkMode: d.darkMode === true,
      difficulty: parseDifficulty(d.difficulty),
      defaultSpeed: parseSpeed(d.defaultSpeed),
      reduceVfx: d.reduceVfx === true,
      reduceMotion: typeof d.reduceMotion === 'boolean' ? d.reduceMotion : prefersReducedMotion(),
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(s: SettingsState): void {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}
