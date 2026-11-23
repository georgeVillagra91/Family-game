// Ta-te-ti: al mejor de 3 tableros. Cada lado (jugador o equipo) juega por turnos.
import type { VersusDef, ViewProps } from '../versus';
import { SeatBar, Banner, Winner, isMine } from '../vsui';
import { sfx, vibrate } from '../audio';
import { useEffect, useRef } from 'preact/hooks';

interface S {
  board: (number | null)[];
  turn: number;
  starter: number;
  wins: number[];
  boards: number;
  line: number[] | null;
  pause: number; // segundos de pausa entre tableros
  last: number;
  over: boolean;
}
type A = { cell: number };

const LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
const TARGET = 2;
const MAX_BOARDS = 5;

function winLine(b: (number | null)[]) {
  for (const l of LINES) if (b[l[0]] !== null && b[l[0]] === b[l[1]] && b[l[1]] === b[l[2]]) return l;
  return null;
}

function Mark({ seat, color }: { seat: number; color: string }) {
  return seat === 0 ? (
    <svg viewBox="0 0 100 100" class="mark">
      <path d="M24 24 L76 76" stroke={color} stroke-width="16" stroke-linecap="round" class="draw" />
      <path d="M76 24 L24 76" stroke={color} stroke-width="16" stroke-linecap="round" class="draw d2" />
    </svg>
  ) : (
    <svg viewBox="0 0 100 100" class="mark">
      <circle cx="50" cy="50" r="28" stroke={color} stroke-width="15" fill="none" stroke-linecap="round" class="draw" transform="rotate(-90 50 50)" />
    </svg>
  );
}

function View({ s, ctx, me, act }: ViewProps<S, A>) {
  const prev = useRef(s.last);
  useEffect(() => {
    if (s.last !== prev.current) {
      prev.current = s.last;
      if (s.line) sfx.win();
      else sfx.tap();
      vibrate(12);
    }
  }, [s.last]);
  const canPlay = !s.over && s.pause <= 0 && isMine(me, s.turn);
  const winner = s.over ? (s.wins[0] === s.wins[1] ? [0, 1] : [s.wins[0] > s.wins[1] ? 0 : 1]) : null;
  const tc = ctx.seats[s.turn].color;
  const lineGeom = s.line ? lineCoords(s.line) : null;
  return (
    <div class="vsbody">
      <SeatBar ctx={ctx} turn={s.pause > 0 || s.over ? undefined : s.turn} scores={s.wins} label={(i) => (i === 0 ? 'Cruz' : 'Círculo')} />
      <Banner color={s.pause > 0 ? undefined : `color-mix(in srgb, ${tc} 55%, transparent)`}>
        {s.pause > 0 ? (s.line ? `¡Punto para ${ctx.seats[s.board[s.line[0]]!].name}!` : '¡Empate en este tablero!') : canPlay && me !== 'all' ? '¡Te toca!' : `Turno de ${ctx.seats[s.turn].name}`}
      </Banner>
      <div class="ttt" style={{ '--c': tc } as any}>
        {s.board.map((v, i) => (
          <button class={`cell ${v === null && canPlay ? 'can' : ''} ${s.line?.includes(i) ? 'win' : ''}`} disabled={v !== null || !canPlay} onClick={() => act(s.turn, { cell: i })} aria-label={`Casilla ${i + 1}`}>
            {v !== null && <Mark seat={v} color={ctx.seats[v].color} />}
          </button>
        ))}
        {lineGeom && (
          <svg class="tttline" viewBox="0 0 300 300">
            <line x1={lineGeom[0]} y1={lineGeom[1]} x2={lineGeom[2]} y2={lineGeom[3]} stroke="#fff" stroke-width="12" stroke-linecap="round" class="draw" />
          </svg>
        )}
      </div>
      <div class="muted" style={{ fontWeight: 700 }}>
        Tablero {s.pause > 0 || s.over ? s.boards : s.boards + 1} · gana el primero en llegar a {TARGET}
      </div>
      {winner && <Winner ctx={ctx} winners={winner}>{`${s.wins[0]} a ${s.wins[1]}`}</Winner>}
    </div>
  );
}

function lineCoords(l: number[]) {
  const c = (i: number) => [(i % 3) * 100 + 50, Math.floor(i / 3) * 100 + 50];
  const [a, b] = [c(l[0]), c(l[2])];
  const dx = (b[0] - a[0]) * 0.18, dy = (b[1] - a[1]) * 0.18;
  return [a[0] - dx, a[1] - dy, b[0] + dx, b[1] + dy];
}

export const tateti: VersusDef<S, A> = {
  kind: 'versus',
  id: 'tateti',
  name: 'Ta-te-ti',
  scene: 'Pizarrón del recreo',
  type: 'Mente',
  icon: '❌',
  color: '#1fc8db',
  seconds: 90,
  howTo: 'Hacé tres en línea antes que tu rival. Gana quien se lleva 2 tableros.',
  seatsBy: 'side',
  min: 2,
  max: 2,
  init: () => ({ board: Array(9).fill(null), turn: 0, starter: 0, wins: [0, 0], boards: 0, line: null, pause: 0, last: 0, over: false }),
  act(s, seat, a) {
    if (s.over || s.pause > 0 || seat !== s.turn || s.board[a.cell] !== null) return s;
    const board = [...s.board];
    board[a.cell] = seat;
    const line = winLine(board);
    const full = board.every((v) => v !== null);
    if (line || full) {
      const wins = [...s.wins];
      if (line) wins[seat]++;
      return { ...s, board, line, wins, pause: 1.8, last: s.last + 1, boards: s.boards + 1 };
    }
    return { ...s, board, turn: 1 - seat, last: s.last + 1 };
  },
  tick(s, dt) {
    if (s.pause <= 0 || s.over) return s;
    const pause = s.pause - dt;
    if (pause > 0) return { ...s, pause };
    if (s.wins.some((w) => w >= TARGET) || s.boards >= MAX_BOARDS) return { ...s, pause: 0, over: true };
    const starter = 1 - s.starter;
    return { ...s, pause: 0, board: Array(9).fill(null), line: null, starter, turn: starter };
  },
  done: (s) => (s.over ? s.wins.map((w) => w * 10) : null),
  View
};
