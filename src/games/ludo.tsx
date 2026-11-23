// Ludo rápido: 2 a 4 jugadores, 2 fichas cada uno. Sacá un 6 para salir, comé fichas rivales
// y llevá tus dos fichas al centro. Con 6 volvés a tirar.
import { useEffect, useRef, useState } from 'preact/hooks';
import type { VersusDef, ViewProps, VCtx } from '../versus';
import { Banner, SeatBar, isMine } from '../vsui';
import { sfx, vibrate } from '../audio';

const TOKENS = 2;
const FINISH = 56;
const SAFE = [0, 8, 13, 21, 26, 34, 39, 47];
const CORNER_START = [0, 13, 26, 39];

// Recorrido de 52 casilleros en una grilla de 15x15, en sentido horario.
const TRACK: [number, number][] = (() => {
  const t: [number, number][] = [];
  for (let c = 1; c <= 5; c++) t.push([6, c]);
  for (let r = 5; r >= 0; r--) t.push([r, 6]);
  t.push([0, 7], [0, 8]);
  for (let r = 1; r <= 5; r++) t.push([r, 8]);
  for (let c = 9; c <= 14; c++) t.push([6, c]);
  t.push([7, 14], [8, 14]);
  for (let c = 13; c >= 9; c--) t.push([8, c]);
  for (let r = 9; r <= 14; r++) t.push([r, 8]);
  t.push([14, 7], [14, 6]);
  for (let r = 13; r >= 9; r--) t.push([r, 6]);
  for (let c = 5; c >= 0; c--) t.push([8, c]);
  t.push([7, 0], [6, 0]);
  return t;
})();
// Columnas finales por esquina (5 casilleros hacia el centro)
const HOME: [number, number][][] = [
  [1, 2, 3, 4, 5].map((c) => [7, c] as [number, number]),
  [1, 2, 3, 4, 5].map((r) => [r, 7] as [number, number]),
  [13, 12, 11, 10, 9].map((c) => [7, c] as [number, number]),
  [13, 12, 11, 10, 9].map((r) => [r, 7] as [number, number])
];
const BASE_SPOTS: [number, number][][] = [
  [[2, 2], [3.2, 3.2]],
  [[2, 11.8], [3.2, 13]],
  [[11.8, 11.8], [13, 13]],
  [[11.8, 2], [13, 3.2]]
];
const CENTER: [number, number][] = [[7, 6.3], [6.3, 7], [7, 7.7], [7.7, 7]];

const cornersFor = (n: number) => (n === 2 ? [0, 2] : n === 3 ? [0, 1, 2] : [0, 1, 2, 3]);

interface S {
  tokens: number[][];
  turn: number;
  die: number | null;
  rolling: number;
  tries: number;
  pause: number;
  next: 'same' | 'other' | null;
  moved: { seat: number; tok: number; n: number } | null;
  captured: number;
  msg: string;
  winner: number | null;
  n: number;
}
type A = { roll: true } | { tok: number };

function trackIndex(corner: number, p: number) {
  return (CORNER_START[corner] + p) % 52;
}
function cellOf(corner: number, p: number, tok: number): [number, number] {
  if (p < 0) return BASE_SPOTS[corner][tok];
  if (p <= 50) return TRACK[trackIndex(corner, p)];
  if (p < FINISH) return HOME[corner][p - 51];
  return CENTER[corner];
}
function canMove(p: number, die: number) {
  if (p >= FINISH) return false;
  if (p < 0) return die === 6;
  return true;
}
function legal(s: S, n: number) {
  if (s.die === null) return [];
  return s.tokens[s.turn].map((p, i) => (canMove(p, s.die!) ? i : -1)).filter((i) => i >= 0).slice(0, n);
}

