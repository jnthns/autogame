/**
 * High-definition, lightly animated themed pixelart battleground wallpapers.
 * Designed in full aspect ratio (96×192) for the 4×8 match board.
 *
 * Each theme features:
 * - Hand-crafted themed pixel arena stone floor & grid framing
 * - Thematic environment surroundings (torii gates, pagodas, wisps, waves, thunderbolts, temples, etc.)
 * - Hero motif sleeping/resting or guarding near the arena boundary
 * - Multi-frame atmospheric light animations (floating foxfire wisps, flowing waves, electric arcs, glowing runes, flame flicker)
 */

export interface BattlegroundWallpaperDef {
  w: number;
  h: number;
  p: Record<string, string>;
  frames: string[][];
  intervalMs: number;
}

const W = 96;
const H = 192;

type Grid = string[][];

function blank(bg = '.'): Grid {
  return Array.from({ length: H }, () => Array(W).fill(bg));
}

function put(g: Grid, x: number, y: number, c: string) {
  if (y >= 0 && y < H && x >= 0 && x < W) g[y][x] = c;
}

function fill(g: Grid, x: number, y: number, w: number, h: number, c: string) {
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) put(g, x + dx, y + dy, c);
  }
}

function rows(g: Grid): string[] {
  return g.map((r) => r.join(''));
}

function line(g: Grid, x0: number, y0: number, x1: number, y1: number, c: string) {
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  let x = x0;
  let y = y0;
  while (true) {
    put(g, x, y, c);
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x += sx;
    }
    if (e2 < dx) {
      err += dx;
      y += sy;
    }
  }
}

function circle(g: Grid, cx: number, cy: number, r: number, c: string, filled = true) {
  for (let y = cy - r; y <= cy + r; y++) {
    for (let x = cx - r; x <= cx + r; x++) {
      const d = Math.hypot(x - cx, y - cy);
      if (filled) {
        if (d <= r) put(g, x, y, c);
      } else {
        if (d >= r - 0.7 && d <= r + 0.5) put(g, x, y, c);
      }
    }
  }
}

/** Draws standard 4x8 stone arena tiles on the board */
function drawBoardTiles(
  g: Grid,
  tileBase: string,
  tileLight: string,
  tileDark: string,
  crackCol: string,
  grassCol?: string,
) {
  const cellW = 24;
  const cellH = 24;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 4; c++) {
      const x0 = c * cellW;
      const y0 = r * cellH;

      // Tile fill with bevel
      fill(g, x0 + 1, y0 + 1, cellW - 2, cellH - 2, tileBase);
      // Top/Left highlight
      line(g, x0 + 1, y0 + 1, x0 + cellW - 2, y0 + 1, tileLight);
      line(g, x0 + 1, y0 + 1, x0 + 1, y0 + cellH - 2, tileLight);
      // Bottom/Right shadow
      line(g, x0 + 1, y0 + cellH - 2, x0 + cellW - 2, y0 + cellH - 2, tileDark);
      line(g, x0 + cellW - 2, y0 + 1, x0 + cellW - 2, y0 + cellH - 2, tileDark);
      // Grid mortar line
      line(g, x0, y0, x0 + cellW - 1, y0, tileDark);
      line(g, x0, y0, x0, y0 + cellH - 1, tileDark);

      // Subtle weathering cracks / stone variations per tile
      const seed = (r * 7 + c * 13) % 5;
      if (seed === 1) {
        put(g, x0 + 5, y0 + 6, crackCol);
        put(g, x0 + 6, y0 + 7, crackCol);
        put(g, x0 + 7, y0 + 7, crackCol);
      } else if (seed === 2) {
        put(g, x0 + 15, y0 + 14, crackCol);
        put(g, x0 + 16, y0 + 15, crackCol);
        put(g, x0 + 17, y0 + 15, crackCol);
        put(g, x0 + 18, y0 + 16, crackCol);
      } else if (seed === 3) {
        put(g, x0 + 12, y0 + 4, crackCol);
        put(g, x0 + 11, y0 + 5, crackCol);
      }

      // Small grass tufts on edges
      if (grassCol && (seed === 0 || seed === 4)) {
        put(g, x0 + 2, y0 + cellH - 3, grassCol);
        put(g, x0 + 3, y0 + cellH - 4, grassCol);
        put(g, x0 + 4, y0 + cellH - 3, grassCol);
      }
    }
  }
}

