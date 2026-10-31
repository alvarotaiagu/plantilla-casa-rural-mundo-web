/* ------------------------------------------------------------------
   El valle: carga el relieve y la ortofoto del IGN que deja
   scripts/terreno.py en img/terreno/ y monta dos mallas:
     - la grande (toda la caja, ~11 × 8 km),
     - el parche fino (1 km alrededor de la casa, a 5 m y 0,5 m/px).
   Para cambiar de valle no se toca este fichero: se regeneran los datos.

   Mundo: origen en el solar de la casa, y = (cota − cota de la casa) × exageración.
   Relieve MDT05 y ortofoto PNOA © Instituto Geográfico Nacional (CC BY 4.0).
   ------------------------------------------------------------------ */
const pedir = (url, tipo) => fetch(url, { priority: 'low' }).then(r => { if (!r.ok) throw new Error(url + ' ' + r.status); return tipo === 'json' ? r.json() : r.arrayBuffer(); });

// El color del valle según la estación, sobre la ortofoto (que es de verano).
// También da brillo de agua al río con la máscara agua-1024.png.
const GLSL_ESTACION = `
  vec3 cE = diffuseColor.rgb;
  float lumE = dot(cE, vec3(.299, .587, .114));
  float verdeE = clamp((cE.g - max(cE.r, cE.b)) * 7.0 + .15, 0.0, 1.0) * (1.0 - aguaE);
  vec3 primE = mix(cE, cE * vec3(.92, 1.14, .82), verdeE);
  vec3 verE = mix(cE, cE * vec3(1.05, 1.0, .84), verdeE * .6);
  vec3 otoE = mix(cE, mix(vec3(lumE * 1.45, lumE * 1.0, lumE * .42), vec3(lumE * 1.5, lumE * .62, lumE * .38), .35), verdeE * .78);
  vec3 invE = mix(cE, vec3(lumE * 1.04, lumE * .97, lumE * .88), verdeE * .7);
  diffuseColor.rgb = primE * uEst.x + verE * uEst.y + otoE * uEst.z + invE * uEst.w;
  diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * .55 + vec3(.02, .05, .07), aguaE);
`;

