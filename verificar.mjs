/* Verificación de Casa da Corga (Playwright). Uso: node verificar.mjs   (puerto 8893)
   - El 3D NO se pinta: el navegador arranca con --disable-3d-apis y la página cae al plan B 2D;
     del 3D solo se comprueba que el contenedor existe.
   - Un solo navegador, cerrado en finally; ventanas pequeñas, escala 1, movimiento reducido.
   - Sin capturas y sin esperas largas: se espera a selectores y a condiciones. */
import { createRequire } from 'node:module';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire('C:/Users/alvar/Desktop/WEBS NEGOCIOS/alvarotaiagu.github.io/');
const { chromium } = require('playwright');
const RAIZ = path.dirname(fileURLToPath(import.meta.url));
const PUERTO = 8893;
const TIPOS = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.bin': 'application/octet-stream', '.md': 'text/markdown; charset=utf-8' };
const servidor = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  const f = path.join(RAIZ, p);
  if (!f.startsWith(RAIZ) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end('no'); return; }
  res.writeHead(200, { 'Content-Type': TIPOS[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
await new Promise(ok => servidor.listen(PUERTO, ok));
const URL_ = `http://localhost:${PUERTO}/`;

let bien = 0, mal = 0;
const ok = (cond, txt, extra = '') => { if (cond) { bien++; console.log('  ✓', txt); } else { mal++; console.log('  ✗', txt, extra); } };

async function abrir(navegador, opciones, ruta = 'index.html') {
  const ctx = await navegador.newContext({ deviceScaleFactor: 1, reducedMotion: 'reduce', ...opciones });
  const p = await ctx.newPage();
  const errores = [], fallos = [];
  p.on('console', m => { if (m.type() === 'error') errores.push(m.text()); });
  p.on('pageerror', e => errores.push(String(e)));
  p.on('requestfailed', r => fallos.push(r.url() + ' ' + (r.failure()?.errorText || '')));
  p.on('response', r => { if (r.status() >= 400) fallos.push(r.url() + ' ' + r.status()); });
  await p.goto(URL_ + ruta, { waitUntil: 'load' });
  return { ctx, p, errores, fallos };
}
const fotograma = p => p.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));

const navegador = await chromium.launch({ args: ['--disable-3d-apis'] });
try {
  // ================= escritorio =================
  console.log('Escritorio 1280×800 (movimiento reducido, sin WebGL)');
  {
    const { ctx, p, errores, fallos } = await abrir(navegador, { viewport: { width: 1280, height: 800 } });
    ok(await p.$eval('meta[name="robots"]', m => m.content.includes('noindex')), 'noindex');
    ok(await p.locator('#mundo').count() === 1, 'existe el contenedor del mundo (#mundo)');
    await p.waitForFunction(() => document.documentElement.classList.contains('sin-3d'), null, { timeout: 5000 });
    ok(await p.evaluate(() => document.getElementById('mundo').dataset.motivo), 'sin WebGL o con movimiento reducido cae al plan B', await p.evaluate(() => document.getElementById('mundo').dataset.motivo));
    ok(await p.evaluate(() => !document.querySelector('canvas.mundo-lienzo')), 'no se crea el lienzo 3D');
    await p.waitForSelector('#plan-b svg path', { timeout: 5000 });
    ok(await p.$$eval('#plan-b svg path', ps => ps.length >= 3), 'plan B: tres crestas del horizonte real');
    const cieloArriba = await p.evaluate(() => getComputedStyle(document.getElementById('plan-b')).getPropertyValue('--pb-cen'));
    ok(await p.evaluate(() => getComputedStyle(document.querySelector('.cortina')).display === 'none'), 'la cortina no tapa (movimiento reducido)');
    // las paradas: s sube al bajar y el cielo cambia
    const sDe = id => p.evaluate(async id => {
      const pt = [...document.querySelectorAll('[data-parada]')].find(e => document.getElementById(id).contains(e));
      const sec = pt.closest('.parada');
      const y = pt.dataset.en != null ? sec.getBoundingClientRect().top + scrollY + (+pt.dataset.en) * (sec.offsetHeight - innerHeight) : pt.getBoundingClientRect().top + scrollY - innerHeight / 2;
      scrollTo(0, y);
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
      return window.CORGA.estado.s;
    }, id);
    const s2 = await sDe('casa'), s4 = await sDe('entorno'), s6 = await sDe('reservar');
    ok(Math.abs(s2 - 2) < .05 && Math.abs(s4 - 4) < .05 && Math.abs(s6 - 6) < .05, 'el scroll lleva a las paradas 2, 4 y 6', `${s2.toFixed(2)} ${s4.toFixed(2)} ${s6.toFixed(2)}`);
    const cieloNoche = await p.evaluate(() => getComputedStyle(document.getElementById('plan-b')).getPropertyValue('--pb-cen'));
    ok(cieloArriba && cieloNoche && cieloArriba !== cieloNoche, 'plan B: el cielo cambia con el recorrido', `${cieloArriba} → ${cieloNoche}`);
    ok(await p.evaluate(() => /\d\d:\d\d/.test(document.querySelector('.hora-hora').textContent)), 'rótulo de la hora con hora real');
    // la fachada que se construye (plan B), entera con movimiento reducido
    await sDe('casa');
    ok(await p.evaluate(() => { const g = document.querySelectorAll('[data-fachada] .fachada-tanda'); return g.length > 10 && [...g].every(x => x.classList.contains('puesta')); }), 'plan B: la fachada sale entera con movimiento reducido');
    // estaciones
    await sDe('entorno');
    await p.click('[data-estacion="invierno"]');
    await fotograma(p);
    ok(await p.evaluate(() => document.querySelector('[data-estacion="invierno"]').getAttribute('aria-pressed') === 'true' && !document.querySelector('[data-texto="invierno"]').hidden), 'estaciones: el botón cambia el texto');
    const cieloInv = await p.evaluate(() => getComputedStyle(document.getElementById('plan-b')).getPropertyValue('--pb-cerca'));
    await p.click('[data-estacion="verano"]'); await fotograma(p);
    const cieloVer = await p.evaluate(() => getComputedStyle(document.getElementById('plan-b')).getPropertyValue('--pb-cerca'));
    ok(cieloInv !== cieloVer, 'estaciones: el plan B cambia de color', `${cieloInv} / ${cieloVer}`);
    // datos ficticios marcados
    ok(await p.evaluate(() => document.documentElement.classList.contains('ficticio') && getComputedStyle(document.querySelector('[data-dato="telefono"]'), '::after').content.includes('ficticio')), 'los datos ficticios llevan la marca');
    ok(await p.$$eval('.foto figcaption', f => f.length >= 7 && f.every(x => /ejemplo/i.test(x.textContent))), 'las fotos de estancias dicen «Foto de ejemplo»');
    ok(await p.$$eval('.estancias img', is => is.every(i => i.naturalWidth === 0 || i.complete)), 'imágenes de estancias');
    // simulador de reservas
    await p.evaluate(() => document.getElementById('motor').scrollIntoView({ block: 'center' }));
    const k = await p.evaluate(() => {
      const { ocupada } = window.CORGA.reserva;
      const libres = [...document.querySelectorAll('.cal-dia:not(:disabled)')].map(b => b.dataset.k);
      const suma = (k, n) => { const [y, m, d] = k.split('-').map(Number); const f = new Date(y, m - 1, d + n); return `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}-${String(f.getDate()).padStart(2, '0')}`; };
      return libres.find(a => !ocupada(a) && !ocupada(suma(a, 1)) && !ocupada(suma(a, 2)) && libres.includes(suma(a, 3)));
    });
    ok(!!k, 'hay tres noches libres seguidas para probar');
    ok(await p.$$eval('.cal-dia.es-ocupado', b => b.length > 0 && b.filter(x => !x.disabled).length === 0), 'las noches ocupadas no se pueden elegir de llegada');
    const suma = (k, n) => { const [y, m, d] = k.split('-').map(Number); const f = new Date(y, m - 1, d + n); return `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}-${String(f.getDate()).padStart(2, '0')}`; };
    await p.click(`.cal-dia[data-k="${k}"]`);
    ok(await p.isDisabled('#motor-pedir'), 'con solo la llegada no se puede pedir');
    await p.click(`.cal-dia[data-k="${suma(k, 1)}"]`);
    ok(/desde 2 noches/.test(await p.textContent('#motor-resumen')), 'mínimo de noches: avisa con una noche');
    await p.click(`.cal-dia[data-k="${suma(k, 3)}"]`);
    const res = await p.textContent('#motor-resumen');
    ok(/3 noches/.test(res) && /Total/.test(res) && /€/.test(res), 'resumen con noches y total', res.replace(/\s+/g, ' ').slice(0, 120));
    ok(await p.$$eval('.cal-dia.es-tramo', b => b.length === 2), 'se marcan las noches del tramo');
    await p.click('#motor-pedir');
    ok(/No se ha enviado nada/.test(await p.textContent('#motor-hecho')) && await p.isVisible('#motor-hecho'), 'pedir: simulación sin enviar nada');
    ok(/Demostración/.test(await p.textContent('.sello-demo')), 'el motor se marca como demostración');
    // cookies
    ok(await p.isVisible('#cookies'), 'aviso de cookies a la primera');
    await p.click('#cookies-ok');
    ok(await p.evaluate(() => getComputedStyle(document.getElementById('cookies')).display === 'none' && localStorage.getItem('corga-cookies-vistas') === '1'), 'cookies: «Entendido» lo cierra de verdad');
    ok(await p.evaluate(() => document.getElementById('mando').hidden && getComputedStyle(document.getElementById('mando')).display === 'none'), 'el mando de maqueta no sale sin ?revision');
    ok(errores.length === 0, 'sin errores de consola', errores.join(' | '));
    ok(fallos.length === 0, 'sin peticiones fallidas', fallos.join(' | '));
    await ctx.close();
  }

  // ================= con ?revision: el mando =================
  console.log('Escritorio con ?revision (mando de maqueta)');
  {
    const { ctx, p, errores } = await abrir(navegador, { viewport: { width: 1280, height: 800 } }, 'index.html?revision');
    await p.evaluate(() => localStorage.setItem('corga-cookies-vistas', '1'));
    await p.reload({ waitUntil: 'load' });
    ok(await p.isVisible('#mando'), 'mando visible con ?revision');
    const antes = await p.$eval('.boton--acento', b => getComputedStyle(b).backgroundColor);
    await p.click('[data-paleta="sil"]');
    const despues = await p.$eval('.boton--acento', b => getComputedStyle(b).backgroundColor);
    ok(antes !== despues, 'la paleta cambia el color de verdad', `${antes} → ${despues}`);
    await p.click('[data-densidad="sobria"]');
    ok(await p.evaluate(() => document.documentElement.classList.contains('sobria') && getComputedStyle(document.getElementById('diario')).display !== 'none'), 'sobria: aparece la tira de datos');
    await p.click('[data-densidad="recorrido"]'); await p.click('[data-paleta="mencia"]');
    ok(errores.length === 0, 'sin errores de consola', errores.join(' | '));
    await ctx.close();
  }

  // ================= móvil =================
  console.log('Móvil 390×844 (táctil, movimiento reducido, sin WebGL)');
  {
    const { ctx, p, errores, fallos } = await abrir(navegador, { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    await p.waitForSelector('#plan-b svg path', { timeout: 5000 });
    // recorrer la página entera y buscar desbordes horizontales
    const alto = await p.evaluate(() => document.documentElement.scrollHeight);
    const anchos = [];
    for (let y = 0; y < alto; y += 700) {
      await p.evaluate(y => scrollTo(0, y), y); await fotograma(p);
      anchos.push(await p.evaluate(() => {
        const W = innerWidth, malos = [];
        const enScroll = el => { for (let e = el.parentElement; e; e = e.parentElement) { const s = getComputedStyle(e); if (/(auto|scroll)/.test(s.overflowX)) return true; } return false; };
        for (const el of document.querySelectorAll('main *, .pie *, .cabecera *, .hora, .cookies')) {
          const r = el.getBoundingClientRect();
          if (!r.width || getComputedStyle(el).visibility === 'hidden') continue;
          if ((r.right > W + 1 || r.left < -1) && !enScroll(el) && !el.closest('.menu')) malos.push(el.tagName + '.' + el.className + ' ' + Math.round(r.left) + '…' + Math.round(r.right));
        }
        return { W, sw: document.documentElement.scrollWidth, iw: innerWidth, malos: malos.slice(0, 4) };
      }));
    }
    const peor = anchos.find(a => a.malos.length || a.iw !== 390);
    ok(!peor, 'sin desborde horizontal a 390 px en toda la página', peor ? JSON.stringify(peor) : '');
    // menú móvil
    await p.evaluate(() => scrollTo(0, 1200)); await fotograma(p);
    await p.click('#menu-boton');
    await p.waitForFunction(() => document.getElementById('menu').classList.contains('abierto'));
    await fotograma(p);
    const rect = await p.$eval('#menu', m => { const r = m.getBoundingClientRect(); return { top: r.top, h: r.height }; });
    ok(rect.top >= -1 && rect.h >= 800, 'menú móvil abierto cubre la pantalla con la cabecera fija', JSON.stringify(rect));
    await p.click('#menu-boton');
    ok(await p.evaluate(() => document.getElementById('menu-boton').getAttribute('aria-expanded') === 'false'), 'el menú se cierra');
    // simulador en móvil: un mes
    ok(await p.$$eval('.cal-mes', m => m.length === 1), 'calendario de un mes en el móvil');
    ok(errores.length === 0, 'sin errores de consola', errores.join(' | '));
    ok(fallos.length === 0, 'sin peticiones fallidas', fallos.join(' | '));
    await ctx.close();
  }

  // ================= otras páginas =================
  console.log('Páginas legales y 404');
  {
    const ctx = await navegador.newContext({ deviceScaleFactor: 1, reducedMotion: 'reduce', viewport: { width: 390, height: 844 } });
    for (const f of ['aviso-legal.html', 'privacidad.html', 'cookies.html', '404.html']) {
      const p = await ctx.newPage(); const err = [];
      p.on('pageerror', e => err.push(String(e)));
      const r = await p.goto(URL_ + f, { waitUntil: 'load' });
      ok(r.status() === 200 && await p.$eval('meta[name="robots"]', m => m.content.includes('noindex')) && err.length === 0, `${f}: carga, noindex, sin errores`);
      await p.close();
    }
    await ctx.close();
  }
} finally {
  await navegador.close();
  servidor.close();
}
console.log(`\n${bien} bien · ${mal} mal`);
process.exit(mal ? 1 : 0);
