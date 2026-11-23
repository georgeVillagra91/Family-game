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
  /** Barba o bigote (perfiles viejos no lo tienen: vale 0). */
  beard?: number;
}

export const SKINS = ['#ffe0c7', '#f6c9a3', '#e0a77c', '#c68456', '#9a5f3a', '#6b4029'];
export const HAIR_COLORS = ['#2b1d16', '#6b3e1f', '#a86a32', '#e8c066', '#b23a2a', '#9a9aa6', '#7a4cf0', '#ff6fae'];
export const PALETTE = ['#ff1f3d', '#ff6a00', '#ffffff', '#1ed760', '#00b894', '#b5001c', '#a259ff', '#ff4fb8', '#1a1a22', '#ffd23f'];
export const HAIR_NAMES = ['Pelado', 'Corto', 'Rulos', 'Largo lacio', 'Colitas', 'Rodete', 'Puntas', 'Flequillo', 'Largo ondulado', 'Trenza', 'Melena', 'Cola de caballo', 'Al costado', 'Rapado', 'Largo con flequillo'];
export const EYE_NAMES = ['Normal', 'Feliz', 'Guiño', 'Lentes de sol', 'Brillosos', 'Pestañas'];
export const MOUTH_NAMES = ['Sonrisa', 'Dientes', 'Carcajada', 'Lengua', 'Pícaro', 'Labios'];
export const ACC_NAMES = ['Nada', 'Anteojos', 'Corona', 'Moño', 'Auriculares', 'Cachetes', 'Gorra', 'Orejas de gato', 'Vincha', 'Aros'];
export const BEARD_NAMES = ['Sin barba', 'Barba de días', 'Barba corta', 'Barba tupida', 'Bigote', 'Candado'];

export const AVATAR_OPTIONS = {
  skin: SKINS.length,
  hair: HAIR_NAMES.length,
  hairColor: HAIR_COLORS.length,
  eyes: EYE_NAMES.length,
  mouth: MOUTH_NAMES.length,
  acc: ACC_NAMES.length,
  bg: PALETTE.length,
  shirt: PALETTE.length,
  beard: BEARD_NAMES.length
};

const r = (n: number) => Math.floor(Math.random() * n);
export function randomAvatar(): AvatarSpec {
  return {
    skin: r(SKINS.length), hair: r(HAIR_NAMES.length), hairColor: r(HAIR_COLORS.length), eyes: r(EYE_NAMES.length),
    mouth: r(MOUTH_NAMES.length), acc: r(ACC_NAMES.length), bg: r(PALETTE.length), shirt: r(PALETTE.length),
    beard: Math.random() < 0.25 ? 1 + r(BEARD_NAMES.length - 1) : 0
  };
}

function shade(hex: string, amt: number) {
  const n = parseInt(hex.slice(1), 16);
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v + amt * 255)));
  const rr = c((n >> 16) & 255), gg = c((n >> 8) & 255), bb = c(n & 255);
  return '#' + ((1 << 24) | (rr << 16) | (gg << 8) | bb).toString(16).slice(1);
}
const isLight = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return ((n >> 16) & 255) * 0.3 + ((n >> 8) & 255) * 0.59 + (n & 255) * 0.11 > 200;
};

let idCounter = 0;

