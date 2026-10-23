import { useId, type CSSProperties } from 'react';
import { avatarFor, type AvatarShape } from '../data/avatars';

const SHAPES: Record<AvatarShape, string> = {
  warden: 'M50 6 L88 18 L85 56 Q79 80 50 94 Q21 80 15 56 L12 18 Z',
  striker: 'M50 4 L90 50 L50 96 L10 50 Z',
  invoker: 'M50 5 L89 27.5 L89 72.5 L50 95 L11 72.5 L11 27.5 Z',
  herald: 'M14 6 L86 6 L86 94 L50 76 L14 94 Z',
};

const GLYPH_Y: Record<AvatarShape, number> = {
  warden: 58,
  striker: 62,
  invoker: 63,
  herald: 55,
};

interface HeroAvatarProps {
  heroId: string;
  size?: number;
  alt?: string;
  dimmed?: boolean;
  className?: string;
}

export function HeroAvatar({ heroId, size, alt = '', dimmed = false, className = '' }: HeroAvatarProps) {
  const avatar = avatarFor(heroId);
  const uid = useId().replace(/:/g, '');
  const shadeId = `av-shade-${uid}`;
  const rimId = `av-rim-${uid}`;
  const shadowId = `av-shadow-${uid}`;
  const clipId = `av-clip-${uid}`;
  const style =
    size !== undefined
      ? ({
          width: size,
          height: size,
          '--av-outline': size >= 96 ? 4 : 6,
          '--av-accent': avatar.accent,
        } as CSSProperties)
      : className
        ? ({ '--av-accent': avatar.accent } as CSSProperties)
        : ({ width: 'var(--sprite-size)', height: 'var(--sprite-size)', '--av-accent': avatar.accent } as CSSProperties);
  const glyphClass = avatar.glyphTone === 'ink' ? 'hero-avatar__glyph--ink' : 'hero-avatar__glyph--bone';

  return (
    <svg
      role={alt ? 'img' : undefined}
      aria-label={alt || undefined}
      aria-hidden={alt ? undefined : true}
      viewBox="0 0 100 100"
      className={`hero-avatar${dimmed ? ' pixel-locked' : ''} ${className}`.trim()}
      style={style}
    >
      <defs>
        <linearGradient id={shadeId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="white" stopOpacity=".42" />
          <stop offset=".42" stopColor="white" stopOpacity="0" />
          <stop offset=".58" stopColor="black" stopOpacity="0" />
          <stop offset="1" stopColor="black" stopOpacity=".3" />
        </linearGradient>
        <linearGradient id={rimId} x1="0" y1="0" x2=".35" y2="1">
          <stop offset="0" stopColor="white" stopOpacity=".85" />
          <stop offset=".55" stopColor="white" stopOpacity="0" />
        </linearGradient>
        <radialGradient id={shadowId}>
          <stop offset="0" stopColor="black" stopOpacity=".45" />
          <stop offset=".6" stopColor="black" stopOpacity=".22" />
          <stop offset="1" stopColor="black" stopOpacity="0" />
        </radialGradient>
        <clipPath id={clipId}>
          <path d={SHAPES[avatar.shape]} />
        </clipPath>
      </defs>
      <ellipse className="hero-avatar__shadow" cx="50" cy="94" rx="39" ry="6" fill={`url(#${shadowId})`} />
      <g transform="scale(1 .9)">
        <g transform="translate(0 7)">
          <path d={SHAPES[avatar.shape]} className="hero-avatar__shape" />
          <path d={SHAPES[avatar.shape]} className="hero-avatar__base" />
        </g>
        <path d={SHAPES[avatar.shape]} className="hero-avatar__shape" />
        <path d={SHAPES[avatar.shape]} className="hero-avatar__shade" fill={`url(#${shadeId})`} />
        <path
          d={SHAPES[avatar.shape]}
          className="hero-avatar__rim"
          clipPath={`url(#${clipId})`}
          fill={`url(#${rimId})`}
        />
        <path d={SHAPES[avatar.shape]} className="hero-avatar__outline" />
        <text
          x="50"
          y={GLYPH_Y[avatar.shape]}
          textAnchor="middle"
          dominantBaseline="middle"
          className={`hero-avatar__glyph ${glyphClass}`}
        >
          {avatar.glyph}
        </text>
      </g>
    </svg>
  );
}
