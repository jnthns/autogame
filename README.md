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

## Overhaul plan

The design and balance overhaul is planned in [`docs/overhaul/`](docs/overhaul/README.md). Start with the README there for phase order, invariants, and commands.
