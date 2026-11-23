// Memoria de Monos: repetir la secuencia de tambores, que crece de a uno.
import { FX, GameDef, font, hud, loop, makeStage, pointer, rng } from '../engine';
import { sfx, vibrate } from '../audio';

const DRUMS = [
  { c: '#ff5d73', d: '#b3203a' },
  { c: '#1ed760', d: '#0e9c43' },
  { c: '#a259ff', d: '#6420d0' },
  { c: '#ff6a00', d: '#c24400' }
];
const MAX_TIME = 90;

function drawMonkey(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, mood: number, armL: number, armR: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  // brazos
  ctx.strokeStyle = '#7a4a26';
  ctx.lineWidth = 12;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-34, 30);
  ctx.lineTo(-70, 40 + armL * 40);
  ctx.moveTo(34, 30);
  ctx.lineTo(70, 40 + armR * 40);
  ctx.stroke();
  // palillos
  ctx.strokeStyle = '#f2d06b';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(-70, 40 + armL * 40);
  ctx.lineTo(-92, 20 + armL * 70);
  ctx.moveTo(70, 40 + armR * 40);
  ctx.lineTo(92, 20 + armR * 70);
  ctx.stroke();
  // cuerpo
  ctx.fillStyle = '#8b5a2b';
  ctx.beginPath();
  ctx.ellipse(0, 46, 36, 30, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#e8c08f';
  ctx.beginPath();
  ctx.ellipse(0, 52, 22, 18, 0, 0, Math.PI * 2);
  ctx.fill();
  // orejas
  ctx.fillStyle = '#8b5a2b';
  for (const sx of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(sx * 40, -8, 15, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#e8a87c';
  for (const sx of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(sx * 40, -8, 8, 0, Math.PI * 2);
    ctx.fill();
  }
  // cabeza
  ctx.fillStyle = '#8b5a2b';
  ctx.beginPath();
  ctx.arc(0, -10, 36, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#e8c08f';
  ctx.beginPath();
  ctx.ellipse(-12, -14, 14, 16, 0, 0, Math.PI * 2);
  ctx.ellipse(12, -14, 14, 16, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(0, 6, 24, 16, 0, 0, Math.PI * 2);
  ctx.fill();
  // ojos
  ctx.fillStyle = '#2a1a3a';
  ctx.beginPath();
  ctx.arc(-11, -15, 4.5, 0, Math.PI * 2);
  ctx.arc(11, -15, 4.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(-9.5, -16.5, 1.6, 0, Math.PI * 2);
  ctx.arc(12.5, -16.5, 1.6, 0, Math.PI * 2);
  ctx.fill();
  // boca
  ctx.strokeStyle = '#2a1a3a';
  ctx.lineWidth = 3;
  ctx.beginPath();
  if (mood < 0) ctx.arc(0, 14, 7, Math.PI * 1.15, Math.PI * 1.85);
  else ctx.arc(0, 4, 9, 0.2, Math.PI - 0.2);
  ctx.stroke();
  ctx.restore();
}

export const monos: GameDef = {
  id: 'monos',
  name: 'Memoria de Monos',
  scene: 'Templo en la selva',
  type: 'Atención',
  icon: '🐒',
  color: '#ff6a00',
  seconds: 60,
  howTo: 'Mirá qué tambores toca el mono y repetí la secuencia. ¡Cada vez es más larga!',
  run(env) {
    const R = rng(env.seed);
    const fx = new FX();
    const st = makeStage(env.canvas);
    const seq: number[] = [];
    for (let i = 0; i < 60; i++) seq.push(Math.floor(R() * 4));
    const assist = env.assist;
    const gap = 0.62 + assist * 0.22;
    let level = 1; // largo actual
    let best = 0;
    let phase: 'intro' | 'show' | 'input' | 'ok' | 'fail' | 'end' = 'intro';
    let pt = 0; // tiempo dentro de la fase
    let shownIdx = -1;
    let inputIdx = 0;
    let lit = -1, litT = 0;
    let lives = assist > 0.5 ? 2 : 1;
    let time = 0;
    let armL = 0, armR = 0;
    let mood = 0;
    let rects: { x: number; y: number; r: number }[] = [];

    const light = (i: number) => {
      lit = i;
      litT = 0.28;
      sfx.note(i);
      if (i % 2 === 0) armL = 1; else armR = 1;
    };

    const finish = () => {
      phase = 'end';
      setTimeout(() => env.end(best), 900);
    };

    const offPtr = pointer(env.canvas, {
      down: (x, y) => {
        if (phase !== 'input') return;
        const i = rects.findIndex((r) => (x - r.x) ** 2 + (y - r.y) ** 2 < (r.r * 1.1) ** 2);
        if (i < 0) return;
        light(i);
        vibrate(12);
        if (i === seq[inputIdx]) {
          inputIdx++;
          if (inputIdx >= level) {
            best = level;
            fx.burst(rects[i].x, rects[i].y, [DRUMS[i].c, '#fff', '#ffd23f'], 20);
            fx.text(st.w / 2, st.h * 0.3, `¡${level}!`, '#ffd23f', 46);
            sfx.good();
            mood = 1;
            phase = 'ok';
            pt = 0;
          }
        } else {
          sfx.bad();
          fx.shake = 12;
          mood = -1;
          lives--;
          if (lives > 0) {
            fx.text(st.w / 2, st.h * 0.3, '¡Otra vez!', '#fff', 40);
            phase = 'ok'; // vuelve a mostrar la misma secuencia
            level--; // se compensa al pasar por ok
            pt = 0;
          } else {
            fx.text(st.w / 2, st.h * 0.3, `¡Llegaste a ${best}!`, '#ffd23f', 40);
            phase = 'fail';
            pt = 0;
          }
        }
      }
    });

    const stop = loop((dt) => {
      const { ctx, w, h } = st;
      time += dt;
      pt += dt;
      litT -= dt;
      if (litT <= 0) lit = -1;
      armL = Math.max(0, armL - dt * 6);
      armR = Math.max(0, armR - dt * 6);
      if (phase === 'intro' && pt > 1.2) {
        phase = 'show';
        pt = 0;
        shownIdx = -1;
      } else if (phase === 'show') {
        const idx = Math.floor(pt / gap);
        if (idx !== shownIdx && idx < level) {
          shownIdx = idx;
          light(seq[idx]);
        }
        if (pt > level * gap + 0.2) {
          phase = 'input';
          inputIdx = 0;
          pt = 0;
        }
      } else if (phase === 'ok' && pt > 0.9) {
        level++;
        mood = 0;
        phase = 'show';
        pt = 0;
        shownIdx = -1;
      } else if (phase === 'fail' && pt > 0.6) finish();
      if (phase !== 'end' && phase !== 'fail' && time > MAX_TIME) finish();
      fx.update(dt);

      // ---------- Dibujo ----------
      ctx.save();
      fx.applyShake(ctx);
      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, '#0f5a4a');
      bg.addColorStop(1, '#073a33');
      ctx.fillStyle = bg;
      ctx.fillRect(-20, -20, w + 40, h + 40);
      // templo
      ctx.fillStyle = 'rgba(255,220,150,.08)';
      for (let i = 0; i < 5; i++) ctx.fillRect(w * 0.5 - (i + 1) * w * 0.09, h * 0.08 + i * 26, (i + 1) * w * 0.18, 26);
      ctx.fillStyle = 'rgba(0,0,0,.18)';
      for (let i = 0; i < 4; i++) ctx.fillRect(w * (0.08 + i * 0.26), h * 0.25, 18, h * 0.75);
      // lianas
      ctx.strokeStyle = '#1e8c5a';
      ctx.lineWidth = 5;
      for (let i = 0; i < 6; i++) {
        ctx.beginPath();
        const x0 = (i + 0.5) * (w / 6);
        ctx.moveTo(x0, 0);
        ctx.quadraticCurveTo(x0 + Math.sin(time + i) * 14, 60, x0, 110 + (i % 3) * 30);
        ctx.stroke();
      }
      const size = Math.min(w * 0.42, (h - 280) * 0.42, 190);
      const cx = w / 2, cy = h * 0.62;
      rects = [
        { x: cx - size * 0.56, y: cy - size * 0.5, r: size * 0.48 },
        { x: cx + size * 0.56, y: cy - size * 0.5, r: size * 0.48 },
        { x: cx - size * 0.56, y: cy + size * 0.62, r: size * 0.48 },
        { x: cx + size * 0.56, y: cy + size * 0.62, r: size * 0.48 }
      ];
      drawMonkey(ctx, cx, cy - size * 1.35, Math.min(1.1, size / 150), mood, armL, armR);
      rects.forEach((r, i) => {
        const on = lit === i;
        const d = DRUMS[i];
        const lift = on ? -6 : 0;
        // cuerpo del tambor
        ctx.fillStyle = d.d;
        ctx.beginPath();
        ctx.ellipse(r.x, r.y + r.r * 0.35, r.r, r.r * 0.42, 0, 0, Math.PI);
        ctx.lineTo(r.x - r.r, r.y + lift);
        ctx.fill();
        ctx.fillRect(r.x - r.r, r.y + lift, r.r * 2, r.r * 0.35 - lift);
        ctx.strokeStyle = 'rgba(255,255,255,.35)';
        ctx.lineWidth = 3;
        for (let k = -2; k <= 2; k++) {
          ctx.beginPath();
          ctx.moveTo(r.x + k * r.r * 0.4, r.y + lift + r.r * 0.05);
          ctx.lineTo(r.x + k * r.r * 0.4 + r.r * 0.18, r.y + r.r * 0.6);
          ctx.stroke();
        }
        // parche
        if (on) {
          ctx.shadowColor = d.c;
          ctx.shadowBlur = 40;
        }
        ctx.fillStyle = on ? '#fffbe8' : d.c;
        ctx.beginPath();
        ctx.ellipse(r.x, r.y + lift, r.r, r.r * 0.42, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = d.d;
        ctx.lineWidth = 6;
        ctx.stroke();
        ctx.fillStyle = on ? d.c : 'rgba(255,255,255,.25)';
        ctx.beginPath();
        ctx.ellipse(r.x, r.y + lift, r.r * 0.45, r.r * 0.18, 0, 0, Math.PI * 2);
        ctx.fill();
      });
      fx.draw(ctx);
      ctx.restore();
      // mensaje
      ctx.font = font(24);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#fff';
      const msg = phase === 'show' || phase === 'intro' ? 'Mirá y escuchá…' : phase === 'input' ? `¡Tu turno! ${inputIdx}/${level}` : '';
      if (msg) ctx.fillText(msg, w / 2, h - 30);
      hud(ctx, w, best, 1 - time / MAX_TIME, phase === 'input' || phase === 'show' ? `Largo ${level}` : '');
    });
    return () => {
      stop();
      offPtr();
      st.dispose();
    };
  }
};
