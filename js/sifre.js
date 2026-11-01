// Kapı parolası ve gizli katların anahtarı. Parolanın kendisi burada yazmaz, yalnızca özeti durur.
// http altında crypto.subtle çalışmaz; bu yüzden SHA-256 elle yazıldı.
window.Sifre = (function () {
  'use strict';
  const { depo } = window.Ortak;

  const K = new Uint32Array(64), H0 = new Uint32Array(8);
  (function () {
    const kesir = (x) => ((x - Math.floor(x)) * 4294967296) >>> 0;
    let n = 0;
    for (let aday = 2; n < 64; aday++) {
      let asal = true;
      for (let b = 2; b * b <= aday; b++) if (aday % b === 0) { asal = false; break; }
      if (!asal) continue;
      if (n < 8) H0[n] = kesir(Math.sqrt(aday));
      K[n++] = kesir(Math.cbrt(aday));
    }
  })();
  const ror = (x, n) => (x >>> n) | (x << (32 - n));

  function ozet(veri) {
    const n = veri.length, ek = ((n + 9 + 63) & ~63);
    const m = new Uint8Array(ek);
    m.set(veri);
    m[n] = 0x80;
    const bit = n * 8;
    m[ek - 4] = bit >>> 24;
    m[ek - 3] = (bit >>> 16) & 255;
    m[ek - 2] = (bit >>> 8) & 255;
    m[ek - 1] = bit & 255;
    m[ek - 5] = Math.floor(bit / 4294967296) & 255;
    const h = H0.slice(), w = new Uint32Array(64);
    for (let o = 0; o < ek; o += 64) {
      for (let i = 0; i < 16; i++) {
        const j = o + i * 4;
        w[i] = (m[j] << 24) | (m[j + 1] << 16) | (m[j + 2] << 8) | m[j + 3];
      }
      for (let i = 16; i < 64; i++) {
        const a = w[i - 15], b = w[i - 2];
        w[i] = (w[i - 16] + (ror(a, 7) ^ ror(a, 18) ^ (a >>> 3)) + w[i - 7] + (ror(b, 17) ^ ror(b, 19) ^ (b >>> 10))) | 0;
      }
      let [a, b, c, d, e, f, g, s] = h;
      for (let i = 0; i < 64; i++) {
        const t1 = (s + (ror(e, 6) ^ ror(e, 11) ^ ror(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + w[i]) | 0;
        const t2 = ((ror(a, 2) ^ ror(a, 13) ^ ror(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) | 0;
        s = g; g = f; f = e; e = (d + t1) | 0;
        d = c; c = b; b = a; a = (t1 + t2) | 0;
      }
      h[0] += a; h[1] += b; h[2] += c; h[3] += d; h[4] += e; h[5] += f; h[6] += g; h[7] += s;
    }
    const cik = new Uint8Array(32);
    for (let i = 0; i < 8; i++) {
      cik[i * 4] = h[i] >>> 24;
      cik[i * 4 + 1] = (h[i] >>> 16) & 255;
      cik[i * 4 + 2] = (h[i] >>> 8) & 255;
      cik[i * 4 + 3] = h[i] & 255;
    }
    return cik;
  }
  const utf8 = (s) => new TextEncoder().encode(s);
  const hex = (b) => Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');

  // Telefon klavyesi büyük harf ya da Türkçe harf yazsa da aynı kelime sayılır.
  const TR = { ş: 's', ğ: 'g', ü: 'u', ö: 'o', ç: 'c', â: 'a', î: 'i', û: 'u' };
  const sade = (s) => String(s).replace(/[İIı]/g, 'i').toLowerCase().replace(/[şğüöçâîû]/g, (h) => TR[h]);
  const kodSade = (s) => sade(s).replace(/[^a-z0-9-]/g, '');

  const TUZ = 'kadim.31.kapi:';
  const OZET = '49ad255c65bbe3a5d32d5e9fd6d18f51bb5dd411bcf985cc74cd10e3322226ca';
  const RESIM_TUZ = 'kadim.31.resim:';

  // Görsellerin anahtarı parolanın kendisinden çıkar, hiçbir dosyada yazmaz.
  // Parolayı bilmeyen dosyaları indirse de açamaz; kapıdan önce tek bir görsel bile istenmez.
  let resimAnahtar = '';
  try { resimAnahtar = sessionStorage.getItem('kadim.resim') || ''; } catch (e) { /* gizli sekme */ }
  const bekleyenler = [];
  const anahtar = () => resimAnahtar;
  function anahtarBekle() {
    if (resimAnahtar) return Promise.resolve(resimAnahtar);
    if (bellek) return Promise.reject(new Error('anahtar yok'));
    return new Promise((coz, red) => bekleyenler.push({ coz, red }));
  }

  let bellek = false;
  function gecti() {
    if (bellek) return true;
    try { return sessionStorage.getItem('kadim.kapi') === OZET.slice(0, 16) && !!resimAnahtar; } catch (e) { return false; }
  }
  // Yalnızca yerel geliştirme (?sahne=). Anahtar vermez: anahtar yoksa görseller de gelmez, sahne yine çalışır.
  function gecir() {
    bellek = true;
    if (!resimAnahtar) bekleyenler.splice(0).forEach((b) => b.red(new Error('anahtar yok')));
  }
  function dene(m) {
    const temiz = sade(m).replace(/[^a-z0-9]/g, '');
    if (hex(ozet(utf8(TUZ + temiz))) === OZET) {
      bellek = true;
      resimAnahtar = hex(ozet(utf8(RESIM_TUZ + temiz)));
      try {
        sessionStorage.setItem('kadim.kapi', OZET.slice(0, 16));
        sessionStorage.setItem('kadim.resim', resimAnahtar);
      } catch (e) { /* gizli sekme */ }
      bekleyenler.splice(0).forEach((b) => b.coz(resimAnahtar));
      return true;
    }
    const n = (parseInt(depo.al('yanlis'), 10) || 0) + 1;
    depo.yaz('yanlis', String(n));
    return false;
  }
  function yanlisSoz(girdi) {
    const n = parseInt(depo.al('yanlis'), 10) || 1;
    const SOZ = [
      'Yanlış.',
      'Yine yanlış.',
      'Bunu sana kim söyledi?',
      `«${girdi}». Bunu da not ettik.`,
      'Kapıda bekleyen yalnız sen değilsin.',
      'Sana parolayı verene sor. Cevap verirse.',
    ];
    if (n === 31) return 'Otuz bir. Olmadı.';
    return n <= SOZ.length ? SOZ[n - 1] : `${n}. deneme. Hepsi kayıtta.`;
  }

  // Akış şifresi: her 32 bayt için sha256(anahtar + sayaç). Aynı işlem hem şifreler hem çözer.
  function akis(girdi, anahtarBayt) {
    const blok = new Uint8Array(36);
    blok.set(anahtarBayt, 0);
    const cik = new Uint8Array(girdi.length);
    for (let i = 0, sayac = 0; i < girdi.length; sayac++) {
      blok[32] = sayac >>> 24;
      blok[33] = (sayac >>> 16) & 255;
      blok[34] = (sayac >>> 8) & 255;
      blok[35] = sayac & 255;
      const a = ozet(blok);
      for (let j = 0; j < 32 && i < girdi.length; j++, i++) cik[i] = girdi[i] ^ a[j];
    }
    return cik;
  }

  // Görselin adı da anahtardan çıkar: parola olmadan hangi dosyanın ne olduğu bile bilinmez.
  const resimler = new Map();
  function resim(yol) {
    if (!resimAnahtar) return Promise.reject(new Error('anahtar yok'));
    if (resimler.has(yol)) return resimler.get(yol);
    const a = resimAnahtar;
    const ad = hex(ozet(utf8(`dosya:${a}:${yol}`))).slice(0, 20);
    const tur = yol.endsWith('.png') ? 'image/png' : 'image/jpeg';
    const soz = fetch(`assets/r/${ad}.bin`).then((r) => {
      if (!r.ok) throw new Error('görsel yok');
      return r.arrayBuffer();
    }).then((b) => {
      const cik = akis(new Uint8Array(b), ozet(utf8(`resim:${a}:${yol}`)));
      return URL.createObjectURL(new Blob([cik], { type: tur }));
    });
    soz.catch(() => resimler.delete(yol));
    resimler.set(yol, soz);
    return soz;
  }

  // <img data-resim="suret/x.png">: src'si yoktur, anahtar gelince doldurulur.
  function resimleriKur(kok) {
    const liste = Array.from((kok || document).querySelectorAll('img[data-resim]'));
    if (!liste.length) return;
    anahtarBekle().then(async () => {
      for (const im of liste) {
        const yol = im.dataset.resim;
        try {
          const u = await resim(yol);
          if (im.dataset.resim === yol) im.src = u;
        } catch (e) { /* gelmediyse boş kalır */ }
      }
    }, () => {});
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => resimleriKur());
  else resimleriKur();

  return { ozet, utf8, hex, sade, kodSade, dene, gecti, gecir, yanlisSoz, anahtar, anahtarBekle, akis, resim, resimleriKur };
})();
