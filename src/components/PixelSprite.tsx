interface PixelSpriteProps {
  src: string;
  size?: number;
  alt?: string;
  dimmed?: boolean;
  className?: string;
}

export function PixelSprite({ src, size, alt = '', dimmed = false, className = '' }: PixelSpriteProps) {
  const style =
    size !== undefined
      ? { width: size, height: size }
      : className
        ? undefined
        : { width: 'var(--sprite-size)', height: 'var(--sprite-size)' };

  return (
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={`${dimmed ? 'pixel pixel-locked' : 'pixel'} ${className}`.trim()}
      style={style}
    />
  );
}
