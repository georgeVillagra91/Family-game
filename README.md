# ¡Revancha! Juegos en familia

Minijuegos cortos para jugar en familia (Sofi, George, Cande, Guille y quien se sume), en un solo celu pasándolo o cada uno desde el suyo con un código de sala.

## Cómo se juega

- **En este celu:** 1 vs 1, 2 vs 2 o todos contra todos, pasando el celu por turnos.
- **Online:** alguien crea una sala, comparte el código de 4 letras y los demás se unen desde su celu, estén donde estén.
- **Noche de Juegos:** 3 o 5 minijuegos seguidos. Ganar un juego da 3 puntos, perder 1 (en "todos": 3, 2, 1). El último juego vale doble.
- **Historial:** ranking, récords por juego y todas las partidas, guardados en cada celu.
- **Ventaja invisible:** según la edad del perfil, cada juego ayuda un poquito (canasta más ancha, globos más lentos, más tiempo para la secuencia). Quien viene perdiendo la noche por 3 o más recibe un empujoncito extra.

## Minijuegos (ola 1)

| Juego | Tipo | Cómo |
|---|---|---|
| 🍎 Lluvia de Frutas | Habilidad | Mover la canasta, atrapar frutas, esquivar cocos |
| 🎈 Explota tu Color | Reflejos | Tocar solo los globos de tu color |
| 🐒 Memoria de Monos | Atención | Repetir la secuencia de tambores |
| 🔔 Duelo al Mediodía | Reflejos | Tocar cuando suena la campana, sin caer en trampas |
| 🥞 Panqueques Voladores | Reflejos | Dar vuelta el panqueque cuando está dorado |
| 📚 Pares Gemelos | Atención | Encontrar el único dibujo repetido |

## Instalar en el celu

Abrir el enlace en el navegador y elegir **Instalar app** (Android) o **Compartir → Agregar a inicio** (iPhone). Funciona sin internet para jugar en un celu; el modo online necesita conexión.

## Para desarrolladores

```bash
npm install
npm run dev      # servidor local
npm run build    # genera dist/
```

- Vite + Preact + TypeScript, PWA con `vite-plugin-pwa`.
- Online: WebRTC entre celulares con [PeerJS](https://peerjs.com) y su servidor público gratuito. El celu que crea la sala es el anfitrión.
- Para sumar un minijuego: crear `src/games/<juego>.ts` que exporte un `GameDef` y agregarlo a `GAMES` en `src/match.ts`.
- Pruebas locales del modo online: levantar un servidor PeerJS local y abrir `?peer=127.0.0.1:9000`. Con `?autotest` cada juego termina solo con un puntaje al azar.
- Cada push a `main` publica en GitHub Pages (rama `gh-pages`).
