// Carrera de Caracoles: 2 a 4 jugadores a la vez. Cada uno toca SUS dos botones alternados.
// En un celu: cada jugador usa su esquina (los de arriba ven sus botones dados vuelta).
import { useEffect, useRef } from 'preact/hooks';
import type { VersusDef, ViewProps, VCtx } from '../versus';
import { isMine } from '../vsui';
import { sfx, vibrate } from '../audio';
import { roundRect } from '../engine';

const STEPS = 34;
const PUDDLES = [0.32, 0.64];
const MAX_TIME = 30;

interface S {
  pos: number[];
  lastBtn: number[];
  stun: number[];
  order: number[];
  count: number; // cuenta regresiva
  t: number;
  firstAt: number;
  over: boolean;
  taps: number;
}
type A = { b: 0 | 1 };

function drawSnail(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, color: string, t: number, stun: number, name: string) {
  ctx.save();
  ctx.translate(x, y);
  const wob = stun > 0 ? Math.sin(t * 40) * 0.15 : 0;
  ctx.rotate(wob);
  ctx.scale(s, s);
  // cuerpo
  const stretch = 1 + Math.sin(t * 10) * 0.05;
  ctx.fillStyle = '#ffd8a8';
  ctx.beginPath();
  ctx.moveTo(-34 * stretch, 12);
  ctx.quadraticCurveTo(-30, 0, 0, 2);
  ctx.quadraticCurveTo(26 * stretch, -2, 30 * stretch, -10);
  ctx.quadraticCurveTo(38 * stretch, 10, 20, 14);
  ctx.closePath();
  ctx.fill();
  // antenas
  ctx.strokeStyle = '#e8b47c';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  for (const k of [0, 1]) {
    ctx.beginPath();
    ctx.moveTo(26 * stretch, -8);
    const ex = 32 * stretch + k * 8, ey = -28 - Math.sin(t * 6 + k) * 3;
    ctx.lineTo(ex, ey);
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(ex, ey, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2a1a3a';
    ctx.beginPath();
    ctx.arc(ex + 1.5, ey, 2.4, 0, Math.PI * 2);
    ctx.fill();
  }
  // caparazón
  const g = ctx.createRadialGradient(-12, -16, 2, -8, -10, 26);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.25, color);
  g.addColorStop(1, '#1a0f33');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(-8, -10, 22, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.6)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let a = 0; a < Math.PI * 5; a += 0.2) {
    const r = 18 - a * 1.1;
    if (r < 1) break;
    ctx.lineTo(-8 + Math.cos(a + t) * r, -10 + Math.sin(a + t) * r);
  }
  ctx.stroke();
  // casco
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(-8, -30, 9, Math.PI, 0);
  ctx.fill();
  ctx.restore();
  if (name) {
    ctx.font = `800 ${Math.round(13 * s * 1.3)}px "Baloo 2", sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(0,0,0,.45)';
    roundRect(ctx, x - 40 * s, y + 20 * s, 80 * s, 18 * s, 9 * s);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.textBaseline = 'middle';
    ctx.fillText(name, x, y + 29 * s);
  }
}

function Track({ s, ctx, flip }: { s: S; ctx: VCtx; flip?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const t0 = useRef(performance.now());
  useEffect(() => {
    const c = ref.current!;
    const r = c.getBoundingClientRect();
    const dpr = Math.min(2, devicePixelRatio || 1);
    if (c.width !== Math.round(r.width * dpr)) {
      c.width = Math.round(r.width * dpr);
      c.height = Math.round(r.height * dpr);
    }
    const g = c.getContext('2d')!;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const w = r.width, h = r.height;
    const t = (performance.now() - t0.current) / 1000;
    // pasto
    const bg = g.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#5fcf6f');
    bg.addColorStop(1, '#2f9e5e');
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
    const n = ctx.seats.length;
    const lane = h / n;
    const x0 = 46, x1 = w - 40;
    for (let i = 0; i < n; i++) {
      const y = i * lane;
      g.fillStyle = i % 2 ? 'rgba(120,80,40,.55)' : 'rgba(140,95,50,.55)';
      g.fillRect(0, y + 4, w, lane - 8);
      g.fillStyle = ctx.seats[i].color;
      g.fillRect(0, y + 4, 8, lane - 8);
      // charcos
      for (const p of PUDDLES) {
        g.fillStyle = 'rgba(90,170,255,.6)';
        g.beginPath();
        g.ellipse(x0 + (x1 - x0) * p, y + lane / 2 + 6, 22, lane * 0.22, 0, 0, Math.PI * 2);
        g.fill();
      }
      // baba
      const px = x0 + (x1 - x0) * Math.min(1, s.pos[i]);
      g.fillStyle = 'rgba(255,255,255,.25)';
      g.fillRect(x0 - 20, y + lane / 2 + 8, px - x0, 6);
    }
    // meta a cuadros
    const sq = 8;
    for (let y = 0; y < h; y += sq) for (let k = 0; k < 2; k++) {
      g.fillStyle = ((y / sq + k) | 0) % 2 ? '#fff' : '#222';
      g.fillRect(x1 + 10 + k * sq, y, sq, sq);
    }
    const sc = Math.min(1.1, lane / 70);
    for (let i = 0; i < n; i++) {
      const px = x0 + (x1 - x0) * Math.min(1, s.pos[i]);
      drawSnail(g, px, i * lane + lane / 2 + 4, sc, ctx.seats[i].color, t + i, s.stun[i], ctx.seats[i].name);
      const place = s.order.indexOf(i);
      if (place >= 0) {
        g.font = `800 ${Math.round(26 * sc)}px "Baloo 2", sans-serif`;
        g.fillStyle = '#ffd23f';
        g.textAlign = 'center';
        g.fillText(['🥇', '🥈', '🥉', '4°'][place], x1 - 40, i * lane + lane / 2 - 18 * sc);
      }
    }
    if (s.count > 0 || (s.t < 0.7 && s.count <= 0)) {
      g.fillStyle = 'rgba(18,10,51,.35)';
      g.fillRect(0, 0, w, h);
      g.font = `800 ${Math.round(Math.min(h * 0.6, 90))}px "Baloo 2", sans-serif`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillStyle = '#fff';
      g.fillText(s.count > 0 ? `${Math.ceil(s.count)}` : '¡YA!', w / 2, h / 2);
    }
  });
  return <canvas ref={ref} class="track" style={flip ? { transform: 'rotate(180deg)' } : undefined} />;
}

function Pad({ seat, ctx, s, act, rot }: { seat: number; ctx: VCtx; s: S; act: ViewProps<S, A>['act']; rot?: boolean }) {
  const st = ctx.seats[seat];
  const press = (b: 0 | 1) => (e: PointerEvent) => {
    e.preventDefault();
    if (s.count > 0 || s.over) return;
    if (s.lastBtn[seat] === b) {
      sfx.bad();
      vibrate(80);
    } else {
      sfx.tap();
      vibrate(8);
    }
    act(seat, { b });
  };
  const next = s.lastBtn[seat] === 0 ? 1 : 0;
  return (
    <div class={`pad ${rot ? 'rot' : ''}`} style={{ '--c': st.color } as any}>
      <div class="padname">
        {st.name} {s.stun[seat] > 0 ? '💫 ¡resbaló!' : s.order.includes(seat) ? `🏁 ${s.order.indexOf(seat) + 1}°` : ''}
      </div>
      <div class="padbtns">
        {[0, 1].map((b) => (
          <button class={`padbtn ${s.count <= 0 && !s.over && next === b && s.lastBtn[seat] !== -1 ? 'hint' : ''}`} onPointerDown={press(b as 0 | 1)} aria-label={b === 0 ? 'Izquierda' : 'Derecha'}>
            {b === 0 ? '👣' : '👣'}
          </button>
        ))}
      </div>
    </div>
  );
}

function View({ s, ctx, me, act }: ViewProps<S, A>) {
  const prevCount = useRef(Math.ceil(s.count));
  useEffect(() => {
    const c = Math.ceil(s.count);
    if (c !== prevCount.current) {
      prevCount.current = c;
      if (c > 0) sfx.beep();
      else sfx.go();
    }
  });
  const prevOrder = useRef(0);
  useEffect(() => {
    if (s.order.length > prevOrder.current) {
      prevOrder.current = s.order.length;
      sfx.win();
    }
  }, [s.order.length]);
  const n = ctx.seats.length;
  if (me === 'all') {
    // Un celu: esquinas. Abajo seat 0 (y 1 si son 3-4), arriba el resto dado vuelta.
    const bottom = n <= 2 ? [0] : [0, 1];
    const top = n <= 2 ? [1] : [2, 3].filter((i) => i < n);
    return (
      <div class="race local">
        <div class="pads top">
          {top.map((i) => (
            <Pad seat={i} ctx={ctx} s={s} act={act} rot />
          ))}
        </div>
        <Track s={s} ctx={ctx} />
        <div class="pads">
          {bottom.map((i) => (
            <Pad seat={i} ctx={ctx} s={s} act={act} />
          ))}
        </div>
      </div>
    );
  }
  return (
    <div class="race online">
      <div style={{ height: 'max(56px, calc(env(safe-area-inset-top) + 50px))' }} />
      <Track s={s} ctx={ctx} />
      <div class="pads">
        {ctx.seats.map((_, i) => (isMine(me, i) ? <Pad seat={i} ctx={ctx} s={s} act={act} /> : null))}
        {me.length === 0 && <p class="center muted">Estás mirando la carrera</p>}
      </div>
    </div>
  );
}

export const caracoles: VersusDef<S, A> = {
  kind: 'versus',
  id: 'caracoles',
  name: 'Carrera de Caracoles',
  scene: 'Jardín después de la lluvia',
  type: 'Reflejos',
  icon: '🐌',
  color: '#3ddc84',
  seconds: 25,
  howTo: 'Todos a la vez: tocá tus dos botones alternados, izquierda y derecha. ¡Si repetís, tu caracol resbala!',
  seatsBy: 'player',
  min: 2,
  max: 4,
  init: (ctx) => ({ pos: ctx.seats.map(() => 0), lastBtn: ctx.seats.map(() => -1), stun: ctx.seats.map(() => 0), order: [], count: 3, t: 0, firstAt: 0, over: false, taps: 0 }),
  act(s, seat, a) {
    if (s.count > 0 || s.over || s.order.includes(seat) || s.stun[seat] > 0) return s;
    const lastBtn = [...s.lastBtn];
    const stun = [...s.stun];
    const pos = [...s.pos];
    if (lastBtn[seat] === a.b) {
      stun[seat] = 0.55;
      lastBtn[seat] = -1;
    } else {
      lastBtn[seat] = a.b;
      const inPuddle = PUDDLES.some((p) => Math.abs(pos[seat] - p) < 0.035);
      pos[seat] = Math.min(1, pos[seat] + (inPuddle ? 0.5 : 1) / STEPS);
    }
    const order = pos[seat] >= 1 && !s.order.includes(seat) ? [...s.order, seat] : s.order;
    return { ...s, pos, lastBtn, stun, order, firstAt: s.order.length === 0 && order.length ? s.t : s.firstAt, taps: s.taps + 1 };
  },
  tick(s, dt, ctx) {
    if (s.over) return s;
    const n = { ...s };
    if (s.count > 0) n.count = s.count - dt;
    else n.t = s.t + dt;
    if (s.stun.some((x) => x > 0)) n.stun = s.stun.map((x) => Math.max(0, x - dt));
    if (s.order.length >= ctx.seats.length || n.t > MAX_TIME || (s.order.length > 0 && n.t - s.firstAt > 5)) n.over = true;
    return n;
  },
  done(s) {
    if (!s.over) return null;
    const pts = [100, 70, 50, 35];
    return s.pos.map((p, i) => (s.order.includes(i) ? pts[s.order.indexOf(i)] : Math.round(p * 40)));
  },
  View
};
