export type TraitName =
  | 'Serpent'
  | 'Sky'
  | 'Guardian'
  | 'Trickster'
  | 'Infernal'
  | 'Ancestor'
  | 'Colossal';

export interface TraitDef {
  glyph: string;
  desc: string;
  tiers: [number, string][];
}

export const TRAITS: Record<TraitName, TraitDef> = {
  Serpent: {
    glyph: '⌇',
    desc: 'Serpents gain lifesteal.',
    tiers: [
      [2, '15% lifesteal'],
      [4, '35% lifesteal'],
    ],
  },
  Sky: {
    glyph: '⌃',
    desc: 'Sky creatures strike faster.',
    tiers: [
      [2, '+20% attack speed'],
      [3, '+45% attack speed'],
    ],
  },
  Guardian: {
    glyph: '⛨',
    desc: 'Guardians shield the line.',
    tiers: [
      [2, '+80 HP to all Guardians'],
      [4, '+80 HP to the whole board'],
    ],
  },
  Trickster: {
    glyph: '✻',
    desc: 'Tricksters land wicked blows.',
    tiers: [
      [2, '+20% crit chance'],
      [3, '+20% crit and +50% crit damage'],
    ],
  },
  Infernal: {
    glyph: '✷',
    desc: 'Infernals burn everything nearby.',
    tiers: [
      [2, 'Casts scorch adjacent foes for 60'],
      [4, 'Scorch for 150 and reduce healing'],
    ],
  },
  Ancestor: {
    glyph: '☖',
    desc: 'Ancestors begin the fight charged.',
    tiers: [
      [2, 'Start with 30 mana'],
      [3, 'Start with 60 mana and +25 spell power'],
    ],
  },
  Colossal: {
    glyph: '▣',
    desc: 'Colossals are hard to move and hit hard.',
    tiers: [
      [2, '+12% max HP and +10% damage board-wide'],
    ],
  },
};
