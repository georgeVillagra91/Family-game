# ¡Revancha! Juegos en familia

Minijuegos cortos para jugar en familia (Sofi, George, Cande, Guille y quien se sume), en un solo celu pasándolo o cada uno desde el suyo con un código de sala.

## Cómo se juega

- **En este celu:** 1 vs 1, 2 vs 2 o todos contra todos. Algunos juegos se juegan pasando el celu y otros todos a la vez, cada uno tocando su esquina de la pantalla.
- **Online:** alguien crea una sala, comparte el código de 4 letras y los demás se unen desde su celu, estén donde estén.
- **Noche de Juegos:** 3 o 5 juegos seguidos. Ganar un juego da 3 puntos, perder 1 (en "todos": 3, 2, 1). El último juego vale doble.
- **Historial:** ranking, récords por juego y todas las partidas, guardados en cada celu.
- **Misma dificultad para todos:** no hay ventajas por edad.

## Juegos

| Juego | Jugadores | Cómo |
|---|---|---|
| 🐌 Carrera de Caracoles | 2 a 4 a la vez | Tocar tus dos botones alternados; en un celu, cada uno en su esquina |
| 🎱 Bingo Familiar | 2 a 4 a la vez | Marcar los números cantados (en voz alta), cantar línea y bingo |
| 🎲 Ludo Rápido | 2 a 4 por turnos | 2 fichas cada uno, salir con 6, comer rivales, llegar al centro |
| ⚓ Batalla Naval | 2 lados por turnos | Esconder la flota y hundir la del rival; pantalla para pasar el celu sin espiar |
| 🛒 Tutti Frutti | 2 a 6 | Una letra y 6 categorías; online, el primero que completa frena el carrito |
| ❌ Ta-te-ti | 2 lados por turnos | Al mejor de 3 tableros |
| 🃏 Memoria de Cartas | 2 a 4 por turnos | Dar vuelta pares; si acertás seguís |
| 🎯 Arquería | todos (puntaje) | Apuntar con el dedo y tirar, con viento |
| 🍎 Lluvia de Frutas | todos (puntaje) | Mover la canasta, atrapar frutas, esquivar cocos |
| 🎈 Explota tu Color | todos (puntaje) | Tocar solo los globos de tu color |
| 🐒 Memoria de Monos | todos (puntaje) | Repetir la secuencia de tambores |
| 🔔 Duelo al Mediodía | todos (puntaje) | Tocar cuando suena la campana, sin caer en trampas |
| 📚 Pares Gemelos | todos (puntaje) | Encontrar el único dibujo repetido |

Los juegos "de puntaje" se juegan pasando el celu (o todos a la vez online con la misma ronda) y gana el mejor puntaje.

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
- Para sumar un juego de puntaje: crear `src/games/<juego>.ts` que exporte un `GameDef`. Para un juego de varios a la vez o por turnos: exportar un `VersusDef` (ver `src/versus.tsx`). En ambos casos, agregarlo a `GAMES` en `src/match.ts`.
- Juegos versus: el anfitrión guarda el estado y aplica las jugadas (`act`/`tick`); los demás celus mandan jugadas y reciben el estado.
- Pruebas locales del modo online: levantar un servidor PeerJS local y abrir `?peer=127.0.0.1:9000`. Con `?autotest` cada juego termina solo con un puntaje al azar.
- Cada push a `main` publica en GitHub Pages (rama `gh-pages`).
