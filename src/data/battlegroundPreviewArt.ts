/** Rich animated pixel-art previews for battleground picker (48×48, 3 frames each). */

export interface BattlegroundPreviewDef {
  w: number;
  h: number;
  p: Record<string, string>;
  frames: string[][];
  intervalMs: number;
}

const W = 48;
const H = 48;

type Grid = string[][];

function blank(): Grid {
  return Array.from({ length: H }, () => Array(W).fill('.'));
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

function circle(g: Grid, cx: number, cy: number, r: number, c: string) {
  for (let y = cy - r; y <= cy + r; y++) {
    for (let x = cx - r; x <= cx + r; x++) {
      const d = Math.hypot(x - cx, y - cy);
      if (d >= r - 0.6 && d <= r + 0.4) put(g, x, y, c);
    }
  }
}

function plainFrame(phase: number): string[] {
  const g = blank();
  const p = phase % 3;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const checker = (Math.floor(x / 4) + Math.floor(y / 4)) % 2 === 0;
      put(g, x, y, checker ? 'a' : 'b');
    }
  }
  fill(g, 10, 10, 28, 28, 'c');
  for (let y = 10; y < 38; y++) {
    for (let x = 10; x < 38; x++) {
      const checker = (Math.floor(x / 3) + Math.floor(y / 3)) % 2 === 0;
      put(g, x, y, checker ? 'a' : 'b');
    }
  }
  circle(g, 24, 24, 11, 'k');
  circle(g, 24, 24, 10, 'c');
  const stakes: [number, number][] = [
    [14, 14],
    [33, 14],
    [14, 33],
    [33, 33],
  ];
  stakes.forEach(([x, y], i) => {
    fill(g, x, y + (p === i ? 0 : 1), 2, 4, 'k');
    put(g, x, y + (p === i ? 0 : 1) - 1, 'k');
  });
  return rows(g);
}

function tideFrame(phase: number): string[] {
  const g = blank();
  for (let y = 0; y < 20; y++) {
    for (let x = 0; x < W; x++) put(g, x, y, y < 8 ? 's' : 'l');
  }
  for (let y = 20; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const depth = y > 34 ? 'd' : 'w';
      put(g, x, y, depth);
    }
  }
  const shift = phase % 3;
  for (let band = 0; band < 4; band++) {
    const y = 18 + band * 4 + shift;
    for (let x = 0; x < W; x++) {
      const wave = Math.sin((x + phase * 3) * 0.35) > 0.2;
      if (wave) {
        put(g, x, y, 'l');
        put(g, x, y + 1, 'w');
      }
    }
  }
  for (let x = 4; x < W; x += 9) {
    line(g, x, 28 + (x % 3), x + (phase % 2), 42, 'k');
    for (let y = 30; y < 42; y++) put(g, x, y, y % 3 === 0 ? 's' : 'l');
  }
  fill(g, 20, 22, 8, 3, 's');
  put(g, 22, 21, 'k');
  put(g, 25, 21, 'k');
  return rows(g);
}

function foxfireFrame(phase: number): string[] {
  const g = blank();
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) put(g, x, y, y > 30 ? 'd' : 's');
  }
  const trees = [6, 16, 28, 38];
  trees.forEach((tx) => {
    fill(g, tx, 8, 4, 22, 'k');
    fill(g, tx - 2, 10, 8, 6, 'k');
    fill(g, tx - 1, 6, 6, 4, 'k');
  });
  const orbs: [number, number][] = [
    [12, 26],
    [24, 22],
    [34, 28],
    [18, 34],
    [30, 36],
  ];
  orbs.forEach(([ox, oy], i) => {
    const pulse = (phase + i) % 3;
    const c = pulse === 0 ? 'g' : pulse === 1 ? 'e' : 'h';
    put(g, ox, oy, c);
    put(g, ox + 1, oy, c);
    put(g, ox, oy + 1, c);
    put(g, ox + 1, oy + 1, c);
    if (pulse === 1) {
      put(g, ox, oy - 1, 'h');
      put(g, ox + 1, oy - 1, 'h');
    }
  });
  return rows(g);
}

