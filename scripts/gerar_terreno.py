"""Gera as imagens do Terreno Suspenso a partir do emblema de A Ordem (a lua rachada).

    python scripts/gerar_terreno.py

Saídas:
  src/assets/terreno/altura.png  mapa de altura (claro = alto), lido pelo MundoOrdem.jsx
  src/assets/terreno/cor.jpg     cor do terreno, nos tons da arte (osso sobre rocha escura)
  src/assets/terreno/brilho.png  onde o Metrito brilha (a fenda e a cratera)
  src/assets/emblema.png         o símbolo recortado, para o menu
  src/assets/emblema-titulo.png  o símbolo com "A ORDEM", para a tela de entrada
"""
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

RAIZ = Path(__file__).resolve().parent.parent
ORIGEM = RAIZ / "arte" / "emblema-ordem.png"
SAIDA = RAIZ / "src" / "assets" / "terreno"
N = 1024
rng = np.random.default_rng(7)

# Onde a lua está na arte original (440 × 616)
CX, CY, RAIO = 219, 290, 111
FENDA_X = (200, 266)  # faixa onde corre a rachadura


def ruido(oitavas=6, base=4, ganho=0.5):
    total = np.zeros((N, N))
    amp, soma = 1.0, 0.0
    for o in range(oitavas):
        n = base * 2**o
        grade = Image.fromarray((rng.random((n, n)) * 255).astype(np.uint8))
        total += amp * np.asarray(grade.resize((N, N), Image.BICUBIC), dtype=float) / 255
        soma += amp
        amp *= ganho
    return total / soma


def borrar(a, raio):
    im = Image.fromarray(np.clip(a * 255, 0, 255).astype(np.uint8))
    return np.asarray(im.filter(ImageFilter.GaussianBlur(raio)), dtype=float) / 255


def suave(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def recorte_transparente(img, caixa, altura):
    parte = img.crop(caixa)
    lum = np.asarray(parte.convert("L"), dtype=float)
    alfa = np.clip((lum - 40) / 110, 0, 1)
    rgba = np.dstack([np.asarray(parte), (alfa * 255).astype(np.uint8)])
    largura = round(altura * parte.width / parte.height)
    return Image.fromarray(rgba, "RGBA").resize((largura, altura), Image.LANCZOS)


fonte = Image.open(ORIGEM).convert("RGB")
recorte_transparente(fonte, (95, 60, 345, 430), 300).save(RAIZ / "src" / "assets" / "emblema.png", optimize=True)
recorte_transparente(fonte, (40, 60, 400, 530), 560).save(RAIZ / "src" / "assets" / "emblema-titulo.png", optimize=True)

# A lua ocupa a ilha inteira: amplia o disco para N × N
escala = (N / 2 * 0.94) / RAIO
lado = round(N / escala)
caixa = (CX - lado // 2, CY - lado // 2, CX - lado // 2 + lado, CY - lado // 2 + lado)
lua = fonte.convert("L").crop(caixa).resize((N, N), Image.BICUBIC)
lum = np.asarray(lua.filter(ImageFilter.GaussianBlur(1.5)), dtype=float) / 255

yy, xx = np.mgrid[0:N, 0:N]
r = np.hypot(xx - N / 2, yy - N / 2) / (N / 2 * 0.94)

# Rachadura: as partes claras dentro da faixa central da arte
x_arte = caixa[0] + xx / escala
faixa = suave(FENDA_X[0] - 6, FENDA_X[0] + 4, x_arte) * (1 - suave(FENDA_X[1] - 4, FENDA_X[1] + 6, x_arte))
fenda = np.clip(borrar((lum > 0.55) * faixa, 7) * 1.5, 0, 1)

# Cratera no centro da rachadura
cx_c, cy_c = N / 2, N / 2 - 0.045 * N / 2 * 0.94
rc = np.hypot(xx - cx_c, yy - cy_c) / (N * 0.085)
cratera = np.exp(-(rc**2) * 1.6)

# Relevo: planalto com a textura da lua, borda levantada, fenda funda
textura = borrar(lum, 5) - borrar(lum, 28)
planalto = 0.5 + textura * 0.14 + (ruido(6, 5) - 0.5) * 0.05
borda_alta = np.exp(-(((r - 0.93) / 0.05) ** 2)) * 0.1
altura = planalto + borda_alta
altura = altura * (1 - fenda) + (0.3 + ruido(5, 12) * 0.03) * fenda
altura = altura * (1 - cratera * 0.8) + 0.26 * cratera * 0.8
queda = 1 - suave(0.97, 1.03, r + (ruido(4, 8) - 0.5) * 0.04)
altura = np.clip(altura * queda, 0, 1)

SAIDA.mkdir(parents=True, exist_ok=True)
Image.fromarray((altura * 255).astype(np.uint8)).save(SAIDA / "altura.png", optimize=True)


def cor(hexa):
    return np.array([int(hexa[i : i + 2], 16) for i in (1, 3, 5)], dtype=float) / 255


escuro = cor("#1f1d1a")
osso = cor("#b9ab90")
fundo_fenda = cor("#2a1f12")
var = ruido(6, 10)[..., None]
claro = suave(0.25, 0.75, lum)[..., None]
c = escuro * (1 - claro) + osso * claro
c = c * (0.85 + 0.3 * var)
f = np.clip(fenda + cratera * 0.8, 0, 1)[..., None]
c = c * (1 - f) + fundo_fenda * f
Image.fromarray((np.clip(c, 0, 1) * 255).astype(np.uint8)).save(SAIDA / "cor.jpg", quality=86)

brilho = np.clip(suave(0.55, 0.95, fenda) * 0.9 + cratera * 0.7, 0, 1) * queda
Image.fromarray((brilho * 255).astype(np.uint8)).save(SAIDA / "brilho.png", optimize=True)
print("ok")
