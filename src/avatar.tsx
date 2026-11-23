// Avatares originales dibujados en SVG, totalmente personalizables.
import type { JSX } from 'preact';

export interface AvatarSpec {
  skin: number;
  hair: number;
  hairColor: number;
  eyes: number;
  mouth: number;
  acc: number;
  bg: number;
  shirt: number;
}

export const SKINS = ['#ffe0c7', '#f6c9a3', '#e0a77c', '#c68456', '#9a5f3a', '#6b4029'];
export const HAIR_COLORS = ['#2b1d16', '#6b3e1f', '#c8873d', '#f2d06b', '#b23a2a', '#8e8e9a', '#7a4cf0', '#ff6fae'];
export const PALETTE = ['#ff5d73', '#ff9f43', '#ffd23f', '#3ddc84', '#1fc8db', '#4d7cff', '#8c5bff', '#ff6fd8', '#00b894', '#ff7675'];
export const HAIR_NAMES = ['Pelado', 'Corto', 'Rulos', 'Largo', 'Colitas', 'Rodete', 'Puntas', 'Flequillo'];
export const EYE_NAMES = ['Normal', 'Feliz', 'Guiño', 'Lentes de sol', 'Brillosos'];
export const MOUTH_NAMES = ['Sonrisa', 'Dientes', 'Carcajada', 'Lengua', 'Pícaro'];
export const ACC_NAMES = ['Nada', 'Anteojos', 'Corona', 'Moño', 'Auriculares', 'Cachetes', 'Gorra', 'Orejas de gato'];

export const AVATAR_OPTIONS = {
  skin: SKINS.length,
  hair: HAIR_NAMES.length,
  hairColor: HAIR_COLORS.length,
  eyes: EYE_NAMES.length,
  mouth: MOUTH_NAMES.length,
  acc: ACC_NAMES.length,
  bg: PALETTE.length,
  shirt: PALETTE.length
};

const r = (n: number) => Math.floor(Math.random() * n);
export function randomAvatar(): AvatarSpec {
  return {
    skin: r(SKINS.length), hair: r(HAIR_NAMES.length), hairColor: r(HAIR_COLORS.length), eyes: r(EYE_NAMES.length),
    mouth: r(MOUTH_NAMES.length), acc: r(ACC_NAMES.length), bg: r(PALETTE.length), shirt: r(PALETTE.length)
  };
}

function shade(hex: string, amt: number) {
  const n = parseInt(hex.slice(1), 16);
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v + amt * 255)));
  const rr = c((n >> 16) & 255), gg = c((n >> 8) & 255), bb = c(n & 255);
  return '#' + ((1 << 24) | (rr << 16) | (gg << 8) | bb).toString(16).slice(1);
}

let idCounter = 0;