/** Draws the Kitsune Foxfire Grove (matches user's reference image!) */
function foxfireWallpaper(phase: number): string[] {
  // Palette:
  // k: dark outline/shadow #0c0d14
  // s: sky gradient dark #1e1e36
  // m: sky mid #2a2a4c
  // b: sky horizon #3a3860
  // h: background hill silhouette #181828
  // t: temple pagoda silhouette #121220
  // g: grass/ground #141a1c
  // f: stone tile base #262933
  // l: stone tile light #373b47
  // d: stone tile dark #191a22
  // c: crack #101117
  // r: torii gate dark red/wood #2b1216
  // o: torii highlight #441b21
  // w: white fox fur #dce6f2
  // p: fox shadow/pink ear #9aa8b8
  // u: blue flame core #6de4ff
  // v: blue flame outer #1d82db
  // y: moon / star #f0f4ff
  const g = blank('g');

  // Draw night sky gradient at top
  fill(g, 0, 0, W, 8, 's');
  fill(g, 0, 8, W, 12, 'm');
  fill(g, 0, 20, W, 14, 'b');

  // Crescent Moon & stars
  circle(g, 62, 14, 6, 'y', true);
  circle(g, 60, 12, 5, 'm', true); // carve crescent
  put(g, 16, 6, 'y');
  put(g, 44, 9, 'y');
  put(g, 78, 10, 'y');
  put(g, 90, 18, 'y');

  // Distant mountain & pagoda temple silhouettes
  for (let x = 0; x < W; x++) {
    const hillY = 26 + Math.round(Math.sin(x * 0.08) * 4);
    for (let y = hillY; y < 40; y++) put(g, x, y, 'h');
  }
  // Pagoda roof silhouettes in distance
  fill(g, 26, 20, 16, 2, 't');
  fill(g, 24, 22, 20, 2, 't');
  fill(g, 28, 16, 12, 2, 't');
  fill(g, 30, 12, 8, 4, 't');
  fill(g, 33, 8, 2, 4, 't');

  // Stone board arena
  drawBoardTiles(g, 'f', 'l', 'd', 'c', 'g');

  // Side Torii Gates (Left & Right)
  // Left Torii
  fill(g, 4, 28, 4, 46, 'r');
  fill(g, 15, 30, 4, 44, 'r');
  fill(g, 1, 24, 21, 4, 'r'); // Top beam
  fill(g, 0, 23, 23, 2, 'o');
  fill(g, 3, 34, 17, 3, 'r'); // Sub beam
  // Right Torii
  fill(g, 77, 30, 4, 44, 'r');
  fill(g, 88, 28, 4, 46, 'r');
  fill(g, 74, 24, 21, 4, 'r');
  fill(g, 73, 23, 23, 2, 'o');
  fill(g, 76, 34, 17, 3, 'r');

  // Sleeping White Nine-Tailed Fox by the left torii
  const fx = 10;
  const fy = 66;
  fill(g, fx, fy, 10, 8, 'w');
  fill(g, fx + 1, fy - 3, 6, 4, 'w'); // Head
  put(g, fx + 2, fy - 5, 'w'); // Ear
  put(g, fx + 5, fy - 5, 'w');
  put(g, fx + 2, fy - 4, 'p');
  put(g, fx + 5, fy - 4, 'p');
  put(g, fx + 2, fy - 1, 'k'); // Eye closed
  put(g, fx + 4, fy - 1, 'k');
  put(g, fx + 3, fy + 1, 'k'); // Nose
  // Tails curled behind
  circle(g, fx + 10, fy + 2, 4, 'w', true);
  circle(g, fx + 11, fy + 5, 3, 'p', true);

  // Animated Floating Foxfire Wisps
  const wisps = [
    { x: 32, y: 48, p: 0 },
    { x: 44, y: 56, p: 1 },
    { x: 66, y: 50, p: 2 },
    { x: 5, y: 72, p: 1 },
    { x: 92, y: 80, p: 0 },
    { x: 10, y: 98, p: 2 },
    { x: 86, y: 108, p: 1 },
    { x: 4, y: 138, p: 0 },
    { x: 92, y: 142, p: 2 },
    { x: 22, y: 180, p: 1 },
    { x: 74, y: 182, p: 0 },
    { x: 5, y: 186, p: 2 },
    { x: 91, y: 184, p: 1 },
  ];

  wisps.forEach((w) => {
    const floatOffset = ((phase + w.p) % 3) - 1;
    const wx = w.x;
    const wy = w.y + floatOffset;
    const frame = (phase + w.p) % 3;

    // Flame shape
    put(g, wx, wy - 2, 'u');
    fill(g, wx - 1, wy - 1, 3, 3, 'v');
    put(g, wx, wy, 'u');
    put(g, wx, wy + 1, 'u');
    if (frame === 1) {
      put(g, wx, wy - 3, 'u');
    }
  });

  return rows(g);
}

