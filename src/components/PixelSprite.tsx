interface PixelSpriteProps {
  src: string;
  size?: number;
  alt?: string;
}

export function PixelSprite({ src, size = 48, alt = '' }: PixelSpriteProps) {
  return (
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      className="pixel"
      style={{ width: size, height: size }}
    />
  );
}
