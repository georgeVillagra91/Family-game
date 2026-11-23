// Piezas visuales compartidas por los juegos versus.
import type { ComponentChildren } from 'preact';
import { Avatar } from './avatar';
import type { VCtx } from './versus';

export const isMine = (me: number[] | 'all', seat: number) => me === 'all' || me.includes(seat);

export function SeatBar({ ctx, turn, scores, label, rotateTop }: { ctx: VCtx; turn?: number; scores?: (number | string)[]; label?: (i: number) => ComponentChildren; rotateTop?: boolean }) {
  return (
    <div class={`seatbar ${rotateTop ? 'rot' : ''}`}>
      {ctx.seats.map((s, i) => (
        <div class={`seat ${turn === i ? 'turn' : ''}`} style={{ '--c': s.color } as any}>
          <Avatar spec={s.avatar} size={40} ring={s.color} />
          <div class="seatinfo">
            <b>{s.name}</b>
            {label ? <span>{label(i)}</span> : null}
          </div>
          {scores && <div class="seatscore">{scores[i]}</div>}
        </div>
      ))}
    </div>
  );
}

export function Banner({ children, color }: { children: ComponentChildren; color?: string }) {
  return (
    <div class="vsbanner" style={color ? { background: color } : {}}>
      {children}
    </div>
  );
}

/** Pantalla que tapa el juego para pasar el celu sin espiar (batalla naval, tutti frutti). */
export function Cover({ ctx, seat, text, onReveal }: { ctx: VCtx; seat: number; text: string; onReveal: () => void }) {
  const s = ctx.seats[seat];
  return (
    <div class="cover" style={{ '--c': s.color } as any}>
      <div class="muted" style={{ fontSize: '20px', fontWeight: 700 }}>
        Pasale el celu a…
      </div>
      <Avatar spec={s.avatar} size={150} ring={s.color} />
      <h3>{s.name}</h3>
      <p class="muted" style={{ margin: 0, fontSize: '18px' }}>
        {text}
      </p>
      <button class="btn" style={{ maxWidth: '320px' }} onClick={onReveal}>
        Soy {s.name.split(' y ')[0]}, mostrar
      </button>
    </div>
  );
}

export function Winner({ ctx, winners, children }: { ctx: VCtx; winners: number[]; children?: ComponentChildren }) {
  return (
    <div class="vswin">
      <div class="crown">👑</div>
      <div class="row" style={{ justifyContent: 'center', gap: '0' }}>
        {winners.map((w) => (
          <Avatar spec={ctx.seats[w].avatar} size={96} ring={ctx.seats[w].color} />
        ))}
      </div>
      <h3>{winners.length > 1 ? '¡Empate!' : `¡Gana ${ctx.seats[winners[0]].name}!`}</h3>
      {children}
    </div>
  );
}