/** Training Sands: Ancient warrior ring with sand, banners, pillars & martial marks */
function plainWallpaper(phase: number): string[] {
  const g = blank('b'); // Base sand
  // Stone arena
  drawBoardTiles(g, 'a', 'b', 'd', 'k', 'c');

  // Wooden stakes / corner totems with waving banners
  const banners = [
    { x: 4, y: 20 },
    { x: 88, y: 20 },
    { x: 4, y: 168 },
    { x: 88, y: 168 },
  ];
  banners.forEach((bn, i) => {
    fill(g, bn.x, bn.y, 4, 22, 'k');
    fill(g, bn.x - 1, bn.y, 6, 3, 'o');
    // Cloth waving banner
    const wave = (phase + i) % 3;
    for (let dy = 3; dy < 16; dy++) {
      const bx = bn.x + 3 + (dy % 2 === 0 ? wave : 0);
      fill(g, bx, bn.y + dy, 6, 1, 'r');
      put(g, bx + 5, bn.y + dy, 'y');
    }
  });

  // Center martial glyph inscribed in sand
  circle(g, 48, 96, 18, 'k', false);
  circle(g, 48, 96, 17, 'o', false);
  line(g, 48, 80, 48, 112, 'k');
  line(g, 32, 96, 64, 96, 'k');

  // Weapon rack on left edge
  fill(g, 2, 84, 4, 24, 'k');
  line(g, 2, 88, 8, 88, 's');
  line(g, 2, 96, 8, 96, 's');
  line(g, 2, 104, 8, 104, 's');

  return rows(g);
}

/** Tide Ward: Taniwha sacred coastal reef with ocean waves, coral, and glowing glyphs */
function tideWallpaper(phase: number): string[] {
  const g = blank('d'); // Deep water ground

  // Ocean wave currents background
  for (let y = 0; y < H; y += 12) {
    const shift = (phase * 2 + y) % 6;
    for (let x = 0; x < W; x += 8) {
      put(g, x + shift, y, 'w');
      put(g, x + shift + 1, y, 'l');
    }
  }

  // Stone reef board
  drawBoardTiles(g, 's', 'l', 'd', 'k', 'l');

  // Māori carved wood pouwhenua / reef totems on left & right
  fill(g, 2, 28, 5, 42, 'k');
  fill(g, 3, 30, 3, 38, 't');
  put(g, 4, 34, 'c');
  put(g, 4, 48, 'c');
  put(g, 4, 60, 'c');

  fill(g, 89, 28, 5, 42, 'k');
  fill(g, 90, 30, 3, 38, 't');
  put(g, 91, 34, 'c');
  put(g, 91, 48, 'c');

  // Bioluminescent water currents & ripples
  const ripples = [
    { x: 12, y: 50 },
    { x: 82, y: 70 },
    { x: 14, y: 120 },
    { x: 80, y: 140 },
    { x: 48, y: 180 },
  ];
  ripples.forEach((rp, i) => {
    const r = ((phase + i) % 3) * 2 + 4;
    circle(g, rp.x, rp.y, r, 'c', false);
  });

  return rows(g);
}

