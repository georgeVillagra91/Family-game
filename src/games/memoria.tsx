// Memoria de cartas: dar vuelta dos cartas por turno. Si son iguales, son tuyas y seguís.
import { useEffect, useRef } from 'preact/hooks';
import type { VersusDef, ViewProps } from '../versus';
import { SeatBar, Banner, Winner, isMine } from '../vsui';
import { rng } from '../engine';
import { sfx, vibrate } from '../audio';

const FACES = ['🐶', '🐱', '🦊', '🐼', '🐸', '🦁', '🐵', '🐧', '🦄', '🐙', '🐢', '🦋'];
const BG = ['#ff8fab', '#ffd166', '#8ce99a', '#74c0fc', '#b197fc', '#ffa94d', '#63e6be', '#f783ac', '#a9e34b', '#4dabf7', '#ffc078', '#da77f2'];

interface S {
  faces: number[];
  owner: (number | null)[];
  open: number[];
  turn: number;
  pairs: number[];
  hide: number; // segundos hasta tapar las dos cartas
  last: number;
  match: boolean;
  over: boolean;
}
type A = { card: number };

function View({ s, ctx, me, act }: ViewProps<S, A>) {
  const prev = useRef(s.last);
  useEffect(() => {
    if (s.last === prev.current) return;
    prev.current = s.last;
    if (s.open.length === 2) {
      if (s.match) {
        sfx.coin();
        vibrate(25);
      } else sfx.click();
    } else sfx.whoosh();
  }, [s.last]);
  const cols = s.faces.length > 16 ? 5 : 4;
  const rows = s.faces.length / cols;
  const canPlay = !s.over && s.hide <= 0 && s.open.length < 2 && isMine(me, s.turn);
  const max = Math.max(...s.pairs);
  const winners = s.over ? s.pairs.map((p, i) => (p === max ? i : -1)).filter((i) => i >= 0) : null;
  const tc = ctx.seats[s.turn].color;
  return (
    <div class="vsbody">
      <SeatBar ctx={ctx} turn={s.over ? undefined : s.turn} scores={s.pairs} label={() => 'pares'} />
      <Banner color={`color-mix(in srgb, ${tc} 55%, transparent)`}>
        {s.match && s.open.length === 2 ? '¡Par! Seguís jugando' : canPlay && me !== 'all' ? '¡Te toca!' : `Turno de ${ctx.seats[s.turn].name}`}
      </Banner>
      <div class="memo" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, '--rows': rows, '--cols': cols } as any}>
        {s.faces.map((f, i) => {
          const up = s.open.includes(i) || s.owner[i] !== null;
          const own = s.owner[i];
          return (
            <button class={`mcard ${up ? 'up' : ''} ${own !== null ? 'done' : ''}`} disabled={!canPlay || up} onClick={() => act(s.turn, { card: i })} aria-label={`Carta ${i + 1}`}>
              <div class="mcard-in">
                <div class="mback" />
                <div class="mfront" style={{ background: `radial-gradient(circle at 35% 30%, #fff 0%, ${BG[f]} 70%)`, boxShadow: own !== null ? `0 0 0 4px ${ctx.seats[own].color} inset` : undefined }}>
                  <span>{FACES[f]}</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
      {winners && <Winner ctx={ctx} winners={winners}>{s.pairs.join(' - ')} pares</Winner>}
    </div>
  );
}

export const memoria: VersusDef<S, A> = {
  kind: 'versus',
  id: 'memoria',
  name: 'Memoria de Cartas',
  scene: 'Mesa del living',
  type: 'Atención',
  icon: '🃏',
  color: '#b197fc',
  seconds: 120,
  howTo: 'Dá vuelta dos cartas. Si son iguales te las quedás y seguís. ¡Gana quien junta más pares!',
  seatsBy: 'player',
  min: 2,
  max: 4,
  init(ctx) {
    const R = rng(ctx.seed);
    const n = ctx.seats.length <= 2 ? 8 : 10;
    const faces: number[] = [];
    const pick = [...FACES.keys()].sort(() => R() - 0.5).slice(0, n);
    for (const f of pick) faces.push(f, f);
    for (let i = faces.length - 1; i > 0; i--) {
      const j = Math.floor(R() * (i + 1));
      [faces[i], faces[j]] = [faces[j], faces[i]];
    }
    return { faces, owner: faces.map(() => null), open: [], turn: 0, pairs: ctx.seats.map(() => 0), hide: 0, last: 0, match: false, over: false };
  },
  act(s, seat, a) {
    if (s.over || seat !== s.turn || s.hide > 0 || s.open.length >= 2 || s.open.includes(a.card) || s.owner[a.card] !== null) return s;
    const open = [...s.open, a.card];
    if (open.length < 2) return { ...s, open, match: false, last: s.last + 1 };
    const match = s.faces[open[0]] === s.faces[open[1]];
    return { ...s, open, match, hide: match ? 0.9 : 1.3, last: s.last + 1 };
  },
  tick(s, dt, ctx) {
    if (s.hide <= 0 || s.over) return s;
    const hide = s.hide - dt;
    if (hide > 0) return { ...s, hide };
    if (s.match) {
      const owner = [...s.owner];
      s.open.forEach((c) => (owner[c] = s.turn));
      const pairs = [...s.pairs];
      pairs[s.turn]++;
      const over = owner.every((o) => o !== null);
      return { ...s, owner, pairs, open: [], hide: 0, match: false, over };
    }
    return { ...s, open: [], hide: 0, turn: (s.turn + 1) % ctx.seats.length };
  },
  done: (s) => (s.over ? s.pairs.map((p) => p * 10) : null),
  View
};