function stormFrame(phase: number): string[] {
  const g = blank();
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) put(g, x, y, y < 14 ? 'n' : 'b');
  }
  fill(g, 4, 6, 16, 6, 'c');
  fill(g, 22, 4, 20, 8, 'c');
  fill(g, 8, 12, 32, 5, 'b');
  if (phase % 3 !== 2) {
    const bolts = [
      [26, 14, 24, 22, 22, 30],
      [30, 12, 32, 20, 28, 28],
    ];
    bolts.forEach(([x0, y0, x1, y1, x2, y2]) => {
      line(g, x0, y0, x1, y1, 'y');
      line(g, x1, y1, x2, y2, 'y');
      put(g, x1, y1, 'w');
    });
  }
  for (let x = 0; x < W; x++) {
    put(g, x, 38, 'k');
    put(g, x, 39, 'b');
  }
  fill(g, 0, 40, W, 8, 'k');
  return rows(g);
}

function webFrame(phase: number): string[] {
  const g = blank();
  fill(g, 0, 0, W, H, 'd');
  const cx = 24;
  const cy = 24;
  for (let a = 0; a < 8; a++) {
    const ang = (a / 8) * Math.PI * 2 + phase * 0.08;
    line(g, cx, cy, cx + Math.round(Math.cos(ang) * 20), cy + Math.round(Math.sin(ang) * 20), 'l');
  }
  for (let r = 5; r <= 18; r += 4) circle(g, cx, cy, r, 'p');
  fill(g, 22, 22, 4, 4, 'o');
  put(g, 23, 21, 'k');
  put(g, 25, 21, 'k');
  line(g, 22, 24, 18, 28, 'k');
  line(g, 26, 24, 30, 28, 'k');
  line(g, 24, 26, 24, 32, 'k');
  for (let i = 0; i < 6; i++) {
    const px = 6 + i * 7 + ((phase + i) % 2);
    put(g, px, 8, 'l');
    put(g, W - px, H - 10, 'l');
  }
  return rows(g);
}

function coilFrame(phase: number): string[] {
  const g = blank();
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) put(g, x, y, y > 32 ? 'm' : 'g');
  }
  for (let x = 0; x < W; x++) {
    put(g, x, 34 + (x % 2), 'l');
    put(g, x, 36, 'm');
  }
  const shift = phase % 3;
  const body: [number, number][] = [];
  for (let x = 8; x < 40; x++) {
    const y = 20 + Math.round(Math.sin((x + shift * 4) * 0.28) * 6);
    body.push([x, y]);
  }
  body.forEach(([x, y]) => {
    fill(g, x, y, 3, 3, 'l');
    put(g, x + 1, y, 'y');
  });
  fill(g, 36 + shift, 18 - shift, 5, 4, 'g');
  put(g, 38 + shift, 17 - shift, 'y');
  put(g, 39 + shift, 17 - shift, 'k');
  put(g, 37 + shift, 18 - shift, 'k');
  return rows(g);
}

function diveFrame(phase: number): string[] {
  const g = blank();
  for (let y = 0; y < 18; y++) {
    for (let x = 0; x < W; x++) put(g, x, y, 'g');
  }
  fill(g, 16, 4, 16, 12, 'g');
  fill(g, 20, 6, 8, 8, 'w');
  const sunPulse = phase % 3;
  if (sunPulse === 1) fill(g, 18, 8, 12, 4, 'g');
  for (let y = 18; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const t = (y - 18) / (H - 18);
      put(g, x, y, t < 0.45 ? 'o' : t < 0.7 ? 's' : 'r');
    }
  }
  for (let x = 0; x < W; x++) {
    const cliff = 28 + Math.round(Math.sin(x * 0.22) * 3);
    fill(g, x, cliff, 1, H - cliff, 'r');
    put(g, x, cliff - 1, 's');
  }
  fill(g, 6, 32, 8, 2, 'k');
  fill(g, 34, 30, 6, 2, 'k');
  return rows(g);
}

function billabongFrame(phase: number): string[] {
  const g = blank();
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) put(g, x, y, 'g');
  }
  fill(g, 10, 22, 28, 18, 'd');
  fill(g, 12, 24, 24, 14, 'b');
  fill(g, 14, 26, 20, 10, 'w');
  const ripple = phase % 3;
  circle(g, 24, 30, 6 + ripple, 'b');
  circle(g, 24, 30, 4 + ripple, 'w');
  for (let i = 0; i < 8; i++) {
    const rx = 4 + i * 5;
    fill(g, rx, 14, 2, 14, 'k');
    for (let y = 14; y < 28; y++) put(g, rx, y, y % 4 === 0 ? 'g' : 'd');
  }
  for (let i = 0; i < 8; i++) {
    const rx = W - 6 - i * 5;
    fill(g, rx, 16, 2, 12, 'k');
  }
  put(g, 22, 28, 'k');
  put(g, 26, 29, 'k');
  return rows(g);
}

