# Datos del mundo 3D de Casa da Corga (cañón del Sil, Ribeira Sacra).
#
# Fuentes (se descargan una vez a pruebas/3d-fuente/, que NO se publica; User-Agent propio, sin datos personales):
#   - MDT05 del IGN por WCS (Elevacion4258_5) y ortofoto PNOA por WMS (OI.OrthoimageCoverage).
#     © Instituto Geográfico Nacional, CC BY 4.0.
#
# El VALLE se cambia aquí y en ningún otro sitio: la caja (S, N, O, E), el punto de la casa (CASA) y el tramo
# de río por el que vuela la cámara (RIO_DESDE, RIO_HASTA, en fracciones de la caja). Todo lo demás se calcula.
# La casa es ficticia: el solar es un bancal de viña de la orilla norte del Sil (Sober), sin edificios.
#
# Salida en img/terreno/ (lo lee js/mundo/terreno.js):
#   alturas-<nx>x<nz>.bin   Uint16 little-endian, decímetros, fila 0 = norte (móvil 384 / escritorio 576 de ancho)
#   orto-2048.*, orto-4096.* ortofoto de toda la caja, fila 0 = norte
#   agua-1024.png           máscara del agua (blanco = agua) para el brillo del río
#   detalle-alturas.bin     el parche fino alrededor de la casa (5 m), con el solar allanado
#   detalle-orto-2048.*     ortofoto fina del parche (0,5 m/px), con el patio pintado
#   terreno.json            caja, mallas, casa, raíl de la cámara, paradas, bancales, árboles, camino, horizonte
#
# Uso (desde la carpeta de la web): python -I scripts/terreno.py
import json, math, pathlib, sys, time, urllib.error, urllib.request, heapq
import numpy as np
import cv2
from PIL import Image, ImageEnhance, ImageFilter
from scipy import ndimage as nd
Image.MAX_IMAGE_PIXELS = None
sys.stdout.reconfigure(encoding='utf-8')

R = pathlib.Path(__file__).resolve().parent.parent
FUENTE = R / 'pruebas' / '3d-fuente'
OUT = R / 'img' / 'terreno'
FUENTE.mkdir(parents=True, exist_ok=True); OUT.mkdir(parents=True, exist_ok=True)
UA = {'User-Agent': 'CasaRuralMundoWeb/1.0 (web local de prueba; relieve)'}

# ---------- el valle ----------
S, N, O, E = 42.355, 42.425, -7.64, -7.50           # ≈ 11,5 × 7,8 km: el cañón del Sil entre Parada de Sil y Sober
CASA = (42.38873, -7.53132)                          # bancal de viña de la orilla norte, entre dos pistas (solar inventado)
RIO_DESDE, RIO_HASTA = (0.0, 0.21), (0.785, 0.575)   # (u, v) aproximados del río en la caja: oeste → bajo la casa
VUELO_DESDE_U = 0.24                                 # la cámara entra en el río a partir de aquí (u)
EX = 1.3                                             # exageración vertical (el JS la lee del JSON)
lat0 = (S + N) / 2
KX, KZ = 111320 * math.cos(math.radians(lat0)), 110950
ancho, alto = (E - O) * KX, (N - S) * KZ
DET = 1000                                           # lado del parche fino (m)

