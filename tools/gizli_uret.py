#!/usr/bin/env python3
"""Gizli katları ve bütün görselleri şifreler.

Kaynaklar tools/gizli_kaynak/ altındadır ve .gitignore ile repodan uzak tutulur.
Yayına yalnızca şifreli çıktı gider: kodu bilmeyen, kaynağa bakarak da okuyamaz.

    gizli_kaynak/*.html            -> js/gizli-veri.js   (katın koduyla)
    gizli_kaynak/gorsel/<kod>/*    -> assets/g/*.bin     (parola + katın kodu)
    gizli_kaynak/acik/**           -> assets/r/*.bin     (parola)

Görsellerin anahtarı parolanın kendisinden çıkar ve js/ içinde yazmaz. Bu yüzden parolayı
bilmeyen görselleri indirse de açamaz. Anahtar git dışındaki gizli_kaynak/_resim_anahtar.txt
dosyasında durur; dosya yoksa parola bir kez sorulur.

    python3 tools/gizli_uret.py                  # yeniden üret
    python3 tools/gizli_uret.py --sifre "yeni"   # parolayı değiştir, görselleri yeniden şifrele
"""
import argparse
import base64
import getpass
import hashlib
import json
import os
import re
import sys

KOK = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KAYNAK = os.path.join(KOK, 'tools', 'gizli_kaynak')
CIKTI = os.path.join(KOK, 'js', 'gizli-veri.js')
SIFRE_JS = os.path.join(KOK, 'js', 'sifre.js')
TUZ = 'kadim.31.kat:'
KAPI_TUZ = 'kadim.31.kapi:'
RESIM_TUZ = 'kadim.31.resim:'
ANAHTAR_DOSYA = os.path.join(KAYNAK, '_resim_anahtar.txt')
TR = str.maketrans({'İ': 'i', 'I': 'i', 'ı': 'i', 'ş': 's', 'Ş': 's', 'ğ': 'g', 'Ğ': 'g', 'ü': 'u', 'Ü': 'u',
                    'ö': 'o', 'Ö': 'o', 'ç': 'c', 'Ç': 'c', 'â': 'a', 'î': 'i', 'û': 'u'})


def sade(s):
    return s.translate(TR).lower()


def kod_sade(s):
    return re.sub(r'[^a-z0-9-]', '', sade(s))


