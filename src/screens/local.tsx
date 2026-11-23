import { useMemo, useState } from 'preact/hooks';
import { Avatar } from '../avatar';
import { sfx } from '../audio';
import { Mode, Profile, RoundRecord, addMatch, getProfiles, newGuest, personalBest, uid, upsertProfile } from '../store';
import type { Nav } from '../app';
import { GAMES, MatchSetup, assistFor, finalWinners, gameById, newSeed, nightPoints, pickGames, roundWinners, sideColor, sideLabel, sideOf, suggestTeams, turnOrder } from '../match';
import { Confetti, GameChip, GameHero, PlayCanvas, Podium, QuitButton, RoundResult, Standings, TopBar } from '../ui';

const NEED: Record<Mode, [number, number]> = { '1v1': [2, 2], '2v2': [4, 4], todos: [2, 6] };

export function LocalSetup({ nav, preset }: { nav: Nav; preset?: MatchSetup }) {
  const [mode, setMode] = useState<Mode>(preset?.mode ?? '1v1');
  const [sel, setSel] = useState<string[]>(preset ? preset.sides.flat() : []);
  const [teams, setTeams] = useState<string[][] | null>(preset?.mode === '2v2' ? preset.sides : null);
  const [length, setLength] = useState<number>(preset ? (preset.games.length > 1 ? preset.games.length : 1) : 5);
  const [single, setSingle] = useState<string>(preset?.games.length === 1 ? preset.games[0] : GAMES[0].id);
  const [, force] = useState(0);
  const ps = getProfiles();
  const [min, max] = NEED[mode];

  const toggle = (id: string) => {
    sfx.tap();
    setTeams(null);
    if (sel.includes(id)) setSel(sel.filter((x) => x !== id));
    else if (sel.length < max) setSel([...sel, id]);
    else if (max === 2) setSel([sel[1], id]);
  };
  const chosen = sel.map((id) => ps.find((p) => p.id === id)!).filter(Boolean);
  const ready = chosen.length >= min && chosen.length <= max;
  const sides: string[][] | null = !ready ? null : mode === '2v2' ? teams ?? suggestTeams(chosen) : sel.map((id) => [id]);
  if (mode === '2v2' && ready && !teams && sides) setTimeout(() => setTeams(sides), 0);

  const swap = (pid: string) => {
    if (!teams) return;
    sfx.click();
    const a = teams[0].includes(pid) ? 0 : 1;
    const other = teams[1 - a][teams[a].indexOf(pid)];
    const t = teams.map((s) => s.map((x) => (x === pid ? other : x === other ? pid : x)));
    setTeams(t);
  };
  const reroll = () => {
    sfx.whoosh();
    setTeams(suggestTeams(chosen));
  };
  const kidsVsAdults = () => {
    sfx.whoosh();
    const sorted = [...chosen].sort((a, b) => a.level - b.level);
    setTeams([sorted.slice(0, 2).map((p) => p.id), sorted.slice(2).map((p) => p.id)]);
  };

  const start = () => {
    if (!sides) return;
    sfx.go();
    const games = length === 1 ? [single] : pickGames(length);
    nav({ name: 'localMatch', setup: { mode, sides, games } });
  };

  return (
    <div class="screen">
      <TopBar title="Jugar en este celu" onBack={() => nav({ name: 'home' })} />
      <div class="label">Formato</div>
      <div class="seg">
        {(['1v1', '2v2', 'todos'] as Mode[]).map((m) => (
          <button
            class={mode === m ? 'on' : ''}
            onClick={() => {
              sfx.click();
              setMode(m);
              setTeams(null);
              setSel(sel.slice(0, NEED[m][1]));
            }}
          >
            {m === '1v1' ? '1 vs 1' : m === '2v2' ? '2 vs 2' : 'Todos'}
            <small>{m === '1v1' ? 'duelo' : m === '2v2' ? 'por equipos' : '2 a 6'}</small>
          </button>
        ))}
      </div>
      <div class="label">
        ¿Quiénes juegan? ({chosen.length}/{max === min ? max : `${min}-${max}`})
      </div>
      <div class="players">
        {ps.map((p) => (
          <button class={`pl ${sel.includes(p.id) ? 'on' : ''}`} onClick={() => toggle(p.id)}>
            {sel.includes(p.id) && <span class="badge">{sel.indexOf(p.id) + 1}</span>}
            <Avatar spec={p.avatar} size={64} />
            {p.name}
          </button>
        ))}
        <button
          class="pl add"
          onClick={() => {
            const g = newGuest();
            upsertProfile(g);
            force((n) => n + 1);
            if (sel.length < max) setSel([...sel, g.id]);
          }}
        >
          <span style={{ fontSize: '30px' }}>🎟️</span>
          Invitado
        </button>
      </div>

      {mode === '2v2' && teams && (
        <>
          <div class="label">Equipos (tocá a alguien para cambiarlo de equipo)</div>
          <div class="teams">
            {teams.map((t, i) => (
              <div class="team" style={{ borderColor: sideColor(i), background: `${sideColor(i)}22` }}>
                <h4>Equipo {i === 0 ? 'Rojo' : 'Azul'}</h4>
                {t.map((pid) => {
                  const p = ps.find((x) => x.id === pid)!;
                  return (
                    <button class="member" onClick={() => swap(pid)}>
                      <Avatar spec={p.avatar} size={36} />
                      {p.name}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
          <div class="row">
            <button class="btn ghost" style={{ fontSize: '17px', minHeight: '48px' }} onClick={reroll}>
              🎲 Sortear
            </button>
            <button class="btn ghost" style={{ fontSize: '17px', minHeight: '48px' }} onClick={kidsVsAdults}>
              Grandes vs chicas
            </button>
          </div>
        </>
      )}

      <div class="label">¿Cuánto jugamos?</div>
      <div class="seg">
        {[1, 3, 5].map((n) => (
          <button class={length === n ? 'on' : ''} onClick={() => (sfx.click(), setLength(n))}>
            {n === 1 ? 'Un juego' : n === 3 ? 'Noche corta' : 'Noche de Juegos'}
            <small>{n === 1 ? 'elegís cuál' : `${n} juegos al azar`}</small>
          </button>
        ))}
      </div>
      {length === 1 && (
        <div class="games">
          {GAMES.map((g) => (
            <GameChip id={g.id} on={single === g.id} onClick={() => (sfx.click(), setSingle(g.id))} />
          ))}
        </div>
      )}
      <button class="btn" disabled={!ready} onClick={start} style={{ marginTop: '6px' }}>
        {ready ? '¡A jugar!' : `Elegí ${min === max ? min : `de ${min} a ${max}`} jugadores`}
      </button>
    </div>
  );
}

type Phase = { t: 'intro' } | { t: 'handoff'; i: number } | { t: 'play'; i: number } | { t: 'turn'; i: number; score: number } | { t: 'result' } | { t: 'final' };

export function LocalMatch({ nav, setup }: { nav: Nav; setup: MatchSetup }) {
  const players = useMemo(() => setup.sides.flat().map((id) => getProfiles().find((p) => p.id === id)!).filter(Boolean), [setup]);
  const order = useMemo(() => turnOrder(setup.sides), [setup]);
  const [round, setRound] = useState(0);
  const [rounds, setRounds] = useState<RoundRecord[]>([]);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [phase, setPhase] = useState<Phase>({ t: 'intro' });
  const [seeds] = useState(() => setup.games.map(() => order.map(() => newSeed())));
  const [matchId] = useState(uid);
  const game = gameById(setup.games[round]);
  const total = setup.games.length;
  const points = nightPoints(setup.sides, rounds, total);
  const pOf = (id: string) => players.find((p) => p.id === id)!;
  const quit = () => nav({ name: 'home' });
  const solo = setup.sides.every((s) => s.length === 1);

  if (phase.t === 'play') {
    const pid = order[phase.i];
    const p = pOf(pid);
    const si = sideOf(setup.sides, pid);
    return (
      <PlayCanvas
        key={`${round}-${phase.i}`}
        game={game}
        seed={seeds[round][phase.i]}
        assist={assistFor(p, si, points)}
        color={sideColor(solo ? si : si)}
        onQuit={quit}
        onEnd={(score) => {
          setScores((s) => ({ ...s, [pid]: score }));
          setPhase({ t: 'turn', i: phase.i, score });
        }}
      />
    );
  }

  const finishRound = () => {
    const rec: RoundRecord = { game: game.id, scores, winnerSides: roundWinners(setup.sides, scores) };
    const all = [...rounds, rec];
    setRounds(all);
    sfx.win();
    setPhase({ t: 'result' });
    if (round === total - 1) {
      const pts = nightPoints(setup.sides, all, total);
      addMatch({ id: matchId, date: Date.now(), online: false, mode: setup.mode, players, sides: setup.sides, rounds: all, stars: pts, winnerSides: finalWinners(pts) });
    }
  };

  return (
    <div class="screen">
      <div class="topbar">
        <h2>
          {total > 1 ? `Juego ${round + 1} de ${total}` : 'Partida'}
          {total >= 3 && round === total - 1 && phase.t !== 'final' ? ' · ¡vale doble!' : ''}
        </h2>
        <QuitButton onQuit={quit} />
      </div>

      {phase.t === 'intro' && (
        <>
          <GameHero game={game} />
          <div class="label">Orden de turnos</div>
          <div class="row wrap" style={{ justifyContent: 'center' }}>
            {order.map((pid, i) => (
              <div class="center" style={{ fontWeight: 800 }}>
                <Avatar spec={pOf(pid).avatar} size={56} ring={sideColor(sideOf(setup.sides, pid))} />
                {i + 1}. {pOf(pid).name}
              </div>
            ))}
          </div>
          {round > 0 && <Standings sides={setup.sides} players={players} points={points} />}
          <button class="btn" style={{ marginTop: 'auto' }} onClick={() => (sfx.tap(), setPhase({ t: 'handoff', i: 0 }))}>
            ¡Empezar!
          </button>
        </>
      )}

      {phase.t === 'handoff' && (
        <div class="handoff">
          <div class="muted" style={{ fontSize: '20px', fontWeight: 700 }}>
            Pasale el celu a…
          </div>
          <Avatar spec={pOf(order[phase.i]).avatar} size={170} ring={sideColor(sideOf(setup.sides, order[phase.i]))} />
          <h3>{pOf(order[phase.i]).name}</h3>
          <div class="pill">
            {game.icon} {game.name}
          </div>
          <p class="muted" style={{ fontSize: '18px', margin: 0, maxWidth: '340px' }}>
            {game.howTo}
          </p>
          <button class="btn" style={{ marginTop: '16px' }} onClick={() => (sfx.tap(), setPhase({ t: 'play', i: phase.i }))}>
            Estoy listo/a
          </button>
        </div>
      )}

      {phase.t === 'turn' && (
        <div class="handoff">
          <Avatar spec={pOf(order[phase.i]).avatar} size={120} ring="#fff" />
          <h3>{pOf(order[phase.i]).name}</h3>
          <div style={{ fontSize: '72px', fontWeight: 800, lineHeight: 1, color: 'var(--yellow)' }}>{phase.score}</div>
          {phase.score > 0 && phase.score > personalBest(order[phase.i], game.id) && <div class="pill">🏅 ¡Nuevo récord personal!</div>}
          <div class="scores" style={{ width: '100%', marginTop: '8px' }}>
            {order.slice(0, phase.i + 1).map((pid) => (
              <div class="scorerow" style={{ background: `${sideColor(sideOf(setup.sides, pid))}33` }}>
                <Avatar spec={pOf(pid).avatar} size={40} />
                {pOf(pid).name}
                <span class="n">{scores[pid]}</span>
              </div>
            ))}
          </div>
          <button
            class="btn"
            style={{ marginTop: '12px' }}
            onClick={() => {
              sfx.tap();
              if (phase.i + 1 < order.length) setPhase({ t: 'handoff', i: phase.i + 1 });
              else finishRound();
            }}
          >
            {phase.i + 1 < order.length ? `Sigue ${pOf(order[phase.i + 1]).name}` : 'Ver resultado'}
          </button>
        </div>
      )}

      {phase.t === 'result' && (
        <>
          <Confetti />
          <div class="center">
            <div style={{ fontSize: '54px' }}>🏆</div>
            <h3 style={{ margin: 0, fontSize: '30px' }}>
              {rounds[round].winnerSides.length > 1 ? '¡Empate!' : `¡${solo ? 'Gana' : 'Ganan'} ${solo ? pOf(setup.sides[rounds[round].winnerSides[0]][0]).name : sideLabel(setup.sides, rounds[round].winnerSides[0], players)}!`}
            </h3>
            <div class="muted">{game.name}</div>
          </div>
          <RoundResult sides={setup.sides} players={players} record={rounds[round]} roundIdx={round} totalRounds={total} />
          {total > 1 && (
            <>
              <div class="label">Tabla de la noche</div>
              <Standings sides={setup.sides} players={players} points={points} />
            </>
          )}
          <button
            class="btn"
            style={{ marginTop: 'auto' }}
            onClick={() => {
              sfx.tap();
              if (round + 1 < total) {
                setRound(round + 1);
                setScores({});
                setPhase({ t: 'intro' });
              } else setPhase({ t: 'final' });
            }}
          >
            {round + 1 < total ? 'Siguiente juego' : total > 1 ? '¡Ver campeón!' : 'Terminar'}
          </button>
        </>
      )}

      {phase.t === 'final' && <Final setup={setup} players={players} points={points} nav={nav} />}
    </div>
  );
}

function Final({ setup, players, points, nav }: { setup: MatchSetup; players: Profile[]; points: number[]; nav: Nav }) {
  const w = finalWinners(points);
  useMemo(() => sfx.fanfare(), []);
  return (
    <>
      <Confetti />
      <div class="center">
        <h3 style={{ margin: '0', fontSize: '36px', lineHeight: 1 }}>{w.length > 1 ? '¡Empate de campeones!' : setup.games.length > 1 ? '¡Campeón de la noche!' : '¡Ganador!'}</h3>
        <div class="muted" style={{ fontSize: '18px' }}>
          {w.map((i) => sideLabel(setup.sides, i, players)).join(' · ')}
        </div>
      </div>
      <Podium sides={setup.sides} players={players} points={points} />
      <div class="stack" style={{ marginTop: 'auto' }}>
        <button class="btn pink" onClick={() => (sfx.tap(), nav({ name: 'localMatch', setup: { ...setup, games: setup.games.length > 1 ? pickGames(setup.games.length) : setup.games } }))}>
          🔁 ¡Revancha!
        </button>
        <button class="btn ghost" onClick={() => nav({ name: 'setup', preset: setup })}>
          Cambiar jugadores o juegos
        </button>
        <button class="btn ghost" onClick={() => nav({ name: 'home' })}>
          Inicio
        </button>
      </div>
    </>
  );
}
