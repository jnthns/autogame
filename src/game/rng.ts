/**
 * Single source of randomness for everything under `src/game/**`.
 *
 * The app leaves `current` as `Math.random`; the simulator and the unit tests
 * swap in a seeded generator so a run is reproducible byte for byte.
 */
export type Rng = () => number; // [0, 1)

let current: Rng = Math.random;

export const random: Rng = () => current();

export function setRng(fn: Rng): void {
  current = fn;
}

export function resetRng(): void {
  current = Math.random;
}

/** mulberry32: small, fast, deterministic. */
export function seeded(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher–Yates on a copy, using the current RNG. */
export function shuffle<T>(arr: readonly T[]): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const t = out[i];
    out[i] = out[j];
    out[j] = t;
  }
  return out;
}

/** Uniform pick, or undefined for an empty list. */
export function pick<T>(arr: readonly T[]): T | undefined {
  if (!arr.length) return undefined;
  return arr[Math.floor(random() * arr.length)];
}
