"""Gera o terreno da abertura a partir do relevo real da Serra da Cangalha (TO).

    python scripts/gerar_terreno.py

A Serra da Cangalha é uma cratera de impacto de ~13 km no Tocantins. O relevo vem
dos Terrain Tiles abertos da AWS (zoom 12, ~38 m por pixel) e as cores misturam
fotos aéreas CC0 do Poly Haven (arte/texturas/) pela altura e pela inclinação.

Antes do impacto, a cratera não existe: o relevo "de antes" troca a região da
cratera pelo relevo real de uma área vizinha do mesmo cerrado (~30 km a leste),
com uma transição suave até o relevo real. Na abertura, a onda de choque do
impacto transforma um no outro.

Saídas em src/assets/terreno/:
  relevo.png        altura em 16 bits (R = byte alto, G = byte baixo), lida pelo MundoOrdem.jsx
  relevo-antes.png  a mesma coisa, antes do impacto
  cor.jpg           cor do chão
  cor-antes.jpg     cor do chão antes do impacto
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
CACHE_VIZINHO = RAIZ / "arte" / "relevo-vizinho.npy"
TEXTURAS = RAIZ / "arte" / "texturas"
SAIDA = RAIZ / "src" / "assets" / "terreno"
LAT, LON, ZOOM = -8.083, -46.867, 12
LON_VIZINHO = LON + 0.3  # área vizinha, sem cratera, usada para o relevo de antes do impacto
LADO = 1024  # pixels de relevo usados (~38,7 km)


def baixar_relevo(lat=LAT, lon=LON, cache=CACHE):
    if cache.exists():
        return np.load(cache)
    n = 2**ZOOM
    fx = (lon + 180) / 360 * n
    fy = (1 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2 * n
    x0, y0 = int(fx) - 2, int(fy) - 2
    dem = np.zeros((5 * 256, 5 * 256))
    for i in range(5):
        for j in range(5):
            url = f"https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{ZOOM}/{x0 + i}/{y0 + j}.png"
            a = np.asarray(Image.open(io.BytesIO(urllib.request.urlopen(url).read())).convert("RGB"), dtype=float)
            dem[j * 256 : (j + 1) * 256, i * 256 : (i + 1) * 256] = a[..., 0] * 256 + a[..., 1] + a[..., 2] / 256 - 32768
    cx, cy = round((fx - x0) * 256), round((fy - y0) * 256)
    dem = dem[cy - LADO // 2 : cy + LADO // 2, cx - LADO // 2 : cx + LADO // 2]
    cache.parent.mkdir(exist_ok=True)
    np.save(cache, dem)
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

# Antes do impacto: dentro de ~9 km do centro entra o relevo vizinho, nivelado com o
# de fora pela média do anel de transição
vizinho = borrar(baixar_relevo(LAT, LON_VIZINHO, CACHE_VIZINHO), 1.2)
km_por_px = m_por_px / 1000
r_km = np.hypot(xx - ccx, yy - ccy) * km_por_px
fora = suave(8.0, 12.0, r_km)
anel_transicao = (r_km > 8.0) & (r_km < 12.0)
vizinho = vizinho + (liso[anel_transicao].mean() - vizinho[anel_transicao].mean())
antes = vizinho * (1 - fora) + liso * fora

lo, hi = float(min(liso.min(), antes.min())), float(max(liso.max(), antes.max()))
SAIDA.mkdir(parents=True, exist_ok=True)


def salvar_relevo(relevo, nome):
    # A malha do site tem no máximo ~256 divisões, então 512 px de relevo bastam
    pequeno = np.asarray(Image.fromarray(relevo.astype(np.float32)).resize((512, 512), Image.BILINEAR), dtype=float)
    q = ((pequeno - lo) / (hi - lo) * 65535).clip(0, 65535).astype(np.uint16)
    rgb = np.dstack([(q >> 8).astype(np.uint8), (q & 255).astype(np.uint8), np.zeros_like(q, dtype=np.uint8)])
    Image.fromarray(rgb, "RGB").save(SAIDA / nome, optimize=True)


salvar_relevo(liso, "relevo.png")
salvar_relevo(antes, "relevo-antes.png")

manchas = manchas2 = None


def colorir(relevo, N, centro_do_impacto):
    """Cor do chão: vegetação nos platôs, rocha nas encostas, terra em manchas, mata nos vales."""
    global manchas, manchas2
    gy, gx = np.gradient(relevo, m_por_px)
    inclin = np.hypot(gx, gy)
    relativo = relevo - borrar(relevo, 25)

    def amp(a):
        return np.asarray(Image.fromarray(a.astype(np.float32)).resize((N, N), Image.BILINEAR), dtype=float)

    inclin_n, rel_n, alt_n = amp(inclin), amp(relativo), amp((relevo - lo) / (hi - lo))
    semente = np.random.default_rng(7)
    manchas = amp(borrar(semente.random((LADO, LADO)), 12))
    manchas = (manchas - manchas.min()) / (manchas.max() - manchas.min())
    manchas2 = amp(borrar(semente.random((LADO, LADO)), 20))
    manchas2 = (manchas2 - manchas2.min()) / (manchas2.max() - manchas2.min())

    def mistura(nome, rep_a, rep_b):
        """Duas escalas da mesma foto misturadas por manchas, para esconder a repetição."""
        return ladrilho(nome, N, rep_a) * (1 - manchas[..., None]) + ladrilho(nome, N, rep_b) * manchas[..., None]

    escala = N / 2048  # menos repetições numa imagem menor, para a foto ter o mesmo tamanho no chão
    rep = lambda r: max(2, round(r * escala))
    grama = mistura("aerial_grass_rock", rep(23), rep(9))
    grama = grama * 0.7 + grama.mean(axis=2, keepdims=True) * 0.3  # menos saturada
    rocha = mistura("aerial_rocks_02", rep(31), rep(11))
    terra = mistura("dirt_aerial_02", rep(19), rep(7))

    p_rocha = suave(0.05, 0.14, inclin_n)
    p_terra = suave(0.4, 0.7, manchas2) * (1 - p_rocha) * suave(0.02, 0.07, inclin_n + 0.01)
    p_vale = suave(-2, -12, rel_n) * (1 - p_rocha)  # mata de galeria nos fundos de vale
    cor = grama * 0.85
    cor = cor * (1 - p_terra[..., None]) + terra * p_terra[..., None]
    cor = cor * (1 - p_rocha[..., None]) + rocha * p_rocha[..., None]
    mata = np.array([0.12, 0.17, 0.08])
    cor = cor * (1 - p_vale[..., None] * 0.7) + mata * p_vale[..., None] * 0.7
    cor *= (0.85 + 0.3 * alt_n)[..., None]

    if centro_do_impacto:
        # Centro do impacto: chão seco e queimado
        chao = mistura("aerial_ground_rock", rep(27), rep(10))
        k = LADO / N
        rc_n = np.hypot(np.arange(N)[None, :] * k - ccx, np.arange(N)[:, None] * k - ccy)
        centro = 1 - suave(r_anel * 0.6, r_anel * 1.15, rc_n)
        cor = cor * (1 - centro[..., None] * 0.8) + chao * 0.55 * centro[..., None] * 0.8
    return cor


Image.fromarray((np.clip(colorir(liso, 2048, True), 0, 1) * 255).astype(np.uint8)).save(SAIDA / "cor.jpg", quality=84)
Image.fromarray((np.clip(colorir(antes, 1024, False), 0, 1) * 255).astype(np.uint8)).save(SAIDA / "cor-antes.jpg", quality=84)

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
