import type { ClassName } from './classes';
import { HERO_MAP } from './heroes';

export type AvatarHeroId =
  | 'jorm'
  | 'quetz'
  | 'thund'
  | 'anans'
  | 'bunyi'
  | 'garud'
  | 'kitsu'
  | 'ifrit'
  | 'zirni'
  | 'taniw'
  | 'anzuu'
  | 'sphin'
  | 'kelpi'
  | 'barng'
  | 'coyot'
  | 'griff'
  | 'golem'
  | 'bansh'
  | 'hydra'
  | 'nuwa'
  | 'camaz'
  | 'simur'
  | 'levia'
  | 'wendi';

export type AvatarShape = 'warden' | 'striker' | 'invoker' | 'herald';

export interface AvatarDef {
  accent: string;
  glyphTone: 'ink' | 'bone';
  /** Override only glyphs that are unsafe in platform default fonts. */
  glyph?: string;
}

export const AVATARS: Record<AvatarHeroId, AvatarDef> = {
  jorm: { accent: '#2E8B57', glyphTone: 'bone' },
  quetz: { accent: '#17B0A0', glyphTone: 'ink' },
  thund: { accent: '#3F6FD6', glyphTone: 'bone' },
  anans: { accent: '#6B3FA0', glyphTone: 'bone' },
  bunyi: { accent: '#8C9440', glyphTone: 'ink' },
  garud: { accent: '#F0B429', glyphTone: 'ink', glyph: '◆' },
  kitsu: { accent: '#E2762C', glyphTone: 'ink' },
  ifrit: { accent: '#D23C2E', glyphTone: 'bone' },
  zirni: { accent: '#6FBF62', glyphTone: 'ink' },
  taniw: { accent: '#1F7A8C', glyphTone: 'bone' },
  anzuu: { accent: '#6C7FD8', glyphTone: 'bone' },
  sphin: { accent: '#D9B26A', glyphTone: 'ink' },
  kelpi: { accent: '#3D8FA8', glyphTone: 'bone' },
  barng: { accent: '#E8C232', glyphTone: 'ink' },
  coyot: { accent: '#A0663A', glyphTone: 'bone' },
  griff: { accent: '#D9A441', glyphTone: 'ink' },
  golem: { accent: '#B9744A', glyphTone: 'ink' },
  bansh: { accent: '#9C7FD0', glyphTone: 'ink' },
  hydra: { accent: '#357A3F', glyphTone: 'bone' },
  nuwa: { accent: '#D4687A', glyphTone: 'ink' },
  camaz: { accent: '#8E2F3C', glyphTone: 'bone' },
  simur: { accent: '#4EC9B0', glyphTone: 'ink' },
  levia: { accent: '#294B9A', glyphTone: 'bone' },
  wendi: { accent: '#B8B29A', glyphTone: 'ink' },
};

const CLASS_SHAPES: Record<ClassName, AvatarShape> = {
  Warden: 'warden',
  Striker: 'striker',
  Invoker: 'invoker',
  Herald: 'herald',
};

export interface ResolvedAvatar extends AvatarDef {
  shape: AvatarShape;
  glyph?: string;
}

const NEUTRAL_AVATAR: ResolvedAvatar = {
  accent: '#8A8271',
  glyphTone: 'ink',
  shape: 'warden',
};

export function avatarFor(heroId: string): ResolvedAvatar {
  const hero = HERO_MAP[heroId];
  const avatar = AVATARS[heroId as AvatarHeroId];
  if (!hero || !avatar) return NEUTRAL_AVATAR;
  return { ...avatar, shape: CLASS_SHAPES[hero.heroClass], glyph: avatar.glyph ?? hero.glyph };
}
