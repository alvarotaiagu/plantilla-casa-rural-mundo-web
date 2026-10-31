/* ------------------------------------------------------------------
   La casa, pieza a pieza. Sin Three.js: genera la lista de piezas
   (piedras, losas de pizarra, maderas, cristales) con una semilla, para
   que el 3D la levante y el plan B dibuje la fachada sur con lo mismo.

   Casa de labranza de la Ribeira Sacra: dos plantas de mampostería de
   lousa (esquisto pardo) con esquineras, jambas y dinteles de granito,
   corredor de madera al sur bajo el alero, tejado de pizarra a dos aguas,
   chimenea de piedra, emparrado delante y muro de piedra seca alrededor.
   Medidas reales de una casa así (12 × 8 m, alero a 5,8 m, 30°).

   Coordenadas: metros, origen en el centro del solar a la cota del
   patio; x al este, y arriba, z al sur. Cada pieza: {k, p, s, r, c, t, cara}
     k  material (piedra, granito, pizarra, cobertura, madera, vidrio, puerta, vid)
     p  centro · s  tamaño · r [rx, ry] giro · c color · t cuándo se coloca (0–1)
   ------------------------------------------------------------------ */
function azar(semilla) {
  let s = semilla >>> 0;
  return () => { s = (s + 0x6d2b79f5) >>> 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const T30 = Math.tan(Math.PI / 6);

export const MEDIDAS = {
  x0: -6, x1: 6, zN: -6, zS: 2,          // planta 12 × 8
  alero: 5.8, cumbre: 5.8 + 4 * T30, cumbreZ: -2,
  muro: .58,
  aleroSur: 3.3, aleroNorte: -6.5, vuelo: .4,
  patio: { x0: -13, x1: 13, z0: -7, z1: 11 },
  portal: [-6.2, -3.4],                  // hueco del muro del patio (al suroeste, por donde llega el camino)
};

const LOUSA = [0x7a7064, 0x6b665e, 0x857a6b, 0x5e5953, 0x8f8473, 0x70624f, 0x655b4e, 0x7f776c];
const GRANITO = [0xa9a395, 0xb2ab9c, 0x9f998b, 0xb9b2a2];
const PIZARRA = [0x3a3f47, 0x444a52, 0x33373e, 0x4b4f57, 0x3f444b];
const MADERA = 0x6a4a33, MADERA_OSC = 0x4d3424;

export function modelo(semilla = 1887) {
  const r = azar(semilla);
  const M = MEDIDAS, piezas = [], luces = [];
  const de = a => a[Math.floor(r() * a.length)];
  const pon = (k, p, s, t, extra = {}) => piezas.push({ k, p, s, r: extra.r || [0, 0], c: extra.c ?? null, t: Math.min(1, Math.max(0, t)), cara: extra.cara || null });

  // hiladas comunes a las cuatro caras (las esquineras se alternan por hilada)
  const hiladas = [];
  for (let y = 0; y < M.cumbre + .2;) { const h = .22 + r() * .12; hiladas.push({ y0: y, h }); y += h; }
  const tObra = y => .08 + .5 * (y / M.cumbre);

  // ---------- las cuatro caras ----------
  const gablete = u => M.alero + (4 - Math.abs(u - 4)) * T30;
  const caras = [
    { id: 'S', o: [M.x0, M.zS], d: [1, 0], n: [0, 1], L: 12, par: 0, techo: () => M.alero,
      huecos: [
        { u0: 2.0, u1: 3.1, y0: 0, y1: 2.2, tipo: 'puerta' },
        { u0: 4.7, u1: 5.6, y0: .95, y1: 2.05, tipo: 'ventana' },
        { u0: 8.1, u1: 9.0, y0: .95, y1: 2.05, tipo: 'ventana' },
        { u0: 2.3, u1: 3.2, y0: 3.05, y1: 5.15, tipo: 'balcon' },
        { u0: 5.6, u1: 6.5, y0: 3.05, y1: 5.15, tipo: 'balcon' },
        { u0: 8.7, u1: 9.5, y0: 3.6, y1: 4.9, tipo: 'ventana' },
      ] },
    { id: 'N', o: [M.x1, M.zN], d: [-1, 0], n: [0, -1], L: 12, par: 0, techo: () => M.alero,
      huecos: [
        { u0: 3.0, u1: 3.7, y0: 3.6, y1: 4.5, tipo: 'ventana' },
        { u0: 7.6, u1: 8.3, y0: 3.6, y1: 4.5, tipo: 'ventana' },
        { u0: 5.1, u1: 5.7, y0: 1.2, y1: 1.9, tipo: 'ventana' },
      ] },
    { id: 'E', o: [M.x1, M.zS], d: [0, -1], n: [1, 0], L: 8, par: 1, techo: gablete,
      huecos: [
        { u0: 3.0, u1: 3.8, y0: 1.0, y1: 2.0, tipo: 'ventana' },
        { u0: 3.0, u1: 3.8, y0: 3.6, y1: 4.6, tipo: 'ventana' },
        { u0: 3.75, u1: 4.25, y0: 6.3, y1: 6.85, tipo: 'ventana' },
      ] },
    { id: 'O', o: [M.x0, M.zN], d: [0, 1], n: [-1, 0], L: 8, par: 1, techo: gablete,
      huecos: [
        { u0: 4.0, u1: 5.0, y0: 0, y1: 2.1, tipo: 'puerta' },
        { u0: 3.4, u1: 4.2, y0: 3.6, y1: 4.6, tipo: 'ventana' },
      ] },
  ];

  const enMundo = (c, u, hacia) => [c.o[0] + c.d[0] * u + c.n[0] * hacia, c.o[1] + c.d[1] * u + c.n[1] * hacia];
  const giro = c => Math.atan2(-c.d[1], c.d[0]);
  const ESQ = .75;   // largo de la esquinera

  // dintel y alféizar ajustados a las hiladas: así encajan sin huecos ni solapes
  const sobre = y => (hiladas.find(h => h.y0 >= y - 1e-6) || { y0: y }).y0;
  const bajo = y => { let b = 0; for (const h of hiladas) if (h.y0 + h.h <= y + 1e-6) b = h.y0 + h.h; return b; };
  for (const c of caras) for (const h of c.huecos) {
    h.ya = h.tipo === 'puerta' ? 0 : bajo(h.y0 - (h.tipo === 'ventana' ? .1 : 0));
    h.yb = sobre(h.y1 + .2);
  }

  for (const c of caras) {
    const ry = giro(c);
    hiladas.forEach((hi, n) => {
      const yc = hi.y0 + hi.h / 2;
      // ¿quién se queda la esquina en esta hilada?
      const propia = (n + c.par) % 2 === 0;
      let ini = propia ? 0 : M.muro, fin = propia ? c.L : c.L - M.muro;
      // tramos libres: quitar los huecos (con sus jambas, alféizar y dintel)
      let libres = [[ini, fin]];
      for (const h of c.huecos) {
        if (hi.y0 + hi.h <= h.ya + .01 || hi.y0 >= h.yb - .01) continue;
        const a = h.u0 - .2, b = h.u1 + .2;
        libres = libres.flatMap(([x, y]) => (b <= x || a >= y) ? [[x, y]] : [[x, Math.max(x, a)], [Math.min(y, b), y]].filter(([p, q]) => q - p > .05));
      }
      for (const [a, b] of libres) {
        let u = a;
        while (u < b - .05) {
          const alFinal = propia && b === c.L;
          let largo;
          if (propia && u < .001) largo = ESQ;                                   // esquinera del principio
          else if (alFinal && u >= c.L - ESQ - 1e-6) largo = c.L - u;            // esquinera del final
          else {
            largo = .3 + r() * .5;
            if (alFinal && u + largo > c.L - ESQ - .2) largo = Math.max(.12, c.L - ESQ - u);
            if (b - (u + largo) < .2) largo = b - u;
          }
          const fin2 = u + largo;
          const esEsq = propia && (u < .01 || fin2 > c.L - .01);
          // techo del gablete
          const tope = Math.min(c.techo(u), c.techo(fin2)) - .02;
          if (hi.y0 >= tope - .07) { u = fin2; continue; }
          const alto = Math.min(hi.h, tope - hi.y0);
          const hondo = M.muro - .03 + r() * .05;
          const [x, z] = enMundo(c, u + largo / 2, -hondo / 2 + (r() - .5) * .03);
          pon(esEsq ? 'granito' : 'piedra', [x, hi.y0 + alto / 2, z], [Math.max(.05, largo - .035), Math.max(.05, alto - .03), hondo], tObra(yc) + r() * .03,
            { r: [0, ry + (r() - .5) * .02], c: esEsq ? de(GRANITO) : de(LOUSA), cara: c.id });
          u = fin2;
        }
      }
    });
    // huecos: jambas, dintel, alféizar, carpintería y contraventanas
    for (const h of c.huecos) {
      const w = h.u1 - h.u0, alto = h.y1 - h.y0, um = (h.u0 + h.u1) / 2, t = tObra(h.y1);
      for (const uj of [h.u0 - .1, h.u1 + .1]) {
        const [x, z] = enMundo(c, uj, -M.muro / 2);
        pon('granito', [x, h.y0 + alto / 2, z], [.2, alto, M.muro + .01], tObra(h.y0 + alto / 2) + .01, { r: [0, ry], c: de(GRANITO), cara: c.id });
      }
      { const [x, z] = enMundo(c, um, -M.muro / 2 + .015);
        pon('granito', [x, (h.y1 + h.yb) / 2, z], [w + .4, h.yb - h.y1 - .02, M.muro + .03], t + .01, { r: [0, ry], c: de(GRANITO), cara: c.id }); }
      if (h.ya < h.y0 - .02) {
        const [x, z] = enMundo(c, um, -M.muro / 2 + .06);
        pon('granito', [x, (h.ya + h.y0) / 2, z], [w + .4, h.y0 - h.ya - .02, M.muro + .12], tObra(h.y0), { r: [0, ry], c: de(GRANITO), cara: c.id });
      }
      const hondo = .3;
      if (h.tipo === 'puerta') {
        const [x, z] = enMundo(c, um, -hondo);
        pon('puerta', [x, h.y0 + alto / 2, z], [w - .04, alto - .02, .08], .9 + r() * .05, { r: [0, ry], c: MADERA_OSC, cara: c.id });
      } else {
        // cristal y marco
        const [x, z] = enMundo(c, um, -hondo);
        pon('vidrio', [x, h.y0 + alto / 2, z], [w - .06, alto - .06, .03], .92 + r() * .05, { r: [0, ry], cara: c.id });
        const [x2, z2] = enMundo(c, um, -hondo + .03);
        pon('madera', [x2, h.y0 + alto / 2, z2], [.05, alto - .04, .06], .93 + r() * .04, { r: [0, ry], c: MADERA, cara: c.id });
        pon('madera', [x2, h.y0 + alto * (h.tipo === 'balcon' ? .62 : .5), z2], [w - .04, .05, .06], .93 + r() * .04, { r: [0, ry], c: MADERA, cara: c.id });
        for (const [du, dy, sw, sh] of [[-w / 2 + .03, 0, .06, alto], [w / 2 - .03, 0, .06, alto], [0, -alto / 2 + .03, w, .06], [0, alto / 2 - .03, w, .06]]) {
          const [x3, z3] = enMundo(c, um + du, -hondo + .03);
          pon('madera', [x3, h.y0 + alto / 2 + dy, z3], [sw, sh, .07], .93 + r() * .04, { r: [0, ry], c: MADERA, cara: c.id });
        }
        // contraventanas abiertas contra el muro
        if (h.tipo === 'ventana') for (const lado of [-1, 1]) {
          const [x4, z4] = enMundo(c, um + lado * (w / 2 + .2 + w / 4), .03);
          pon('madera', [x4, h.y0 + alto / 2, z4], [w / 2 - .02, alto, .04], .95 + r() * .04, { r: [0, ry], c: MADERA, cara: c.id });
        }
        const [xl, zl] = enMundo(c, um, -hondo + .1);
        luces.push({ p: [xl, h.y0 + alto / 2, zl], w, h: alto, n: c.n, cara: c.id });
      }
    }
  }

  // ---------- corredor de madera al sur ----------
  const zc = M.zS + .575;
  pon('madera', [0, 3.0, zc], [9.2, .12, 1.15], tObra(3.0) + .05, { c: MADERA, cara: 'S' });
  for (const x of [-4.4, -2.2, 0, 2.2, 4.4]) pon('madera', [x, 2.86, M.zS + .55], [.16, .16, 1.3], tObra(2.8) + .04, { c: MADERA_OSC, cara: 'S' });
  const techoEn = z => M.cumbre - Math.abs(z - M.cumbreZ) * T30;
  for (const x of [-4.5, -1.5, 1.5, 4.5]) { const yt = techoEn(3.08) - .08; pon('madera', [x, 3.06 + (yt - 3.06) / 2, 3.08], [.14, yt - 3.06, .14], tObra(4.2) + .05, { c: MADERA, cara: 'S' }); }
  for (const y of [3.18, 3.96]) pon('madera', [0, y, 3.1], [9.2, .07, .09], tObra(3.6) + .07, { c: MADERA, cara: 'S' });
  for (let x = -4.5; x <= 4.5; x += .15) pon('madera', [x, 3.57, 3.1], [.035, .76, .035], tObra(3.5) + .06 + (x + 4.5) * .002, { c: MADERA, cara: 'S' });

  // ---------- tejado ----------
  const planos = [
    { id: 'sur', alero: [M.aleroSur, techoEn(M.aleroSur)], U: [0, .5, -Math.cos(Math.PI / 6)], N: [0, Math.cos(Math.PI / 6), .5], rx: Math.PI / 6, L: (M.aleroSur - M.cumbreZ) / Math.cos(Math.PI / 6) },
    { id: 'norte', alero: [M.aleroNorte, M.cumbre - (M.cumbreZ - M.aleroNorte) * T30], U: [0, .5, Math.cos(Math.PI / 6)], N: [0, Math.cos(Math.PI / 6), -.5], rx: -Math.PI / 6, L: (M.cumbreZ - M.aleroNorte) / Math.cos(Math.PI / 6) },
  ];
  const X0 = M.x0 - M.vuelo, X1 = M.x1 + M.vuelo, anchoT = X1 - X0;
  for (const pl of planos) {
    const [za, ya] = pl.alero;
    const mid = pl.L / 2;
    // tablazón bajo las losas
    pon('cobertura', [0, ya + pl.U[1] * mid - pl.N[1] * .02, za + pl.U[2] * mid - pl.N[2] * .02], [anchoT, .06, pl.L], .64, { r: [pl.rx, 0], cara: pl.id === 'sur' ? 'S' : null });
    const filas = Math.floor((pl.L - .33) / .165) + 1;
    for (let f = 0; f < filas; f++) {
      const d = f * .165 + .165, lev = .035 + (f % 2) * .012;
      const desf = (f % 2) * .2;
      for (let x = X0 - desf; x < X1 - .05; x += .405) {
        const a = Math.max(X0, x), b = Math.min(X1, x + .4);
        if (b - a < .08) continue;
        pon('pizarra', [(a + b) / 2, ya + pl.U[1] * d + pl.N[1] * lev, za + pl.U[2] * d + pl.N[2] * lev], [b - a - .012, .014, .33],
          .66 + .24 * (f / filas) + ((a - X0) / anchoT) * .012, { r: [pl.rx + (r() - .5) * .015, (r() - .5) * .03], c: de(PIZARRA), cara: pl.id === 'sur' ? 'S' : null });
      }
    }
    // tabla del alero
    pon('madera', [0, ya - .06, za], [anchoT, .18, .05], .9, { c: MADERA_OSC, cara: pl.id === 'sur' ? 'S' : null });
    // tablas de los gabletes
    for (const x of [X0 - .02, X1 + .02]) pon('madera', [x, ya + pl.U[1] * mid, za + pl.U[2] * mid], [.05, .22, pl.L], .91, { r: [pl.rx, 0], c: MADERA_OSC });
  }
  pon('pizarra', [0, M.cumbre + .1, M.cumbreZ], [anchoT + .1, .16, .4], .92, { c: 0x2f3339 });

  // ---------- chimenea ----------
  const CH = [3.6, -2.6];
  let y = techoEn(CH[1]) - .5, n = 0;
  const yTop = 9.35;
  pon('cobertura', [CH[0], (y + yTop) / 2, CH[1]], [.55, yTop - y, .55], .86, {});
  while (y < yTop) {
    const h = .2 + r() * .1, alto = Math.min(h, yTop - y), t = .86 + .07 * ((y - 7) / 2.3);
    if (n % 2 === 0) {
      for (const dz of [-.3, .3]) pon('piedra', [CH[0], y + alto / 2, CH[1] + dz], [.92, alto - .025, .3], t, { c: de(LOUSA) });
      for (const dx of [-.31, .31]) pon('piedra', [CH[0] + dx, y + alto / 2, CH[1]], [.3, alto - .025, .3], t, { c: de(LOUSA) });
    } else {
      for (const dx of [-.3, .3]) pon('piedra', [CH[0] + dx, y + alto / 2, CH[1]], [.3, alto - .025, .92], t, { c: de(LOUSA) });
      for (const dz of [-.31, .31]) pon('piedra', [CH[0], y + alto / 2, CH[1] + dz], [.3, alto - .025, .3], t, { c: de(LOUSA) });
    }
    y += alto; n++;
  }
  for (const [dx, dz] of [[-.32, -.32], [.32, -.32], [-.32, .32], [.32, .32]]) pon('granito', [CH[0] + dx, yTop + .08, CH[1] + dz], [.16, .16, .16], .95, { c: de(GRANITO) });
  pon('pizarra', [CH[0], yTop + .2, CH[1]], [1.15, .07, 1.15], .96, { c: 0x353a41 });

  // ---------- muro del patio (piedra seca) ----------
  const P = M.patio, H = 1.0;
  const tramos = [
    [[P.x0, P.z1], [M.portal[0], P.z1]], [[M.portal[1], P.z1], [P.x1, P.z1]],
    [[P.x1, P.z1 - .25], [P.x1, P.z0 + .25]], [[P.x0, P.z0 + .25], [P.x0, P.z1 - .25]],
    [[P.x1, P.z0], [P.x0, P.z0]],
  ];
  for (const [a, b] of tramos) {
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]), d = [(b[0] - a[0]) / L, (b[1] - a[1]) / L], ry = Math.atan2(-d[1], d[0]);
    let y0 = 0;
    while (y0 < H - .05) {
      const h = Math.min(.2 + r() * .12, H - y0);
      let u = 0;
      while (u < L - .05) {
        let l = .28 + r() * .45; if (L - u - l < .2) l = L - u;
        const cx = a[0] + d[0] * (u + l / 2), cz = a[1] + d[1] * (u + l / 2);
        pon('piedra', [cx + (r() - .5) * .03, y0 + h / 2, cz + (r() - .5) * .03], [l - .04, h - .035, .48 + r() * .06], .02 + .2 * (y0 / H) + r() * .04, { r: [0, ry + (r() - .5) * .05], c: de(LOUSA) });
        u += l;
      }
      y0 += h;
    }
    // albardilla: losas planas encima
    let u = 0;
    while (u < L - .05) {
      let l = .5 + r() * .5; if (L - u - l < .25) l = L - u;
      pon('granito', [a[0] + d[0] * (u + l / 2), H + .04, a[1] + d[1] * (u + l / 2)], [l - .03, .08, .6], .24 + r() * .04, { r: [0, ry + (r() - .5) * .04], c: de(GRANITO) });
      u += l;
    }
  }
  for (const x of [M.portal[0] - .15, M.portal[1] + .15]) pon('granito', [x, .75, P.z1], [.36, 1.5, .36], .26, { c: de(GRANITO) });

  // ---------- emparrado ----------
  const ZP = 8.6;
  for (const x of [-5.5, -1.8, 1.8, 5.5]) pon('granito', [x, 1.3, ZP], [.22, 2.6, .22], .6 + r() * .03, { c: de(GRANITO) });
  pon('madera', [0, 2.67, ZP], [11.6, .14, .14], .7, { c: MADERA });
  for (const x of [-5.5, -1.8, 1.8, 5.5]) pon('madera', [x, 2.78, 6.0], [.1, .1, 5.2], .72, { c: MADERA });
  for (let i = 0; i < 150; i++) {
    const x = -6 + r() * 12, z = 3.6 + r() * 5.4;
    pon('vid', [x, 2.86 + r() * .18, z], [.45 + r() * .4, .16 + r() * .1, .45 + r() * .4], .92 + r() * .08, { r: [0, r() * Math.PI] });
  }

  return { piezas, luces, hiladas: hiladas.length };
}

