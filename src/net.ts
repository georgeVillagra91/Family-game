// Salas online por código: conexión directa entre celulares con PeerJS (WebRTC).
// El celu que crea la sala es el "anfitrión": guarda el estado y lo reparte a los demás.
import Peer, { DataConnection, PeerOptions } from 'peerjs';

const PREFIX = 'revancha-fam-v1-';
const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const makeCode = () => Array.from({ length: 4 }, () => ALPHA[Math.floor(Math.random() * ALPHA.length)]).join('');

function peerOptions(): PeerOptions {
  // Para pruebas locales: ?peer=localhost:9000
  const q = new URLSearchParams(location.search).get('peer');
  if (q) {
    const [host, port] = q.split(':');
    return { host, port: Number(port || 9000), path: '/', secure: false, debug: 1 };
  }
  return { debug: 1 };
}

export type Msg = { t: string; [k: string]: any };
type Handler = (msg: Msg, from: string) => void;

export class Room {
  peer: Peer | null = null;
  code = '';
  isHost = false;
  conns = new Map<string, DataConnection>(); // peerId -> conn (solo anfitrión)
  hostConn: DataConnection | null = null;
  private handlers = new Set<Handler>();
  onStatus: (s: string) => void = () => {};
  onPeerLeave: (peerId: string) => void = () => {};
  closed = false;

  on(h: Handler) {
    this.handlers.add(h);
    return () => this.handlers.delete(h);
  }
  private emit(m: Msg, from: string) {
    this.handlers.forEach((h) => h(m, from));
  }

  host(): Promise<string> {
    this.isHost = true;
    return new Promise((resolve, reject) => {
      const tryOpen = (attempt: number) => {
        const code = makeCode();
        const peer = new Peer(PREFIX + code, peerOptions());
        peer.on('open', () => {
          this.peer = peer;
          this.code = code;
          resolve(code);
        });
        peer.on('connection', (c) => this.accept(c));
        peer.on('disconnected', () => {
          if (!this.closed) {
            this.onStatus('reconectando');
            try {
              peer.reconnect();
            } catch {
              /* ignore */
            }
          }
        });
        peer.on('error', (e: any) => {
          if (e.type === 'unavailable-id' && attempt < 5) {
            peer.destroy();
            tryOpen(attempt + 1);
          } else if (!this.peer) reject(e);
          else this.onStatus('error');
        });
      };
      tryOpen(0);
    });
  }

  private accept(c: DataConnection) {
    c.on('open', () => {
      this.conns.set(c.peer, c);
    });
    c.on('data', (d) => this.emit(d as Msg, c.peer));
    const gone = () => {
      if (this.conns.get(c.peer) === c) {
        this.conns.delete(c.peer);
        this.onPeerLeave(c.peer);
      }
    };
    c.on('close', gone);
    c.on('error', gone);
  }

  join(code: string): Promise<void> {
    this.isHost = false;
    this.code = code.toUpperCase();
    return new Promise((resolve, reject) => {
      const peer = new Peer(peerOptions());
      this.peer = peer;
      let settled = false;
      const timer = setTimeout(() => {
        if (!settled) {
          settled = true;
          reject(new Error('timeout'));
        }
      }, 15000);
      peer.on('open', () => {
        const c = peer.connect(PREFIX + this.code, { reliable: true });
        c.on('open', () => {
          this.hostConn = c;
          if (!settled) {
            settled = true;
            clearTimeout(timer);
            resolve();
          }
        });
        c.on('data', (d) => this.emit(d as Msg, 'host'));
        c.on('close', () => {
          if (!this.closed) this.onStatus('desconectado');
        });
      });
      peer.on('error', (e: any) => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          reject(e);
        } else this.onStatus('error');
      });
    });
  }

  /** Cliente → anfitrión */
  send(m: Msg) {
    try {
      this.hostConn?.send(m);
    } catch {
      /* ignore */
    }
  }
  /** Anfitrión → todos */
  broadcast(m: Msg) {
    for (const c of this.conns.values()) {
      try {
        c.send(m);
      } catch {
        /* ignore */
      }
    }
  }
  sendTo(peerId: string, m: Msg) {
    try {
      this.conns.get(peerId)?.send(m);
    } catch {
      /* ignore */
    }
  }
  close() {
    this.closed = true;
    try {
      this.peer?.destroy();
    } catch {
      /* ignore */
    }
    this.handlers.clear();
  }
}