def baja(url, f, minimo=20000):
    p = FUENTE / f
    if p.exists() and p.stat().st_size > minimo: return p
    print('pido', f, flush=True)
    for intento in range(4):
        try: d = urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=300).read(); break
        except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError) as e:
            if getattr(e, 'code', 500) < 500 or intento == 3: raise
            time.sleep(15 * (intento + 1))
    p.write_bytes(d); print('  ', f, len(d) // 1024, 'KB'); time.sleep(2)
    return p

def local(lat, lon): return ((lon - (O + E) / 2) * KX, ((S + N) / 2 - lat) * KZ)
cx, cz = local(*CASA)
dl, do = DET / 2 / KZ, DET / 2 / KX
DS, DN, DO_, DE = CASA[0] - dl, CASA[0] + dl, CASA[1] - do, CASA[1] + do

WMS = 'https://www.ign.es/wms-inspire/pnoa-ma?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&LAYERS=OI.OrthoimageCoverage&STYLES=&CRS=EPSG:4326&FORMAT=image/jpeg'
baja('https://servicios.idee.es/wcs-inspire/mdt?SERVICE=WCS&VERSION=2.0.1&REQUEST=GetCoverage&COVERAGEID=Elevacion4258_5'
     f'&SUBSET=Lat({S},{N})&SUBSET=Long({O},{E})&FORMAT=image/tiff', 'mdt5.tif', 1_000_000)
OW = 4096; OH = round(OW * alto / ancho)
baja(f'{WMS}&BBOX={S},{O},{N},{E}&WIDTH={OW}&HEIGHT={OH}', 'pnoa-4096.jpg')
baja(f'{WMS}&BBOX={DS},{DO_},{DN},{DE}&WIDTH=2048&HEIGHT=2048', 'detalle-pnoa.jpg')

# ---------- 1. relieve ----------
dem = np.array(Image.open(FUENTE / 'mdt5.tif'), dtype=np.float32)
dem = nd.gaussian_filter(dem, 1.2)                   # el MDT del WCS viene en metros enteros: quitar escalones
DH, DW = dem.shape
def cota_xz(x, z):
    c = (x / ancho + .5) * (DW - 1); r = (z / alto + .5) * (DH - 1)
    return float(nd.map_coordinates(dem, [[r], [c]], order=1, mode='nearest')[0])
def techo(x, z, radio):
    c = (x / ancho + .5) * (DW - 1); r = (z / alto + .5) * (DH - 1); rc = radio / ancho * DW; rr = radio / alto * DH
    v = dem[int(max(0, r - rr)):int(min(DH, r + rr + 1)), int(max(0, c - rc)):int(min(DW, c + rc + 1))]
    return float(v.max())

MALLAS = []
for nx in (384, 576):
    nz = round(nx * alto / ancho)
    a = np.array(Image.fromarray(dem).resize((nx, nz), Image.BOX), dtype=np.float32)
    (OUT / f'alturas-{nx}x{nz}.bin').write_bytes(np.round(a * 10).astype('<u2').tobytes())
    MALLAS.append([nx, nz])

# ---------- 2. ortofoto grande + máscara del agua ----------
orto = Image.open(FUENTE / 'pnoa-4096.jpg').convert('RGB')
orto = ImageEnhance.Contrast(orto).enhance(1.08); orto = ImageEnhance.Color(orto).enhance(0.95)
for lado, qw in ((2048, 50), (4096, 52)):
    o = orto.resize((lado, round(lado * alto / ancho)), Image.LANCZOS)
    o.save(OUT / f'orto-{lado}.jpg', quality=66, optimize=True, progressive=True)
    o.save(OUT / f'orto-{lado}.webp', quality=qw, method=6)
oa = np.array(orto.resize((1024, round(1024 * alto / ancho)), Image.LANCZOS), dtype=np.float32) / 255
lum = oa.mean(axis=2)
agua = (lum < .2) & (oa[..., 2] >= oa[..., 0] - .01) & (oa[..., 2] > oa[..., 1] - .03)
agua = nd.binary_opening(agua, iterations=1); agua = nd.binary_closing(agua, iterations=2)
lab, n = nd.label(agua); tam = nd.sum(agua, lab, range(1, n + 1))
agua = np.isin(lab, 1 + np.flatnonzero(tam > 400))  # solo el río (manchas grandes)
Image.fromarray((nd.gaussian_filter(agua.astype(np.float32), 1.2) * 255).astype('uint8')).save(OUT / 'agua-1024.png', optimize=True)

# ---------- 3. el parche fino de la casa ----------
DN_ = 201                                            # 5 m entre vértices
gx = np.linspace(cx - DET / 2, cx + DET / 2, DN_); gz = np.linspace(cz - DET / 2, cz + DET / 2, DN_)
XX, ZZ = np.meshgrid(gx, gz)
cc = (XX / ancho + .5) * (DW - 1); rr = (ZZ / alto + .5) * (DH - 1)
det = nd.map_coordinates(dem, [rr, cc], order=1, mode='nearest').astype(np.float32)
# el solar: rectángulo de 34 × 26 m allanado a la cota de la casa, con un talud suave de 10 m
COTA = cota_xz(cx, cz)
SOLAR = (26, 18)
dx = np.abs(XX - cx) - SOLAR[0] / 2; dz = np.abs(ZZ - (cz + 2)) - SOLAR[1] / 2
fuera = np.hypot(np.maximum(dx, 0), np.maximum(dz, 0))
w = np.clip(1 - fuera / 10, 0, 1); w = w * w * (3 - 2 * w)
det = det * (1 - w) + COTA * w
(OUT / 'detalle-alturas.bin').write_bytes(np.round(det * 10).astype('<u2').tobytes())

def cota_det(x, z):
    c = (x - (cx - DET / 2)) / DET * (DN_ - 1); r = (z - (cz - DET / 2)) / DET * (DN_ - 1)
    if 0 <= c <= DN_ - 1 and 0 <= r <= DN_ - 1:
        return float(nd.map_coordinates(det, [[r], [c]], order=1)[0])
    return cota_xz(x, z)

# ortofoto fina con el patio pintado (tierra apisonada y hierba) donde va la casa
dorto = Image.open(FUENTE / 'detalle-pnoa.jpg').convert('RGB')
dorto = ImageEnhance.Contrast(dorto).enhance(1.06)
da = np.array(dorto, dtype=np.float32)
PX = 2048 / DET
yy, xx = np.mgrid[0:2048, 0:2048].astype(np.float32)
wx = xx / PX - DET / 2 + cx; wz = yy / PX - DET / 2 + cz
ddx = np.abs(wx - cx) - SOLAR[0] / 2 + 1; ddz = np.abs(wz - (cz + 2)) - SOLAR[1] / 2 + 1
ff = np.hypot(np.maximum(ddx, 0), np.maximum(ddz, 0))
ruido = nd.gaussian_filter(np.random.default_rng(7).random((2048, 2048)).astype(np.float32), 3)
ruido = (ruido - ruido.mean()) / ruido.std()
mz = np.clip(1 - ff / 3.5 + ruido * .15, 0, 1)[..., None]
hierba = np.stack([96 + ruido * 9, 110 + ruido * 11, 66 + ruido * 7], -1)
tierra = np.stack([146 + ruido * 10, 128 + ruido * 9, 104 + ruido * 8], -1)
gr = nd.gaussian_filter(np.random.default_rng(3).random((2048, 2048)).astype(np.float32), 9)
patio = np.where((gr > np.median(gr))[..., None], hierba, tierra)
da = da * (1 - mz) + patio * mz
dorto = Image.fromarray(np.clip(da, 0, 255).astype('uint8'))
dorto.save(OUT / 'detalle-orto-2048.jpg', quality=70, optimize=True, progressive=True)
dorto.save(OUT / 'detalle-orto-2048.webp', quality=58, method=6)

# ---------- 4. bancales (curvas de nivel en la viña) y árboles ----------
lumd = np.array(dorto.convert('L').resize((DN_, DN_), Image.BOX), dtype=np.float32) / 255
verde = np.array(dorto.resize((DN_, DN_), Image.BOX), dtype=np.float32) / 255
gzz, gxx = np.gradient(det, 5.0)
pend = np.degrees(np.arctan(np.hypot(gxx, gzz)))
dist = np.hypot(XX - cx, ZZ - cz)
vina = (lumd > .40) & (pend > 7) & (pend < 38) & (dist < 300) & (w < .05)
vina = nd.binary_opening(vina, iterations=1)
bancales = []
for nivel in np.arange(math.floor(det.min()), math.ceil(det.max()), 2.6):
    m = ((det > nivel) * 255).astype('uint8')
    cs, _ = cv2.findContours(m, cv2.RETR_LIST, cv2.CHAIN_APPROX_NONE)
    for c in cs:
        tramo = []
        for p in c[:, 0, :]:
            j, i = int(p[0]), int(p[1])
            if 0 < i < DN_ - 1 and 0 < j < DN_ - 1 and vina[i, j]:
                tramo.append((gx[j], gz[i]))
            else:
                if len(tramo) >= 5: bancales.append(tramo)
                tramo = []
        if len(tramo) >= 5: bancales.append(tramo)
def suaviza(t, paso=3.0):
    pts = np.array(t, dtype=np.float32)
    if len(pts) > 4: pts = cv2.GaussianBlur(pts.reshape(-1, 1, 2), (1, 5), 0).reshape(-1, 2)
    out = [pts[0]]; acc = 0
    for a, b in zip(pts[:-1], pts[1:]):
        acc += float(np.hypot(*(b - a)))
        if acc >= paso: out.append(b); acc = 0
    return [[round(float(p[0] - cx), 1), round(float(p[1] - cz), 1)] for p in out]
bancales = [suaviza(t) for t in bancales]
bancales = [t for t in bancales if len(t) >= 6]

rng = np.random.default_rng(11)
arboles = []
bosque = (verde[..., 1] > verde[..., 0] * 1.02) & (lumd < .36) & (w < .02)
for i in range(DN_):
    for j in range(DN_):
        if not bosque[i, j] or dist[i, j] > 470: continue
        for _ in range(2 if lumd[i, j] < .26 else 1):
            if rng.random() < .32:
                x = gx[j] + rng.uniform(-2.5, 2.5); z = gz[i] + rng.uniform(-2.5, 2.5)
                arboles.append([round(float(x - cx), 1), round(float(z - cz), 1), round(float(rng.uniform(.75, 1.3)), 2)])

# ---------- 5. el camino: de la carretera al portal, en dos lazadas por la ladera ----------
CARRETERA = (cx - 90, cz + 27)                       # la pista de abajo, al oeste de la casa
camino_xz = [CARRETERA, (cx - 50, cz + 25), (cx - 22, cz + 21), (cx - 9, cz + 16), (cx - 3, cz + 10)]
def interp(pts, paso=2.5):
    out = []
    for a, b in zip(pts[:-1], pts[1:]):
        n = max(1, int(math.hypot(b[0] - a[0], b[1] - a[1]) / paso))
        for k in range(n): out.append((a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n))
    out.append(pts[-1]); return out
camino = [[round(x - cx, 1), round(z - cz, 1)] for x, z in interp(camino_xz)]

# ---------- 6. el raíl: el río desde el oeste y la subida a la casa ----------
C = 360
g = np.array(Image.fromarray(dem).resize((C, C), Image.BILINEAR), dtype=np.float64)
def celda(u, v): return int(v * C), int(u * C)
def cauce(a, b):
    coste = (g - g.min() + 4) ** 2
    dist_ = np.full(g.shape, np.inf); prev = {}; dist_[a] = 0; q = [(0, a)]
    while q:
        dd, p = heapq.heappop(q)
        if p == b: break
        if dd > dist_[p]: continue
        for di in (-1, 0, 1):
            for dj in (-1, 0, 1):
                if not di and not dj: continue
                r2, c2 = p[0] + di, p[1] + dj
                if 0 <= r2 < C and 0 <= c2 < C:
                    nd_ = dd + coste[r2, c2] * math.hypot(di, dj)
                    if nd_ < dist_[r2, c2]: dist_[r2, c2] = nd_; prev[(r2, c2)] = p; heapq.heappush(q, (nd_, (r2, c2)))
    cam = [b]
    while cam[-1] != a: cam.append(prev[cam[-1]])
    return cam[::-1]
rio = cauce(celda(*RIO_DESDE), celda(*RIO_HASTA))
def xz_celda(p): return ((p[1] + .5) / C - .5) * ancho, ((p[0] + .5) / C - .5) * alto
rio_xz = [xz_celda(p) for p in rio]
# suavizar el cauce (media móvil) para que la cámara no dé tirones
rx = nd.uniform_filter1d(np.array([p[0] for p in rio_xz]), 9, mode='nearest')
rz = nd.uniform_filter1d(np.array([p[1] for p in rio_xz]), 9, mode='nearest')
rio_xz = list(zip(rx, rz))
tramo = [p for p in rio_xz if (p[0] / ancho + .5) >= VUELO_DESDE_U]
puntos = []; acc = 1e9
for a, b in zip(tramo[:-1], tramo[1:]):
    acc += math.hypot(b[0] - a[0], b[1] - a[1])
    if acc >= 420: puntos.append(b); acc = 0
puntos[-1] = tramo[-1]

rail = []   # {p: posición real (m), m: punto al que se mira (m), parada: n o None}
def suelo(x, z): return cota_det(x, z)
# parada 0: alto sobre el cañón, mirando río arriba (al este, hacia donde sale el sol)
n = len(puntos)
for k, (x, z) in enumerate(puntos):
    f = k / (n - 1)
    h = 760 - 330 * min(1, f / .35) if f < .35 else 430 - 40 * (f - .35) / .65
    h = max(h, techo(x, z, 120) + 45)
    if k >= n - 3:   # al final del río ya se mira a la ladera de la casa
        m, mh = (cx, cz), COTA + 30
    else:
        m = puntos[min(n - 1, k + 3)]; mh = suelo(*m) + 60
    rail.append({'p': [x, h, z], 'm': [m[0], mh, m[1]], 'parada': 0 if k == 0 else None})
# subida a la casa desde el río (la casa queda al norte)
def rel(dx, dz, alto_sobre, mx=0, mz=0, mh=4.0, parada=None, mirar=None):
    x, z = cx + dx, cz + dz
    m = mirar or [cx + mx, COTA + mh, cz + mz]
    return {'p': [x, suelo(x, z) + alto_sobre, z], 'm': m, 'parada': parada}
rail.append(rel(-60, 230, 60, mh=10))
rail.append(rel(-120, 110, 26, mh=6))
# parada 1, llegada: en la pista de abajo, mirando a la casa (aún dibujada)
rail.append(rel(-96, 30, 4.5, mh=4, parada=1))
rail.append(rel(-52, 30, 5, mh=4.5))
# parada 2, la casa: de suroeste a sureste mientras se levanta
rail.append(rel(-28, 24, 6, mh=4.5))
rail.append(rel(4, 30, 7.5, mh=4.5, parada=2))
rail.append(rel(28, 20, 6.5, mh=4.5))
# parada 3, las estancias: delante de la puerta
rail.append(rel(2, 12, 1.8, mx=0, mz=4.2, mh=2.0, parada=3))
# parada 4, el entorno: arriba y detrás de la casa, mirando al cañón y a la otra orilla
rio_sur = min(rio_xz, key=lambda p: math.hypot(p[0] - cx, p[1] - (cz + 420)))
rail.append(rel(-30, -40, 60, mirar=[rio_sur[0], suelo(*rio_sur) + 120, rio_sur[1] + 200]))
rail.append(rel(-60, -120, 170, mirar=[rio_sur[0] - 200, suelo(*rio_sur) + 80, rio_sur[1] + 300], parada=4))
# parada 5, servicios: en el patio, mirando al oeste, cañón abajo (por donde se pone el sol)
oeste = rio_xz[max(0, len(rio_xz) - 60)]
rail.append(rel(20, 6, 9, mirar=[oeste[0], suelo(*oeste) + 220, oeste[1]]))
rail.append(rel(11, 6, 4.5, mirar=[oeste[0], suelo(*oeste) + 160, oeste[1]], parada=5))
# parada 6, reservar: de noche, desde los bancales de abajo, la casa con las ventanas encendidas
rail.append(rel(-30, 40, 7, mh=6))
rail.append(rel(-44, 58, 8, mh=7, parada=6))
for r in rail:
    r['p'] = [round(v, 1) for v in r['p']]; r['m'] = [round(v, 1) for v in r['m']]

# ---------- 7. horizonte real desde el patio (plan B): ángulo de lo más alto, por acimut y por distancia ----------
eye = COTA + 4
ACIM = list(range(100, 262, 2))
BANDAS = ((25, 700), (700, 2600), (2600, 9000))
horizonte = []
for lim in BANDAS:
    fila = []
    for az in ACIM:
        a = math.radians(az); best = -30
        for d in np.arange(lim[0], lim[1], 12 if lim[0] < 700 else 30):
            x = cx + math.sin(a) * d; z = cz - math.cos(a) * d
            if abs(x) > ancho / 2 or abs(z) > alto / 2: break
            ang = math.degrees(math.atan2(cota_xz(x, z) - eye, d))
            best = max(best, ang)
        fila.append(round(best, 2))
    horizonte.append(fila)
# el río en la caja (u, v) para el trazo de la cortina
rio_uv = [[round(float(x / ancho + .5), 4), round(float(z / alto + .5), 4)] for x, z in rio_xz[::3]]

meta = {
    'caja': {'s': S, 'n': N, 'o': O, 'e': E}, 'ancho': round(ancho, 1), 'alto': round(alto, 1),
    'mallas': MALLAS, 'exageracion': EX, 'min': float(dem.min()), 'max': float(dem.max()),
    'casa': {'xz': [round(cx, 1), round(cz, 1)], 'cota': round(COTA, 1), 'latlon': list(CASA), 'solar': SOLAR},
    'detalle': {'lado': DET, 'n': DN_, 'centro': [round(cx, 1), round(cz, 1)]},
    'rail': rail, 'bancales': bancales, 'arboles': arboles, 'camino': camino,
    'horizonte': {'acimut': ACIM, 'bandas': horizonte},
    'rio_uv': rio_uv,
    'fuente': 'MDT05 y ortofoto PNOA © Instituto Geográfico Nacional (CC BY 4.0)',
}
(OUT / 'terreno.json').write_text(json.dumps(meta, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
# lo poco que necesita el plan B 2D (sin bajarse el JSON grande)
(OUT / 'horizonte.json').write_text(json.dumps({'horizonte': meta['horizonte'], 'fuente': meta['fuente']}, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
print('cota casa', COTA, '· raíl', len(rail), 'puntos · bancales', len(bancales), '· árboles', len(arboles))
for p in sorted(OUT.iterdir()): print(f'{p.name:28} {p.stat().st_size // 1024:6} KB')
