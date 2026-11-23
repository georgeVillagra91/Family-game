import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { Avatar } from '../avatar';
import { sfx } from '../audio';
import { Mode, Profile, RoundRecord, addMatch, getProfile, getProfiles, getSettings, setSettings, uid } from '../store';
import type { Nav } from '../app';
import { Room } from '../net';
import { GAMES, MatchSetup, assistFor, finalWinners, fits, gameById, isVersus, newSeed, nightPoints, pickGames, roundWinners, seatScoresToPlayers, seatsFor, sideColor, sideLabel, sideOf, suggestTeams } from '../match';
import { VersusOnline } from '../versus';
import { Confetti, GameChip, GameHero, PlayCanvas, Podium, QuitButton, RoundResult, ScoreRow, Standings, TopBar } from '../ui';

interface OState {
  phase: 'lobby' | 'intro' | 'play' | 'result' | 'final';
  players: Profile[];
  setup: MatchSetup | null;
  round: number;
  seed: number;
  rounds: RoundRecord[];
  pending: Record<string, number>;
  matchId: string;
}

const emptyState = (me: Profile): OState => ({ phase: 'lobby', players: [me], setup: null, round: 0, seed: 1, rounds: [], pending: {}, matchId: uid() });
const participants = (s: OState) => (s.setup ? s.setup.sides.flat() : []);

