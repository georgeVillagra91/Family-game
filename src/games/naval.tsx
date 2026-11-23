// Batalla Naval: cada lado esconde su flota y dispara por turnos. Si acertás, seguís disparando.
// En un celu, una pantalla tapa el tablero entre turnos para pasar el celu sin espiar.
import { useEffect, useRef, useState } from 'preact/hooks';
import type { VersusDef, ViewProps, VCtx } from '../versus';
import { Banner, Cover, SeatBar, isMine } from '../vsui';
import { sfx, vibrate } from '../audio';

const N = 7;
const FLEET = [4, 3, 3, 2];
const TOTAL = FLEET.reduce((a, b) => a + b, 0);

interface Ship { cells: number[]; v: boolean }
interface S {
  phase: 'place' | 'battle' | 'over';
  ships: Ship[][];
  shots: Record<number, 'h' | 'm'>[]; // disparos hechos POR cada lado (sobre el tablero rival)
  ready: boolean[];
  turn: number;
  anim: number;
  last: { seat: number; cell: number; res: 'h' | 'm' | 's' } | null;
  n: number; // contador de disparos
  winner: number | null;
}
type A = { reroll: true } | { ready: true } | { shot: number };

function randomFleet(): Ship[] {
  for (;;) {
    const used = new Set<number>();
    const ships: Ship[] = [];
    let ok = true;
    for (const len of FLEET) {
      let placed = false;
      for (let tries = 0; tries < 200 && !placed; tries++) {
        const v = Math.random() < 0.5;
        const r = Math.floor(Math.random() * (v ? N - len + 1 : N));
        const c = Math.floor(Math.random() * (v ? N : N - len + 1));
        const cells = Array.from({ length: len }, (_, k) => (v ? (r + k) * N + c : r * N + c + k));
        // sin barcos pegados (dejan un casillero de agua alrededor)
        const touches = cells.some((x) => {
          const xr = Math.floor(x / N), xc = x % N;
          for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
            const rr = xr + dr, cc = xc + dc;
            if (rr >= 0 && rr < N && cc >= 0 && cc < N && used.has(rr * N + cc)) return true;
          }
          return false;
        });
        if (!touches) {
          cells.forEach((x) => used.add(x));
          ships.push({ cells, v });
          placed = true;
        }
      }
      if (!placed) ok = false;
    }
    if (ok) return ships;
  }
}

const hitsOn = (s: S, shooter: number) => Object.values(s.shots[shooter]).filter((x) => x === 'h').length;
const sunk = (ship: Ship, shots: Record<number, 'h' | 'm'>) => ship.cells.every((c) => shots[c] === 'h');

function shipPart(ship: Ship, cell: number) {
  const i = ship.cells.indexOf(cell);
  const end = i === 0 ? 'a' : i === ship.cells.length - 1 ? 'b' : 'm';
  return `${ship.v ? 'v' : 'h'}${end}`;
}

function Board({ ships, shots, showShips, onShot, big, lastCell }: { ships: Ship[]; shots: Record<number, 'h' | 'm'>; showShips: boolean; onShot?: (c: number) => void; big?: boolean; lastCell?: number }) {
  const shipAt = (c: number) => ships.find((sh) => sh.cells.includes(c));
  return (
    <div class={`sea ${big ? 'big' : 'small'}`}>
      {Array.from({ length: N * N }, (_, c) => {
        const sh = shipAt(c);
        const shot = shots[c];
        const isSunk = sh && sunk(sh, shots);
        const visible = sh && (showShips || isSunk);
        return (
          <button class={`sq ${onShot && !shot ? 'can' : ''} ${c === lastCell ? 'last' : ''}`} disabled={!onShot || !!shot} onClick={() => onShot?.(c)} aria-label={`Casillero ${c + 1}`}>
            {visible && <div class={`hull ${shipPart(sh!, c)} ${isSunk ? 'sunk' : ''}`} />}
            {shot === 'm' && <div class="splash" />}
            {shot === 'h' && <div class="boom">🔥</div>}
          </button>
        );
      })}
    </div>
  );
}

