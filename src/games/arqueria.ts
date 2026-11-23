// Arquería: apuntá con el dedo, soltá para tirar. Ojo con el viento y con el pulso.
import { FX, GameDef, font, hud, loop, makeStage, pointer, rng, roundRect } from '../engine';
import { sfx, vibrate } from '../audio';

const ARROWS = 6;
const RINGS = ['#ffd23f', '#ffd23f', '#ff4d6d', '#ff4d6d', '#4d8bff', '#4d8bff', '#2a2a3a', '#2a2a3a', '#ffffff', '#ffffff'];

interface Stuck { x: number; y: number; pts: number; rot: number }

export const arqueria: GameDef = {
  id: 'arqueria',
  name: 'Arquería',
  scene: 'Bosque de Robin',
  type: 'Habilidad',
  icon: '🎯',
  color: '#ff4d6d',
  seconds: 40,
  howTo: 'Mantené el dedo para apuntar (la mira va un poco arriba de tu dedo) y soltá para tirar. ¡Mirá el viento!',
  run(env) {
    const R = rng(env.seed);
    const fx = new FX();
    const st = makeStage(env.canvas);
    const winds = Array.from({ length: ARROWS }, () => Math.round((R() * 2 - 1) * 5));
    const sway = Array.from({ length: ARROWS }, () => R() * 6);
    const scatter = Array.from({ length: ARROWS }, () => R() * 2 - 1);
    let shot = 0;
    let score = 0;
    let aiming = false;
    let ax = 0, ay = 0; // dedo
    let flying: { t: number; x: number; y: number; fx: number; fy: number } | null = null;
    const stuck: Stuck[] = [];
    let time = 0;
    let done = false;

    const geo = () => {
      const { w, h } = st;
      const r = Math.min(w * 0.33, h * 0.22);
      return { cx: w / 2, cy: h * 0.4, r };
    };
    const aimPoint = () => {
      const s = sway[shot] ?? 0;
      const k = 13 + Math.min(1, time / 25) * 7;
      return { x: ax + Math.sin(time * 1.9 + s) * k + Math.sin(time * 4.3 + s * 2) * k * 0.35, y: ay - 70 + Math.cos(time * 2.5 + s) * k };
    };

    const offPtr = pointer(env.canvas, {
      down: (x, y) => {
        if (done || flying || shot >= ARROWS) return;
        aiming = true;
        ax = x;
        ay = y;
      },
      move: (x, y) => {
        if (aiming) {
          ax = x;
          ay = y;
        }
      },
      up: () => {
        if (!aiming || flying) return;
        aiming = false;
        const p = aimPoint();
        const { r } = geo();
        const drift = (winds[shot] ?? 0) * r * 0.09;
        const jitter = (scatter[shot] ?? 0) * r * 0.06;
        flying = { t: 0, x: st.w / 2, y: st.h + 40, fx: p.x + drift + jitter, fy: p.y + r * 0.05 - jitter * 0.5 };
        sfx.whoosh();
      }
    });

    const stop = loop((dt) => {
      const { ctx, w, h } = st;
      time += dt;
      const { cx, cy, r } = geo();
      if (flying) {
        flying.t += dt / 0.45;
        if (flying.t >= 1) {
          const d = Math.hypot(flying.fx - cx, flying.fy - cy) / r;
          const pts = d >= 1 ? 0 : 10 - Math.floor(d * 10);
          score += pts;
          stuck.push({ x: (flying.fx - cx) / r, y: (flying.fy - cy) / r, pts, rot: (R() - 0.5) * 0.5 });
          if (pts >= 9) {
            sfx.coin();
            fx.burst(flying.fx, flying.fy, ['#ffd23f', '#fff', '#ff9f43'], 26, 280);
            vibrate(30);
          } else if (pts > 0) {
            sfx.good();
            fx.burst(flying.fx, flying.fy, ['#fff', '#c8a27a'], 10, 160);
            vibrate(15);
          } else sfx.bad();
          fx.text(flying.fx, flying.fy - 40, pts >= 10 ? '¡CENTRO! 10' : pts ? `+${pts}` : '¡Afuera!', pts >= 9 ? '#ffd23f' : '#fff', pts >= 10 ? 40 : 32);
          flying = null;
          shot++;
          if (shot >= ARROWS && !done) {
            done = true;
            setTimeout(() => env.end(score), 1400);
          }
        }
      }
      fx.update(dt);

      // ---------- Dibujo ----------
      const sky = ctx.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, '#7fd3ff');
      sky.addColorStop(0.55, '#c9f0ff');
      sky.addColorStop(0.56, '#79d17f');
      sky.addColorStop(1, '#2f9e5e');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, h);
      // nubes
      ctx.fillStyle = 'rgba(255,255,255,.85)';
      for (let i = 0; i < 4; i++) {
        const x = ((i * 0.31 + time * 0.01 * (1 + i * 0.3)) % 1.3) * w - 0.15 * w;
        const y = h * (0.08 + i * 0.05);
        ctx.beginPath();
        ctx.arc(x, y, 22, 0, Math.PI * 2);
        ctx.arc(x + 24, y - 8, 26, 0, Math.PI * 2);
        ctx.arc(x + 50, y, 20, 0, Math.PI * 2);
        ctx.fill();
      }
      // árboles
      for (let i = 0; i < 9; i++) {
        const x = (i / 8) * w;
        const th = h * (0.1 + ((i * 37) % 7) / 60);
        ctx.fillStyle = i % 2 ? '#1e8c5a' : '#23a869';
        ctx.beginPath();
        ctx.moveTo(x - 30, h * 0.56);
        ctx.lineTo(x, h * 0.56 - th);
        ctx.lineTo(x + 30, h * 0.56);
        ctx.fill();
      }
      // soporte
      ctx.fillStyle = '#8b5a2b';
      ctx.save();
      ctx.translate(cx, cy);
      ctx.fillRect(-r * 0.75, r * 0.6, r * 0.12, r * 1.2);
      ctx.fillRect(r * 0.63, r * 0.6, r * 0.12, r * 1.2);
      ctx.restore();
      // blanco
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,.35)';
      ctx.shadowBlur = 20;
      ctx.shadowOffsetY = 8;
      ctx.fillStyle = '#e8d3a8';
      ctx.beginPath();
      ctx.arc(cx, cy, r * 1.06, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      for (let i = 9; i >= 0; i--) {
        ctx.fillStyle = RINGS[i];
        ctx.beginPath();
        ctx.arc(cx, cy, (r * (i + 1)) / 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,.18)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(0,0,0,.4)';
      ctx.beginPath();
      ctx.moveTo(cx - 5, cy);
      ctx.lineTo(cx + 5, cy);
      ctx.moveTo(cx, cy - 5);
      ctx.lineTo(cx, cy + 5);
      ctx.stroke();
      // flechas clavadas
      for (const a of stuck) {
        const x = cx + a.x * r, y = cy + a.y * r;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(a.rot);
        ctx.fillStyle = 'rgba(0,0,0,.35)';
        ctx.beginPath();
        ctx.arc(0, 0, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#6b3e1f';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(10, 26);
        ctx.stroke();
        ctx.fillStyle = env.color;
        ctx.beginPath();
        ctx.moveTo(8, 20);
        ctx.lineTo(18, 30);
        ctx.lineTo(10, 34);
        ctx.lineTo(4, 26);
        ctx.fill();
        ctx.restore();
      }
      // flecha volando
      if (flying) {
        const k = flying.t;
        const x = flying.x + (flying.fx - flying.x) * k;
        const y = flying.y + (flying.fy - flying.y) * k - Math.sin(k * Math.PI) * 60;
        const sc = 1.8 - k * 1.2;
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(sc, sc);
        ctx.strokeStyle = '#6b3e1f';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, 40);
        ctx.stroke();
        ctx.fillStyle = '#c0c6d0';
        ctx.beginPath();
        ctx.moveTo(0, -8);
        ctx.lineTo(-5, 2);
        ctx.lineTo(5, 2);
        ctx.fill();
        ctx.fillStyle = env.color;
        ctx.fillRect(-6, 32, 12, 10);
        ctx.restore();
      }
      // viento
      const wv = winds[Math.min(shot, ARROWS - 1)];
      ctx.fillStyle = 'rgba(20,10,45,.55)';
      roundRect(ctx, w / 2 - 80, h * 0.62, 160, 40, 20);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = font(18);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(wv === 0 ? '🍃 Sin viento' : `🍃 Viento ${wv > 0 ? '→' : '←'} ${Math.abs(wv)}`, w / 2, h * 0.62 + 21);
      // arco y carcaj
      ctx.fillStyle = 'rgba(20,10,45,.35)';
      for (let i = 0; i < ARROWS; i++) {
        ctx.fillStyle = i < shot ? 'rgba(255,255,255,.25)' : env.color;
        roundRect(ctx, w / 2 - (ARROWS * 22) / 2 + i * 22, h - 52, 14, 34, 7);
        ctx.fill();
      }
      // mira
      if (aiming) {
        const p = aimPoint();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 16, 0, Math.PI * 2);
        ctx.moveTo(p.x - 26, p.y);
        ctx.lineTo(p.x - 8, p.y);
        ctx.moveTo(p.x + 8, p.y);
        ctx.lineTo(p.x + 26, p.y);
        ctx.moveTo(p.x, p.y - 26);
        ctx.lineTo(p.x, p.y - 8);
        ctx.moveTo(p.x, p.y + 8);
        ctx.lineTo(p.x, p.y + 26);
        ctx.stroke();
        ctx.fillStyle = '#ff4d6d';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fill();
      } else if (!flying && shot < ARROWS) {
        ctx.font = font(22);
        ctx.fillStyle = '#fff';
        ctx.fillText('Mantené el dedo para apuntar', w / 2, h * 0.75);
      }
      fx.draw(ctx);
      hud(ctx, w, score, 1 - shot / ARROWS, `Flecha ${Math.min(shot + 1, ARROWS)}/${ARROWS}`);
    });
    return () => {
      stop();
      offPtr();
      st.dispose();
    };
  }
};
