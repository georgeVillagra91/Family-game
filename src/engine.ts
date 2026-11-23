// Motor mínimo para los minijuegos en canvas: escenario, bucle, partículas, textos y HUD.

export function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 4294967296;
  };
}

export interface GameEnv {
  canvas: HTMLCanvasElement;
  seed: number;
  /** 0 = sin ayuda, 1 = ayuda máxima (invisible para el jugador). */
  assist: number;
  color: string;
  end(score: number): void;
}

export interface GameDef {
  id: string;
  name: string;
  scene: string;
  type: 'Reflejos' | 'Habilidad' | 'Atención' | 'Mente';
  icon: string;
  color: string;
  seconds: number;
  howTo: string;
  run(env: GameEnv): () => void;
}

export interface Stage {
  ctx: CanvasRenderingContext2D;
  w: number;
  h: number;
  dispose(): void;
}

export function makeStage(canvas: HTMLCanvasElement, onResize?: (w: number, h: number) => void): Stage {
  const ctx = canvas.getContext('2d')!;
  const st: Stage = { ctx, w: 0, h: 0, dispose: () => ro.disconnect() };
  const fit = () => {
    const r = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    st.w = Math.max(1, r.width);
    st.h = Math.max(1, r.height);
    canvas.width = Math.round(st.w * dpr);
    canvas.height = Math.round(st.h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    onResize?.(st.w, st.h);
  };
  const ro = new ResizeObserver(fit);
  ro.observe(canvas);
  fit();
  return st;
}

export function loop(fn: (dt: number, t: number) => void) {
  let last = performance.now();
  let t = 0;
  let id = 0;
  let alive = true;
  const step = (now: number) => {
    if (!alive) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    t += dt;
    fn(dt, t);
    id = requestAnimationFrame(step);
  };
  id = requestAnimationFrame(step);
  return () => {
    alive = false;
    cancelAnimationFrame(id);
  };
}

/** Pointer en coordenadas CSS del canvas. */
export function pointer(
  canvas: HTMLCanvasElement,
  h: { down?: (x: number, y: number, id: number) => void; move?: (x: number, y: number, id: number) => void; up?: (x: number, y: number, id: number) => void }
) {
  const pos = (e: PointerEvent) => {
    const r = canvas.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top] as const;
  };
  const d = (e: PointerEvent) => {
    e.preventDefault();
    const [x, y] = pos(e);
    h.down?.(x, y, e.pointerId);
  };
  const m = (e: PointerEvent) => {
    const [x, y] = pos(e);
    h.move?.(x, y, e.pointerId);
  };
  const u = (e: PointerEvent) => {
    const [x, y] = pos(e);
    h.up?.(x, y, e.pointerId);
  };
  canvas.addEventListener('pointerdown', d);
  canvas.addEventListener('pointermove', m);
  window.addEventListener('pointerup', u);
  return () => {
    canvas.removeEventListener('pointerdown', d);
    canvas.removeEventListener('pointermove', m);
    window.removeEventListener('pointerup', u);
  };
}

// ---------- Partículas y textos flotantes ----------
interface Particle { x: number; y: number; vx: number; vy: number; life: number; max: number; size: number; color: string; shape: 0 | 1 | 2; rot: number; vr: number }
interface Floater { x: number; y: number; text: string; color: string; life: number; size: number }

