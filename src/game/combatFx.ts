import { HERO_MAP } from '../data/heroes';
import type { CombatFxKind } from './types';

export function cellCenterPct(r: number, c: number) {
  return { left: c * 25 + 12.5, top: r * 12.5 + 6.25 };
}

export function attackGeometry(fromR: number, fromC: number, toR: number, toC: number) {
  const from = cellCenterPct(fromR, fromC);
  const to = cellCenterPct(toR, toC);
  const dx = to.left - from.left;
  const dy = to.top - from.top;
  const len = Math.sqrt(dx * dx + dy * dy);
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  return { from, to, len, angle };
}

export type FxAttackPattern =
  | 'slash'
  | 'coil'
  | 'wind'
  | 'zigzag'
  | 'web'
  | 'splash'
  | 'dive'
  | 'wisp'
  | 'ember'
  | 'tide'
  | 'storm'
  | 'rune';

export type FxCastPattern =
  | 'coil-ring'
  | 'gale'
  | 'chain'
  | 'web-net'
  | 'drag'
  | 'sun-dive'
  | 'foxfire'
  | 'pillar'
  | 'breath'
  | 'ward'
  | 'steal'
  | 'riddle';

export interface FxProfile {
  element: string;
  attack: FxAttackPattern;
  cast: FxCastPattern;
  bolt: string;
  flash: string;
  slash: string;
  ring: string;
  burst: string;
  glow: string;
}