export function Avatar({ spec, size = 64, ring, class: cls }: { spec: AvatarSpec; size?: number; ring?: string; class?: string }) {
  const id = `av${idCounter++}`;
  const skin = SKINS[spec.skin % SKINS.length];
  const skinD = shade(skin, -0.1);
  const hc = HAIR_COLORS[spec.hairColor % HAIR_COLORS.length];
  const hcD = shade(hc, -0.12);
  const bg = PALETTE[spec.bg % PALETTE.length];
  const shirt = PALETTE[spec.shirt % PALETTE.length];
  const ink = '#2a1a3a';

  // Pelo detrás de la cabeza
  const hairBack: Record<number, JSX.Element | null> = {
    3: <path d="M24 44 C22 70 26 84 30 88 L70 88 C74 84 78 70 76 44 Z" fill={hcD} />,
    4: (
      <g fill={hc}>
        <circle cx="21" cy="52" r="9" />
        <circle cx="79" cy="52" r="9" />
        <circle cx="18" cy="64" r="7" />
        <circle cx="82" cy="64" r="7" />
      </g>
    ),
    5: <circle cx="50" cy="16" r="10" fill={hc} />,
    7: <path d="M25 44 C24 62 27 70 30 72 L70 72 C73 70 76 62 75 44 Z" fill={hcD} />
  };

  // Pelo encima
  const hairFront: Record<number, JSX.Element | null> = {
    0: null,
    1: <path d="M26 42 C26 22 40 18 50 18 C62 18 75 23 74 42 C68 34 58 31 50 32 C42 31 32 34 26 42 Z" fill={hc} />,
    2: (
      <g fill={hc}>
        {[[30, 30], [38, 22], [50, 19], [62, 22], [70, 30], [26, 40], [74, 40], [44, 26], [56, 26]].map(([x, y]) => (
          <circle cx={x} cy={y} r="9" />
        ))}
      </g>
    ),
    3: <path d="M25 46 C24 24 38 18 50 18 C64 18 76 24 75 46 C70 34 62 29 54 30 C50 34 40 36 30 38 C28 41 26 43 25 46 Z" fill={hc} />,
    4: <path d="M26 42 C26 22 40 18 50 18 C62 18 75 23 74 42 C66 32 58 30 50 30 C42 30 33 33 26 42 Z" fill={hc} />,
    5: <path d="M26 42 C26 24 40 20 50 20 C62 20 75 25 74 42 C67 33 58 31 50 31 C42 31 32 34 26 42 Z" fill={hc} />,
    6: <path d="M26 42 L28 22 L36 30 L40 14 L48 27 L54 12 L60 27 L66 16 L68 30 L75 24 L74 42 C66 34 58 32 50 32 C42 32 33 35 26 42 Z" fill={hc} />,
    7: <path d="M24 48 C22 24 38 17 50 17 C63 17 78 24 76 48 C74 42 72 38 70 37 L30 37 C28 38 26 42 24 48 Z" fill={hc} />
  };

  const eyesY = 47;
  const eyes: Record<number, JSX.Element> = {
    0: (
      <g fill={ink}>
        <ellipse cx="41" cy={eyesY} rx="3" ry="3.6" />
        <ellipse cx="59" cy={eyesY} rx="3" ry="3.6" />
        <circle cx="42" cy={eyesY - 1.3} r="1" fill="#fff" />
        <circle cx="60" cy={eyesY - 1.3} r="1" fill="#fff" />
      </g>
    ),
    1: (
      <g stroke={ink} stroke-width="2.6" fill="none" stroke-linecap="round">
        <path d={`M37 ${eyesY + 1} Q41 ${eyesY - 4} 45 ${eyesY + 1}`} />
        <path d={`M55 ${eyesY + 1} Q59 ${eyesY - 4} 63 ${eyesY + 1}`} />
      </g>
    ),
    2: (
      <g>
        <ellipse cx="41" cy={eyesY} rx="3" ry="3.6" fill={ink} />
        <circle cx="42" cy={eyesY - 1.3} r="1" fill="#fff" />
        <path d={`M55 ${eyesY} Q59 ${eyesY + 3} 63 ${eyesY}`} stroke={ink} stroke-width="2.6" fill="none" stroke-linecap="round" />
      </g>
    ),
    3: (
      <g>
        <path d={`M32 ${eyesY - 5} L68 ${eyesY - 5} L66 ${eyesY + 3} Q60 ${eyesY + 7} 54 ${eyesY + 2} L46 ${eyesY + 2} Q40 ${eyesY + 7} 34 ${eyesY + 3} Z`} fill="#1b1030" />
        <path d={`M36 ${eyesY - 3} L42 ${eyesY - 3}`} stroke="#fff" stroke-opacity=".6" stroke-width="1.6" stroke-linecap="round" />
        <path d={`M56 ${eyesY - 3} L62 ${eyesY - 3}`} stroke="#fff" stroke-opacity=".6" stroke-width="1.6" stroke-linecap="round" />
      </g>
    ),
    4: (
      <g>
        <ellipse cx="41" cy={eyesY} rx="4.4" ry="5.2" fill={ink} />
        <ellipse cx="59" cy={eyesY} rx="4.4" ry="5.2" fill={ink} />
        <circle cx="42.6" cy={eyesY - 2} r="1.8" fill="#fff" />
        <circle cx="60.6" cy={eyesY - 2} r="1.8" fill="#fff" />
        <circle cx="39.6" cy={eyesY + 2} r=".9" fill="#fff" />
        <circle cx="57.6" cy={eyesY + 2} r=".9" fill="#fff" />
      </g>
    )
  };

  const my = 58;
  const mouths: Record<number, JSX.Element> = {
    0: <path d={`M43 ${my} Q50 ${my + 6} 57 ${my}`} stroke={ink} stroke-width="2.6" fill="none" stroke-linecap="round" />,
    1: (
      <g>
        <path d={`M41 ${my - 1} Q50 ${my + 10} 59 ${my - 1} Z`} fill={ink} />
        <path d={`M43 ${my} L57 ${my} L56 ${my + 2.4} L44 ${my + 2.4} Z`} fill="#fff" />
      </g>
    ),
    2: (
      <g>
        <path d={`M41 ${my - 2} Q50 ${my + 13} 59 ${my - 2} Z`} fill={ink} />
        <ellipse cx="50" cy={my + 5} rx="4.5" ry="2.6" fill="#ff7a8a" />
      </g>
    ),
    3: (
      <g>
        <path d={`M43 ${my} Q50 ${my + 6} 57 ${my}`} stroke={ink} stroke-width="2.6" fill="none" stroke-linecap="round" />
        <path d={`M47 ${my + 2.5} Q50 ${my + 10} 54 ${my + 2.5} Z`} fill="#ff6b81" />
      </g>
    ),
    4: <path d={`M44 ${my + 1} Q52 ${my + 4} 58 ${my - 2}`} stroke={ink} stroke-width="2.6" fill="none" stroke-linecap="round" />
  };

  const accs: Record<number, JSX.Element | null> = {
    0: null,
    1: (
      <g stroke={ink} stroke-width="2" fill="rgba(255,255,255,.25)">
        <circle cx="41" cy={eyesY} r="7" />
        <circle cx="59" cy={eyesY} r="7" />
        <path d={`M48 ${eyesY} L52 ${eyesY}`} />
      </g>
    ),
    2: (
      <g>
        <path d="M34 22 L38 8 L45 17 L50 5 L55 17 L62 8 L66 22 Z" fill="#ffd23f" stroke="#e0a400" stroke-width="1.5" stroke-linejoin="round" />
        <circle cx="50" cy="15" r="2.2" fill="#ff5d73" />
      </g>
    ),
    3: (
      <g fill="#ff5d9e">
        <path d="M60 22 L74 14 L74 30 Z" />
        <path d="M60 22 L46 14 L46 30 Z" />
        <circle cx="60" cy="22" r="3.4" fill="#ff86b6" />
      </g>
    ),
    4: (
      <g>
        <path d="M24 46 C24 18 76 18 76 46" stroke="#2f2f45" stroke-width="5" fill="none" />
        <rect x="18" y="40" width="10" height="16" rx="4" fill="#ff5d73" />
        <rect x="72" y="40" width="10" height="16" rx="4" fill="#ff5d73" />
      </g>
    ),
    5: (
      <g fill="#ff6f91" opacity=".55">
        <ellipse cx="34" cy="55" rx="5" ry="3.4" />
        <ellipse cx="66" cy="55" rx="5" ry="3.4" />
      </g>
    ),
    6: (
      <g>
        <path d="M25 36 C25 18 75 18 75 36 Z" fill={shirt} />
        <path d="M50 36 L50 20" stroke="rgba(0,0,0,.15)" stroke-width="1.5" />
        <path d="M60 33 L86 36 C86 40 70 40 62 38 Z" fill={shade(shirt, -0.12)} />
        <circle cx="50" cy="19" r="2.4" fill={shade(shirt, -0.2)} />
      </g>
    ),
    7: (
      <g>
        <path d="M27 32 L28 12 L44 24 Z" fill={hc} />
        <path d="M73 32 L72 12 L56 24 Z" fill={hc} />
        <path d="M30 27 L31 17 L39 24 Z" fill="#ffb3c7" />
        <path d="M70 27 L69 17 L61 24 Z" fill="#ffb3c7" />
      </g>
    )
  };

  const ringW = ring ? 4 : 0;
  return (
    <svg class={cls} width={size} height={size} viewBox="0 0 100 100" role="img" aria-hidden="true" style={{ display: 'block', flex: 'none' }}>
      <defs>
        <clipPath id={`${id}c`}>
          <circle cx="50" cy="50" r={50 - ringW} />
        </clipPath>
        <radialGradient id={`${id}g`} cx="35%" cy="30%" r="80%">
          <stop offset="0" stop-color={shade(bg, 0.15)} />
          <stop offset="1" stop-color={shade(bg, -0.12)} />
        </radialGradient>
      </defs>
      {ring && <circle cx="50" cy="50" r="50" fill={ring} />}
      <g clip-path={`url(#${id}c)`}>
        <rect width="100" height="100" fill={`url(#${id}g)`} />
        <circle cx="20" cy="18" r="10" fill="#fff" opacity=".12" />
        <circle cx="84" cy="80" r="16" fill="#fff" opacity=".08" />
        {hairBack[spec.hair] ?? null}
        {/* cuerpo */}
        <path d="M18 104 C18 80 32 72 50 72 C68 72 82 80 82 104 Z" fill={shirt} />
        <path d="M40 73 Q50 82 60 73" fill={skinD} />
        <rect x="44" y="64" width="12" height="10" rx="4" fill={skinD} />
        {/* orejas */}
        <circle cx="26" cy="49" r="5" fill={skinD} />
        <circle cx="74" cy="49" r="5" fill={skinD} />
        {/* cabeza */}
        <ellipse cx="50" cy="46" rx="24" ry="25" fill={skin} />
        <ellipse cx="44" cy="36" rx="12" ry="7" fill="#fff" opacity=".12" />
        {hairFront[spec.hair] ?? null}
        {eyes[spec.eyes] ?? eyes[0]}
        {mouths[spec.mouth] ?? mouths[0]}
        {accs[spec.acc] ?? null}
      </g>
    </svg>
  );
}
