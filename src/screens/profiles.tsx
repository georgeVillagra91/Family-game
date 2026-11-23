import { useState } from 'preact/hooks';
import { ACC_NAMES, AVATAR_OPTIONS, Avatar, AvatarSpec, EYE_NAMES, HAIR_COLORS, HAIR_NAMES, MOUTH_NAMES, PALETTE, SKINS, randomAvatar } from '../avatar';
import { sfx } from '../audio';
import { LEVEL_NAMES, Level, Profile, deleteProfile, getProfile, getProfiles, newGuest, uid, upsertProfile } from '../store';
import type { Nav } from '../app';
import { TopBar } from '../ui';

export function Profiles({ nav }: { nav: Nav }) {
  const ps = getProfiles();
  return (
    <div class="screen">
      <TopBar title="Perfiles" onBack={() => nav({ name: 'home' })} />
      <div class="players">
        {ps.map((p) => (
          <button class="pl" onClick={() => (sfx.tap(), nav({ name: 'editProfile', id: p.id }))}>
            <Avatar spec={p.avatar} size={72} />
            {p.name}
            <span class="sub">{p.guest ? 'Invitado' : LEVEL_NAMES[p.level]}</span>
          </button>
        ))}
        <button class="pl add" onClick={() => nav({ name: 'editProfile' })}>
          <span style={{ fontSize: '34px' }}>＋</span>
          Nuevo
        </button>
        <button
          class="pl add"
          onClick={() => {
            const g = newGuest();
            upsertProfile(g);
            nav({ name: 'editProfile', id: g.id });
          }}
        >
          <span style={{ fontSize: '34px' }}>🎟️</span>
          Invitado
        </button>
      </div>
      <p class="muted center">Tocá un perfil para cambiar su avatar y su nombre.</p>
    </div>
  );
}

type Key = keyof AvatarSpec;

function Stepper({ k, label, names, spec, set }: { k: Key; label: string; names: string[]; spec: AvatarSpec; set: (s: AvatarSpec) => void }) {
  const n = AVATAR_OPTIONS[k];
  const step = (d: number) => {
    sfx.click();
    set({ ...spec, [k]: (spec[k] + d + n) % n });
  };
  return (
    <div class="optrow">
      <span class="k">{label}</span>
      <button class="iconbtn" onClick={() => step(-1)} aria-label={`${label} anterior`}>
        ‹
      </button>
      <span class="name">{names[spec[k]]}</span>
      <button class="iconbtn" onClick={() => step(1)} aria-label={`${label} siguiente`}>
        ›
      </button>
    </div>
  );
}

function Swatches({ k, label, colors, spec, set }: { k: Key; label: string; colors: string[]; spec: AvatarSpec; set: (s: AvatarSpec) => void }) {
  return (
    <div class="optrow">
      <span class="k">{label}</span>
      <div class="swatches">
        {colors.map((c, i) => (
          <button class={`sw ${spec[k] === i ? 'on' : ''}`} style={{ background: c }} aria-label={`${label} ${i + 1}`} onClick={() => (sfx.click(), set({ ...spec, [k]: i }))} />
        ))}
      </div>
    </div>
  );
}

export function EditProfile({ nav, id }: { nav: Nav; id?: string }) {
  const existing = id ? getProfile(id) : undefined;
  const [p, setP] = useState<Profile>(existing ?? { id: uid(), name: '', level: 3, avatar: randomAvatar() });
  const [confirmDel, setConfirmDel] = useState(false);
  const set = (avatar: AvatarSpec) => setP({ ...p, avatar });
  const save = () => {
    upsertProfile({ ...p, name: p.name.trim() || 'Jugador' });
    sfx.good();
    nav({ name: 'profiles' });
  };
  return (
    <div class="screen">
      <TopBar title={existing ? 'Editar perfil' : 'Nuevo perfil'} onBack={() => nav({ name: 'profiles' })} />
      <div class="editor-preview">
        <Avatar spec={p.avatar} size={168} ring="#fff" />
      </div>
      <input class="textinput" placeholder="Nombre" maxLength={14} value={p.name} onInput={(e) => setP({ ...p, name: (e.target as HTMLInputElement).value })} />
      <div class="card stack">
        <Swatches k="skin" label="Piel" colors={SKINS} spec={p.avatar} set={set} />
        <Stepper k="hair" label="Pelo" names={HAIR_NAMES} spec={p.avatar} set={set} />
        <Swatches k="hairColor" label="Color pelo" colors={HAIR_COLORS} spec={p.avatar} set={set} />
        <Stepper k="eyes" label="Ojos" names={EYE_NAMES} spec={p.avatar} set={set} />
        <Stepper k="mouth" label="Boca" names={MOUTH_NAMES} spec={p.avatar} set={set} />
        <Stepper k="acc" label="Extra" names={ACC_NAMES} spec={p.avatar} set={set} />
        <Swatches k="shirt" label="Remera" colors={PALETTE} spec={p.avatar} set={set} />
        <Swatches k="bg" label="Fondo" colors={PALETTE} spec={p.avatar} set={set} />
        <button class="btn ghost" onClick={() => (sfx.whoosh(), set(randomAvatar()))}>
          🎲 Sorpresa
        </button>
      </div>
      <div class="label">Edad</div>
      <div class="seg">
        {([1, 2, 3] as Level[]).map((l) => (
          <button class={p.level === l ? 'on' : ''} onClick={() => (sfx.click(), setP({ ...p, level: l }))}>
            {LEVEL_NAMES[l].split(' (')[0]}
            <small>{l === 1 ? 'hasta 8' : l === 2 ? '9 a 12' : '13 o más'}</small>
          </button>
        ))}
      </div>
      <p class="muted" style={{ margin: '-6px 4px 0', fontSize: '14px' }}>
        La edad solo se usa para sortear equipos mezclados. Todos juegan con la misma dificultad.
      </p>
      <button class="btn green" onClick={save}>
        Guardar
      </button>
      {existing && (
        <button
          class="btn ghost danger"
          onClick={() => {
            if (!confirmDel) return setConfirmDel(true);
            deleteProfile(p.id);
            nav({ name: 'profiles' });
          }}
        >
          {confirmDel ? '¿Seguro? Tocá otra vez para borrar' : 'Borrar perfil'}
        </button>
      )}
    </div>
  );
}