/** Split Sky: Thunderbird thundercloud aerie with mountain spires and crackling lightning */
function stormWallpaper(phase: number): string[] {
  const g = blank('n'); // Dark storm night

  // Storm cloud layers
  for (let y = 0; y < 36; y++) {
    for (let x = 0; x < W; x++) {
      const c = y < 14 ? 'n' : y < 26 ? 'b' : 'c';
      put(g, x, y, c);
    }
  }

  // Board tiles
  drawBoardTiles(g, 'b', 'c', 'n', 'k', 'b');

  // Lightning arcs that flicker per phase
  const showBolt = phase % 3 !== 0;
  if (showBolt) {
    const boltX = phase === 1 ? 28 : 68;
    line(g, boltX, 10, boltX - 4, 30, 'y');
    line(g, boltX - 4, 30, boltX + 2, 45, 'w');
    line(g, boltX + 2, 45, boltX - 2, 65, 'y');
  }

  // Mountain crag spires on edges
  for (let y = 140; y < H; y++) {
    const lw = Math.round((y - 140) * 0.15);
    fill(g, 0, y, lw, 1, 'k');
    fill(g, W - lw, y, lw, 1, 'k');
  }

  // Thunder totems
  fill(g, 2, 34, 4, 30, 'k');
  put(g, 3, 32, 'y');
  fill(g, 90, 34, 4, 30, 'k');
  put(g, 91, 32, 'y');

  return rows(g);
}

/** Web Hollow: Anansi mystic web lair with glowing silk strands and ancestral runes */
function webWallpaper(phase: number): string[] {
  const g = blank('d'); // Dark purple cavern

  // Radial web strands across the background
  const cx = 48;
  const cy = 96;
  for (let a = 0; a < 12; a++) {
    const ang = (a / 12) * Math.PI * 2;
    line(g, cx, cy, cx + Math.round(Math.cos(ang) * 55), cy + Math.round(Math.sin(ang) * 95), 'p');
  }
  for (let r = 18; r <= 80; r += 16) {
    circle(g, cx, cy, r, 'l', false);
  }

  // Board tiles
  drawBoardTiles(g, 's', 'l', 'd', 'k', 'p');

  // Glowing spider silk cocoons / lanterns on corners
  const orbs = [
    { x: 8, y: 30, p: 0 },
    { x: 88, y: 30, p: 1 },
    { x: 8, y: 160, p: 2 },
    { x: 88, y: 160, p: 0 },
  ];
  orbs.forEach((ob) => {
    const glow = (phase + ob.p) % 3;
    circle(g, ob.x, ob.y, 4 + (glow === 1 ? 1 : 0), glow === 0 ? 'o' : 'y', true);
    line(g, ob.x, ob.y - 10, ob.x, ob.y - 4, 'l');
  });

  return rows(g);
}

/** Ouroboros Mire: Jörmungandr primeval Norse swamp with giant scales and runestones */
function coilWallpaper(phase: number): string[] {
  const g = blank('m'); // Dark moss ground

  // Giant serpent body coiling along background border
  const shift = phase % 3;
  for (let y = 10; y < H - 10; y += 4) {
    const xLeft = 3 + Math.round(Math.sin((y + shift * 6) * 0.12) * 2);
    fill(g, xLeft, y, 4, 3, 'g');
    put(g, xLeft + 1, y + 1, 'y');

    const xRight = 89 + Math.round(Math.cos((y + shift * 6) * 0.12) * 2);
    fill(g, xRight, y, 4, 3, 'g');
    put(g, xRight + 1, y + 1, 'y');
  }

  // Board tiles
  drawBoardTiles(g, 's', 'l', 'm', 'k', 'g');

  // Norse Runestones on top corners
  fill(g, 4, 20, 6, 26, 'k');
  fill(g, 5, 22, 4, 22, 's');
  put(g, 6, 26, (phase % 2 === 0) ? 'y' : 'l');
  put(g, 6, 32, (phase % 2 === 0) ? 'y' : 'l');

  fill(g, 86, 20, 6, 26, 'k');
  fill(g, 87, 22, 4, 22, 's');
  put(g, 88, 26, (phase % 2 === 1) ? 'y' : 'l');
  put(g, 88, 32, (phase % 2 === 1) ? 'y' : 'l');

  return rows(g);
}