function Die({ value, rolling, color, onRoll, can }: { value: number | null; rolling: boolean; color: string; onRoll: () => void; can: boolean }) {
  const [face, setFace] = useState(value ?? 1);
  useEffect(() => {
    if (!rolling) {
      if (value) setFace(value);
      return;
    }
    const iv = setInterval(() => setFace(1 + Math.floor(Math.random() * 6)), 70);
    return () => clearInterval(iv);
  }, [rolling, value]);
  const pips: Record<number, number[][]> = { 1: [[1, 1]], 2: [[0, 0], [2, 2]], 3: [[0, 0], [1, 1], [2, 2]], 4: [[0, 0], [0, 2], [2, 0], [2, 2]], 5: [[0, 0], [0, 2], [1, 1], [2, 0], [2, 2]], 6: [[0, 0], [0, 2], [1, 0], [1, 2], [2, 0], [2, 2]] };
  return (
    <button class={`die ${rolling ? 'rolling' : ''} ${can ? 'can' : ''}`} style={{ '--c': color } as any} onClick={can ? onRoll : undefined} aria-label="Tirar el dado">
      <svg viewBox="0 0 90 90">
        <rect x="4" y="4" width="82" height="82" rx="20" fill="#fff" />
        <rect x="4" y="4" width="82" height="82" rx="20" fill="none" stroke={color} stroke-width="6" />
        {(pips[face] ?? []).map(([r, c]) => (
          <circle cx={22 + c * 23} cy={22 + r * 23} r="8.5" fill="#2a1240" />
        ))}
      </svg>
      {can && <span class="dielabel">¡Tirá!</span>}
    </button>
  );
}

function BoardSvg({ s, ctx, act, me }: { s: S; ctx: VCtx; act: ViewProps<S, A>['act']; me: number[] | 'all' }) {
  const corners = cornersFor(ctx.seats.length);
  const cornerColor = (k: number) => {
    const seat = corners.indexOf(k);
    return seat >= 0 ? ctx.seats[seat].color : '#8e8aa8';
  };
  const movable = s.die !== null && s.rolling <= 0 && s.pause <= 0 && isMine(me, s.turn) ? legal(s, TOKENS) : [];
  const cells: preact.JSX.Element[] = [];
  TRACK.forEach(([r, c], i) => {
    const startCorner = CORNER_START.indexOf(i);
    const fill = startCorner >= 0 ? cornerColor(startCorner) : '#fffaf0';
    cells.push(<rect x={c + 0.04} y={r + 0.04} width="0.92" height="0.92" rx="0.18" fill={fill} stroke="rgba(42,18,64,.18)" stroke-width="0.04" />);
    if (SAFE.includes(i) && startCorner < 0) cells.push(<text x={c + 0.5} y={r + 0.72} font-size="0.62" text-anchor="middle" fill="#ffb020">★</text>);
  });
  HOME.forEach((col, k) => col.forEach(([r, c]) => cells.push(<rect x={c + 0.04} y={r + 0.04} width="0.92" height="0.92" rx="0.18" fill={cornerColor(k)} opacity="0.85" />)));
  // Fichas
  const toks: preact.JSX.Element[] = [];
  s.tokens.forEach((arr, seat) => {
    const corner = corners[seat];
    arr.forEach((p, t) => {
      const [r, c] = cellOf(corner, p, t);
      // desplazar si hay dos fichas en el mismo casillero
      const same = s.tokens.flatMap((a, si) => a.map((pp, ti) => ({ si, ti, rc: cellOf(corners[si], pp, ti) }))).filter((o) => o.rc[0] === r && o.rc[1] === c);
      const k = same.findIndex((o) => o.si === seat && o.ti === t);
      const off = same.length > 1 ? (k - (same.length - 1) / 2) * 0.28 : 0;
      const can = seat === s.turn && movable.includes(t);
      toks.push(
        <g class={`tok ${can ? 'can' : ''}`} style={{ transform: `translate(${c + 0.5 + off}px, ${r + 0.5}px)` }} onClick={can ? () => act(seat, { tok: t }) : undefined}>
          <circle r="0.62" fill="transparent" />
          <ellipse cy="0.3" rx="0.36" ry="0.14" fill="rgba(0,0,0,.3)" />
          <circle r="0.36" fill={ctx.seats[seat].color} stroke="#fff" stroke-width="0.09" />
          <circle cx="-0.11" cy="-0.12" r="0.12" fill="#fff" opacity="0.55" />
        </g>
      );
    });
  });
  const base = (k: number, x: number, y: number) => (
    <g>
      <rect x={x} y={y} width="6" height="6" rx="0.8" fill={cornerColor(k)} />
      <rect x={x + 0.8} y={y + 0.8} width="4.4" height="4.4" rx="0.7" fill="#fffaf0" />
      {BASE_SPOTS[k].map(([r, c]) => (
        <circle cx={c + 0.5} cy={r + 0.5} r="0.55" fill={cornerColor(k)} opacity="0.35" />
      ))}
    </g>
  );
  return (
    <svg class="ludo" viewBox="0 0 15 15">
      <defs>
        <filter id="ls" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="0.15" stdDeviation="0.15" flood-opacity="0.35" />
        </filter>
      </defs>
      <rect width="15" height="15" rx="0.9" fill="#3b1f6e" />
      {base(0, 0, 0)}
      {base(1, 9, 0)}
      {base(2, 9, 9)}
      {base(3, 0, 9)}
      {cells}
      <polygon points="6,6 9,6 7.5,7.5" fill={cornerColor(1)} />
      <polygon points="9,6 9,9 7.5,7.5" fill={cornerColor(2)} />
      <polygon points="9,9 6,9 7.5,7.5" fill={cornerColor(3)} />
      <polygon points="6,9 6,6 7.5,7.5" fill={cornerColor(0)} />
      <g filter="url(#ls)">{toks}</g>
    </svg>
  );
}