function View({ s, ctx, me, act }: ViewProps<S, A>) {
  const local = me === 'all';
  // En un celu: a quién le estamos mostrando la pantalla ahora
  const [viewer, setViewer] = useState<number | null>(null);
  const prevN = useRef(s.n);
  useEffect(() => {
    if (s.n === prevN.current || !s.last) return;
    prevN.current = s.n;
    if (s.last.res === 'm') sfx.whoosh();
    else {
      sfx.pop();
      setTimeout(() => (s.last?.res === 's' ? sfx.win() : sfx.bad()), 120);
      vibrate(s.last.res === 's' ? [60, 40, 120] : 60);
    }
  }, [s.n]);
  // Necesitamos tapar cuando cambia quién mira
  const needSeat = s.phase === 'place' ? s.ready.findIndex((r) => !r) : s.phase === 'battle' && s.anim <= 0 ? s.turn : viewer;
  if (local && s.phase !== 'over' && needSeat !== null && needSeat >= 0 && viewer !== needSeat) {
    return (
      <div class="vsbody">
        <Cover ctx={ctx} seat={needSeat} text={s.phase === 'place' ? 'Vas a ubicar tu flota. ¡Que nadie más mire!' : 'Te toca disparar.'} onReveal={() => (sfx.tap(), setViewer(needSeat))} />
      </div>
    );
  }
  const mySeat = local ? (viewer ?? 0) : (me as number[])[0] ?? -1;
  const spectator = mySeat < 0;
  const foe = 1 - Math.max(0, mySeat);

  if (s.phase === 'place') {
    if (spectator) return <div class="vsbody"><Banner>Los capitanes están ubicando sus flotas…</Banner></div>;
    const ready = s.ready[mySeat];
    return (
      <div class="vsbody">
        <SeatBar ctx={ctx} label={(i) => (s.ready[i] ? '¡Listo!' : 'ubicando…')} />
        <Banner color={`color-mix(in srgb, ${ctx.seats[mySeat].color} 55%, transparent)`}>Tu flota, {ctx.seats[mySeat].name}</Banner>
        <Board ships={s.ships[mySeat]} shots={{}} showShips big />
        {!ready ? (
          <div class="row" style={{ width: '100%', maxWidth: '420px' }}>
            <button class="btn ghost" onClick={() => (sfx.whoosh(), act(mySeat, { reroll: true }))}>
              🎲 Mover barcos
            </button>
            <button class="btn green" onClick={() => (sfx.good(), act(mySeat, { ready: true }))}>
              ¡Listo!
            </button>
          </div>
        ) : (
          <p class="muted dots">Esperando al otro capitán</p>
        )}
      </div>
    );
  }

  const shooterView = spectator ? 0 : mySeat;
  const myTurn = !spectator && s.turn === mySeat && s.phase === 'battle' && s.anim <= 0 && isMine(me, s.turn);
  const lastOnFoe = s.last && s.last.seat === shooterView ? s.last.cell : undefined;
  const lastOnMe = s.last && s.last.seat !== shooterView ? s.last.cell : undefined;
  const res = s.last ? (s.last.res === 'm' ? '¡Agua!' : s.last.res === 'h' ? '¡Tocado! Sigue disparando' : '¡Hundido! 💥') : '';
  return (
    <div class="vsbody naval">
      <SeatBar ctx={ctx} turn={s.phase === 'battle' ? s.turn : undefined} scores={[0, 1].map((i) => `${hitsOn(s, i)}/${TOTAL}`)} label={() => 'impactos'} />
      <Banner color={s.anim > 0 ? undefined : `color-mix(in srgb, ${ctx.seats[s.turn].color} 55%, transparent)`}>
        {s.phase === 'over' ? `¡${ctx.seats[s.winner!].name} hundió toda la flota!` : s.anim > 0 ? res : myTurn ? '¡Disparale al rival!' : `Dispara ${ctx.seats[s.turn].name}`}
      </Banner>
      <div class="muted seatlabel">Mar de {ctx.seats[1 - shooterView].name}</div>
      <Board ships={s.ships[1 - shooterView]} shots={s.shots[shooterView]} showShips={s.phase === 'over'} onShot={myTurn ? (c) => act(mySeat, { shot: c }) : undefined} big lastCell={lastOnFoe} />
      <div class="muted seatlabel">Tu mar</div>
      <Board ships={s.ships[shooterView]} shots={s.shots[1 - shooterView]} showShips lastCell={lastOnMe} />
      {s.phase === 'over' && (
        <div class="vswin" style={{ background: 'rgba(30,4,10,.55)' }}>
          <div class="crown">⚓</div>
          <h3>¡Gana {ctx.seats[s.winner!].name}!</h3>
        </div>
      )}
    </div>
  );
}

export const naval: VersusDef<S, A> = {
  kind: 'versus',
  id: 'naval',
  name: 'Batalla Naval',
  scene: 'Mar de los Piratas',
  type: 'Mente',
  icon: '⚓',
  color: '#ff6a00',
  seconds: 240,
  howTo: 'Escondé tu flota y adiviná dónde está la del rival. Si acertás, seguís disparando. ¡Hundí todos sus barcos!',
  seatsBy: 'side',
  min: 2,
  max: 2,
  init: () => ({ phase: 'place', ships: [randomFleet(), randomFleet()], shots: [{}, {}], ready: [false, false], turn: 0, anim: 0, last: null, n: 0, winner: null }),
  act(s, seat, a) {
    if ('reroll' in a) {
      if (s.phase !== 'place' || s.ready[seat]) return s;
      const ships = [...s.ships];
      ships[seat] = randomFleet();
      return { ...s, ships };
    }
    if ('ready' in a) {
      if (s.phase !== 'place') return s;
      const ready = [...s.ready];
      ready[seat] = true;
      return { ...s, ready, phase: ready.every(Boolean) ? 'battle' : 'place' };
    }
    if (s.phase !== 'battle' || seat !== s.turn || s.anim > 0 || s.shots[seat][a.shot]) return s;
    const foe = 1 - seat;
    const ship = s.ships[foe].find((sh) => sh.cells.includes(a.shot));
    const shots = s.shots.map((x) => ({ ...x }));
    shots[seat][a.shot] = ship ? 'h' : 'm';
    const res = !ship ? 'm' : sunk(ship, shots[seat]) ? 's' : 'h';
    const allSunk = s.ships[foe].every((sh) => sunk(sh, shots[seat]));
    return { ...s, shots, last: { seat, cell: a.shot, res }, n: s.n + 1, anim: allSunk ? 0 : res === 'm' ? 1.4 : 0.9, phase: allSunk ? 'over' : 'battle', winner: allSunk ? seat : null };
  },
  tick(s, dt) {
    if (s.anim <= 0) return s;
    const anim = s.anim - dt;
    if (anim > 0) return { ...s, anim };
    // al errar, pasa el turno
    return { ...s, anim: 0, turn: s.last && s.last.res === 'm' ? 1 - s.turn : s.turn };
  },
  done: (s) => (s.phase === 'over' ? [0, 1].map((i) => hitsOn(s, i) * 2 + (s.winner === i ? 20 : 0)) : null),
  View
};

export type { VCtx };
