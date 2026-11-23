// Juegos "versus": varios jugadores en la misma partida al mismo tiempo o por turnos.
// En un celu, todos comparten la pantalla (cada uno en su esquina o por turnos).
// Online, el anfitrión guarda el estado, aplica las jugadas de todos y lo reparte.
import type { ComponentType } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import type { AvatarSpec } from './avatar';
import type { Room } from './net';
import { QuitButton } from './ui';

export interface Seat {
  pids: string[];
  name: string;
  color: string;
  avatar: AvatarSpec;
}

export interface VCtx {
  seats: Seat[];
  seed: number;
  /** true cuando todos comparten el mismo dispositivo */
  local: boolean;
}

export interface ViewProps<S, A> {
  s: S;
  ctx: VCtx;
  /** Asientos que maneja este dispositivo ("all" en modo un celu). */
  me: number[] | 'all';
  act: (seat: number, a: A) => void;
}

export interface VersusDef<S = any, A = any> {
  kind: 'versus';
  id: string;
  name: string;
  scene: string;
  type: string;
  icon: string;
  color: string;
  seconds: number;
  howTo: string;
  /** "side": un asiento por equipo (ta-te-ti). "player": uno por jugador (bingo). */
  seatsBy: 'side' | 'player';
  min: number;
  max: number;
  init(ctx: VCtx): S;
  act(s: S, seat: number, a: A, ctx: VCtx): S;
  /** Se llama ~30 veces por segundo en quien guarda el estado. Devuelve el mismo objeto si no cambió nada. */
  tick?(s: S, dt: number, ctx: VCtx): S;
  /** Puntaje por asiento cuando terminó; null mientras sigue. */
  done(s: S): number[] | null;
  View: ComponentType<ViewProps<S, A>>;
}

export { isMine } from './vsui';

/** Partida versus en un solo dispositivo. */
export function VersusLocal({ def, ctx, onDone, onQuit }: { def: VersusDef; ctx: VCtx; onDone: (scores: number[]) => void; onQuit: () => void }) {
  const sRef = useRef<any>(null);
  if (!sRef.current) sRef.current = def.init(ctx);
  const [, force] = useState(0);
  const finished = useRef(false);
  const check = () => {
    const r = def.done(sRef.current);
    if (r && !finished.current) {
      finished.current = true;
      setTimeout(() => onDone(r), 1800);
    }
  };
  useEffect(() => {
    let last = performance.now();
    let id = 0;
    const step = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (def.tick) {
        const n = def.tick(sRef.current, dt, ctx);
        if (n !== sRef.current) {
          sRef.current = n;
          force((x) => x + 1);
          check();
        }
      }
      id = requestAnimationFrame(step);
    };
    id = requestAnimationFrame(step);
    return () => cancelAnimationFrame(id);
  }, []);
  const act = (seat: number, a: any) => {
    if (finished.current) return;
    const n = def.act(sRef.current, seat, a, ctx);
    if (n !== sRef.current) {
      sRef.current = n;
      force((x) => x + 1);
      check();
    }
  };
  const V = def.View;
  return (
    <div class="vswrap">
      <V s={sRef.current} ctx={ctx} me="all" act={act} />
      <QuitButton class="iconbtn quit" onQuit={onQuit} />
    </div>
  );
}

/** Partida versus online. El anfitrión corre el juego; los demás envían jugadas y reciben el estado. */
export function VersusOnline({ def, ctx, room, me, round, onDone, onQuit }: { def: VersusDef; ctx: VCtx; room: Room; me: number[]; round: number; onDone: (scores: number[]) => void; onQuit: () => void }) {
  const isHost = room.isHost;
  const sRef = useRef<any>(isHost ? def.init(ctx) : null);
  const [, force] = useState(0);
  const finished = useRef(false);
  const dirty = useRef(true);

  useEffect(() => {
    if (isHost) {
      const off = room.on((m) => {
        if (m.t === 'vsready') dirty.current = true;
        if (m.t === 'act' && m.round === round && !finished.current) {
          const n = def.act(sRef.current, m.seat, m.a, ctx);
          if (n !== sRef.current) {
            sRef.current = n;
            dirty.current = true;
            force((x) => x + 1);
          }
        }
      });
      let last = performance.now();
      let lastSend = 0;
      const iv = setInterval(() => {
        const now = performance.now();
        const dt = Math.min(0.1, (now - last) / 1000);
        last = now;
        if (def.tick && !finished.current) {
          const n = def.tick(sRef.current, dt, ctx);
          if (n !== sRef.current) {
            sRef.current = n;
            dirty.current = true;
            force((x) => x + 1);
          }
        }
        if ((dirty.current && now - lastSend > 45) || now - lastSend > 1500) {
          dirty.current = false;
          lastSend = now;
          room.broadcast({ t: 'vs', round, s: sRef.current });
          const r = def.done(sRef.current);
          if (r && !finished.current) {
            finished.current = true;
            setTimeout(() => onDone(r), 1800);
          }
        }
      }, 33);
      return () => {
        off();
        clearInterval(iv);
      };
    } else {
      const off = room.on((m) => {
        if (m.t === 'vs' && m.round === round) {
          sRef.current = m.s;
          force((x) => x + 1);
        }
      });
      room.send({ t: 'vsready', round });
      return () => {
        off();
      };
    }
  }, []);

  const act = (seat: number, a: any) => {
    if (!me.includes(seat)) return;
    if (isHost) {
      if (finished.current) return;
      const n = def.act(sRef.current, seat, a, ctx);
      if (n !== sRef.current) {
        sRef.current = n;
        dirty.current = true;
        force((x) => x + 1);
      }
    } else room.send({ t: 'act', round, seat, a });
  };
  const V = def.View;
  return (
    <div class="vswrap">
      {sRef.current ? <V s={sRef.current} ctx={ctx} me={me} act={act} /> : <div class="center" style={{ paddingTop: '40vh' }}><div class="spinner" /></div>}
      <QuitButton class="iconbtn quit" onQuit={onQuit} />
    </div>
  );
}
