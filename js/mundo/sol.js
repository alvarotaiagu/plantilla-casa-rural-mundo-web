/* ------------------------------------------------------------------
   El sol y la luna de verdad (fórmulas de SunCalc, V. Agafonkin, BSD)
   para el solar de la casa, en hora de Madrid. Sin Three.js: lo usan
   la escena 3D, el plan B 2D y el rótulo de la hora.

   El día es el de HOY (o el de la estación que se elija en «El entorno»).
   La hora la pone el scroll: amanecer arriba, noche al final, con las
   horas reales de salida y puesta de ese día.
   ------------------------------------------------------------------ */
const C = window.CORGA_CONFIG || {};
export const LAT = C.lat ?? 42.38873, LON = C.lon ?? -7.53132;
const TZ = C.zonaHoraria || 'Europe/Madrid';
const rad = Math.PI / 180, e = rad * 23.4397;
const sin = Math.sin, cos = Math.cos, tan = Math.tan, asin = Math.asin, atan = Math.atan2, acos = Math.acos;

const dias = d => d.valueOf() / 864e5 - .5 + 2440588 - 2451545;
const ar = (l, b) => atan(sin(l) * cos(e) - tan(b) * sin(e), cos(l));
const dc = (l, b) => asin(sin(b) * cos(e) + cos(b) * sin(e) * sin(l));
const sideral = (d, lw) => rad * (280.16 + 360.9856235 * d) - lw;
const acimut = (H, phi, dec) => atan(sin(H), cos(H) * sin(phi) - tan(dec) * cos(phi));
const altura = (H, phi, dec) => asin(sin(phi) * sin(dec) + cos(phi) * cos(dec) * cos(H));
function solCoord(d) {
  const M = rad * (357.5291 + .98560028 * d);
  const L = M + rad * (1.9148 * sin(M) + .02 * sin(2 * M) + .0003 * sin(3 * M)) + rad * 102.9372 + Math.PI;
  return { dec: dc(L, 0), ra: ar(L, 0) };
}
function lunaCoord(d) {
  const L = rad * (218.316 + 13.176396 * d), M = rad * (134.963 + 13.064993 * d), F = rad * (93.272 + 13.22935 * d);
  const l = L + rad * 6.289 * sin(M), b = rad * 5.128 * sin(F);
  return { ra: ar(l, b), dec: dc(l, b), dist: 385001 - 20905 * cos(M) };
}

/** Sol: acimut desde el norte y altura, en grados */
export function sol(fecha) {
  const lw = rad * -LON, phi = rad * LAT, d = dias(fecha), c = solCoord(d), H = sideral(d, lw) - c.ra;
  return { az: (acimut(H, phi, c.dec) / rad + 180 + 360) % 360, alt: altura(H, phi, c.dec) / rad };
}

/** Luna: acimut, altura, parte iluminada (0–1) y ángulo del limbo iluminado */
export function luna(fecha) {
  const lw = rad * -LON, phi = rad * LAT, d = dias(fecha), c = lunaCoord(d), H = sideral(d, lw) - c.ra;
  const s = solCoord(d), sdist = 149598000;
  const fi = acos(sin(s.dec) * sin(c.dec) + cos(s.dec) * cos(c.dec) * cos(s.ra - c.ra));
  const inc = atan(sdist * sin(fi), c.dist - sdist * cos(fi));
  const ang = atan(cos(s.dec) * sin(s.ra - c.ra), sin(s.dec) * cos(c.dec) - cos(s.dec) * sin(c.dec) * cos(s.ra - c.ra));
  return {
    az: (acimut(H, phi, c.dec) / rad + 180 + 360) % 360, alt: altura(H, phi, c.dec) / rad,
    fraccion: (1 + cos(inc)) / 2, fase: .5 + .5 * inc * (ang < 0 ? -1 : 1) / Math.PI,
  };
}

