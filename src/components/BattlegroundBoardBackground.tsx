import { useEffect, useRef } from 'react';
import { battlegroundImageUrl, battlegroundUsesImage } from '../data/battlegrounds';
import { BATTLEGROUND_WALLPAPERS } from '../data/battlegroundWallpapers';

interface BattlegroundBoardBackgroundProps {
  id: string;
  animate?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

function AnimatedBoardWallpaper({
  id,
  animate,
  className,
  style,
}: Required<Pick<BattlegroundBoardBackgroundProps, 'id' | 'animate' | 'className' | 'style'>>) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    const art = BATTLEGROUND_WALLPAPERS[id] ?? BATTLEGROUND_WALLPAPERS.plain;
    if (!canvas || !art) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = art.w;
    canvas.height = art.h;

    const draw = (frameIndex: number) => {
      const rows = art.frames[frameIndex % art.frames.length] ?? art.frames[0];
      ctx.clearRect(0, 0, art.w, art.h);
      rows.forEach((row, y) => {
        for (let x = 0; x < art.w; x++) {
          const ch = row[x];
          if (!ch || ch === '.') continue;
          const col = art.p[ch];
          if (!col) continue;
          ctx.fillStyle = col;
          ctx.fillRect(x, y, 1, 1);
        }
      });
    };

    draw(0);
    frameRef.current = 0;

    if (!animate || art.frames.length <= 1) return;

    const timer = window.setInterval(() => {
      frameRef.current = (frameRef.current + 1) % art.frames.length;
      draw(frameRef.current);
    }, art.intervalMs);

    return () => window.clearInterval(timer);
  }, [id, animate]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={`board-wallpaper-canvas pixel ${className}`.trim()}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        objectFit: 'fill',
        pointerEvents: 'none',
        imageRendering: 'pixelated',
        ...style,
      }}
    />
  );
}

export function BattlegroundBoardBackground({
  id,
  animate = true,
  className = '',
  style,
}: BattlegroundBoardBackgroundProps) {
  const imageUrl = battlegroundImageUrl(id);
  if (battlegroundUsesImage(id) && imageUrl) {
    return (
      <div
        aria-hidden
        className={`board-wallpaper-canvas pixel ${className}`.trim()}
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `url(${imageUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          pointerEvents: 'none',
          imageRendering: 'pixelated',
          ...style,
        }}
      />
    );
  }

  return (
    <AnimatedBoardWallpaper id={id} animate={animate} className={className} style={style ?? {}} />
  );
}
