// Lluvia de Frutas: mover la canasta, atrapar frutas, esquivar cocos.
import { FX, GameDef, clamp, hud, loop, makeStage, pointer, rng, roundRect, star } from '../engine';
import { sfx, vibrate } from '../audio';

type Kind = 'manzana' | 'naranja' | 'banana' | 'uvas' | 'rara' | 'coco';
interface Item { x: number; y: number; vy: number; kind: Kind; rot: number; vr: number; r: number }

const DURATION = 45;
const POINTS: Record<Kind, number> = { manzana: 1, naranja: 1, banana: 1, uvas: 1, rara: 5, coco: -2 };

export function drawFruit(ctx: CanvasRenderingContext2D, kind: Kind, x: number, y: number, r: number, rot = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  const shine = () => {
    ctx.fillStyle = 'rgba(255,255,255,.45)';
    ctx.beginPath();
    ctx.ellipse(-r * 0.35, -r * 0.35, r * 0.22, r * 0.14, -0.7, 0, Math.PI * 2);
    ctx.fill();
  };
  if (kind === 'manzana' || kind === 'naranja') {
    const g = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r);
    g.addColorStop(0, kind === 'manzana' ? '#ff7b7b' : '#ffc06b');
    g.addColorStop(1, kind === 'manzana' ? '#d61f3c' : '#f07d0c');
    ctx.fillStyle = g;
    ctx.beginPath();
    if (kind === 'manzana') {
      ctx.moveTo(0, -r * 0.7);
      ctx.bezierCurveTo(r * 0.9, -r * 1.2, r * 1.3, r * 0.4, 0, r);
      ctx.bezierCurveTo(-r * 1.3, r * 0.4, -r * 0.9, -r * 1.2, 0, -r * 0.7);
    } else ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    shine();
    ctx.strokeStyle = '#6b3e1f';
    ctx.lineWidth = r * 0.12;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.7);
    ctx.lineTo(r * 0.1, -r * 1.05);
    ctx.stroke();
    ctx.fillStyle = '#3ddc84';
    ctx.beginPath();
    ctx.ellipse(r * 0.38, -r * 0.98, r * 0.32, r * 0.15, -0.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === 'banana') {
    ctx.fillStyle = '#ffd23f';
    ctx.strokeStyle = '#c99a06';
    ctx.lineWidth = r * 0.1;
    ctx.beginPath();
    ctx.moveTo(-r, -r * 0.4);
    ctx.quadraticCurveTo(-r * 0.2, r * 1.2, r, -r * 0.5);
    ctx.quadraticCurveTo(-r * 0.1, r * 0.55, -r, -r * 0.4);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#6b3e1f';
    ctx.beginPath();
    ctx.arc(r, -r * 0.5, r * 0.1, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === 'uvas') {
    const pts = [[-0.45, -0.4], [0, -0.45], [0.45, -0.4], [-0.25, 0], [0.25, 0], [0, 0.42]];
    for (const [px, py] of pts) {
      const g = ctx.createRadialGradient(px * r - r * 0.1, py * r - r * 0.1, 1, px * r, py * r, r * 0.36);
      g.addColorStop(0, '#c99bff');
      g.addColorStop(1, '#6a2fd6');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(px * r, py * r, r * 0.34, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#3ddc84';
    ctx.beginPath();
    ctx.ellipse(r * 0.15, -r * 0.85, r * 0.3, r * 0.14, 0.4, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === 'rara') {
    // Carambola dorada: la fruta rara
    ctx.shadowColor = '#ffe27a';
    ctx.shadowBlur = r * 0.9;
    const g = ctx.createRadialGradient(0, 0, 1, 0, 0, r * 1.1);
    g.addColorStop(0, '#fff6c2');
    g.addColorStop(1, '#ffb300');
    ctx.fillStyle = g;
    star(ctx, 0, 0, r * 1.1, r * 0.55, 5);
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,255,255,.6)';
    star(ctx, -r * 0.15, -r * 0.2, r * 0.35, r * 0.15, 5);
  } else {
    const g = ctx.createRadialGradient(-r * 0.3, -r * 0.3, 1, 0, 0, r);
    g.addColorStop(0, '#a0703f');
    g.addColorStop(1, '#4a2b12');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(30,15,5,.5)';
    ctx.lineWidth = r * 0.07;
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.arc(0, 0, r * (0.4 + i * 0.09), i, i + 1.2);
      ctx.stroke();
    }
    ctx.fillStyle = '#2a1608';
    for (const [px, py] of [[-0.25, -0.15], [0.2, -0.2], [0, 0.18]]) {
      ctx.beginPath();
      ctx.arc(px * r, py * r, r * 0.12, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

export const frutas: GameDef = {
  id: 'frutas',
  name: 'Lluvia de Frutas',
  scene: 'Selva tropical',
  type: 'Habilidad',
  icon: '🍎',
  color: '#3ddc84',
  seconds: DURATION,
  howTo: 'Arrastrá el dedo para mover la canasta. Atrapá frutas y esquivá los cocos.',
  run(env) {
    const R = rng(env.seed);
    const fx = new FX();
    const st = makeStage(env.canvas);
    const items: Item[] = [];
    let score = 0;
    let time = 0;
    let nextSpawn = 0.6;
    let targetX = 0.5;
    let basketX = 0.5;
    let squash = 0;
    let done = false;
    const assist = env.assist;
    // Fondo pre-generado: hojas y lianas
    const leaves = Array.from({ length: 18 }, (_, i) => ({ x: (i * 0.137) % 1, y: ((i * 0.31) % 0.5) - 0.05, s: 40 + ((i * 17) % 50), a: i * 1.3, c: i % 3 }));

    const offPtr = pointer(env.canvas, {
      down: (x) => (targetX = x / st.w),
      move: (x, _y, _id) => (targetX = x / st.w)
    });

    const stop = loop((dt) => {
      const { ctx, w, h } = st;
      if (!done) time += dt;
      const k = Math.min(1, time / DURATION);
      const unit = Math.min(w, h * 0.65) / 400;
      const basketW = (110 + assist * 50) * unit;
      // Spawns deterministas (mismas frutas para todos)
      while (!done && time >= nextSpawn) {
        const roll = R();
        const cocoP = 0.16 + 0.12 * k;
        const kind: Kind = roll < cocoP ? 'coco' : roll < cocoP + 0.07 ? 'rara' : (['manzana', 'naranja', 'banana', 'uvas'] as Kind[])[Math.floor(R() * 4)];
        const speed = (0.32 + 0.38 * k + R() * 0.08) * (1 - assist * 0.18);
        items.push({ x: 0.08 + R() * 0.84, y: -0.06, vy: speed, kind, rot: R() * 6, vr: (R() - 0.5) * 3, r: kind === 'rara' ? 25 : 28 });
        nextSpawn += Math.max(0.32, 0.85 - 0.5 * k) + R() * 0.15;
      }
      basketX += (clamp(targetX, 0, 1) - basketX) * Math.min(1, dt * 18);
      const bx = basketX * w;
      const by = h - 70 * unit - 20;
      for (const it of items) {
        it.y += it.vy * dt;
        it.rot += it.vr * dt;
      }
      for (let i = items.length - 1; i >= 0; i--) {
        const it = items[i];
        const ix = it.x * w, iy = it.y * h;
        if (!done && iy > by - 18 * unit && iy < by + 24 * unit && Math.abs(ix - bx) < basketW / 2 + it.r * unit * 0.4) {
          const p = POINTS[it.kind];
          score = Math.max(0, score + p);
          items.splice(i, 1);
          squash = 1;
          if (p < 0) {
            sfx.bad();
            fx.shake = 14;
            fx.burst(ix, by, ['#6b3e1f', '#a0703f'], 12);
            fx.text(ix, by - 40, `${p}`, '#ff8a8a', 34);
          } else {
            if (it.kind === 'rara') sfx.coin(); else sfx.good();
            fx.burst(ix, by - 10, it.kind === 'rara' ? ['#ffd23f', '#fff6c2'] : ['#ff5d73', '#ffd23f', '#3ddc84'], it.kind === 'rara' ? 22 : 10);
            fx.text(ix, by - 40, `+${p}`, it.kind === 'rara' ? '#ffd23f' : '#fff', it.kind === 'rara' ? 40 : 30);
            vibrate(15);
          }
        } else if (iy > h + 40) items.splice(i, 1);
      }
      squash = Math.max(0, squash - dt * 5);
      fx.update(dt);
      if (!done && time >= DURATION) {
        done = true;
        sfx.whoosh();
        setTimeout(() => env.end(score), 700);
      }

      // ---------- Dibujo ----------
      ctx.save();
      fx.applyShake(ctx);
      const sky = ctx.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, '#2fb7a0');
      sky.addColorStop(0.55, '#8ee39b');
      sky.addColorStop(1, '#f6e58d');
      ctx.fillStyle = sky;
      ctx.fillRect(-20, -20, w + 40, h + 40);
      // sol
      ctx.fillStyle = 'rgba(255,240,170,.65)';
      ctx.beginPath();
      ctx.arc(w * 0.8, h * 0.18, 46 * unit, 0, Math.PI * 2);
      ctx.fill();
      // colinas
      ctx.fillStyle = '#4cc27a';
      ctx.beginPath();
      ctx.moveTo(0, h * 0.78);
      for (let x = 0; x <= w; x += 20) ctx.lineTo(x, h * 0.78 - Math.sin(x / 80) * 18 - 10);
      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.fill();
      ctx.fillStyle = '#2f9e5e';
      ctx.fillRect(0, h * 0.86, w, h * 0.14);
      // hojas colgantes
      for (const l of leaves) {
        ctx.save();
        ctx.translate(l.x * w, l.y * h);
        ctx.rotate(Math.sin(time * 0.8 + l.a) * 0.08 + l.a);
        ctx.fillStyle = ['#1e8c5a', '#23a869', '#167048'][l.c];
        ctx.beginPath();
        ctx.ellipse(0, 0, l.s * unit, l.s * 0.38 * unit, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      // frutas
      for (const it of items) drawFruit(ctx, it.kind, it.x * w, it.y * h, it.r * unit, it.rot);
      // canasta
      ctx.save();
      ctx.translate(bx, by);
      ctx.scale(1 + squash * 0.12, 1 - squash * 0.1);
      const bw = basketW, bh = 46 * unit;
      ctx.fillStyle = 'rgba(0,0,0,.18)';
      ctx.beginPath();
      ctx.ellipse(0, bh + 8 * unit, bw * 0.5, 8 * unit, 0, 0, Math.PI * 2);
      ctx.fill();
      const bg = ctx.createLinearGradient(0, 0, 0, bh);
      bg.addColorStop(0, '#d9893b');
      bg.addColorStop(1, '#9c5420');
      ctx.fillStyle = bg;
      ctx.beginPath();
      ctx.moveTo(-bw / 2, 0);
      ctx.lineTo(bw / 2, 0);
      ctx.lineTo(bw / 2 - 12 * unit, bh);
      ctx.lineTo(-bw / 2 + 12 * unit, bh);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(90,40,10,.45)';
      ctx.lineWidth = 3 * unit;
      for (let i = 1; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(-bw / 2 + 4 * i * unit, (bh / 3) * i);
        ctx.lineTo(bw / 2 - 4 * i * unit, (bh / 3) * i);
        ctx.stroke();
      }
      ctx.fillStyle = '#f0a85a';
      roundRect(ctx, -bw / 2 - 6 * unit, -8 * unit, bw + 12 * unit, 14 * unit, 7 * unit);
      ctx.fill();
      ctx.restore();
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
