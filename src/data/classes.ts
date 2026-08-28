export type ClassName = 'Warden' | 'Striker' | 'Invoker' | 'Herald';

export interface ClassDef {
  glyph: string;
  desc: string;
  tiers: [number, string][];
}

export const CLASSES: Record<ClassName, ClassDef> = {
  Warden: {
    glyph: '☗',
    desc: 'A wall of Wardens lives longer, but the whole line hits softer.',
    tiers: [
      [2, 'Wardens +20% HP and +12% DR. Those Wardens deal −12% attack'],
      [4, 'Board +15% HP. Wardens +20% DR. Board deals −15% attack'],
    ],
  },
  Striker: {
    glyph: '⚔',
    desc: 'Strikers cut deeper, but the line grows thin.',
    tiers: [
      [2, 'Strikers +20% attack and +12% crit. Those Strikers −12% HP'],
      [4, 'Board +12% attack. Strikers +18% crit. Board −12% HP'],
    ],
  },
  Invoker: {
    glyph: '☽',
    desc: 'Invokers swell with spell power, but autos drag.',
    tiers: [
      [2, 'Invokers +30 spell power. Those Invokers −15% attack speed'],
      [4, 'Invokers +50 spell power. Board −12% attack speed'],
    ],
  },
  Herald: {
    glyph: '⚑',
    desc: 'Heralds ward the field, but nobody punches as hard.',
    tiers: [
      [2, 'Allies start with a 70 shield. Heralds deal −15% attack'],
      [4, 'Allies start with a 140 shield and +10% DR. Board deals −12% attack'],
    ],
  },
};

export function isClassName(name: string): name is ClassName {
  return name in CLASSES;
}
