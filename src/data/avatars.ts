export type HeroId =
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
  glyph: string;
  shape: AvatarShape;
  glyphTone: 'ink' | 'bone';
}

export const AVATARS: Record<HeroId, AvatarDef> = {
  jorm: { accent: '#2E8B57', glyph: '│', shape: 'warden', glyphTone: 'bone' },
  quetz: { accent: '#17B0A0', glyph: '≋', shape: 'invoker', glyphTone: 'ink' },
  thund: { accent: '#3F6FD6', glyph: '↑', shape: 'invoker', glyphTone: 'bone' },
  anans: { accent: '#6B3FA0', glyph: '✻', shape: 'herald', glyphTone: 'bone' },
  bunyi: { accent: '#8C9440', glyph: '◐', shape: 'warden', glyphTone: 'ink' },
  garud: { accent: '#F0B429', glyph: '◆', shape: 'striker', glyphTone: 'ink' },
  kitsu: { accent: '#E2762C', glyph: '✧', shape: 'striker', glyphTone: 'ink' },
  ifrit: { accent: '#D23C2E', glyph: '✷', shape: 'invoker', glyphTone: 'bone' },
  zirni: { accent: '#6FBF62', glyph: '✣', shape: 'invoker', glyphTone: 'ink' },
  taniw: { accent: '#1F7A8C', glyph: '≈', shape: 'herald', glyphTone: 'bone' },
  anzuu: { accent: '#6C7FD8', glyph: '△', shape: 'striker', glyphTone: 'bone' },
  sphin: { accent: '#D9B26A', glyph: '◇', shape: 'invoker', glyphTone: 'ink' },
  kelpi: { accent: '#3D8FA8', glyph: '↝', shape: 'warden', glyphTone: 'bone' },
  barng: { accent: '#E8C232', glyph: '♔', shape: 'herald', glyphTone: 'ink' },
  coyot: { accent: '#A0663A', glyph: '✶', shape: 'striker', glyphTone: 'bone' },
  griff: { accent: '#D9A441', glyph: '✚', shape: 'warden', glyphTone: 'ink' },
  golem: { accent: '#B9744A', glyph: '╫', shape: 'warden', glyphTone: 'ink' },
  bansh: { accent: '#9C7FD0', glyph: '†', shape: 'invoker', glyphTone: 'ink' },
  hydra: { accent: '#357A3F', glyph: '♆', shape: 'warden', glyphTone: 'bone' },
  nuwa: { accent: '#D4687A', glyph: '☯', shape: 'herald', glyphTone: 'ink' },
  camaz: { accent: '#8E2F3C', glyph: '☾', shape: 'striker', glyphTone: 'bone' },
  simur: { accent: '#4EC9B0', glyph: '✿', shape: 'herald', glyphTone: 'ink' },
  levia: { accent: '#294B9A', glyph: '◈', shape: 'warden', glyphTone: 'bone' },
  wendi: { accent: '#B8B29A', glyph: 'W', shape: 'striker', glyphTone: 'ink' },
};

export function avatarFor(heroId: string): AvatarDef {
  return AVATARS[heroId as HeroId] ?? AVATARS.jorm;
}
