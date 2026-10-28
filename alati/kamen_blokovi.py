"""Feniks π: megalitni blokovi od vapnenca za ognjište na znaku.
Svaki blok je drukčije klesan: nepravilan, malo trapezast oblik, okrhnuti i istrošeni rubovi, pore i šupljinice,
slojevi taloga i okerske mrlje; osvijetljen odozgo toplim svjetlom vatre. Sprema RGBA PNG u assets/logo/kamen-blok-N.png.
Pokretanje: python kamen_blokovi.py [broj_blokova]"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image

S = 400                                                     # piksela po bloku (blok na znaku ~170 px, dvostruko i više za oštrinu)
IZLAZ = Path(__file__).resolve().parent.parent / "assets" / "logo"


def sum_sloj(rng, n):
    """Glatki šum: nasumična mreža n×n bikubično razvučena na S×S, vrijednosti 0..1."""
    m = Image.fromarray(rng.random((n, n)).astype(np.float32), mode="F").resize((S, S), Image.BICUBIC)
    return np.asarray(m)


def fbm(rng, oktave):
    """Zbroj slojeva šuma (od grubog prema finom), normaliziran na 0..1."""
    z, tez = np.zeros((S, S), np.float32), 0.0
    for i, n in enumerate(oktave):
        w = 0.55 ** i
        z += w * sum_sloj(rng, n); tez += w
    z /= tez
    return (z - z.min()) / (z.max() - z.min() + 1e-9)


def blok(seme):
    rng = np.random.default_rng(seme)
    yy, xx = np.mgrid[-1:1:S * 1j, -1:1:S * 1j].astype(np.float32)

    # oblik: zaobljeni kvadrat, malo trapezast i nagnut, s grubim klesanim rubom
    nagib = rng.uniform(-0.05, 0.05)
    px = xx * (1 + rng.uniform(-0.06, 0.06) * yy) + nagib * yy
    py = yy + nagib * 0.5 * xx
    b, r = 0.80, 0.30
    qx, qy = np.abs(px) - b + r, np.abs(py) - b + r
    d = np.hypot(np.maximum(qx, 0), np.maximum(qy, 0)) + np.minimum(np.maximum(qx, qy), 0) - r
    d += 0.07 * (fbm(rng, [3, 6]) - 0.5) + 0.02 * (fbm(rng, [20, 40]) - 0.5)
    for _ in range(rng.integers(2, 5)):                     # ravno odlomljeni kutovi i bridovi, kao kod klesanja
        a = rng.choice([0.25, 0.75, 1.25, 1.75]) * np.pi + rng.uniform(-0.35, 0.35)
        d = np.maximum(d, px * np.cos(a) + py * np.sin(a) - rng.uniform(0.86, 1.0))
    alfa = np.clip(-d * S / 2 + 0.5, 0, 1)

    # visina: istrošeni zaobljeni rubovi, neravna klesana ploha, pore i šupljinice
    unutra = np.clip(-d / 0.32, 0, 1)
    rub = unutra * unutra * (3 - 2 * unutra)
    grubo, srednje, fino = fbm(rng, [4, 7]), fbm(rng, [14, 28]), fbm(rng, [60, 120, 200])
    pore = np.clip((fbm(rng, [36, 72]) - 0.74) / 0.07, 0, 1) * np.clip((fbm(rng, [8, 16]) - 0.45) / 0.3, 0, 1)
    h = rub * 0.8 + 0.16 * grubo + 0.05 * srednje + 0.018 * fino - 0.07 * pore

    gy, gx = np.gradient(h)
    k = S * 0.55
    nx, ny, nz = -gx * k, -gy * k, np.ones_like(h)
    dn = np.sqrt(nx * nx + ny * ny + nz * nz); nx, ny, nz = nx / dn, ny / dn, nz / dn
    L = np.array([0.15, -0.72, 0.68]); L /= np.linalg.norm(L)       # svjetlo odozgo (od vatre), malo slijeva
    svjetlo = np.clip(nx * L[0] + ny * L[1] + nz * L[2], 0, 1)

    # boja vapnenca: toplo bež do sivo, slojevi taloga, okerske mrlje, tamnije pore
    svijetli, tamni = np.array([222, 211, 186], np.float32), np.array([168, 157, 136], np.float32)
    t = (0.55 * grubo + 0.45 * srednje)[..., None]
    boja = svijetli * (1 - t) + tamni * t
    slojevi = 0.5 + 0.5 * np.sin(yy * rng.uniform(16, 26) + 4 * grubo + rng.uniform(0, 6))
    boja *= (1 - 0.05 * slojevi)[..., None]
    mrlja = np.clip((fbm(rng, [6, 12]) - 0.62) / 0.2, 0, 1)[..., None] * 0.45
    boja = boja * (1 - mrlja) + np.array([196, 150, 92], np.float32) * mrlja
    boja *= (1 - 0.38 * pore)[..., None]
    boja *= (0.88 + 0.24 * fino)[..., None]                  # zrnatost

    # osvjetljenje: ambijent + difuzno, rubovi u sjeni, gornji dio topliji od vatre
    sjena_ruba = 0.62 + 0.38 * rub
    osv = (0.32 + 0.85 * svjetlo) * sjena_ruba
    gore = np.clip(0.5 - yy * 0.5, 0, 1)[..., None]
    vatra = np.array([1.0, 0.86, 0.66], np.float32) * gore * 0.35 + (1 - gore * 0.35)
    rgb = np.clip(boja * osv[..., None] * vatra * np.array([1.06, 1.0, 0.94]), 0, 255)

    return Image.fromarray(np.dstack([rgb, alfa * 255]).astype(np.uint8), "RGBA")


if __name__ == "__main__":
    n = int(sys.argv[1]) if len(sys.argv) > 1 else 7
    for i in range(n):
        blok(1980 + i * 37).save(IZLAZ / f"kamen-blok-{i + 1}.png")
    print(f"spremljeno {n} blokova u {IZLAZ}")
