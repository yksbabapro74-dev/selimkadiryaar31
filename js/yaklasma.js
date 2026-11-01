// CAM 16: masanın arkasından bakan kamera. Bakmadığın zaman yürür.
// Bütün görüntü bu sayfada çizilir. Gerçek kameraya dokunmaz, hiçbir şey bir yere gitmez.
(function () {
  'use strict';
  const O = window.Ortak, Ses = window.Ses, V = window.Varlik;
  const { azalt, depo, dinle, yay, gerilim, kayit } = O;
  if (depo.al('bitti')) return;
  const $ = (s) => document.querySelector(s);
  const kok = document.documentElement;
  const kutu = $('#cam16'), goz = $('#cam16-goz'), tuval = $('#cam16-t'), kapatD = $('#cam16-kapat'), acD = $('#cam16-ac');
  const perde = $('#yakin'), perdeYazi = $('#yakin-yazi');
  const W = tuval.width, H = tuval.height;
  const ctx = tuval.getContext('2d');
  const img = ctx.createImageData(W, H);
  const px = new Uint32Array(img.data.buffer);
  const KAPALI = O.kameraHarita('arka', W, H), ACIK = O.kameraHarita('arka-acik', W, H);

  const SON = 7;
  // Bir sonraki adıma kaç saniye. Sonuncusu kapının dibi değil, senin arkan.
  const SURE = [31, 42, 38, 34, 31, 27, 23];
  // Kapıdan koltuğun arkasına. x, ayak y, boy: karenin kesri.
  const YOL = [
    null,
    { x: 0.226, y: 0.665, boy: 0.36 },
    { x: 0.27, y: 0.705, boy: 0.43 },
    { x: 0.335, y: 0.77, boy: 0.54 },
    { x: 0.385, y: 0.86, boy: 0.68 },
    { x: 0.655, y: 0.94, boy: 0.82 },
    { x: 0.675, y: 1.08, boy: 1.0 },
    { x: 0.565, y: 1.25, boy: 1.2 },
  ];
  const MESAFE = [0, 6, 5, 4, 3, 2.2, 1.4, 0.7];
  const SOZ = {
    1: { oda: [[900, 'anon_b17', 'kapı açıldı'], [2100, 'puzur', 'hangi kapı'], [1900, 'anon_b17', 'arkasındaki']], fis: 'arkandaki kapı kapalıydı.' },
    2: { oda: [[1100, 'hafiz_salih', 'biri girdi'], [2300, 'theodoros', 'söyleyelim mi'], [1700, 'anon_09c', 'hayır']] },
    3: { oda: [[1200, 'anon_b17', 'bakarken yürümüyor'], [2600, 'puzur', 'bakmayı bırakınca'], [2100, 'anon_b17', 'otuz bir saniye bakarsan geri gidiyor. denedim'], [3000, 'anon_09c', 'herkes bir gün bakmayı bırakır']] },
    4: { oda: [[1400, 'theodoros', 'kendisi görüyor mu'], [2400, 'puzur', 'ekrana bakıyor'], [2000, 'ammurapi_ulak', 'ben çıkıyorum'], [900, () => yay('oda-ayril', 'ammurapi_ulak')]], fis: 'dönme.' },
    5: { oda: [[1500, 'hafiz_salih', 'bunu görmek istemiyorum'], [900, () => yay('oda-ayril', 'hafiz_salih')], [2600, () => yay('oda-ayril', 'puzur')]] },
    6: { oda: [[1900, 'anon_09c', 'özür dilerim'], [1200, () => yay('oda-ayril', 'anon_09c')], [2300, () => yay('oda-ayril', 'theodoros')]] },
  };

  function oku() {
    let d = null;
    try { d = JSON.parse(depo.al('cam16')); } catch (e) { d = null; }
    if (!d || typeof d.a !== 'number') return { a: 0, tur: 0, t: 0, gor: false };
    return { a: Math.max(0, Math.min(SON - 1, d.a | 0)), tur: Math.max(0, d.tur | 0), t: Number(d.t) || 0, gor: !!d.gor };
  }
  const durum = oku();
  // Sen yokken yürür. Yanına kadar gelmez: bunu görmen gerekiyor.
  const yokSure = durum.gor && durum.t ? Date.now() - durum.t : 0;
  const yokAdim = yokSure > 216e5 ? 3 : yokSure > 36e5 ? 2 : yokSure > 6e5 ? 1 : 0;
  durum.a = Math.min(SON - 1, durum.a + yokAdim);
  function kaydet() {
    // «kaydımı sil» dendiyse geri yazma.
    if (!kayit.gelis) return;
    depo.yaz('cam16', JSON.stringify({ a: durum.a, tur: durum.tur, t: Date.now(), gor: durum.gor }));
  }

  let girdi = false, girisAn = 0, acildi = false, kapali = false, bakiyor = false, bakma = 0, birikim = 0, ilkBakis = true, ilkKapama = true;
  let sahne = 'yuruyor', bosBitis = 0, parazitBitis = 0, gozAcilis = 0, gozGoster = 0, donuk = false, egilme = 0, testAn = 0, testSure = 1;
  let hx = 0, hy = 0, hedefX = 0, hedefY = 0, omuz = 0;
  const hiz = () => Math.max(0.5, 0.72 ** durum.tur);
  const aynali = () => durum.tur % 2 === 1;
  const uyu = (ms) => new Promise((c) => setTimeout(c, ms));

  // ---------- bakıyor mu ----------
  const gorunur = () => acildi && !kapali && !kok.classList.contains('esikte')
    && (sahne === 'geldi' || (!kok.classList.contains('giriste') && !kok.classList.contains('c16-yazi') && !$('#perde').hidden));
  function bak(a) {
    if (a === bakiyor) return;
    if (a && (sahne !== 'yuruyor' || !gorunur())) return;
    bakiyor = a;
    if (a) {
      bakma = 0;
      if (ilkBakis && durum.a >= 1) {
        ilkBakis = false;
        yay('log', ['CAM 16\'ya baktı', 'CAM16_WATCH']);
        yay('oda-soyle', [[900, 'anon_b17', '16\'ya bakıyor'], [2100, 'theodoros', 'baksın. baktığı sürece'], [1600, 'puzur', 'sonra']]);
      }
    } else gozAcilis = performance.now() + 320;
  }
  goz.addEventListener('pointerenter', () => bak(true));
  goz.addEventListener('pointerleave', () => bak(false));
  goz.addEventListener('pointercancel', () => bak(false));
  // Dokununca da odak alır; yalnızca klavyeyle gelen odak bakmak sayılır, yoksa tek dokunuş sonsuza dek dondurur.
  goz.addEventListener('focus', () => { if (goz.matches(':focus-visible')) bak(true); });
  goz.addEventListener('blur', () => bak(false));
  goz.addEventListener('contextmenu', (e) => e.preventDefault());

  // Bir yere yazarken ya da oyun oynarken kamera aradan çekilir. O yürümeye devam eder.
  const yazilir = (e) => e.target && /^(INPUT|TEXTAREA)$/.test(e.target.tagName);
  document.addEventListener('focusin', (e) => { if (yazilir(e)) kok.classList.add('c16-yazi'); });
  document.addEventListener('focusout', (e) => { if (yazilir(e)) kok.classList.remove('c16-yazi'); });

  function kutuYaz() {
    kutu.hidden = !acildi || kapali;
    acD.hidden = !acildi || !kapali;
    kok.classList.toggle('c16', acildi && !kapali);
  }
  kapatD.addEventListener('click', () => {
    kapali = true;
    bak(false);
    kutuYaz();
    yay('log', ['CAM 16\'yı kapattı', 'CAM16_OFF']);
    if (ilkKapama) {
      ilkKapama = false;
      yay('oda-soyle', [[1100, 'anon_b17', '16\'yı kapattı'], [2100, 'theodoros', 'görmediği zaman daha hızlı'], [2000, 'puzur', 'söylemeyin']]);
    }
  });
  acD.addEventListener('click', () => {
    kapali = false;
    kutuYaz();
    parazit(420);
  });

  // ---------- çizim ----------
  const griPx = (v) => {
    const g = Math.max(0, Math.min(255, Math.round(Math.max(0, v) ** 0.82 * 215 + 4)));
    return 0xff000000 | (g << 16) | (g << 8) | g;
  };
  function figur(n) {
    if (durum.a < 1 || sahne === 'bos') return null;
    const y = YOL[durum.a];
    let x = y.x, a = y.y, b = y.boy;
    if (aynali() && durum.a <= 4) x = 1 - x;
    if (egilme) {
      a += egilme * 0.6;
      b += egilme * 0.5;
      x -= egilme * 0.045;
    }
    const acikGoz = sahne === 'geldi' || n < gozGoster || (!bakiyor && n >= gozAcilis);
    return { x: x * W, y: a * H, boy: b * H, goz: acikGoz };
  }
  function senCiz(z) {
    // Koltuk: sen kalksan da yerinde durur.
    for (let y = 31; y < H; y++) {
      const kenar = y < 35 ? 12 - (35 - y) : 12 + (y - 35) * 0.14;
      for (let x = Math.round(44 - kenar); x <= Math.round(44 + kenar); x++) px[y * W + x] = griPx(0.012 + Math.random() * 0.012);
    }
    if (sahne === 'bos') return;
    const gur = azalt ? 0 : 0.05;
    const nefes = azalt ? 0 : Math.sin(z / 1700) * 0.35;
    const bx = 44 + hx, by = 38 + hy + nefes;
    // Omuzlar ve boyun: ekranın ışığı önden vurur.
    const omuzY = 51 + nefes;
    for (let y = Math.floor(omuzY - 3); y < H; y++) {
      const u = y - omuzY;
      const gen = u < 0 ? 4 : Math.min(40, 12 + Math.sqrt(u + 0.5) * 7.5 + u * 0.9);
      const ox = Math.max(0, Math.round(44 + hx * 0.3 - gen)), bit = Math.min(W - 1, Math.round(44 + hx * 0.3 + gen));
      for (let x = ox; x <= bit; x++) {
        const d = Math.abs(x - 44 - hx * 0.3) / gen;
        // Koyu giysi; yalnızca ekrana bakan üst kenarı ışık alır.
        const ust = u < 0 ? 0.26 : Math.max(0, 0.15 - u * 0.03) * (1 - d * 0.5);
        px[y * W + x] = griPx(0.055 - d * 0.03 + ust + omuz * 0.03 + (Math.random() - 0.5) * gur * 0.5);
      }
    }
    // Baş
    const rx = 8.6, ry = 11;
    for (let y = Math.floor(by - ry - 1); y <= Math.ceil(by + ry); y++) {
      if (y < 0 || y >= H) continue;
      for (let x = Math.floor(bx - rx - 1); x <= Math.ceil(bx + rx); x++) {
        const dx = (x - bx) / rx, dy = (y - by) / ry, q = dx * dx + dy * dy;
        if (q > 1) continue;
        let v = 0.5 - q * 0.26;
        if (dy < -0.42 - dx * dx * 0.5) v *= 0.14; // saç
        if (Math.abs(dy + 0.1) < 0.1 && Math.abs(Math.abs(dx) - 0.42) < 0.2) v *= 0.3; // göz yuvaları
        if (Math.abs(dy - 0.5) < 0.05 && Math.abs(dx) < 0.28) v *= 0.55;
        px[y * W + x] = griPx(v + (Math.random() - 0.5) * gur);
      }
    }
    // En sonunda omzuna dört parmak.
    if (egilme > 0.45) {
      const boy = Math.round(Math.min(1, (egilme - 0.45) * 3) * 5);
      for (let p = 0; p < 4; p++) {
        const x = 68 - p * 3, y0 = 53 + (p === 3 ? 2 : p === 0 ? 1 : 0);
        for (let y = y0; y < y0 + boy && y < H; y++) px[y * W + x] = griPx(0.5 - (y - y0) * 0.05);
      }
    }
  }
  function kareCiz(z) {
    const n = performance.now();
    if (n < parazitBitis) {
      for (let i = 0; i < px.length; i++) px[i] = azalt ? 0xff000000 : Math.random() < 0.5 ? 0xff000000 : 0xff4f4f4f;
      ctx.putImageData(img, 0, 0);
      return;
    }
    if (donuk) return;
    hx += (hedefX - hx) * 0.22;
    hy += (hedefY - hy) * 0.22;
    omuz *= 0.72;
    if (testAn) egilme = Math.min(1, (n - testAn) / testSure);
    const acikKapi = durum.a >= 1 && !aynali();
    O.kameraCiz(px, W, H, acikKapi ? ACIK : KAPALI, { figur: figur(n), gurultu: azalt ? 0.012 : 0.085, gri: true });
    senCiz(z);
    ctx.putImageData(img, 0, 0);
  }
  function parazit(ms) {
    parazitBitis = performance.now() + (azalt ? Math.min(ms, 200) : ms);
  }
  // Masadaki sensin: fare kımıldarsa başı döner, tuşa basarsan omzu oynar.
  if (!azalt) {
    addEventListener('pointermove', (e) => {
      if (sahne === 'geldi') return;
      hedefX = -(e.clientX / innerWidth - 0.5) * 5;
      hedefY = (e.clientY / innerHeight - 0.5) * 2;
    }, { passive: true });
    addEventListener('keydown', () => { omuz = 1; }, { passive: true });
    addEventListener('scroll', () => { if (sahne !== 'geldi') hy = Math.min(1.6, hy + 0.5); }, { passive: true });
  }
  let sonKare = 0;
  (function dongu(z) {
    requestAnimationFrame(dongu);
    if (z - sonKare < (azalt ? 500 : 125) || document.hidden || !gorunur()) return;
    sonKare = z;
    kareCiz(z);
  })(0);

  // ---------- yürüyüş ----------
  function adimSesi(a) {
    const y = YOL[a];
    const x = aynali() && a <= 4 ? 1 - y.x : y.x, m = MESAFE[a];
    // Kamera önden bakar: resmin solu senin sağ omzun.
    const xa = (0.5 - x) * m * 1.15, za = Math.sqrt(Math.max(0.05, m * m - xa * xa));
    // Panner uzakta kısar, yakında kısmaz: yakın adım gürlemesin diye ses ters yönde.
    Ses.adimlar(xa, za, 0.42 - (6 - m) * 0.032, a === 1 ? 2 : 3);
    return [xa, za];
  }
  function odaKis() {
    Ses.ortamKis(Math.max(0.3, 1 - Math.max(0, durum.a - 1) * 0.12));
  }
  function konus(a) {
    if (durum.tur === 0) {
      const s = SOZ[a];
      if (!s) return;
      if (s.oda) yay('oda-soyle', s.oda);
      if (s.fis) setTimeout(() => V.fisilda(s.fis, { zorla: true }), 1400);
      return;
    }
    if (a === 1) yay('oda-soyle', aynali() ? [[1100, 'anon_b17', 'yine'], [2200, 'anon_b17', 'bu sefer kapıdan gelmedi']] : [[1100, 'anon_b17', 'yine']]);
    if (a === 3) yay('oda-soyle', [[1300, 'anon_b17', 'daha hızlı']]);
    if (a === 5) setTimeout(() => V.fisilda('dönme.', { zorla: true }), 1400);
  }
  function ileri() {
    durum.a += 1;
    gerilim.seviye = durum.a;
    birikim = 0;
    kaydet();
    parazit(durum.a === SON ? 900 : 420);
    const [xa, za] = adimSesi(durum.a);
    if (durum.a === 1) {
      gerilim.yuruyor = true;
      yay('yayin-figur', 'yok');
      if (!aynali()) Ses.kapiVur(xa * 1.2, za * 1.2);
    }
    odaKis();
    if (durum.a === 6) Ses.kalp(44);
    if (durum.a === SON) {
      geldi();
      return;
    }
    konus(durum.a);
  }
  function geri() {
    if (durum.a <= 1) return;
    durum.a -= 1;
    gerilim.seviye = durum.a;
    birikim = 0;
    kaydet();
    parazit(300);
    // Geri gider. Giderken bakar.
    gozGoster = performance.now() + 900;
    adimSesi(durum.a);
    odaKis();
    if (durum.a < 6) Ses.kalp(0);
    yay('log', ['CAM 16: bir adım geri gitti', 'CAM16_BACK']);
    yay('oda-soyle', [[900, 'anon_b17', 'geri gitti'], [2300, 'theodoros', 'gitmedi. bekliyor']]);
  }
  function uygun() {
    if (document.hidden || kok.classList.contains('esikte') || $('#olu')) return false;
    if ($('#asli').open || $('#dosya').open || !$('#karartma').hidden || $('#perde').hidden) return false;
    const a = document.activeElement;
    if (a && /^(INPUT|TEXTAREA)$/.test(a.tagName)) return false;
    const r = $('#ayin').getBoundingClientRect();
    if (r.top < innerHeight * 0.7 && r.bottom > innerHeight * 0.3) return false;
    return performance.now() - girisAn > 165000;
  }
  function kamerayiAc() {
    acildi = true;
    durum.gor = true;
    kaydet();
    kutuYaz();
    parazit(700);
    if (durum.a >= 1) {
      gerilim.yuruyor = true;
      gerilim.seviye = durum.a;
      yay('yayin-figur', 'yok');
      odaKis();
      if (durum.a >= 6) Ses.kalp(44);
      yay('oda-soyle', [[1300, 'anon_b17', '16 hâlâ açık'], [2300, 'theodoros', yokAdim ? 'sen yokken yürüdü' : 'gitmedi ki']]);
    } else {
      yay('oda-soyle', [[1200, 'anon_b17', '16 açıldı'], [1600, 'puzur', 'kim açtı'], [2100, 'anon_b17', 'kimse. kendi açıldı'], [2800, 'theodoros', '16 nereyi gösteriyor'], [2000, 'anon_b17', 'masayı'], [1700, 'anon_09c', 'kimin masası']]);
    }
    yay('log', ['CAM 16 açıldı', 'CAM16_ON']);
  }
  let sonTik = performance.now();
  setInterval(() => {
    const n = performance.now();
    const dt = Math.min(1, (n - sonTik) / 1000);
    sonTik = n;
    if (!girdi || document.hidden || $('#olu')) return;
    kok.classList.toggle('c16-oyun', $('#perde').hidden);
    if (!acildi) {
      if (n - girisAn >= (durum.gor ? 31000 : 118000)) kamerayiAc();
      return;
    }
    if (sahne === 'bos') {
      if (n >= bosBitis) sahne = 'yuruyor';
      return;
    }
    if (sahne !== 'yuruyor') return;
    if (bakiyor && !gorunur()) bak(false);
    if (bakiyor) {
      bakma += dt;
      if (bakma >= 31) {
        bakma = 0;
        geri();
      }
      return;
    }
    birikim += dt * (kapali ? 2 : 1);
    if (birikim < SURE[durum.a] * hiz()) return;
    if (durum.a === SON - 1 && !uygun()) return;
    ileri();
  }, 250);
  // Sekmeden çıktın: dönene kadar yürüdü. Yanına gelmeden durur.
  let gittiAn = 0;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      gittiAn = Date.now();
      sonTik = performance.now();
      kaydet();
      return;
    }
    sonTik = performance.now();
    if (!girdi || !acildi || sahne !== 'yuruyor' || !gittiAn) return;
    const sn = (Date.now() - gittiAn) / 1000;
    gittiAn = 0;
    const ek = sn >= 300 ? 3 : sn >= 120 ? 2 : sn >= 20 ? 1 : 0;
    const hedef = Math.min(SON - 1, durum.a + ek);
    if (hedef > durum.a) {
      durum.a = hedef - 1;
      ileri();
    }
  });
  addEventListener('pagehide', kaydet);

  // ---------- geldi ----------
  const SOLUK = 15500, DONMA = 3100;
  function hareketBekle(toplam) {
    return new Promise((coz) => {
      const basAn = performance.now();
      let son = null, yol = 0, bitti = false;
      const zaman = [];
      const bitir = (r) => {
        if (bitti) return;
        bitti = true;
        zaman.forEach(clearTimeout);
        ['pointermove', 'pointerdown', 'keydown', 'wheel', 'touchstart'].forEach((o) => removeEventListener(o, tepki));
        document.removeEventListener('visibilitychange', gizli);
        coz(r);
      };
      // Yazıyı okumaya fırsat: ilk 1,2 saniye sayılmaz.
      const tepki = (e) => {
        if (performance.now() - basAn < 1200) {
          son = null;
          return;
        }
        if (e.type === 'pointermove' && e.pointerType !== 'touch') {
          if (son) yol += Math.hypot(e.clientX - son[0], e.clientY - son[1]);
          son = [e.clientX, e.clientY];
          if (yol > 14) bitir('kipir');
          return;
        }
        bitir('kipir');
      };
      const gizli = () => { if (document.hidden) bitir('kacti'); };
      ['pointermove', 'pointerdown', 'keydown', 'wheel', 'touchstart'].forEach((o) => addEventListener(o, tepki, { passive: true }));
      document.addEventListener('visibilitychange', gizli);
      // Soluk kesilir, görüntü donar. Bitti sanırsın. Bitmedi.
      zaman.push(setTimeout(() => {
        Ses.nefesKes();
        donuk = true;
      }, toplam - DONMA));
      zaman.push(setTimeout(() => bitir('gecti'), toplam));
    });
  }
  function buyut(ms) {
    const r = kutu.getBoundingClientRect();
    const k = Math.min(innerWidth * 0.88 / r.width, innerHeight * 0.72 / r.height);
    const tx = innerWidth / 2 - (r.left + r.width / 2), ty = innerHeight * 0.45 - (r.top + r.height / 2);
    kutu.style.transition = `transform ${ms}ms cubic-bezier(.3,0,.75,1)`;
    kutu.style.transform = `translate(${tx}px,${ty}px) scale(${k})`;
  }
  function toparla() {
    donuk = false;
    testAn = 0;
    egilme = 0;
    bak(false);
    perde.classList.remove('acik', 'opak');
    perde.hidden = true;
    perdeYazi.textContent = '';
    kutu.classList.remove('geldi');
    kutu.style.transition = '';
    kutu.style.transform = '';
    Ses.nefesKes();
    Ses.kalp(0);
    gerilim.sus = false;
    gerilim.seviye = 0;
    gerilim.yuruyor = false;
    Ses.ortamKis(1);
    Ses.don(4);
    V.cevrimdisi();
    if (!depo.al('odayazdi')) yay('yayin-figur', 'normal');
  }
  function yeniTur() {
    durum.tur += 1;
    durum.a = 0;
    birikim = 0;
    bakma = 0;
    kaydet();
  }
  async function yuzGoster() {
    let r;
    try { r = await O.portreResmi(); } catch (e) { return; }
    const t = document.createElement('canvas');
    t.id = 'c16-yuz';
    const n = innerWidth < 700 ? 2 : 3;
    const g = Math.floor(innerWidth / n), y = Math.floor(innerHeight / n);
    t.width = g;
    t.height = y;
    const c = t.getContext('2d');
    const v = c.createImageData(g, y);
    O.atkinson(O.griOrnekle(r, g, y, [0, 0.3, 1, 0.66]), g, y, null, new Uint32Array(v.data.buffer), O.RENK.kor, 0xff000000);
    c.putImageData(v, 0, 0);
    document.body.appendChild(t);
    Ses.cigilik(0.8);
    await uyu(430);
    t.remove();
  }
  function kacti() {
    toparla();
    sahne = 'yuruyor';
    durum.a = SON - 1;
    birikim = 0;
    gerilim.seviye = durum.a;
    gerilim.yuruyor = true;
    yay('yayin-figur', 'yok');
    odaKis();
    kaydet();
    yay('log', ['kaçtı', 'CAM16_ABORT']);
    yay('oda-soyle', [[2600, 'anon_b17', 'kaçtı'], [3300, 'anon_b17', 'kaçmak da cevaptır']]);
  }
  async function yakalandi() {
    Ses.nefesKes();
    donuk = true;
    perdeYazi.textContent = azalt ? 'kıpırdadın.' : '';
    if (azalt) await uyu(2200);
    else {
      perde.classList.add('opak');
      kutu.style.display = 'none';
      await yuzGoster();
      await uyu(1900);
      kutu.style.display = '';
    }
    toparla();
    sahne = 'bos';
    bosBitis = performance.now() + 31000;
    yeniTur();
    yay('log', ['kıpırdadı', 'MOTION_DETECTED']);
    yay('oda-soyle', [[3100, 'anon_b17', 'kıpırdadın'], [2800, 'anon_b17', 'koltuk boş'], [3400, 'anon_b17', 'peki bunu kim izliyor']]);
  }
  function gecti() {
    parazit(500);
    toparla();
    sahne = 'yuruyor';
    yeniTur();
    yay('log', ['kıpırdamadı', 'CAM16_CLEAR']);
    yay('oda-soyle', [[3100, 'anon_b17', 'gitti'], [3300, 'anon_b17', 'kıpırdamadın'], [4100, 'anon_b17', 'ilk defa görüyorum'], [5200, 'anon_b17', 'bir daha gelir. hep biraz daha hızlı']]);
  }
  // Oda susar, sonra ses, sonra sayfa. Geriye o kare ve arkandaki soluk kalır.
  async function geldi() {
    sahne = 'geldi';
    bak(false);
    gerilim.sus = true;
    gerilim.yuruyor = true;
    yay('oda-sus');
    kapali = false;
    kutuYaz();
    kutu.classList.add('geldi');
    Ses.kalp(0);
    Ses.sus(3.1);
    V.cevrimici(60000);
    await uyu(azalt ? 900 : 3100);
    if (document.hidden) {
      kacti();
      return;
    }
    perde.hidden = false;
    void perde.offsetWidth;
    perde.classList.add('acik');
    const toplam = SOLUK + DONMA;
    if (!azalt) buyut(3100 + SOLUK);
    Ses.nefesle(6);
    await uyu(azalt ? 300 : 3100);
    if (document.hidden) {
      kacti();
      return;
    }
    perdeYazi.textContent = 'kıpırdama.';
    yay('oda-soyle', [[0, 'anon_b17', 'kıpırdama']]);
    testSure = SOLUK;
    testAn = performance.now();
    const sonuc = await hareketBekle(toplam);
    if (sonuc === 'kacti') kacti();
    else if (sonuc === 'kipir') await yakalandi();
    else gecti();
  }

  dinle('esik', () => {
    girdi = true;
    girisAn = performance.now();
  });
})();
