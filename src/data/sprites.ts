export interface SpriteDef {
  p: Record<string, string>;
  d: string[];
}

export const SPRITES: Record<string, SpriteDef> = {
  jorm: {
    p: { k: '#14120E', g: '#1E6B45', l: '#5CC08A', y: '#F5D547', r: '#D9452B' },
    d: [
      '....kkkk....',
      '..kkggggkk..',
      '.kkgllllggk.',
      '.kgll..llgk.',
      '.kgl.kk.lgk.',
      '.kgl.kk.lgk.',
      '.kgll..llgk.',
      '.kkgllllgkk.',
      '..kkggggkk..',
      '...kglgk....',
      '..kgyllygk..',
      '...k.rr.k...',
    ],
  },
  quetz: {
    p: { k: '#14120E', t: '#17B0A0', r: '#D9452B', y: '#F0C13B', w: '#F5EFE0' },
    d: [
      '..y.yyy.y...',
      '..ykyyyky...',
      '...kttttk...',
      '..kttttttk..',
      '..ktwttwtk..',
      '..ktwkkwtk..',
      '..kttrrttk..',
      '...kttttk...',
      '..rkttttkr..',
      '.rrkttttkrr.',
      '..r.kttk.r..',
      '....kttk....',
    ],
  },
  thund: {
    p: { k: '#14120E', b: '#2A3F80', c: '#5C8AD6', y: '#F5C518', w: '#F5EFE0' },
    d: [
      '...k....k...',
      '..kbk..kbk..',
      '.kbbbkkbbbk.',
      'kbbcbbbbcbbk',
      'kbcccwwcccbk',
      '.kbcykkycbk.',
      '..kkybbykk..',
      '....kyyk....',
      '....kbbk....',
      '...kyyyyk...',
      '....kyyk....',
      '.....yy.....',
    ],
  },
  anans: {
    p: { k: '#14120E', p: '#6B3FA0', o: '#E07A2F', w: '#F5EFE0' },
    d: [
      'k..o....o..k',
      '.k.o....o.k.',
      '..koo..ook..',
      '...kppppk...',
      '..kppppppk..',
      '..kpwppwpk..',
      '..kpkppkpk..',
      '...kppppk...',
      '..kop..pok..',
      '.ko.o..o.ok.',
      'ko..o..o..ok',
      'k...o..o...k',
    ],
  },
  bunyi: {
    p: { k: '#14120E', d: '#3E5233', m: '#7B8F5A', w: '#F5EFE0', b: '#2E6E8C', y: '#F5C518' },
    d: [
      '....b..b....',
      '...kddddk...',
      '..kdmmmmdk..',
      '.kdmyddymdk.',
      '.kdmmddmmdk.',
      '.kdwkwwkwdk.',
      '..kdwwwwdk..',
      '..kdmmmmdk..',
      '.kbdmmmmdbk.',
      'kb.kddddk.bk',
      '.b..kddk..b.',
      '..bb.bb.bb..',
    ],
  },
  garud: {
    p: { k: '#14120E', y: '#F0B429', r: '#C4402B', w: '#F5EFE0', o: '#E8862F' },
    d: [
      '....kyyk....',
      '...kywwyk...',
      '..kywkkwyk..',
      '..kyykkyyk..',
      '...kyooyk...',
      'rk.kyyyyk.kr',
      'rrkyyyyyykrr',
      'rrkyooooykrr',
      '.rkyyooyykr.',
      '..kyyyyyyk..',
      '...kyyyyk...',
      '...k.oo.k...',
    ],
  },
  kitsu: {
    p: { k: '#14120E', o: '#E2762C', w: '#F5EFE0', b: '#4C9BD1', y: '#F0C13B' },
    d: [
      '.b........b.',
      '..koo..ook..',
      '..kowoowok..',
      '.kooooooook.',
      '.kokyooykok.',
      '.kooowwoook.',
      '..kowwwwok..',
      '..kkowwokk..',
      'www.kkkk.www',
      'wwww.kk.wwww',
      '.wwwwwwwwww.',
      '..wkwwwwkw..',
    ],
  },
  ifrit: {
    p: { k: '#14120E', r: '#C4302B', o: '#E8862F', y: '#F5C518', w: '#F5EFE0' },
    d: [
      '....y..y....',
      '...yy..yy...',
      '..kyo..oyk..',
      '..kroooork..',
      '.kroyyyyork.',
      '.kroykkyork.',
      '.krooyyoork.',
      '..kroooork..',
      'y.kkroorkk.y',
      'yy.krrrrk.yy',
      '.y.korrok.y.',
      '..y.kook.y..',
    ],
  },
  zirni: {
    p: { k: '#14120E', g: '#2F7A3E', l: '#6FBF62', r: '#C4402B', y: '#F5D547' },
    d: [
      '.gk..gk..gk.',
      'gyg.gyg.gyg.',
      'kgk.kgk.kgk.',
      '.rk..rk..rk.',
      '..kgllllgk..',
      '.kgllllllgk.',
      '.kgllllllgk.',
      '..kgllllgk..',
      '..kggllggk..',
      '...kggggk...',
      '..kg.kk.gk..',
      '.kk......kk.',
    ],
  },
  taniw: {
    p: { k: '#14120E', t: '#1F7A8C', c: '#3FB3A6', w: '#F5EFE0', b: '#2E5E8C', y: '#F5C518' },
    d: [
      '..b..bb..b..',
      '...kttttk...',
      '..ktcccctk..',
      '.ktcyttyctk.',
      '.ktccttcctk.',
      '.ktwwwwwwtk.',
      '..ktwwwwtk..',
      '..kctttcck..',
      '.bkcttttckb.',
      'b.kcttttckb.',
      '.b.ktttk.b..',
      '..bb.bb.bb..',
    ],
  },
  anzuu: {
    p: { k: '#14120E', n: '#C9A227', b: '#2E4A8C', w: '#F5EFE0', r: '#C4402B' },
    d: [
      '....knnk....',
      '...knnnnk...',
      '..knwnnwnk..',
      '..knnkknnk..',
      '...knrrnk...',
      'bbknnnnnnkbb',
      'bbbknnnnkbbb',
      '.bbknnnnkbb.',
      '..bknnnnkb..',
      '...knnnnk...',
      '...kn..nk...',
      '..kn....nk..',
    ],
  },
  sphin: {
    p: { k: '#14120E', s: '#D9B26A', b: '#2E6E8C', y: '#F0C13B', w: '#F5EFE0' },
    d: [
      '...kbbbbk...',
      '..kbybybyk..',
      '..kbssssbk..',
      '.kbswsswsbk.',
      '.kbssssssbk.',
      '.kbsskkssbk.',
      '..kbssssbk..',
      '...kbbbbk...',
      '..kssssssk..',
      '.ksssssssssk',
      'ks..ssss..sk',
      'kk..k..k..kk',
    ],
  },
};

const cache: Record<string, string> = {};

export function spriteCss(id: string): string {
  const s = SPRITES[id];
  if (!s) return '';
  if (cache[id]) return cache[id];

  const cv = document.createElement('canvas');
  cv.width = 12;
  cv.height = 12;
  const cx = cv.getContext('2d');
  if (!cx) return '';

  s.d.forEach((row, y) => {
    for (let x = 0; x < 12; x++) {
      const ch = row[x];
      if (!ch || ch === '.') continue;
      const col = s.p[ch];
      if (!col) continue;
      cx.fillStyle = col;
      cx.fillRect(x, y, 1, 1);
    }
  });

  cache[id] = cv.toDataURL();
  return cache[id];
}
