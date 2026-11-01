#!/usr/bin/env python3
"""Davet bağlantılarını ve ortak kapıyı üretir.

    python3 tools/davet_uret.py

Girdi: tools/gizli_kaynak/davetliler.txt (repoya girmez), her satırda:
    Ad | ilk anı | ikinci anı

Anılar oyunun içinde görünür: ilki 2013 dizinindeki <ad>.txt dosyasında, ikincisi 2004 forumunda imza olarak.
Birlikte gülünecek şeyler yaz. Sırrını ifşa eden, utandıran şey yazma: bu sayfayı gruptaki herkes görür.

Çıktı:
    js/davet-veri.js       adlar ve anılar şifreli; kodu olmayan okuyamaz
    js/gizli-veri.js       ortak kapı katı eklenmiş hâliyle
    DAVET.md               kişiye özel bağlantılar (repoya girmez, kendin dağıtırsın)

Kodlar deterministiktir: liste aynı kaldıkça aynı bağlantılar üretilir. Tuz tools/gizli_kaynak/_davet_tuz.txt içindedir.
Kod adresin # kısmında durur, sunucuya hiç gitmez. Liste boşsa davet verisi boşaltılır, ortak kapı silinir.
"""
import argparse
import base64
import hashlib
import json
import os
import re
import secrets
import sys

KOK = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(KOK, 'tools'))
import gizli_uret  # noqa: E402

KAYNAK = gizli_uret.KAYNAK
LISTE = os.path.join(KAYNAK, 'davetliler.txt')
TUZ_DOSYA = os.path.join(KAYNAK, '_davet_tuz.txt')
KAPI_KAYIT = os.path.join(KAYNAK, '_kapi_kodu.txt')
CIKTI = os.path.join(KOK, 'js', 'davet-veri.js')
RAPOR = os.path.join(KOK, 'DAVET.md')
ALAN = 'https://selimkadiryaar31.online/'
TUZ = 'kadim.31.davet:'
ABC = 'abcdefghjkmnprstuvyz23456789'   # okunurken karışanlar yok: i/l/1, o/0


def tuz_al():
    if os.path.exists(TUZ_DOSYA):
        return open(TUZ_DOSYA, encoding='utf-8').read().strip()
    t = secrets.token_hex(16)
    with open(TUZ_DOSYA, 'w', encoding='utf-8') as f:
        f.write(t + '\n')
    return t


def kod_uret(gizli, ne, uzun):
    h = hashlib.sha256((gizli + ':' + ne).encode('utf-8')).digest()
    return ''.join(ABC[b % len(ABC)] for b in h[:uzun])


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


def liste_oku(yol):
    if not os.path.exists(yol):
        return []
    kisiler = []
    for satir in open(yol, encoding='utf-8'):
        satir = satir.strip()
        if not satir or satir.startswith('#'):
            continue
        p = [x.strip() for x in satir.split('|')]
        if not p[0]:
            continue
        kisiler.append({'ad': p[0][:24], 'anilar': [x for x in p[1:] if x]})
    return kisiler


# Ortak kapı: tek kişi açamaz. Selim'in sesi varsa o, yoksa yazıyor… ve tamam.
KAPI_KAT = """<!-- baslik: — -->
<style>
.gk{min-height:80vh;display:flex;flex-direction:column;justify-content:center;gap:12px;font:400 clamp(24px,5.6vw,34px)/1.15 var(--ekran)}
.gk p{margin:0}
.gk-ad{font-size:18px;color:#8a8a8a}
.gk button{align-self:flex-start;font:inherit;color:#000;background:#cfcfcf;border:0;padding:6px 16px 8px}
</style>
<div class="gk">
  <p class="gk-ad">Sohbet: selimkadiryaar31, sen ve kapıyı birlikte açanlar</p>
  <p id="y"></p>
  <button type="button" id="d" hidden>dinle</button>
  <p id="s" hidden>Değeri anlaşıldı.</p>
</div>
<script>
const y = G.$('#y'), d = G.$('#d'), s = G.$('#s');
G.depo.yaz('grup-kapi', '1');
const son = async () => {
  await G.bekle(4100);
  s.hidden = false;
  G.Ses.can(174.61, 12, 0.5);
};
const yazi = async () => {
  y.textContent = 'selimkadiryaar31 yazıyor…';
  await G.bekle(31000);
  y.textContent = 'tamam';
  G.Ses.tik(0.5);
  son();
};
// Kendi sesi varsa o konuşur. Dosya yoksa yalnızca yazar.
const a = new Audio();
a.preload = 'auto';
let oldu = false;
a.addEventListener('canplaythrough', () => {
  if (oldu) return;
  oldu = true;
  y.textContent = 'selimkadiryaar31 bir ses kaydı gönderdi.';
  d.hidden = false;
}, { once: true });
d.addEventListener('click', () => {
  d.hidden = true;
  y.textContent = '';
  a.addEventListener('ended', () => {
    y.textContent = 'tamam';
    son();
  }, { once: true });
  a.play().catch(() => yazi());
});
a.addEventListener('error', () => { if (!oldu) { oldu = true; yazi(); } }, { once: true });
a.src = 'assets/ses/son.mp3';
</script>
"""


