import type { CSSProperties, ReactNode } from 'react';
import { BATTLEGROUND_MAP, BATTLEGROUNDS, type BattlegroundMotif } from '../data/battlegrounds';

/** Sun/moon disc: centre in % of the box, radius in cqmin so it stays round. */
type Disc = { x: string; y: string; r: string };

const DISCS: Partial<Record<BattlegroundMotif, Disc>> = {
  dunes: { x: '78%', y: '16%', r: '16cqmin' },
  grove: { x: '24%', y: '15%', r: '12cqmin' },
  cliffs: { x: '50%', y: '10%', r: '20cqmin' },
  pyramid: { x: '80%', y: '13%', r: '12cqmin' },
};

/** Drawn in a 100×100 box stretched to fit; ring strokes stay in screen space. */
const MOTIFS: Record<BattlegroundMotif, ReactNode> = {
  dunes: (
    <>
      <path className="bg-art__m" opacity={0.55} d="M0 34 Q30 27 60 33 T100 31 V100 H0Z" />
      <path className="bg-art__m" d="M0 72 Q35 64 70 71 T100 68 V100 H0Z" />
    </>
  ),
  waves: (
    <>
      {[22, 42, 62, 82].map((y, i) => (
        <path
          key={y}
          className="bg-art__m"
          opacity={0.35 + 0.15 * i}
          d={`M0 ${y} Q12.5 ${y - 2.5} 25 ${y} T50 ${y} Q62.5 ${y - 2.5} 75 ${y} T100 ${y} V100 H0Z`}
        />
      ))}
    </>
  ),
  grove: (
    <>
      <path className="bg-art__m" opacity={0.5} d="M0 40 Q25 30 50 38 Q75 46 100 36 V100 H0Z" />
      <path className="bg-art__m" d="M0 80 Q30 70 55 78 Q80 86 100 74 V100 H0Z" />
    </>
  ),
  split: (
    <>
      <path className="bg-art__g" opacity={0.8} d="M0 18 L100 6 V30 L0 42Z" />
      <path className="bg-art__m" opacity={0.6} d="M0 62 L100 50 V100 H0Z" />
      <path className="bg-art__m" d="M0 86 L100 74 V100 H0Z" />
    </>
  ),
  web: (
    <>
      {[35, 70, 105, 140].map((r) => (
        <circle key={r} className="bg-art__ring" cx={92} cy={5} r={r} style={{ strokeWidth: '2.5cqmin' }} />
      ))}
    </>
  ),
  coil: (
    <>
      <circle className="bg-art__ring" cx={50} cy={50} r={38} style={{ strokeWidth: '6.5cqmin' }} />
      <circle
        className="bg-art__ring bg-art__ring--g"
        opacity={0.7}
        cx={50}
        cy={50}
        r={38}
        style={{ strokeWidth: '1cqmin' }}
      />
    </>
  ),
  cliffs: (
    <>
      <path className="bg-art__m" opacity={0.6} d="M0 30 H22 V38 H48 V46 H0Z M100 54 H70 V62 H45 V70 H100Z" />
      <path className="bg-art__m" d="M0 82 H35 V88 H75 V94 H100 V100 H0Z" />
    </>
  ),
  deep: (
    <>
      {[30, 52, 74].map((y) => (
        <rect key={y} className="bg-art__m" opacity={0.4} x={0} y={y} width={100} height={100 - y} />
      ))}
      <rect className="bg-art__g" opacity={0.8} x={0} y={12} width={100} height={1.5} />
    </>
  ),
  flames: (
    <>
      <path
        className="bg-art__m"
        opacity={0.55}
        d={`M0 100 ${[0, 1, 2, 3, 4]
          .map((i) => {
            const x = i * 20;
            return `Q${x + 2} 74 ${x + 10} ${i % 2 ? 60 : 68} Q${x + 18} 74 ${x + 20} 100`;
          })
          .join(' ')}Z`}
      />
      <rect className="bg-art__g" opacity={0.5} x={0} y={0} width={100} height={20} />
    </>
  ),
  pyramid: (
    <>
      <path className="bg-art__m" opacity={0.55} d="M5 48 L32 24 L60 48Z" />
      <path className="bg-art__m" d="M35 100 L70 62 L105 100Z" />
    </>
  ),
};

interface BattlegroundArtProps {
  id: string;
  locked?: boolean;
}

/** Flat battleground backdrop; colours arrive as CSS vars and the theme picks a set. */
export function BattlegroundArt({ id, locked = false }: BattlegroundArtProps) {
  const bg = BATTLEGROUND_MAP[id] ?? BATTLEGROUNDS[0];
  const disc = DISCS[bg.motif];
  const vars = {
    '--bgl-sky': bg.light.sky,
    '--bgl-ground': bg.light.ground,
    '--bgl-motif': bg.light.motif,
    '--bgl-glow': bg.light.glow,
    '--bgd-sky': bg.dark.sky,
    '--bgd-ground': bg.dark.ground,
    '--bgd-motif': bg.dark.motif,
    '--bgd-glow': bg.dark.glow,
    ...(disc && { '--bg-disc-x': disc.x, '--bg-disc-y': disc.y, '--bg-disc-r': disc.r }),
  } as CSSProperties;
  return (
    <div
      aria-hidden
      className={`bg-art${disc ? ' bg-art--disc' : ''}${locked ? ' pixel-locked' : ''}`}
      style={vars}
    >
      <svg viewBox="0 0 100 100" preserveAspectRatio="none">
        {MOTIFS[bg.motif]}
      </svg>
    </div>
  );
}
