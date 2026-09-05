import type { ReactNode } from 'react';

/**
 * Wraps whichever screen is mounted so a swap reads as a move rather than a
 * cut. Enter only — an exit animation would need both screens mounted at once,
 * and two live copies of the game screen is not worth 220 ms of polish.
 */
export function ScreenFrame({ screen, children }: { screen: string; children: ReactNode }) {
  return (
    <div key={screen} className="om-screen om-screen--enter">
      {children}
    </div>
  );
}
