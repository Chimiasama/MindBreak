import { CharacterId, EnemyType } from './types';

type PaletteMap = Record<string, string>;

const cache = new Map<string, HTMLCanvasElement>();

function bakePixelSprite(key: string, rows: string[], palette: PaletteMap, pixelScale = 2): HTMLCanvasElement {
  const cached = cache.get(key);
  if (cached) return cached;

  const height = rows.length;
  const width = rows[0]?.length ?? 1;
  const off = document.createElement('canvas');
  off.width = width * pixelScale;
  off.height = height * pixelScale;
  const octx = off.getContext('2d');
  if (octx) {
    octx.imageSmoothingEnabled = false;
    for (let y = 0; y < height; y++) {
      const row = rows[y];
      for (let x = 0; x < row.length; x++) {
        const ch = row[x];
        if (ch === '.' || !palette[ch]) continue;
        octx.fillStyle = palette[ch];
        octx.fillRect(x * pixelScale, y * pixelScale, pixelScale, pixelScale);
      }
    }
  }
  cache.set(key, off);
  return off;
}

const REN_IDLE_ROWS = [
  '....MMMMMM......',
  '...MMmMMMmM.....',
  '..MMmMMMMMmM....',
  '...SSSCCSSS.....',
  '...KKKKKKKK.....',
  '..KKKKKKKKKK....',
  '..KKKJJJJKKK....',
  '..JJJJJJJJJJ....',
  '..JJJCCCCJJJ....',
  '..JJJJJJJJJJ....',
  '...JJJJJJJJ.....',
  '...JJJJJJJJ.....',
  '...PPPPPPPP.....',
  '...PPP..PPP.....',
  '...PPP..PPP.....',
  '...PPP..PPP.....',
  '...BBB..BBB.....',
  '..BBBB..BBBB....',
];

const MAYA_IDLE_ROWS = [
  '...GGGGGGGG.....',
  '..GGgGGGGgGG....',
  '..GGSSSSSSGG....',
  '..GGSSCCSSGG....',
  '...GSSSSSSG.....',
  '...TTTTTTTT.....',
  '..TTTTGGTTTT....',
  '..TTTTTTGGTT....',
  '...TTTTTTTT.....',
  '...TTTTTTTT.....',
  '...SSSSSSSS.....',
  '...SS....SS.....',
  '...WW....WW.....',
  '...WW....WW.....',
  '...WW....WW.....',
  '...BB....BB.....',
  '..BBB....BBB....',
];

const LEON_IDLE_ROWS = [
  '....BBBBBB......',
  '...BBBBBBBB.....',
  '...SSSSSSSS.....',
  '...SSSYYSSS.....',
  '..SSSSSSSSSS....',
  '.RRRRRRRRRRRR...',
  '.RRRRRRRRRRRR...',
  '.SSRRRRRRRRSS...',
  '.FFRRRRRRRRFF...',
  '.FF.RRRRRR.FF...',
  '....PPPPPP......',
  '...PPPPPPPP.....',
  '...PPP..PPP.....',
  '...PPP..PPP.....',
  '...PPP..PPP.....',
  '...DDD..DDD.....',
  '..DDDD..DDDD....',
];

const MIB_ROWS = [
  '....KKKKKK......',
  '...KKKKKKKK.....',
  '...SSSSSSSS.....',
  '...SSCCCCSS.....',
  '....SSSSSS......',
  '...KKWRRWKK.....',
  '..KKKKRRKKKK....',
  '..KKKKRRKKKK....',
  '..SSKKKKKKSS....',
  '...KKKKKKKK.....',
  '...KKKKKKKK.....',
  '...KKK..KKK.....',
  '...KKK..KKK.....',
  '...KKK..KKK.....',
  '...BBB..BBB.....',
  '..BBBB..BBBB....',
];

const HOUND_ROWS = [
  '............KKKK',
  '..........KKKRRK',
  '..KKKKKKKKKKKKK.',
  '.KKKKKKKKKKKKK..',
  '.KK.KK....KK.KK.',
  '.KK.KK....KK.KK.',
  '.BB.BB....BB.BB.',
];

const DRONE_ROWS = [
  '..DDDDDD..',
  '.DDDDDDDD.',
  '.DDRRRRDDD',
  '.DDDDDDDD.',
  '..DD..DD..',
];

const SAMURAI_ROWS = [
  '..GGGGGGGG..',
  '.RRRRRRRRRR.',
  '..SSSSSSSS..',
  '..SSGGGGSS..',
  '..RRRRRRRR..',
  '.RRRRCCRRRR.',
  '.RRRRRRRRRR.',
  '..RRRRRRRR..',
  '..KKK..KKK..',
  '..KKK..KKK..',
  '..BBB..BBB..',
];

export function getHeroPixelSprite(charId: CharacterId): HTMLCanvasElement {
  if (charId === 'ren') {
    return bakePixelSprite(
      'hero_ren',
      REN_IDLE_ROWS,
      {
        M: '#ff007f',
        m: '#be185d',
        S: '#fed7aa',
        C: '#00f0ff',
        K: '#09090b',
        J: '#27272a',
        P: '#18181b',
        B: '#020617',
      },
      2.4
    );
  }
  if (charId === 'maya') {
    return bakePixelSprite(
      'hero_maya',
      MAYA_IDLE_ROWS,
      {
        G: '#facc15',
        g: '#ca8a04',
        S: '#fed7aa',
        C: '#00f0ff',
        T: '#0f766e',
        W: '#f8fafc',
        B: '#1e293b',
      },
      2.4
    );
  }
  return bakePixelSprite(
    'hero_leon',
    LEON_IDLE_ROWS,
    {
      B: '#451a03',
      S: '#fdba74',
      Y: '#38bdf8',
      R: '#991b1b',
      F: '#f97316',
      P: '#1e293b',
      D: '#09090b',
    },
    2.5
  );
}

export function getEnemyPixelSprite(type: EnemyType): HTMLCanvasElement {
  if (type === 'cyber_hound') {
    return bakePixelSprite(
      'enemy_hound',
      HOUND_ROWS,
      { K: '#1e293b', R: '#ef4444', B: '#475569' },
      2.6
    );
  }
  if (type === 'drone') {
    return bakePixelSprite(
      'enemy_drone',
      DRONE_ROWS,
      { D: '#334155', R: '#ef4444' },
      2.0
    );
  }
  if (type === 'samurai') {
    return bakePixelSprite(
      'enemy_samurai',
      SAMURAI_ROWS,
      { G: '#facc15', R: '#991b1b', S: '#fed7aa', C: '#34d399', K: '#1e293b', B: '#09090b' },
      2.8
    );
  }
  const tieColor = type === 'mutant' ? '#4ade80' : type === 'heavy_trooper' ? '#38bdf8' : '#ef4444';
  const suitColor = type === 'mutant' ? '#166534' : type === 'heavy_trooper' ? '#334155' : '#09090b';
  return bakePixelSprite(
    `enemy_${type}`,
    MIB_ROWS,
    {
      K: suitColor,
      S: type === 'mutant' ? '#86efac' : '#fed7aa',
      C: type === 'sniper' ? '#ff007f' : '#00f0ff',
      W: '#f8fafc',
      R: tieColor,
      B: '#020617',
    },
    2.4
  );
}
