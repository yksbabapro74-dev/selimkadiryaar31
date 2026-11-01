#!/usr/bin/env python3
"""Gizli katları şifreleyip js/gizli-veri.js dosyasını üretir.

Kaynaklar tools/gizli_kaynak/ altındadır ve .gitignore ile repodan uzak tutulur.
Yayına yalnızca şifreli çıktı gider: kodu bilmeyen, kaynağa bakarak da okuyamaz.

    python3 tools/gizli_uret.py                  # katları yeniden üret
    python3 tools/gizli_uret.py --sifre "yeni"   # kapı parolasını değiştir
"""
import argparse
import base64
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
TR = str.maketrans({'İ': 'i', 'I': 'i', 'ı': 'i', 'ş': 's', 'Ş': 's', 'ğ': 'g', 'Ğ': 'g', 'ü': 'u', 'Ü': 'u',
                    'ö': 'o', 'Ö': 'o', 'ç': 'c', 'Ç': 'c', 'â': 'a', 'î': 'i', 'û': 'u'})


def sade(s):
    return s.translate(TR).lower()


def kod_sade(s):
    return re.sub(r'[^a-z0-9-]', '', sade(s))


def sifrele(metin, kod):
    ham = metin.encode('utf-8')
    anahtar = hashlib.sha256(('anahtar:' + TUZ + kod).encode('utf-8')).digest()
    cik = bytearray()
    for sayac in range((len(ham) + 31) // 32):
        akis = hashlib.sha256(anahtar + sayac.to_bytes(4, 'big')).digest()
        parca = ham[sayac * 32:(sayac + 1) * 32]
        cik.extend(a ^ b for a, b in zip(parca, akis))
    return base64.b64encode(bytes(cik)).decode('ascii')


def kimlik(kod):
    return hashlib.sha256(('kapi:' + TUZ + kod).encode('utf-8')).hexdigest()[:24]


def gorsel_sifrele(ham, kod, ad):
    anahtar = hashlib.sha256(('gorsel:' + TUZ + kod + ':' + ad).encode('utf-8')).digest()
    cik = bytearray()
    for sayac in range((len(ham) + 31) // 32):
        akis = hashlib.sha256(anahtar + sayac.to_bytes(4, 'big')).digest()
        parca = ham[sayac * 32:(sayac + 1) * 32]
        cik.extend(a ^ b for a, b in zip(parca, akis))
    return bytes(cik)


def gorsel_adi(kod, ad):
    return hashlib.sha256(('dosya:' + TUZ + kod + ':' + ad).encode('utf-8')).hexdigest()[:20] + '.bin'


def gorseller_uret():
    """tools/gizli_kaynak/gorsel/<kod>/<ad>.jpg -> assets/g/<özet>.bin. Kodu bilmeyen dosyanın ne olduğunu da bilemez."""
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
            hedef = gorsel_adi(kod_sade(kod), taban)
            gecerli.add(hedef)
            with open(os.path.join(klasor, ad), 'rb') as f:
                ham = f.read()
            with open(os.path.join(cikti, hedef), 'wb') as f:
                f.write(gorsel_sifrele(ham, kod_sade(kod), taban))
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
    gorseller_uret()


def sifre_degistir(yeni):
    temiz = re.sub(r'[^a-z0-9]', '', sade(yeni))
    ozet = hashlib.sha256((KAPI_TUZ + temiz).encode('utf-8')).hexdigest()
    s = open(SIFRE_JS, encoding='utf-8').read()
    s, n = re.subn(r"const OZET = '[0-9a-f]{64}';", f"const OZET = '{ozet}';", s)
    if n != 1:
        sys.exit('js/sifre.js içinde OZET satırı bulunamadı')
    open(SIFRE_JS, 'w', encoding='utf-8').write(s)
    print('Parola özeti güncellendi. Parolanın kendisi hiçbir dosyaya yazılmadı.')


if __name__ == '__main__':
    p = argparse.ArgumentParser()
    p.add_argument('--sifre', help='yeni kapı parolası')
    a = p.parse_args()
    if a.sifre:
        sifre_degistir(a.sifre)
    else:
        uret()
