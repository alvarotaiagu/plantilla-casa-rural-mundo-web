# Casa da Corga · plantilla «Cámara sobre raíl»

> **Sitio de demostración.** «Casa da Corga» es una casa rural **ficticia**: los datos
> (teléfono, email, dirección, precios), la historia y las fotografías de las estancias son de
> muestra y la web los marca como tales. `noindex` en todas las páginas. El relieve y la
> ortofoto son reales (IGN, CC BY 4.0); la casa que se levanta encima no existe.

Web estática (HTML + CSS + JS, sin build). Se abre sirviendo la carpeta con cualquier servidor
local (los módulos y `fetch` no van con `file://`).

## El concepto: «Cámara sobre raíl»

Una sola escena Three.js y una cámara que va sobre un raíl (`CatmullRomCurve3`). El scroll no
cambia de sección: **mueve la cámara**. Se entra volando por el cañón del Sil al amanecer, se
sube por los bancales hasta la casa, la casa se levanta piedra a piedra mientras la rodeas, se
sube a ver el valle por la tarde, se baja al patio para la puesta y se reserva de noche, con las
ventanas encendidas. El sol y la luna están donde estarían **ese día** en ese bancal; la hora
la pone el scroll (amanecer arriba, noche al final, con las horas reales de salida y puesta).

Por qué: una casa rural vende un sitio y un día en ese sitio. El recorrido es exactamente eso,
y es verdad: el relieve, la ortofoto, el sol y las distancias son reales.

## Las paradas

| s | Parada | Qué hace el mundo | Contenido |
|---|---|---|---|
| 0 | Salida (arriba) | Sobre el cañón, mirando río arriba, antes de amanecer | Nombre, entradilla |
| 0→1 | (vuelo) | Por el Sil entre paredes de 400 m, sube por los bancales | Dos rótulos |
| 1 | Llegada | En la pista de abajo; la casa es un dibujo a línea | «La pista se acaba donde empiezan las viñas.» |
| 1→2 | La casa | La rodea de suroeste a sureste mientras **se construye** | Historia (de ejemplo) y cifras |
| 3 | Estancias | Ante la puerta; una hoja de papel tapa el mundo (sin 3D) | Galería por estancias, fotos de ejemplo |
| 4 | Entorno | Sube 200 m y mira a la otra orilla | Estaciones (cambian el valle y el sol), distancias reales |
| 5 | Servicios | En el patio mirando al oeste, a la puesta | Ficha: cifras, servicios con icono, normas |
| 6 | Reservar | De noche, desde los bancales: la casa encendida | Simulador de reservas (demo) y contacto |
| — | Pie | Se queda de noche | «La luz del corredor se queda encendida.» |

`main.js` calcula `s` (0…6) con los marcadores `[data-parada]` (en las secciones fijadas,
`data-en` = fracción del recorrido de la sección) y lo emite como `corga:recorrido`. Mientras se
lee la hoja de estancias hay dos marcadores `3` seguidos: el mundo se queda quieto y no pinta.

## Ficheros

| Fichero | Qué es |
|---|---|
| `js/config.js` | **Todos los datos del negocio.** `ficticio: true` enciende las marcas «ficticio». |
| `js/main.js` | Página: Lenis + GSAP, `s`, cortina, menú, cookies, cursor, titulares, estancias, estaciones, mapa, exploración, mando. |
| `js/reserva.js` | Motor de reservas **simulado** (noches ocupadas de ejemplo, temporada supuesta). |
| `js/mundo/arranque.js` | Decide 3D o plan B, carga el 3D en diferido, rótulo de la hora. |
| `js/mundo/terreno.js` | **Carga del valle**, aislada: mallas grande y fina con la ortofoto, estación y agua en el sombreador. |
| `js/mundo/escena.js` | Renderizador, raíl, suavizado, hora, obra, exploración, calidad automática. |
| `js/mundo/cielo.js` | Cúpula, estrellas, luna con su fase, luz direccional con sombras, niebla. |
| `js/mundo/casa-modelo.js` | La casa pieza a pieza (sin Three.js): muros, huecos, corredor, tejado, chimenea, patio, emparrado. |
| `js/mundo/casa.js` | La casa en 3D (instanciada); la obra va en el sombreador. Dibujo a línea y luces de noche. |
| `js/mundo/entorno.js` | Árboles, cepas, muros de bancal y camino; colores por estación. |
| `js/mundo/planb.js` | Plan B 2D: horizonte real desde el patio + cielo; fachada 2D que se construye. |
| `js/mundo/sol.js`, `luz.js` | Sol y luna reales (SunCalc) y la tabla de luz por altura del sol (las comparten 3D y 2D). |
| `scripts/terreno.py` | Baja MDT05 y PNOA del IGN y genera todo `img/terreno/`. |
| `scripts/quitar-mando.mjs` | Quita el mando de maqueta (comprobado). |
| `verificar.mjs` | Pruebas (sin pintar el 3D). |