export function Avatar({ spec, size = 64, ring, class: cls }: { spec: AvatarSpec; size?: number; ring?: string; class?: string }) {
  const id = `av${idCounter++}`;
  const skin = SKINS[spec.skin % SKINS.length];
  const skinD = shade(skin, -0.1);
  const skinDD = shade(skin, -0.2);
  const hc = HAIR_COLORS[spec.hairColor % HAIR_COLORS.length];
  const hcD = shade(hc, -0.14);
  const hcL = shade(hc, 0.16);
  const bg = PALETTE[spec.bg % PALETTE.length];
  const shirt = PALETTE[spec.shirt % PALETTE.length];
  const shirtD = shade(shirt, -0.16);
  const ink = '#2a1a22';
  const H = `url(#${id}h)`;
  const hair = spec.hair % HAIR_NAMES.length;
  const beard = (spec.beard ?? 0) % BEARD_NAMES.length;
  const brow = hair === 0 && beard === 0 ? shade(skin, -0.35) : shade(hc, -0.08);

  // Pelo detrás de la cabeza y la espalda
  const longBack = <path d="M23 42 C19 64 22 84 15 104 L85 104 C78 84 81 64 77 42 C76 26 64 17 50 17 C36 17 24 26 23 42 Z" fill={hcD} />;
  const wavyBack = (
    <path
      d="M23 42 C17 54 24 62 18 72 C13 82 22 90 14 104 L86 104 C78 90 87 82 82 72 C76 62 83 54 77 42 C76 26 64 17 50 17 C36 17 24 26 23 42 Z"
      fill={hcD}
    />
  );
  const hairBack: Record<number, JSX.Element | null> = {
    3: longBack,
    4: (
      <g fill={H}>
        <path d="M22 44 C10 46 8 62 14 74 C16 66 20 60 26 56 Z" />
        <path d="M78 44 C90 46 92 62 86 74 C84 66 80 60 74 56 Z" />
        <circle cx="23" cy="45" r="4" fill="#ff1f3d" />
        <circle cx="77" cy="45" r="4" fill="#ff1f3d" />
      </g>
    ),
    5: (
      <g>
        <circle cx="50" cy="15" r="11" fill={H} />
        <path d="M43 12 Q50 8 57 12" stroke={hcL} stroke-width="1.6" fill="none" stroke-linecap="round" opacity=".7" />
      </g>
    ),
    7: <path d="M25 44 C24 62 27 70 30 72 L70 72 C73 70 76 62 75 44 Z" fill={hcD} />,
    8: wavyBack,
    9: <path d="M24 44 C22 58 25 66 29 70 L71 70 C75 66 78 58 76 44 Z" fill={hcD} />,
    10: <path d="M23 42 C21 56 22 68 26 74 L74 74 C78 68 79 56 77 42 C76 26 64 17 50 17 C36 17 24 26 23 42 Z" fill={hcD} />,
    11: <path d="M70 26 C88 28 92 46 86 64 C84 72 80 80 82 90 C74 84 72 72 76 60 C79 50 78 38 70 32 Z" fill={H} />,
    14: longBack
  };

  // Mechones largos que caen sobre los hombros (se dibujan encima de la remera)
  const shoulderLocks: Record<number, JSX.Element | null> = {
    3: (
      <g fill={H}>
        <path d="M27 44 C22 62 25 80 19 98 C26 100 33 97 35 91 C31 76 31 60 33 48 Z" />
        <path d="M73 44 C78 62 75 80 81 98 C74 100 67 97 65 91 C69 76 69 60 67 48 Z" />
      </g>
    ),
    8: (
      <g fill={H}>
        <path d="M27 44 C20 54 28 62 23 72 C18 82 26 90 20 98 C28 100 34 96 35 90 C33 82 37 76 33 68 C30 60 34 54 33 48 Z" />
        <path d="M73 44 C80 54 72 62 77 72 C82 82 74 90 80 98 C72 100 66 96 65 90 C67 82 63 76 67 68 C70 60 66 54 67 48 Z" />
      </g>
    ),
    9: (
      <g>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <ellipse cx={70 + i * 1.2} cy={62 + i * 7} rx={6 - i * 0.35} ry="4.6" fill={i % 2 ? hc : hcL} stroke={hcD} stroke-width="1" transform={`rotate(${i % 2 ? 25 : -25} ${70 + i * 1.2} ${62 + i * 7})`} />
        ))}
        <rect x="72" y="98" width="8" height="4" rx="2" fill="#ff1f3d" />
      </g>
    ),
    14: (
      <g fill={H}>
        <path d="M27 44 C22 62 25 80 19 98 C26 100 33 97 35 91 C31 76 31 60 33 48 Z" />
        <path d="M73 44 C78 62 75 80 81 98 C74 100 67 97 65 91 C69 76 69 60 67 48 Z" />
      </g>
    )
  };

  // Pelo encima
  const topLong = (
    <g>
      <path d="M25 48 C23 24 38 17 50 17 C64 17 77 24 75 48 C72 38 66 31 58 29 C52 34 40 37 31 38 C28 41 26 44 25 48 Z" fill={H} />
      <path d="M58 29 C54 31 50 33 46 34" stroke={hcD} stroke-width="1.2" fill="none" opacity=".6" />
    </g>
  );
  const hairFront: Record<number, JSX.Element | null> = {
    0: null,
    1: <path d="M26 42 C26 22 40 18 50 18 C62 18 75 23 74 42 C68 34 58 31 50 32 C42 31 32 34 26 42 Z" fill={H} />,
    2: (
      <g fill={H} stroke={hcD} stroke-width=".8">
        {[[30, 32], [37, 24], [50, 20], [63, 24], [70, 32], [26, 41], [74, 41], [44, 26], [56, 26]].map(([x, y]) => (
          <circle cx={x} cy={y} r="8.6" />
        ))}
      </g>
    ),
    3: topLong,
    4: <path d="M26 42 C26 22 40 18 50 18 C62 18 75 23 74 42 C66 32 58 30 50 30 C42 30 33 33 26 42 Z" fill={H} />,
    5: <path d="M26 42 C26 24 40 20 50 20 C62 20 75 25 74 42 C67 33 58 31 50 31 C42 31 32 34 26 42 Z" fill={H} />,
    6: <path d="M26 42 L28 22 L36 30 L40 14 L48 27 L54 12 L60 27 L66 16 L68 30 L75 24 L74 42 C66 34 58 32 50 32 C42 32 33 35 26 42 Z" fill={H} />,
    7: <path d="M24 48 C22 24 38 17 50 17 C63 17 78 24 76 48 C74 42 72 38 70 37 L30 37 C28 38 26 42 24 48 Z" fill={H} />,
    8: topLong,
    9: <path d="M26 44 C25 23 39 18 50 18 C62 18 76 23 74 44 C70 34 62 30 50 30 C40 30 31 34 26 44 Z" fill={H} />,
    10: <path d="M24 52 C22 26 37 18 50 18 C63 18 78 26 76 52 C75 44 73 40 71 39 C62 36 38 36 29 39 C27 40 25 44 24 52 Z" fill={H} />,
    11: (
      <g>
        <path d="M26 44 C25 23 39 18 50 18 C62 18 76 23 74 44 C70 34 62 30 50 30 C40 30 31 34 26 44 Z" fill={H} />
        <circle cx="71" cy="28" r="3.4" fill="#ff1f3d" />
      </g>
    ),
    12: <path d="M26 44 C24 24 38 18 52 18 C66 18 77 26 74 44 C72 36 68 32 62 30 C54 28 44 31 34 33 C30 36 27 40 26 44 Z" fill={H} />,
    13: <path d="M26.5 42 C27 25 38 21 50 21 C62 21 73 25 73.5 42 C68 34 60 31.5 50 31.5 C40 31.5 32 34 26.5 42 Z" fill={hc} opacity=".55" />,
    14: <path d="M25 48 C23 24 38 17 50 17 C64 17 77 24 75 48 C73 42 71 39 69 38 C60 40 40 40 31 38 C29 39 27 42 25 48 Z" fill={H} />
  };
  // brillo del pelo
  const shine = hair !== 0 && hair !== 13 && hair !== 2 ? <path d="M36 25 Q44 20 54 21" stroke={hcL} stroke-width="2.2" fill="none" stroke-linecap="round" opacity=".55" /> : null;

  const eyesY = 47;
  const iris = '#5a3824';
  const openEye = (cx: number) => (
    <g>
      <ellipse cx={cx} cy={eyesY} rx="4.4" ry="4.8" fill="#fff" />
      <circle cx={cx + 0.4} cy={eyesY + 0.4} r="3.1" fill={iris} />
      <circle cx={cx + 0.4} cy={eyesY + 0.4} r="1.7" fill="#120a0a" />
      <circle cx={cx + 1.6} cy={eyesY - 1.2} r="1.1" fill="#fff" />
      <path d={`M${cx - 4.6} ${eyesY - 1.6} Q${cx} ${eyesY - 6.4} ${cx + 4.6} ${eyesY - 1.6}`} stroke={ink} stroke-width="1.4" fill="none" stroke-linecap="round" />
    </g>
  );
  const eyes: Record<number, JSX.Element> = {
    0: (
      <g>
        {openEye(41)}
        {openEye(59)}
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
        {openEye(41)}
        <path d={`M55 ${eyesY} Q59 ${eyesY + 3} 63 ${eyesY}`} stroke={ink} stroke-width="2.6" fill="none" stroke-linecap="round" />
      </g>
    ),
    3: (
      <g>
        <path d={`M32 ${eyesY - 5} L68 ${eyesY - 5} L66 ${eyesY + 3} Q60 ${eyesY + 7} 54 ${eyesY + 2} L46 ${eyesY + 2} Q40 ${eyesY + 7} 34 ${eyesY + 3} Z`} fill="#16080c" />
        <path d={`M35 ${eyesY - 3} L42 ${eyesY - 3}`} stroke="#fff" stroke-opacity=".6" stroke-width="1.6" stroke-linecap="round" />
        <path d={`M55 ${eyesY - 3} L62 ${eyesY - 3}`} stroke="#fff" stroke-opacity=".6" stroke-width="1.6" stroke-linecap="round" />
        <path d={`M45 ${eyesY - 1} L55 ${eyesY - 1}`} stroke="#ff1f3d" stroke-width="1" opacity=".7" />
      </g>
    ),
    4: (
      <g>
        <ellipse cx="41" cy={eyesY} rx="4.6" ry="5.4" fill={ink} />
        <ellipse cx="59" cy={eyesY} rx="4.6" ry="5.4" fill={ink} />
        <circle cx="42.6" cy={eyesY - 2} r="1.9" fill="#fff" />
        <circle cx="60.6" cy={eyesY - 2} r="1.9" fill="#fff" />
        <circle cx="39.6" cy={eyesY + 2.2} r=".9" fill="#fff" />
        <circle cx="57.6" cy={eyesY + 2.2} r=".9" fill="#fff" />
      </g>
    ),
    5: (
      <g>
        {openEye(41)}
        {openEye(59)}
        <g stroke={ink} stroke-width="1.3" stroke-linecap="round">
          <path d={`M36.6 ${eyesY - 2.6} L34.6 ${eyesY - 4.4}`} />
          <path d={`M38.4 ${eyesY - 4.4} L37.2 ${eyesY - 6.6}`} />
          <path d={`M63.4 ${eyesY - 2.6} L65.4 ${eyesY - 4.4}`} />
          <path d={`M61.6 ${eyesY - 4.4} L62.8 ${eyesY - 6.6}`} />
        </g>
      </g>
    )
  };

  const my = 59;
  const mouths: Record<number, JSX.Element> = {
    0: <path d={`M43 ${my} Q50 ${my + 6} 57 ${my}`} stroke={ink} stroke-width="2.4" fill="none" stroke-linecap="round" />,
    1: (
      <g>
        <path d={`M41 ${my - 1} Q50 ${my + 10} 59 ${my - 1} Z`} fill="#5a1020" />
        <path d={`M43 ${my - 0.4} L57 ${my - 0.4} L56 ${my + 2.4} L44 ${my + 2.4} Z`} fill="#fff" />
        <path d={`M45 ${my + 5.5} Q50 ${my + 7.5} 55 ${my + 5.5}`} stroke="#ff7a8a" stroke-width="2" fill="none" stroke-linecap="round" />
      </g>
    ),
    2: (
      <g>
        <path d={`M41 ${my - 2} Q50 ${my + 13} 59 ${my - 2} Z`} fill="#5a1020" />
        <path d={`M43 ${my - 1.4} L57 ${my - 1.4} L56 ${my + 1} L44 ${my + 1} Z`} fill="#fff" />
        <ellipse cx="50" cy={my + 6} rx="4.5" ry="2.6" fill="#ff7a8a" />
      </g>
    ),
    3: (
      <g>
        <path d={`M43 ${my} Q50 ${my + 6} 57 ${my}`} stroke={ink} stroke-width="2.4" fill="none" stroke-linecap="round" />
        <path d={`M47 ${my + 2.5} Q50 ${my + 10} 54 ${my + 2.5} Z`} fill="#ff6b81" />
        <path d={`M50.5 ${my + 3.5} L50.5 ${my + 6.5}`} stroke="#d94a62" stroke-width=".8" />
      </g>
    ),
    4: <path d={`M44 ${my + 1} Q52 ${my + 4} 58 ${my - 2}`} stroke={ink} stroke-width="2.4" fill="none" stroke-linecap="round" />,
    5: (
      <g>
        <path d={`M43 ${my} Q46.5 ${my - 2.6} 50 ${my - 1} Q53.5 ${my - 2.6} 57 ${my} Q50 ${my + 2} 43 ${my} Z`} fill="#d8344f" />
        <path d={`M43 ${my} Q50 ${my + 6.5} 57 ${my} Q50 ${my + 2} 43 ${my} Z`} fill="#ef4f6a" />
        <ellipse cx="51.5" cy={my + 2.6} rx="2" ry=".8" fill="#fff" opacity=".45" />
      </g>
    )
  };

  const stache = <path d={`M39.5 ${my - 3} C42 ${my - 7.5} 47 ${my - 7.5} 50 ${my - 4.6} C53 ${my - 7.5} 58 ${my - 7.5} 60.5 ${my - 3} C57 ${my - 2} 53.5 ${my - 2.6} 50 ${my - 3.4} C46.5 ${my - 2.6} 43 ${my - 2} 39.5 ${my - 3} Z`} fill={H} />;
  const beards: Record<number, JSX.Element | null> = {
    0: null,
    1: <path d="M26.5 50 C27.5 66 38 73.5 50 73.5 C62 73.5 72.5 66 73.5 50 C71 58 66 61 60 62 L40 62 C34 61 29 58 26.5 50 Z" fill={hc} opacity=".28" />,
    2: (
      <g>
        <path d="M26 48 C26.5 66 37 75 50 75 C63 75 73.5 66 74 48 C71.5 56 67 61 61 63 C57 61.5 43 61.5 39 63 C33 61 28.5 56 26 48 Z" fill={H} />
        {stache}
      </g>
    ),
    3: (
      <g>
        <path d="M25 44 C24 68 35 85 50 85 C65 85 76 68 75 44 C73 55 68 62 61 64.5 C57 62.5 43 62.5 39 64.5 C32 62 27 55 25 44 Z" fill={H} />
        <path d="M40 76 Q50 80 60 76 M42 81 Q50 84 58 81" stroke={hcD} stroke-width="1" fill="none" opacity=".6" />
        {stache}
      </g>
    ),
    4: stache,
    5: (
      <g>
        {stache}
        <path d={`M43 ${my + 6} C45 ${my + 4} 55 ${my + 4} 57 ${my + 6} C57.5 ${my + 12} 54 ${my + 15} 50 ${my + 15} C46 ${my + 15} 42.5 ${my + 12} 43 ${my + 6} Z`} fill={H} />
      </g>
    )
  };

  const accs: Record<number, JSX.Element | null> = {
    0: null,
    1: (
      <g stroke={ink} stroke-width="2" fill="rgba(255,255,255,.22)">
        <rect x="33" y={eyesY - 6.5} width="15" height="12" rx="5" />
        <rect x="52" y={eyesY - 6.5} width="15" height="12" rx="5" />
        <path d={`M48 ${eyesY - 1} Q50 ${eyesY - 3} 52 ${eyesY - 1}`} fill="none" />
        <path d={`M33 ${eyesY - 2} L27 ${eyesY - 3}`} />
        <path d={`M67 ${eyesY - 2} L73 ${eyesY - 3}`} />
      </g>
    ),
    2: (
      <g>
        <path d="M34 22 L37 8 L44.5 16 L50 4 L55.5 16 L63 8 L66 22 Z" fill="#ffc93c" stroke="#d99a00" stroke-width="1.5" stroke-linejoin="round" />
        <path d="M34 22 L66 22 L65.5 25 L34.5 25 Z" fill="#e6a800" />
        <circle cx="50" cy="15" r="2.4" fill="#ff1f3d" />
        <circle cx="40" cy="18" r="1.4" fill="#fff" />
        <circle cx="60" cy="18" r="1.4" fill="#fff" />
      </g>
    ),
    3: (
      <g fill="#ff1f3d">
        <path d="M60 22 L74 14 Q76 22 74 30 Z" />
        <path d="M60 22 L46 14 Q44 22 46 30 Z" />
        <path d="M70 18 L72 26 M50 18 L48 26" stroke="#b5001c" stroke-width="1" />
        <circle cx="60" cy="22" r="3.6" fill="#ff5a70" />
      </g>
    ),
    4: (
      <g>
        <path d="M24 46 C24 16 76 16 76 46" stroke="#24242e" stroke-width="5" fill="none" />
        <rect x="17" y="39" width="11" height="17" rx="5" fill="#ff1f3d" />
        <rect x="72" y="39" width="11" height="17" rx="5" fill="#ff1f3d" />
        <rect x="19" y="42" width="3" height="11" rx="1.5" fill="#fff" opacity=".35" />
      </g>
    ),
    5: (
      <g fill="#ff6f91" opacity=".5">
        <ellipse cx="33" cy="55" rx="5.4" ry="3.4" />
        <ellipse cx="67" cy="55" rx="5.4" ry="3.4" />
      </g>
    ),
    6: (
      <g>
        <path d="M25 37 C25 17 75 17 75 37 Z" fill={shirt} stroke={shirtD} stroke-width="1" />
        <path d="M50 37 L50 19" stroke="rgba(0,0,0,.15)" stroke-width="1.5" />
        <path d="M60 34 L87 37 C87 41 70 41 62 39 Z" fill={shirtD} />
        <circle cx="50" cy="19" r="2.4" fill={shade(shirt, -0.25)} />
        <path d="M30 30 L70 30" stroke={isLight(shirt) ? '#ff1f3d' : '#fff'} stroke-width="2.4" opacity=".85" />
      </g>
    ),
    7: (
      <g>
        <path d="M27 32 L28 11 L44 24 Z" fill={hair === 0 ? skinD : hc} />
        <path d="M73 32 L72 11 L56 24 Z" fill={hair === 0 ? skinD : hc} />
        <path d="M30 27 L31 17 L39 24 Z" fill="#ffb3c7" />
        <path d="M70 27 L69 17 L61 24 Z" fill="#ffb3c7" />
      </g>
    ),
    8: (
      <g>
        <path d="M25.5 37 C28 22 40 18 50 18 C60 18 72 22 74.5 37" stroke="#ff1f3d" stroke-width="4.4" fill="none" stroke-linecap="round" />
        <path d="M27 33 C30 23 40 20.5 50 20.5" stroke="#fff" stroke-width="1.2" fill="none" opacity=".6" stroke-linecap="round" />
      </g>
    ),
    9: (
      <g>
        <circle cx="26" cy="57" r="2.6" fill="#ffc93c" stroke="#d99a00" stroke-width=".8" />
        <circle cx="74" cy="57" r="2.6" fill="#ffc93c" stroke="#d99a00" stroke-width=".8" />
      </g>
    )
  };

  const ringW = ring ? 4 : 0;
  const lightShirt = isLight(shirt);
  return (
    <svg class={cls} width={size} height={size} viewBox="0 0 100 100" role="img" aria-hidden="true" style={{ display: 'block', flex: 'none' }}>
      <defs>
        <clipPath id={`${id}c`}>
          <circle cx="50" cy="50" r={50 - ringW} />
        </clipPath>
        <radialGradient id={`${id}g`} cx="35%" cy="28%" r="85%">
          <stop offset="0" stop-color={shade(bg, 0.18)} />
          <stop offset="1" stop-color={shade(bg, -0.16)} />
        </radialGradient>
        <radialGradient id={`${id}s`} cx="42%" cy="34%" r="70%">
          <stop offset="0" stop-color={shade(skin, 0.05)} />
          <stop offset=".7" stop-color={skin} />
          <stop offset="1" stop-color={skinD} />
        </radialGradient>
        <linearGradient id={`${id}h`} x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0" stop-color={hcL} />
          <stop offset=".45" stop-color={hc} />
          <stop offset="1" stop-color={hcD} />
        </linearGradient>
        <linearGradient id={`${id}t`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color={shade(shirt, 0.08)} />
          <stop offset="1" stop-color={shirtD} />
        </linearGradient>
      </defs>
      {ring && <circle cx="50" cy="50" r="50" fill={ring} />}
      <g clip-path={`url(#${id}c)`}>
        <rect width="100" height="100" fill={`url(#${id}g)`} />
        <circle cx="20" cy="18" r="10" fill="#fff" opacity=".14" />
        <circle cx="84" cy="80" r="16" fill="#fff" opacity=".08" />
        {hairBack[hair] ?? null}
        {/* cuerpo */}
        <path d="M17 104 C17 81 31 72.5 50 72.5 C69 72.5 83 81 83 104 Z" fill={`url(#${id}t)`} stroke={lightShirt ? 'rgba(0,0,0,.12)' : 'none'} stroke-width="1" />
        <path d="M30 84 C31 92 31 98 30 104 M70 84 C69 92 69 98 70 104" stroke="rgba(0,0,0,.1)" stroke-width="1.4" fill="none" />
        {/* cuello */}
        <rect x="43.5" y="62" width="13" height="13" rx="5" fill={skinD} />
        <path d="M40 73.2 Q50 83 60 73.2 Q50 78 40 73.2 Z" fill={skinDD} opacity=".5" />
        <path d="M39 73 Q50 84 61 73" stroke={lightShirt ? shade(shirt, -0.12) : shade(shirt, 0.18)} stroke-width="2.6" fill="none" stroke-linecap="round" />
        {shoulderLocks[hair] ?? null}
        {/* orejas */}
        <ellipse cx="26" cy="49" rx="5" ry="5.6" fill={skinD} />
        <ellipse cx="74" cy="49" rx="5" ry="5.6" fill={skinD} />
        <path d="M27.5 46.5 Q24.5 49 27.5 52" stroke={skinDD} stroke-width="1.2" fill="none" stroke-linecap="round" />
        <path d="M72.5 46.5 Q75.5 49 72.5 52" stroke={skinDD} stroke-width="1.2" fill="none" stroke-linecap="round" />
        {/* cabeza */}
        <ellipse cx="50" cy="46" rx="24" ry="25" fill={`url(#${id}s)`} />
        <ellipse cx="43" cy="34" rx="11" ry="6" fill="#fff" opacity=".13" />
        {/* rubor y nariz */}
        <ellipse cx="34" cy="55" rx="4.6" ry="2.6" fill="#ff6f91" opacity=".16" />
        <ellipse cx="66" cy="55" rx="4.6" ry="2.6" fill="#ff6f91" opacity=".16" />
        <path d="M50.5 49 Q48 53.6 50.6 54.4" stroke={skinDD} stroke-width="1.6" fill="none" stroke-linecap="round" />
        {beards[beard] ?? null}
        {eyes[spec.eyes] ?? eyes[0]}
        {spec.eyes !== 3 && (
          <g stroke={brow} stroke-width="2.3" fill="none" stroke-linecap="round">
            <path d="M35.5 39.6 Q41 36.4 46 38.6" />
            <path d="M54 38.6 Q59 36.4 64.5 39.6" />
          </g>
        )}
        {mouths[spec.mouth] ?? mouths[0]}
        {hairFront[hair] ?? null}
        {shine}
        {accs[spec.acc] ?? null}
      </g>
    </svg>
  );
}
