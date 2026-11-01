#!/usr/bin/env python3
"""images/ klasöründeki fotoğraflardan sitenin kullandığı suretleri üretir.

Çıktılar git dışındaki tools/gizli_kaynak/acik/suret/ altına gider. Yayına çıkmazlar:
ardından tools/gizli_uret.py bunları parolayla şifreleyip assets/r/ altına yazar.
  <ad>.png         1 bit Atkinson dither (mürekkep + kemik)
  renkli/<ad>.jpg  levhaya tıklayınca açılan aslı
  bugun.jpg        son bölümün tek renkli fotoğrafı
  avatar.png       kehanet sohbetinin küçük resmi
  kafa.png         oyundaki karakter modeli v0.1
  portre.jpg       kapüşonlu portre (gri)

Çalıştırma:  python3 tools/suret_uret.py && python3 tools/gizli_uret.py   (Pillow gerekir)
"""
from collections import deque
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageOps

KOK = Path(__file__).resolve().parent.parent
GIRDI = KOK / "images"
CIKTI = KOK / "tools" / "gizli_kaynak" / "acik" / "suret"
MUREKKEP = (10, 8, 7)
KAGIT = (217, 208, 186)


def yol(zaman):
    return GIRDI / f"WhatsApp Image 2026-11-01 at {zaman}.jpeg"


# ad, dosya, kırpma kutusu, gamma (küçük = aydınlık), kanal (None = gri, "r" = kırmızı)
LEVHALAR = [
    ("fresk", "01.03.53 (1)", (0, 430, 946, 1700), 1.0, None),
    ("cagri", "01.03.53", None, 0.9, None),
    ("temas", "01.03.54", (440, 190, 1240, 1010), 1.3, None),
    ("goruldu", "01.03.54 (1)", (440, 240, 1180, 1080), 1.3, None),
    ("build", "01.05.27", (0, 0, 1152, 1700), 1.0, None),
    ("kampus", "01.05.28", None, 1.25, None),
    ("net", "01.05.28 (1)", None, 1.0, None),
    ("gece", "01.05.28 (2)", (170, 30, 1000, 700), 0.85, "r"),
    ("model", "01.05.28 (3)", (150, 90, 640, 645), 1.25, None),
    ("el", "01.05.28 (4)", None, 1.0, None),
]
GENISLIK = 340

# Kampüs fotoğrafında arkadan geçen iki kişi: rıza vermediler, bulanıklaştırılır.
YABANCILAR = {"kampus": [(720, 225, 1075, 430)]}


def yabancilari_sil(ad, im):
    for kutu in YABANCILAR.get(ad, []):
        x0, y0, x1, y1 = kutu
        bolge = im.crop(kutu).filter(ImageFilter.GaussianBlur(26))
        maske = Image.new("L", (x1 - x0, y1 - y0), 0)
        ImageDraw.Draw(maske).rounded_rectangle(
            (12, 12, x1 - x0 - 12, y1 - y0 - 12), 30, fill=255
        )
        im.paste(bolge, (x0, y0), maske.filter(ImageFilter.GaussianBlur(10)))
    return im


def gri_hazirla(im, gamma, kanal=None, kirp=1.0):
    g = im.split()[0] if kanal == "r" else im.convert("L")
    g = ImageOps.autocontrast(g, cutoff=kirp)
    if gamma != 1.0:
        g = g.point([round(255 * (v / 255) ** gamma) for v in range(256)])
    return g


def atkinson(g):
    w, h = g.size
    p = [float(v) for v in g.tobytes()]
    cikis = bytearray(w * h)
    for y in range(h):
        for x in range(w):
            i = y * w + x
            yeni = 255 if p[i] >= 128 else 0
            hata = (p[i] - yeni) / 8
            cikis[i] = 1 if yeni else 0
            for dx, dy in ((1, 0), (2, 0), (-1, 1), (0, 1), (1, 1), (0, 2)):
                X, Y = x + dx, y + dy
                if 0 <= X < w and Y < h:
                    p[Y * w + X] += hata
    return cikis


def png_yaz(bitler, w, h, yolu):
    im = Image.frombytes("P", (w, h), bytes(bitler))
    im.putpalette(list(MUREKKEP) + list(KAGIT))
    im.save(yolu, optimize=True)


def levhalar():
    (CIKTI / "renkli").mkdir(parents=True, exist_ok=True)
    for ad, zaman, kutu, gamma, kanal in LEVHALAR:
        im = yabancilari_sil(ad, Image.open(yol(zaman)).convert("RGB"))
        if kutu:
            im = im.crop(kutu)
        h = round(im.size[1] * GENISLIK / im.size[0])
        kucuk = gri_hazirla(im, gamma, kanal).resize((GENISLIK, h), Image.LANCZOS)
        png_yaz(atkinson(kucuk), GENISLIK, h, CIKTI / f"{ad}.png")

        renkli = im.copy()
        renkli.thumbnail((1100, 1100), Image.LANCZOS)
        renkli.save(CIKTI / "renkli" / f"{ad}.jpg", quality=80, optimize=True, progressive=True)
        print(f"{ad:10} {GENISLIK}x{h}")


