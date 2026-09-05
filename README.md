# Twelve Omens

An auto-battler of world myth. Draft six creatures from twelve mythologies, roll your shop, merge to 3★, equip relics, and fight the Adversary — as a mobile PWA.

## Play locally

```bash
npm install
npm run dev
```

Open the URL shown in the terminal (usually `http://localhost:5173/autogame/`).

## Build

```bash
npm run build
npm run preview
```

## Deploy

Pushes to `main` deploy to GitHub Pages at `https://jnthns.github.io/autogame/`.

After the first deploy, enable **GitHub Pages → Source: GitHub Actions** in the repo settings if needed.

## Install as PWA

On mobile, open the deployed URL in Safari (iOS) or Chrome (Android) and use **Add to Home Screen**. The app caches assets for offline play after the first load.

## Game modes

- **Practice** — infinite gold, free rerolls, sandbox combat
- **Bot match** — 12 rounds, 100 HP each, relic rewards on wins, compounding damage on loss streaks

## Tech

- React + TypeScript + Vite
- vite-plugin-pwa (service worker + manifest)
- Pixel sprites rendered from embedded art data

## Design system

The brutalist pixel identity — Alfa Slab One display, Barlow Semi Condensed
body, Space Mono numerals, 2px/3px ink borders, hard offset shadows, square
corners, and the bone/ink/jade/saffron/rust palette — lives in three
stylesheets, imported in this order by `src/index.css`:

- [`src/styles/tokens.css`](src/styles/tokens.css) — the palette, type scale,
  spacing, border widths, hard shadows, the `--dur-*`/`--ease-*` motion scale
  and the z-layer ladder. Light values sit on `.phone`, dark on
  `.phone.theme-dark`, and `.phone.reduce-motion` zeroes the duration tokens,
  which is the *only* mechanism reduced motion uses.
- [`src/styles/components.css`](src/styles/components.css) — the class contract:
  `.om-btn`, `.om-chip`, `.om-panel`/`.om-card`/`.om-modal`/`.om-sheet`, the
  `.om-hud` family, `.om-bar`, the board classes, `.om-bench`/`.om-slot`,
  `.om-shop`, and the text helpers.
- [`src/styles/motion.css`](src/styles/motion.css) — every `@keyframes`.
  Durations and easings are never written here; the class that uses a keyframe
  supplies them from the tokens.

Components carry no hex literal and no inline duration — `npm run check:styles`
fails the build otherwise. UI timings (intro, bar drain, card stagger) are in
[`src/data/ui.ts`](src/data/ui.ts), kept apart from gameplay constants.

## Overhaul plan

The design and balance overhaul is planned in [`docs/overhaul/`](docs/overhaul/README.md). Start with the README there for phase order, invariants, and commands. Each phase's measured outcome, and the five acceptance bands that turned out to need a rule change rather than a dial, are in [`docs/overhaul/baselines/`](docs/overhaul/baselines/) — `B7-report.md` is the current scoreboard.
