// Componentes compartidos de la interfaz.
import { useEffect, useRef, useState } from 'preact/hooks';
import type { ComponentChildren } from 'preact';
import { Avatar } from './avatar';
import type { GameDef } from './engine';
import type { VersusDef } from './versus';
import { FX, loop } from './engine';
import { sfx } from './audio';
import type { Profile, RoundRecord } from './store';
import { finalWinners, gameById, isVersus, roundPoints, sideColor, sideLabel, sideTotals } from './match';

const AUTOTEST = new URLSearchParams(location.search).has('autotest');

export function TopBar({ title, onBack, right }: { title: string; onBack?: () => void; right?: ComponentChildren }) {
  return (
    <div class="topbar">
      {onBack && (
        <button class="iconbtn" aria-label="Volver" onClick={() => (sfx.click(), onBack())}>
          ←
        </button>
      )}
      <h2>{title}</h2>
      {right}
    </div>
  );
}

/** Botón de salir que pide confirmación con un segundo toque (sin diálogos del navegador). */
export function QuitButton({ onQuit, class: cls = 'iconbtn' }: { onQuit: () => void; class?: string }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 2500);
    return () => clearTimeout(t);
  }, [armed]);
  return (
    <button class={cls} style={armed ? { width: 'auto', padding: '0 14px', fontSize: '16px', fontWeight: 800, background: '#ff4d6d' } : {}} onClick={() => (armed ? onQuit() : setArmed(true))} aria-label="Salir">
      {armed ? '¿Salir? Tocá otra vez' : '✕'}
    </button>
  );
}

export function GameHero({ game, extra }: { game: GameDef | VersusDef; extra?: ComponentChildren }) {
  return (
    <div class="hero" style={{ background: `linear-gradient(160deg, ${game.color} 0%, ${game.color}99 45%, rgba(255,255,255,.06) 100%)` }}>
      <div class="ic">{game.icon}</div>
      <h3>{game.name}</h3>
      <div class="scene">
        {game.scene} · <span class="pill">{game.type}</span>
      </div>
      <p>{game.howTo}</p>
      {extra}
    </div>
  );
}

/** Lienzo de juego a pantalla completa con cuenta regresiva 3-2-1. */
export function PlayCanvas({ game, seed, assist, color, onEnd, onQuit }: { game: GameDef; seed: number; assist: number; color: string; onEnd: (score: number) => void; onQuit?: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [count, setCount] = useState(3);
  const ended = useRef(false);
  useEffect(() => {
    sfx.beep();
    const id = setInterval(() => {
      setCount((c) => {
        const n = c - 1;
        if (n > 0) sfx.beep();
        else if (n === 0) sfx.go();
        if (n <= 0) clearInterval(id);
        return n;
      });
    }, 800);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    if (count > 0 || !ref.current) return;
    if (AUTOTEST) {
      // Modo de prueba automática: termina enseguida con un puntaje al azar.
      const t = setTimeout(() => onEnd(Math.floor(Math.random() * 30)), 300);
      return () => clearTimeout(t);
    }
    const cleanup = game.run({
      canvas: ref.current,
      seed,
      assist,
      color,
      end: (s) => {
        if (ended.current) return;
        ended.current = true;
        onEnd(Math.round(s));
      }
    });
    return cleanup;
  }, [count <= 0]);
  return (
    <div class="playwrap">
      <canvas ref={ref} />
      {onQuit && <QuitButton class="iconbtn quit" onQuit={onQuit} />}
      {count > 0 && (
        <div class="countdown">
          <span key={count}>{count}</span>
        </div>
      )}
    </div>
  );
}

/** Lluvia de papelitos para festejar. */
export function Confetti() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current!;
    const ctx = c.getContext('2d')!;
    const fx = new FX();
    const fit = () => {
      c.width = innerWidth;
      c.height = innerHeight;
    };
    fit();
    fx.confetti(innerWidth, 140);
    let t = 0;
    const stop = loop((dt) => {
      t += dt;
      fx.update(dt);
      for (const p of fx.ps) p.vy = Math.min(p.vy, 160);
      ctx.clearRect(0, 0, c.width, c.height);
      fx.draw(ctx);
      if (t > 6) stop();
    });
    return stop;
  }, []);
  return <canvas ref={ref} class="confetti" />;
}

export function ScoreRow({ p, score, best }: { p: Profile; score: number | undefined; best?: boolean }) {
  return (
    <div class="scorerow">
      <Avatar spec={p.avatar} size={44} />
      <span>{p.name}</span>
      {best && <span title="Récord personal">🏅</span>}
      <span class="n">{score === undefined ? <span class="muted dots">jugando</span> : score}</span>
    </div>
  );
}