function View({ s, ctx, me, act }: ViewProps<S, A>) {
  const prev = useRef(s.n);
  useEffect(() => {
    if (s.n === prev.current) return;
    prev.current = s.n;
    if (s.captured) {
      sfx.bad();
      vibrate([40, 30, 80]);
    } else if (s.moved) sfx.tap();
  }, [s.n]);
  const prevRoll = useRef(s.rolling > 0);
  useEffect(() => {
    const r = s.rolling > 0;
    if (r && !prevRoll.current) sfx.dice();
    if (!r && prevRoll.current && s.die) s.die === 6 ? sfx.good() : sfx.click();
    prevRoll.current = r;
  });
  const seat = ctx.seats[s.turn];
  const canRoll = s.winner === null && s.die === null && s.rolling <= 0 && s.pause <= 0 && isMine(me, s.turn);
  const finished = s.tokens.map((a) => a.filter((p) => p >= FINISH).length);
  const corners = cornersFor(ctx.seats.length);
  // En un celu el dado aparece en la esquina del jugador de turno
  const corner = corners[s.turn];
  const dieStyle = me === 'all' ? { [corner < 2 ? 'top' : 'bottom']: '-86px', [corner === 0 || corner === 3 ? 'left' : 'right']: '4px', transform: corner < 2 ? 'rotate(180deg)' : undefined } : {};
  return (
    <div class="vsbody ludowrap">
      {me !== 'all' && <SeatBar ctx={ctx} turn={s.winner === null ? s.turn : undefined} scores={finished.map((f) => `${f}/${TOKENS}`)} label={() => 'en casa'} />}
      <Banner color={`color-mix(in srgb, ${seat.color} 55%, transparent)`}>{s.winner !== null ? `¡Ganó ${ctx.seats[s.winner].name}!` : s.msg || (canRoll && me !== 'all' ? '¡Te toca tirar!' : `Turno de ${seat.name}`)}</Banner>
      <div class={`ludobox ${me === 'all' ? 'local' : ''}`}>
        <BoardSvg s={s} ctx={ctx} act={act} me={me} />
        <div class={`diepos ${me === 'all' ? 'corner' : ''}`} style={dieStyle as any}>
          <Die value={s.die} rolling={s.rolling > 0} color={seat.color} can={canRoll} onRoll={() => act(s.turn, { roll: true })} />
        </div>
      </div>
      {s.winner !== null && (
        <div class="vswin" style={{ background: 'rgba(30,4,10,.55)' }}>
          <div class="crown">👑</div>
          <h3>¡Gana {ctx.seats[s.winner].name}!</h3>
        </div>
      )}
    </div>
  );
}

