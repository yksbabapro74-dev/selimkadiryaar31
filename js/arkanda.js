// CAM 16 büyür. Kamera açıksa o sensin: figür gerçekten arkanda durur, omzun onu kapatır, yalnızca sen gözünü kırpınca yürür.
// Kamera kapalıysa çizim: kıpırdama. Görüntü, ses, sensör: hiçbiri bu sekmeden çıkmaz.
window.Arkanda = (function () {
  'use strict';
  const O = window.Ortak, Ses = window.Ses, B = window.Bakis, D = window.Davet, Y = window.Yonetmen, Sn = window.Sensor;
  const { depo, azalt } = O;
  const $ = (s) => document.querySelector(s);
  const kok = $('#arkanda'), t = $('#a-t'), yazi = $('#a-yazi'), sayac = $('#a-sayac'), isEl = $('#a-is'), saat = $('#a-saat');
  const W = 240, H = 180;
  t.width = W;
  t.height = H;
  const c = t.getContext('2d', { willReadFrequently: true });
  const uyu = Y.uyu, bekle = Y.bekle;

  // ---------- figür ----------
  // Yüzü yok. Kapüşon, omuz, iki küçük parıltı: gözlük. Kim olduğu söylenmez.
  const F_G = 260, F_Y = 520;
  const fT = document.createElement('canvas');
  fT.width = F_G;
  fT.height = F_Y;
  (function () {
    const f = fT.getContext('2d');
    const orta = F_G / 2;
    f.fillStyle = '#050505';
    f.beginPath();
    f.moveTo(orta - 40, 0 + 22);
    f.bezierCurveTo(orta - 66, 40, orta - 68, 98, orta - 52, 132);
    f.bezierCurveTo(orta - 96, 150, orta - 122, 186, orta - 128, 250);
    f.lineTo(orta - 130, F_Y);
    f.lineTo(orta + 130, F_Y);
    f.lineTo(orta + 128, 250);
    f.bezierCurveTo(orta + 122, 186, orta + 96, 150, orta + 52, 132);
    f.bezierCurveTo(orta + 68, 98, orta + 66, 40, orta + 40, 22);
    f.bezierCurveTo(orta + 18, 2, orta - 18, 2, orta - 40, 22);
    f.closePath();
    f.fill();
    // Kapüşonun içi biraz daha koyu, kenarı biraz ışık alır.
    f.strokeStyle = 'rgba(120,120,120,.16)';
    f.lineWidth = 3;
    f.stroke();
    f.fillStyle = '#000';
    f.beginPath();
    f.ellipse(orta, 78, 36, 46, 0, 0, Math.PI * 2);
    f.fill();
  })();
  // Kameralardaki figürün aynısı. Dosya gelmezse yukarıdaki çizim kalır.
  let basOran = { x: 0.5, y: 0.15 };
  (function () {
    const r = new Image();
    r.onload = () => {
      const f = fT.getContext('2d');
      f.clearRect(0, 0, F_G, F_Y);
      const k = Math.min(F_G / r.naturalWidth, F_Y / r.naturalHeight);
      const g = r.naturalWidth * k, y = r.naturalHeight * k;
      f.drawImage(r, (F_G - g) / 2, F_Y - y, g, y);
      basOran = { x: ((F_G - g) / 2 + g * 0.588) / F_G, y: (F_Y - y + y * 0.111) / F_Y };
    };
    r.src = 'assets/kamera/figur.png';
  })();
  const fCik = document.createElement('canvas');
  fCik.width = W;
  fCik.height = H;
  const fc = fCik.getContext('2d', { willReadFrequently: true });

  function asamaYer(s, yan, yuz) {
    // s: 0 kapı, 5 omzunda. Boy karenin kesri.
    const BOY = [0.46, 0.58, 0.74, 0.98, 1.3, 1.72];
    const boy = BOY[s] * H;
    const yuzX = yuz ? yuz.x + yuz.g / 2 : W / 2;
    const yuzG = yuz ? yuz.g : W * 0.26;
    const UZAK = [0.38, 0.36, 0.33, 0.3, 0.26, 0.2];
    let x = yuzX + yan * Math.max(yuzG * 1.1, UZAK[s] * W);
    x = Math.max(boy * 0.18, Math.min(W - boy * 0.18, x));
    const tepe = s < 3 ? H * (0.3 - s * 0.05) : H * (0.16 - (s - 3) * 0.12);
    return { x, tepe, boy };
  }
  function figurCiz(p, n) {
    fc.clearRect(0, 0, W, H);
    const g = (p.boy * F_G) / F_Y;
    fc.drawImage(fT, p.x - g / 2, p.tepe, g, p.boy);
    return { x: p.x, tepe: p.tepe, boy: p.boy, g };
  }
  function parilti(cx, p, n) {
    const bx = p.x + (basOran.x - 0.5) * p.g;
    const gy = p.tepe + p.boy * basOran.y, ara = p.boy * 0.024, r = Math.max(0.6, p.boy * 0.0062);
    // Nadiren söner: o da kırpıyor mu?
    if (Math.sin(n / 1700) > 0.985) return;
    cx.fillStyle = 'rgba(232,232,232,.86)';
    [-1, 1].forEach((d) => {
      cx.beginPath();
      cx.arc(bx + d * ara, gy, r, 0, Math.PI * 2);
      cx.fill();
    });
  }
  // Ayırıcı hazır değilse kişi: yüz elipsi ve omuzlar.
  function kabaMaske(i, x, y, yuz) {
    if (!yuz) return 0;
    const dx = (x - (yuz.x + yuz.g / 2)) / (yuz.g * 0.72), dy = (y - (yuz.y + yuz.h / 2)) / (yuz.h * 0.78);
    if (dx * dx + dy * dy < 1) return 1;
    const omuzY = yuz.y + yuz.h * 1.15;
    return y > omuzY && Math.abs(x - (yuz.x + yuz.g / 2)) < yuz.g * (0.8 + (y - omuzY) / yuz.h) ? 1 : 0;
  }
  function yuzKutu() {
    const y = B.d.yuz;
    if (!y) return null;
    const [x0, y0] = B.yer(y.x, y.y, W, H);
    const [x1, y1] = B.yer(y.x + y.g, y.y + y.y2, W, H);
    return { x: x0, y: y0, g: x1 - x0, h: y1 - y0 };
  }

  // ---------- kamera yolu: gözünü kırpma ----------
  const TOPLAM = 24000, DONMA = 3100;
  async function gozSahnesi(ayar) {
    B.ayiriciAc();
    const hedefYuz = yuzKutu();
    const yan = hedefYuz && hedefYuz.x + hedefYuz.g / 2 > W / 2 ? -1 : 1;
    let s = ayar.uzaklik > 0.3 ? 0 : ayar.uzaklik > 0.1 ? 1 : 2;
    const sinir = 6 - s;
    let kirp = 0, bitti = false, donuk = false;
    let yer = asamaYer(s, yan, hedefYuz || { x: W / 2 - 30, y: 40, g: 60, h: 80 });
    const sabitYuz = hedefYuz || { x: W / 2 - 30, y: 40, g: 60, h: 80 };
    yazi.textContent = '';
    sayac.textContent = '';
    let sonuc = null;
    const bitir = (r) => {
      if (bitti) return;
      bitti = true;
      sonuc = r;
    };
    function ilerle() {
      s += 1;
      if (s > 5) {
        bitir('yakalandi');
        return;
      }
      yer = asamaYer(s, yan, sabitYuz);
      Sn.kalpAt(52 + s * 16);
      Sn.titret(35);
      // Görmediğin an yürür; duyarsın. Son adımda kokusunu alıyor.
      const m = 2.4 - s * 0.42;
      Ses.adimlar(yan * m * 0.5, m, 0.34, 1);
      if (s === 4) Ses.kayit('kumas2', { x: yan * 0.4, z: 0.35, ses: 0.55 });
      if (s === 5) Ses.kayit('kokla', { x: yan * 0.16, z: 0.14, ses: 0.72 });
    }
    let son = 0, sonUzak = 0;
    const baslangic = performance.now();
    await new Promise((coz) => {
      const k1 = B.dinle('kirpti', () => {
        if (bitti || performance.now() - baslangic < 2600) return;
        kirp += 1;
        ilerle();
        sayac.textContent = `kırpma: ${kirp}/${sinir}`;
      });
      const gizli = () => { if (document.hidden) bitir('kacti'); };
      document.addEventListener('visibilitychange', gizli);
      (function k(z) {
        if (bitti) {
          k1();
          document.removeEventListener('visibilitychange', gizli);
          coz();
          return;
        }
        requestAnimationFrame(k);
        const n = performance.now();
        const g = n - baslangic;
        if (!B.acikMi()) {
          bitir('kapatti');
          return;
        }
        if (g >= TOPLAM) bitir('gecti');
        if (g > TOPLAM - DONMA && !donuk) {
          donuk = true;
          Ses.nefesKes();
          Sn.kalpAt(0);
        }
        // Yüzünü çektin ya da başını çevirdin: bakmıyorsun.
        if (g > 3400 && (!B.d.bakiyor && !B.d.gozKapali) && n - sonUzak > 1700) {
          sonUzak = n;
          ilerle();
        }
        if (z - son < (azalt ? 300 : 66) || donuk) return;
        son = z;
        if (!B.ciz(c, W, H)) return;
        B.griIsle(c, W, H, { gurultu: azalt ? 3 : 11 });
        const p = figurCiz(yer, n);
        const ana = c.getImageData(0, 0, W, H), figur = fc.getImageData(0, 0, W, H);
        const a = ana.data, f = figur.data;
        const m = B.maske(W, H), kaba = yuzKutu();
        for (let y = 0, i = 0, j = 0; y < H; y++) {
          for (let x = 0; x < W; x++, i++, j += 4) {
            if (f[j + 3] < 8) continue;
            const kisi = m ? m[i] : kabaMaske(i, x, y, kaba);
            if (kisi) continue;
            const o = f[j + 3] / 255;
            // Hiç ışık almaz ama kumu vardır: kameranın gördüğü kadar.
            const k = 6 + Math.random() * 7;
            a[j] = a[j] * (1 - o) + k * o;
            a[j + 1] = a[j + 1] * (1 - o) + k * o;
            a[j + 2] = a[j + 2] * (1 - o) + k * o;
          }
        }
        c.putImageData(ana, 0, 0);
        parilti(c, p, n);
      })(0);
      setTimeout(() => {
        if (bitti) return;
        yazi.textContent = 'gözünü kırpma.';
        sayac.textContent = `kırpma: 0/${sinir}`;
      }, azalt ? 300 : 2200);
    });
    B.ayiriciKapat();
    Sn.kalpAt(0);
    return { sonuc, kirp };
  }

  // ---------- çizim yolu: kıpırdama ----------
  async function cizimSahnesi() {
    const v = c.createImageData(W, H), px = new Uint32Array(v.data.buffer);
    const har = O.kameraHarita('arka-acik', W, H);
    let bitti = false, sonuc = null, donuk = false, g = 0;
    const bas = performance.now();
    const bitir = (r) => {
      if (bitti) return;
      bitti = true;
      sonuc = r;
    };
    // Aşama aşama gelir: kapının önünden omzuna. Araya parazit girer, yürürken görmezsin.
    const ADIM = [
      { x: 0.235, tepe: 0.2, boy: 0.5 },
      { x: 0.34, tepe: 0.2, boy: 0.62 },
      { x: 0.52, tepe: 0.13, boy: 0.8 },
      { x: 0.63, tepe: 0.04, boy: 1.06 },
      { x: 0.68, tepe: -0.08, boy: 1.5 },
    ];
    const SURE = 18600, ASAMA = (SURE - 3100) / ADIM.length;
    let onceki = 0, parazitBit = 0;
    (function k() {
      if (bitti) return;
      requestAnimationFrame(k);
      const n = performance.now();
      g = n - bas;
      if (donuk) return;
      const a = Math.min(ADIM.length - 1, Math.floor(g / ASAMA));
      if (a !== onceki) {
        onceki = a;
        parazitBit = n + (azalt ? 0 : 170);
        Ses.parazit(0.1, 0.04);
        Sn.titret(30);
      }
      O.kameraCiz(px, W, H, har, { gri: true, gurultu: azalt ? 0.012 : 0.09 });
      c.putImageData(v, 0, 0);
      if (n < parazitBit) {
        c.fillStyle = 'rgba(0,0,0,.72)';
        c.fillRect(0, 0, W, H);
        return;
      }
      const d = ADIM[a], boy = d.boy * H, gen = (boy * F_G) / F_Y, x = d.x * W, tepe = d.tepe * H;
      c.drawImage(fT, x - gen / 2, tepe, gen, boy);
      parilti(c, { x, tepe, boy, g: gen }, n);
      // Sen: arkadan, ekranın ışığında. Baş ve omuz.
      c.fillStyle = '#040404';
      c.beginPath();
      c.ellipse(W * 0.5, H * 0.71, H * 0.135, H * 0.165, 0, 0, Math.PI * 2);
      c.fill();
      c.beginPath();
      c.moveTo(W * 0.5 - H * 0.42, H);
      c.bezierCurveTo(W * 0.5 - H * 0.38, H * 0.86, W * 0.5 - H * 0.16, H * 0.86, W * 0.5 - H * 0.08, H * 0.82);
      c.lineTo(W * 0.5 + H * 0.08, H * 0.82);
      c.bezierCurveTo(W * 0.5 + H * 0.16, H * 0.86, W * 0.5 + H * 0.38, H * 0.86, W * 0.5 + H * 0.42, H);
      c.closePath();
      c.fill();
    })();
    await bekle(1800);
    yazi.textContent = Sn.dokunmatik ? 'kıpırdama. telefonu da.' : 'kıpırdama.';
    await new Promise((coz) => {
      const basAn = performance.now();
      let onceki = null, yol = 0;
      const tepki = (e) => {
        if (performance.now() - basAn < 1200) {
          onceki = null;
          return;
        }
        if (e.type === 'pointermove' && e.pointerType !== 'touch') {
          if (onceki) yol += Math.hypot(e.clientX - onceki[0], e.clientY - onceki[1]);
          onceki = [e.clientX, e.clientY];
          if (yol > 14) bitir('yakalandi');
          return;
        }
        bitir('yakalandi');
      };
      const OLAY = ['pointermove', 'pointerdown', 'keydown', 'wheel', 'touchstart'];
      OLAY.forEach((o) => addEventListener(o, tepki, { passive: true }));
      const durHareket = Sn.hareketDinle(() => {
        if (performance.now() - basAn > 1200) bitir('yakalandi');
      }, 1.3);
      const gizli = () => { if (document.hidden) bitir('kacti'); };
      document.addEventListener('visibilitychange', gizli);
      Sn.kalpAt(72);
      const donZ = setTimeout(() => {
        donuk = true;
        Ses.nefesKes();
        Sn.kalpAt(0);
      }, 15500);
      const bitZ = setTimeout(() => bitir('gecti'), 18600);
      const bk = setInterval(() => {
        if (!bitti) return;
        clearInterval(bk);
        clearTimeout(donZ);
        clearTimeout(bitZ);
        OLAY.forEach((o) => removeEventListener(o, tepki));
        durHareket();
        document.removeEventListener('visibilitychange', gizli);
        Sn.kalpAt(0);
        coz();
      }, 100);
    });
    return { sonuc, kirp: 0 };
  }

  // ---------- yakalanınca ----------
  async function yuz() {
    if (azalt) return;
    try {
      if (!window.PORTRE_VERI) {
        await new Promise((c1, r) => {
          const b = document.createElement('script');
          b.src = 'js/portre-veri.js';
          b.onload = c1;
          b.onerror = r;
          document.head.appendChild(b);
        });
      }
      const r = await O.portreResmi();
      const e = document.createElement('canvas');
      e.id = 'a-yuz';
      const n = innerWidth < 700 ? 2 : 3;
      const g = Math.floor(innerWidth / n), y = Math.floor(innerHeight / n);
      e.width = g;
      e.height = y;
      const x = e.getContext('2d');
      const v = x.createImageData(g, y);
      O.atkinson(O.griOrnekle(r, g, y, [0, 0.3, 1, 0.66]), g, y, null, new Uint32Array(v.data.buffer), O.RENK.kor, 0xff000000);
      x.putImageData(v, 0, 0);
      document.body.appendChild(e);
      Ses.cigilik(0.8);
      Ses.kayit('omuz', { x: 0.2, z: 0.22, ses: 0.8 });
      Sn.titret([180, 40, 120]);
      await uyu(430);
      e.remove();
    } catch (h) { /* yüz gelmediyse yazı yeter */ }
  }

  // ---------- arkana dön: arka kamera ve telefonun yönü ----------
  function dugmeler(l) {
    isEl.textContent = '';
    return new Promise((coz) => {
      l.forEach((d) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = d.ikincil ? 'k-dugme ikincil' : 'k-dugme';
        b.textContent = d.yazi;
        b.addEventListener('click', () => {
          isEl.textContent = '';
          coz(d.deger);
        });
        isEl.appendChild(b);
      });
    });
  }
  async function arkanaDon() {
    if (!Sn.dokunmatik || azalt) return false;
    yazi.textContent = 'Gitti mi, bak.';
    sayac.textContent = 'Arka kamerayı açar. Görüntü yine yalnızca bu sekmede kalır.';
    const k = await dugmeler([{ yazi: 'bak', deger: 1 }, { yazi: 'bakma', deger: 0, ikincil: true }]);
    sayac.textContent = '';
    if (!k) return false;
    await Sn.izinIste();
    B.durdur();
    let akim = null;
    try {
      akim = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 640 } }, audio: false });
    } catch (h) {
      return false;
    }
    const v = document.createElement('video');
    v.muted = true;
    v.playsInline = true;
    v.setAttribute('playsinline', '');
    v.srcObject = akim;
    try { await v.play(); } catch (h) { /* görüntü gelmezse aşağıda geçilir */ }
    const kapat = () => {
      akim.getTracks().forEach((x) => x.stop());
      v.srcObject = null;
    };
    yazi.textContent = 'Yavaşça arkana dön.';
    let yon = null, ilk = null, gorulen = 0, bitti = false;
    const dur = Sn.yonDinle((e) => {
      yon = e;
      if (!ilk) ilk = { alfa: e.alfa, beta: e.beta };
    });
    const gec = document.createElement('button');
    gec.type = 'button';
    gec.className = 'k-dugme ikincil';
    gec.textContent = 'kamerayı kapat';
    gec.addEventListener('click', () => { bitti = true; });
    isEl.appendChild(gec);
    const bas = performance.now();
    await new Promise((coz) => {
      let son = 0;
      (function d(z) {
        const n = performance.now();
        if (bitti || n - bas > 42000 || (n - bas > 3000 && !yon)) {
          coz();
          return;
        }
        requestAnimationFrame(d);
        if (z - son < 80) return;
        son = z;
        const vw = v.videoWidth, vh = v.videoHeight;
        if (!vw) return;
        const k2 = Math.max(W / vw, H / vh), sw = W / k2, sh = H / k2;
        c.drawImage(v, (vw - sw) / 2, (vh - sh) / 2, sw, sh, 0, 0, W, H);
        B.griIsle(c, W, H, { gurultu: 13 });
        if (!yon || !ilk) return;
        const hedef = ilk.alfa + 180;
        const fark = ((yon.alfa - hedef + 540) % 360) - 180;
        const x = W * (0.5 + fark / 58);
        const tepe = H * (0.16 + ((yon.beta || 90) - (ilk.beta || 90)) / 62);
        if (x > -60 && x < W + 60) {
          const boy = H * 0.84, g2 = (boy * F_G) / F_Y;
          c.globalAlpha = 0.97;
          c.drawImage(fT, x - g2 / 2, tepe, g2, boy);
          c.globalAlpha = 1;
          parilti(c, { x, tepe, boy, g: g2 }, n);
          if (Math.abs(fark) < 12) {
            if (!gorulen) gorulen = n;
            if (n - gorulen > 2900) bitti = true;
          } else gorulen = 0;
        }
      })(0);
    });
    dur();
    isEl.textContent = '';
    kapat();
    c.fillStyle = '#000';
    c.fillRect(0, 0, W, H);
    Ses.parazit(0.3, 0.08);
    Sn.titret(120);
    yazi.textContent = gorulen ? 'Gitmemiş.' : '';
    await bekle(gorulen ? 2600 : 300);
    return !!gorulen;
  }

  // ---------- mikrofon: kendi nefesin ----------
  let mikKapat = null;
  const Mik = {
    akim: null,
    async ac() {
      try {
        Mik.akim = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: true } });
        return true;
      } catch (e) {
        return false;
      }
    },
    bagla() {
      if (Mik.akim && Ses.acikMi()) mikKapat = Ses.arkadanVer(Mik.akim, 7, 1.5);
    },
    kapat() {
      if (mikKapat) mikKapat();
      mikKapat = null;
      if (Mik.akim) Mik.akim.getTracks().forEach((x) => x.stop());
      Mik.akim = null;
      const r = document.getElementById('mik-rozet');
      if (r) r.remove();
    },
    rozet() {
      if (document.getElementById('mik-rozet')) return;
      const r = document.createElement('button');
      r.id = 'mik-rozet';
      r.type = 'button';
      r.textContent = 'mikrofon açık · kapat';
      r.addEventListener('click', Mik.kapat);
      document.body.appendChild(r);
    },
  };

  // ---------- sahne ----------
  async function basla(ayar) {
    const a = ayar || { uzaklik: 0.2 };
    Y.goster('arkanda');
    kok.hidden = false;
    yazi.textContent = '';
    sayac.textContent = '';
    isEl.textContent = '';
    saat.textContent = depo.al('odasaat') || '04:08';
    O.gerilim.sus = true;
    Ses.kalp(0);
    Ses.sus(3.1);
    Ses.cinlama(0.9);
    if (B.acikMi() && B.ciz(c, W, H)) B.griIsle(c, W, H);
    await bekle(3100);
    Ses.nefesle(7);
    Mik.bagla();
    const kameraVar = B.hazirMi() && B.d.yuzVar;
    const r = kameraVar ? await gozSahnesi(a) : await cizimSahnesi();
    Ses.nefesKes();
    Ses.cinlama(0);
    Mik.kapat();
    let kipirdadi = false;
    yazi.textContent = '';
    sayac.textContent = '';
    if (r.sonuc === 'yakalandi') {
      kipirdadi = true;
      c.fillStyle = '#000';
      c.fillRect(0, 0, W, H);
      await yuz();
      yazi.textContent = kameraVar ? 'Kırptın.' : 'Kıpırdadın.';
      await bekle(2600);
    } else if (r.sonuc === 'kapatti') {
      c.fillStyle = '#000';
      c.fillRect(0, 0, W, H);
      yazi.textContent = 'Kapattın. Peki.';
      await bekle(2600);
    } else if (r.sonuc === 'gecti') {
      await bekle(1300);
      c.fillStyle = '#000';
      c.fillRect(0, 0, W, H);
      saat.textContent = '04:12';
      yazi.textContent = 'Gitti.';
      Ses.parazit(0.3, 0.07);
      await bekle(2600);
    }
    yazi.textContent = '';
    depo.yaz('sonuc', JSON.stringify({ kipirdadi, kirpma: r.kirp || 0, kacti: r.sonuc === 'kacti' }));
    const gordu = await arkanaDon();
    if (gordu) depo.yaz('arkana', '1');
    O.gerilim.sus = false;
    Ses.don(4);
    Ses.ortamKis(0.6);
    await Y.gec('final', 1300, 700);
  }

  return { basla, Mik };
})();
