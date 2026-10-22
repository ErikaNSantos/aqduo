"""Recorta os ícones de classe (Terra, Fogo, Água, Mente, Todos) da folha de variações do emblema.

    python scripts/recortar_classes.py

Saídas em src/assets/classes/, com fundo transparente. Enquanto não houver arte dos
personagens, é o que aparece dentro do portal de cada escola.
"""
from pathlib import Path

import numpy as np
from PIL import Image

RAIZ = Path(__file__).resolve().parent.parent
FOLHA = RAIZ / "arte" / "emblema-scrips-variacoes.png"
SAIDA = RAIZ / "src" / "assets" / "classes"
CENTROS = {"terra": 137, "fogo": 292, "agua": 447, "mente": 602, "todos": 757}

SAIDA.mkdir(parents=True, exist_ok=True)
folha = Image.open(FOLHA).convert("RGB")
for nome, cx in CENTROS.items():
    parte = folha.crop((cx - 78, 932, cx + 78, 1092))
    rgb = np.asarray(parte, dtype=float)
    alfa = np.clip((rgb.max(axis=2) - 28) / 90, 0, 1)
    rgba = np.dstack([rgb, alfa * 255]).astype(np.uint8)
    Image.fromarray(rgba, "RGBA").resize((256, 262), Image.LANCZOS).save(SAIDA / f"{nome}.png", optimize=True)
print("ok")
