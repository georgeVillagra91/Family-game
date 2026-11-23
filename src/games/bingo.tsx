// Bingo: 2 a 4 jugadores a la vez, cada uno con su cartón. Se canta un número cada 3 segundos.
// Marcá los números cantados, cantá LÍNEA y después BINGO. Si cantás mal, te congelás 2 segundos.
import { useEffect, useRef } from 'preact/hooks';
import type { VersusDef, ViewProps, VCtx } from '../versus';
import { isMine } from '../vsui';
import { rng } from '../engine';
import { getSettings } from '../store';
import { sfx, vibrate } from '../audio';

const MAXN = 40;
const EVERY = 3.2;
const COLCOL = ['#ff4d6d', '#ffb020', '#3ddc84', '#4d8bff'];

interface S {
  cards: number[][]; // 16 números por asiento (columna por columna)
  marks: boolean[][];
  deck: number[];
  called: number;
  next: number; // segundos hasta el próximo número
  line: number | null;
  bingo: number | null;
  freeze: number[];
  msg: { text: string; seat: number; t: number } | null;
  t: number;
  over: boolean;
}
type A = { mark: number } | { claim: 'line' | 'bingo' };

const colorOf = (n: number) => COLCOL[Math.min(3, Math.floor((n - 1) / 10))];

function hasLine(m: boolean[]) {
  const L: number[][] = [];
  for (let r = 0; r < 4; r++) L.push([0, 1, 2, 3].map((c) => r * 4 + c));
  for (let c = 0; c < 4; c++) L.push([0, 1, 2, 3].map((r) => r * 4 + c));
  L.push([0, 5, 10, 15], [3, 6, 9, 12]);
  return L.some((l) => l.every((i) => m[i]));
}

function speak(n: number) {
  if (!getSettings().sound) return;
  try {
    const u = new SpeechSynthesisUtterance(String(n));
    u.lang = 'es-AR';
    u.rate = 1.05;
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  } catch {
    /* sin voz */
  }
}

function Ball({ n, size }: { n: number; size: number }) {
  const c = colorOf(n);
  return (
    <div class="ball" style={{ width: `${size}px`, height: `${size}px`, background: `radial-gradient(circle at 32% 28%, #fff 0 8%, ${c} 45%, color-mix(in srgb, ${c} 50%, #000) 100%)` }}>
      <span style={{ fontSize: `${size * 0.36}px`, width: `${size * 0.58}px`, height: `${size * 0.58}px` }}>{n}</span>
    </div>
  );
}

function Caller({ s, compact }: { s: S; compact?: boolean }) {
  const cur = s.called > 0 ? s.deck[s.called - 1] : null;
  const prev = s.deck.slice(Math.max(0, s.called - 6), Math.max(0, s.called - 1)).reverse();
  return (
    <div class={`caller ${compact ? 'compact' : ''}`}>
      {cur ? <Ball key={cur} n={cur} size={compact ? 64 : 92} /> : <div class="ball empty" style={{ width: compact ? '64px' : '92px', height: compact ? '64px' : '92px' }}>{Math.ceil(s.next)}</div>}
      <div class="prevballs">
        {prev.map((n) => (
          <Ball n={n} size={compact ? 30 : 38} />
        ))}
      </div>
      <div class="callinfo">
        {s.called}/{MAXN}
        <br />
        <span>{s.line === null ? 'Línea: libre' : 'Línea ✓'}</span>
      </div>
    </div>
  );
}

function Card({ s, ctx, seat, act, rot }: { s: S; ctx: VCtx; seat: number; act: ViewProps<S, A>['act']; rot?: boolean }) {
  const st = ctx.seats[seat];
  const called = new Set(s.deck.slice(0, s.called));
  const frozen = s.freeze[seat] > 0;
  const lineReady = s.line === null && hasLine(s.marks[seat]);
  const bingoReady = s.marks[seat].every(Boolean);
  return (
    <div class={`bcard ${rot ? 'rot' : ''} ${frozen ? 'frozen' : ''}`} style={{ '--c': st.color } as any}>
      <div class="bhead">
        <b>{st.name}</b>
        <span>{s.line === seat ? '⭐ Línea' : ''}</span>
      </div>
      <div class="bgrid">
        {[0, 1, 2, 3].map((r) =>
          [0, 1, 2, 3].map((c) => {
            const i = r * 4 + c;
            const n = s.cards[seat][c * 4 + r];
            const m = s.marks[seat][i];
            return (
              <button
                class={`bcell ${m ? 'on' : ''}`}
                style={{ '--k': colorOf(n) } as any}
                disabled={s.over}
                onPointerDown={(e) => {
                  e.preventDefault();
                  if (m || frozen) return;
                  if (called.has(n)) {
                    sfx.pop();
                    vibrate(10);
                  } else sfx.click();
                  act(seat, { mark: i });
                }}
              >
                <span>{n}</span>
              </button>
            );
          })
        )}
      </div>
      <div class="bbtns">
        <button class={`bclaim ${lineReady ? 'ready' : ''}`} disabled={s.over || s.line !== null || frozen} onPointerDown={(e) => (e.preventDefault(), act(seat, { claim: 'line' }))}>
          ¡LÍNEA!
        </button>
        <button class={`bclaim big ${bingoReady ? 'ready' : ''}`} disabled={s.over || frozen} onPointerDown={(e) => (e.preventDefault(), act(seat, { claim: 'bingo' }))}>
          ¡BINGO!
        </button>
      </div>
      {frozen && <div class="bfrozen">🧊 ¡Cantaste mal!</div>}
    </div>
  );
}

