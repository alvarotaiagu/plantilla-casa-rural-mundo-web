/* ------------------------------------------------------------------
   Plan B 2D: el mismo hueco que el 3D, dibujado. Es el horizonte REAL
   que se ve desde el patio de la casa hacia el sur (calculado del MDT05
   en scripts/terreno.py, en tres distancias), con el cielo, el sol y la
   luna de la misma hora y los mismos colores que el 3D (luz.js).
   Sirve de póster mientras carga el 3D y se queda si no hay 3D.
   Con el plan B, «La casa» enseña la fachada que se construye en 2D.
   ------------------------------------------------------------------ */
import { luz, css } from './luz.js';
import { sol, luna, instante, minutoDe, diaDe, ESTACION_HOY } from './sol.js';
import { modelo, fachadaSVG } from './casa-modelo.js';

const AZ0 = 100, AZ1 = 260, ANCHO = 1600, HOR = 540, PXG = 16;
const xAz = az => (az - AZ0) / (AZ1 - AZ0) * ANCHO;
const yAng = a => HOR - a * PXG;
const TIERRA = { primavera: [.36, .48, .25], verano: [.34, .42, .22], otono: [.52, .41, .2], invierno: [.42, .38, .32] };
const mezcla = (a, b, f) => a.map((v, i) => v + (b[i] - v) * f);
const suave = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

export function iniciarPlanB({ version }) {
  const caja = document.getElementById('plan-b');
  const raiz = document.documentElement;
  const reducido = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ini = (window.CORGA && window.CORGA.estado) || {};
  let s = ini.s || 0, estacion = ini.estacion || ESTACION_HOY, listo = false, solEl, lunaEl, brilloEl;

  fetch('img/terreno/horizonte.json?v=' + version).then(r => r.json()).then(({ horizonte: H }) => {
    const cresta = fila => {
      const p = H.acimut.map((az, i) => `${xAz(az).toFixed(1)},${yAng(fila[i]).toFixed(1)}`);
      return `M-20,${yAng(fila[0]).toFixed(1)} L${p.join(' L')} L${ANCHO + 20},${yAng(fila[fila.length - 1]).toFixed(1)} L${ANCHO + 20},950 L-20,950 Z`;
    };
    let estrellas = '', semilla = 7;
    const r = () => (semilla = (semilla * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 90; i++) estrellas += `<circle cx="${(r() * ANCHO).toFixed(0)}" cy="${(r() * 380).toFixed(0)}" r="${(.8 + r() * 1.6).toFixed(1)}"/>`;
    let filas = '';
    for (let i = 0; i < 9; i++) { const y = 790 + i * 20 + i * i * 1.6; filas += `<path d="M-20 ${y + 30} Q ${ANCHO * .35} ${y - 18} ${ANCHO + 20} ${y + 6}"/>`; }
    caja.innerHTML = `<svg viewBox="0 0 ${ANCHO} 900" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="pb-cielo" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--pb-cen)"/><stop offset=".62" style="stop-color:var(--pb-hor)"/></linearGradient>
        <radialGradient id="pb-brillo"><stop offset="0" style="stop-color:var(--pb-brillo);stop-opacity:.75"/><stop offset="1" style="stop-color:var(--pb-brillo);stop-opacity:0"/></radialGradient>
      </defs>
      <rect width="${ANCHO}" height="900" fill="url(#pb-cielo)"/>
      <g class="pb-estrellas" fill="#e8eeff">${estrellas}</g>
      <circle class="pb-brillo" r="260" fill="url(#pb-brillo)"/>
      <circle class="pb-sol" r="22" fill="#fff4dc"/>
      <circle class="pb-luna" r="15" fill="#eef0ea"/>
      <path d="${cresta(H.bandas[2])}" style="fill:var(--pb-lejos)"/>
      <path d="${cresta(H.bandas[1])}" style="fill:var(--pb-medio)"/>
      <path d="${cresta(H.bandas[0])}" style="fill:var(--pb-cerca)"/>
      <g class="pb-filas" fill="none" style="stroke:var(--pb-filas)" stroke-width="3">${filas}</g>
    </svg>`;
    solEl = caja.querySelector('.pb-sol'); lunaEl = caja.querySelector('.pb-luna'); brilloEl = caja.querySelector('.pb-brillo');
    listo = true;
    pintar();
  }).catch(() => { /* sin horizonte: queda el degradado del CSS */ });

  function pintar() {
    // se pinta hasta que el 3D enseña su primer fotograma (no basta con que haya cargado)
    if (!listo || caja.parentElement.classList.contains('con-3d')) return;
    const dia = diaDe(estacion), m = minutoDe(s, dia), f = instante(dia, m), so = sol(f), lu = luna(f), L = luz(so.alt);
    const base = TIERRA[estacion], k = Math.min(1, .16 + L.i / 3.2 * .84);
    const tierra = mezcla(base.map(v => v * k), L.hs, .25);
    const st = caja.style;
    st.setProperty('--pb-cen', css(L.cen)); st.setProperty('--pb-hor', css(L.hor)); st.setProperty('--pb-brillo', css(L.brillo));
    st.setProperty('--pb-lejos', css(mezcla(tierra, L.hor, .6)));
    st.setProperty('--pb-medio', css(mezcla(tierra, L.hor, .3)));
    st.setProperty('--pb-cerca', css(tierra.map(v => v * .78)));
    st.setProperty('--pb-filas', css(tierra.map(v => v * .58)));
    caja.querySelector('.pb-estrellas').style.opacity = L.noche;
    const xs = xAz(so.az), ys = yAng(so.alt);
    solEl.setAttribute('cx', xs.toFixed(1)); solEl.setAttribute('cy', ys.toFixed(1));
    brilloEl.setAttribute('cx', xs.toFixed(1)); brilloEl.setAttribute('cy', ys.toFixed(1));
    solEl.style.opacity = so.alt > -1 ? 1 : 0;
    brilloEl.style.opacity = Math.min(1, Math.max(0, (so.alt + 8) / 10));
    lunaEl.setAttribute('cx', xAz(lu.az).toFixed(1)); lunaEl.setAttribute('cy', yAng(lu.alt).toFixed(1));
    lunaEl.style.opacity = lu.alt > 0 ? Math.min(1, L.noche * 1.3) * (.35 + .65 * lu.fraccion) : 0;
    pintarFachada();
  }

  // ---------- la fachada que se construye (solo con el plan B) ----------
  let tandas = null;
  function pintarFachada() {
    if (!raiz.classList.contains('sin-3d')) return;
    if (!tandas) {
      const hueco = document.querySelector('[data-fachada]');
      if (!hueco) return;
      hueco.innerHTML = fachadaSVG(modelo());
      hueco.hidden = false;
      tandas = [...hueco.querySelectorAll('.fachada-tanda')].map(g => [g, +g.dataset.t]);
    }
    const obra = reducido || raiz.classList.contains('sobria') ? 1 : suave(1.06, 1.94, s);
    for (const [g, t] of tandas) g.classList.toggle('puesta', t <= obra + .001);
    document.querySelector('[data-fachada]').style.setProperty('--trazo', obra < .05 ? 1 : 0);
  }

  addEventListener('corga:recorrido', e => { s = e.detail.s; pintar(); });
  addEventListener('corga:estacion', e => { estacion = e.detail.estacion; pintar(); });
  addEventListener('corga:sin-3d', () => pintar());
  addEventListener('corga:densidad', () => pintar());
  return { pintar };
}
