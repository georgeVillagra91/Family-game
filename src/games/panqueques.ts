// Panqueques Voladores: dar vuelta el panqueque justo cuando está dorado.
import { FX, GameDef, font, hud, loop, makeStage, pointer, rng, roundRect } from '../engine';
import { sfx, vibrate } from '../audio';

const DURATION = 45;

function mix(a: number[], b: number[], t: number) {
  return `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(',')})`;
}
const RAW = [250, 236, 200], GOLDEN = [236, 168, 62], BROWN = [140, 74, 24], BURNT = [40, 24, 16];
function cookColor(p: number) {
  if (p < 0.65) return mix(RAW, GOLDEN, p / 0.65);
  if (p < 0.9) return mix(GOLDEN, BROWN, (p - 0.65) / 0.25);
  return mix(BROWN, BURNT, Math.min(1, (p - 0.9) / 0.15));
}

interface Flying { t: number; good: number; color: string }

export const panqueques: GameDef = {
  id: 'panqueques',
  name: 'Panqueques Voladores',
  scene: 'Cocina de la abuela',
  type: 'Reflejos',
  icon: '🥞',
  color: '#ff9f43',
  seconds: DURATION,
  howTo: 'Tocá para dar vuelta el panqueque justo cuando está DORADO. Si se quema, resta.',
  run(env) {
    const R = rng(env.seed);
    const fx = new FX();
    const st = makeStage(env.canvas);
    const assist = env.assist;
    const win = 0.07 + assist * 0.045; // media ventana dorada
    let p = 0; // cocción 0..1.05
    let speed = 0.45;
    let time = 0, score = 0, done = false;
    let stack = 0;
    let flying: Flying | null = null;
    let smoke = 0;
    let wait = 0.6;
    const newPancake = () => {
      p = 0;
      speed = (0.32 + R() * 0.32) * (1 + Math.min(1, time / DURATION) * 0.5);
      wait = 0.35;
    };
    newPancake();

    const flip = () => {
      if (done || flying || wait > 0) return;
      const d = Math.abs(p - 0.65);
      let pts = 0, msg = '', col = '#fff';
      if (d <= win) { pts = 3; msg = '¡Dorado! +3'; col = '#ffd23f'; sfx.coin(); vibrate(20); }
      else if (d <= win + 0.09) { pts = 1; msg = 'Casi +1'; sfx.good(); }
      else if (p < 0.65) { pts = 0; msg = 'Crudo…'; col = '#ffe9c4'; sfx.click(); }
      else { pts = -1; msg = 'Quemado -1'; col = '#ff8a8a'; sfx.bad(); }
      score = Math.max(0, score + pts);
      flying = { t: 0, good: pts, color: cookColor(p) };
      fx.text(st.w / 2, st.h * 0.36, msg, col, 36);
      sfx.whoosh();
    };

    const offPtr = pointer(env.canvas, { down: flip });

    const stop = loop((dt) => {
      const { ctx, w, h } = st;
      if (!done) time += dt;
      const s = Math.min(w, h * 0.62) / 400;
      const panX = w / 2, panY = h * 0.6;
      if (wait > 0) wait -= dt;
      else if (!flying && !done) {
        p += speed * dt;
        if (p > 1.05) {
          // se quemó solo
          score = Math.max(0, score - 1);
          sfx.bad();
          fx.shake = 10;
          smoke = 1;
          fx.text(w / 2, h * 0.36, '¡Se quemó! -1', '#ff8a8a', 36);
          fx.burst(panX, panY, ['#333', '#555', '#222'], 16, 180, 10);
          newPancake();
        }
      }
      if (flying) {
        flying.t += dt * 1.6;
        if (flying.t >= 1) {
          if (flying.good > 0) {
            stack = Math.min(stack + 1, 14);
            fx.burst(w * 0.8, h * 0.78 - stack * 7 * s, ['#ffd23f', '#fff'], 10, 140);
          }
          flying = null;
          newPancake();
        }
      }
      smoke = Math.max(0, smoke - dt);
      fx.update(dt);
      if (!done && time >= DURATION) {
        done = true;
        setTimeout(() => env.end(score), 700);
      }

      // ---------- Dibujo ----------
      ctx.save();
      fx.applyShake(ctx);
      // pared de azulejos
      ctx.fillStyle = '#fff3e3';
      ctx.fillRect(-20, -20, w + 40, h + 40);
      const tile = 46 * s;
      for (let y = 0; y < h * 0.7; y += tile)
        for (let x = 0; x < w; x += tile) {
          ctx.fillStyle = ((x / tile + y / tile) | 0) % 2 ? '#ffe2c6' : '#ffd1a6';
          ctx.fillRect(x + 1, y + 1, tile - 2, tile - 2);
        }
      // ventana
      ctx.fillStyle = '#9be7ff';
      roundRect(ctx, w * 0.08, h * 0.1, w * 0.3, h * 0.17, 12);
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 6;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(w * 0.23, h * 0.1);
      ctx.lineTo(w * 0.23, h * 0.27);
      ctx.stroke();
      // mesada
      const counterY = h * 0.7;
      ctx.fillStyle = '#b5651d';
      ctx.fillRect(0, counterY, w, h - counterY);
      ctx.fillStyle = '#d98a3a';
      ctx.fillRect(0, counterY, w, 16 * s);
      // hornalla
      ctx.fillStyle = '#3a3a52';
      ctx.beginPath();
      ctx.ellipse(panX, counterY + 6, 120 * s, 22 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI;
        ctx.fillStyle = `rgba(80,160,255,${0.6 + Math.sin(time * 20 + i) * 0.3})`;
        ctx.beginPath();
        ctx.ellipse(panX + Math.cos(a) * 80 * s, counterY - 2 + Math.sin(time * 30 + i) * 2, 7 * s, 12 * s, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      // plato con pila
      const plX = w * 0.8, plY = h * 0.78;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.ellipse(plX, plY + 10 * s, 60 * s, 14 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      for (let i = 0; i < stack; i++) {
        ctx.fillStyle = i % 2 ? '#e9a43c' : '#f0b356';
        ctx.beginPath();
        ctx.ellipse(plX, plY - i * 7 * s, 44 * s, 10 * s, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      if (stack > 0) {
        ctx.fillStyle = '#ffe680';
        roundRect(ctx, plX - 10 * s, plY - stack * 7 * s - 10 * s, 20 * s, 10 * s, 3 * s);
        ctx.fill();
      }
      // sartén
      ctx.fillStyle = '#2b2b3d';
      roundRect(ctx, panX + 100 * s, panY - 8 * s, 120 * s, 16 * s, 8 * s);
      ctx.fill();
      ctx.fillStyle = '#ff5d73';
      roundRect(ctx, panX + 160 * s, panY - 9 * s, 60 * s, 18 * s, 9 * s);
      ctx.fill();
      ctx.fillStyle = '#2b2b3d';
      ctx.beginPath();
      ctx.ellipse(panX, panY, 110 * s, 40 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#44445e';
      ctx.beginPath();
      ctx.ellipse(panX, panY - 4 * s, 96 * s, 32 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      // panqueque
      if (!flying && wait <= 0.3) {
        ctx.fillStyle = cookColor(p);
        ctx.beginPath();
        ctx.ellipse(panX, panY - 6 * s, 78 * s, 25 * s, 0, 0, Math.PI * 2);
        ctx.fill();
        // burbujitas que avisan
        if (p > 0.35) {
          ctx.fillStyle = 'rgba(255,255,255,.45)';
          const n = Math.floor((p - 0.35) * 14);
          for (let i = 0; i < n; i++) {
            ctx.beginPath();
            ctx.arc(panX + Math.cos(i * 2.3) * 50 * s, panY - 6 * s + Math.sin(i * 1.7) * 14 * s, (2 + (i % 3)) * s, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        // vapor / humo
        const sm = p > 0.9 ? 1 : p > 0.5 ? 0.4 : 0;
        if (sm) {
          ctx.fillStyle = p > 0.9 ? 'rgba(60,60,60,.35)' : 'rgba(255,255,255,.5)';
          for (let i = 0; i < 4; i++) {
            const yy = ((time * 60 + i * 30) % 120) * s;
            ctx.beginPath();
            ctx.arc(panX - 30 * s + i * 20 * s + Math.sin(time * 3 + i) * 8, panY - 30 * s - yy, (10 + yy / 10) * s * sm, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
      if (flying) {
        const k = flying.t;
        const good = flying.good > 0;
        const tx = good ? plX : panX;
        const ty = good ? plY - stack * 7 * s - 10 * s : panY - 6 * s;
        const x = panX + (tx - panX) * k;
        const y = panY - 6 * s + (ty - panY) * k - Math.sin(k * Math.PI) * h * 0.35;
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(1, Math.cos(k * Math.PI * 2));
        ctx.fillStyle = flying.color;
        ctx.beginPath();
        ctx.ellipse(0, 0, 78 * s * (good ? 1 - k * 0.4 : 1), 25 * s + 30 * s * Math.sin(k * Math.PI), 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      // termómetro de cocción (guía visual)
      const gx = w * 0.1, gy = h * 0.36, gh = h * 0.28;
      ctx.fillStyle = 'rgba(0,0,0,.15)';
      roundRect(ctx, gx - 10, gy, 20, gh, 10);
      ctx.fill();
      const grad = ctx.createLinearGradient(0, gy + gh, 0, gy);
      grad.addColorStop(0, cookColor(0));
      grad.addColorStop(0.62, cookColor(0.65));
      grad.addColorStop(1, cookColor(1.05));
      ctx.fillStyle = grad;
      roundRect(ctx, gx - 7, gy + 3, 14, gh - 6, 7);
      ctx.fill();
      const zoneY = gy + gh - (0.65 / 1.05) * gh;
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 3;
      ctx.strokeRect(gx - 12, zoneY - (win / 1.05) * gh, 24, ((win * 2) / 1.05) * gh);
      if (!flying) {
        const my = gy + gh - Math.min(1, p / 1.05) * gh;
        ctx.fillStyle = '#2a1a3a';
        ctx.beginPath();
        ctx.moveTo(gx + 14, my);
        ctx.lineTo(gx + 26, my - 7);
        ctx.lineTo(gx + 26, my + 7);
        ctx.fill();
      }
      fx.draw(ctx);
      ctx.restore();
      ctx.font = font(22);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fff';
      ctx.fillText('¡Tocá cuando esté dorado!', w / 2, h - 28);
      hud(ctx, w, score, 1 - time / DURATION, `${Math.max(0, Math.ceil(DURATION - time))} s`);
    });
    return () => {
      stop();
      offPtr();
      st.dispose();
    };
  }
};