/** Sunward Cliffs: Garuda sun altar atop golden cliff aerie */
function diveWallpaper(phase: number): string[] {
  const g = blank('r'); // Deep red volcanic / mountain rock

  // Golden Sun Altar background
  circle(g, 48, 24, 18, 'g', true);
  circle(g, 48, 24, 14, 'w', true);
  if (phase % 2 === 0) {
    circle(g, 48, 24, 22, 'o', false);
  }

  // Board tiles
  drawBoardTiles(g, 'o', 'g', 'r', 'k', 's');

  // Golden Eagle pillars on sides
  fill(g, 2, 30, 5, 40, 'k');
  fill(g, 3, 32, 3, 36, 'g');
  put(g, 4, 34, 'w'); // Eagle eye
  fill(g, 2, 28, 5, 3, 'o'); // Wing crest

  fill(g, 89, 30, 5, 40, 'k');
  fill(g, 90, 32, 3, 36, 'g');
  put(g, 91, 34, 'w');
  fill(g, 89, 28, 5, 3, 'o');

  return rows(g);
}

/** Drowning Deep: Bunyip billabong underwater grotto with bubbling currents */
function billabongWallpaper(phase: number): string[] {
  const g = blank('d'); // Murky billabong waters

  // Water caustics & deep weeds
  for (let x = 0; x < W; x += 10) {
    const wave = Math.round(Math.sin((x + phase * 4) * 0.25) * 3);
    line(g, x, 0, x + wave, 40, 'b');
  }

  // Board tiles
  drawBoardTiles(g, 's', 'w', 'd', 'k', 'g');

  // Billabong totems & floating bubbles
  fill(g, 2, 30, 5, 38, 'k');
  fill(g, 3, 32, 3, 34, 'g');

  fill(g, 89, 30, 5, 38, 'k');
  fill(g, 90, 32, 3, 34, 'g');

  // Rising bubbles animation
  const bubbles = [
    { x: 10, y: 70, p: 0 },
    { x: 86, y: 90, p: 1 },
    { x: 12, y: 130, p: 2 },
    { x: 84, y: 150, p: 0 },
  ];
  bubbles.forEach((bb) => {
    const by = bb.y - ((phase + bb.p) % 3) * 4;
    circle(g, bb.x, by, 2, 'w', false);
  });

  return rows(g);
}

/** Smokeless Fire: Ifrit basalt fortress pillars & lava cauldrons */
function infernoWallpaper(phase: number): string[] {
  const g = blank('a'); // Obsidian black volcanic ground

  // Magma cracks on borders
  for (let y = 0; y < H; y += 16) {
    line(g, 0, y, 4, y + 8, 'r');
    line(g, 4, y + 8, 2, y + 16, 'o');
    line(g, W - 1, y, W - 5, y + 8, 'r');
    line(g, W - 5, y + 8, W - 3, y + 16, 'o');
  }

  // Board tiles
  drawBoardTiles(g, 's', 'r', 'k', 'a', 'o');

  // Flaming Braziers on four corners
  const braziers = [
    { x: 4, y: 24, p: 0 },
    { x: 88, y: 24, p: 1 },
    { x: 4, y: 164, p: 2 },
    { x: 88, y: 164, p: 0 },
  ];
  braziers.forEach((bz) => {
    fill(g, bz.x, bz.y + 6, 5, 12, 'k'); // Stand
    fill(g, bz.x - 1, bz.y + 4, 7, 3, 'k'); // Bowl
    // Animated flame
    const f = (phase + bz.p) % 3;
    circle(g, bz.x + 2, bz.y, 3, 'o', true);
    put(g, bz.x + 2, bz.y - (f === 1 ? 2 : 1), 'y');
    put(g, bz.x + 2, bz.y - (f === 2 ? 3 : 2), 'w');
  });

  return rows(g);
}

/** Riddle Sands: Sphinx desert temple of gold and sandstone pyramids */
function throneWallpaper(phase: number): string[] {
  const g = blank('b'); // Egyptian desert sand

  // Distant pyramid silhouettes
  for (let y = 0; y < 24; y++) {
    const hw = Math.round(y * 1.5);
    fill(g, 48 - hw, 24 - y, hw * 2, 1, 's');
  }
  // Golden sun disc above pyramid
  circle(g, 48, 8, 6, 'g', true);
  circle(g, 48, 8, 4, 'w', true);

  // Board tiles
  drawBoardTiles(g, 's', 'g', 'b', 'k', 'o');

  // Ankh / Sphinx hieroglyph obelisks
  fill(g, 2, 28, 5, 42, 'k');
  fill(g, 3, 30, 3, 38, 's');
  put(g, 4, 34, 'g');
  put(g, 4, 46, (phase % 2 === 0) ? 'w' : 'g');

  fill(g, 89, 28, 5, 42, 'k');
  fill(g, 90, 30, 3, 38, 's');
  put(g, 91, 34, 'g');
  put(g, 91, 46, (phase % 2 === 1) ? 'w' : 'g');

  return rows(g);
}

