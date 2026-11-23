// Duelo al Mediodía: tocar apenas suena la campana. Cuidado con las señales falsas.
import { FX, GameDef, clamp, font, hud, loop, makeStage, pointer, rng, roundRect } from '../engine';
import { sfx, vibrate } from '../audio';

const ROUNDS = 5;

function drawBell(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, swing: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.sin(swing) * 0.35);
  ctx.scale(s, s);
  ctx.shadowColor = '#ffe27a';
  ctx.shadowBlur = 40;
  const g = ctx.createLinearGradient(-60, 0, 60, 0);
  g.addColorStop(0, '#e09b00');
  g.addColorStop(0.4, '#ffe680');
  g.addColorStop(1, '#c47f00');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-14, -70);
  ctx.quadraticCurveTo(-50, -60, -52, 0);
  ctx.quadraticCurveTo(-56, 30, -72, 44);
  ctx.lineTo(72, 44);
  ctx.quadraticCurveTo(56, 30, 52, 0);
  ctx.quadraticCurveTo(50, -60, 14, -70);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#a86a00';
  ctx.beginPath();
  ctx.arc(0, 56, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffe680';
  roundRect(ctx, -12, -86, 24, 20, 8);
  ctx.fill();
  ctx.restore();
}

function drawRooster(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.fillStyle = '#ff9f43';
  ctx.beginPath();
  ctx.moveTo(-50, 10);
  ctx.quadraticCurveTo(-90, -40, -60, -60);
  ctx.quadraticCurveTo(-50, -20, -30, -10);
  ctx.fill();
  ctx.fillStyle = '#fff4e0';
  ctx.beginPath();
  ctx.ellipse(0, 10, 50, 40, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(30, -36, 22, 26, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ff4d6d';
  ctx.beginPath();
  ctx.arc(24, -64, 8, 0, Math.PI * 2);
  ctx.arc(36, -66, 8, 0, Math.PI * 2);
  ctx.arc(46, -60, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(48, -22, 6, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffd23f';
  ctx.beginPath();
  ctx.moveTo(50, -40);
  ctx.lineTo(70, -34);
  ctx.lineTo(50, -28);
  ctx.fill();
  ctx.fillStyle = '#2a1a3a';
  ctx.beginPath();
  ctx.arc(36, -42, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ffb300';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(-10, 48);
  ctx.lineTo(-14, 76);
  ctx.moveTo(14, 48);
  ctx.lineTo(18, 76);
  ctx.stroke();
  ctx.restore();
}

function drawKettle(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, t: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.fillStyle = 'rgba(255,255,255,.7)';
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.arc(78 + Math.sin(t * 6 + i) * 6 + i * 6, -40 - i * 18, 8 + i * 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#1fc8db';
  ctx.beginPath();
  ctx.moveTo(40, -10);
  ctx.lineTo(80, -40);
  ctx.lineTo(84, -30);
  ctx.lineTo(50, 10);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(0, 10, 56, 46, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#17a2b2';
  ctx.fillRect(-56, 30, 112, 20);
  ctx.strokeStyle = '#2f2f45';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.arc(0, -30, 34, Math.PI * 1.1, Math.PI * 1.9);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.4)';
  ctx.beginPath();
  ctx.ellipse(-20, -6, 10, 18, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export const duelo: GameDef = {
  id: 'duelo',
  name: 'Duelo al Mediodía',
  scene: 'Pueblo del desierto',
  type: 'Reflejos',
  icon: '🔔',
  color: '#ff9f43',
  seconds: 40,
  howTo: 'Esperá la campana y tocá la pantalla lo más rápido posible. ¡El gallo y la tetera son trampas!',
  run(env) {
    const R = rng(env.seed);
    const fx = new FX();
    const st = makeStage(env.canvas);
    // Plan de rondas determinista
    const plan = Array.from({ length: ROUNDS }, () => ({
      wait: 1.6 + R() * 2.6,
      fake: R() < 0.55 ? (R() < 0.5 ? 'gallo' : 'tetera') : null,
      fakeAt: 0.6 + R() * 0.8
    }));
    let forgive = env.assist > 0.3 ? 1 : 0;
    let round = 0;
    let state: 'ready' | 'wait' | 'go' | 'res' | 'end' = 'ready';
    let t = 0, time = 0;
    let goAt = 0;
    let score = 0;
    let lastMsg = '', lastMs = 0, lastPts = 0;
    let flash = 0;

    const startRound = () => {
      state = 'wait';
      t = 0;
    };

    const offPtr = pointer(env.canvas, {
      down: () => {
        const p = plan[round];
        if (state === 'wait') {
          // falta: tocó antes de la campana
          sfx.bad();
          fx.shake = 14;
          if (forgive > 0) {
            forgive--;
            lastMsg = '¡Uy! Muy pronto. Te perdonamos una';
            lastPts = 0;
            state = 'res';
            t = 0;
            plan[round] = { ...p, wait: 1.6 + R() * 2.2 }; // repetimos la ronda
            round--;
          } else {
            lastMsg = p.fake && t > p.fakeAt ? '¡Era una trampa!' : '¡Muy pronto!';
            lastPts = 0;
            lastMs = 0;
            state = 'res';
            t = 0;
          }
        } else if (state === 'go') {
          const ms = Math.round((performance.now() - goAt));
          lastMs = ms;
          lastPts = clamp(Math.round(100 - (ms - 200) / 8), 5, 100);
          score += lastPts;
          lastMsg = ms < 300 ? '¡Rapidísimo!' : ms < 450 ? '¡Bien!' : '¡Ahí va!';
          sfx.good();
          vibrate(25);
          fx.burst(st.w / 2, st.h * 0.42, ['#ffd23f', '#fff', '#ff9f43'], 26, 320);
          fx.text(st.w / 2, st.h * 0.62, `+${lastPts}`, '#ffd23f', 44);
          state = 'res';
          t = 0;
        }
      }
    });

    const stop = loop((dt) => {
      const { ctx, w, h } = st;
      t += dt;
      time += dt;
      flash = Math.max(0, flash - dt * 3);
      const p = plan[Math.max(0, round)];
      if (state === 'ready' && t > 1.4) startRound();
      else if (state === 'wait') {
        if (p.fake && t >= p.fakeAt && t < p.fakeAt + dt) sfx.click();
        if (t >= p.wait) {
          state = 'go';
          goAt = performance.now();
          flash = 1;
          sfx.go();
        }
      } else if (state === 'go' && performance.now() - goAt > 1500) {
        lastMsg = '¡Te dormiste!';
        lastPts = 0;
        lastMs = 0;
        state = 'res';
        t = 0;
      } else if (state === 'res' && t > 1.5) {
        round++;
        if (round >= ROUNDS) {
          state = 'end';
          setTimeout(() => env.end(score), 400);
        } else startRound();
      }
      fx.update(dt);

      // ---------- Dibujo ----------
      ctx.save();
      fx.applyShake(ctx);
      const sky = ctx.createLinearGradient(0, 0, 0, h);
      const go = state === 'go';
      sky.addColorStop(0, go ? '#fff1a8' : '#ffb347');
      sky.addColorStop(0.6, go ? '#ffd23f' : '#ff7e5f');
      sky.addColorStop(1, '#d35400');
      ctx.fillStyle = sky;
      ctx.fillRect(-20, -20, w + 40, h + 40);
      // sol del mediodía
      ctx.fillStyle = 'rgba(255,255,220,.8)';
      ctx.beginPath();
      ctx.arc(w / 2, h * 0.16, 40, 0, Math.PI * 2);
      ctx.fill();
      // mesetas
      ctx.fillStyle = '#c0532c';
      ctx.beginPath();
      ctx.moveTo(0, h * 0.72);
      ctx.lineTo(w * 0.1, h * 0.6);
      ctx.lineTo(w * 0.3, h * 0.6);
      ctx.lineTo(w * 0.36, h * 0.72);
      ctx.lineTo(w * 0.62, h * 0.72);
      ctx.lineTo(w * 0.7, h * 0.56);
      ctx.lineTo(w * 0.92, h * 0.56);
      ctx.lineTo(w, h * 0.68);
      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.fill();
      ctx.fillStyle = '#e8a35b';
      ctx.fillRect(0, h * 0.78, w, h * 0.22);
      // cactus
      ctx.fillStyle = '#2f9e5e';
      for (const cx of [w * 0.12, w * 0.88]) {
        roundRect(ctx, cx - 10, h * 0.66, 20, h * 0.14, 10);
        ctx.fill();
        roundRect(ctx, cx - 28, h * 0.69, 12, 30, 6);
        ctx.fill();
        roundRect(ctx, cx + 16, h * 0.67, 12, 30, 6);
        ctx.fill();
      }
      const cy = h * 0.42;
      const s = Math.min(w, h) / 420;
      const fakeOn = state === 'wait' && p.fake && t >= p.fakeAt && t < p.fakeAt + 0.9;
      if ((state === 'ready' || state === 'wait') && !fakeOn) {
        ctx.font = `${Math.round(130 * s)}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🤠', w / 2, cy + Math.sin(time * 2) * 4);
      }
      if (state === 'go' || (state === 'res' && lastPts > 0)) drawBell(ctx, w / 2, cy, s * 1.2, time * 18);
      else if (state === 'wait' && p.fake && t >= p.fakeAt && t < p.fakeAt + 0.9) {
        if (p.fake === 'gallo') drawRooster(ctx, w / 2, cy, s * 1.3);
        else drawKettle(ctx, w / 2, cy, s * 1.3, time);
      }
      if (flash > 0) {
        ctx.fillStyle = `rgba(255,255,255,${flash * 0.6})`;
        ctx.fillRect(0, 0, w, h);
      }
      fx.draw(ctx);
      ctx.restore();
      // textos
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = font(go ? 72 : 32);
      ctx.lineWidth = 6;
      ctx.strokeStyle = 'rgba(60,20,10,.55)';
      ctx.fillStyle = '#fff';
      const big = state === 'ready' ? `Ronda ${round + 1} de ${ROUNDS}` : state === 'wait' ? 'Esperá la campana…' : state === 'go' ? '¡YA!' : state === 'res' ? lastMsg : '';
      const by = go ? h * 0.7 : h * 0.72;
      ctx.strokeText(big, w / 2, by);
      ctx.fillText(big, w / 2, by);
      if (state === 'res' && lastMs > 0) {
        ctx.font = font(26, 700);
        ctx.fillText(`${lastMs} milisegundos`, w / 2, h * 0.8);
      }
      // indicadores de ronda
      for (let i = 0; i < ROUNDS; i++) {
        ctx.fillStyle = i < round || (i === round && state === 'res') ? '#ffd23f' : 'rgba(255,255,255,.35)';
        ctx.beginPath();
        ctx.arc(w / 2 + (i - 2) * 26, h - 40, 8, 0, Math.PI * 2);
        ctx.fill();
      }
      hud(ctx, w, score, 1 - Math.min(round, ROUNDS) / ROUNDS);
    });
    return () => {
      stop();
      offPtr();
      st.dispose();
    };
  }
};