def portre():
    """Kapüşonlu fotoğraf: arka plan boyanır, yüz karanlıkta yüzer."""
    im = Image.open(yol("01.05.28 (5)")).convert("L")
    maske = Image.new("L", im.size, 255)
    ciz = ImageDraw.Draw(maske)
    ciz.polygon(
        [(0, 0), (720, 0), (720, 715), (636, 560), (556, 436), (486, 285), (452, 238),
         (250, 196), (196, 198), (0, 452)],
        fill=0,
    )
    ciz.polygon(
        [(720, 985), (640, 1090), (585, 1180), (540, 1240), (538, 1310), (600, 1390), (720, 1450)],
        fill=0,
    )
    # Kapüşonun sol kenarındaki ışık yalaması
    ciz.polygon([(0, 430), (60, 430), (64, 610), (0, 650)], fill=0)
    maske = maske.filter(ImageFilter.GaussianBlur(5))
    siyah = Image.new("L", im.size, 0)
    im = Image.composite(im, siyah, maske).crop((0, 130, 720, 1470))
    # Kapüşonun gölgelerini tam siyaha it, yüzün orta tonlarını kaldır.
    siyah_nokta, beyaz_nokta, gamma = 42, 205, 0.86
    im = im.point(
        [round(255 * (max(0, min(1, (v - siyah_nokta) / (beyaz_nokta - siyah_nokta)))) ** gamma)
         for v in range(256)]
    )
    im = im.resize((540, round(540 * im.size[1] / im.size[0])), Image.LANCZOS)
    im.save(CIKTI / "portre.jpg", "JPEG", quality=72, optimize=True)
    print(f"portre     {im.size[0]}x{im.size[1]}  {(CIKTI / 'portre.jpg').stat().st_size // 1024} KB")


def bugun():
    im = Image.open(yol("01.05.28 (6)")).convert("RGB").crop((130, 330, 1430, 1830))
    im.thumbnail((1000, 1000), Image.LANCZOS)
    im.save(CIKTI / "bugun.jpg", quality=82, optimize=True, progressive=True)
    print(f"bugun      {im.size[0]}x{im.size[1]}")


def avatar():
    im = Image.open(yol("01.03.54 (1)")).crop((545, 300, 1045, 800))
    k = gri_hazirla(im, 1.0).resize((88, 88), Image.LANCZOS)
    png_yaz(atkinson(k), 88, 88, CIKTI / "avatar.png")


def kafa():
    """Oyun karakteri: sopanın ucundaki kafa. Duvar sel dolgusuyla atılır, kafa eşiklenir."""
    im = Image.open(yol("01.05.28 (3)")).convert("L").crop((228, 136, 456, 444))
    g, y = 36, 48
    bulanik = im.resize((g, y), Image.LANCZOS).filter(ImageFilter.GaussianBlur(0.6)).tobytes()

    duvar = [False] * (g * y)
    kuyruk = deque([(i, 0) for i in range(g)] + [(0, j) for j in range(y)] + [(g - 1, j) for j in range(y)])
    while kuyruk:
        i, j = kuyruk.popleft()
        n = j * g + i
        if duvar[n] or bulanik[n] < 196:
            continue
        duvar[n] = True
        for a, b in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            if 0 <= i + a < g and 0 <= j + b < y:
                kuyruk.append((i + a, j + b))

    # Köşedeki gölge gibi kırıntılar kalmasın: yalnızca en büyük parça kafadır.
    gorulen, kafa_parca = set(), []
    for n in range(g * y):
        if duvar[n] or n in gorulen:
            continue
        parca, yigin = [], [n]
        gorulen.add(n)
        while yigin:
            m = yigin.pop()
            parca.append(m)
            for k in (m - 1 if m % g else -1, m + 1 if (m + 1) % g else -1, m - g, m + g):
                if 0 <= k < g * y and not duvar[k] and k not in gorulen:
                    gorulen.add(k)
                    yigin.append(k)
        if len(parca) > len(kafa_parca):
            kafa_parca = parca
    icinde = set(kafa_parca)

    ton = (
        ImageOps.autocontrast(im, cutoff=1)
        .resize((g, y), Image.LANCZOS)
        .filter(ImageFilter.UnsharpMask(1, 140, 0))
        .tobytes()
    )
    cikis = Image.new("RGBA", (g, y), (0, 0, 0, 0))
    pik = cikis.load()
    for j in range(y):
        for i in range(g):
            n = j * g + i
            if n in icinde:
                pik[i, j] = (*KAGIT, 255) if ton[n] > 92 else (*MUREKKEP, 255)
            elif any(
                0 <= i + a < g and 0 <= j + b < y and (j + b) * g + i + a in icinde
                for a, b in ((1, 0), (-1, 0), (0, 1), (0, -1))
            ):
                pik[i, j] = (*KAGIT, 255)
    cikis.save(CIKTI / "kafa.png", optimize=True)


if __name__ == "__main__":
    levhalar()
    portre()
    bugun()
    avatar()
    kafa()
