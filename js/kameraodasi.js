// Kamera Odası: on altı ekran, on altıncısı sensin. 04.12'ye kadar çıkar.
// Baktığın kamerada yürümez. Bakmadığında yürür. Kamera açıksa gözünü kırptığında da.
(function () {
  'use strict';
  const O = window.Ortak, Ses = window.Ses, B = window.Bakis, D = window.Davet, Y = window.Yonetmen, Sn = window.Sensor;
  const { depo, azalt } = O;
  const $ = (s) => document.querySelector(s);
  const kok = $('#oda'), izgara = $('#o-izgara'), buyuk = $('#o-b'), bc = buyuk.getContext('2d');
  const BW = buyuk.width, BH = buyuk.height;
  const etiket = $('#o-etiket'), notEl = $('#o-not'), barEl = $('#o-bar'), saatEl = $('#o-saat');
  const giris = $('#o-giris'), girisYazi = $('#o-giris-yazi'), girisIs = $('#o-giris-is');
  const iki = (n) => String(n).padStart(2, '0');

  // ---------- kameralar ----------
  const KAMERA = [
    { ad: 'OTOPARK' }, { ad: 'BAKKAL', x: true }, { ad: 'YURT' }, { ad: 'SOKAK' },
    { ad: 'BİNA GİRİŞİ' }, { ad: 'LABORATUVAR', x: true }, { ad: 'DÜRBÜN' }, { ad: 'MİNİBÜS', x: true },
    { ad: 'ASANSÖR' }, { ad: 'KAT' }, { ad: 'SINIF' }, { ad: 'HOL' },
    { ad: 'MUTFAK' }, { ad: 'BANYO' }, { ad: 'YATAĞIN ALTI' }, { ad: 'MASANIN ARKASI' },
  ];
  // Dışarıdan içeri: otopark, sokak, giriş, merdiven, asansör, kat, hol, mutfak, yatağın altı, sen.
  const YOL = [0, 3, 4, 6, 8, 9, 11, 12, 14];
  const CAM16 = 15;
  const yolda = new Set(YOL);
  const ISIM = (i) => `CAM ${iki(i + 1)}`;
  const dosya = (i, tur) => `assets/kamera/c${iki(i + 1)}_${tur}.jpg`;

  const resim = {};
  function yukle(onGuncel) {
    const liste = [];
    KAMERA.forEach((k, i) => {
      if (i === CAM16) return;
      liste.push([i, 'bos']);
      if (yolda.has(i)) {
        liste.push([i, 'uzak']);
        liste.push([i, 'yakin']);
      }
      if (k.x) liste.push([i, 'x']);
    });
    let bitti = 0;
    return Promise.all(liste.map(([i, t]) => new Promise((c) => {
      const r = new Image();
      r.onload = r.onerror = () => {
        bitti += 1;
        onGuncel(bitti / liste.length);
        c();
      };
      r.src = dosya(i, t);
      resim[`${i}_${t}`] = r;
    })));
  }

  // Kumlanma ve kenar kararması önceden hazır: telefonda on altı kez çizmek ucuz olsun.
  const kum = document.createElement('canvas');
  kum.width = 256;
  kum.height = 256;
  (function () {
    const c = kum.getContext('2d');
    const v = c.createImageData(256, 256), p = new Uint32Array(v.data.buffer);
    for (let i = 0; i < p.length; i++) {
      const a = Math.floor(Math.random() * 46);
      const g = Math.random() < 0.5 ? 0 : 255;
      p[i] = (a << 24) | (g << 16) | (g << 8) | g;
    }
    c.putImageData(v, 0, 0);
  })();
  const kenar = document.createElement('canvas');
  kenar.width = 240;
  kenar.height = 180;
  (function () {
    const c = kenar.getContext('2d');
    const g = c.createRadialGradient(120, 90, 50, 120, 90, 150);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,.72)');
    c.fillStyle = g;
    c.fillRect(0, 0, 240, 180);
  })();

  // ---------- oyun durumu ----------
  const SAAT_BAS = 3 * 60 + 41;
  const SN_DK = 6;              // bir oyun dakikası
  const SONUNA = 27 * SN_DK;    // 04.08: bütün kameralar gider
  const ASAMA_SN = 7;           // bakmazsan bir aşama
  const BAKIS_SN = 8;           // bir bakış gücü
  const hucre = [];
  let secili = 0, adim = 0, birikim = 0, bakisGuc = 1, dinleniyor = 0, oyunda = false, baslangic = 0;
  let parazit = new Map(), durumHarita = new Map(), kapali = new Set(), gozle = 0, tamBakis = 0, hareketHucre = -1, hareketBitis = 0;
  let kirpmaSayi = 0, gosterilenDk = -1;
  const izin = { hareketIlk: 2 };

  const konum = () => {
    const n = Math.floor(adim / 2);
    return n < YOL.length ? YOL[n] : CAM16;
  };
  const asama = () => (adim % 2 === 0 ? 'uzak' : 'yakin');
  function hucreTur(i) {
    if (kapali.has(i)) return null;
    if (oyunda && i === konum() && adim < YOL.length * 2) return asama();
    if (durumHarita.get(i)) return durumHarita.get(i);
    return 'bos';
  }

  // ---------- çizim ----------
  function feedCiz(c, W, H, i, sec) {
    const s = sec || {};
    const n = performance.now();
    if (kapali.has(i) || (parazit.get(i) || 0) > n) {
      c.fillStyle = '#000';
      c.fillRect(0, 0, W, H);
      if (!azalt) {
        for (let k = 0; k < 3; k++) c.drawImage(kum, Math.random() * 180, Math.random() * 180, 76, 76, 0, (k * H) / 3, W, H / 3 + 1);
        c.globalAlpha = 0.65;
        c.drawImage(kum, Math.random() * 100, Math.random() * 100, 156, 156, 0, 0, W, H);
        c.globalAlpha = 1;
      }
      return;
    }
    if (i === CAM16) {
      bizimOda(c, W, H);
      return;
    }
    const r = resim[`${i}_${hucreTur(i)}`];
    if (r && r.complete && r.naturalWidth) c.drawImage(r, 0, 0, W, H);
    else {
      c.fillStyle = '#0a0a0a';
      c.fillRect(0, 0, W, H);
    }
    if (!azalt) {
      c.globalAlpha = s.kumGuc || 0.6;
      c.drawImage(kum, Math.random() * 128, Math.random() * 128, 128, 128, 0, 0, W, H);
      c.globalAlpha = 1;
      c.fillStyle = `rgba(255,255,255,${(Math.random() * 0.018).toFixed(3)})`;
      c.fillRect(0, 0, W, H);
    }
    c.drawImage(kenar, 0, 0, W, H);
  }

  // CAM 16: sen. Kamera varsa gerçekten, yoksa çizim.
  const cizimT = document.createElement('canvas');
  cizimT.width = 88;
  cizimT.height = 66;
  const cizimC = cizimT.getContext('2d');
  const cizimV = cizimC.createImageData(88, 66), cizimP = new Uint32Array(cizimV.data.buffer);
  const cizimH = O.kameraHarita('sandalye', 88, 66);
  function bizimOda(c, W, H) {
    if (B.acikMi() && B.ciz(c, W, H)) {
      if (W <= BW) B.griIsle(c, W, H, { gurultu: azalt ? 3 : 12 });
      return;
    }
    O.kameraCiz(cizimP, 88, 66, cizimH, { gurultu: azalt ? 0.012 : 0.1, gri: true });
    cizimC.putImageData(cizimV, 0, 0);
    c.imageSmoothingEnabled = false;
    c.drawImage(cizimT, 0, 0, W, H);
    c.imageSmoothingEnabled = true;
  }

  function hucreKur() {
    if (hucre.length) return;
    KAMERA.forEach((k, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'o-hucre';
      b.setAttribute('aria-label', `${ISIM(i)}, ${k.ad}`);
      const t = document.createElement('canvas');
      t.width = 120;
      t.height = 90;
      const e = document.createElement('span');
      e.textContent = String(i + 1).padStart(2, '0');
      b.append(t, e);
      b.addEventListener('click', () => sec(i));
      izgara.appendChild(b);
      hucre.push({ b, c: t.getContext('2d', { willReadFrequently: i === CAM16 }) });
    });
  }
  function etiketYaz() {
    const k = KAMERA[secili];
    etiket.textContent = `${ISIM(secili)} · ${k.ad}`;
    hucre.forEach((h, i) => h.b.classList.toggle('secili', i === secili));
  }
  function sec(i) {
    if (!oyunda || kapali.has(i) || i === secili) return;
    secili = i;
    etiketYaz();
    Ses.tik(0.3);
    parazit.set(i, performance.now() + (azalt ? 0 : 140));
  }

  let sonBuyuk = 0, sonKucuk = 0, kucukSira = 0;
  function dongu(z) {
    if (kok.hidden) return;
    requestAnimationFrame(dongu);
    if (document.hidden) return;
    if (z - sonBuyuk >= (azalt ? 400 : 90)) {
      sonBuyuk = z;
      feedCiz(bc, BW, BH, secili, { kumGuc: 0.75 });
    }
    // Her seferinde dört hücre: on altısı birden telefonda ağır.
    if (z - sonKucuk >= (azalt ? 500 : 80)) {
      sonKucuk = z;
      for (let k = 0; k < 4; k++) {
        const i = (kucukSira + k) % hucre.length;
        feedCiz(hucre[i].c, 120, 90, i, { kumGuc: 0.45 });
      }
      kucukSira = (kucukSira + 4) % hucre.length;
      hucre.forEach((h, i) => h.b.classList.toggle('hareket', i === hareketHucre && performance.now() < hareketBitis));
    }
  }

  // ---------- oyun ----------
  function saatYaz(t) {
    const dk = SAAT_BAS + Math.floor(t / SN_DK);
    if (dk === gosterilenDk) return;
    gosterilenDk = dk;
    saatEl.textContent = `${iki(Math.floor(dk / 60))}:${iki(dk % 60)}`;
    depo.yaz('odasaat', saatEl.textContent);
  }
  function notYaz(m) {
    notEl.textContent = m;
  }
  function yanyana(i, j) {
    const n = performance.now() + (azalt ? 120 : 420);
    parazit.set(i, n);
    if (j !== undefined) parazit.set(j, n);
  }
  function yuru() {
    const onceki = konum();
    adim += 1;
    birikim = 0;
    const sonraki = konum();
    if (onceki !== sonraki) {
      yanyana(onceki, sonraki);
      hareketHucre = sonraki;
      hareketBitis = performance.now() + (izin.hareketIlk > 0 ? 3600 : 1300);
      if (izin.hareketIlk > 0) {
        izin.hareketIlk -= 1;
        notYaz(`Hareket: ${ISIM(sonraki)}.`);
        setTimeout(() => notYaz(''), 2600);
      }
      const uzak = (YOL.length - Math.floor(adim / 2)) / YOL.length;
      const m = 0.8 + uzak * 6.5;
      const a = (sonraki * 37) % 120 - 60;
      const x = Math.sin(a) * m, zz = Math.abs(Math.cos(a)) * m;
      Ses.adimlar(x, zz, 0.42 - (1 - uzak) * 0.14, 3);
      Sn.titret(uzak < 0.3 ? [40, 60, 40] : 30);
      Y.gerilim(0.72 + (1 - uzak) * 0.2);
      Ses.ortamKis(Math.max(0.3, uzak + 0.15));
      // Yaklaştıkça duvarların ardındaki koro sıklaşır.
      Ses.kume(0.06 + (1 - uzak) * 0.74);
      const yol = Math.floor(adim / 2);
      if (yol === 5) Ses.kayit('titresim', { x: 0.5, z: -0.4, ses: 0.11, sure: 3.1 });
      if (yol === 6) Ses.kayit('kumas2', { x: -1.2, z: 0.9, ses: 0.5, yanki: 0.3 });
      if (yol === 7) Ses.kayit('kazima', { x: 0.9, z: 1.3, ses: 0.5, yanki: 0.4 });
      if (yol >= 7) Ses.purus(4.2, 0.05 + (yol - 7) * 0.02, -0.4);
    } else {
      yanyana(sonraki);
      Ses.parazit(0.12, 0.04);
    }
    if (adim >= YOL.length * 2) bitis('geldi');
  }
  function geri() {
    if (adim <= 0) return;
    const onceki = konum();
    adim -= 1;
    birikim = 0;
    const sonraki = konum();
    yanyana(onceki, sonraki);
    notYaz('Geri gitti.');
    setTimeout(() => notYaz(''), 2200);
    Ses.parazit(0.2, 0.05);
    Ses.kume(0.06 + (Math.floor(adim / 2) / YOL.length) * 0.74);
  }
  let sonTik = 0;
  function tik() {
    if (!oyunda) return;
    const n = performance.now();
    const dt = Math.min(0.5, (n - sonTik) / 1000);
    sonTik = n;
    if (document.hidden) return;
    const t = (n - baslangic) / 1000;
    saatYaz(t);
    if (t >= SONUNA) {
      bitis('saat');
      return;
    }
    const bakiyor = secili === konum() && adim < YOL.length * 2 && n > dinleniyor;
    if (n <= dinleniyor) {
      birikim += dt;
    } else if (bakiyor) {
      tamBakis += dt;
      bakisGuc = Math.max(0, bakisGuc - dt / BAKIS_SN);
      if (bakisGuc <= 0) {
        // Bir bakışı sonuna kadar tuttun: bir aşama geri. Görüntü de gider, göz dinlenir.
        tamBakis = 0;
        geri();
        dinleniyor = n + 2600;
        parazit.set(secili, dinleniyor);
        Ses.parazit(0.5, 0.06);
      }
    } else {
      bakisGuc = Math.min(1, bakisGuc + dt / 11);
      birikim += dt;
    }
    barEl.style.width = `${(bakisGuc * 100).toFixed(1)}%`;
    if (birikim >= ASAMA_SN) yuru();
  }

  let bitti = false, saatSes = null;
  async function bitis(neden) {
    if (bitti) return;
    bitti = true;
    oyunda = false;
    clearInterval(tikZ);
    Y.gerilim(0.94);
    // Uzaktaysa son sahne de uzaktan başlar: iyi oynayanın payı.
    const uzaklik = Math.max(0, Math.min(1, (YOL.length * 2 - adim) / (YOL.length * 2)));
    depo.yaz('oda-uzak', uzaklik.toFixed(2));
    notYaz(neden === 'saat' ? 'Bütün kameralar gidiyor.' : 'CAM 16.');
    Ses.ortamKis(0.25);
    if (saatSes) saatSes();
    saatSes = null;
    Ses.ters(2.6, 0.26);
    setTimeout(() => Ses.kume(0), azalt ? 0 : 2610);
    // Kameralar teker teker gider. Sonuncusu sensin.
    const sira = KAMERA.map((_, i) => i).filter((i) => i !== CAM16);
    for (const i of sira) {
      kapali.add(i);
      if (secili === i) {
        secili = CAM16;
        etiketYaz();
      }
      Ses.parazit(0.07, 0.04);
      await Y.bekle(170);
    }
    secili = CAM16;
    etiketYaz();
    await Y.bekle(1500);
    await window.Arkanda.basla({ uzaklik, kirpma: kirpmaSayi });
  }

  let tikZ = 0;
  function kurallar() {
    return new Promise((coz) => {
      giris.hidden = false;
      girisIs.textContent = '';
      const kamera = B.hazirMi();
      const satirlar = ['Bu bir oyun. Geliştiricisi konuşmaz, kuralları burada yazıyor.',
        '04.12\'ye kadar çık.',
        'Bir şey dışarıdan geliyor. Baktığın kamerada yürümez, bakmadığında yürür.',
        kamera ? 'Gözünü kırptığında da yürür. Yüzün görünmezse de.' : 'Bir bakışın gücü sınırlı. Sonuna kadar tutarsan bir adım geri gider.',
        'En son kamera sensin.'];
      girisYazi.textContent = '';
      satirlar.forEach((s) => Y.satir(girisYazi, s));
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'k-dugme';
      b.textContent = 'gece başlasın';
      b.addEventListener('click', () => {
        // iPhone hareket sensörünü ancak bir dokunuşla açar.
        window.Sensor.izinIste();
        depo.yaz('gecebas', depo.al('gecebas') || String(Date.now()));
        giris.hidden = true;
        coz();
      });
      girisIs.appendChild(b);
      // Kulaklık takılıysa: kendi nefesin. Ayrı izin, zorunlu değil.
      if (depo.al('kulaklik') === '1' && Ses.acikMi() && navigator.mediaDevices && !window.Arkanda.Mik.akim) {
        const m = document.createElement('button');
        m.type = 'button';
        m.className = 'k-dugme ikincil';
        m.textContent = 'mikrofonu da aç';
        const not = document.createElement('p');
        not.className = 'k-acik-not';
        not.textContent = 'Mikrofon zorunlu değil. Ses kaydedilmez; yalnızca birkaç saniye geciktirilip kulaklığına verilir. Yalnızca kulaklıkla aç.';
        girisYazi.appendChild(not);
        m.addEventListener('click', async () => {
          const ok = await window.Arkanda.Mik.ac();
          m.remove();
          if (ok) window.Arkanda.Mik.rozet();
          not.textContent = ok ? 'Duydum.' : 'Peki. Duymam.';
        });
        girisIs.appendChild(m);
      }
      b.focus({ preventScroll: true });
    });
  }

  Y.kaydet('oda', async () => {
    bitti = false;
    hucreKur();
    adim = 0;
    birikim = 0;
    bakisGuc = 1;
    dinleniyor = 0;
    secili = 0;
    kapali = new Set();
    durumHarita = new Map();
    parazit = new Map();
    izin.hareketIlk = 2;
    gosterilenDk = -1;
    etiketYaz();
    saatYaz(0);
    notYaz('');
    $('#o-sag').textContent = D.ad() || '';
    Y.gerilim(0.6);
    giris.hidden = false;
    girisYazi.textContent = 'Kameralar bağlanıyor…';
    girisIs.textContent = '';
    requestAnimationFrame(dongu);
    await yukle((p) => { girisYazi.textContent = `Kameralar bağlanıyor… ${Math.round(p * 16)}/16`; });
    await kurallar();
    oyunda = true;
    baslangic = performance.now();
    sonTik = baslangic;
    tikZ = setInterval(tik, 200);
    Ses.adimlar(-3.5, 5, 0.34, 3);
    Ses.separd(0);
    Ses.kume(0.06);
    // Odadaki saat. Asıl saat değil, ama aynı yere gidiyor.
    saatSes = Ses.kayit('saat', { x: -1.5, z: -0.5, ses: 0.16, dongu: true, yanki: 0.12 });
    // Kamera açıksa: göz kırpmak bakmamaktır, yüz yoksa yürür.
    const k1 = B.dinle('kirpti', () => {
      if (!oyunda) return;
      kirpmaSayi += 1;
      birikim += 1.1;
    });
    const k2 = B.dinle('ikinci-yuz', () => {
      if (!oyunda) return;
      notYaz('Yanındaki kim?');
      setTimeout(() => notYaz(''), 3100);
    });
    const k3 = B.dinle('isik-acildi', () => {
      if (!oyunda) return;
      notYaz('Işığı açman bir şey değiştirmez.');
      setTimeout(() => notYaz(''), 3100);
    });
    const yuzKontrol = setInterval(() => {
      if (!oyunda) {
        clearInterval(yuzKontrol);
        k1();
        k2();
        k3();
        return;
      }
      if (B.hazirMi() && !B.d.yuzVar) birikim += 0.3;
    }, 1000);
    // Sahte hareketler: boş kamerada bir şey değişir, göz oraya kayar.
    (function aldat() {
      setTimeout(() => {
        if (!oyunda) return;
        const adaylar = KAMERA.map((k, i) => (k.x && !kapali.has(i) ? i : -1)).filter((i) => i >= 0);
        if (adaylar.length) {
          const i = adaylar[Math.floor(Math.random() * adaylar.length)];
          durumHarita.set(i, durumHarita.get(i) === 'x' ? 'bos' : 'x');
          parazit.set(i, performance.now() + 260);
          // Sahte bir ses de: göz oraya, kulak arkaya.
          if (Math.random() < 0.5) Ses.kayit('sayfa', { x: 1.4, z: 1.1, ses: 0.34, yanki: 0.3 });
        }
        aldat();
      }, 11000 + Math.random() * 12000);
    })();
  });
})();
