import { useEffect, useState } from 'preact/hooks';
import { Avatar } from '../avatar';
import { sfx } from '../audio';
import { getProfiles, getSettings, setSettings } from '../store';
import type { Nav } from '../app';
import { TopBar } from '../ui';

let deferredPrompt: any = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
});

const isStandalone = () => matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent);

export function Home({ nav }: { nav: Nav }) {
  const fam = getProfiles().filter((p) => !p.guest).slice(0, 4);
  const [canInstall, setCanInstall] = useState(!!deferredPrompt);
  useEffect(() => {
    const h = () => setCanInstall(true);
    window.addEventListener('beforeinstallprompt', h);
    return () => window.removeEventListener('beforeinstallprompt', h);
  }, []);
  const go = (s: Parameters<Nav>[0]) => {
    sfx.tap();
    nav(s);
  };
  return (
    <div class="screen">
      <div class="row" style={{ justifyContent: 'flex-end' }}>
        <button class="iconbtn" aria-label="Ajustes" onClick={() => go({ name: 'settings' })}>
          ⚙️
        </button>
      </div>
      <div class="logo">
        <div class="family">
          {fam.map((p) => (
            <Avatar spec={p.avatar} size={78} ring="#fff" />
          ))}
        </div>
        <h1>¡Revancha!</h1>
        <p>Minijuegos para jugar en familia</p>
      </div>
      <div class="stack" style={{ marginTop: '8px' }}>
        <button class="btn big" onClick={() => go({ name: 'setup' })}>
          <span class="emoji">📱</span>
          <span>
            Jugar en este celu
            <small>Pasando el celu, 1vs1, 2vs2 o todos</small>
          </span>
        </button>
        <button class="btn big pink" onClick={() => go({ name: 'online' })}>
          <span class="emoji">🌎</span>
          <span>
            Jugar online
            <small>Cada uno en su celu, con código de sala</small>
          </span>
        </button>
        <div class="row">
          <button class="btn ghost" onClick={() => go({ name: 'history' })}>
            <span class="emoji">🏆</span> Ranking
          </button>
          <button class="btn ghost" onClick={() => go({ name: 'profiles' })}>
            <span class="emoji">🙂</span> Perfiles
          </button>
        </div>
      </div>
      {!isStandalone() && (
        <div class="card center" style={{ marginTop: 'auto' }}>
          {canInstall ? (
            <button
              class="btn green"
              onClick={async () => {
                deferredPrompt?.prompt();
                await deferredPrompt?.userChoice;
                deferredPrompt = null;
                setCanInstall(false);
              }}
            >
              ⬇️ Instalar en este celu
            </button>
          ) : isIOS() ? (
            <span class="muted">
              Para instalarlo en iPhone: tocá <b>Compartir</b> y después <b>Agregar a inicio</b>.
            </span>
          ) : (
            <span class="muted">
              Para instalarlo: abrí el menú del navegador y elegí <b>Instalar app</b> o <b>Agregar a la pantalla principal</b>.
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export function Settings({ nav }: { nav: Nav }) {
  const s = getSettings();
  const [, force] = useState(0);
  const toggle = (k: 'sound' | 'vibrate') => {
    setSettings({ [k]: !s[k] });
    force((n) => n + 1);
    sfx.tap();
  };
  return (
    <div class="screen">
      <TopBar title="Ajustes" onBack={() => nav({ name: 'home' })} />
      <div class="card stack">
        <div class="row">
          <span class="grow" style={{ fontSize: '20px', fontWeight: 800 }}>
            🔊 Sonido
          </span>
          <button class={`switch ${getSettings().sound ? 'on' : ''}`} onClick={() => toggle('sound')} aria-label="Sonido" />
        </div>
        <div class="row">
          <span class="grow" style={{ fontSize: '20px', fontWeight: 800 }}>
            📳 Vibración
          </span>
          <button class={`switch ${getSettings().vibrate ? 'on' : ''}`} onClick={() => toggle('vibrate')} aria-label="Vibración" />
        </div>
      </div>
      <div class="card muted" style={{ fontSize: '16px' }}>
        Los perfiles y el historial se guardan en este celu. Cuando juegan online, cada celu guarda el resultado de la partida.
      </div>
      <button class="btn ghost" onClick={() => nav({ name: 'history' })}>
        Ver historial
      </button>
      <p class="muted center" style={{ marginTop: 'auto', fontSize: '14px' }}>
        ¡Revancha! v1 · hecho para Sofi, George, Cande y Guille
      </p>
    </div>
  );
}
