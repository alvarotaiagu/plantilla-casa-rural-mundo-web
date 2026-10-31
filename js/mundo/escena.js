/* ------------------------------------------------------------------
   El mundo: una sola escena y una cámara sobre un riel.
   El scroll dice en qué parada estás (s = 0 … 6, lo calcula main.js y
   llega con el evento «corga:recorrido»); la cámara va hacia ese punto
   del riel con suavizado, y con ella la hora del día (sol y luna reales),
   la obra de la casa y la estación.
   Solo se pinta cuando algo cambia: quieta, la escena no gasta.
   ------------------------------------------------------------------ */
import * as THREE from './vendor/three.module.min.js';
import { cargarTerreno } from './terreno.js';
import { crearCielo } from './cielo.js';
import { crearCasa } from './casa.js';
import { crearEntorno } from './entorno.js';
import { sol, luna, instante, minutoDe, diaDe, ESTACION_HOY } from './sol.js';
import { css } from './luz.js';

const suave = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

export async function crearMundo({ contenedor, movil, version, base = 'img/terreno/', inicial = {} }) {
  const lienzo = document.createElement('canvas');
  lienzo.className = 'mundo-lienzo';
  lienzo.setAttribute('aria-hidden', 'true');
  lienzo.addEventListener('webglcontextlost', e => { e.preventDefault(); dispatchEvent(new CustomEvent('corga:3d-perdido')); });
  const renderer = new THREE.WebGLRenderer({ canvas: lienzo, antialias: !movil, powerPreference: 'high-performance', alpha: false });
  const DPR_MAX = movil ? 1.5 : 1.75;
  let dpr = Math.min(DPR_MAX, devicePixelRatio || 1);
  renderer.setPixelRatio(dpr);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false;

  const escena = new THREE.Scene();
  const camara = new THREE.PerspectiveCamera(50, 1, .5, 30000);

  // ---------- el mundo ----------
  const T = await cargarTerreno(THREE, { base, movil, version, renderer });
  const { meta, alturaEn, EX } = T;
  escena.add(T.grupo);
  const cielo = crearCielo(THREE, { escena, renderer, movil });
  const casa = crearCasa(THREE, { alturaEn, movil });
  escena.add(casa.grupo);
  const entorno = crearEntorno(THREE, { meta, alturaEn, movil, vidParra: casa.mallas.vid });
  escena.add(entorno.grupo);

  // ---------- el riel ----------
  const [cx, cz] = meta.casa.xz, cota = meta.casa.cota;
  const aMundo = p => new THREE.Vector3(p[0] - cx, (p[1] - cota) * EX, p[2] - cz);
  const pts = meta.rail.map(r => aMundo(r.p)), mir = meta.rail.map(r => aMundo(r.m));
  const riel = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
  const mirada = new THREE.CatmullRomCurve3(mir, false, 'centripetal');
  const N = pts.length;
  const iParada = [];
  meta.rail.forEach((r, i) => { if (r.parada != null) iParada[r.parada] = i; });
  // tabla de longitudes para avanzar a velocidad constante entre paradas
  const MUESTRAS = 3000, largo = new Float32Array(MUESTRAS + 1);
  { const a = new THREE.Vector3(), b = new THREE.Vector3(); riel.getPoint(0, a);
    for (let i = 1; i <= MUESTRAS; i++) { riel.getPoint(i / MUESTRAS, b); largo[i] = largo[i - 1] + a.distanceTo(b); a.copy(b); } }
  const largoEn = t => { const f = t * MUESTRAS, i = Math.floor(f); return i >= MUESTRAS ? largo[MUESTRAS] : largo[i] + (largo[i + 1] - largo[i]) * (f - i); };
  const tDeLargo = L => { let lo = 0, hi = MUESTRAS; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (largo[m] < L) lo = m; else hi = m; } const f = (L - largo[lo]) / Math.max(1e-6, largo[hi] - largo[lo]); return (lo + f) / MUESTRAS; };
  const Lp = iParada.map(i => largoEn(i / (N - 1)));
  const tDeS = s => { s = Math.min(6, Math.max(0, s)); const k = Math.min(5, Math.floor(s)); return tDeLargo(Lp[k] + (Lp[k + 1] - Lp[k]) * (s - k)); };
  const sDeT = t => { const L = largoEn(t); let k = 0; while (k < 5 && L > Lp[k + 1]) k++; return Math.min(6, k + (L - Lp[k]) / Math.max(1e-6, Lp[k + 1] - Lp[k])); };

  // ---------- estado ----------
  let sObj = inicial.s ?? 0, tObj = tDeS(sObj), tCam = tObj;
  let estacion = inicial.estacion || ESTACION_HOY, dia = diaDe(estacion);
  const W = { primavera: [1, 0, 0, 0], verano: [0, 1, 0, 0], otono: [0, 0, 1, 0], invierno: [0, 0, 0, 1] };
  const est = new THREE.Vector4(...W[estacion]), estObj = new THREE.Vector4(...W[estacion]);
  T.comun.uEst.value.copy(est);
  entorno.estacion(estacion);
  let sobria = !!inicial.sobria;
  let puntero = { x: 0, y: 0 }, punteroS = { x: 0, y: 0 };
  let explorando = false, controles = null, vuelta = 0;
  const poseVuelta = { p: new THREE.Vector3(), m: new THREE.Vector3() };

  const pos = new THREE.Vector3(), mira = new THREE.Vector3(), tmp = new THREE.Vector3();
  let ultimaLuz = '', ultimoMin = -1;

  function ponerHora(s) {
    const m = minutoDe(s, dia);
    const clave = estacion + Math.round(m);
    if (clave === ultimaLuz) return;
    ultimaLuz = clave;
    const f = instante(dia, m), so = sol(f), lu = luna(f);
    const L = cielo.poner(so, lu);
    T.comun.uCieloRefl.value.setRGB(...L.hor.map(v => v * .55), THREE.SRGBColorSpace);
    casaLuz.noche = L.noche;
    if (Math.round(m) !== ultimoMin) { ultimoMin = Math.round(m); renderer.shadowMap.needsUpdate = true; }
    document.documentElement.style.setProperty('--cielo-hor', css(L.hor));
  }
  const casaLuz = { noche: 0 };

  // ---------- tamaño (la barra del móvil no rehace el búfer) ----------
  let anchoV = 0, altoV = 0;
  function medir(forzar) {
    const w = contenedor.clientWidth, h = contenedor.clientHeight;
    if (!w || !h) return;
    if (!forzar && w === anchoV && Math.abs(h - altoV) < 160) return;
    anchoV = w; altoV = h;
    renderer.setSize(w, h, false);
    camara.aspect = w / h;
    // en vertical, se abre el campo para que la casa quepa a lo ancho
    camara.fov = w / h < .8 ? 62 : 50;
    camara.updateProjectionMatrix();
    pedir();
  }
  new ResizeObserver(() => medir(false)).observe(contenedor);

  // ---------- bucle (solo cuando hace falta) ----------
  let vivo = false, ultimo = 0, primer = true, sombras = true, roto = false;
  const tiempos = []; let escalon = 0;
  function pedir() { if (!roto && !vivo && !document.hidden) { vivo = true; ultimo = performance.now(); requestAnimationFrame(cuadro); } }
  function bajarCalidad() {
    escalon++;
    if (escalon === 1 && dpr > 1) { dpr = Math.max(1, dpr - .25); renderer.setPixelRatio(dpr); medir(true); }
    else if (escalon <= 2 && sombras) { sombras = false; renderer.shadowMap.enabled = false; escena.traverse(o => { if (o.material) o.material.needsUpdate = true; }); }
    else if (escalon <= 3) { entorno.grupo.children.forEach(m => { if (m.isInstancedMesh) m.count = Math.floor(m.count * .55); }); }
    else if (dpr > .75) { dpr = .75; renderer.setPixelRatio(dpr); medir(true); }
    contenedor.dataset.calidad = escalon;
  }

  function cuadro(ahora) {
    try { fotograma(ahora); }
    catch (err) {
      vivo = false; roto = true;
      console.error('El 3D ha fallado al pintar; vuelve el plan B.', err);
      dispatchEvent(new CustomEvent('corga:3d-perdido'));
    }
  }
  function fotograma(ahora) {
    const dt = Math.min(.1, (ahora - ultimo) / 1000); ultimo = ahora;
    let moviendo = false;

    if (explorando) {
      controles.update();
      moviendo = true;
    } else {
      // suavizado de la cámara sobre el riel
      const k = 1 - Math.exp(-dt * 3.4);
      tCam += (tObj - tCam) * k;
      if (Math.abs(tObj - tCam) < 2e-6) tCam = tObj; else moviendo = true;
      riel.getPoint(tCam, pos); mirada.getPoint(tCam, mira);
      // un poco de vida con el ratón (no en táctil)
      punteroS.x += (puntero.x - punteroS.x) * k; punteroS.y += (puntero.y - punteroS.y) * k;
      if (Math.abs(puntero.x - punteroS.x) + Math.abs(puntero.y - punteroS.y) > 1e-4) moviendo = true;
      tmp.subVectors(mira, pos);
      const d = tmp.length();
      tmp.applyAxisAngle(camara.up, -punteroS.x * .035).normalize().multiplyScalar(d);
      mira.copy(pos).add(tmp); mira.y += punteroS.y * d * .02;
      if (vuelta > 0) {   // de la exploración, de vuelta al riel
        vuelta = Math.max(0, vuelta - dt / 1.1);
        const f = suave(0, 1, vuelta);
        pos.lerp(poseVuelta.p, f); mira.lerp(poseVuelta.m, f);
        moviendo = true;
      }
      // nunca bajo el suelo
      const suelo = alturaEn(pos.x, pos.z) + 1.4;
      if (pos.y < suelo) pos.y = suelo;
      camara.position.copy(pos); camara.lookAt(mira);
    }
    cielo.cupula.position.copy(camara.position);

    // estación (fundido)
    const dEst = Math.abs(est.x - estObj.x) + Math.abs(est.y - estObj.y) + Math.abs(est.z - estObj.z) + Math.abs(est.w - estObj.w);
    if (dEst > 1e-3) { est.lerp(estObj, 1 - Math.exp(-dt * 4)); T.comun.uEst.value.copy(est); moviendo = true; }
    else if (!est.equals(estObj)) { est.copy(estObj); T.comun.uEst.value.copy(est); }

    const s = explorando ? sObj : sDeT(tCam);
    ponerHora(s);
    const obra = sobria ? 1 : suave(1.06, 1.94, s);
    const dibujo = sobria ? 0 : suave(.55, 1.0, s) * (1 - suave(1.08, 1.5, s)) * .85;
    casa.poner({ obra, dibujo, noche: casaLuz.noche });
    if (obra > 0 && obra < 1) renderer.shadowMap.needsUpdate = true;

    const t0 = performance.now();
    renderer.render(escena, camara);
    if (primer) { primer = false; contenedor.classList.add('con-3d'); contenedor.dispatchEvent(new CustomEvent('corga:3d-listo', { bubbles: true })); }
    // calidad automática: media de 45 fotogramas seguidos
    if (moviendo) {
      tiempos.push(dt * 1000);
      if (tiempos.length >= 45) { const media = tiempos.reduce((a, b) => a + b) / tiempos.length; tiempos.length = 0; if (media > 30 && escalon < 4) bajarCalidad(); }
    }
    void t0;
    if (moviendo && !document.hidden) requestAnimationFrame(cuadro);
    else { vivo = false; tiempos.length = 0; }
  }

  // ---------- lo que llega de la página ----------
  addEventListener('corga:recorrido', e => { sObj = e.detail.s; tObj = tDeS(sObj); pedir(); });
  addEventListener('corga:estacion', e => {
    estacion = e.detail.estacion; dia = diaDe(estacion); estObj.set(...W[estacion]);
    entorno.estacion(estacion); ultimaLuz = ''; renderer.shadowMap.needsUpdate = true; pedir();
  });
  addEventListener('corga:densidad', e => { sobria = e.detail.sobria; pedir(); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) pedir(); });
  if (matchMedia('(pointer: fine)').matches) {
    addEventListener('pointermove', e => { if (explorando) return; puntero.x = e.clientX / innerWidth * 2 - 1; puntero.y = -(e.clientY / innerHeight * 2 - 1); pedir(); }, { passive: true });
  }

  /** Exploración libre (tras el botón): girar y acercar alrededor de lo que se mira. */
  let deseado = false;
  async function explorar(activo) {
    deseado = activo;
    if (activo === explorando) return;
    if (activo) {
      const { OrbitControls } = await import('./vendor/OrbitControls.js');
      if (!deseado || explorando) return;   // se pidió salir (o ya se entró) mientras cargaba
      if (!controles) {
        controles = new OrbitControls(camara, lienzo);
        Object.assign(controles, { enableDamping: true, dampingFactor: .08, minDistance: 8, maxDistance: 2500, maxPolarAngle: Math.PI * .47, zoomSpeed: .8, rotateSpeed: .55 });
      }
      controles.target.copy(mira);
      controles.enabled = true;
      explorando = true;
      lienzo.classList.add('explorando');
    } else {
      poseVuelta.p.copy(camara.position); poseVuelta.m.copy(controles.target);
      controles.enabled = false;
      explorando = false; vuelta = 1;
      lienzo.classList.remove('explorando');
    }
    pedir();
  }

  contenedor.prepend(lienzo);
  medir(true);
  // primer fotograma: con la cámara ya en su sitio
  riel.getPoint(tCam, pos); mirada.getPoint(tCam, mira);
  camara.position.copy(pos); camara.lookAt(mira);
  renderer.compile(escena, camara);
  pedir();

  return { explorar, renderer, get calidad() { return escalon; }, cuenta: entorno.cuenta };
}
