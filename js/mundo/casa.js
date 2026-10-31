/* ------------------------------------------------------------------
   La casa en 3D: las piezas de casa-modelo.js como mallas instanciadas.
   «La obra» (0–1) la lleva un uniforme: cada pieza tiene su momento
   (aT) y cae a su sitio creciendo; no se recalcula ninguna matriz.
   Antes de la obra, el dibujo a línea del edificio; de noche, las
   ventanas encendidas y el farol del portal.
   ------------------------------------------------------------------ */
import { modelo, MEDIDAS } from './casa-modelo.js';

const MATERIALES = {
  piedra: { roughness: .95 }, granito: { roughness: .82 }, pizarra: { roughness: .5, metalness: .05 },
  cobertura: { color: 0x26292e, roughness: 1 }, madera: { roughness: .8 }, puerta: { roughness: .75 },
  vidrio: { color: 0x1d252b, roughness: .12, metalness: .3 }, vid: { roughness: .9 },
};

function conObra(THREE, mat, uObra) {
  mat.onBeforeCompile = sh => {
    sh.uniforms.uObra = uObra;
    sh.vertexShader = 'attribute float aT;\nuniform float uObra;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
  float kO = clamp((uObra - aT) / .05, 0.0, 1.0);
  kO = kO * kO * (3.0 - 2.0 * kO);
  float syO = max(length(instanceMatrix[1].xyz), .001);
  transformed *= max(kO, .0001);
  transformed.y += (1.0 - kO) * 1.3 / syO;`);
  };
  mat.customProgramCacheKey = () => 'obra-' + mat.type;
  return mat;
}

export function crearCasa(THREE, { alturaEn, movil }) {
  const { piezas, luces } = modelo();
  const grupo = new THREE.Group();
  const uObra = { value: 0 };
  const caja = new THREE.BoxGeometry(1, 1, 1);
  const porTipo = {};
  for (const p of piezas) (porTipo[p.k] ||= []).push(p);

  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(0, 0, 0, 'YXZ'), col = new THREE.Color();
  const mallas = {};
  for (const [k, lista] of Object.entries(porTipo)) {
    const mat = conObra(THREE, new THREE.MeshStandardMaterial({ color: 0xffffff, ...MATERIALES[k] }), uObra);
    const malla = new THREE.InstancedMesh(caja, mat, lista.length);
    const aT = new Float32Array(lista.length);
    lista.forEach((p, i) => {
      e.set(p.r[0], p.r[1], 0);
      q.setFromEuler(e);
      m4.compose(new THREE.Vector3(...p.p), q, new THREE.Vector3(...p.s));
      malla.setMatrixAt(i, m4);
      if (p.c != null) malla.setColorAt(i, col.setHex(p.c, THREE.SRGBColorSpace));
      else if (k === 'vid') malla.setColorAt(i, col.setHSL(.22 + Math.random() * .06, .45, .32 + Math.random() * .1, THREE.SRGBColorSpace));
      aT[i] = p.t;
    });
    malla.geometry = caja.clone();
    malla.geometry.setAttribute('aT', new THREE.InstancedBufferAttribute(aT, 1));
    malla.castShadow = k !== 'vidrio';
    malla.receiveShadow = true;
    const dm = conObra(THREE, new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking }), uObra);
    malla.customDepthMaterial = dm;
    malla.frustumCulled = false;
    grupo.add(malla);
    mallas[k] = malla;
  }

  // el interior (oscuro): se ve por las juntas y por las ventanas; crece con la obra
  const M = MEDIDAS;
  const gi = new THREE.BoxGeometry(11.0, M.alero - .05, 6.9); gi.translate(0, (M.alero - .05) / 2, 0);
  const interior = new THREE.Mesh(gi, new THREE.MeshStandardMaterial({ color: 0x2a241f, roughness: 1 }));
  interior.position.set(0, 0, (M.zN + M.zS) / 2);
  grupo.add(interior);

  // ---------- el dibujo a línea (antes de la obra) ----------
  const L = [];
  const seg = (a, b) => L.push(...a, ...b);
  const caja2 = (x0, x1, y0, y1, z0, z1) => {
    const c = [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]];
    [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]].forEach(([a, b]) => seg(c[a], c[b]));
  };
  caja2(M.x0, M.x1, 0, M.alero, M.zN, M.zS);
  const yS = M.cumbre - (M.aleroSur - M.cumbreZ) * Math.tan(Math.PI / 6), yN = M.cumbre - (M.cumbreZ - M.aleroNorte) * Math.tan(Math.PI / 6);
  for (const x of [M.x0 - M.vuelo, M.x1 + M.vuelo]) { seg([x, yS, M.aleroSur], [x, M.cumbre, M.cumbreZ]); seg([x, M.cumbre, M.cumbreZ], [x, yN, M.aleroNorte]); }
  for (const x of [M.x0, M.x1]) { seg([x, M.alero, M.zS], [x, M.cumbre, M.cumbreZ]); seg([x, M.cumbre, M.cumbreZ], [x, M.alero, M.zN]); }
  seg([M.x0 - M.vuelo, M.cumbre, M.cumbreZ], [M.x1 + M.vuelo, M.cumbre, M.cumbreZ]);
  seg([M.x0 - M.vuelo, yS, M.aleroSur], [M.x1 + M.vuelo, yS, M.aleroSur]);
  seg([M.x0 - M.vuelo, yN, M.aleroNorte], [M.x1 + M.vuelo, yN, M.aleroNorte]);
  caja2(3.15, 4.05, 7.6, 9.35, -3.05, -2.15);
  for (const [u0, u1, y0, y1] of [[2.0, 3.1, 0, 2.2], [4.7, 5.6, .95, 2.05], [8.1, 9.0, .95, 2.05], [2.3, 3.2, 3.05, 5.15], [5.6, 6.5, 3.05, 5.15], [8.7, 9.5, 3.6, 4.9]]) {
    const x0 = M.x0 + u0, x1 = M.x0 + u1, z = M.zS + .01;
    seg([x0, y0, z], [x1, y0, z]); seg([x1, y0, z], [x1, y1, z]); seg([x1, y1, z], [x0, y1, z]); seg([x0, y1, z], [x0, y0, z]);
  }
  caja2(-4.6, 4.6, 3.0, 3.96, M.zS, M.zS + 1.15);
  const P = M.patio;
  for (const [a, b] of [[[P.x0, P.z1], [M.portal[0], P.z1]], [[M.portal[1], P.z1], [P.x1, P.z1]], [[P.x1, P.z1], [P.x1, P.z0]], [[P.x1, P.z0], [P.x0, P.z0]], [[P.x0, P.z0], [P.x0, P.z1]]]) {
    seg([a[0], 1, a[1]], [b[0], 1, b[1]]); seg([a[0], 0, a[1]], [a[0], 1, a[1]]);
  }
  const gl = new THREE.BufferGeometry(); gl.setAttribute('position', new THREE.Float32BufferAttribute(L, 3));
  const tinta = new THREE.LineBasicMaterial({ color: 0xfff4dc, transparent: true, opacity: 0, depthWrite: false, fog: false, toneMapped: false });
  const dibujo = new THREE.LineSegments(gl, tinta);
  dibujo.renderOrder = 2;
  grupo.add(dibujo);

  // ---------- de noche: ventanas y farol ----------
  const brillo = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,200,130,1)'); g.addColorStop(.35, 'rgba(255,170,90,.45)'); g.addColorStop(1, 'rgba(255,150,70,0)');
    x.fillStyle = g; x.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  })();
  const halos = [];
  for (const l of luces) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: brillo, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0, fog: false, toneMapped: false }));
    s.position.set(l.p[0] + l.n[0] * .5, l.p[1], l.p[2] + l.n[1] * .5);
    s.scale.setScalar(Math.max(l.w, l.h) * 2.4);
    grupo.add(s); halos.push(s);
  }
  const farol = new THREE.PointLight(0xffb36b, 0, 22, 2);
  farol.position.set(-2.5, 2.6, M.zS + 1.6);
  grupo.add(farol);

  const vidrio = mallas.vidrio.material;
  vidrio.emissive = new THREE.Color(0xffa95e);
  vidrio.emissiveIntensity = 0;

  // la casa se asienta en el solar (cota 0 del mundo) y mira al sur
  grupo.position.y = Math.max(0, alturaEn(0, 0));

  return {
    grupo, mallas,
    /** obra 0–1, dibujo 0–1 (opacidad del trazo), noche 0–1 */
    poner({ obra, dibujo: d, noche }) {
      uObra.value = obra;
      interior.scale.y = Math.max(.001, Math.min(1, (obra - .08) / .5));
      interior.visible = obra > .08;
      tinta.opacity = d;
      dibujo.visible = d > .01;
      const encendido = noche * Math.min(1, Math.max(0, (obra - .9) / .08));
      vidrio.emissiveIntensity = encendido * 2.6;
      for (const h of halos) { h.material.opacity = encendido * .85; h.visible = encendido > .01; }
      farol.intensity = encendido * 30;
    },
  };
}