export const ludo: VersusDef<S, A> = {
  kind: 'versus',
  id: 'ludo',
  name: 'Ludo Rápido',
  scene: 'Tablero de la abuela',
  type: 'Mente',
  icon: '🎲',
  color: '#ff4d6d',
  seconds: 420,
  howTo: 'Tirá el dado: con 6 sacás una ficha y volvés a tirar. Si caés sobre un rival, lo mandás a su casa. Llevá tus 2 fichas al centro.',
  seatsBy: 'player',
  min: 2,
  max: 4,
  init: (ctx) => ({ tokens: ctx.seats.map(() => Array(TOKENS).fill(-1)), turn: 0, die: null, rolling: 0, tries: 0, pause: 0, next: null, moved: null, captured: 0, msg: '', winner: null, n: 0 }),
  act(s, seat, a, ctx) {
    if (s.winner !== null || seat !== s.turn || s.pause > 0 || s.rolling > 0) return s;
    if ('roll' in a) {
      if (s.die !== null) return s;
      return { ...s, die: 1 + Math.floor(Math.random() * 6), rolling: 0.7, msg: '', captured: 0 };
    }
    if (s.die === null || !legal(s, TOKENS).includes(a.tok)) return s;
    return applyMove(s, a.tok, ctx);
  },
  tick(s, dt, ctx) {
    if (s.winner !== null) return s;
    if (s.rolling > 0) {
      const rolling = s.rolling - dt;
      if (rolling > 0) return { ...s, rolling };
      const n = { ...s, rolling: 0 };
      const moves = legal(n, TOKENS);
      if (moves.length === 0) {
        const allBase = n.tokens[n.turn].every((p) => p < 0 || p >= FINISH);
        const tries = n.tries + 1;
        if (allBase && tries < 3) return { ...n, tries, die: null, msg: `Necesitás un 6 (intento ${tries + 1} de 3)` };
        return { ...n, pause: 0.9, next: 'other', msg: 'No hay movimiento posible' };
      }
      // Si hay una sola jugada (o todas las fichas en el mismo lugar), se mueve sola.
      const uniq = new Set(moves.map((t) => n.tokens[n.turn][t]));
      if (uniq.size === 1) return applyMove(n, moves[0], ctx);
      return n;
    }
    if (s.pause > 0) {
      const pause = s.pause - dt;
      if (pause > 0) return { ...s, pause };
      const other = s.next === 'other';
      return { ...s, pause: 0, die: null, next: null, tries: 0, turn: other ? (s.turn + 1) % ctx.seats.length : s.turn, msg: other ? '' : '¡Tirá de nuevo!' };
    }
    return s;
  },
  done: (s) => (s.winner === null ? null : s.tokens.map((a, i) => a.reduce((acc, p) => acc + (p >= FINISH ? 25 : Math.max(0, p) / 6), 0) + (s.winner === i ? 20 : 0))),
  View
};

function applyMove(s: S, tok: number, ctx: VCtx): S {
  const corners = cornersFor(ctx.seats.length);
  const tokens = s.tokens.map((a) => [...a]);
  const cur = tokens[s.turn][tok];
  const np = cur < 0 ? 0 : Math.min(FINISH, cur + s.die!);
  tokens[s.turn][tok] = np;
  let captured = 0;
  if (np <= 50) {
    const ti = trackIndex(corners[s.turn], np);
    if (!SAFE.includes(ti))
      tokens.forEach((arr, si) => {
        if (si === s.turn) return;
        arr.forEach((p, k) => {
          if (p >= 0 && p <= 50 && trackIndex(corners[si], p) === ti) {
            arr[k] = -1;
            captured++;
          }
        });
      });
  }
  const won = tokens[s.turn].every((p) => p >= FINISH);
  const again = s.die === 6 || captured > 0 || (np >= FINISH && cur < FINISH);
  const msg = captured ? `¡${ctx.seats[s.turn].name} comió una ficha!` : np >= FINISH ? '¡Ficha a casa!' : '';
  return { ...s, tokens, captured, moved: { seat: s.turn, tok, n: s.n + 1 }, n: s.n + 1, pause: won ? 0 : 0.6, next: again ? 'same' : 'other', msg, winner: won ? s.turn : null };
}
