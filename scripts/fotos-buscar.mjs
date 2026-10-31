/* Busca fotos de ejemplo en Pexels (una consulta por navegador nuevo, que si no salta Cloudflare).
   Uso: node scripts/fotos-buscar.mjs   → pruebas/fotos/busqueda.json (id, alt, ancho, alto por consulta)
   Un navegador cada vez, cerrado en finally; nada en paralelo. Sin datos del usuario en el User-Agent. */
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire('C:/Users/alvar/Desktop/WEBS NEGOCIOS/alvarotaiagu.github.io/');
const { chromium } = require('playwright');
const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SALIDA = path.join(RAIZ, 'pruebas', 'fotos');
fs.mkdirSync(SALIDA, { recursive: true });

const CONSULTAS = (process.argv[2] ? process.argv.slice(2) : [
  'stone wall bedroom rustic',
  'rustic bedroom wooden beams',
  'attic bedroom wooden ceiling',
  'twin beds rustic bedroom',
  'stone fireplace living room rustic',
  'rustic farmhouse kitchen stone',
  'rustic dining room wooden table',
  'rustic bathroom stone wall',
]);
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';
const espera = ms => new Promise(r => setTimeout(r, ms));
const fichero = path.join(SALIDA, 'busqueda.json');
const todo = fs.existsSync(fichero) ? JSON.parse(fs.readFileSync(fichero, 'utf8')) : {};

for (const q of CONSULTAS) {
  if (todo[q]?.length) { console.log('ya está', q); continue; }
  const navegador = await chromium.launch({ args: ['--disable-blink-features=AutomationControlled'] });
  try {
    const ctx = await navegador.newContext({ userAgent: UA, viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
    const p = await ctx.newPage();
    await p.goto(`https://www.pexels.com/search/${encodeURIComponent(q)}/?orientation=landscape`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await espera(9000);
    const fotos = await p.evaluate(() => {
      const vistos = new Set(), out = [];
      for (const a of document.querySelectorAll('a[href*="/photo/"]')) {
        const m = a.getAttribute('href').match(/-(\d+)\/?$/) || a.getAttribute('href').match(/\/photo\/(\d+)/);
        const img = a.querySelector('img');
        if (!m || !img || vistos.has(m[1])) continue;
        vistos.add(m[1]);
        out.push({ id: m[1], alt: img.alt || '', w: img.naturalWidth, h: img.naturalHeight });
      }
      return out.slice(0, 18);
    });
    todo[q] = fotos;
    console.log(q, '→', fotos.length);
  } catch (e) {
    console.log(q, 'falló', e.message);
  } finally {
    await navegador.close();
  }
  fs.writeFileSync(fichero, JSON.stringify(todo, null, 1));
  await espera(3000);
}
