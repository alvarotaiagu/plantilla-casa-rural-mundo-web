/* ------------------------------------------------------------------
   La luz según la altura del sol: colores del cielo, de la niebla y de
   las luces. La comparten la escena 3D y el plan B 2D, así que los dos
   cuentan la misma hora con los mismos colores. Sin Three.js.
   ------------------------------------------------------------------ */
const hex = h => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255];

// alt: altura del sol (°). cen/hor: cielo arriba y en el horizonte; brillo: halo alrededor del sol;
// sol: color de la luz directa; i: su intensidad; hc/hs/hi: luz de cielo, del suelo y su intensidad;
// noche: estrellas y ventanas (0–1); exp: exposición.
const TABLA = [
  { alt: -18, cen: '#03060e', hor: '#0b1427', brillo: '#0b1427', sol: '#8ea4d6', i: 0, hc: '#2a3c66', hs: '#07080b', hi: .55, noche: 1, exp: 1.05 },
  { alt: -9, cen: '#0b1430', hor: '#283456', brillo: '#7d4a63', sol: '#8ea4d6', i: 0, hc: '#3b4a7a', hs: '#0c0d12', hi: .6, noche: .85, exp: 1.0 },
  { alt: -3, cen: '#1e2e5a', hor: '#7a6280', brillo: '#e98a5c', sol: '#ff8f5e', i: .25, hc: '#6372a2', hs: '#1a1512', hi: .6, noche: .4, exp: .95 },
  { alt: 2, cen: '#3a5a90', hor: '#eaa679', brillo: '#ffb36a', sol: '#ffa463', i: 1.4, hc: '#91a7c9', hs: '#3a2e22', hi: .75, noche: .04, exp: .9 },
  { alt: 8, cen: '#4772ad', hor: '#ead5bc', brillo: '#ffd59f', sol: '#ffd19c', i: 2.3, hc: '#a9bfd9', hs: '#4a3f30', hi: .9, noche: 0, exp: .85 },
  { alt: 20, cen: '#3e6fb1', hor: '#d1e0ec', brillo: '#fff1d4', sol: '#fff0dd', i: 2.9, hc: '#b9cfe6', hs: '#56503f', hi: 1, noche: 0, exp: .8 },
  { alt: 50, cen: '#336bb6', hor: '#c8dbef', brillo: '#ffffff', sol: '#fffaf1', i: 3.2, hc: '#c2d6ec', hs: '#5c5644', hi: 1.05, noche: 0, exp: .78 },
].map(k => ({ ...k, cen: hex(k.cen), hor: hex(k.hor), brillo: hex(k.brillo), sol: hex(k.sol), hc: hex(k.hc), hs: hex(k.hs) }));

const mezcla = (a, b, f) => a.map((v, i) => v + (b[i] - v) * f);

/** Luz para una altura del sol (°). Devuelve colores RGB 0–1 (espacio sRGB) y números. */
export function luz(alt) {
  let i = 0;
  while (i < TABLA.length - 2 && alt > TABLA[i + 1].alt) i++;
  const a = TABLA[i], b = TABLA[i + 1];
  const f = Math.min(1, Math.max(0, (alt - a.alt) / (b.alt - a.alt)));
  const n = (x, y) => x + (y - x) * f;
  return {
    cen: mezcla(a.cen, b.cen, f), hor: mezcla(a.hor, b.hor, f), brillo: mezcla(a.brillo, b.brillo, f),
    sol: mezcla(a.sol, b.sol, f), i: n(a.i, b.i), hc: mezcla(a.hc, b.hc, f), hs: mezcla(a.hs, b.hs, f),
    hi: n(a.hi, b.hi), noche: n(a.noche, b.noche), exp: n(a.exp, b.exp),
  };
}

export const css = c => `rgb(${c.map(v => Math.round(Math.min(1, Math.max(0, v)) * 255)).join(' ')})`;
