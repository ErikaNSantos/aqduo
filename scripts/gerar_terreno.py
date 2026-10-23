"""Gera o terreno da abertura a partir do relevo real da Serra da Cangalha (TO).

    python scripts/gerar_terreno.py

A Serra da Cangalha é uma cratera de impacto de ~13 km no Tocantins. O relevo vem
dos Terrain Tiles abertos da AWS (zoom 12, ~38 m por pixel) e as cores misturam
fotos aéreas CC0 do Poly Haven (arte/texturas/) pela altura e pela inclinação.

Saídas em src/assets/terreno/:
  relevo.png  altura em 16 bits (R = byte alto, G = byte baixo), lida pelo MundoOrdem.jsx
  cor.jpg     cor do chão
  normal.jpg  detalhe fino do relevo (mapa de normais)
  brilho.png  onde o Metrito brilha: o centro do impacto
  info.json   tamanho em km, faixa de altitude e posição do centro
"""
import io
import json
import math
import urllib.request
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

RAIZ = Path(__file__).resolve().parent.parent
CACHE = RAIZ / "arte" / "relevo-cangalha.npy"
TEXTURAS = RAIZ / "arte" / "texturas"
SAIDA = RAIZ / "src" / "assets" / "terreno"
LAT, LON, ZOOM = -8.083, -46.867, 12
LADO = 1024  # pixels de relevo usados (~38,7 km)
rng = np.random.default_rng(7)