def akis_sifrele(ham, anahtar):
    cik = bytearray()
    for sayac in range((len(ham) + 31) // 32):
        akis = hashlib.sha256(anahtar + sayac.to_bytes(4, 'big')).digest()
        parca = ham[sayac * 32:(sayac + 1) * 32]
        cik.extend(a ^ b for a, b in zip(parca, akis))
    return bytes(cik)


def sifrele(metin, kod):
    anahtar = hashlib.sha256(('anahtar:' + TUZ + kod).encode('utf-8')).digest()
    return base64.b64encode(akis_sifrele(metin.encode('utf-8'), anahtar)).decode('ascii')


def kimlik(kod):
    return hashlib.sha256(('kapi:' + TUZ + kod).encode('utf-8')).hexdigest()[:24]


def parola_temiz(parola):
    return re.sub(r'[^a-z0-9]', '', sade(parola))


def anahtar_yaz(temiz):
    a = hashlib.sha256((RESIM_TUZ + temiz).encode('utf-8')).hexdigest()
    with open(ANAHTAR_DOSYA, 'w', encoding='utf-8') as f:
        f.write(a + '\n')
    return a


def resim_anahtari():
    if os.path.exists(ANAHTAR_DOSYA):
        return open(ANAHTAR_DOSYA, encoding='utf-8').read().strip()
    temiz = parola_temiz(getpass.getpass('Kapı parolası: '))
    s = open(SIFRE_JS, encoding='utf-8').read()
    ozet = re.search(r"const OZET = '([0-9a-f]{64})';", s).group(1)
    if hashlib.sha256((KAPI_TUZ + temiz).encode('utf-8')).hexdigest() != ozet:
        sys.exit('Parola js/sifre.js içindeki özetle uyuşmuyor.')
    return anahtar_yaz(temiz)


def gorsel_sifrele(ham, a, kod, ad):
    anahtar = hashlib.sha256(('gorsel:' + TUZ + a + ':' + kod + ':' + ad).encode('utf-8')).digest()
    return akis_sifrele(ham, anahtar)


def gorsel_adi(a, kod, ad):
    return hashlib.sha256(('dosya:' + TUZ + a + ':' + kod + ':' + ad).encode('utf-8')).hexdigest()[:20] + '.bin'


def resimler_uret(a):
    """tools/gizli_kaynak/acik/** -> assets/r/<özet>.bin. Sitenin görülen bütün görselleri."""
    kok = os.path.join(KAYNAK, 'acik')
    cikti = os.path.join(KOK, 'assets', 'r')
    if not os.path.isdir(kok):
        sys.exit(f'{kok} yok: görseller orada durmalı.')
    os.makedirs(cikti, exist_ok=True)
    gecerli = set()
    for klasor, _, dosyalar in os.walk(kok):
        for ad in sorted(dosyalar):
            yol = os.path.join(klasor, ad)
            goreli = os.path.relpath(yol, kok).replace(os.sep, '/')
            hedef = hashlib.sha256(f'dosya:{a}:{goreli}'.encode('utf-8')).hexdigest()[:20] + '.bin'
            anahtar = hashlib.sha256(f'resim:{a}:{goreli}'.encode('utf-8')).digest()
            gecerli.add(hedef)
            with open(yol, 'rb') as f:
                ham = f.read()
            with open(os.path.join(cikti, hedef), 'wb') as f:
                f.write(akis_sifrele(ham, anahtar))
    for ad in os.listdir(cikti):
        if ad not in gecerli:
            os.remove(os.path.join(cikti, ad))
    print(f'{len(gecerli)} şifreli görsel: {cikti}')


def gorseller_uret(a):
    """tools/gizli_kaynak/gorsel/<kod>/<ad>.jpg -> assets/g/<özet>.bin. Parola ve kod olmadan dosyanın ne olduğu bilinmez."""
    kok = os.path.join(KAYNAK, 'gorsel')
    cikti = os.path.join(KOK, 'assets', 'g')
    if not os.path.isdir(kok):
        return
    os.makedirs(cikti, exist_ok=True)
    gecerli = set()
    for kod in sorted(os.listdir(kok)):
        klasor = os.path.join(kok, kod)
        if not os.path.isdir(klasor):
            continue
        for ad in sorted(os.listdir(klasor)):
            taban = os.path.splitext(ad)[0]
            hedef = gorsel_adi(a, kod_sade(kod), taban)
            gecerli.add(hedef)
            with open(os.path.join(klasor, ad), 'rb') as f:
                ham = f.read()
            with open(os.path.join(cikti, hedef), 'wb') as f:
                f.write(gorsel_sifrele(ham, a, kod_sade(kod), taban))
    for ad in os.listdir(cikti):
        if ad not in gecerli:
            os.remove(os.path.join(cikti, ad))
    print(f'{len(gecerli)} şifreli görsel: {cikti}')


def sayfa_oku(yol):
    s = open(yol, encoding='utf-8').read()
    baslik = re.search(r'<!--\s*baslik:(.*?)-->', s)
    t = baslik.group(1).strip() if baslik else '—'
    s = re.sub(r'<!--\s*baslik:.*?-->', '', s, count=1)
    css = '\n'.join(re.findall(r'<style>(.*?)</style>', s, re.S))
    s = re.sub(r'<style>.*?</style>', '', s, flags=re.S)
    js = '\n'.join(re.findall(r'<script>(.*?)</script>', s, re.S))
    s = re.sub(r'<script>.*?</script>', '', s, flags=re.S)
    return {'t': t, 'h': s.strip(), 'c': css.strip(), 'j': js.strip()}


def uret():
    kat = {}
    kodlar = []
    for ad in sorted(os.listdir(KAYNAK)):
        yol = os.path.join(KAYNAK, ad)
        if ad == '_kisa.txt':
            for satir in open(yol, encoding='utf-8'):
                satir = satir.strip()
                if not satir or satir.startswith('#'):
                    continue
                kod_liste, soz = satir.split('=', 1)
                for k in kod_liste.split(','):
                    k = kod_sade(k)
                    kat[kimlik(k)] = sifrele(json.dumps({'s': soz.strip()}, ensure_ascii=False), k)
                    kodlar.append(k)
        elif ad.endswith('.html'):
            k = kod_sade(ad[:-5])
            kat[kimlik(k)] = sifrele(json.dumps(sayfa_oku(yol), ensure_ascii=False), k)
            kodlar.append(k)
    veri = json.dumps({'tuz': TUZ, 'kat': kat}, separators=(',', ':'))
    with open(CIKTI, 'w', encoding='utf-8') as f:
        f.write('// tools/gizli_uret.py üretti. Elle değiştirme. Kodu olmayan bunu okuyamaz.\n')
        f.write('window.GIZLI=' + veri + ';\n')
    print(f'{len(kat)} kapı yazıldı ({os.path.getsize(CIKTI)} bayt): {CIKTI}')
    a = resim_anahtari()
    gorseller_uret(a)
    resimler_uret(a)


def sifre_degistir(yeni):
    temiz = parola_temiz(yeni)
    ozet = hashlib.sha256((KAPI_TUZ + temiz).encode('utf-8')).hexdigest()
    s = open(SIFRE_JS, encoding='utf-8').read()
    s, n = re.subn(r"const OZET = '[0-9a-f]{64}';", f"const OZET = '{ozet}';", s)
    if n != 1:
        sys.exit('js/sifre.js içinde OZET satırı bulunamadı')
    open(SIFRE_JS, 'w', encoding='utf-8').write(s)
    anahtar_yaz(temiz)
    print('Parola özeti güncellendi. Parolanın kendisi hiçbir dosyaya yazılmadı.')


if __name__ == '__main__':
    p = argparse.ArgumentParser()
    p.add_argument('--sifre', help='yeni kapı parolası')
    a = p.parse_args()
    if a.sifre:
        sifre_degistir(a.sifre)
    uret()
