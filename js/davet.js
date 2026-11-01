// Davet: bağlantının sonundaki kod. Kodu olmayan listedeki adları okuyamaz; adlar şifreli durur.
// Kod adresin # kısmındadır, sunucuya hiç gitmez. Çözülünce adresten silinir.
window.Davet = (function () {
  'use strict';
  const O = window.Ortak, S = window.Sifre;
  const { depo, kayit } = O;
  const V = window.DAVET || { tuz: '', d: {} };

  function coz(b64, k) {
    const girdi = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const anahtar = S.ozet(S.utf8('anahtar:' + V.tuz + k));
    const blok = new Uint8Array(36);
    blok.set(anahtar, 0);
    const cik = new Uint8Array(girdi.length);
    for (let i = 0, sayac = 0; i < girdi.length; sayac++) {
      blok[32] = sayac >>> 24;
      blok[33] = (sayac >>> 16) & 255;
      blok[34] = (sayac >>> 8) & 255;
      blok[35] = sayac & 255;
      const akis = S.ozet(blok);
      for (let j = 0; j < 32 && i < girdi.length; j++, i++) cik[i] = girdi[i] ^ akis[j];
    }
    return JSON.parse(new TextDecoder().decode(cik));
  }

  function oku() {
    try { return JSON.parse(depo.al('davet') || 'null'); } catch (e) { return null; }
  }
  let bilgi = oku();

  (function adrestenAl() {
    const ham = location.hash.replace(/^#/, '');
    if (!ham) return;
    const kod = S.kodSade(ham);
    const id = S.hex(S.ozet(S.utf8('kapi:' + V.tuz + kod))).slice(0, 24);
    const kayitli = V.d[id];
    if (!kayitli) return;
    try {
      bilgi = coz(kayitli, kod);
      depo.yaz('davet', JSON.stringify(bilgi));
      depo.yaz('ad', bilgi.ad);
      kayit.ad = bilgi.ad;
    } catch (e) {
      return;
    }
    // Paylaşılan adreste kod kalmasın.
    try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* dosyadan açıldı */ }
  })();

  return {
    bilgi: () => bilgi,
    var: () => !!bilgi,
    ad: () => (bilgi && bilgi.ad) || kayit.ad || null,
    ani: (i) => (bilgi && bilgi.anilar && bilgi.anilar[i]) || null,
    parca: () => (bilgi && bilgi.parca) || null,
    liste: () => (bilgi && bilgi.liste) || [],
    unut() { bilgi = null; },
  };
})();