def baixar_relevo():
    if CACHE.exists():
        return np.load(CACHE)
    n = 2**ZOOM
    fx = (LON + 180) / 360 * n
    fy = (1 - math.asinh(math.tan(math.radians(LAT))) / math.pi) / 2 * n
    x0, y0 = int(fx) - 2, int(fy) - 2
    dem = np.zeros((5 * 256, 5 * 256))
    for i in range(5):
        for j in range(5):
            url = f"https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{ZOOM}/{x0 + i}/{y0 + j}.png"
            a = np.asarray(Image.open(io.BytesIO(urllib.request.urlopen(url).read())).convert("RGB"), dtype=float)
            dem[j * 256 : (j + 1) * 256, i * 256 : (i + 1) * 256] = a[..., 0] * 256 + a[..., 1] + a[..., 2] / 256 - 32768
    cx, cy = round((fx - x0) * 256), round((fy - y0) * 256)
    dem = dem[cy - LADO // 2 : cy + LADO // 2, cx - LADO // 2 : cx + LADO // 2]
    CACHE.parent.mkdir(exist_ok=True)
    np.save(CACHE, dem)
    return dem


def _caixa(a, r, eixo):
    """Média móvel de largura 2r+1 ao longo de um eixo, com borda repetida."""
    pad = [(0, 0)] * a.ndim
    pad[eixo] = (r + 1, r)
    c = np.cumsum(np.pad(a, pad, mode="edge"), axis=eixo)
    n = a.shape[eixo]
    fim = np.take(c, range(2 * r + 1, 2 * r + 1 + n), axis=eixo)
    ini = np.take(c, range(0, n), axis=eixo)
    return (fim - ini) / (2 * r + 1)


def borrar(a, raio):
    """Desfoque quase gaussiano: três passadas de média móvel em cada eixo."""
    r = max(1, round(raio * 0.9))
    for _ in range(3):
        a = _caixa(_caixa(a, r, 0), r, 1)
    return a


def suave(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def ladrilho(nome, n, repeticoes):
    """Textura repetida `repeticoes` vezes num quadro n × n."""
    t = Image.open(TEXTURAS / f"{nome}.jpg").convert("RGB").resize((n // repeticoes,) * 2, Image.LANCZOS)
    a = np.asarray(t, dtype=float) / 255
    return np.tile(a, (repeticoes + 1, repeticoes + 1, 1))[:n, :n]


dem = baixar_relevo()
m_por_px = 156543.03 * math.cos(math.radians(LAT)) / 2**ZOOM
km = LADO * m_por_px / 1000

# Centro do impacto: o anel central é o ponto mais alto perto do meio
yy, xx = np.mgrid[0:LADO, 0:LADO]
perto = np.hypot(xx - LADO / 2, yy - LADO / 2) < 90
alto = perto & (dem > np.percentile(dem[perto], 92))
ccx, ccy = xx[alto].mean(), yy[alto].mean()
r_c = np.hypot(xx - ccx, yy - ccy)
perfil = [dem[(r_c >= k) & (r_c < k + 1)].mean() for k in range(10, 90)]
r_anel = 10 + int(np.argmax(perfil))

# Relevo em 16 bits, já suavizado para não marcar os pixels de 38 m
liso = borrar(dem, 1.2)
lo, hi = float(liso.min()), float(liso.max())
# A malha do site tem no máximo ~256 divisões, então 512 px de relevo bastam
pequeno = np.asarray(Image.fromarray(liso.astype(np.float32)).resize((512, 512), Image.BILINEAR), dtype=float)
q = ((pequeno - lo) / (hi - lo) * 65535).clip(0, 65535).astype(np.uint16)
SAIDA.mkdir(parents=True, exist_ok=True)
Image.fromarray(np.dstack([(q >> 8).astype(np.uint8), (q & 255).astype(np.uint8), np.zeros_like(q, dtype=np.uint8)]), "RGB").save(
    SAIDA / "relevo.png", optimize=True
)

# Inclinação e posição relativa (vale × topo) para escolher as texturas
gy, gx = np.gradient(liso, m_por_px)
inclin = np.hypot(gx, gy)
relativo = liso - borrar(liso, 25)

N = 2048
amp = lambda a: np.asarray(Image.fromarray(a.astype(np.float32)).resize((N, N), Image.BILINEAR), dtype=float)
inclin_n, rel_n, alt_n = amp(inclin), amp(relativo), amp((liso - lo) / (hi - lo))
manchas = amp(borrar(rng.random((LADO, LADO)), 12))
manchas = (manchas - manchas.min()) / (manchas.max() - manchas.min())
manchas2 = amp(borrar(rng.random((LADO, LADO)), 20))
manchas2 = (manchas2 - manchas2.min()) / (manchas2.max() - manchas2.min())

def mistura(nome, rep_a, rep_b):
    """Duas escalas da mesma foto misturadas por manchas, para esconder a repetição."""
    return ladrilho(nome, N, rep_a) * (1 - manchas[..., None]) + ladrilho(nome, N, rep_b) * manchas[..., None]


grama = mistura("aerial_grass_rock", 23, 9)
grama = grama * 0.7 + grama.mean(axis=2, keepdims=True) * 0.3  # menos saturada
rocha = mistura("aerial_rocks_02", 31, 11)
terra = mistura("dirt_aerial_02", 19, 7)
chao = mistura("aerial_ground_rock", 27, 10)

p_rocha = suave(0.05, 0.14, inclin_n)
p_terra = suave(0.4, 0.7, manchas2) * (1 - p_rocha) * suave(0.02, 0.07, inclin_n + 0.01)
p_vale = suave(-2, -12, rel_n) * (1 - p_rocha)  # mata de galeria nos fundos de vale
cor = grama * 0.85
cor = cor * (1 - p_terra[..., None]) + terra * p_terra[..., None]
cor = cor * (1 - p_rocha[..., None]) + rocha * p_rocha[..., None]
mata = np.array([0.12, 0.17, 0.08])
cor = cor * (1 - p_vale[..., None] * 0.7) + mata * p_vale[..., None] * 0.7
cor *= (0.85 + 0.3 * alt_n)[..., None]

# Centro do impacto: chão seco e queimado
rc_n = np.hypot(np.linspace(0, LADO, N)[None, :] - ccx, np.linspace(0, LADO, N)[:, None] - ccy)
centro = 1 - suave(r_anel * 0.6, r_anel * 1.15, rc_n)
cor = cor * (1 - centro[..., None] * 0.8) + chao * 0.55 * centro[..., None] * 0.8
Image.fromarray((np.clip(cor, 0, 1) * 255).astype(np.uint8)).save(SAIDA / "cor.jpg", quality=84)

# Normal de detalhe (só o relevo fino; a forma grande vem da geometria)
detalhe = liso - borrar(liso, 3)
dy, dx = np.gradient(detalhe * 0.06)
nrm = np.dstack([-dx, -dy, np.ones_like(dx)])
nrm /= np.linalg.norm(nrm, axis=2, keepdims=True)
Image.fromarray(((nrm * 0.5 + 0.5) * 255).astype(np.uint8)).save(SAIDA / "normal.jpg", quality=88)

# Brilho do Metrito: a bacia dentro do anel central e veios descendo pelos vales próximos
r_px = np.hypot(xx - ccx, yy - ccy)
bacia = 1 - suave(r_anel * 0.55, r_anel * 1.0, r_px)
fino = liso - borrar(liso, 4)
veios = suave(-2.5, -7, fino) * (1 - suave(r_anel * 1.2, r_anel * 4, r_px))
brilho = np.clip(bacia * 0.9 + veios * 0.22, 0, 1)
Image.fromarray((borrar(brilho, 1.5).clip(0, 1) * 255).astype(np.uint8)).save(SAIDA / "brilho.png", optimize=True)

info = {
    "km": round(km, 2),
    "altitude_min": round(lo, 1),
    "altitude_max": round(hi, 1),
    "centro": [round(float(ccx) / LADO, 4), round(float(ccy) / LADO, 4)],
    "raio_anel": round(r_anel / LADO, 4),
}
(SAIDA / "info.json").write_text(json.dumps(info, indent=2))
print(info)
