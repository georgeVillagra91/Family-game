// Tutti Frutti (¡Pare el carrito!): una letra y 6 categorías.
// Online: todos escriben a la vez y el primero que completa todo frena el carrito.
// En un celu: escriben por turnos, sin mirar lo de los demás.
import { useEffect, useRef, useState } from 'preact/hooks';
import type { VersusDef, ViewProps, VCtx } from '../versus';
import { Avatar } from '../avatar';
import { Banner, Cover, SeatBar, isMine } from '../vsui';
import { rng } from '../engine';
import { sfx, vibrate } from '../audio';

export const CATS = ['Nombre', 'Animal', 'Fruta o verdura', 'País o ciudad', 'Color', 'Cosa'];
const LETTERS = 'ABCDEFGHIJLMNOPRSTUV'.split('');
const WRITE_TIME = 120;
const LOCAL_TIME = 90;
const STOP_TIME = 5;

interface S {
  phase: 'write' | 'stop' | 'review' | 'over';
  letter: string;
  answers: string[][];
  finished: boolean[];
  writer: number; // en un celu: quién escribe ahora
  timer: number;
  stopper: number | null;
  reject: Record<string, boolean>;
}
type A = { set: number; text: string } | { stop: true } | { reject: string } | { confirm: true };

const norm = (t: string) => t.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

export function scoreTutti(s: S): { pts: number[][]; total: number[] } {
  const L = s.letter.toLowerCase();
  const pts = s.answers.map(() => CATS.map(() => 0));
  CATS.forEach((_, c) => {
    const valid = s.answers.map((a, i) => {
      const n = norm(a[c] ?? '');
      return n.length >= 2 && n.startsWith(L) && !s.reject[`${i}-${c}`] ? n : null;
    });
    valid.forEach((v, i) => {
      if (!v) return;
      const dup = valid.filter((x) => x === v).length > 1;
      pts[i][c] = dup ? 5 : 10;
    });
  });
  return { pts, total: pts.map((p) => p.reduce((a, b) => a + b, 0)) };
}

function Sheet({ s, seat, act, ctx }: { s: S; seat: number; act: ViewProps<S, A>['act']; ctx: VCtx }) {
  const [draft, setDraft] = useState<string[]>(() => [...s.answers[seat]]);
  const timers = useRef<Record<number, any>>({});
  const locked = s.phase !== 'write' && s.phase !== 'stop' ? true : s.finished[seat];
  const send = (c: number, text: string) => {
    clearTimeout(timers.current[c]);
    timers.current[c] = setTimeout(() => act(seat, { set: c, text }), ctx.local ? 0 : 250);
  };
  const full = draft.every((d) => norm(d).length >= 1);
  const stopping = s.phase === 'stop';
  return (
    <div class="sheet" style={{ '--c': ctx.seats[seat].color } as any}>
      {CATS.map((cat, c) => (
        <label class="tfield">
          <span>{cat}</span>
          <input
            value={draft[c]}
            disabled={locked}
            maxLength={24}
            autoComplete="off"
            autoCapitalize="words"
            placeholder={`${s.letter}…`}
            onInput={(e) => {
              const v = (e.target as HTMLInputElement).value;
              const d = [...draft];
              d[c] = v;
              setDraft(d);
              send(c, v);
            }}
            onBlur={(e) => act(seat, { set: c, text: (e.target as HTMLInputElement).value })}
          />
        </label>
      ))}
      {!locked && (
        <button
          class={`btn ${ctx.local ? 'green' : 'pink'}`}
          disabled={!ctx.local && !full && !stopping}
          onClick={() => {
            draft.forEach((t, c) => act(seat, { set: c, text: t }));
            act(seat, { stop: true });
            sfx.go();
            vibrate(40);
          }}
        >
          {ctx.local ? '¡Terminé!' : stopping ? 'Listo' : full ? '🛑 ¡Pare el carrito!' : 'Completá todo para frenar'}
        </button>
      )}
    </div>
  );
}

function Review({ s, ctx, me, act }: ViewProps<S, A>) {
  const { pts, total } = scoreTutti(s);
  return (
    <div class="review">
      <p class="muted center" style={{ margin: 0 }}>
        Tocá una respuesta para anularla si no vale. Repetidas valen 5, únicas 10.
      </p>
      {CATS.map((cat, c) => (
        <div class="rcat">
          <b>{cat}</b>
          <div class="rans">
            {ctx.seats.map((st, i) => {
              const a = s.answers[i][c]?.trim();
              const key = `${i}-${c}`;
              return (
                <button class={`ans ${s.reject[key] ? 'no' : ''} ${pts[i][c] === 0 ? 'zero' : ''}`} style={{ '--c': st.color } as any} disabled={s.phase === 'over'} onClick={() => (sfx.click(), act(me === 'all' ? 0 : (me as number[])[0] ?? 0, { reject: key }))}>
                  <Avatar spec={st.avatar} size={22} />
                  <span>{a || '—'}</span>
                  <em>{pts[i][c]}</em>
                </button>
              );
            })}
          </div>
        </div>
      ))}
      <div class="rtotal">
        {ctx.seats.map((st, i) => (
          <div class="seat" style={{ '--c': st.color } as any}>
            <Avatar spec={st.avatar} size={34} ring={st.color} />
            <b>{st.name}</b>
            <div class="seatscore">{total[i]}</div>
          </div>
        ))}
      </div>
      {s.phase === 'review' && (me === 'all' || (me as number[]).length > 0) && (
        <button class="btn green" onClick={() => (sfx.good(), act(me === 'all' ? 0 : (me as number[])[0], { confirm: true }))}>
          Confirmar puntos
        </button>
      )}
    </div>
  );
}