function View({ s, ctx, me, act }: ViewProps<S, A>) {
  const lastCalled = useRef(s.called);
  useEffect(() => {
    if (s.called !== lastCalled.current && s.called > 0) {
      lastCalled.current = s.called;
      sfx.beep();
      speak(s.deck[s.called - 1]);
    }
  }, [s.called]);
  const lastMsg = useRef(0);
  useEffect(() => {
    if (s.msg && s.msg.t !== lastMsg.current) {
      lastMsg.current = s.msg.t;
      if (s.msg.text.startsWith('¡')) sfx.fanfare();
      else sfx.bad();
    }
  }, [s.msg?.t]);
  const n = ctx.seats.length;
  const banner = s.msg && s.t - s.msg.t < 2.5 ? (
    <div class="bmsg" style={{ background: ctx.seats[s.msg.seat].color }}>
      {s.msg.text}
    </div>
  ) : null;
  const winner = s.over ? (
    <div class="vswin">
      <div class="crown">👑</div>
      <h3>{s.bingo !== null ? `¡BINGO de ${ctx.seats[s.bingo].name}!` : '¡Se terminaron los números!'}</h3>
    </div>
  ) : null;
  if (me === 'all') {
    const top = n <= 2 ? [1] : [2, 3].filter((i) => i < n);
    const bottom = n <= 2 ? [0] : [0, 1];
    return (
      <div class={`bingo local n${n}`}>
        <div class="bcards top">
          {top.map((i) => (
            <Card s={s} ctx={ctx} seat={i} act={act} rot />
          ))}
        </div>
        <Caller s={s} compact />
        <div class="bcards">
          {bottom.map((i) => (
            <Card s={s} ctx={ctx} seat={i} act={act} />
          ))}
        </div>
        {banner}
        {winner}
      </div>
    );
  }
  return (
    <div class="bingo online">
      <div style={{ height: 'max(56px, calc(env(safe-area-inset-top) + 50px))' }} />
      <Caller s={s} />
      <div class="bcards">
        {ctx.seats.map((_, i) => (isMine(me, i) ? <Card s={s} ctx={ctx} seat={i} act={act} /> : null))}
      </div>
      {banner}
      {winner}
    </div>
  );
}

export const bingo: VersusDef<S, A> = {
  kind: 'versus',
  id: 'bingo',
  name: 'Bingo Familiar',
  scene: 'Club del barrio',
  type: 'Atención',
  icon: '🎱',
  color: '#ffb020',
  seconds: 120,
  howTo: 'Marcá en tu cartón los números que se cantan. Cantá LÍNEA con 4 en fila y BINGO con el cartón lleno.',
  seatsBy: 'player',
  min: 2,
  max: 4,
  init(ctx) {
    const R = rng(ctx.seed);
    const deck = Array.from({ length: MAXN }, (_, i) => i + 1);
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(R() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    const cards = ctx.seats.map(() => {
      const out: number[] = [];
      for (let c = 0; c < 4; c++) {
        const pool = Array.from({ length: 10 }, (_, i) => c * 10 + i + 1).sort(() => R() - 0.5).slice(0, 4).sort((a, b) => a - b);
        out.push(...pool);
      }
      return out;
    });
    return { cards, marks: ctx.seats.map(() => Array(16).fill(false)), deck, called: 0, next: 3, line: null, bingo: null, freeze: ctx.seats.map(() => 0), msg: null, t: 0, over: false };
  },
  act(s, seat, a, ctx) {
    if (s.over || s.freeze[seat] > 0) return s;
    if ('mark' in a) {
      const r = a.mark % 4, c = Math.floor(a.mark / 4);
      const n = s.cards[seat][r * 4 + c];
      if (s.marks[seat][a.mark] || !s.deck.slice(0, s.called).includes(n)) return s;
      const marks = s.marks.map((m) => [...m]);
      marks[seat][a.mark] = true;
      return { ...s, marks };
    }
    const freeze = [...s.freeze];
    if (a.claim === 'line') {
      if (s.line === null && hasLine(s.marks[seat])) return { ...s, line: seat, msg: { text: `¡LÍNEA de ${ctx.seats[seat].name}!`, seat, t: s.t } };
    } else if (s.marks[seat].every(Boolean)) return { ...s, bingo: seat, over: true, msg: { text: `¡BINGO de ${ctx.seats[seat].name}!`, seat, t: s.t } };
    freeze[seat] = 2;
    return { ...s, freeze, msg: { text: `${ctx.seats[seat].name} cantó mal 🧊`, seat, t: s.t } };
  },
  tick(s, dt) {
    if (s.over) return s;
    const n = { ...s, t: s.t + dt, next: s.next - dt };
    if (s.freeze.some((f) => f > 0)) n.freeze = s.freeze.map((f) => Math.max(0, f - dt));
    if (n.next <= 0) {
      if (s.called >= MAXN) n.over = true;
      else {
        n.called = s.called + 1;
        n.next = EVERY;
      }
    }
    return n;
  },
  done(s) {
    if (!s.over) return null;
    return s.marks.map((m, i) => m.filter(Boolean).length + (s.line === i ? 15 : 0) + (s.bingo === i ? 40 : 0));
  },
  View
};
