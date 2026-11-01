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

  let bellek = false;
  function gecti() {
    try { return sessionStorage.getItem('kadim.kapi') === OZET.slice(0, 16) || bellek; } catch (e) { return bellek; }
  }
  function gecir() {
    bellek = true;
    try { sessionStorage.setItem('kadim.kapi', OZET.slice(0, 16)); } catch (e) { /* gizli sekme */ }
  }
  function dene(m) {
    const dogru = hex(ozet(utf8(TUZ + sade(m).replace(/[^a-z0-9]/g, '')))) === OZET;
    if (dogru) {
      gecir();
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

  return { ozet, utf8, hex, sade, kodSade, dene, gecti, gecir, yanlisSoz };
})();
