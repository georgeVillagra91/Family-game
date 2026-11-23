// Explota tu Color: tocar solo los globos de tu color (y los dorados).
import { FX, GameDef, font, hud, loop, makeStage, pointer, rng } from '../engine';
import { sfx, vibrate } from '../audio';

export const BALLOON_COLORS = [
  { name: 'ROJO', c: '#ff4d6d', d: '#c9184a' },
  { name: 'AZUL', c: '#4d8bff', d: '#2546c9' },
  { name: 'VERDE', c: '#3ddc84', d: '#14a35a' },
  { name: 'VIOLETA', c: '#a66bff', d: '#6b2fd6' }
];
const GOLD = { name: 'DORADO', c: '#ffd23f', d: '#e09b00' };
const DURATION = 30;

interface Balloon { x: number; y: number; vy: number; col: number; r: number; phase: number; alive: boolean }

function drawBalloon(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, c: { c: string; d: string }, t: number, gold: boolean) {
  // hilo
  ctx.strokeStyle = 'rgba(255,255,255,.55)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x, y + r * 1.15);
  for (let i = 1; i <= 6; i++) ctx.lineTo(x + Math.sin(t * 3 + i) * 4, y + r * 1.15 + i * r * 0.22);
  ctx.stroke();
  // nudo
  ctx.fillStyle = c.d;
  ctx.beginPath();
  ctx.moveTo(x, y + r * 1.08);
  ctx.lineTo(x - r * 0.14, y + r * 1.25);
  ctx.lineTo(x + r * 0.14, y + r * 1.25);
  ctx.fill();
  // cuerpo
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.45, r * 0.1, x, y, r * 1.2);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.18, c.c);
  g.addColorStop(1, c.d);
  if (gold) {
    ctx.shadowColor = '#ffe27a';
    ctx.shadowBlur = r * 0.8;
  }
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(x, y, r * 0.9, r * 1.1, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(255,255,255,.5)';
  ctx.beginPath();
  ctx.ellipse(x - r * 0.38, y - r * 0.45, r * 0.16, r * 0.3, -0.5, 0, Math.PI * 2);
  ctx.fill();
}