export class FX {
  ps: Particle[] = [];
  fs: Floater[] = [];
  shake = 0;
  burst(x: number, y: number, colors: string[], n = 14, speed = 220, size = 6) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = speed * (0.4 + Math.random() * 0.8);
      this.ps.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 60, life: 0, max: 0.5 + Math.random() * 0.5, size: size * (0.6 + Math.random() * 0.8), color: colors[i % colors.length], shape: (i % 3) as 0 | 1 | 2, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 12 });
    }
  }
  confetti(w: number, n = 80) {
    const cols = ['#ff5d73', '#ffd23f', '#3ddc84', '#1fc8db', '#8c5bff', '#ff9f43'];
    for (let i = 0; i < n; i++) this.ps.push({ x: Math.random() * w, y: -20 - Math.random() * 200, vx: (Math.random() - 0.5) * 80, vy: 80 + Math.random() * 120, life: 0, max: 3 + Math.random() * 2, size: 5 + Math.random() * 5, color: cols[i % cols.length], shape: 1, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 10 });
  }
  text(x: number, y: number, text: string, color = '#fff', size = 28) {
    this.fs.push({ x, y, text, color, life: 0, size });
  }
  update(dt: number) {
    for (const p of this.ps) {
      p.life += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 420 * dt;
      p.vx *= 0.985;
      p.rot += p.vr * dt;
    }
    this.ps = this.ps.filter((p) => p.life < p.max);
    for (const f of this.fs) {
      f.life += dt;
      f.y -= 50 * dt;
    }
    this.fs = this.fs.filter((f) => f.life < 0.9);
    this.shake = Math.max(0, this.shake - dt * 30);
  }
  draw(ctx: CanvasRenderingContext2D) {
    for (const p of this.ps) {
      ctx.globalAlpha = Math.max(0, 1 - p.life / p.max);
      ctx.fillStyle = p.color;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      if (p.shape === 0) {
        ctx.beginPath();
        ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.shape === 1) ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      else star(ctx, 0, 0, p.size * 0.7, p.size * 0.3, 5);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    for (const f of this.fs) {
      const k = f.life / 0.9;
      const sc = k < 0.15 ? 0.6 + (k / 0.15) * 0.5 : 1.1 - Math.min(0.1, (k - 0.15) * 0.3);
      ctx.globalAlpha = 1 - Math.max(0, (k - 0.6) / 0.4);
      ctx.font = `800 ${Math.round(f.size * sc)}px "Baloo 2", system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 5;
      ctx.strokeStyle = 'rgba(30,15,60,.85)';
      ctx.strokeText(f.text, f.x, f.y);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.globalAlpha = 1;
  }
  applyShake(ctx: CanvasRenderingContext2D) {
    if (this.shake > 0) ctx.translate((Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake);
  }
}

export function star(ctx: CanvasRenderingContext2D, x: number, y: number, R: number, r: number, n = 5) {
  ctx.beginPath();
  for (let i = 0; i < n * 2; i++) {
    const a = (i * Math.PI) / n - Math.PI / 2;
    const rad = i % 2 ? r : R;
    ctx.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad);
  }
  ctx.closePath();
  ctx.fill();
}

export function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function font(px: number, weight = 800) {
  return `${weight} ${Math.round(px)}px "Baloo 2", system-ui, sans-serif`;
}

/** HUD común: puntaje y barra de tiempo. */
export function hud(ctx: CanvasRenderingContext2D, w: number, score: number, frac: number, label?: string) {
  // barra de tiempo
  const bw = w - 32;
  ctx.fillStyle = 'rgba(0,0,0,.25)';
  roundRect(ctx, 16, 12, bw, 10, 5);
  ctx.fill();
  const g = ctx.createLinearGradient(16, 0, 16 + bw, 0);
  g.addColorStop(0, frac < 0.25 ? '#ff5d73' : '#3ddc84');
  g.addColorStop(1, frac < 0.25 ? '#ff9f43' : '#1fc8db');
  ctx.fillStyle = g;
  roundRect(ctx, 16, 12, Math.max(10, bw * Math.max(0, Math.min(1, frac))), 10, 5);
  ctx.fill();
  // puntaje
  const txt = `${score}`;
  ctx.font = font(30);
  const tw = ctx.measureText(txt).width;
  ctx.fillStyle = 'rgba(20,10,45,.55)';
  roundRect(ctx, 16, 32, tw + 36, 42, 21);
  ctx.fill();
  ctx.fillStyle = '#ffd23f';
  star(ctx, 34, 53, 9, 4);
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(txt, 46, 55);
  if (label) {
    ctx.font = font(18, 700);
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(255,255,255,.9)';
    ctx.fillText(label, w - 74, 54);
  }
}

export function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}
export function clamp(v: number, a: number, b: number) {
  return Math.max(a, Math.min(b, v));
}
