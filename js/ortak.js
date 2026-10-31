// Sahne, site, ses ve oyunun paylaştığı küçük yardımcılar.
window.Ortak = (function () {
  'use strict';

  const azalt = matchMedia('(prefers-reduced-motion: reduce)').matches;
  // 0xAABBGGRR (little-endian tuval piksel düzeni)
  const RENK = { murekkep: 0xff07080a, kagit: 0xffbad0d9, kor: 0xff1d3af2, kan: 0xff0c176e };
  const CSS_RENK = { murekkep: '#0a0807', kagit: '#d9d0ba', kor: '#f23a1d', kan: '#6e170c', kanli: '#140504' };

  const BAYER_TABLO = [
    0, 32, 8, 40, 2, 34, 10, 42, 48, 16, 56, 24, 50, 18, 58, 26,
    12, 44, 4, 36, 14, 46, 6, 38, 60, 28, 52, 20, 62, 30, 54, 22,
    3, 35, 11, 43, 1, 33, 9, 41, 51, 19, 59, 27, 49, 17, 57, 25,
    15, 47, 7, 39, 13, 45, 5, 37, 63, 31, 55, 23, 61, 29, 53, 21,
  ];
  const BAYER = new Float32Array(64);
  BAYER_TABLO.forEach((v, i) => { BAYER[i] = (v + 0.5) / 64; });

  // ---------- kayıt: bu tarayıcıda kalır, hiçbir yere gönderilmez ----------
  const depo = {
    al(k) { try { return localStorage.getItem('kadim.' + k); } catch (e) { return null; } },
    yaz(k, v) { try { localStorage.setItem('kadim.' + k, v); } catch (e) { /* gizli sekme */ } },
    sil(k) { try { localStorage.removeItem('kadim.' + k); } catch (e) { /* gizli sekme */ } },
  };
  const kayit = {
    ad: depo.al('ad') || null,
    gelis: parseInt(depo.al('gelis'), 10) || 0,
    cevap: depo.al('cevap') || null, // 'verdi' | 'vermedi'
  };
  function unut() {
    ['ad', 'gelis', 'cevap', 'rekor', 'ses'].forEach((k) => depo.sil(k));
    kayit.ad = null;
    kayit.gelis = 0;
    kayit.cevap = null;
  }

  // ---------- modüller arası haberleşme ----------
  const dinleyen = {};
  const dinle = (ad, f) => { (dinleyen[ad] = dinleyen[ad] || []).push(f); };
  const yay = (ad, v) => { (dinleyen[ad] || []).forEach((f) => f(v)); };

  // Java String.hashCode: 31 ile çarpar, 32 bitte taşar.
  function javaHash(s) {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
    return h;
  }

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
  function griOrnekle(resim, g, y, kirp) {
    const t = document.createElement('canvas');
    t.width = g;
    t.height = y;
    const c = t.getContext('2d', { willReadFrequently: true });
    c.fillStyle = '#000';
    c.fillRect(0, 0, g, y);
    // kirp: kaynaktan alınacak bölge, kesir olarak [x, y, en, boy]
    const [kx, ky, kg, ky2] = kirp || [0, 0, 1, 1];
    const sg = resim.width * kg, sy = resim.height * ky2;
    const olcek = Math.min(g / sg, y / sy);
    const rg = Math.round(sg * olcek);
    const ry = Math.round(sy * olcek);
    c.imageSmoothingQuality = 'high';
    c.drawImage(resim, resim.width * kx, resim.height * ky, sg, sy, Math.round((g - rg) / 2), y - ry, rg, ry);
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

  // ---------- 1 bit kalem: yuvarlatılmış çizgi yok, hep tam piksel ----------
  function kalem(c) {
    const nokta = (x, y) => c.fillRect(Math.round(x), Math.round(y), 1, 1);
    function cizgi(ax, ay, bx, by) {
      let x0 = Math.round(ax), y0 = Math.round(ay);
      const x1 = Math.round(bx), y1 = Math.round(by);
      const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
      const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
      let e = dx + dy;
      for (let d = 0; d < 4096; d++) {
        c.fillRect(x0, y0, 1, 1);
        if (x0 === x1 && y0 === y1) break;
        const e2 = 2 * e;
        if (e2 >= dy) { e += dy; x0 += sx; }
        if (e2 <= dx) { e += dx; y0 += sy; }
      }
    }
    function halka(cx, cy, r) {
      const n = Math.ceil(r * 6.4);
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        nokta(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
      }
    }
    return { nokta, cizgi, halka };
  }

  // Mühür: otuz bir diş, içinde addan türeyen kirişler. Çağırmadan önce fillStyle ayarlanır.
  function muhur(c, N, hash, ilerleme) {
    const k = kalem(c);
    const m = (N - 1) / 2, dis = N * 0.48, ic = N * 0.41;
    k.halka(m, m, dis);
    k.halka(m, m, ic);
    const P = (i, r) => {
      const a = -Math.PI / 2 + (i / 31) * Math.PI * 2;
      return [m + Math.cos(a) * r, m + Math.sin(a) * r];
    };
    for (let i = 0; i < 31; i++) {
      const a = P(i, ic + 1), b = P(i, dis - 1);
      k.cizgi(a[0], a[1], b[0], b[1]);
    }
    const adet = Math.round(13 * (ilerleme === undefined ? 1 : ilerleme));
    let s = hash | 0;
    let onceki = (s >>> 5) % 31;
    const nd = Math.max(1, Math.round(N * 0.012));
    for (let i = 0; i < adet; i++) {
      s = (Math.imul(s, 31) + i * i + 7) | 0;
      let yeni = (s >>> 9) % 31;
      if (yeni === onceki) yeni = (yeni + 11) % 31;
      const a = P(onceki, ic - 1), b = P(yeni, ic - 1);
      k.cizgi(a[0], a[1], b[0], b[1]);
      c.fillRect(Math.round(b[0]) - nd, Math.round(b[1]) - nd, nd * 2 + 1, nd * 2 + 1);
      onceki = yeni;
    }
  }

  return {
    azalt, RENK, CSS_RENK, BAYER, depo, kayit, unut, dinle, yay, javaHash,
    portreResmi, griOrnekle, atkinson, dikisResmi, kalem, muhur,
  };
})();
