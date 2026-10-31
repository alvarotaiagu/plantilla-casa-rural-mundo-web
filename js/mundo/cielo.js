/* ------------------------------------------------------------------
   El cielo y las luces: cúpula (degradado + halo + disco del sol +
   estrellas), la luna con su fase de ese día, el sol o la luna como luz
   direccional con sombras alrededor de la casa, y la niebla del valle.
   Los colores salen de luz.js, los ángulos de sol.js: los de verdad.
   ------------------------------------------------------------------ */
import { luz } from './luz.js';

const VERT = `varying vec3 vDir;
void main() {
  vDir = normalize(position);
  vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_Position = p.xyww;
}`;
const FRAG = `uniform vec3 uCen; uniform vec3 uHor; uniform vec3 uBrillo; uniform vec3 uSol; uniform float uNoche; uniform float uSolVis;
varying vec3 vDir;
float hash(vec3 p) { p = fract(p * .3183099 + .1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
void main() {
  vec3 d = normalize(vDir);
  float h = d.y;
  vec3 col = mix(uHor, uCen, pow(smoothstep(-.02, .55, h), .62));
  float sd = max(dot(d, uSol), 0.0);
  col += uBrillo * (pow(sd, 5.0) * .32 + pow(sd, 48.0) * .5) * uSolVis;
  col += vec3(1.0, .93, .82) * smoothstep(.99955, .99975, sd) * 3.0 * step(-.01, uSol.y);
  if (uNoche > .01) {
    vec3 q = d * 260.0, id = floor(q), f = fract(q) - .5;
    float n = hash(id);
    float est = step(.9972, n) * smoothstep(.22, .0, length(f)) * smoothstep(.0, .18, h);
    col += vec3(.85, .9, 1.0) * est * uNoche * (.45 + .9 * hash(id + 7.0));
  }
  col = mix(col, uHor * .82, smoothstep(.0, -.12, h));
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}`;

function texturaLuna(THREE, fase) {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const x = c.getContext('2d'), r = 50;
  const halo = x.createRadialGradient(64, 64, r * .9, 64, 64, 64);
  halo.addColorStop(0, 'rgba(210,220,255,.28)'); halo.addColorStop(1, 'rgba(210,220,255,0)');
  x.fillStyle = halo; x.fillRect(0, 0, 128, 128);
  // disco apagado y la parte iluminada (terminador como elipse)
  x.fillStyle = 'rgba(70,78,98,.55)'; x.beginPath(); x.arc(64, 64, r, 0, Math.PI * 2); x.fill();
  const creciente = fase < .5, k = Math.cos(fase * 2 * Math.PI);   // 1 nueva … −1 llena
  x.fillStyle = '#eef0ea';
  x.beginPath();
  x.arc(64, 64, r, -Math.PI / 2, Math.PI / 2, !creciente);
  x.ellipse(64, 64, Math.abs(k) * r, r, 0, Math.PI / 2, -Math.PI / 2, (k > 0) === creciente);
  x.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function crearCielo(THREE, { escena, renderer, movil }) {
  const u = {
    uCen: { value: new THREE.Color() }, uHor: { value: new THREE.Color() }, uBrillo: { value: new THREE.Color() },
    uSol: { value: new THREE.Vector3(0, 1, 0) }, uNoche: { value: 0 }, uSolVis: { value: 1 },
  };
  const cupula = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 24),
    new THREE.ShaderMaterial({ uniforms: u, vertexShader: VERT, fragmentShader: FRAG, side: THREE.BackSide, depthWrite: false, depthTest: true, fog: false, toneMapped: false }));
  cupula.scale.setScalar(20000);
  cupula.frustumCulled = false;
  cupula.renderOrder = -1;
  escena.add(cupula);

  const lunaMat = new THREE.SpriteMaterial({ transparent: true, depthWrite: false, fog: false, toneMapped: false });
  const lunaS = new THREE.Sprite(lunaMat);
  lunaS.scale.setScalar(520);
  escena.add(lunaS);
  let faseHecha = -1;

  const sol = new THREE.DirectionalLight(0xffffff, 2);
  sol.castShadow = true;
  sol.shadow.mapSize.set(movil ? 1024 : 2048, movil ? 1024 : 2048);
  Object.assign(sol.shadow.camera, { left: -42, right: 42, top: 42, bottom: -42, near: 1, far: 900 });
  sol.shadow.camera.updateProjectionMatrix();
  sol.shadow.bias = -.0004; sol.shadow.normalBias = .04;
  sol.shadow.camera.layers.enable(1);   // los árboles que solo dan sombra (entorno.js)
  // la sombra la rehace escena.js (renderer.shadowMap.needsUpdate) solo cuando cambia algo
  escena.add(sol, sol.target);
  const cielo = new THREE.HemisphereLight(0xbfd2e8, 0x4a4030, 1);
  escena.add(cielo);
  escena.fog = new THREE.FogExp2(0xcfdde8, 1.05e-4);

  const dir = (az, alt) => {
    const a = az * Math.PI / 180, e = alt * Math.PI / 180;
    return new THREE.Vector3(Math.sin(a) * Math.cos(e), Math.sin(e), -Math.cos(a) * Math.cos(e));
  };
  const srgb = (c, rgb) => c.setRGB(rgb[0], rgb[1], rgb[2], THREE.SRGBColorSpace);

  /** Pone la luz de un instante. so/lu: {az, alt} y luna {fraccion, fase}. Devuelve la tabla de luz usada. */
  function poner(so, lu) {
    const L = luz(so.alt);
    const dSol = dir(so.az, so.alt), dLuna = dir(lu.az, lu.alt);
    srgb(u.uCen.value, L.cen); srgb(u.uHor.value, L.hor); srgb(u.uBrillo.value, L.brillo);
    u.uSol.value.copy(dSol); u.uNoche.value = L.noche;
    u.uSolVis.value = Math.min(1, Math.max(0, (so.alt + 8) / 8));
    escena.fog.color.copy(u.uHor.value).multiplyScalar(.92);
    escena.fog.density = (1.05e-4) * (1 + .5 * L.noche);
    renderer.toneMappingExposure = L.exp;

    // la luz directa: el sol si está arriba; si no, la luna (si ha salido)
    const deLuna = so.alt < -4 && lu.alt > 2;
    const dLuz = deLuna ? dLuna : (so.alt > -2 ? dSol : dLuna);
    srgb(sol.color, deLuna ? [.66, .74, .92] : L.sol);
    sol.intensity = deLuna ? .12 + .38 * lu.fraccion : L.i;
    sol.position.copy(dLuz).multiplyScalar(400);
    sol.target.position.set(0, 0, 0);
    sol.castShadow = sol.intensity > .08 && dLuz.y > .03;
    srgb(cielo.color, L.hc); srgb(cielo.groundColor, L.hs);
    cielo.intensity = L.hi;

    lunaS.visible = lu.alt > -2 && L.noche > .05;
    lunaS.position.copy(dLuna).multiplyScalar(15000);
    lunaMat.opacity = Math.min(1, L.noche * 1.4);
    const f = Math.round(lu.fase * 40) / 40;
    if (f !== faseHecha) { lunaMat.map?.dispose(); lunaMat.map = texturaLuna(THREE, f); lunaMat.needsUpdate = true; faseHecha = f; }
    return L;
  }
  return { poner, cupula, sol, cielo, uniforms: u };
}