export function Online({ nav }: { nav: Nav }) {
  const [meId, setMeId] = useState<string | undefined>(getSettings().me && getProfile(getSettings().me!) ? getSettings().me : undefined);
  const [step, setStep] = useState<'who' | 'menu' | 'join' | 'room'>(meId ? 'menu' : 'who');
  const [code, setCode] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const roomRef = useRef<Room | null>(null);
  const me = meId ? getProfile(meId) : undefined;

  useEffect(() => () => roomRef.current?.close(), []);

  const host = async () => {
    setBusy(true);
    setErr('');
    const r = new Room();
    roomRef.current = r;
    try {
      await r.host();
      setStep('room');
    } catch (e) {
      setErr('No se pudo crear la sala. Revisá la conexión a internet y probá de nuevo.');
      r.close();
    }
    setBusy(false);
  };
  const join = async () => {
    if (code.length !== 4) return;
    setBusy(true);
    setErr('');
    const r = new Room();
    roomRef.current = r;
    try {
      await r.join(code);
      setStep('room');
    } catch (e: any) {
      setErr(e?.type === 'peer-unavailable' ? 'No encontramos esa sala. Revisá el código.' : 'No se pudo conectar. Revisá el código y la conexión.');
      r.close();
    }
    setBusy(false);
  };

  if (step === 'room' && roomRef.current && me) return <OnlineRoom room={roomRef.current} me={me} nav={nav} />;

  return (
    <div class="screen">
      <TopBar title="Jugar online" onBack={() => (step === 'join' ? setStep('menu') : step === 'menu' && meId ? nav({ name: 'home' }) : nav({ name: 'home' }))} />
      {step === 'who' && (
        <>
          <p class="center" style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>
            ¿De quién es este celu?
          </p>
          <div class="players">
            {getProfiles().map((p) => (
              <button
                class="pl"
                onClick={() => {
                  sfx.tap();
                  setSettings({ me: p.id });
                  setMeId(p.id);
                  setStep('menu');
                }}
              >
                <Avatar spec={p.avatar} size={72} />
                {p.name}
              </button>
            ))}
          </div>
        </>
      )}
      {step === 'menu' && me && (
        <>
          <div class="card row">
            <Avatar spec={me.avatar} size={64} />
            <div class="grow">
              <div class="muted" style={{ fontSize: '14px', fontWeight: 700 }}>
                Jugás como
              </div>
              <div style={{ fontSize: '24px', fontWeight: 800, lineHeight: 1 }}>{me.name}</div>
            </div>
            <button class="btn ghost" style={{ width: 'auto', fontSize: '16px', minHeight: '44px' }} onClick={() => setStep('who')}>
              Cambiar
            </button>
          </div>
          <button class="btn big pink" disabled={busy} onClick={host}>
            <span class="emoji">🏠</span>
            <span>
              Crear una sala
              <small>Te damos un código para compartir</small>
            </span>
          </button>
          <button class="btn big blue" disabled={busy} onClick={() => setStep('join')}>
            <span class="emoji">🔑</span>
            <span>
              Unirme con un código
              <small>Alguien ya creó la sala</small>
            </span>
          </button>
          {busy && <div class="spinner" />}
          <p class="muted center" style={{ fontSize: '15px' }}>
            Funciona con internet desde cualquier lugar. Ideal con una llamada de voz al mismo tiempo.
          </p>
        </>
      )}
      {step === 'join' && (
        <>
          <p class="center" style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>
            Escribí el código de la sala
          </p>
          <input
            class="codeinput"
            maxLength={4}
            autoFocus
            inputMode="text"
            autoCapitalize="characters"
            autoComplete="off"
            value={code}
            onInput={(e) => setCode((e.target as HTMLInputElement).value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
          />
          <button class="btn blue" disabled={code.length !== 4 || busy} onClick={join}>
            {busy ? 'Conectando…' : 'Entrar'}
          </button>
        </>
      )}
      {err && (
        <div class="card center" style={{ borderColor: '#ff4d6d' }}>
          {err}
        </div>
      )}
    </div>
  );
}

function OnlineRoom({ room, me, nav }: { room: Room; me: Profile; nav: Nav }) {
  const [st, setSt] = useState<OState>(() => emptyState(me));
  const [status, setStatus] = useState('');
  const [played, setPlayed] = useState<Record<string, boolean>>({});
  const stRef = useRef(st);
  stRef.current = st;
  const peerToPid = useRef(new Map<string, string>());
  const isHost = room.isHost;

  // Anfitrión: actualizar y repartir el estado
  const update = (fn: (s: OState) => OState) => {
    const next = fn(stRef.current);
    stRef.current = next;
    setSt(next);
    room.broadcast({ t: 'state', s: next });
  };

  useEffect(() => {
    room.onStatus = (s) => setStatus(s);
    if (isHost) {
      room.onPeerLeave = (peerId) => {
        const pid = peerToPid.current.get(peerId);
        peerToPid.current.delete(peerId);
        if (pid && stRef.current.phase === 'lobby') update((s) => ({ ...s, players: s.players.filter((p) => p.id !== pid) }));
      };
      return room.on((m, from) => {
        if (m.t === 'hello') {
          const p = { ...(m.profile as Profile), remote: true };
          peerToPid.current.set(from, p.id);
          update((s) => ({ ...s, players: s.players.some((x) => x.id === p.id) ? s.players.map((x) => (x.id === p.id ? p : x)) : [...s.players, p] }));
          sfx.good();
        } else if (m.t === 'score') {
          const pid = peerToPid.current.get(from);
          if (pid && m.round === stRef.current.round && stRef.current.phase === 'play') update((s) => ({ ...s, pending: { ...s.pending, [pid]: m.score } }));
        }
      });
    } else {
      room.send({ t: 'hello', profile: { id: me.id, name: me.name, avatar: me.avatar, level: me.level } });
      return room.on((m) => {
        if (m.t === 'state') {
          setSt(m.s as OState);
        }
      });
    }
  }, []);

  // Anfitrión: cerrar la ronda cuando todos terminaron
  useEffect(() => {
    if (!isHost || st.phase !== 'play' || !st.setup) return;
    const parts = participants(st);
    if (parts.every((pid) => st.pending[pid] !== undefined)) closeRound();
  }, [st.pending, st.phase]);

  // Todos: guardar la partida al final
  useEffect(() => {
    if (st.phase === 'final' && st.setup) {
      const pts = nightPoints(st.setup.sides, st.rounds, st.setup.games.length);
      addMatch({ id: st.matchId, date: Date.now(), online: true, mode: st.setup.mode, players: st.players.filter((p) => participants(st).includes(p.id)), sides: st.setup.sides, rounds: st.rounds, stars: pts, winnerSides: finalWinners(pts) });
      sfx.fanfare();
    }
    if (st.phase === 'result') sfx.win();
  }, [st.phase]);

  const closeRound = () =>
    update((s) => {
      const scores: Record<string, number> = {};
      for (const pid of participants(s)) scores[pid] = s.pending[pid] ?? 0;
      const rec: RoundRecord = { game: s.setup!.games[s.round], scores, winnerSides: roundWinners(s.setup!.sides, scores) };
      return { ...s, phase: 'result', rounds: [...s.rounds, rec] };
    });

  const leave = () => {
    room.close();
    nav({ name: 'home' });
  };

  const myScore = (score: number) => {
    setPlayed((p) => ({ ...p, [`${st.matchId}-${st.round}`]: true }));
    if (isHost) update((s) => ({ ...s, pending: { ...s.pending, [me.id]: score } }));
    else room.send({ t: 'score', round: st.round, score });
  };

  const pOf = (id: string) => st.players.find((p) => p.id === id);
  const setup = st.setup;
  const total = setup?.games.length ?? 0;
  const points = setup ? nightPoints(setup.sides, st.rounds, total) : [];
  const amIn = setup ? setup.sides.flat().includes(me.id) : false;
  const game = setup ? gameById(setup.games[st.round]) : null;

  if (st.phase === 'play' && setup && game && isVersus(game)) {
    const seats = seatsFor(game, setup.sides, st.players);
    const mine = seats.map((s, i) => (s.pids.includes(me.id) ? i : -1)).filter((i) => i >= 0);
    return (
      <VersusOnline
        key={`v${st.matchId}-${st.round}`}
        def={game}
        ctx={{ seats, seed: st.seed, local: false }}
        room={room}
        me={mine}
        round={st.round}
        onQuit={leave}
        onDone={(seatScores) => {
          if (!isHost) return;
          const sc = seatScoresToPlayers(seats, seatScores);
          update((s) => ({ ...s, pending: { ...s.pending, ...sc } }));
        }}
      />
    );
  }

  if (st.phase === 'play' && setup && game && !isVersus(game) && amIn && !played[`${st.matchId}-${st.round}`] && st.pending[me.id] === undefined) {
    const si = sideOf(setup.sides, me.id);
    return <PlayCanvas key={`o${st.round}`} game={game} seed={st.seed} assist={assistFor(me, si, points)} color={sideColor(si)} onEnd={myScore} />;
  }

  return (
    <div class="screen">
      <div class="topbar">
        <h2>{st.phase === 'lobby' ? 'Sala' : total > 1 ? `Juego ${st.round + 1} de ${total}` : 'Partida'}</h2>
        <QuitButton onQuit={leave} />
      </div>
      {status === 'desconectado' && (
        <div class="card center" style={{ borderColor: '#ff4d6d' }}>
          Se cortó la conexión con la sala. Volvé a entrar con el mismo código.
        </div>
      )}

      {st.phase === 'lobby' && (isHost ? <HostLobby room={room} st={st} start={(setup) => update((s) => ({ ...s, setup, phase: 'intro', round: 0, rounds: [], pending: {}, seed: newSeed(), matchId: uid() }))} /> : <GuestLobby st={st} code={room.code} />)}

      {st.phase === 'intro' && game && setup && (
        <>
          <GameHero game={game} extra={total >= 3 && st.round === total - 1 ? <p>⭐ ¡Este juego vale doble!</p> : undefined} />
          {st.round > 0 && <Standings sides={setup.sides} players={st.players} points={points} />}
          {!amIn && <p class="center muted">Esta vez mirás. ¡En la próxima jugás!</p>}
          {isHost ? (
            <button class="btn" style={{ marginTop: 'auto' }} onClick={() => update((s) => ({ ...s, phase: 'play', pending: {} }))}>
              ¡A jugar todos!
            </button>
          ) : (
            <p class="center muted dots" style={{ marginTop: 'auto' }}>
              Esperando que el anfitrión arranque
            </p>
          )}
        </>
      )}

      {st.phase === 'play' && setup && (
        <>
          <div class="center">
            <div class="spinner" />
            <p style={{ fontSize: '20px', fontWeight: 700 }}>Esperando a los demás…</p>
          </div>
          <div class="scores">
            {setup.sides.flat().map((pid) => {
              const p = pOf(pid);
              return p ? <ScoreRow p={p} score={st.pending[pid]} /> : null;
            })}
          </div>
          {isHost && (
            <button class="btn ghost" style={{ marginTop: 'auto' }} onClick={closeRound}>
              Seguir sin esperar
            </button>
          )}
        </>
      )}

      {st.phase === 'result' && setup && game && st.rounds[st.round] && (
        <>
          <Confetti />
          <div class="center">
            <div style={{ fontSize: '54px' }}>🏆</div>
            <h3 style={{ margin: 0, fontSize: '30px' }}>{st.rounds[st.round].winnerSides.length > 1 ? '¡Empate!' : `¡${setup.sides[0].length > 1 ? 'Ganan' : 'Gana'} ${sideLabel(setup.sides, st.rounds[st.round].winnerSides[0], st.players)}!`}</h3>
            <div class="muted">{game.name}</div>
          </div>
          <RoundResult sides={setup.sides} players={st.players} record={st.rounds[st.round]} roundIdx={st.round} totalRounds={total} />
          {total > 1 && (
            <>
              <div class="label">Tabla de la noche</div>
              <Standings sides={setup.sides} players={st.players} points={points} />
            </>
          )}
          {isHost ? (
            <button class="btn" style={{ marginTop: 'auto' }} onClick={() => update((s) => (s.round + 1 < total ? { ...s, phase: 'intro', round: s.round + 1, pending: {}, seed: newSeed() } : { ...s, phase: 'final' }))}>
              {st.round + 1 < total ? 'Siguiente juego' : '¡Ver campeón!'}
            </button>
          ) : (
            <p class="center muted dots" style={{ marginTop: 'auto' }}>
              Esperando al anfitrión
            </p>
          )}
        </>
      )}

      {st.phase === 'final' && setup && (
        <>
          <Confetti />
          <div class="center">
            <h3 style={{ margin: 0, fontSize: '34px' }}>{total > 1 ? '¡Campeón de la noche!' : '¡Ganador!'}</h3>
            <div class="muted">{finalWinners(points).map((i) => sideLabel(setup.sides, i, st.players)).join(' · ')}</div>
          </div>
          <Podium sides={setup.sides} players={st.players} points={points} />
          {isHost ? (
            <div class="stack" style={{ marginTop: 'auto' }}>
              <button class="btn pink" onClick={() => update((s) => ({ ...s, phase: 'intro', round: 0, rounds: [], pending: {}, seed: newSeed(), matchId: uid(), setup: { ...s.setup!, games: s.setup!.games.length > 1 ? pickGames(s.setup!.games.length, s.setup!.sides) : s.setup!.games } }))}>
                🔁 ¡Revancha!
              </button>
              <button class="btn ghost" onClick={() => update((s) => ({ ...s, phase: 'lobby', setup: null }))}>
                Volver a la sala
              </button>
            </div>
          ) : (
            <p class="center muted" style={{ marginTop: 'auto' }}>
              El anfitrión puede pedir la revancha.
            </p>
          )}
        </>
      )}
    </div>
  );
}

function GuestLobby({ st, code }: { st: OState; code: string }) {
  return (
    <>
      <div class="label">Sala</div>
      <div class="code">{code}</div>
      <div class="label">En la sala ({st.players.length})</div>
      <div class="players">
        {st.players.map((p, i) => (
          <div class="pl">
            {i === 0 && <span class="badge">👑</span>}
            <Avatar spec={p.avatar} size={64} />
            {p.name}
          </div>
        ))}
      </div>
      <p class="center muted dots" style={{ marginTop: 'auto', fontSize: '18px' }}>
        Esperando que el anfitrión elija el juego
      </p>
    </>
  );
}

const NEED: Record<Mode, [number, number]> = { '1v1': [2, 2], '2v2': [4, 4], todos: [2, 6] };

function HostLobby({ room, st, start }: { room: Room; st: OState; start: (s: MatchSetup) => void }) {
  const [mode, setMode] = useState<Mode>('todos');
  const [sel, setSel] = useState<string[] | null>(null);
  const [teams, setTeams] = useState<string[][] | null>(null);
  const [length, setLength] = useState(3);
  const [single, setSingle] = useState(GAMES[0].id);
  const [copied, setCopied] = useState(false);
  const [min, max] = NEED[mode];
  const ids = st.players.map((p) => p.id);
  const chosen = (sel ?? ids.slice(0, max)).filter((id) => ids.includes(id));
  const ready = chosen.length >= min && chosen.length <= max;
  const chosenP = chosen.map((id) => st.players.find((p) => p.id === id)!);
  const validTeams = teams && teams.flat().length === 4 && teams.flat().every((id) => chosen.includes(id)) ? teams : null;
  useEffect(() => {
    if (mode === '2v2' && ready && !validTeams) setTeams(suggestTeams(chosenP));
  }, [mode, ready, chosen.join()]);

  const toggle = (id: string) => {
    sfx.tap();
    const cur = chosen;
    if (cur.includes(id)) setSel(cur.filter((x) => x !== id));
    else if (cur.length < max) setSel([...cur, id]);
    else if (max === 2) setSel([cur[1], id]);
  };
  const swap = (pid: string) => {
    if (!validTeams) return;
    const a = validTeams[0].includes(pid) ? 0 : 1;
    const other = validTeams[1 - a][validTeams[a].indexOf(pid)];
    setTeams(validTeams.map((s) => s.map((x) => (x === pid ? other : x === other ? pid : x))));
  };
  const share = async () => {
    const url = location.href.split('?')[0].split('#')[0];
    const text = `¡Vení a jugar a ¡Revancha! Código de sala: ${room.code}\n${url}`;
    try {
      if (navigator.share) await navigator.share({ text });
      else {
        await navigator.clipboard.writeText(text);
        setCopied(true);
      }
    } catch {
      /* cancelado */
    }
  };
  const go = () => {
    const sides = mode === '2v2' ? validTeams! : chosen.map((id) => [id]);
    sfx.go();
    start({ mode, sides, games: length === 1 ? [single] : pickGames(length, sides) });
  };

  return (
    <>
      <div class="label">Código de la sala</div>
      <div class="code">{room.code}</div>
      <button class="btn ghost" onClick={share}>
        {copied ? '¡Copiado!' : '📤 Compartir código'}
      </button>
      <div class="label">En la sala ({st.players.length}) · tocá para elegir quién juega</div>
      <div class="players">
        {st.players.map((p, i) => (
          <button class={`pl ${chosen.includes(p.id) ? 'on' : ''}`} onClick={() => toggle(p.id)}>
            {i === 0 && <span class="badge">👑</span>}
            <Avatar spec={p.avatar} size={60} />
            {p.name}
          </button>
        ))}
      </div>
      {st.players.length < 2 && <p class="center muted dots">Esperando que se unan los demás</p>}
      <div class="label">Formato</div>
      <div class="seg">
        {(['1v1', '2v2', 'todos'] as Mode[]).map((m) => (
          <button class={mode === m ? 'on' : ''} onClick={() => (sfx.click(), setMode(m), setSel(null), setTeams(null))}>
            {m === '1v1' ? '1 vs 1' : m === '2v2' ? '2 vs 2' : 'Todos'}
          </button>
        ))}
      </div>
      {mode === '2v2' && validTeams && (
        <div class="teams">
          {validTeams.map((t, i) => (
            <div class="team" style={{ borderColor: sideColor(i), background: `${sideColor(i)}22` }}>
              <h4>Equipo {i === 0 ? 'Rojo' : 'Azul'}</h4>
              {t.map((pid) => {
                const p = st.players.find((x) => x.id === pid)!;
                return (
                  <button class="member" onClick={() => swap(pid)}>
                    <Avatar spec={p.avatar} size={34} />
                    {p.name}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}
      <div class="label">¿Cuánto jugamos?</div>
      <div class="seg">
        {[1, 3, 5].map((n) => (
          <button class={length === n ? 'on' : ''} onClick={() => (sfx.click(), setLength(n))}>
            {n === 1 ? 'Un juego' : n === 3 ? 'Noche corta' : 'Noche'}
            <small>{n === 1 ? 'elegís' : `${n} juegos`}</small>
          </button>
        ))}
      </div>
      {length === 1 && (
        <div class="games">
          {GAMES.map((g) => {
            const sd = mode === '2v2' ? validTeams : chosen.map((id) => [id]);
            const ok = !sd || fits(g, sd);
            return <GameChip id={g.id} on={single === g.id && ok} off={!ok} onClick={() => ok && setSingle(g.id)} />;
          })}
        </div>
      )}
      <button class="btn" disabled={!ready || (mode === '2v2' && !validTeams) || (length === 1 && !fits(gameById(single), mode === '2v2' ? validTeams ?? [] : chosen.map((id) => [id])))} onClick={go}>
        {ready ? '¡Empezar!' : `Hacen falta ${min === max ? min : `de ${min} a ${max}`} jugadores`}
      </button>
    </>
  );
}
