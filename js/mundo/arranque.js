/* ------------------------------------------------------------------
   Lo único del mundo que carga la página. Decide:
     - plan B 2D (sin WebGL2, con movimiento reducido, con ahorro de
       datos o con ?sin-3d): el paisaje dibujado, sin Three.js;
     - 3D: después de `load` y en tiempo libre, importa escena.js.
   El plan B se pinta siempre primero: es también el póster del 3D.
   Si el 3D falla en cualquier punto, se queda el plan B (clase sin-3d).
   ------------------------------------------------------------------ */
import { iniciarPlanB } from './planb.js';
import { rotulo, diaDe, horasDe, hhmm, ESTACION_HOY } from './sol.js';

const VERSION = '7';
const raiz = document.documentElement;
const mundo = document.getElementById('mundo');

function hayWebGL2() {
  try { return !!document.createElement('canvas').getContext('webgl2'); } catch (e) { return false; }
}
const q = new URLSearchParams(location.search);
const reducido = matchMedia('(prefers-reduced-motion: reduce)').matches;
const ahorro = navigator.connection && navigator.connection.saveData;
const movil = matchMedia('(pointer: coarse)').matches || innerWidth < 700;
let motivo = null;
if (q.has('sin-3d')) motivo = 'pedido';
else if (reducido) motivo = 'movimiento-reducido';
else if (ahorro) motivo = 'ahorro-de-datos';
else if (!hayWebGL2()) motivo = 'sin-webgl';

const planB = iniciarPlanB({ version: VERSION });
window.CORGA = Object.assign(window.CORGA || {}, { mundo: { motivo, planB } });

function sin3d(m) {
  raiz.classList.add('sin-3d');
  raiz.classList.remove('con-3d-pendiente');
  mundo.dataset.motivo = m;
  window.CORGA.mundo.motivo = m;
  dispatchEvent(new CustomEvent('corga:sin-3d', { detail: { motivo: m } }));
}

if (motivo) sin3d(motivo);
else {
  raiz.classList.add('con-3d-pendiente');
  const arrancar = () => {
    import('./escena.js?v=' + VERSION)
      .then(m => m.crearMundo({ contenedor: mundo, movil, version: VERSION, inicial: window.CORGA.estado || {} }))
      .then(api => {
        window.CORGA.mundo.api = api;
        raiz.classList.remove('con-3d-pendiente');
        raiz.classList.add('con-3d');
        dispatchEvent(new CustomEvent('corga:3d', { detail: api }));
      })
      .catch(err => { console.warn('El 3D no ha podido cargar; se queda el plan B.', err); sin3d('error'); });
  };
  const libre = () => ('requestIdleCallback' in window ? requestIdleCallback(arrancar, { timeout: 2500 }) : setTimeout(arrancar, 300));
  if (document.readyState === 'complete') libre(); else addEventListener('load', libre, { once: true });
}

// si el navegador se queda sin contexto WebGL (móvil con poca memoria), vuelve el plan B
addEventListener('corga:3d-perdido', () => {
  mundo.querySelector('.mundo-lienzo')?.remove();
  mundo.classList.remove('con-3d');
  raiz.classList.remove('con-3d');
  document.getElementById('explorar').hidden = true;
  sin3d('contexto-perdido');
});

// ---------- el rótulo de la hora (y la tira de datos de la versión sobria) ----------
const hora = document.getElementById('hora');
const [hDia, hHora, hCielo] = hora.children;
const diario = document.getElementById('diario');
const NOMBRES = ['Salida', 'Llegada', 'La casa', 'Las estancias', 'El entorno', 'Servicios', 'Reservar'];
let est = (window.CORGA.estado && window.CORGA.estado.estacion) || ESTACION_HOY;
let sAct = (window.CORGA.estado && window.CORGA.estado.s) || 0, ultimo = '';
function rotular() {
  const dia = diaDe(est), r = rotulo(sAct, dia), k = Math.round(sAct);
  const clave = r.dia + r.hora + r.cielo + k;
  if (clave === ultimo) return;
  ultimo = clave;
  hDia.textContent = r.dia; hHora.textContent = r.hora; hCielo.textContent = r.cielo;
  if (diario) {   // la tira de la versión sobria (mando de maqueta)
    const h = horasDe(dia);
    diario.children[0].textContent = `Parada ${k} de 6 · ${NOMBRES[k]}`;
    diario.children[1].textContent = `Ese día el sol sale a las ${hhmm(h.sale)} y se pone a las ${hhmm(h.pone)}`;
  }
}
addEventListener('corga:recorrido', e => { sAct = e.detail.s; rotular(); });
addEventListener('corga:estacion', e => { est = e.detail.estacion; ultimo = ''; rotular(); });
rotular();
