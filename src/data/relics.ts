import type { Combatant } from '../game/types';

export interface RelicDef {
  id: string;
  name: string;
  glyph: string;
  color: string;
  desc: string;
  apply: (u: Combatant) => void;
  /** Gauntlet-only relics appear in offers at high rounds. */
  gauntletOnly?: boolean;
  minRound?: number;
}

export const RELICS: RelicDef[] = [
  {
    id: 'ember',
    name: 'Ember Bead',
    glyph: '✷',
    color: '#E8A317',
    desc: '+18% attack damage.',
    apply: (u) => {
      u.atk *= 1.18;
    },
  },
  {
    id: 'jade',
    name: 'Jade Scale',
    glyph: '⛨',
    color: '#1B6B52',
    desc: '+130 max health.',
    apply: (u) => {
      u.maxHp += 130;
      u.hp += 130;
    },
  },
  {
    id: 'quill',
    name: 'Storm Quill',
    glyph: '⌃',
    color: '#4C7BD1',
    desc: '+25% attack speed.',
    apply: (u) => {
      u.as *= 1.25;
    },
  },
  {
    id: 'mirror',
    name: 'Split Mirror',
    glyph: '✻',
    color: '#9B59B6',
    desc: '+25% crit chance.',
    apply: (u) => {
      u.crit += 0.25;
    },
  },
  {
    id: 'ink',
    name: 'Ink of Rivers',
    glyph: '⌇',
    color: '#2E86AB',
    desc: 'Attacks heal for 20% of damage.',
    apply: (u) => {
      u.lifesteal = (u.lifesteal || 0) + 0.2;
    },
  },
  {
    id: 'bell',
    name: 'Bronze Bell',
    glyph: '☖',
    color: '#C17F3A',
    desc: 'Starts combat with 55 mana.',
    apply: (u) => {
      u.startMana = (u.startMana || 0) + 55;
    },
  },
  {
    id: 'sigil',
    name: 'Sun Sigil',
    glyph: '✧',
    color: '#F4D03F',
    desc: '+40 spell power.',
    apply: (u) => {
      u.sp = (u.sp || 0) + 40;
    },
  },
  {
    id: 'root',
    name: 'Deep Root',
    glyph: '▣',
    color: '#5D8A3E',
    desc: 'Takes 18% less damage.',
    apply: (u) => {
      u.dr = (u.dr || 0) + 0.18;
    },
  },
  {
    id: 'aegis',
    name: 'Trial Aegis',
    glyph: '⬡',
    color: '#C17F3A',
    desc: '+220 max health and +12% damage reduction.',
    gauntletOnly: true,
    minRound: 12,
    apply: (u) => {
      u.maxHp += 220;
      u.hp += 220;
      u.dr = (u.dr || 0) + 0.12;
    },
  },
  {
    id: 'fury',
    name: 'Gauntlet Fury',
    glyph: '⚡',
    color: '#D0553A',
    desc: '+28% attack damage and +15% crit chance.',
    gauntletOnly: true,
    minRound: 12,
    apply: (u) => {
      u.atk *= 1.28;
      u.crit += 0.15;
    },
  },
  {
    id: 'oracle',
    name: 'Oracle Lens',
    glyph: '◎',
    color: '#7A3E9D',
    desc: '+55 spell power and starts with 70 mana.',
    gauntletOnly: true,
    minRound: 20,
    apply: (u) => {
      u.sp = (u.sp || 0) + 55;
      u.startMana = (u.startMana || 0) + 70;
    },
  },
  {
    id: 'titan',
    name: 'Titan Heart',
    glyph: '♥',
    color: '#B4442B',
    desc: '+35% max health and +20% attack speed.',
    gauntletOnly: true,
    minRound: 30,
    apply: (u) => {
      u.maxHp = Math.round(u.maxHp * 1.35);
      u.hp = u.maxHp;
      u.as *= 1.2;
    },
  },
];

export const GAUNTLET_RELIC_IDS = RELICS.filter((r) => r.gauntletOnly).map((r) => r.id);

export const RELIC_MAP = Object.fromEntries(RELICS.map((r) => [r.id, r])) as Record<
  string,
  RelicDef
>;
