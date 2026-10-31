/* Quita el MANDO DE MAQUETA (densidad y paleta) para el sitio de un cliente.
   Uso:  node scripts/quitar-mando.mjs            → copia limpia en pruebas/sin-mando/ (no toca nada)
         node scripts/quitar-mando.mjs --aplicar  → reescribe los ficheros de la web
   Borra lo que hay entre «MANDO DE MAQUETA» y «/MANDO DE MAQUETA» (comentarios HTML, CSS o JS),
   con las dos líneas de marca incluidas, y comprueba que no queda rastro del mando. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FICHEROS = ['index.html', 'css/estilo.css', 'js/main.js'];
const aplicar = process.argv.includes('--aplicar');
const salida = aplicar ? RAIZ : path.join(RAIZ, 'pruebas', 'sin-mando');
const RASTRO = [/data-densidad/, /data-paleta/, /id="mando"/, /corga-densidad/, /corga-paleta/, /paleta-castano/, /paleta-sil/, /\.diario\b/, /id="diario"/];
let fallos = 0;

for (const f of FICHEROS) {
  const txt = fs.readFileSync(path.join(RAIZ, f), 'utf8');
  const lineas = txt.split(/\r?\n/), fuera = [];
  let dentro = false, quitadas = 0;
  for (const l of lineas) {
    const abre = /MANDO DE MAQUETA/.test(l) && !/\/MANDO DE MAQUETA/.test(l);
    const cierra = /\/MANDO DE MAQUETA/.test(l);
    if (abre && !dentro) { dentro = true; quitadas++; continue; }
    if (cierra && dentro) { dentro = false; quitadas++; continue; }
    if (dentro) { quitadas++; continue; }
    fuera.push(l);
  }
  if (dentro) { console.log(`✗ ${f}: un bloque del mando no se cierra`); fallos++; continue; }
  const limpio = fuera.join('\n');
  const queda = RASTRO.filter(r => r.test(limpio));
  if (queda.length) { console.log(`✗ ${f}: queda rastro del mando: ${queda.join(' ')}`); fallos++; }
  if (fuera.length + quitadas !== lineas.length) { console.log(`✗ ${f}: las cuentas de líneas no cuadran`); fallos++; }
  const destino = path.join(salida, f);
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  fs.writeFileSync(destino, limpio);
  console.log(`✓ ${f}: ${quitadas} líneas quitadas → ${path.relative(RAIZ, destino) || f}`);
}
process.exit(fallos ? 1 : 0);