/* ---------- hora de Madrid ---------- */
const fmt = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
const partes = d => Object.fromEntries(fmt.formatToParts(d).map(p => [p.type, p.value]));
const desfase = d => { const t = Math.floor(d.getTime() / 6e4) * 6e4, p = partes(new Date(t)); return Math.round((Date.UTC(+p.year, p.month - 1, +p.day, +p.hour, +p.minute) - t) / 6e4); };
/** Instante de un día (año, mes 1-12, día) a los m minutos, hora de Madrid */
export function instante(dia, m) {
  const b = Date.UTC(dia.y, dia.m - 1, dia.d, 0, m);
  return new Date(b - desfase(new Date(b)) * 6e4);
}
export const hhmm = m => { m = ((Math.round(m) % 1440) + 1440) % 1440; return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); };

const hoyP = partes(new Date());
export const HOY = { y: +hoyP.year, m: +hoyP.month, d: +hoyP.day };

/* ---------- estaciones ---------- */
export const ESTACIONES = {
  primavera: { nombre: 'Primavera', m: 4, d: 22 },
  verano: { nombre: 'Verano', m: 7, d: 20 },
  otono: { nombre: 'Otoño', m: 10, d: 25 },
  invierno: { nombre: 'Invierno', m: 1, d: 18 },
};
export function estacionDe(dia) {
  const k = dia.m * 100 + dia.d;
  return k >= 321 && k < 621 ? 'primavera' : k >= 621 && k < 923 ? 'verano' : k >= 923 && k < 1221 ? 'otono' : 'invierno';
}
export const ESTACION_HOY = estacionDe(HOY);
/** El día que se usa para una estación: hoy si es la de hoy; si no, uno típico de ese año */
export const diaDe = est => est === ESTACION_HOY ? HOY : { y: HOY.y, m: ESTACIONES[est].m, d: ESTACIONES[est].d };

/** Salida y puesta de un día (minutos) */
const cacheDia = new Map();
export function horasDe(dia) {
  const k = `${dia.y}-${dia.m}-${dia.d}`;
  if (cacheDia.has(k)) return cacheDia.get(k);
  let sale = 420, pone = 1140, ant = sol(instante(dia, 0)).alt;
  for (let m = 2; m < 1440; m += 2) {
    const a = sol(instante(dia, m)).alt;
    if (ant < -.833 && a >= -.833) sale = m;
    if (ant >= -.833 && a < -.833) pone = m;
    ant = a;
  }
  const r = { sale, pone };
  cacheDia.set(k, r);
  return r;
}

/** La hora del recorrido: s = 0 (arriba) … 6 (Reservar) → minutos del día.
    Amanecer, mañana, mediodía, tarde, puesta y noche, con las horas reales de ese día. */
export function minutoDe(s, dia) {
  const { sale, pone } = horasDe(dia), luz = pone - sale;
  const K = [sale - 14, sale + 40, sale + luz * .24, sale + luz * .47, sale + luz * .74, pone - 4, pone + 115];
  if (s <= 0) return K[0];
  if (s >= 6) return K[6];
  const i = Math.floor(s), f = s - i;
  return K[i] + (K[i + 1] - K[i]) * f;
}

const RUMBOS = ['norte', 'nordeste', 'este', 'sudeste', 'sur', 'suroeste', 'oeste', 'noroeste'];
export const rumbo = az => RUMBOS[Math.round(az / 45) % 8];
const fDia = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'long' });
export const textoDia = dia => fDia.format(new Date(dia.y, dia.m - 1, dia.d));

/** El rótulo: «31 de octubre · 08:14 · el sol, a 3° por el este» */
export function rotulo(s, dia) {
  const m = minutoDe(s, dia), so = sol(instante(dia, m));
  let cielo;
  if (so.alt > .5) cielo = `sol a ${Math.round(so.alt)}° por el ${rumbo(so.az)}`;
  else if (so.alt > -6) cielo = m < 720 ? 'amanece' : 'se pone el sol';
  else {
    const lu = luna(instante(dia, m));
    cielo = lu.alt > 0 ? `noche · luna ${lu.fraccion > .95 ? 'llena' : lu.fraccion < .05 ? 'nueva' : (lu.fase < .5 ? 'creciente' : 'menguante')}` : 'noche cerrada';
  }
  return { dia: textoDia(dia), hora: hhmm(m), cielo };
}