function materialValle(THREE, map, comun, conAgua) {
  const m = new THREE.MeshStandardMaterial({ map, roughness: 1, metalness: 0 });
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, comun);
    sh.vertexShader = 'varying vec2 vMundoXZ;\n' + sh.vertexShader.replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\n  vMundoXZ = (modelMatrix * vec4(transformed, 1.0)).xz;');
    sh.fragmentShader = `uniform vec4 uEst; uniform sampler2D uAgua; uniform vec4 uCaja; uniform vec3 uCieloRefl; uniform float uConAgua;
varying vec2 vMundoXZ;
` + sh.fragmentShader
      .replace('#include <map_fragment>', `#include <map_fragment>
  vec2 uvA = vec2((vMundoXZ.x + uCaja.x) / uCaja.z + .5, 1.0 - ((vMundoXZ.y + uCaja.y) / uCaja.w + .5));
  float aguaE = uConAgua * texture2D(uAgua, uvA).r;
` + GLSL_ESTACION)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n  roughnessFactor = mix(roughnessFactor, .14, aguaE);')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
  float fresA = pow(1.0 - clamp(dot(normalize(vViewPosition), normal), 0.0, 1.0), 4.0);
  totalEmissiveRadiance += uCieloRefl * aguaE * (.18 + .7 * fresA);`);
  };
  m.customProgramCacheKey = () => 'valle' + (conAgua ? 'a' : '');
  return m;
}

/**
 * @returns {Promise<{meta, grupo, alturaEn:(x,z)=>number, comun, EX, materiales}>}
 */
export async function cargarTerreno(THREE, { base, movil, version, renderer }) {
  const v = version ? '?v=' + version : '';
  const meta = await pedir(base + 'terreno.json' + v, 'json');
  const EX = meta.exageracion, [cx, cz] = meta.casa.xz, cota = meta.casa.cota;
  const [nx, nz] = movil ? meta.mallas[0] : meta.mallas[1];
  const lado = movil ? 2048 : 4096;
  const D = meta.detalle;

  const cargador = new THREE.TextureLoader();
  const tex = url => new Promise((ok, mal) => cargador.load(url, ok, undefined, mal));
  const [bufG, bufD, orto, ortoD, agua] = await Promise.all([
    pedir(`${base}alturas-${nx}x${nz}.bin${v}`), pedir(`${base}detalle-alturas.bin${v}`),
    tex(`${base}orto-${lado}.webp${v}`), tex(`${base}detalle-orto-2048.webp${v}`), tex(`${base}agua-1024.png${v}`),
  ]);
  const altG = new Uint16Array(bufG), altD = new Uint16Array(bufD);
  for (const t of [orto, ortoD]) {
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = Math.min(movil ? 4 : 8, renderer.capabilities.getMaxAnisotropy());
  }
  agua.colorSpace = THREE.NoColorSpace;

  const comun = {
    uEst: { value: new THREE.Vector4(0, 0, 1, 0) },
    uAgua: { value: agua },
    uCaja: { value: new THREE.Vector4(cx, cz, meta.ancho, meta.alto) },
    uCieloRefl: { value: new THREE.Color(.5, .6, .7) },
    uConAgua: { value: 1 },
  };

  // ---------- alturas ----------
  const yDe = h => (h - cota) * EX;
  const bilineal = (arr, w, h, fx, fy) => {
    fx = Math.min(w - 1.001, Math.max(0, fx)); fy = Math.min(h - 1.001, Math.max(0, fy));
    const i = Math.floor(fx), j = Math.floor(fy), a = fx - i, b = fy - j;
    const p = (ii, jj) => arr[jj * w + ii] / 10;
    return (p(i, j) * (1 - a) + p(i + 1, j) * a) * (1 - b) + (p(i, j + 1) * (1 - a) + p(i + 1, j + 1) * a) * b;
  };
  const hGrande = (x, z) => bilineal(altG, nx, nz, ((x + cx) / meta.ancho + .5) * (nx - 1), ((z + cz) / meta.alto + .5) * (nz - 1));
  const enDetalle = (x, z) => Math.abs(x) < D.lado / 2 && Math.abs(z) < D.lado / 2;
  const hDetalle = (x, z) => bilineal(altD, D.n, D.n, (x / D.lado + .5) * (D.n - 1), (z / D.lado + .5) * (D.n - 1));
  /** altura del suelo en coordenadas del mundo (m) */
  const alturaEn = (x, z) => yDe(enDetalle(x, z) ? hDetalle(x, z) : hGrande(x, z));

  // ---------- malla grande ----------
  const gG = new THREE.PlaneGeometry(meta.ancho, meta.alto, nx - 1, nz - 1);
  gG.rotateX(-Math.PI / 2);
  gG.translate(-cx, 0, -cz);
  const pG = gG.attributes.position;
  const hueco = D.lado / 2 - 45;   // dentro del parche fino, la grande se hunde (no se pelean)
  for (let k = 0; k < pG.count; k++) {
    const x = pG.getX(k), z = pG.getZ(k);
    let y = yDe(altG[k] / 10);
    if (Math.abs(x) < hueco && Math.abs(z) < hueco) y -= 40;
    pG.setY(k, y);
  }
  gG.computeVertexNormals();
  const mG = materialValle(THREE, orto, comun, true);
  const grande = new THREE.Mesh(gG, mG);
  grande.matrixAutoUpdate = false;

  // ---------- parche fino ----------
  const gD = new THREE.PlaneGeometry(D.lado, D.lado, D.n - 1, D.n - 1);
  gD.rotateX(-Math.PI / 2);
  const pD = gD.attributes.position;
  for (let k = 0; k < pD.count; k++) {
    const i = k % D.n, j = Math.floor(k / D.n);
    const borde = i === 0 || j === 0 || i === D.n - 1 || j === D.n - 1;
    pD.setY(k, yDe(altD[k] / 10) + (borde ? -4 : .25));
  }
  gD.computeVertexNormals();
  const mD = materialValle(THREE, ortoD, comun, true);
  mD.polygonOffset = true; mD.polygonOffsetFactor = -2; mD.polygonOffsetUnits = -2;
  const fino = new THREE.Mesh(gD, mD);
  fino.receiveShadow = true;
  fino.matrixAutoUpdate = false;

  const grupo = new THREE.Group();
  grupo.add(grande, fino);
  return { meta, grupo, alturaEn, comun, EX, materiales: [mG, mD] };
}
