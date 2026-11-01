#!/usr/bin/env python3
"""Kamera odasının görsellerini birleştirir: boş sahneye yüzsüz figür, sonra ucuz kamera görünümü.

Yapay zekâ çalışmaz, ekran kartı gerekmez. Girdi gorsel_uret.py çıktıları:

    python tools/kamera_bile.py <sahne_klasoru> <figur.png> <assets/kamera>

Sahne klasöründe c01.png ... c15.png (896×672) durur. Figür düz arka planlı tam boy bir fotoğraftır;
yüzü burada silinir: hiçbir sahnede yüz yoktur, kapüşonun içi karadır, iki küçük parıltı gözlüktür.
"""
import argparse
import os

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

# ad: (ayak x, ayak y, boy) 896×672 üzerinde. Son alan: görünmeyen bölgeyi veren işlev.
YERLER = {
    'c01_uzak': (590, 425, 150), 'c01_yakin': (400, 610, 440),
    'c04_uzak': (450, 480, 120), 'c04_yakin': (450, 660, 430),
    'c05_uzak': (440, 525, 330), 'c05_yakin': (440, 770, 720),
    'c07_uzak': (445, 420, 200), 'c07_yakin': (400, 640, 480),
    'c09_uzak': (450, 590, 400), 'c09_yakin': (450, 800, 800),
    'c10_uzak': (430, 525, 330), 'c10_yakin': (430, 800, 760),
    'c12_uzak': (430, 520, 430), 'c12_yakin': (430, 830, 950),
    'c13_uzak': (430, 625, 470), 'c13_yakin': (640, 800, 800),
    'c15_uzak': (815, 430, 300), 'c15_yakin': (600, 610, 1500),
    'c02_x': (410, 395, 200), 'c06_x': (560, 400, 230), 'c08_x': (445, 430, 220),
}
BOSLAR = ['c%02d' % i for i in range(1, 16)]


def figur_ayir(yol):
    """Düz arka planlı fotoğraftan figür: her satırın arka planı kenarlardan tahmin edilir."""
    im = Image.open(yol).convert('L')
    a = np.asarray(im, dtype=np.float32)
    H, W = a.shape
    sol = a[:, :36].mean(axis=1)
    sag = a[:, W - 36:].mean(axis=1)
    t = np.linspace(0, 1, W)[None, :]
    arka = sol[:, None] * (1 - t) + sag[:, None] * t
    yy = np.mgrid[0:H, 0:W][0]
    # Giysi: arka plandan belirgin koyu. El ve yüz: arka plandan belirgin açık, ama zemin hizasının üstünde.
    koyu = a < np.minimum(arka * 0.62, 46)
    acik = (a > arka + 30) & (yy < H * 0.84)
    on = koyu | acik
    # Delikleri doldur: kenardan ulaşılamayan her yer figürdür.
    dis = np.zeros_like(on)
    dis[0, :] = ~on[0, :]
    dis[:, 0] |= ~on[:, 0]
    dis[:, -1] |= ~on[:, -1]
    while True:
        y = dis.copy()
        y[1:, :] |= dis[:-1, :]
        y[:-1, :] |= dis[1:, :]
        y[:, 1:] |= dis[:, :-1]
        y[:, :-1] |= dis[:, 1:]
        y &= ~on
        if (y == dis).all():
            break
        dis = y
    ic = ~dis
    # En büyük parça: tabandaki parlak zemin kırıntıları gitsin.
    sutun = ic.sum(axis=0)
    ic[:, sutun < H * 0.02] = False
    alfa = Image.fromarray((ic * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.2))
    return a, np.asarray(alfa, dtype=np.float32) / 255