function makeWallpaper(
  p: Record<string, string>,
  generator: (phase: number) => string[],
  phases = 3,
  intervalMs = 500,
): BattlegroundWallpaperDef {
  const frames = Array.from({ length: phases }, (_, i) => generator(i));
  return { w: W, h: H, p, frames, intervalMs };
}

export const BATTLEGROUND_WALLPAPERS: Record<string, BattlegroundWallpaperDef> = {
  plain: makeWallpaper(
    {
      a: '#D8C798',
      b: '#C2B07E',
      d: '#9E8D5C',
      k: '#14120E',
      c: '#B4A270',
      o: '#6B5838',
      r: '#B4442B',
      y: '#F5C518',
      s: '#78684C',
    },
    plainWallpaper,
    3,
    550,
  ),
  tide: makeWallpaper(
    {
      d: '#122E3B',
      w: '#4FAEC2',
      l: '#296D82',
      s: '#1C4A5A',
      k: '#0C1C24',
      t: '#583626',
      c: '#58E2D4',
    },
    tideWallpaper,
    3,
    550,
  ),
  foxfire: makeWallpaper(
    {
      k: '#0c0d14',
      s: '#1e1e36',
      m: '#2a2a4c',
      b: '#3a3860',
      h: '#181828',
      t: '#121220',
      g: '#141a1c',
      f: '#262933',
      l: '#373b47',
      d: '#191a22',
      c: '#101117',
      r: '#2b1216',
      o: '#441b21',
      w: '#dce6f2',
      p: '#9aa8b8',
      u: '#6de4ff',
      v: '#1d82db',
      y: '#f0f4ff',
    },
    foxfireWallpaper,
    3,
    500,
  ),
  storm: makeWallpaper(
    {
      n: '#121C38',
      b: '#223668',
      c: '#456DB0',
      y: '#F5D547',
      w: '#FFFFFF',
      k: '#0C1226',
    },
    stormWallpaper,
    3,
    450,
  ),
  web: makeWallpaper(
    {
      d: '#140D1C',
      p: '#4E2B7A',
      l: '#8E5CC2',
      s: '#261836',
      k: '#0A060E',
      o: '#E07A2F',
      y: '#F5D547',
    },
    webWallpaper,
    3,
    600,
  ),
  coil: makeWallpaper(
    {
      m: '#14291D',
      g: '#225239',
      y: '#F5D547',
      s: '#1B3D2B',
      l: '#387856',
      k: '#0D1A13',
    },
    coilWallpaper,
    3,
    550,
  ),
  dive: makeWallpaper(
    {
      r: '#5E1B13',
      g: '#E6A82E',
      w: '#FFF0B8',
      o: '#B84518',
      s: '#80281C',
      k: '#240A07',
    },
    diveWallpaper,
    3,
    550,
  ),
  billabong: makeWallpaper(
    {
      d: '#12261E',
      b: '#27574B',
      s: '#1B382D',
      w: '#6AC2A8',
      g: '#346B42',
      k: '#0C1A14',
    },
    billabongWallpaper,
    3,
    550,
  ),
  inferno: makeWallpaper(
    {
      a: '#1A0E0C',
      r: '#9E2D1B',
      o: '#E65D20',
      y: '#F7C434',
      w: '#FFF2B0',
      s: '#331B17',
      k: '#0D0706',
    },
    infernoWallpaper,
    3,
    400,
  ),
  throne: makeWallpaper(
    {
      b: '#8C6C38',
      s: '#B8924E',
      g: '#E8C154',
      w: '#FFF5D6',
      k: '#302210',
      o: '#D4A842',
    },
    throneWallpaper,
    3,
    550,
  ),
};