const HERO_FX: Record<string, FxProfile> = {
  jorm: {
    element: 'Serpent',
    attack: 'coil',
    cast: 'coil-ring',
    bolt: '#1B6B52',
    flash: 'rgba(27,107,82,.6)',
    slash: '#2E8B6A',
    ring: '#1B6B52',
    burst: 'rgba(27,107,82,.45)',
    glow: '#4a9e7a',
  },
  quetz: {
    element: 'Sky',
    attack: 'wind',
    cast: 'gale',
    bolt: '#7EC8C8',
    flash: 'rgba(126,200,200,.55)',
    slash: '#E8A317',
    ring: '#5BB5A2',
    burst: 'rgba(91,181,162,.4)',
    glow: '#B8F0E8',
  },
  thund: {
    element: 'Sky',
    attack: 'zigzag',
    cast: 'chain',
    bolt: '#E8E4F0',
    flash: 'rgba(140,180,255,.7)',
    slash: '#4C7BD1',
    ring: '#4C7BD1',
    burst: 'rgba(76,123,209,.55)',
    glow: '#FFFFFF',
  },
  anans: {
    element: 'Trickster',
    attack: 'web',
    cast: 'web-net',
    bolt: '#7A3E9D',
    flash: 'rgba(122,62,157,.5)',
    slash: '#14120E',
    ring: '#7A3E9D',
    burst: 'rgba(122,62,157,.35)',
    glow: '#C084FC',
  },
  bunyi: {
    element: 'Serpent',
    attack: 'splash',
    cast: 'drag',
    bolt: '#2E6B8A',
    flash: 'rgba(46,107,138,.55)',
    slash: '#1B6B52',
    ring: '#2E6B8A',
    burst: 'rgba(46,107,138,.4)',
    glow: '#5BA4C9',
  },
  garud: {
    element: 'Sky',
    attack: 'dive',
    cast: 'sun-dive',
    bolt: '#E8A317',
    flash: 'rgba(232,163,23,.65)',
    slash: '#B4442B',
    ring: '#E8A317',
    burst: 'rgba(232,163,23,.45)',
    glow: '#FFE566',
  },
  kitsu: {
    element: 'Infernal',
    attack: 'wisp',
    cast: 'foxfire',
    bolt: '#FF6B35',
    flash: 'rgba(255,107,53,.55)',
    slash: '#E8A317',
    ring: '#FF6B35',
    burst: 'rgba(255,107,53,.4)',
    glow: '#FFB347',
  },
  ifrit: {
    element: 'Infernal',
    attack: 'ember',
    cast: 'pillar',
    bolt: '#B4442B',
    flash: 'rgba(180,68,43,.65)',
    slash: '#FF6B35',
    ring: '#B4442B',
    burst: 'rgba(180,68,43,.5)',
    glow: '#FF4500',
  },
  zirni: {
    element: 'Infernal',
    attack: 'ember',
    cast: 'breath',
    bolt: '#D4522A',
    flash: 'rgba(212,82,42,.7)',
    slash: '#E8A317',
    ring: '#D4522A',
    burst: 'rgba(212,82,42,.5)',
    glow: '#FF6347',
  },
  taniw: {
    element: 'Guardian',
    attack: 'tide',
    cast: 'ward',
    bolt: '#4C7BD1',
    flash: 'rgba(76,123,209,.5)',
    slash: '#1B6B52',
    ring: '#4C7BD1',
    burst: 'rgba(76,123,209,.35)',
    glow: '#7EB8FF',
  },
  anzuu: {
    element: 'Sky',
    attack: 'storm',
    cast: 'steal',
    bolt: '#6B5B95',
    flash: 'rgba(107,91,149,.55)',
    slash: '#E8E4F0',
    ring: '#6B5B95',
    burst: 'rgba(107,91,149,.4)',
    glow: '#9B8EC4',
  },
  sphin: {
    element: 'Ancestor',
    attack: 'rune',
    cast: 'riddle',
    bolt: '#F2E9D4',
    flash: 'rgba(242,233,212,.75)',
    slash: '#E8A317',
    ring: '#E8A317',
    burst: 'rgba(242,233,212,.55)',
    glow: '#FFFFFF',
  },
  kelpi: {
    element: 'Serpent',
    attack: 'splash',
    cast: 'drag',
    bolt: '#3F8A7A',
    flash: 'rgba(63,138,122,.55)',
    slash: '#1B6B52',
    ring: '#2E6E8C',
    burst: 'rgba(46,110,140,.4)',
    glow: '#5BA4C9',
  },
  barng: {
    element: 'Guardian',
    attack: 'tide',
    cast: 'ward',
    bolt: '#F0C13B',
    flash: 'rgba(240,193,59,.55)',
    slash: '#1B6B52',
    ring: '#E8A317',
    burst: 'rgba(232,163,23,.4)',
    glow: '#FFE566',
  },
  coyot: {
    element: 'Trickster',
    attack: 'web',
    cast: 'web-net',
    bolt: '#C48A3A',
    flash: 'rgba(196,138,58,.5)',
    slash: '#E8A317',
    ring: '#6B3A12',
    burst: 'rgba(107,58,18,.35)',
    glow: '#F5C518',
  },
  griff: {
    element: 'Sky',
    attack: 'dive',
    cast: 'sun-dive',
    bolt: '#E0A84A',
    flash: 'rgba(224,168,74,.6)',
    slash: '#C4402B',
    ring: '#E8A317',
    burst: 'rgba(232,163,23,.45)',
    glow: '#FFE566',
  },
  golem: {
    element: 'Colossal',
    attack: 'slash',
    cast: 'coil-ring',
    bolt: '#C4895A',
    flash: 'rgba(196,137,90,.5)',
    slash: '#8C5A32',
    ring: '#8C5A32',
    burst: 'rgba(140,90,50,.4)',
    glow: '#F0C13B',
  },
  bansh: {
    element: 'Ancestor',
    attack: 'rune',
    cast: 'riddle',
    bolt: '#E8E4DC',
    flash: 'rgba(126,184,160,.55)',
    slash: '#7EB8A0',
    ring: '#6B5B95',
    burst: 'rgba(107,91,149,.4)',
    glow: '#FFFFFF',
  },
  hydra: {
    element: 'Serpent',
    attack: 'coil',
    cast: 'coil-ring',
    bolt: '#6FBF62',
    flash: 'rgba(111,191,98,.5)',
    slash: '#245C32',
    ring: '#1B6B52',
    burst: 'rgba(27,107,82,.4)',
    glow: '#A8E08A',
  },
  nuwa: {
    element: 'Ancestor',
    attack: 'rune',
    cast: 'ward',
    bolt: '#C9A227',
    flash: 'rgba(201,162,39,.55)',
    slash: '#1B6B52',
    ring: '#1B6B52',
    burst: 'rgba(27,107,82,.4)',
    glow: '#F0C13B',
  },
  camaz: {
    element: 'Infernal',
    attack: 'dive',
    cast: 'sun-dive',
    bolt: '#C4402B',
    flash: 'rgba(196,64,43,.6)',
    slash: '#14120E',
    ring: '#E8A317',
    burst: 'rgba(20,18,14,.5)',
    glow: '#FF6B35',
  },
  simur: {
    element: 'Sky',
    attack: 'wind',
    cast: 'gale',
    bolt: '#4EC9B0',
    flash: 'rgba(78,201,176,.5)',
    slash: '#F0C13B',
    ring: '#1F7A6C',
    burst: 'rgba(31,122,108,.4)',
    glow: '#B8F0E8',
  },
  levia: {
    element: 'Serpent',
    attack: 'splash',
    cast: 'coil-ring',
    bolt: '#2E5E8C',
    flash: 'rgba(46,94,140,.55)',
    slash: '#5BA4C9',
    ring: '#1A3358',
    burst: 'rgba(26,51,88,.45)',
    glow: '#7EB8FF',
  },
  wendi: {
    element: 'Infernal',
    attack: 'slash',
    cast: 'breath',
    bolt: '#C9C2B0',
    flash: 'rgba(180,68,43,.55)',
    slash: '#B4442B',
    ring: '#6B6455',
    burst: 'rgba(107,100,85,.45)',
    glow: '#F2E9D4',
  },
};

