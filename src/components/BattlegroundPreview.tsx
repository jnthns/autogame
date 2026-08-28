import { useEffect, useRef } from 'react';
import { BATTLEGROUND_PREVIEWS } from '../data/battlegroundPreviewArt';

interface BattlegroundPreviewProps {
  id: string;
  animate?: boolean;
  locked?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export function BattlegroundPreview({
  id,
  animate = true,
  locked = false,
  className = '',
  style,
}: BattlegroundPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    const art = BATTLEGROUND_PREVIEWS[id];
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
      className={`battleground-preview pixel${locked ? ' pixel-locked' : ''}${className ? ` ${className}` : ''}`}
      style={{ width: '100%', height: '100%', ...style }}
    />
  );
}
