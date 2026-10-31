// Sahne, site ve oyunun paylaştığı küçük yardımcılar.
window.Ortak = (function () {
  'use strict';

  const azalt = matchMedia('(prefers-reduced-motion: reduce)').matches;
  // 0xAABBGGRR (little-endian tuval piksel düzeni)
  const RENK = { murekkep: 0xff0b0e10, kagit: 0xffcbe0e8, kor: 0xff2e4fff };
  const CSS_RENK = { murekkep: '#100e0b', kagit: '#e8e0cb', kor: '#ff4f2e', kizil: '#b3260f' };

  const BAYER_TABLO = [
    0, 32, 8, 40, 2, 34, 10, 42, 48, 16, 56, 24, 50, 18, 58, 26,
    12, 44, 4, 36, 14, 46, 6, 38, 60, 28, 52, 20, 62, 30, 54, 22,
    3, 35, 11, 43, 1, 33, 9, 41, 51, 19, 59, 27, 49, 17, 57, 25,
    15, 47, 7, 39, 13, 45, 5, 37, 63, 31, 55, 23, 61, 29, 53, 21,
  ];
  const BAYER = new Float32Array(64);
  BAYER_TABLO.forEach((v, i) => { BAYER[i] = (v + 0.5) / 64; });

  // Portre gömülü bir data URI'dir: file:// altında açılsa da tuval kirlenmez.
  let portreSoz = null;
  function portreResmi() {
    if (!portreSoz) {
      portreSoz = new Promise((coz, red) => {
        const r = new Image();
        r.onload = () => coz(r);
        r.onerror = red;
        r.src = window.PORTRE_VERI.src;
      });
    }
    return portreSoz;
  }

  // Portreyi hedef boyuta sığdırıp (contain, alta yaslı) gri değer dizisi döndürür.
  function griOrnekle(resim, g, y) {
    const t = document.createElement('canvas');
    t.width = g;
    t.height = y;
    const c = t.getContext('2d', { willReadFrequently: true });
    c.fillStyle = '#000';
    c.fillRect(0, 0, g, y);
    const olcek = Math.min(g / resim.width, y / resim.height);
    const rg = Math.round(resim.width * olcek);
    const ry = Math.round(resim.height * olcek);
    c.imageSmoothingQuality = 'high';
    c.drawImage(resim, Math.round((g - rg) / 2), y - ry, rg, ry);
    const v = c.getImageData(0, 0, g, y).data;
    const gri = new Float32Array(g * y);
    for (let i = 0; i < gri.length; i++) gri[i] = v[i * 4];
    return gri;
  }

  // Atkinson dither. eslem(deger) ile parlaklık önceden kaydırılabilir.
  function atkinson(gri, g, y, eslem, piksel, acik, koyu) {
    const n = g * y;
    const h = new Float32Array(n + 2 * g + 2);
    for (let i = 0; i < n; i++) h[i] = eslem ? eslem(gri[i]) : gri[i];
    for (let j = 0, i = 0; j < y; j++) {
      for (let x = 0; x < g; x++, i++) {
        const eski = h[i];
        const yeni = eski >= 128 ? 255 : 0;
        const e = (eski - yeni) / 8;
        piksel[i] = yeni ? acik : koyu;
        if (e === 0) continue;
        if (x + 1 < g) h[i + 1] += e;
        if (x + 2 < g) h[i + 2] += e;
        if (x > 0) h[i + g - 1] += e;
        h[i + g] += e;
        if (x + 1 < g) h[i + g + 1] += e;
        h[i + 2 * g] += e;
      }
    }
  }

  // Bölümler arasındaki Bayer dikişi.
  function dikisResmi(ustRenk, altRenk, nokta) {
    const yuk = 24;
    const t = document.createElement('canvas');
    t.width = 8;
    t.height = yuk;
    const c = t.getContext('2d');
    c.fillStyle = ustRenk;
    c.fillRect(0, 0, 8, yuk);
    c.fillStyle = altRenk;
    for (let y = 0; y < yuk; y++) {
      const oran = (y + 0.5) / yuk;
      for (let x = 0; x < 8; x++) {
        if (oran > BAYER[((y & 7) << 3) | x]) c.fillRect(x, y, 1, 1);
      }
    }
    return { url: t.toDataURL(), g: 8 * nokta, y: yuk * nokta };
  }

  return { azalt, RENK, CSS_RENK, BAYER, portreResmi, griOrnekle, atkinson, dikisResmi };
})();
