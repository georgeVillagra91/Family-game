import { useState } from 'preact/hooks';
import { Avatar } from '../avatar';
import { sfx } from '../audio';
import { clearHistory, computeRecords, computeStats, getHistory } from '../store';
import type { Nav } from '../app';
import { GAMES, gameById, sideLabel } from '../match';
import { TopBar, medal, places } from '../ui';

const fmt = (d: number) => new Date(d).toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export function History({ nav }: { nav: Nav }) {
  const [tab, setTab] = useState<'rank' | 'rec' | 'list'>('rank');
  const [confirm, setConfirm] = useState(false);
  const stats = computeStats();
  const recs = computeRecords();
  const hist = getHistory();
  // Puesto compartido cuando empatan en victorias y en juegos ganados.
  const keys = stats.map((s) => s.wins * 100000 + s.roundsWon);
  const pl = places(keys);
  return (
    <div class="screen">
      <TopBar title="Ranking e historial" onBack={() => nav({ name: 'home' })} />
      <div class="tabs">
        {(
          [
            ['rank', 'Ranking'],
            ['rec', 'Récords'],
            ['list', 'Partidas']
          ] as const
        ).map(([k, l]) => (
          <button class={tab === k ? 'on' : ''} onClick={() => (sfx.click(), setTab(k))}>
            {l}
          </button>
        ))}
      </div>

      {tab === 'rank' && (
        <div class="stack">
          {stats.length === 0 && <p class="muted center">Todavía no hay partidas. ¡Jueguen la primera!</p>}
          {stats.map((s, i) => (
            <div class={`rank ${pl[i] === 1 ? 'top' : ''}`}>
              <span class="pos">{medal(pl[i])}</span>
              <Avatar spec={s.avatar} size={52} />
              <div class="info">
                <b>{s.name}</b>
                <br />
                <span>
                  {s.played} {s.played === 1 ? 'partida' : 'partidas'} · {s.roundsWon} {s.roundsWon === 1 ? 'juego ganado' : 'juegos ganados'} · {s.played ? Math.round((s.wins / s.played) * 100) : 0}% de victorias
                </span>
              </div>
              <div class="big">
                {s.wins}
                <small>victorias</small>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'rec' && (
        <div class="stack">
          {GAMES.map((g) => {
            const r = recs[g.id];
            return (
              <div class="rank" style={{ background: `linear-gradient(90deg, ${g.color}55, rgba(255,255,255,.06))` }}>
                <span style={{ fontSize: '34px' }}>{g.icon}</span>
                <div class="info">
                  <b>{g.name}</b>
                  <br />
                  <span>{r ? `${r.name} · ${fmt(r.date)}` : 'Sin récord todavía'}</span>
                </div>
                {r && <Avatar spec={r.avatar} size={40} />}
                <div class="big">{r ? r.score : '–'}</div>
              </div>
            );
          })}
        </div>
      )}

      {tab === 'list' && (
        <div class="stack">
          {hist.length === 0 && <p class="muted center">Acá van a aparecer todas las partidas.</p>}
          {hist.map((m) => (
            <div class="match">
              <div class="when">
                {fmt(m.date)} · {m.mode === '1v1' ? '1 vs 1' : m.mode === '2v2' ? '2 vs 2' : 'Todos'} {m.online ? '· 🌎 online' : ''}
              </div>
              <div class="row" style={{ fontWeight: 800, fontSize: '18px' }}>
                <span>🏆</span>
                <span class="grow">{m.winnerSides.map((i) => sideLabel(m.sides, i, m.players)).join(' y ')}</span>
                <span class="muted">{m.sides.map((_, i) => m.stars[i]).join(' a ')}</span>
              </div>
              <div class="row wrap" style={{ gap: '6px' }}>
                {m.rounds.map((r) => {
                  const g = gameById(r.game);
                  return g ? <span class="pill">{g.icon} {sideLabel(m.sides, r.winnerSides[0], m.players)}{r.winnerSides.length > 1 ? ' (empate)' : ''}</span> : null;
                })}
              </div>
            </div>
          ))}
          {hist.length > 0 && (
            <button class="btn ghost danger" onClick={() => (confirm ? (clearHistory(), setConfirm(false)) : setConfirm(true))}>
              {confirm ? '¿Seguro? Tocá otra vez para borrar todo' : 'Borrar historial'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
