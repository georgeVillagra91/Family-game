import { useEffect, useState } from 'preact/hooks';
import { subscribe } from './store';
import type { MatchSetup } from './match';
import { Home, Settings } from './screens/home';
import { Profiles, EditProfile } from './screens/profiles';
import { LocalSetup, LocalMatch } from './screens/local';
import { History } from './screens/history';
import { Online } from './screens/online';
import { unlockAudio } from './audio';

export type Route =
  | { name: 'home' }
  | { name: 'settings' }
  | { name: 'profiles' }
  | { name: 'editProfile'; id?: string }
  | { name: 'setup'; preset?: MatchSetup }
  | { name: 'localMatch'; setup: MatchSetup }
  | { name: 'history' }
  | { name: 'online' };
export type Nav = (r: Route) => void;

export function App() {
  const [route, setRoute] = useState<Route>({ name: 'home' });
  const [key, setKey] = useState(0);
  const [, force] = useState(0);
  useEffect(() => {
    const off = subscribe(() => force((n) => n + 1));
    return () => {
      off();
    };
  }, []);
  useEffect(() => {
    const u = () => unlockAudio();
    window.addEventListener('pointerdown', u, { once: true });
  }, []);
  const nav: Nav = (r) => {
    setRoute(r);
    setKey((k) => k + 1);
    window.scrollTo(0, 0);
  };
  switch (route.name) {
    case 'settings':
      return <Settings key={key} nav={nav} />;
    case 'profiles':
      return <Profiles key={key} nav={nav} />;
    case 'editProfile':
      return <EditProfile key={key} nav={nav} id={route.id} />;
    case 'setup':
      return <LocalSetup key={key} nav={nav} preset={route.preset} />;
    case 'localMatch':
      return <LocalMatch key={key} nav={nav} setup={route.setup} />;
    case 'history':
      return <History key={key} nav={nav} />;
    case 'online':
      return <Online key={key} nav={nav} />;
    default:
      return <Home key={key} nav={nav} />;
  }
}
