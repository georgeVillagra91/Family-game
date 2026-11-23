// Pares Gemelos: dos libros mágicos con dibujos; uno solo se repite. ¡Encontralo!
import { FX, GameDef, hud, loop, makeStage, pointer, rng } from '../engine';
import { sfx, vibrate } from '../audio';

const DURATION = 45;
const SYMBOLS = ['🐶', '🐱', '🦊', '🐸', '🐵', '🦁', '🐷', '🐮', '🐔', '🐧', '🐢', '🐙', '🦋', '🐝', '🍎', '🍌', '🍉', '🍓', '🍕', '🍩', '🌈', '⭐', '🌙', '☀️', '⚽', '🎈', '🚀', '🎸', '🎁', '🧁', '🍦', '🌵', '🦄', '🐳', '🍄', '🔑'];

interface Sym { s: string; x: number; y: number; size: number; rot: number }
interface Card { syms: Sym[] }

export const pares: GameDef = {
  id: 'pares',
  name: 'Pares Gemelos',
  scene: 'Biblioteca mágica',
  type: 'Atención',
  icon: '📚',
  color: '#8c5bff',
  seconds: DURATION,
  howTo: 'Hay un solo dibujo que está en los dos libros. ¡Tocalo lo más rápido que puedas!',
  run(env) {
    const R = rng(env.seed);
    const fx = new FX();
    const st = makeStage(env.canvas);
    let score = 0, time = 0, freeze = 0, done = false, anim = 0;
    let cards: [Card, Card];
    let shared = '';
    let count = 0;

    const layout = (n: number): { x: number; y: number }[] => {
      const pts = [{ x: 0, y: 0 }];
      for (let i = 0; i < n - 1; i++) {
        const a = (i / (n - 1)) * Math.PI * 2 + R() * 0.3;
        pts.push({ x: Math.cos(a) * 0.62, y: Math.sin(a) * 0.62 });
      }
      return pts;
    };
    const deal = () => {
      // las primeras cartas con ayuda traen 6 dibujos en vez de 8
      const n = env.assist > 0.5 && count < 6 ? 6 : env.assist > 0.2 && count < 3 ? 6 : 8;
      const pool = [...SYMBOLS];
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(R() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
      shared = pool[0];
      const a = [shared, ...pool.slice(1, n)];
      const b = [shared, ...pool.slice(n, n * 2 - 1)];
      const mk = (list: string[]): Card => {
        const sh = [...list];
        for (let i = sh.length - 1; i > 0; i--) {
          const j = Math.floor(R() * (i + 1));
          [sh[i], sh[j]] = [sh[j], sh[i]];
        }
        const pos = layout(list.length);
        return { syms: sh.map((s, i) => ({ s, x: pos[i].x, y: pos[i].y, size: 0.3 + R() * 0.14, rot: (R() - 0.5) * 1.6 })) };
      };
      cards = [mk(a), mk(b)];
      anim = 1;
      count++;
    };
    deal();

    const geom = () => {
      const { w, h } = st;
      const r = Math.min(w * 0.44, (h - 150) * 0.24);
      return { r, c: [{ x: w / 2, y: 100 + r + 10 }, { x: w / 2, y: h - r - 30 }] };
    };

    const offPtr = pointer(env.canvas, {
      down: (x, y) => {
        if (done || freeze > 0) return;
        const { r, c } = geom();
        for (let ci = 0; ci < 2; ci++) {
          for (const s of cards[ci].syms) {
            const sx = c[ci].x + s.x * r, sy = c[ci].y + s.y * r;
            if ((x - sx) ** 2 + (y - sy) ** 2 < (s.size * r * 0.62) ** 2) {
              if (s.s === shared) {
                score++;
                sfx.coin();
                vibrate(20);
                fx.burst(sx, sy, ['#ffd23f', '#fff', '#8c5bff'], 22);
                fx.text(sx, sy - 30, '+1', '#ffd23f', 40);
                deal();
              } else {
                freeze = 1;
                sfx.bad();
                fx.shake = 10;
                fx.text(sx, sy - 30, '¡Ups!', '#ff8a8a', 32);
              }
              return;
            }
          }
        }
      }
    });

    const stop = loop((dt) => {
      const { ctx, w, h } = st;
      if (!done) time += dt;
      freeze = Math.max(0, freeze - dt);
      anim = Math.max(0, anim - dt * 4);
      fx.update(dt);
      if (!done && time >= DURATION) {
        done = true;
        setTimeout(() => env.end(score), 700);
      }
      ctx.save();
      fx.applyShake(ctx);
      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, '#3b1f6e');
      bg.addColorStop(1, '#1d1140');
      ctx.fillStyle = bg;
      ctx.fillRect(-20, -20, w + 40, h + 40);
      // estantes con libros
      for (let row = 0; row < 6; row++) {
        const y = row * (h / 6) + 40;
        ctx.fillStyle = 'rgba(0,0,0,.25)';
        ctx.fillRect(0, y + 44, w, 6);
        for (let i = 0; i < 14; i++) {
          ctx.fillStyle = ['#ff5d73', '#ffd23f', '#3ddc84', '#4d8bff', '#ff9f43', '#a66bff'][(i + row * 3) % 6];
          ctx.globalAlpha = 0.18;
          ctx.fillRect(i * (w / 14) + 2, y + 44 - (30 + ((i * 7 + row * 5) % 14)), w / 14 - 5, 30 + ((i * 7 + row * 5) % 14));
        }
        ctx.globalAlpha = 1;
      }
      // brillitos mágicos
      for (let i = 0; i < 20; i++) {
        ctx.fillStyle = `rgba(255,230,150,${0.3 + 0.3 * Math.sin(time * 2 + i)})`;
        ctx.beginPath();
        ctx.arc(((i * 97) % w), ((i * 151 + time * 12) % h), 2, 0, Math.PI * 2);
        ctx.fill();
      }
      const { r, c } = geom();
      for (let ci = 0; ci < 2; ci++) {
        const sc = 1 - anim * 0.15;
        ctx.save();
        ctx.translate(c[ci].x, c[ci].y);
        ctx.scale(sc, sc);
        ctx.shadowColor = 'rgba(0,0,0,.35)';
        ctx.shadowBlur = 20;
        ctx.shadowOffsetY = 6;
        ctx.fillStyle = '#fffaf0';
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowColor = 'transparent';
        ctx.lineWidth = 8;
        ctx.strokeStyle = ci === 0 ? '#ffd23f' : '#1fc8db';
        ctx.stroke();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        for (const s of cards[ci].syms) {
          ctx.save();
          ctx.translate(s.x * r, s.y * r);
          ctx.rotate(s.rot);
          ctx.font = `${Math.round(s.size * r)}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
          ctx.fillText(s.s, 0, 2);
          ctx.restore();
        }
        if (freeze > 0) {
          ctx.fillStyle = `rgba(120,200,255,${0.45 * freeze})`;
          ctx.beginPath();
          ctx.arc(0, 0, r, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
      fx.draw(ctx);
      ctx.restore();
      hud(ctx, w, score, 1 - time / DURATION, `${Math.max(0, Math.ceil(DURATION - time))} s`);
    });
    return () => {
      stop();
      offPtr();
      st.dispose();
    };
  }
};