/* ---------- la fachada sur en 2D (plan B): mismas piezas, alzado ortogonal ----------
   Devuelve el marcado SVG; cada pieza lleva su `t` en un grupo, para que se construya
   con el scroll (o salga entera con movimiento reducido). */
export function fachadaSVG(m) {
  const M_ = MEDIDAS;
  const S = 100, X0 = -6.8, Y1 = 9.6;   // 1 m = 100 unidades; marco de -6,8 a 6,8 m y de 0 a 9,6 m
  const px = x => ((x - X0) * S).toFixed(1), py = y => ((Y1 - y) * S).toFixed(1);
  const hexc = c => '#' + (c ?? 0x888888).toString(16).padStart(6, '0');
  const COL = { vidrio: '#20262b', puerta: '#4d3424', cobertura: '#26292e' };
  const cubos = Array.from({ length: 24 }, () => []);
  for (const p of m.piezas) {
    let w = p.s[0], h = p.s[1], y = p.p[1];
    const lado = (p.cara === 'E' || p.cara === 'O') && p.p[2] + p.s[0] / 2 > M_.zS - .03;
    if (lado) w = p.s[2];
    else if (p.cara !== 'S' || p.k === 'vid') continue;
    if (p.r[0]) { h = p.s[2] * Math.sin(Math.abs(p.r[0])) + p.s[1]; }   // losa o tablazón inclinadas: su alto visto de frente
    const fill = COL[p.k] || hexc(p.c);
    const i = Math.min(23, Math.floor(p.t * 24));
    cubos[i].push(`<rect x="${px(p.p[0] - w / 2)}" y="${py(y + h / 2)}" width="${(w * S).toFixed(1)}" height="${(h * S).toFixed(1)}" fill="${fill}"/>`);
  }
  const fondo = `<rect x="${px(-6)}" y="${py(5.8)}" width="${12 * S}" height="${5.8 * S}" fill="#2a241f" class="fachada-fondo"/>`;
  const grupos = cubos.map((g, i) => `<g class="fachada-tanda" data-t="${(i / 24).toFixed(3)}">${g.join('')}</g>`).join('');
  const linea = `<g class="fachada-trazo" fill="none" stroke="currentColor" stroke-width="3">
    <path pathLength="1" d="M${px(-6)} ${py(0)} V${py(5.8)} H${px(6)} V${py(0)} Z M${px(-6.4)} ${py(5.6)} L${px(-6.4)} ${py(5.05)} H${px(6.4)} M${px(-6.4)} ${py(5.05)} L${px(-6.4)} ${py(8.11)} H${px(6.4)} V${py(5.05)} M${px(3.15)} ${py(8)} V${py(9.35)} H${px(4.05)} V${py(8)}"/>
  </g>`;
  return `<svg class="fachada-svg" viewBox="0 0 ${13.6 * S} ${Y1 * S}" role="img" aria-label="Alzado de la fachada sur de la casa, piedra a piedra">${linea}${fondo}${grupos}</svg>`;
}