export function RoundResult({ sides, players, record, roundIdx, totalRounds }: { sides: string[][]; players: Profile[]; record: RoundRecord; roundIdx: number; totalRounds: number }) {
  const totals = sideTotals(sides, record.scores);
  const pts = roundPoints(sides, record.scores, roundIdx, totalRounds);
  const solo = sides.every((s) => s.length === 1);
  return (
    <div class="stack">
      {sides.map((s, i) => (
        <div class={`sidebox ${record.winnerSides.includes(i) ? 'win' : ''}`} style={{ borderColor: sideColor(i), background: `${sideColor(i)}22` }}>
          <div class="sidehead">
            <span>
              {record.winnerSides.includes(i) ? '🏆 ' : ''}
              {solo ? players.find((p) => p.id === s[0])?.name : sideLabel(sides, i, players)}
            </span>
            <span>
              {totals[i]} <span class="pill">+{pts[i]} pts</span>
            </span>
          </div>
          {!solo &&
            s.map((pid) => {
              const p = players.find((x) => x.id === pid)!;
              return <ScoreRow p={p} score={record.scores[pid]} />;
            })}
        </div>
      ))}
    </div>
  );
}

export function Standings({ sides, players, points }: { sides: string[][]; players: Profile[]; points: number[] }) {
  const order = sides.map((_, i) => i).sort((a, b) => points[b] - points[a]);
  return (
    <div class="stack">
      {order.map((i) => (
        <div class="scorerow" style={{ background: `${sideColor(i)}33` }}>
          <div class="row" style={{ gap: '0' }}>
            {sides[i].map((pid) => {
              const p = players.find((x) => x.id === pid);
              return p ? <Avatar spec={p.avatar} size={40} /> : null;
            })}
          </div>
          <span>{sideLabel(sides, i, players)}</span>
          <span class="n">{points[i]}</span>
        </div>
      ))}
    </div>
  );
}

export function Podium({ sides, players, points }: { sides: string[][]; players: Profile[]; points: number[] }) {
  const winners = finalWinners(points);
  const order = sides.map((_, i) => i).sort((a, b) => points[b] - points[a]);
  const top = order.slice(0, 3);
  const arrange = top.length === 3 ? [top[1], top[0], top[2]] : top.length === 2 ? [top[1], top[0]] : top;
  const heights = (i: number) => (winners.includes(i) ? 130 : order.indexOf(i) === 1 ? 92 : 64);
  return (
    <div class="podium">
      {arrange.map((i) => (
        <div class="step">
          {winners.includes(i) && <div class="crown">👑</div>}
          <div class="row" style={{ gap: 0, justifyContent: 'center' }}>
            {sides[i].map((pid) => {
              const p = players.find((x) => x.id === pid);
              return p ? <Avatar spec={p.avatar} size={sides[i].length > 1 ? 58 : 76} ring="#fff" /> : null;
            })}
          </div>
          <b style={{ textAlign: 'center', lineHeight: 1.05 }}>{sideLabel(sides, i, players)}</b>
          <div class="block" style={{ height: `${heights(i)}px`, background: winners.includes(i) ? 'linear-gradient(#fff6c2,#ffd23f)' : order.indexOf(i) === 1 ? 'linear-gradient(#ffffff,#c9d3e6)' : 'linear-gradient(#ffd2a8,#e0985a)' }}>
            {points[i]}
          </div>
        </div>
      ))}
    </div>
  );
}

export function GameChip({ id, on, off, onClick, sub }: { id: string; on?: boolean; off?: boolean; onClick?: () => void; sub?: string }) {
  const g = gameById(id);
  const v = isVersus(g);
  return (
    <button class={`game ${on ? 'on' : ''} ${off ? 'off' : ''}`} style={{ background: `linear-gradient(160deg, ${g.color}, ${g.color}66)` }} onClick={onClick}>
      <span class="ic">{g.icon}</span>
      <b>{g.name}</b>
      <span>{sub ?? (off && v ? `Para ${g.min === g.max ? g.min : `${g.min} a ${g.max}`} ${g.seatsBy === 'side' ? 'lados' : 'jugadores'}` : `${g.type} · ${v ? 'todos juntos' : `${g.seconds} s`}`)}</span>
    </button>
  );
}

export function Toast({ text }: { text: string }) {
  return <div class="toast">{text}</div>;
}
