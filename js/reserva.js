/* ------------------------------------------------------------------
   Casa da Corga · reserva.js
   Motor de reservas SIMULADO (se reserva la casa entera). Las noches
   ocupadas son de ejemplo y salen siempre iguales para cada año; no hay
   servidor: no se envía, no se guarda y no se cobra nada.
   Al conectar un motor real solo cambian `ocupada()` y `solicitar()`.
   Supuestos (marcados en la página): temporada alta en Semana Santa,
   1 jul – 15 sep y 22 dic – 6 ene; mínimo de noches de config.js.
   ------------------------------------------------------------------ */
(function () {
  'use strict';
  const raiz = document.getElementById('motor');
  if (!raiz) return;
  const C = window.CORGA_CONFIG || {};
  const PRECIO = C.precio || { baja: 180, alta: 240 };
  const MIN = C.minNoches || 2, PLAZAS = C.plazas || 8, MESES = 12;

  /* ---------- fechas como claves 'aaaa-mm-dd' ---------- */
  const dos = n => String(n).padStart(2, '0');
  const clave = d => `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`;
  const fecha = k => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
  const suma = (k, n) => { const d = fecha(k); d.setDate(d.getDate() + n); return clave(d); };
  const noches = (a, b) => Math.round((fecha(b) - fecha(a)) / 864e5);
  const HOY = clave(new Date());
  const fLarga = new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
  const fCorta = new Intl.DateTimeFormat('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
  const fMes = new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' });
  const eur = n => new Intl.NumberFormat('es-ES').format(n) + ' €';

  function pascua(y) {   // domingo de Pascua (algoritmo de Meeus)
    const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
    return clave(new Date(y, Math.floor((h + l - 7 * m + 114) / 31) - 1, ((h + l - 7 * m + 114) % 31) + 1));
  }
  const alta = new Map();
  function esAlta(k) {
    if (alta.has(k)) return alta.get(k);
    const y = +k.slice(0, 4), md = k.slice(5), p = pascua(y);
    const v = (k >= suma(p, -4) && k <= p) || (md >= '07-01' && md <= '09-15') || md >= '12-22' || md <= '01-06';
    alta.set(k, v);
    return v;
  }

  /* ---------- noches ocupadas de ejemplo (deterministas por año) ---------- */
  function azar(s) { return () => { s = (s + 0x6d2b79f5) >>> 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const ocupadas = new Set();
  {
    const y0 = +HOY.slice(0, 4);
    for (const y of [y0, y0 + 1]) {
      const r = azar(y * 2654435761);
      const tomar = (k, n) => { for (let i = 0; i < n; i++) ocupadas.add(suma(k, i)); };
      for (let k = `${y}-01-01`; k <= `${y}-12-31`; k = suma(k, 1)) {
        const dia = fecha(k).getDay();
        if (dia === 5 && r() < .45) tomar(k, 2);                       // fines de semana
        if (dia === 1 && !esAlta(k) && r() < .08) tomar(k, 3);          // alguna escapada entre semana
      }
      tomar(suma(pascua(y), -3), 4);                                    // Semana Santa
      let k = `${y}-07-03`;                                             // verano casi lleno
      while (k < `${y}-09-10`) { const n = 4 + Math.floor(r() * 5); tomar(k, n); k = suma(k, n + (r() < .35 ? 2 + Math.floor(r() * 3) : 0)); }
      tomar(`${y}-10-10`, 3); tomar(`${y}-12-05`, 4); tomar(`${y}-12-30`, 4);   // puentes y fin de año
    }
  }
  const ocupada = k => ocupadas.has(k);
  const libreTramo = (a, b) => { for (let k = a; k < b; k = suma(k, 1)) if (ocupada(k)) return false; return true; };

  /* ---------- estado ---------- */
  let mes = new Date(); mes.setDate(1);
  const mes0 = new Date(mes), mesTope = new Date(mes); mesTope.setMonth(mesTope.getMonth() + MESES - 1);
  let entrada = null, salida = null, foco = null;
  const cal = document.getElementById('motor-cal'), resumen = document.getElementById('motor-resumen');
  const pedir = document.getElementById('motor-pedir'), hecho = document.getElementById('motor-hecho');
  const personas = document.getElementById('motor-personas');
  for (let i = 1; i <= PLAZAS; i++) personas.add(new Option(i + (i === 1 ? ' persona' : ' personas'), i, false, i === 4));

  const verDos = () => matchMedia('(min-width: 1100px)').matches;

  function pintar() {
    const nMeses = verDos() ? 2 : 1;
    const bloques = [];
    for (let m = 0; m < nMeses; m++) {
      const d = new Date(mes); d.setMonth(d.getMonth() + m);
      bloques.push(mesHTML(d, m === 0, m === nMeses - 1));
    }
    cal.innerHTML = `<div class="cal-meses" style="display:grid;grid-template-columns:repeat(${nMeses},minmax(0,1fr));gap:1.2rem">${bloques.join('')}</div>
      <p class="cal-leyenda"><span>Tachado: ocupado (ejemplo)</span><span>Punto: temporada alta (supuesta)</span></p>`;
    cal.querySelector('[data-mes="-1"]')?.addEventListener('click', () => mover(-1));
    cal.querySelector('[data-mes="1"]')?.addEventListener('click', () => mover(1));
    const enfocable = cal.querySelector(`[data-k="${foco}"]:not(:disabled)`) || cal.querySelector('.cal-dia.es-entrada') || cal.querySelector('.cal-dia:not(:disabled)');
    if (enfocable) enfocable.tabIndex = 0;
  }
  function mesHTML(d, primero, ultimo) {
    const y = d.getFullYear(), m = d.getMonth();
    const hueco = (new Date(y, m, 1).getDay() + 6) % 7, dias = new Date(y, m + 1, 0).getDate();
    let h = `<div class="cal-mes"><div class="cal-cabeza">
      ${primero ? `<button class="cal-nav" type="button" data-mes="-1" aria-label="Mes anterior" ${mes <= mes0 ? 'disabled' : ''}>‹</button>` : '<span></span>'}
      <p>${fMes.format(d)}</p>
      ${ultimo ? `<button class="cal-nav" type="button" data-mes="1" aria-label="Mes siguiente" ${d >= mesTope ? 'disabled' : ''}>›</button>` : '<span></span>'}
    </div><div class="cal-rejilla" role="grid" aria-label="${fMes.format(d)}">`;
    for (const s of ['lu', 'ma', 'mi', 'ju', 'vi', 'sá', 'do']) h += `<span class="cal-sem" aria-hidden="true">${s}</span>`;
    for (let i = 0; i < hueco; i++) h += '<span class="cal-vacio"></span>';
    for (let di = 1; di <= dias; di++) {
      const k = `${y}-${dos(m + 1)}-${dos(di)}`;
      const pasado = k < HOY, oc = ocupada(k);
      // como salida vale un día ocupado (esa noche ya no es vuestra)
      const vale = !pasado && (!oc || (entrada && !salida && k > entrada && libreTramo(entrada, k)));
      const cls = ['cal-dia'];
      if (pasado) cls.push('es-pasado'); else if (oc) cls.push('es-ocupado');
      if (esAlta(k)) cls.push('es-alta');
      if (k === entrada) cls.push('es-entrada');
      if (k === salida) cls.push('es-salida');
      if (entrada && salida && k > entrada && k < salida) cls.push('es-tramo');
      const etiqueta = `${fLarga.format(fecha(k))}${pasado ? ', pasado' : oc ? ', ocupado' : ', libre'}${esAlta(k) ? ', temporada alta' : ''}${k === entrada ? ', llegada' : ''}${k === salida ? ', salida' : ''}`;
      h += `<button type="button" class="${cls.join(' ')}" data-k="${k}" tabindex="-1" aria-label="${etiqueta}" aria-pressed="${k === entrada || k === salida}" ${vale ? '' : 'disabled'}>${di}</button>`;
    }
    return h + '</div></div>';
  }
  function mover(n) {
    const d = new Date(mes); d.setMonth(d.getMonth() + n);
    if (d < mes0 || d > mesTope) return;
    mes = d; pintar();
  }

  function elegir(k) {
    hecho.hidden = true;
    if (!entrada || salida || k <= entrada) { entrada = ocupada(k) ? null : k; salida = null; }
    else if (noches(entrada, k) < MIN) { aviso(`La casa se reserva desde ${MIN} noches: elige la salida a partir del ${fLarga.format(fecha(suma(entrada, MIN)))}.`); return; }
    else if (!libreTramo(entrada, k)) { entrada = ocupada(k) ? null : k; salida = null; }
    else salida = k;
    foco = k;
    pintar(); contar();
    cal.querySelector(`[data-k="${k}"]`)?.focus();
  }
  function aviso(t) { resumen.innerHTML = `<p>${t}</p>`; }
  function contar() {
    pedir.disabled = !(entrada && salida);
    if (!entrada) { aviso('Elige el día de llegada.'); return; }
    if (!salida) { aviso(`Llegada el ${fLarga.format(fecha(entrada))}. Ahora, el día de salida.`); return; }
    let total = 0, nAlta = 0;
    for (let k = entrada; k < salida; k = suma(k, 1)) { const a = esAlta(k); total += a ? PRECIO.alta : PRECIO.baja; if (a) nAlta++; }
    const n = noches(entrada, salida), nBaja = n - nAlta;
    const lineas = [];
    if (nBaja) lineas.push(`<p>${nBaja} ${nBaja === 1 ? 'noche' : 'noches'} × ${eur(PRECIO.baja)}</p>`);
    if (nAlta) lineas.push(`<p>${nAlta} ${nAlta === 1 ? 'noche' : 'noches'} de temporada alta × ${eur(PRECIO.alta)}</p>`);
    resumen.innerHTML = `<p>${fCorta.format(fecha(entrada))} → ${fCorta.format(fecha(salida))} · ${n} noches · la casa entera</p>${lineas.join('')}
      <p class="motor-total"><span>Total</span><span class="precio-ficticio">${eur(total)}</span></p>`;
  }

  cal.addEventListener('click', e => { const b = e.target.closest('.cal-dia'); if (b && !b.disabled) elegir(b.dataset.k); });
  cal.addEventListener('keydown', e => {
    const b = e.target.closest('.cal-dia'); if (!b) return;
    const pasos = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
    if (!pasos) return;
    e.preventDefault();
    let k = b.dataset.k;
    for (let i = 0; i < 60; i++) {
      k = suma(k, pasos);
      const otro = cal.querySelector(`[data-k="${k}"]`);
      if (!otro) {   // cambia de mes
        const d = fecha(k);
        if (d < mes0 || d > new Date(mesTope.getFullYear(), mesTope.getMonth() + 1, 0)) return;
        mes = new Date(d.getFullYear(), d.getMonth() - (pasos > 0 && verDos() ? 1 : 0), 1);
        if (mes < mes0) mes = new Date(mes0);
        foco = k; pintar();
        const n = cal.querySelector(`[data-k="${k}"]`);
        if (n && !n.disabled) { n.tabIndex = 0; n.focus(); return; }
        continue;
      }
      if (!otro.disabled) { b.tabIndex = -1; otro.tabIndex = 0; otro.focus(); foco = k; return; }
    }
  });
  pedir.addEventListener('click', () => {
    if (!entrada || !salida) return;
    hecho.hidden = false;
    hecho.textContent = `Simulación: así le llegaría a la casa vuestra solicitud para ${personas.value} ${+personas.value === 1 ? 'persona' : 'personas'}, del ${fLarga.format(fecha(entrada))} al ${fLarga.format(fecha(salida))}. No se ha enviado nada.`;
  });
  let dosAntes = verDos();
  addEventListener('resize', () => { if (verDos() !== dosAntes) { dosAntes = verDos(); pintar(); } });

  window.CORGA = window.CORGA || {};
  window.CORGA.reserva = { ocupada, esAlta };
  pintar(); contar();
})();