function View(p: ViewProps<S, A>) {
  const { s, ctx, me, act } = p;
  const [viewer, setViewer] = useState<number | null>(null);
  const prevPhase = useRef(s.phase);
  useEffect(() => {
    if (s.phase !== prevPhase.current) {
      if (s.phase === 'stop') sfx.bad();
      if (s.phase === 'review') sfx.fanfare();
      prevPhase.current = s.phase;
    }
  }, [s.phase]);
  const head = (
    <div class="tuttihead">
      <div class="letter">{s.letter}</div>
      <div>
        <div class="muted" style={{ fontWeight: 700, fontSize: '14px' }}>
          Letra
        </div>
        <div style={{ fontSize: '22px', fontWeight: 800, lineHeight: 1 }}>{s.phase === 'stop' ? `¡${ctx.seats[s.stopper!].name} frenó el carrito! ${Math.ceil(s.timer)}` : s.phase === 'write' ? `⏱ ${Math.ceil(s.timer)} s` : 'Revisión'}</div>
      </div>
    </div>
  );
  if (s.phase === 'review' || s.phase === 'over')
    return (
      <div class="vsbody tutti">
        {head}
        <Review {...p} />
      </div>
    );
  if (me === 'all') {
    if (viewer !== s.writer) return <div class="vsbody"><Cover ctx={ctx} seat={s.writer} text={`Te toca escribir con la letra ${s.letter}. Tenés ${LOCAL_TIME} segundos.`} onReveal={() => (sfx.tap(), setViewer(s.writer))} /></div>;
    return (
      <div class="vsbody tutti">
        <SeatBar ctx={ctx} turn={s.writer} label={(i) => (s.finished[i] ? 'listo' : i === s.writer ? 'escribiendo' : 'espera')} />
        {head}
        <Sheet key={s.writer} s={s} seat={s.writer} act={act} ctx={ctx} />
      </div>
    );
  }
  const mine = (me as number[]).filter((i) => isMine(me, i));
  return (
    <div class="vsbody tutti">
      <SeatBar ctx={ctx} label={(i) => (s.finished[i] ? '¡listo!' : 'escribiendo…')} />
      {head}
      {mine.length ? mine.map((i) => <Sheet s={s} seat={i} act={act} ctx={ctx} />) : <Banner>Estás mirando</Banner>}
    </div>
  );
}

export const tutti: VersusDef<S, A> = {
  kind: 'versus',
  id: 'tutti',
  name: 'Tutti Frutti',
  scene: '¡Pare el carrito!',
  type: 'Mente',
  icon: '🛒',
  color: '#ff6fd8',
  seconds: 180,
  howTo: 'Sale una letra: escribí un nombre, un animal, una fruta, un país, un color y una cosa que empiecen con ella. ¡El primero que completa frena el carrito!',
  seatsBy: 'player',
  min: 2,
  max: 6,
  init(ctx) {
    const R = rng(ctx.seed);
    return { phase: 'write', letter: LETTERS[Math.floor(R() * LETTERS.length)], answers: ctx.seats.map(() => CATS.map(() => '')), finished: ctx.seats.map(() => false), writer: 0, timer: ctx.local ? LOCAL_TIME : WRITE_TIME, stopper: null, reject: {} };
  },
  act(s, seat, a, ctx) {
    if ('set' in a) {
      if ((s.phase !== 'write' && s.phase !== 'stop') || s.finished[seat]) return s;
      if (ctx.local && seat !== s.writer) return s;
      if (s.answers[seat][a.set] === a.text) return s;
      const answers = s.answers.map((x) => [...x]);
      answers[seat][a.set] = a.text.slice(0, 24);
      return { ...s, answers };
    }
    if ('stop' in a) {
      if (s.finished[seat]) return s;
      const finished = [...s.finished];
      finished[seat] = true;
      if (ctx.local) {
        const next = finished.findIndex((f) => !f);
        return next < 0 ? { ...s, finished, phase: 'review' } : { ...s, finished, writer: next, timer: LOCAL_TIME };
      }
      if (s.phase === 'write') return { ...s, finished, phase: 'stop', stopper: seat, timer: STOP_TIME };
      return finished.every(Boolean) ? { ...s, finished, phase: 'review' } : { ...s, finished };
    }
    if ('reject' in a) {
      if (s.phase !== 'review') return s;
      return { ...s, reject: { ...s.reject, [a.reject]: !s.reject[a.reject] } };
    }
    if ('confirm' in a && s.phase === 'review') return { ...s, phase: 'over' };
    return s;
  },
  tick(s, dt, ctx) {
    if (s.phase !== 'write' && s.phase !== 'stop') return s;
    const timer = s.timer - dt;
    if (timer > 0) return Math.ceil(timer) !== Math.ceil(s.timer) ? { ...s, timer } : (s.timer = timer, s);
    if (ctx.local) {
      const finished = [...s.finished];
      finished[s.writer] = true;
      const next = finished.findIndex((f) => !f);
      return next < 0 ? { ...s, finished, phase: 'review', timer: 0 } : { ...s, finished, writer: next, timer: LOCAL_TIME };
    }
    return { ...s, phase: 'review', timer: 0, finished: s.finished.map(() => true) };
  },
  done: (s) => (s.phase === 'over' ? scoreTutti(s).total : null),
  View
};