export const globos: GameDef = {
  id: 'globos',
  name: 'Explota tu Color',
  scene: 'Feria de globos',
  type: 'Reflejos',
  icon: '🎈',
  color: '#ff4d6d',
  seconds: DURATION,
  howTo: 'Explotá solo los globos de TU color. Los dorados valen 3. ¡Los de otro color restan!',
  run(env) {
    const R = rng(env.seed);
    const fx = new FX();
    const st = makeStage(env.canvas);
    // El color propio sale del color del jugador (índice 0..3)
    const mine = Math.max(0, BALLOON_COLORS.findIndex((b) => b.c === env.color));
    const balloons: Balloon[] = [];
    let score = 0, time = -1.6, next = 0, done = false, combo = 0;
    const assist = env.assist;

    const offPtr = pointer(env.canvas, {
      down: (x, y) => {
        if (done || time < 0) return;
        const { w, h } = st;
        const unit = Math.min(w, h * 0.7) / 400;
        for (let i = balloons.length - 1; i >= 0; i--) {
          const b = balloons[i];
          const bx = b.x * w + Math.sin(time * 1.6 + b.phase) * 14 * unit, by = b.y * h;
          const rr = b.r * unit * (b.col === mine ? 1.25 + assist * 0.2 : 1.1);
          if ((x - bx) ** 2 / (rr * 0.95) ** 2 + (y - by) ** 2 / (rr * 1.2) ** 2 < 1) {
            balloons.splice(i, 1);
            const col = b.col === -1 ? GOLD : BALLOON_COLORS[b.col];
            fx.burst(bx, by, [col.c, col.d, '#fff'], 16, 260, 7);
            if (b.col === -1) {
              score += 3; combo++;
              sfx.coin();
              fx.text(bx, by, '+3', '#ffd23f', 40);
              vibrate(20);
            } else if (b.col === mine) {
              score += 1; combo++;
              sfx.pop();
              fx.text(bx, by, combo >= 5 && combo % 5 === 0 ? '¡Racha!' : '+1', '#fff', combo % 5 === 0 ? 34 : 28);
              vibrate(10);
            } else {
              score = Math.max(0, score - 1); combo = 0;
              sfx.bad();
              fx.shake = 10;
              fx.text(bx, by, '-1', '#ff8a8a', 34);
            }
            return;
          }
        }
      }
    });

    const stop = loop((dt) => {
      const { ctx, w, h } = st;
      if (!done) time += dt;
      const k = Math.max(0, Math.min(1, time / DURATION));
      const unit = Math.min(w, h * 0.7) / 400;
      while (!done && time >= next && time >= 0) {
        const roll = R();
        const col = roll < 0.06 ? -1 : roll < 0.46 ? mine : [0, 1, 2, 3].filter((c) => c !== mine)[Math.floor(R() * 3)];
        let vy = 0.16 + 0.16 * k + R() * 0.06;
        if (col === mine) vy *= 1 - assist * 0.25;
        if (col === -1) vy *= 1.5;
        balloons.push({ x: 0.1 + R() * 0.8, y: 1.12, vy, col, r: col === -1 ? 24 : 30 + R() * 6, phase: R() * 6, alive: true });
        next += Math.max(0.22, 0.55 - 0.3 * k) + R() * 0.12;
      }
      for (const b of balloons) b.y -= b.vy * dt;
      for (let i = balloons.length - 1; i >= 0; i--) if (balloons[i].y < -0.15) balloons.splice(i, 1);
      fx.update(dt);
      if (!done && time >= DURATION) {
        done = true;
        sfx.whoosh();
        setTimeout(() => env.end(score), 700);
      }

      ctx.save();
      fx.applyShake(ctx);
      const sky = ctx.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, '#ffb26b');
      sky.addColorStop(0.5, '#ff7eb3');
      sky.addColorStop(1, '#7a5cff');
      ctx.fillStyle = sky;
      ctx.fillRect(-20, -20, w + 40, h + 40);
      // carpa de feria
      ctx.save();
      ctx.globalAlpha = 0.25;
      for (let i = 0; i < 12; i++) {
        ctx.fillStyle = i % 2 ? '#fff' : '#ffd23f';
        ctx.beginPath();
        ctx.moveTo(w / 2, -h * 0.2);
        ctx.lineTo((i / 12) * w * 1.6 - w * 0.3, h * 1.1);
        ctx.lineTo(((i + 1) / 12) * w * 1.6 - w * 0.3, h * 1.1);
        ctx.fill();
      }
      ctx.restore();
      // banderines
      for (let i = 0; i < 14; i++) {
        const x = (i / 13) * w;
        const y = 92 + Math.sin(i / 13 * Math.PI) * 18;
        ctx.fillStyle = BALLOON_COLORS[i % 4].c;
        ctx.beginPath();
        ctx.moveTo(x - 12, y);
        ctx.lineTo(x + 12, y);
        ctx.lineTo(x, y + 22);
        ctx.fill();
      }
      for (const b of balloons) {
        const col = b.col === -1 ? GOLD : BALLOON_COLORS[b.col];
        drawBalloon(ctx, b.x * w + Math.sin(time * 1.6 + b.phase) * 14 * unit, b.y * h, b.r * unit, col, time + b.phase, b.col === -1);
      }
      fx.draw(ctx);
      ctx.restore();
      // indicador de color propio
      const mc = BALLOON_COLORS[mine];
      ctx.fillStyle = 'rgba(20,10,45,.55)';
      ctx.beginPath();
      ctx.roundRect?.(w / 2 - 92, h - 62, 184, 46, 23);
      ctx.fill();
      drawBalloon(ctx, w / 2 - 62, h - 42, 12, mc, time, false);
      ctx.font = font(22);
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(`Tu color: ${mc.name}`, w / 2 - 42, h - 38);
      if (time < 0) {
        ctx.fillStyle = 'rgba(20,10,45,.6)';
        ctx.fillRect(0, 0, w, h);
        drawBalloon(ctx, w / 2, h / 2 - 50, 60, mc, time, false);
        ctx.font = font(40);
        ctx.textAlign = 'center';
        ctx.fillStyle = '#fff';
        ctx.fillText(`¡Tu color es ${mc.name}!`, w / 2, h / 2 + 70);
      }
      hud(ctx, w, score, 1 - Math.max(0, time) / DURATION, `${Math.max(0, Math.ceil(DURATION - Math.max(0, time)))} s`);
    });
    return () => {
      stop();
      offPtr();
      st.dispose();
    };
  }
};