def rotus(im):
    """Kaynak figürün otomatik maskesinde kalan yerler: bacak arası duvar, zemin gölgesi, delikli eller. Elle çizildi."""
    if im.size != (351, 1134):
        return im
    W, H = im.size
    # Çizim 2 kat ölçekte: A kırpması (2x, y0=476), B kırpması (3x, y0=907).
    A = lambda n: [(x, y + 952) for x, y in n]
    B = lambda n: [(x * 2 / 3, (y / 3 + 907) * 2) for x, y in n]
    sil = Image.new('L', (W * 2, H * 2), 255)
    d = ImageDraw.Draw(sil)
    d.rectangle([0, 0, W * 2, 2 * H * 0.04], fill=0)
    d.rectangle([0, 907 * 2, W * 2, H * 2], fill=0)
    d.polygon(B([(296, 0), (492, 0), (488, 110), (512, 240), (492, 360), (505, 500), (500, 560), (470, 600), (445, 655), (320, 655),
                 (308, 625), (345, 540), (383, 430), (352, 318), (316, 300), (316, 240), (340, 170)]), fill=255)
    d.polygon(B([(706, 0), (902, 0), (900, 200), (893, 315), (850, 328), (832, 390), (862, 490), (915, 632), (880, 650), (758, 645),
                 (710, 530), (712, 430), (728, 360), (718, 268), (698, 245), (716, 100)]), fill=255)
    d.polygon(A([(385, 360), (404, 440), (432, 470), (452, 600), (472, 710), (474, 906), (326, 906), (318, 770), (332, 700), (352, 560)]), fill=0)
    d.polygon(A([(202, 85), (190, 170), (200, 240), (206, 240), (206, 90)]), fill=0)
    d.polygon(A([(590, 70), (612, 160), (602, 240), (596, 240), (592, 160)]), fill=0)
    d.rectangle(A([(598, 395), (702, 640)]), fill=0)
    d.rectangle(A([(118, 262), (196, 435)]), fill=0)
    d.rectangle(A([(605, 262), (702, 420)]), fill=0)
    el = Image.new('L', (W * 2, H * 2), 0)
    e = ImageDraw.Draw(el)
    e.polygon(A([(133, 268), (196, 243), (216, 290), (232, 375), (222, 392), (206, 372), (200, 420), (170, 402), (140, 380), (128, 330)]), fill=255)
    e.polygon(A([(600, 245), (668, 262), (670, 340), (655, 395), (610, 420), (575, 415), (600, 370), (568, 372), (578, 320)]), fill=255)
    sil = np.asarray(sil.resize((W, H), Image.LANCZOS), dtype=np.float32)
    el = np.asarray(el.resize((W, H), Image.LANCZOS).filter(ImageFilter.GaussianBlur(0.8)), dtype=np.float32)
    r = np.asarray(im, dtype=np.float32).copy()
    # Eller: delikler kapanır, ton kısılır; solgun ama kara.
    gri = r[..., 0]
    ton = np.minimum(np.asarray(Image.fromarray(gri.clip(0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1)), dtype=np.float32), 46)
    k = el[..., None] / 255
    r[..., :3] = r[..., :3] * (1 - k) + ton[..., None] * k
    al = np.minimum(r[..., 3], sil)
    r[..., 3] = np.maximum(al, el)
    return Image.fromarray(r.clip(0, 255).astype(np.uint8), 'RGBA')


def figur_hazirla(yol, yuz):
    a, alfa = figur_ayir(yol)
    H, W = a.shape
    # Yüzü sil: kapüşonun içi yalnızca karanlık.
    yy, xx = np.mgrid[0:H, 0:W]
    q = ((xx - yuz[0]) / yuz[2]) ** 2 + ((yy - yuz[1]) / yuz[3]) ** 2
    silgi = np.clip((1.15 - q) / 0.3, 0, 1)
    koyu = 7 + a * 0.5
    koyu = koyu * (1 - silgi) + 3 * silgi
    rgba = np.dstack([koyu, koyu, koyu, alfa * 255]).astype(np.uint8)
    im = Image.fromarray(rgba, 'RGBA')
    kutu = im.getchannel('A').point(lambda v: 255 if v > 30 else 0).getbbox()
    im = im.crop(kutu)
    # Biraz daha uzun, biraz daha ince.
    im = rotus(im.resize((int(im.width * 0.86), im.height), Image.LANCZOS))
    return im, ((yuz[0] - kutu[0]) * 0.86 / im.width, (yuz[1] - kutu[1]) / im.height)