## Convertirla en la web de una casa real

1. **Datos** — `js/config.js`: nombre, lugar, dirección, teléfono, email, cifras, horarios,
   precios, mínimo de noches, `lat`/`lon` del solar y `ficticio: false` (quita las marcas). Añadir
   el número de registro de turismo al pie y al aviso legal (la demo no se inventa uno).
2. **El valle** — `scripts/terreno.py`, arriba del todo: la caja (`S, N, O, E`), el punto de la
   casa (`CASA`), el tramo de río del vuelo (`RIO_DESDE`, `RIO_HASTA`, `VUELO_DESDE_U`) y, si
   hace falta, las paradas del raíl (bloque «el raíl», en metros relativos a la casa). Luego
   `python -I scripts/terreno.py` y subir `VERSION` en `js/mundo/arranque.js`. Nada más del 3D
   cambia. Si la casa real ya sale en la ortofoto, **quitar el patio pintado** (bloque «ortofoto
   fina con el patio pintado») y dejar su tejado real debajo, o mejor: sustituir el modelo.
3. **La casa** — `js/mundo/casa-modelo.js`: medidas (`MEDIDAS`), huecos de cada cara
   (`caras[].huecos`, en metros desde la esquina), materiales y colores (`LOUSA`, `GRANITO`,
   `PIZARRA`). Hacerlo con fotos frontales de cada fachada y sus medidas: es la pieza que más
   vende («su casa, no una casa»). La fachada 2D del plan B sale sola del mismo modelo.
4. **Textos** — `index.html`: historia (quitar «historia de ejemplo»), estancias (nombres,
   camas, textos), servicios, normas, rótulos del vuelo y frase de llegada. Las distancias de
   «El entorno»: rehacerlas con OSRM desde el solar real (ver `CREDITOS.md`).
5. **Fotos** — `img/estancias/<estancia>-800|1600.(jpg|webp)`, 3:2. Quitar «Foto de ejemplo»
   de cada `figcaption` y el aviso de la cabecera de estancias. Medir la nitidez antes.
6. **Reservas** — `js/reserva.js`: sustituir `ocupada()` por la disponibilidad real y
   `solicitar` (el clic de `#motor-pedir`) por el envío al motor; quitar el sello «Demostración»
   y los supuestos.
7. **Legal** — reescribir `aviso-legal.html`, `privacidad.html` y `cookies.html` con el titular.
8. **Mando** — `node scripts/quitar-mando.mjs --aplicar`.
9. **noindex** — quitarlo solo cuando sea la web oficial del negocio.

### Quitar el mando de maqueta

El mando (versión «Recorrido» / «Sobria» y color «Mencía» / «Castaño» / «Sil») solo se enseña con
`?revision` y **no viaja al cliente**. Vive entre marcas `MANDO DE MAQUETA` y `/MANDO DE
MAQUETA` en `index.html`, `css/estilo.css` y `js/main.js`.

```
node scripts/quitar-mando.mjs            # copia limpia en pruebas/sin-mando/ y comprobación
node scripts/quitar-mando.mjs --aplicar  # lo quita de verdad
```

El script falla si queda rastro (`data-densidad`, `corga-paleta`, `#diario`…). Después, borrar
del aviso de cookies y de privacidad las claves `corga-densidad` y `corga-paleta`.

- **Recorrido**: la casa se levanta con el scroll, dibujo a línea antes, rótulos del vuelo en
  serifa, velos ligeros.