const TRAIT_FALLBACK: Record<string, FxProfile> = {
  Serpent: HERO_FX.jorm,
  Sky: HERO_FX.thund,
  Guardian: HERO_FX.taniw,
  Trickster: HERO_FX.anans,
  Infernal: HERO_FX.ifrit,
  Ancestor: HERO_FX.sphin,
  Colossal: {
    element: 'Colossal',
    attack: 'slash',
    cast: 'coil-ring',
    bolt: '#F2E9D4',
    flash: 'rgba(242,233,212,.6)',
    slash: '#14120E',
    ring: '#B4442B',
    burst: 'rgba(180,68,43,.35)',
    glow: '#E8A317',
  },
};

const DEFAULT_FX: FxProfile = {
  element: 'Physical',
  attack: 'slash',
  cast: 'coil-ring',
  bolt: '#F2E9D4',
  flash: 'rgba(242,233,212,.5)',
  slash: '#14120E',
  ring: '#E8A317',
  burst: 'rgba(122,62,157,.35)',
  glow: '#F2E9D4',
};

function baseProfile(hid: string): FxProfile {
  if (HERO_FX[hid]) return HERO_FX[hid];
  const hero = HERO_MAP[hid];
  if (hero?.traits[0] && TRAIT_FALLBACK[hero.traits[0]]) return TRAIT_FALLBACK[hero.traits[0]];
  return DEFAULT_FX;
}

export function getFxProfile(hid: string, kind: CombatFxKind): FxProfile {
  const base = baseProfile(hid);
  if (kind === 'crit') {
    return {
      ...base,
      bolt: '#E8A317',
      flash: 'rgba(232,163,23,.65)',
      slash: '#E8A317',
      ring: '#E8A317',
      burst: 'rgba(232,163,23,.5)',
      glow: '#FFE566',
    };
  }
  if (kind === 'true') {
    return {
      ...base,
      attack: 'rune',
      cast: 'riddle',
      bolt: '#F2E9D4',
      flash: 'rgba(242,233,212,.8)',
      slash: '#F2E9D4',
      ring: '#F2E9D4',
      burst: 'rgba(242,233,212,.6)',
      glow: '#FFFFFF',
    };
  }
  if (kind === 'magic') {
    return {
      ...base,
      bolt: base.glow,
      flash: base.burst,
    };
  }
  return base;
}

/** @deprecated use getFxProfile */
export function fxColors(kind: CombatFxKind) {
  const p = getFxProfile('', kind);
  return { bolt: p.bolt, flash: p.flash, slash: p.slash };
}

export function lungePush(hid: string): number {
  switch (hid) {
    case 'garud':
    case 'camaz':
    case 'griff':
      return 14;
    case 'jorm':
    case 'zirni':
    case 'bunyi':
    case 'hydra':
    case 'levia':
    case 'golem':
      return 10;
    case 'anzuu':
    case 'wendi':
      return 9;
    default:
      return 8;
  }
}
