"""Gera as imagens do Terreno Suspenso a partir do emblema dos Scrips.

    python scripts/gerar_terreno.py

Saídas em src/assets/terreno/:
  altura.png  mapa de altura (claro = alto), lido pelo MundoOrdem.jsx
  cor.jpg     cor do terreno (rocha, musgo, água, bronze no emblema)
  brilho.png  onde o Metrito brilha (o emblema)
e src/assets/emblema.png, o símbolo recortado com fundo transparente.
"""
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

RAIZ = Path(__file__).resolve().parent.parent
ORIGEM = RAIZ / "arte" / "emblema-scrips.png"
SAIDA = RAIZ / "src" / "assets" / "terreno"
N = 1024
rng = np.random.default_rng(7)


def ruido(oitavas=6, base=4, ganho=0.5):
    """fbm entre 0 e 1: grades aleatórias ampliadas e somadas."""
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


# Emblema: recorta o símbolo (sem o texto "SCRIPS") e faz a máscara
fonte = Image.open(ORIGEM).convert("RGB")
simbolo = fonte.crop((180, 80, 840, 1160))
lum = np.asarray(simbolo.convert("L"), dtype=float)

alfa = np.clip((lum - 30) / 120, 0, 1)
rgba = np.dstack([np.asarray(simbolo), (alfa * 255).astype(np.uint8)])
emblema = Image.fromarray(rgba, "RGBA")
emblema.resize((330, 540), Image.LANCZOS).save(RAIZ / "src" / "assets" / "emblema.png", optimize=True)

alt_emb = 660
larg_emb = round(alt_emb * simbolo.width / simbolo.height)
masc_img = Image.fromarray((lum > 35).astype(np.uint8) * 255).filter(ImageFilter.GaussianBlur(2.5))
masc_img = masc_img.point(lambda v: 255 if v > 70 else 0).resize((larg_emb, alt_emb), Image.LANCZOS)
masc = np.zeros((N, N))
x0, y0 = (N - larg_emb) // 2, (N - alt_emb) // 2
masc[y0 : y0 + alt_emb, x0 : x0 + larg_emb] = np.asarray(masc_img, dtype=float) / 255

# Coordenadas radiais da ilha
yy, xx = np.mgrid[0:N, 0:N]
r = np.hypot(xx - N / 2, yy - N / 2) / (N / 2)
ang = np.arctan2(yy - N / 2, xx - N / 2)

# Relevo
planalto = 0.42 + (ruido(6, 4) - 0.5) * 0.12
cristas = (1 - np.abs(ruido(7, 3) * 2 - 1)) * 0.6 + (1 - np.abs(ruido(5, 16) * 2 - 1)) * 0.4  # ruído "ridged", parece erosão
montanhas = suave(0.55, 0.92, r + (ruido(4, 3) - 0.5) * 0.25) * (0.25 + 0.45 * cristas**2)
# Lago em volta do emblema; o emblema fica pouco acima da água, como ilhas
lago = suave(0.02, 0.12, borrar(masc, 34))
emb_suave = borrar(masc, 1.2)
altura = (planalto + montanhas) * (1 - lago) + 0.29 * lago
altura = altura * (1 - emb_suave) + (0.385 + borrar(masc, 4) * 0.03) * emb_suave
borda = 1 - suave(0.9, 1.0, r + (ruido(4, 6) - 0.5) * 0.08)
altura = np.clip(altura * borda, 0, 1)

SAIDA.mkdir(parents=True, exist_ok=True)
Image.fromarray((altura * 255).astype(np.uint8)).save(SAIDA / "altura.png", optimize=True)

# Cor
def cor(hexa):
    return np.array([int(hexa[i : i + 2], 16) for i in (1, 3, 5)], dtype=float) / 255

agua = cor("#0c1c24")
musgo = cor("#2a4636")
rocha = cor("#3a4c55")
pico = cor("#6e8490")
bronze = cor("#5a4a2e")
var = ruido(6, 8)[..., None]
c = np.broadcast_to(musgo, (N, N, 3)) * (0.75 + 0.5 * var)
c = c * (1 - suave(0.5, 0.62, altura)[..., None]) + rocha * (0.8 + 0.4 * var) * suave(0.5, 0.62, altura)[..., None]
c = c * (1 - suave(0.68, 0.85, altura)[..., None]) + pico * suave(0.68, 0.85, altura)[..., None]
molhado = suave(0.36, 0.3, altura)[..., None]
c = c * (1 - molhado) + agua * molhado
emb = borrar(masc, 2)[..., None]
c = c * (1 - emb) + bronze * (0.8 + 0.4 * var) * emb
Image.fromarray((np.clip(c, 0, 1) * 255).astype(np.uint8)).save(SAIDA / "cor.jpg", quality=86)

brilho = np.clip(borrar(masc, 1.5) * 0.9 + borrar(masc, 10) * 0.35, 0, 1)
Image.fromarray((brilho * 255).astype(np.uint8)).save(SAIDA / "brilho.png", optimize=True)
print("ok")