- **Sobria**: la casa ya está hecha (el 3D y la fachada 2D salen completos), velos más densos,
  rótulos del vuelo en mono, y **añade** una tira de datos fija («Parada 2 de 6 · La casa» y
  las horas reales de salida y puesta del sol ese día).
- **Paletas**: el acento rota de matiz (14°, 52°, 232° en OKLCH) con la misma luz y croma. El
  resto de la paleta y el logo no cambian. Contraste medido por script: acento de texto sobre
  papel 7,2 / 7,0 / 6,2; texto claro sobre acento 7,2 / 7,0 / 6,1.

## Lo que pide el PLIEGO (plantillas-negocios-web)

- **Recursos de movimiento (§2)**: Lenis, titulares letra a letra, WebGL propio del concepto
  (el raíl), cursor propio, máscaras de imagen que se abren (estancias), y la obra de la casa.
- **Quitados del kit común (§5 bis)**: pila sticky, marquesina y botones magnéticos.
- **Pieza propia**: la cámara sobre raíl con la casa que se construye en el mundo real.
- **Gesto táctil del «hero»**: «Explorar el valle» (tras botón: girar y acercar con el dedo
  alrededor de donde estás; el scroll normal sigue funcionando). En escritorio, además, el
  ratón mueve un poco la mirada.
- **El objeto se completa al final**: la casa terminada, de noche, con las ventanas encendidas.
- **Foco con la forma del motivo**: el anillo tiene una esquina de losa de pizarra
  (`border-radius: 3px 3px 3px 12px`); dorado sobre oscuro (10,8:1) y acento sobre papel (≥6,2:1).
- **Menú §5 bis**: «dato real en vivo» — el sol y la luna de hoy en ese bancal; si se elige otra
  estación, el de un día típico de esa estación (se dice en el rótulo).
- **Cortina**: el Sil se dibuja desde los datos reales, la casa aparece al final del río, el
  nombre sube y el panel se levanta con borde curvo (`expo.inOut`). Retirada garantizada: sin
  GSAP, con movimiento reducido (`display:none`), al primer gesto se acelera, red de 6,5 s en
  `main.js` y de 7 s en línea en el `<head>`. Una vez por sesión.

## Rendimiento

- Nada del 3D se pide antes de `load`; luego, en tiempo libre. El plan B es el póster.
- Solo se pinta cuando algo cambia (cámara, estación, obra, exploración); quieto, cero
  fotogramas. Con la pestaña oculta, nada.
- Densidad de píxeles: tope 1,5 en móvil y 1,75 en escritorio. Sombras solo alrededor de la
  casa (1024 / 2048) y se rehacen al cambiar el minuto o durante la obra.
- **Calidad automática**: media de 45 fotogramas; por encima de 30 ms baja un escalón
  (densidad −0,25 → sin sombras → 55 % de árboles y cepas → densidad 0,75).
- Pesos: Three r160 ≈ 166 KB gzip; móvil: malla 384, ortofoto 2048 (419 KB) + parche fino
  (981 KB); escritorio: malla 576 y ortofoto 4096 (1,7 MB).
- **Sin medir todavía en un móvil real** (las pruebas no pintan WebGL): LCP, INP y la calidad
  automática están por anotar.

## Accesibilidad y movimiento reducido

- Con `prefers-reduced-motion`: plan B 2D (sin 3D), sin cortina, sin Lenis; el contenido es el
  mismo (el cielo y el sol siguen cambiando con el recorrido, la fachada sale entera).
- `gsapReady` sincroniza contenido; `motion` solo anima. Sin GSAP, la página se lee entera.
- El calendario se maneja con flechas (un solo día enfocable), etiquetas completas por día.

## Pruebas

`node verificar.mjs` (puerto 8893). Un navegador, `--disable-3d-apis` (el 3D no se pinta: se
comprueba el contenedor y el plan B), escala 1, movimiento reducido, sin capturas. El 3D se mira
en un Chrome con tarjeta gráfica.

## Datos y créditos

Ver `CREDITOS.md`. `pruebas/` (descargas del IGN, fotos originales) no se sube.