function infernoFrame(phase: number): string[] {
  const g = blank();
  fill(g, 0, 0, W, H, 'a');
  const flames = [
    { x: 8, h: 18 },
    { x: 18, h: 24 },
    { x: 28, h: 20 },
    { x: 38, h: 16 },
  ];
  flames.forEach(({ x, h }, i) => {
    const flicker = ((phase + i) % 3) - 1;
    const top = H - 10 - h - flicker * 2;
    fill(g, x, top, 4, h + flicker * 2, 'o');
    fill(g, x + 1, top + 2, 2, h - 4, 'y');
    put(g, x + 1, top - 1, 'y');
    put(g, x + 2, top - 2 + (phase % 2), 'w');
  });
  for (let y = H - 10; y < H; y++) {
    for (let x = 0; x < W; x++) put(g, x, y, 'k');
  }
  for (let x = 0; x < W; x += 3) {
    put(g, x + (phase % 3), H - 12, 'r');
  }
  return rows(g);
}

function throneFrame(phase: number): string[] {
  const g = blank();
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const stripe = (Math.floor(x / 5) + Math.floor(y / 5)) % 2 === 0;
      put(g, x, y, stripe ? 's' : 'g');
    }
  }
  fill(g, 14, 18, 20, 16, 'b');
  fill(g, 16, 14, 16, 6, 'b');
  fill(g, 18, 10, 12, 6, 'w');
  fill(g, 20, 8, 8, 4, 'g');
  fill(g, 10, 34, 28, 8, 's');
  fill(g, 16, 26, 16, 10, 'w');
  put(g, 20, 28, 'k');
  put(g, 24, 28, 'k');
  put(g, 22, 30, 'b');
  const glint = phase % 3;
  if (glint !== 2) {
    put(g, 21 + glint, 9, 'w');
    put(g, 26, 12 + glint, 'w');
  }
  return rows(g);
}

function makePreview(
  p: Record<string, string>,
  generator: (phase: number) => string[],
  phases = 3,
  intervalMs = 550,
): BattlegroundPreviewDef {
  const frames = Array.from({ length: phases }, (_, i) => generator(i));
  return { w: W, h: H, p, frames, intervalMs };
}

export const BATTLEGROUND_PREVIEWS: Record<string, BattlegroundPreviewDef> = {
  plain: makePreview({ a: '#E8D9B0', b: '#D4C294', c: '#C4B07A', k: '#8A7A52' }, plainFrame),
  tide: makePreview(
    { s: '#7B8F5A', l: '#3F8A7A', w: '#2E6E8C', d: '#1F4A42', k: '#14120E' },
    tideFrame,
  ),
  foxfire: makePreview(
    { d: '#2A1A12', s: '#3E2A18', k: '#14120E', e: '#E07A2F', g: '#F0C13B', h: '#FFE08A' },
    foxfireFrame,
    3,
    600,
  ),
  storm: makePreview(
    { n: '#1A2748', b: '#2A3F80', c: '#5C8AD6', y: '#F5C518', w: '#FFF4B0', k: '#14120E' },
    stormFrame,
    3,
    480,
  ),
  web: makePreview(
    { d: '#1C1224', p: '#6B3FA0', l: '#9B6FD4', o: '#E07A2F', k: '#14120E' },
    webFrame,
    3,
    700,
  ),
  coil: makePreview(
    { m: '#1E3A2A', g: '#1E6B45', l: '#5CC08A', y: '#F5D547', k: '#14120E' },
    coilFrame,
  ),
  dive: makePreview(
    { g: '#F0C13B', w: '#FFF8DC', o: '#E07A2F', s: '#C4402B', r: '#8A2E1C', k: '#14120E' },
    diveFrame,
    3,
    650,
  ),
  billabong: makePreview(
    { g: '#3E5233', d: '#1A3328', b: '#2E6E8C', w: '#4A8AAA', k: '#14120E' },
    billabongFrame,
  ),
  inferno: makePreview(
    { a: '#2A1410', r: '#B4442B', o: '#FF6B35', y: '#F5C518', w: '#FFF0A8', k: '#14120E' },
    infernoFrame,
    3,
    420,
  ),
  throne: makePreview(
    { s: '#D4B06A', g: '#E8C547', w: '#F5EFE0', b: '#8A6A32', k: '#14120E' },
    throneFrame,
    3,
    620,
  ),
};
