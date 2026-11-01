// Bakış: "şu an bakıyor mu?" sorusunun tek cevabı.
// Kamera yalnızca ziyaretçi açarsa çalışır. Model bu tarayıcıda koşar, görüntü bellekte kalır:
// diske yazılmaz, hiçbir yere gönderilmez, sekme kapanınca yok olur.
window.Bakis = (function () {
  'use strict';
  const O = window.Ortak;
  const { depo } = O;
  const dinleyen = {};
  const dinle = (ad, f) => { (dinleyen[ad] = dinleyen[ad] || []).push(f); return () => { dinleyen[ad] = dinleyen[ad].filter((x) => x !== f); }; };
  const yay = (ad, v) => { (dinleyen[ad] || []).forEach((f) => { try { f(v); } catch (e) { console.error(e); } }); };

  const KOK = 'vendor/mediapipe/';
  const HAFIZA_KARE = 96;      // ≈ 9,6 sn
  const HAFIZA_G = 160, HAFIZA_Y = 120;

  const d = {
    kamera: 'kapali',          // kapali | aciliyor | acik | reddedildi | yok
    model: 'yok',              // yok | yukleniyor | hazir | hata
    yuzVar: false, yuzSayi: 0, gozKapali: false, gozPuan: 0, kirpma: 0,
    bakiyor: false, yaw: 0, pitch: 0, hareket: 0, isik: 0, korku: 0,
    yuz: null,                 // aynalı, 0..1: { x, y, g, y2, nokta }
    hiz: 0,
  };

  let akim = null, video = null, lm = null, seg = null, segSoz = null, segMaske = null, segG = 0, segY = 0;
  let calisiyor = false, sonTespit = 0, sonHafiza = 0, sonIsik = 0, sonSeg = 0, tempoMs = 62, segMs = 0;
  let acikTaban = 0.12, kapanisAn = 0, kapanisEn = 0, oncekiMerkez = null, ortMs = 0, isikOnceki = null, isikZaman = 0;
  let enKorku = 0;

  const hafiza = [];
  let hafizaUc = 0;
  const hTuval = document.createElement('canvas');
  hTuval.width = HAFIZA_G;
  hTuval.height = HAFIZA_Y;
  const hc = hTuval.getContext('2d', { willReadFrequently: true });
  const iTuval = document.createElement('canvas');
  iTuval.width = 32;
  iTuval.height = 24;
  const ic = iTuval.getContext('2d', { willReadFrequently: true });

  const ozel = { kapaliGoz: null, korku: null };

  function aynaliCiz(c, W, H) {
    if (!video || !video.videoWidth) return false;
    const vw = video.videoWidth, vh = video.videoHeight;
    const k = Math.max(W / vw, H / vh), sw = W / k, sh = H / k;
    c.save();
    c.translate(W, 0);
    c.scale(-1, 1);
    c.drawImage(video, (vw - sw) / 2, (vh - sh) / 2, sw, sh, 0, 0, W, H);
    c.restore();
    return true;
  }

  // Yeni bir tuvale o anki kare. Kırpılmış değildir; yüz koordinatları bununla örtüşür.
  function kareAl(W, H) {
    const t = document.createElement('canvas');
    t.width = W || 480;
    t.height = H || 360;
    if (!aynaliCiz(t.getContext('2d'), t.width, t.height)) return null;
    return t;
  }

  // ---------- model ----------
  async function modelYukle() {
    if (d.model === 'hazir' || d.model === 'yukleniyor') return;
    d.model = 'yukleniyor';
    yay('durum', d);
    try {
      const { FaceLandmarker } = await import(new URL(KOK + 'vision_bundle.mjs', document.baseURI).href);
      const fs = { wasmLoaderPath: KOK + 'wasm/vision_wasm_internal.js', wasmBinaryPath: KOK + 'wasm/vision_wasm_internal.wasm' };
      const kur = (delegate) => FaceLandmarker.createFromOptions(fs, {
        baseOptions: { modelAssetPath: KOK + 'model/face_landmarker.task', delegate },
        runningMode: 'VIDEO',
        numFaces: 2,
        outputFaceBlendshapes: true,
        minFaceDetectionConfidence: 0.35,
        minFacePresenceConfidence: 0.35,
        minTrackingConfidence: 0.35,
      });
      try {
        lm = await kur('GPU');
      } catch (e) {
        lm = await kur('CPU');
      }
      d.model = 'hazir';
    } catch (e) {
      console.warn('yüz modeli yüklenemedi', e);
      d.model = 'hata';
    }
    yay('durum', d);
  }

  // Kişiyi arka plandan ayıran ikinci model: yalnızca "arkanda" sahnesinde gerekir.
  function ayiriciYukle() {
    if (segSoz) return segSoz;
    segSoz = (async () => {
      try {
        const { ImageSegmenter } = await import(new URL(KOK + 'vision_bundle.mjs', document.baseURI).href);
        const fs = { wasmLoaderPath: KOK + 'wasm/vision_wasm_internal.js', wasmBinaryPath: KOK + 'wasm/vision_wasm_internal.wasm' };
        const kur = (delegate) => ImageSegmenter.createFromOptions(fs, {
          baseOptions: { modelAssetPath: KOK + 'model/selfie_segmenter.tflite', delegate },
          runningMode: 'VIDEO',
          outputCategoryMask: false,
          outputConfidenceMasks: true,
        });
        try { seg = await kur('GPU'); } catch (e) { seg = await kur('CPU'); }
        return true;
      } catch (e) {
        console.warn('ayırıcı yüklenemedi', e);
        return false;
      }
    })();
    return segSoz;
  }

  // ---------- kamera ----------
  async function ac() {
    if (d.kamera === 'acik') return true;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      d.kamera = 'yok';
      yay('durum', d);
      return false;
    }
    d.kamera = 'aciliyor';
    yay('durum', d);
    try {
      akim = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 24, max: 30 } },
        audio: false,
      });
    } catch (e) {
      d.kamera = e && e.name === 'NotFoundError' ? 'yok' : 'reddedildi';
      yay('durum', d);
      return false;
    }
    video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.setAttribute('playsinline', '');
    video.setAttribute('aria-hidden', 'true');
    video.style.cssText = 'position:fixed;left:-9999px;width:2px;height:2px;opacity:0';
    document.body.appendChild(video);
    video.srcObject = akim;
    try {
      await video.play();
    } catch (e) {
      kapat('reddedildi');
      return false;
    }
    d.kamera = 'acik';
    calisiyor = true;
    yay('durum', d);
    modelYukle();
    requestAnimationFrame(dongu);
    return true;
  }

  // Görüntü de, hafıza da, özel kareler de burada biter.
  function kapat(son) {
    calisiyor = false;
    if (akim) akim.getTracks().forEach((t) => t.stop());
    akim = null;
    if (video) {
      video.srcObject = null;
      video.remove();
    }
    video = null;
    hafiza.length = 0;
    hafizaUc = 0;
    ozel.kapaliGoz = null;
    ozel.korku = null;
    enKorku = 0;
    segMaske = null;
    Object.assign(d, { kamera: son || 'kapali', yuzVar: false, yuzSayi: 0, gozKapali: false, bakiyor: false, yuz: null });
    yay('durum', d);
  }
  addEventListener('pagehide', () => { if (akim) kapat(); });
  document.addEventListener('visibilitychange', () => {
    if (!akim) return;
    akim.getVideoTracks().forEach((t) => { t.enabled = !document.hidden; });
    if (!document.hidden && video) video.play().catch(() => {});
    d.bakiyor = false;
    yay('bakis', false);
  });

  // ---------- döngü ----------
  function puan(kategoriler, ad) {
    const b = kategoriler.find((k) => k.categoryName === ad);
    return b ? b.score : 0;
  }
  function tespit(n) {
    const t0 = performance.now();
    let s;
    try {
      s = lm.detectForVideo(video, n);
    } catch (e) {
      return;
    }
    const ms = performance.now() - t0;
    ortMs = ortMs ? ortMs * 0.92 + ms * 0.08 : ms;
    d.hiz = ortMs;
    const sayi = s.faceLandmarks ? s.faceLandmarks.length : 0;
    if (sayi !== d.yuzSayi) {
      const once = d.yuzSayi;
      d.yuzSayi = sayi;
      if (sayi >= 2 && once < 2) yay('ikinci-yuz', sayi);
      if (sayi < 2 && once >= 2) yay('ikinci-gitti', sayi);
    }
    if (!sayi) {
      if (d.yuzVar) {
        d.yuzVar = false;
        d.yuz = null;
        oncekiMerkez = null;
        yay('yuz-yok');
      }
      guncelleBakis(false);
      return;
    }
    // En büyük yüz senindir.
    let en = 0, enG = -1;
    s.faceLandmarks.forEach((f, i) => {
      const g = Math.abs(f[454].x - f[234].x);
      if (g > enG) { enG = g; en = i; }
    });
    const f = s.faceLandmarks[en], kategoriler = s.faceBlendshapes && s.faceBlendshapes[en] ? s.faceBlendshapes[en].categories : [];
    if (!d.yuzVar) {
      d.yuzVar = true;
      yay('yuz-var');
    }
    // Aynalı koordinat: ekranda görüldüğü gibi.
    let x0 = 1, x1 = 0, y0 = 1, y1 = 0;
    for (let i = 0; i < f.length; i += 3) {
      const x = 1 - f[i].x, y = f[i].y;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
    d.yuz = { x: x0, y: y0, g: x1 - x0, y2: y1 - y0, nokta: f };

    // Baş yönü: burun ucunun yanaklar ve alın-çene arasındaki yeri. Kusursuz değil, yeterli.
    const sol = f[234], sag = f[454], alin = f[10], cene = f[152], burun = f[1];
    const en2 = sag.x - sol.x || 1e-3, boy2 = cene.y - alin.y || 1e-3;
    d.yaw = -(((burun.x - sol.x) / en2) - 0.5) * 2;
    d.pitch = (((burun.y - alin.y) / boy2) - 0.5) * 2;

    // Göz: kişiye göre taban tutulur; gözlükte de, kısık gözde de çalışsın.
    const bl = puan(kategoriler, 'eyeBlinkLeft'), br = puan(kategoriler, 'eyeBlinkRight');
    const goz = Math.min(bl, br);
    d.gozPuan = goz;
    if (!d.gozKapali) acikTaban += (goz - acikTaban) * 0.015;
    const kapanmaEsik = Math.max(0.34, Math.min(0.72, acikTaban + 0.26));
    const acilmaEsik = kapanmaEsik - 0.12;
    if (!d.gozKapali && goz > kapanmaEsik) {
      d.gozKapali = true;
      kapanisAn = n;
      kapanisEn = goz;
      d.kirpma += 1;
      ozelKare('kapaliGoz');
      yay('kirpti', d.kirpma);
    } else if (d.gozKapali && goz > kapanisEn + 0.03) {
      // En çok kapandığı kareyi tut.
      kapanisEn = goz;
      ozelKare('kapaliGoz');
    } else if (d.gozKapali && goz < acilmaEsik) {
      d.gozKapali = false;
      yay('acti', n - kapanisAn);
    }

    // Hareket: yüz genişliğine göre, kameraya yakınlığı yok sayar.
    const m = { x: (x0 + x1) / 2, y: (y0 + y1) / 2 };
    if (oncekiMerkez) {
      const h = Math.hypot(m.x - oncekiMerkez.x, m.y - oncekiMerkez.y) / Math.max(0.05, x1 - x0);
      d.hareket = d.hareket * 0.7 + h * 0.3;
    }
    oncekiMerkez = m;

    // Korku: ağız açık, kaş yukarıda, göz iri. Gecenin en korkmuş karesi saklanır, yalnızca bellekte.
    const korku = puan(kategoriler, 'jawOpen') * 0.5 + puan(kategoriler, 'browInnerUp') * 0.6
      + (puan(kategoriler, 'eyeWideLeft') + puan(kategoriler, 'eyeWideRight')) * 0.45 + Math.min(1, d.hareket * 4) * 0.25;
    d.korku = korku;
    if (korku > enKorku + 0.02 && !d.gozKapali) {
      enKorku = korku;
      ozelKare('korku');
    }

    guncelleBakis(!d.gozKapali && Math.abs(d.yaw) < 0.62 && Math.abs(d.pitch) < 0.72);
  }
  function ozelKare(ad) {
    const t = kareAl(480, 360);
    if (!t) return;
    let kutu = null;
    if (d.yuz) {
      const [x, y] = yer(d.yuz.x, d.yuz.y, 480, 360);
      const [x2, y2] = yer(d.yuz.x + d.yuz.g, d.yuz.y + d.yuz.y2, 480, 360);
      kutu = [x, y, x2 - x, y2 - y];
    }
    ozel[ad] = { tuval: t, an: Date.now(), kutu, puan: ad === 'korku' ? enKorku : d.gozPuan };
  }
  function guncelleBakis(b) {
    if (b === d.bakiyor) return;
    d.bakiyor = b;
    yay('bakis', b);
  }
  function hafizaYaz() {
    if (!aynaliCiz(hc, HAFIZA_G, HAFIZA_Y)) return;
    const v = hc.getImageData(0, 0, HAFIZA_G, HAFIZA_Y);
    if (hafiza.length < HAFIZA_KARE) hafiza.push({ v, an: performance.now() });
    else {
      hafiza[hafizaUc] = { v, an: performance.now() };
      hafizaUc = (hafizaUc + 1) % HAFIZA_KARE;
    }
  }
  function isikOlc(n) {
    if (!aynaliCiz(ic, 32, 24)) return;
    const v = ic.getImageData(0, 0, 32, 24).data;
    let t = 0;
    for (let i = 0; i < v.length; i += 4) t += v[i] * 0.3 + v[i + 1] * 0.59 + v[i + 2] * 0.11;
    const l = t / (32 * 24 * 255);
    d.isik = l;
    if (isikOnceki !== null && n - isikZaman > 800) {
      if (l - isikOnceki > 0.14) yay('isik-acildi', l);
      if (isikOnceki - l > 0.14) yay('isik-kapandi', l);
      isikOnceki = l;
      isikZaman = n;
    } else if (isikOnceki === null) {
      isikOnceki = l;
      isikZaman = n;
    }
  }
  function ayir(n) {
    const t0 = performance.now();
    try {
      seg.segmentForVideo(video, n, (r) => {
        const m = r.confidenceMasks;
        if (!m || !m.length) return;
        // Tek kategoride kişi, çift kategoride ikincisi kişidir.
        const k = m[m.length - 1];
        segG = k.width;
        segY = k.height;
        const v = k.getAsFloat32Array();
        if (!segMaske || segMaske.length !== v.length) segMaske = new Float32Array(v.length);
        segMaske.set(v);
        m.forEach((x) => x.close());
      });
    } catch (e) { /* bu kare olmadı */ }
    const ms = performance.now() - t0;
    segMs = segMs ? segMs * 0.9 + ms * 0.1 : ms;
  }

  function dongu() {
    if (!calisiyor) return;
    requestAnimationFrame(dongu);
    if (document.hidden || !video || video.readyState < 2) return;
    const n = performance.now();
    if (n - sonHafiza >= 100) {
      sonHafiza = n;
      hafizaYaz();
    }
    if (n - sonIsik >= 400) {
      sonIsik = n;
      isikOlc(n);
    }
    // Yavaş telefonda tempoyu düşür: ana iş parçacığının yarısından çoğu her zaman sayfaya kalır.
    const ara = Math.max(tempoMs, ortMs * 2.4);
    if (lm && n - sonTespit >= ara) {
      sonTespit = n;
      tespit(n);
    }
    if (seg && segAcik && n - sonSeg >= Math.max(125, segMs * 3)) {
      sonSeg = n;
      ayir(n);
    }
  }
  let segAcik = false;

  // ---------- çizim yardımcıları ----------
  // ms önceki kare. Yoksa en eskisi.
  function gecmisKare(ms) {
    if (!hafiza.length) return null;
    const hedef = performance.now() - ms;
    let en = null;
    for (let i = 0; i < hafiza.length; i++) {
      const h = hafiza[i];
      if (h.an <= hedef && (!en || h.an > en.an)) en = h;
    }
    if (en) return en.v;
    let eski = hafiza[0];
    hafiza.forEach((h) => { if (h.an < eski.an) eski = h; });
    return eski.v;
  }

  // Aynalı 0..1 koordinatı, W×H çizimde nereye düşer. Çizim ortadan kırpar; telefon dik tutulsa da doğru olsun.
  function yer(nx, ny, W, H) {
    const vw = (video && video.videoWidth) || W, vh = (video && video.videoHeight) || H;
    const k = Math.max(W / vw, H / vh), sw = W / k, sh = H / k;
    return [(nx * vw - (vw - sw) / 2) * k, (ny * vh - (vh - sh) / 2) * k];
  }

  // W×H için kişi maskesi: 1 kişi, 0 arka plan. Ayırıcı hazır değilse null.
  let maskeTampon = null;
  function maske(W, H) {
    if (!segMaske || !video || !video.videoWidth) return null;
    if (!maskeTampon || maskeTampon.length !== W * H) maskeTampon = new Uint8Array(W * H);
    const vw = video.videoWidth, vh = video.videoHeight;
    const k = Math.max(W / vw, H / vh), sw = W / k, sh = H / k;
    const ox = (vw - sw) / 2, oy = (vh - sh) / 2;
    for (let y = 0, i = 0; y < H; y++) {
      const ny = (y / k + oy) / vh;
      const my = Math.min(segY - 1, Math.max(0, Math.floor(ny * segY)));
      for (let x = 0; x < W; x++, i++) {
        const nx = (x / k + ox) / vw; // aynalı
        const mx = Math.min(segG - 1, Math.max(0, Math.floor((1 - nx) * segG)));
        maskeTampon[i] = segMaske[my * segG + mx] > 0.5 ? 1 : 0;
      }
    }
    return maskeTampon;
  }

  // Görüntüyü ucuz gözetleme kamerasına çevirir: gri, kendiliğinden kontrast, kenar kararması, kumlanma.
  const griKontrast = { lo: 20, hi: 200 };
  const vinyetler = new Map();
  function griIsle(c, W, H, sec) {
    const s = sec || {};
    const g = s.gurultu === undefined ? (O.azalt ? 4 : 13) : s.gurultu;
    const v = c.getImageData(0, 0, W, H), p = v.data;
    const vinyetG = W * H;
    let vinyet = vinyetler.get(`${W}x${H}`);
    if (!vinyet) {
      vinyet = new Float32Array(vinyetG);
      vinyetler.set(`${W}x${H}`, vinyet);
      for (let y = 0, i = 0; y < H; y++) {
        for (let x = 0; x < W; x++, i++) {
          const dd = Math.hypot((x - W / 2) / (W * 0.62), (y - H / 2) / (H * 0.66));
          vinyet[i] = dd < 0.7 ? 1 : Math.max(0.28, 1 - (dd - 0.7) * 1.4);
        }
      }
    }
    let mn = 255, mx = 0;
    for (let i = 0, j = 0; j < vinyetG; i += 4, j++) {
      const l = p[i] * 0.3 + p[i + 1] * 0.59 + p[i + 2] * 0.11;
      if (l < mn) mn = l;
      if (l > mx) mx = l;
    }
    griKontrast.lo += (mn - griKontrast.lo) * 0.12;
    griKontrast.hi += (mx - griKontrast.hi) * 0.12;
    const k = 235 / Math.max(46, griKontrast.hi - griKontrast.lo);
    for (let i = 0, j = 0; j < vinyetG; i += 4, j++) {
      const l = p[i] * 0.3 + p[i + 1] * 0.59 + p[i + 2] * 0.11;
      const son = (l - griKontrast.lo) * k * vinyet[j] + (Math.random() - 0.5) * g * 2;
      p[i] = p[i + 1] = p[i + 2] = son;
    }
    c.putImageData(v, 0, 0);
  }

  // Kamerayı kapatır ama bu sekmedeki kareler finale kadar kalır. Arka kamera açılacaksa gerekir.
  function durdur() {
    calisiyor = false;
    if (akim) akim.getTracks().forEach((t) => t.stop());
    akim = null;
    if (video) {
      video.srcObject = null;
      video.remove();
    }
    video = null;
    hafiza.length = 0;
    hafizaUc = 0;
    segMaske = null;
    Object.assign(d, { kamera: 'kapali', yuzVar: false, yuzSayi: 0, gozKapali: false, bakiyor: false, yuz: null });
    yay('durum', d);
  }

  return {
    d, dinle, ac, kapat, durdur,
    hazirMi: () => d.kamera === 'acik' && d.model === 'hazir',
    acikMi: () => d.kamera === 'acik',
    video: () => video,
    ciz: aynaliCiz,
    kareAl,
    gecmisKare,
    HAFIZA_G, HAFIZA_Y,
    ozel,
    // Sahne ne kadar sık bakılacağını söyler: pil ve ısı için.
    tempo(ms) { tempoMs = ms; },
    ayiriciAc() { segAcik = true; return ayiriciYukle(); },
    ayiriciKapat() { segAcik = false; },
    maske, yer, griIsle,
    karelerSil() { ozel.kapaliGoz = null; ozel.korku = null; enKorku = 0; },
    izin: { al: () => depo.al('kamera'), yaz: (v) => depo.yaz('kamera', v) },
  };
})();
