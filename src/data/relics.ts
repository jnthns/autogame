import type { Combatant } from '../game/types';

export interface RelicDef {
  id: string;
  name: string;
  glyph: string;
  desc: string;
  apply: (u: Combatant) => void;
}

export const RELICS: RelicDef[] = [
  {
    id: 'ember',
    name: 'Ember Bead',
    glyph: '✷',
    desc: '+18% attack damage.',
    apply: (u) => {
      u.atk *= 1.18;
    },
  },
  {
    id: 'jade',
    name: 'Jade Scale',
    glyph: '⛨',
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
    desc: '+25% attack speed.',
    apply: (u) => {
      u.as *= 1.25;
    },
  },
  {
    id: 'mirror',
    name: 'Split Mirror',
    glyph: '✻',
    desc: '+25% crit chance.',
    apply: (u) => {
      u.crit += 0.25;
    },
  },
  {
    id: 'ink',
    name: 'Ink of Rivers',
    glyph: '⌇',
    desc: 'Attacks heal for 20% of damage.',
    apply: (u) => {
      u.lifesteal = (u.lifesteal || 0) + 0.2;
    },
  },
  {
    id: 'bell',
    name: 'Bronze Bell',
    glyph: '☖',
    desc: 'Starts combat with 55 mana.',
    apply: (u) => {
      u.startMana = (u.startMana || 0) + 55;
    },
  },
  {
    id: 'sigil',
    name: 'Sun Sigil',
    glyph: '✧',
    desc: '+40 spell power.',
    apply: (u) => {
      u.sp = (u.sp || 0) + 40;
    },
  },
  {
    id: 'root',
    name: 'Deep Root',
    glyph: '▣',
    desc: 'Takes 18% less damage.',
    apply: (u) => {
      u.dr = (u.dr || 0) + 0.18;
    },
  },
];

export const RELIC_MAP = Object.fromEntries(RELICS.map((r) => [r.id, r])) as Record<
  string,
  RelicDef
>;
