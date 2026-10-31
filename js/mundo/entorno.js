/* ------------------------------------------------------------------
   Alrededor de la casa (el parche fino): castaños y robles donde la
   ortofoto tiene bosque, cepas en los bancales (las curvas de nivel de
   la viña), los muros de los bancales y el camino desde la pista.
   Cambia con la estación: hoja nueva, verde, ocre y rojo de mencía,
   y en invierno las ramas peladas y las cepas podadas.
   ------------------------------------------------------------------ */
function azar(s) { return () => { s = (s + 0x6d2b79f5) >>> 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// color de copa y de cepa por estación: [matiz, saturación, luz] con su variación
const COPA = {
  primavera: [[.25, .42, .42], [.03, .1, .08]], verano: [[.27, .38, .27], [.03, .08, .06]],
  otono: [[.1, .55, .38], [.05, .15, .1]], invierno: [[.07, .14, .3], [.02, .05, .05]],
};
const CEPA = {
  primavera: [[.23, .55, .45], [.03, .1, .06]], verano: [[.25, .45, .32], [.03, .08, .05]],
  otono: [[.06, .6, .38], [.07, .15, .1]], invierno: [[.07, .2, .26], [.02, .05, .04]],
};

function texturaMuro(THREE) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 256;
  const x = c.getContext('2d'), r = azar(41);
  x.fillStyle = '#3b352f'; x.fillRect(0, 0, 512, 256);
  for (let y = 0; y < 256;) {
    const h = 26 + r() * 22;
    for (let u = -r() * 40; u < 512;) {
      const w = 34 + r() * 60, l = 80 + r() * 50, k = 40 + r() * 30;
      x.fillStyle = `rgb(${l + 18},${l + 8},${k + 30})`;
      x.beginPath(); x.roundRect(u + 2, y + 2, w - 4, h - 4, 5); x.fill();
      u += w;
    }
    y += h;
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function texturaCamino(THREE) {
  const c = document.createElement('canvas'); c.width = 128; c.height = 256;
  const x = c.getContext('2d'), r = azar(9);
  x.fillStyle = '#8e7a62'; x.fillRect(0, 0, 128, 256);
  for (let i = 0; i < 900; i++) { const v = 100 + r() * 70; x.fillStyle = `rgba(${v + 20},${v + 8},${v - 12},.55)`; x.fillRect(r() * 128, r() * 256, 1 + r() * 3, 1 + r() * 3); }
  const g = x.createLinearGradient(0, 0, 128, 0);
  g.addColorStop(0, 'rgba(70,90,50,.85)'); g.addColorStop(.18, 'rgba(70,90,50,0)'); g.addColorStop(.82, 'rgba(70,90,50,0)'); g.addColorStop(1, 'rgba(70,90,50,.85)');
  x.fillStyle = g; x.fillRect(0, 0, 128, 256);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function copaGeo(THREE, semilla, detalle) {
  const r = azar(semilla), partes = [];
  for (const [x, y, z, s] of [[0, 0, 0, 1], [.7, -.25, .2, .72], [-.6, -.15, -.3, .78], [.1, .45, -.5, .66]]) {
    const g = new THREE.IcosahedronGeometry(s, detalle);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const k = 1 + (r() - .5) * .28; p.setXYZ(i, p.getX(i) * k + x, p.getY(i) * k * .86 + y, p.getZ(i) * k + z); }
    partes.push(g.index ? g.toNonIndexed() : g);
  }
  const n = partes.reduce((a, g) => a + g.attributes.position.count, 0);
  const pos = new Float32Array(n * 3); let o = 0;
  for (const g of partes) { pos.set(g.attributes.position.array, o); o += g.attributes.position.array.length; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

export function crearEntorno(THREE, { meta, alturaEn, movil, ligera, vidParra }) {
  const grupo = new THREE.Group();
  const r = azar(77);
  const uCopa = { value: 1 }, uCepa = { value: 1 };
  const encoger = (mat, u) => {
    mat.onBeforeCompile = sh => {
      sh.uniforms.uEnc = u;
      sh.vertexShader = 'uniform float uEnc;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n  transformed *= uEnc;');
    };
    mat.customProgramCacheKey = () => 'enc' + mat.type;
    return mat;
  };

  // ---------- árboles ----------
  const lista = movil ? meta.arboles.filter((_, i) => i % 2 === 0) : meta.arboles;
  const nA = lista.length;
  const copa = new THREE.InstancedMesh(copaGeo(THREE, 5, 1), encoger(new THREE.MeshStandardMaterial({ roughness: .95, flatShading: true }), uCopa), nA);
  const tronco = new THREE.InstancedMesh(new THREE.CylinderGeometry(.12, .2, 1, 6).translate(0, .5, 0), new THREE.MeshStandardMaterial({ color: 0x4a3a2c, roughness: 1 }), nA);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), s = new THREE.Vector3(), col = new THREE.Color();
  const azarA = lista.map(() => [r(), r(), r()]);
  lista.forEach(([x, z, k], i) => {
    const y = alturaEn(x, z), alto = 7.5 * k, ancho = 3.1 * k;
    q.setFromAxisAngle(v.set(0, 1, 0), azarA[i][0] * 6.28);
    m4.compose(v.set(x, y - .2, z), q, s.set(1.2 * k, alto * .55, 1.2 * k)); tronco.setMatrixAt(i, m4);
    m4.compose(v.set(x, y + alto * .62, z), q, s.set(ancho, ancho * (.85 + azarA[i][1] * .3), ancho)); copa.setMatrixAt(i, m4);
  });
  copa.receiveShadow = true;
  grupo.add(tronco, copa);
  // la sombra solo se ve cerca de la casa: los árboles que pueden darla van
  // en una copia que solo pinta la cámara de la sombra (capa 1, ver cielo.js);
  // los ~3.700 del valle no pasan por esa pasada
  const cerca = lista.map((a, i) => i).filter(i => Math.hypot(lista[i][0], lista[i][1]) < 150);
  for (const malla of [copa, tronco]) {
    const sombra = new THREE.InstancedMesh(malla.geometry, malla.material, cerca.length);
    cerca.forEach((i, j) => { malla.getMatrixAt(i, m4); sombra.setMatrixAt(j, m4); });
    sombra.castShadow = true;
    sombra.layers.set(1);
    grupo.add(sombra);
  }
  // en ?ligera, los del valle con copa sencilla (4 veces menos triángulos); los de cerca siguen redondos
  let redonda = null;
  if (ligera) {
    redonda = new THREE.InstancedMesh(copa.geometry, copa.material, cerca.length);
    copa.geometry = copaGeo(THREE, 5, 0);
    cerca.forEach((i, j) => { copa.getMatrixAt(i, m4); redonda.setMatrixAt(j, m4); m4.makeScale(0, 0, 0); copa.setMatrixAt(i, m4); });
    redonda.receiveShadow = true;
    grupo.add(redonda);
  }

  // ---------- bancales: muros y cepas ----------
  const muroPos = [], muroUV = [], muroIdx = [];
  const cepas = [];
  const PASO = 1.35;
  const maxCepas = movil ? 3500 : 7000;
  for (const linea of meta.bancales) {
    let acc = 0;
    for (let i = 0; i < linea.length; i++) {
      const [x, z] = linea[i];
      const a = linea[Math.max(0, i - 1)], b = linea[Math.min(linea.length - 1, i + 1)];
      const tx = b[0] - a[0], tz = b[1] - a[1], tl = Math.hypot(tx, tz) || 1;
      // normal hacia arriba de la ladera
      let nx = -tz / tl, nz = tx / tl;
      if (alturaEn(x + nx * 2, z + nz * 2) < alturaEn(x - nx * 2, z - nz * 2)) { nx = -nx; nz = -nz; }
      const arriba = alturaEn(x + nx * .7, z + nz * .7), abajo = alturaEn(x - nx * .9, z - nz * .9);
      if (i > 0) acc += Math.hypot(x - linea[i - 1][0], z - linea[i - 1][1]);
      const base = muroPos.length / 3;
      muroPos.push(x, abajo - .35, z, x, Math.max(arriba, abajo + .6) + .42, z);
      muroUV.push(acc / 2.2, 0, acc / 2.2, 1);
      if (i > 0) muroIdx.push(base - 2, base, base - 1, base - 1, base, base + 1);
      // cepas: una fila por bancal, un metro ladera arriba del muro
      if (i > 0 && cepas.length < maxCepas) {
        const [x0, z0] = linea[i - 1];
        const seg = Math.hypot(x - x0, z - z0);
        for (let d = (cepas.length * .37) % PASO; d < seg; d += PASO) {
          const f = d / seg, cx = x0 + (x - x0) * f + nx * 1.15, cz = z0 + (z - z0) * f + nz * 1.15;
          cepas.push([cx, alturaEn(cx, cz), cz, Math.atan2(tx, tz)]);
        }
      }
    }
  }
  const gm = new THREE.BufferGeometry();
  gm.setAttribute('position', new THREE.Float32BufferAttribute(muroPos, 3));
  gm.setAttribute('uv', new THREE.Float32BufferAttribute(muroUV, 2));
  gm.setIndex(muroIdx); gm.computeVertexNormals();
  const muros = new THREE.Mesh(gm, new THREE.MeshStandardMaterial({ map: texturaMuro(THREE), roughness: 1, side: THREE.DoubleSide }));
  muros.receiveShadow = true;
  grupo.add(muros);

  const nC = cepas.length;
  const gc = new THREE.BoxGeometry(1, 1, 1).translate(0, .5, 0);
  const cepa = new THREE.InstancedMesh(gc, encoger(new THREE.MeshStandardMaterial({ roughness: .95 }), uCepa), nC);
  const azarC = cepas.map(() => [r(), r()]);
  cepas.forEach(([x, y, z, ry], i) => {
    q.setFromAxisAngle(v.set(0, 1, 0), ry + (azarC[i][0] - .5) * .3);
    m4.compose(v.set(x, y - .05, z), q, s.set(.55 + azarC[i][1] * .3, .95 + azarC[i][0] * .3, .55)); cepa.setMatrixAt(i, m4);
  });
  cepa.castShadow = true; cepa.receiveShadow = true;
  grupo.add(cepa);

  // ---------- el camino ----------
  const cm = meta.camino, cPos = [], cUV = [], cIdx = [];
  let largo = 0;
  cm.forEach(([x, z], i) => {
    const a = cm[Math.max(0, i - 1)], b = cm[Math.min(cm.length - 1, i + 1)];
    const tx = b[0] - a[0], tz = b[1] - a[1], tl = Math.hypot(tx, tz) || 1, nx = -tz / tl * 1.15, nz = tx / tl * 1.15;
    if (i > 0) largo += Math.hypot(x - cm[i - 1][0], z - cm[i - 1][1]);
    for (const k of [-1, 1]) { const px = x + nx * k, pz = z + nz * k; cPos.push(px, alturaEn(px, pz) + .32, pz); cUV.push(k < 0 ? 0 : 1, largo / 4); }
    if (i > 0) { const b0 = i * 2; cIdx.push(b0 - 2, b0, b0 - 1, b0 - 1, b0, b0 + 1); }
  });
  const gcam = new THREE.BufferGeometry();
  gcam.setAttribute('position', new THREE.Float32BufferAttribute(cPos, 3));
  gcam.setAttribute('uv', new THREE.Float32BufferAttribute(cUV, 2));
  gcam.setIndex(cIdx); gcam.computeVertexNormals();
  const camino = new THREE.Mesh(gcam, new THREE.MeshStandardMaterial({ map: texturaCamino(THREE), roughness: 1, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }));
  camino.receiveShadow = true;
  grupo.add(camino);

  // ---------- estación ----------
  function pintar(malla, n, tabla, azarL, est) {
    const [[h, sa, l], [dh, ds, dl]] = tabla[est];
    for (let i = 0; i < n; i++) {
      const a = azarL ? azarL(i) : [r(), r(), r()];
      let hh = h + (a[0] - .5) * dh * 2;
      if (est === 'otono' && tabla === CEPA && a[2] > .55) hh = .99 + (a[0] - .5) * .03;   // la mencía se pone roja
      malla.setColorAt(i, col.setHSL((hh + 1) % 1, sa + (a[1] - .5) * ds * 2, l + (a[2] - .5) * dl * 2, THREE.SRGBColorSpace));
    }
    if (malla.instanceColor) malla.instanceColor.needsUpdate = true;
  }
  function estacion(est) {
    pintar(copa, nA, COPA, i => azarA[i], est);
    if (redonda) pintar(redonda, cerca.length, COPA, j => azarA[cerca[j]], est);
    pintar(cepa, nC, CEPA, i => [azarC[i][0], azarC[i][1], (azarC[i][0] * 7.3) % 1], est);
    if (vidParra) pintar(vidParra, vidParra.count, CEPA, i => [((i * .618) % 1), ((i * .311) % 1), ((i * .743) % 1)], est);
    uCopa.value = est === 'invierno' ? .62 : 1;
    uCepa.value = est === 'invierno' ? .4 : est === 'primavera' ? .82 : 1;
  }

  return { grupo, estacion, cuenta: { arboles: nA, cepas: nC } };
}