def bile(sahne, fig, yuz, ad):
    x, y, boy = YERLER[ad]
    s = sahne.convert('RGBA')
    g = max(1, int(fig.width * boy / fig.height))
    f = fig.resize((g, boy), Image.LANCZOS).filter(ImageFilter.GaussianBlur(max(0.5, boy / 500)))
    ox, oy = int(x - g / 2), int(y - boy)
    # Ayağının altı kararır.
    if ad != 'c15_yakin':
        gol = Image.new('RGBA', s.size, (0, 0, 0, 0))
        ImageDraw.Draw(gol).ellipse([x - g * 0.62, y - boy * 0.022, x + g * 0.62, y + boy * 0.03], fill=(0, 0, 0, 150))
        s = Image.alpha_composite(s, gol.filter(ImageFilter.GaussianBlur(max(2, boy / 60))))
    k = Image.new('RGBA', s.size, (0, 0, 0, 0))
    k.alpha_composite(f, (max(0, ox), max(0, oy)), (max(0, -ox), max(0, -oy)))
    if ad == 'c06_x':
        # Son sıranın arkasında: monitörler önünde kalır.
        m = Image.new('L', s.size, 255)
        ImageDraw.Draw(m).rectangle([0, 300, s.width, s.height], fill=0)
        m = m.filter(ImageFilter.GaussianBlur(2))
        k.putalpha(Image.composite(k.getchannel('A'), Image.new('L', s.size, 0), m))
    if ad == 'c15_yakin':
        # Yatağın altından: yalnızca ayak bileğinden aşağısı.
        m = Image.new('L', s.size, 0)
        ImageDraw.Draw(m).polygon([(178, 272), (698, 432), (896, 492), (896, 672), (0, 672), (0, 272)], fill=255)
        m = m.filter(ImageFilter.GaussianBlur(3))
        k.putalpha(Image.composite(k.getchannel('A'), Image.new('L', s.size, 0), m))
    s = Image.alpha_composite(s, k)
    # Gözlük: iki küçük parıltı.
    if ad != 'c15_yakin':
        cx, cy = ox + g * yuz[0], oy + boy * yuz[1] - boy * 0.004
        ara, r = boy * 0.024, max(0.8, boy * 0.0052)
        p = Image.new('RGBA', s.size, (0, 0, 0, 0))
        d = ImageDraw.Draw(p)
        for i in (-1, 1):
            d.ellipse([cx + i * ara - r, cy - r * 0.7, cx + i * ara + r, cy + r * 0.7], fill=(226, 226, 226, 215))
        s = Image.alpha_composite(s, p.filter(ImageFilter.GaussianBlur(max(0.3, r * 0.35))))
    return s.convert('RGB')


def kamera_gibi(im, cik):
    """Gri, düşük çözünürlük, kısık kontrast. Kumlanmayı sayfa canlı ekler."""
    g = im.convert('L').resize((480, 360), Image.LANCZOS).filter(ImageFilter.GaussianBlur(0.45))
    a = np.asarray(g, dtype=np.float32)
    a = 10 + (a / 255) ** 1.08 * 215
    Image.fromarray(a.clip(0, 255).astype(np.uint8)).save(cik, quality=62, optimize=True)


def main():
    p = argparse.ArgumentParser()
    p.add_argument('sahne')
    p.add_argument('figur')
    p.add_argument('cikti')
    p.add_argument('--yuz', default='326,144,56,92', help='kaynak figürde yüzün merkezi ve yarıçapları: x,y,rx,ry')
    v = p.parse_args()
    os.makedirs(v.cikti, exist_ok=True)
    yuz = [float(x) for x in v.yuz.split(',')]
    fig, yuz_oran = figur_hazirla(v.figur, yuz)
    # CAM 16'daki figür de bu: canlı görüntüye bu dosya bindirilir.
    k = fig.resize((int(fig.width * 480 / fig.height), 480), Image.LANCZOS)
    k.save(os.path.join(v.cikti, 'figur.png'), optimize=True)
    print('figür', fig.size, 'yüz oranı', [round(x, 4) for x in yuz_oran])
    for ad in BOSLAR:
        sahne = Image.open(os.path.join(v.sahne, ad + '.png')).convert('RGB')
        kamera_gibi(sahne, os.path.join(v.cikti, f'{ad}_bos.jpg'))
    for ad in YERLER:
        sahne = Image.open(os.path.join(v.sahne, ad.split('_')[0] + '.png')).convert('RGB')
        kamera_gibi(bile(sahne, fig, yuz_oran, ad), os.path.join(v.cikti, ad + '.jpg'))
    top = sum(os.path.getsize(os.path.join(v.cikti, f)) for f in os.listdir(v.cikti))
    print(len(os.listdir(v.cikti)), 'dosya,', top // 1024, 'KB')


if __name__ == '__main__':
    main()
