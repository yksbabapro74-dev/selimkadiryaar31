// Sahne, site, ses ve oyunun paylaştığı küçük yardımcılar.
window.Ortak = (function () {
  'use strict';

  const azalt = matchMedia('(prefers-reduced-motion: reduce)').matches;
  // 0xAABBGGRR (little-endian tuval piksel düzeni)
  const RENK = { murekkep: 0xff000000, kagit: 0xffc8c8c8, kor: 0xff1a20f0, kan: 0xff0a0a5c };
  const CSS_RENK = { murekkep: '#000000', kagit: '#c8c8c8', kor: '#f0201a', kan: '#5c0a0a', kanli: '#000000' };

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
    try {
      Object.keys(localStorage).filter((k) => k.startsWith('kadim.')).forEach((k) => localStorage.removeItem(k));
    } catch (e) { /* gizli sekme */ }
    kayit.ad = null;
    kayit.gelis = 0;
    kayit.cevap = null;
  }

  // Bu makinede zaten görünen şeyler. Okunur, gösterilir, hiçbir yere gitmez.
  function kimlik() {
    const ua = navigator.userAgent;
    const [os, os2] = /Android/.test(ua) ? ['Android', "Android'den"]
      : /iPhone|iPad|iPod/.test(ua) ? ['iPhone', "iPhone'dan"]
        : /Windows/.test(ua) ? ['Windows', "Windows'tan"]
          : /Mac OS X/.test(ua) ? ['Mac', "Mac'ten"]
            : /Linux/.test(ua) ? ['Linux', "Linux'tan"] : ['bilinmeyen makine', 'bilinmeyen bir makineden'];
    const tarayici = /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /Firefox\//.test(ua) ? 'Firefox'
      : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'tarayıcı';
    const d = new Date(), iki = (n) => String(n).padStart(2, '0');
    return { os, osDan: os2, tarayici, ekran: `${screen.width}×${screen.height}`, saat: `${iki(d.getHours())}.${iki(d.getMinutes())}`, tarih: d };
  }

  // ---------- gizli servis adresi: makineden türer, başkasına aynısı düşmez ----------
  function onion() {
    const A = 'abcdefghijklmnopqrstuvwxyz234567';
    let h = javaHash(`${navigator.userAgent}|${screen.width}x${screen.height}|${navigator.language}`);
    let ek = '';
    for (let i = 0; i < 41; i++) {
      h = (Math.imul(h, 31) + i + 7) | 0;
      ek += A[(h >>> 7) & 31];
    }
    return `selimkadiryaar3${ek}.onion`;
  }
  function misafir() {
    let n = depo.al('misafir');
    if (!n) {
      n = String(1000 + Math.floor(Math.random() * 8999));
      depo.yaz('misafir', n);
    }
    return `misafir_${n}`;
  }

  // ---------- gözetleme kamerası: küçük, gürültülü, tek bitlik ----------
  function kameraHarita(tip, W, H) {
    const h = new Float32Array(W * H);
    const cx = W / 2, cy = H * 0.46;
    for (let y = 0, i = 0; y < H; y++) {
      for (let x = 0; x < W; x++, i++) {
        const nx = (x - cx) / W, ny = (y - cy) / H, ay = y / H;
        let v = 0;
        if (tip === 'koridor') {
          // Tek kaçış noktası: içeri doğru kararır, tavan lambaları bant bant.
          const d = Math.max(Math.abs(nx) * 1.2, Math.abs(ny));
          v = 0.04 + d * 0.6;
          v *= 0.72 + 0.28 * Math.cos(d * 44);
          if (d < 0.085) v = 0.015;
          if (Math.abs(Math.abs(nx) * 1.2 - Math.abs(ny)) < 0.01) v *= 0.25;
        } else if (tip === 'merdiven') {
          const b = Math.floor(ay * ay * 11);
          v = (b / 11) * 0.5 + (b % 2 ? 0.12 : 0.02);
          v *= Math.max(0, 1 - Math.abs(nx) * (2.6 - ay * 1.4));
          if (ay < 0.18) v = 0.012;
        } else if (tip === 'kapi') {
          const ic = Math.abs(nx) < 0.19 && ay > 0.14 && ay < 0.84;
          v = ic ? 0.13 + 0.03 * Math.sin(x * 0.8) : 0.05 + ay * 0.1;
          if (Math.abs(Math.abs(nx) - 0.19) < 0.012 && ay > 0.14 && ay < 0.84) v = 0.32;
          if (ay >= 0.84) v = 0.1 + 0.05 * ay;
          if (ay >= 0.84 && ay < 0.885 && Math.abs(nx) < 0.19) v = 0.95;
          if (ay >= 0.885 && Math.abs(nx) < 0.19 + (ay - 0.885) * 1.1) v = Math.max(v, 0.55 - (ay - 0.885) * 3.6);
        } else if (tip === 'oda') {
          const q = Math.hypot(nx * 1.1, ay - 0.14);
          v = Math.max(0, 0.7 - q * 1.05);
          if (ay > 0.68) v *= 0.62;
          if (Math.abs(ay - 0.68) < 0.008) v *= 0.3;
          if (q < 0.022) v = 1;
        } else if (tip === 'sandalye' || tip === 'koltuk') {
          // Arkadan: ekran ışığı, önünde koltuk. Burada oturan sensin. Ya da oturmuyorsun.
          v = Math.max(0, 0.62 - Math.hypot(nx * 1.15, (ay - 0.38) * 1.4) * 1.5) + 0.03;
          const sirt = Math.abs(nx) < 0.15 - Math.max(0, 0.42 - ay) * 0.3 && ay > 0.42 && ay < 0.9;
          const kafa = tip === 'sandalye' && Math.hypot(nx * 1.25, ay - 0.36) < 0.085;
          if (sirt || kafa) v = 0.008;
        } else {
          v = 0.02;
        }
        h[i] = v;
      }
    }
    return h;
  }
  let kameraR = 3101;
  function kameraCiz(cikis, W, H, harita, sec) {
    const s = sec || {};
    const gur = s.gurultu === undefined ? 0.075 : s.gurultu, isik = s.isik === undefined ? 1 : s.isik;
    const acik = s.acik || RENK.kagit, kara = RENK.murekkep, gri = !!s.gri;
    for (let y = 0, i = 0; y < H; y++) {
      const by = (y & 7) << 3;
      // Ucuz kamera: satırlar birbirini tam tutmaz.
      kameraR = (Math.imul(kameraR, 1664525) + 1013904223) >>> 0;
      const serit = gri ? ((kameraR >>> 8) / 16777216 - 0.5) * gur * 0.5 : 0;
      for (let x = 0; x < W; x++, i++) {
        kameraR = (Math.imul(kameraR, 1664525) + 1013904223) >>> 0;
        const v = harita[i] * isik + ((kameraR >>> 8) / 16777216 - 0.5) * gur;
        if (gri) {
          const g = Math.max(0, Math.min(255, Math.round(Math.pow(Math.max(0, v + serit), 0.82) * 215 + 4)));
          cikis[i] = 0xff000000 | (g << 16) | (g << 8) | g;
        } else cikis[i] = v > BAYER[by | (x & 7)] ? acik : kara;
      }
    }
    const f = s.figur;
    if (!f) return;
    // Karartı: baş, omuz, aşağı doğru genişleyen gövde. Hiç ışık almaz.
    const boy = f.boy, tepe = f.y - boy, bas = Math.max(1, boy * 0.095), omuz = boy * 0.17;
    const y0 = Math.max(0, Math.floor(tepe)), y1 = Math.min(H - 1, Math.floor(f.y));
    for (let y = y0; y <= y1; y++) {
      const u = (y - tepe) / boy;
      let g;
      if (u < 0.2) g = bas * Math.sqrt(Math.max(0, 1 - ((u - 0.1) / 0.1) ** 2));
      else if (u < 0.27) g = bas * 0.72 + (omuz - bas * 0.72) * ((u - 0.2) / 0.07);
      else g = omuz + (u - 0.27) * boy * 0.09;
      const x0 = Math.max(0, Math.round(f.x - g)), x1 = Math.min(W - 1, Math.round(f.x + g));
      for (let x = x0; x <= x1; x++) cikis[y * W + x] = kara;
    }
    if (f.goz !== false && boy >= 8) {
      const gy = Math.round(tepe + boy * 0.1), ara = Math.max(1, Math.round(bas * 0.5));
      [-ara, ara].forEach((d) => {
        const gx = Math.round(f.x) + d, n = gy * W + gx;
        // Kızılötesinde göz geri parlar. Siyah beyaz kamerada kırmızı olmaz.
        const parlak = gri ? 0xffffffff : RENK.kor;
        if (gx >= 0 && gx < W && gy >= 0 && gy < H) cikis[n] = parlak;
        if (boy >= 34 && gx + 1 < W) cikis[n + 1] = parlak;
      });
    }
  }

  // ---------- bağlantı hatası: hem bir an, hem son ----------
  function oluSayfa(sec) {
    const s = sec || {};
    const e = document.createElement('div');
    e.id = 'olu';
    const baslik = document.createElement('h1');
    baslik.textContent = 'Onionsite Not Found';
    const a = document.createElement('p');
    a.textContent = `An error occurred during a connection to ${onion()}.`;
    const d = document.createElement('p');
    d.id = 'olu-ayrinti';
    d.textContent = "Details: 0xF0 — The requested onion service descriptor can't be found on the hashring and therefore the service is not reachable by the client.";
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = 'Try Again';
    e.append(baslik, a, d, b);
    if (s.son) {
      const k = document.createElement('p');
      k.id = 'olu-sil';
      const t = document.createElement('button');
      t.type = 'button';
      t.textContent = 'kaydımı sil';
      t.addEventListener('click', () => { unut(); location.reload(); });
      k.append(t);
      e.append(k);
      b.addEventListener('click', () => {
        d.textContent = 'Details: 0xF0 — tamam.';
      });
    }
    return { e, baslik, d, b };
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
      // Gizli katlarda portre verisi sonradan yüklenir; ortak.js onu burada bekler.
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
    azalt, RENK, CSS_RENK, BAYER, depo, kayit, unut, kimlik, dinle, yay, javaHash,
    portreResmi, griOrnekle, atkinson, dikisResmi, kalem, muhur, onion, misafir, kameraHarita, kameraCiz, oluSayfa,
  };
})();
