import { useEffect, useRef, useState } from 'react';

/**
 * Tween a number toward `value` over `ms`, so a gold counter reads as a change
 * rather than a jump. Reduced motion is handled by the caller passing ms = 0.
 */
export function useCountUp(value: number, ms = 300): number {
  const [shown, setShown] = useState(value);
  const fromRef = useRef(value);
  const startRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (ms <= 0 || value === shown) {
      setShown(value);
      return;
    }
    fromRef.current = shown;
    startRef.current = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - startRef.current) / ms);
      const eased = 1 - (1 - t) * (1 - t);
      setShown(Math.round(fromRef.current + (value - fromRef.current) * eased));
      if (t < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
    // `shown` is read as the start point only; re-running on it would restart the tween.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, ms]);

  return shown;
}