def main():
    a = argparse.ArgumentParser()
    a.add_argument('--liste', default=LISTE, help='başka bir davetli listesi (deneme için)')
    v = a.parse_args()

    kisiler = liste_oku(v.liste)
    if os.path.exists(KAPI_KAYIT):
        eski = open(KAPI_KAYIT, encoding='utf-8').read().strip()
        yol = os.path.join(KAYNAK, eski + '.html')
        if eski and os.path.exists(yol):
            os.remove(yol)
        os.remove(KAPI_KAYIT)

    gizli = tuz_al()
    adlar = [k['ad'] for k in kisiler]
    if len(set(adlar)) != len(adlar):
        sys.exit('Listede aynı ad iki kez var: kodlar çakışır.')

    kayitlar = {}
    satirlar = []
    n = len(kisiler)
    # Her davetliye bir parça; parçalar sırayla yazılınca ortak kapı açılır.
    parcalar = [kod_uret(gizli, 'parca:' + str(n) + ':' + str(i), 3) for i in range(n)]
    kapi = ''.join(parcalar)
    for i, k in enumerate(kisiler):
        kod = kod_uret(gizli, 'kisi:' + k['ad'], 9)
        kayit = {'ad': k['ad'], 'anilar': k['anilar'], 'parca': {'yazi': parcalar[i], 'sira': i + 1, 'toplam': n}, 'liste': adlar}
        kayitlar[kimlik(kod)] = sifrele(json.dumps(kayit, ensure_ascii=False), kod)
        satirlar.append((k['ad'], kod, parcalar[i]))

    veri = json.dumps({'tuz': TUZ, 'd': kayitlar}, separators=(',', ':'))
    with open(CIKTI, 'w', encoding='utf-8') as f:
        f.write('// tools/davet_uret.py üretti. Elle değiştirme. Kodu olmayan bunu okuyamaz.\n')
        f.write('window.DAVET=' + veri + ';\n')

    if n:
        with open(os.path.join(KAYNAK, kapi + '.html'), 'w', encoding='utf-8') as f:
            f.write(KAPI_KAT)
        with open(KAPI_KAYIT, 'w', encoding='utf-8') as f:
            f.write(kapi + '\n')
    gizli_uret.uret()

    with open(RAPOR, 'w', encoding='utf-8') as f:
        f.write('# Davet bağlantıları\n\nBu dosya repoya girmez. Bağlantıları kişilere tek tek gönder: herkesinki ayrı.\n\n')
        if not n:
            f.write('Liste boş. `tools/gizli_kaynak/davetliler.txt` dosyasını doldurup `python3 tools/davet_uret.py` çalıştır.\n')
        else:
            f.write('| Ad | Bağlantı | Parça |\n|---|---|---|\n')
            for ad, kod, parca in satirlar:
                f.write(f'| {ad} | {ALAN}#{kod} | {parca} |\n')
            f.write(f'\nOrtak kapı: `{ALAN}{kapi}`\n\nParçalar yukarıdaki sırayla yazılınca açılır. Parçalar finalde görünür, adresi kimseye verme: gruptakiler kendi bulsun.\n')
            if n == 1:
                f.write('\nDikkat: tek davetli var, kapıyı tek başına açar.\n')
    print(f'{n} davetli. Bağlantılar: {RAPOR}')


if __name__ == '__main__':
    main()
