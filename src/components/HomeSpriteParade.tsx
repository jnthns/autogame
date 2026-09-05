import { useMemo } from 'react';
import { INK, JADE, RUST, SAF, costTone } from '../data/constants';
import { HEROES } from '../data/heroes';
import { spriteCss } from '../data/sprites';
import { PixelSprite } from './PixelSprite';

const HERO_IDS = HEROES.map((h) => h.id);

const SPARKLES = [
  { left: '8%', top: '12%', delay: 0, glyph: '✧', color: SAF },
  { left: '22%', top: '68%', delay: 1.2, glyph: '✷', color: RUST },
  { left: '78%', top: '18%', delay: 0.6, glyph: '☖', color: JADE },
  { left: '88%', top: '55%', delay: 1.8, glyph: '⌃', color: SAF },
  { left: '52%', top: '8%', delay: 2.4, glyph: '≋', color: 'var(--om-violet)' },
  { left: '65%', top: '78%', delay: 0.9, glyph: '⌇', color: JADE },
  { left: '12%', top: '42%', delay: 2.1, glyph: '⁂', color: RUST },
  { left: '92%', top: '32%', delay: 1.5, glyph: '⏄', color: 'var(--om-sky)' },
];

const GLYPHS = ['☰', '☱', '☲', '☳', '☴', '☵', '☶', '☷', '✧', '✷', '⌃', '≋'];

interface MarqueeRowProps {
  ids: string[];
  direction: 'left' | 'right';
  duration: number;
  spriteClass: string;
  strip: string;
  className?: string;
}

function MarqueeRow({ ids, direction, duration, spriteClass, strip, className = '', unbound }: MarqueeRowProps & { unbound: Set<string> }) {
  const track = useMemo(() => [...ids, ...ids], [ids]);

  return (
    <div
      className={className}
      style={{
        overflow: 'hidden',
        borderTop: `3px solid ${INK}`,
        borderBottom: `3px solid ${INK}`,
        background: strip,
        position: 'relative',
      }}
    >
      <div
        style={{
          display: 'flex',
          width: 'max-content',
          gap: 10,
          padding: '10px 0',
          animation: `${direction === 'left' ? 'omMarqueeLeft' : 'omMarqueeRight'} ${duration}s linear infinite`,
        }}
      >
        {track.map((id, i) => {
          const hero = HEROES.find((h) => h.id === id)!;
          const src = spriteCss(id);
          const delay = (i % ids.length) * 0.18;
          return (
            <div
              key={`${id}-${i}`}
              style={{
                flexShrink: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
                animation: `omHomeBob 2.8s ease-in-out ${delay}s infinite`,
              }}
            >
              <div
                style={{
                  background: 'var(--om-card)',
                  border: `3px solid ${INK}`,
                  boxShadow: `3px 3px 0 ${costTone(hero.cost)}`,
                  padding: 6,
                  transform: `rotate(${i % 2 ? -2 : 2}deg)`,
                }}
              >
                {src && (
                  <PixelSprite
                    src={src}
                    alt={hero.name}
                    className={spriteClass}
                    dimmed={!unbound.has(id)}
                  />
                )}
              </div>
              <span
                className="mono"
                style={{
                  fontSize: 8,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: 'var(--om-muted)',
                  whiteSpace: 'nowrap',
                }}
              >
                {hero.glyph} {hero.name.split(' ')[0]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface HomeSpriteParadeProps {
  unboundIds?: string[];
}

export function HomeSpriteParade({ unboundIds = HERO_IDS }: HomeSpriteParadeProps) {
  const unbound = useMemo(() => new Set(unboundIds), [unboundIds]);
  const rowA = useMemo(() => [...HERO_IDS].slice(0, 6), []);
  const rowB = useMemo(() => [...HERO_IDS].slice(6).reverse(), []);

  return (
    <div className="home-parade">
      {SPARKLES.map((s, i) => (
        <span
          key={i}
          aria-hidden
          style={{
            position: 'absolute',
            left: s.left,
            top: s.top,
            fontSize: 14,
            color: s.color,
            opacity: 0.75,
            pointerEvents: 'none',
            animation: `omHomeSparkle 3.2s ease-in-out ${s.delay}s infinite`,
            zIndex: 2,
          }}
        >
          {s.glyph}
        </span>
      ))}

      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: '10% 0',
          overflow: 'hidden',
          pointerEvents: 'none',
          opacity: 0.35,
        }}
      >
        <div
          style={{
            display: 'flex',
            width: 'max-content',
            gap: 18,
            animation: 'omGlyphDrift 28s linear infinite',
          }}
        >
          {[...GLYPHS, ...GLYPHS, ...GLYPHS].map((g, i) => (
            <span
              key={i}
              className="slab"
              style={{
                fontSize: 22,
                color: i % 3 === 0 ? JADE : i % 3 === 1 ? SAF : RUST,
                opacity: 0.5,
              }}
            >
              {g}
            </span>
          ))}
        </div>
      </div>

      <MarqueeRow
        ids={rowA}
        direction="left"
        duration={42}
        spriteClass="home-parade-sprite home-parade-sprite--lg"
        strip="linear-gradient(90deg, rgba(27,107,82,.12), rgba(232,163,23,.1), rgba(27,107,82,.12))"
        unbound={unbound}
      />
      <MarqueeRow
        ids={rowB}
        direction="right"
        duration={38}
        spriteClass="home-parade-sprite home-parade-sprite--md"
        strip="linear-gradient(90deg, rgba(180,68,43,.08), rgba(122,62,157,.08), rgba(76,123,209,.08))"
        unbound={unbound}
      />
      <MarqueeRow
        ids={HERO_IDS}
        direction="left"
        duration={55}
        spriteClass="home-parade-sprite home-parade-sprite--sm"
        strip="rgba(242,233,212,.55)"
        className="home-parade-row--compact"
        unbound={unbound}
      />
    </div>
  );
}
