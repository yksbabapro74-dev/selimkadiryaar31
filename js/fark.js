// Fark eder. Sekmeni, sağ tıkını, kopyaladığını, konsolu. Okuduğun metin sen bakmazken değişir.
// Hepsi bu tarayıcıda olur; buradan hiçbir şey bir yere gönderilmez.
(function () {
  'use strict';
  const O = window.Ortak, Ses = window.Ses, V = window.Varlik;
  const { azalt, kayit, depo, dinle } = O;
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));
  const dosya = location.protocol === 'file:';
  const kodBag = (k) => (dosya ? `404.html?k=${encodeURIComponent(k)}` : encodeURIComponent(k));
  let girdi = false, girisAn = 0;
  const icinde = (e, sec) => !!(e.target && e.target.closest && e.target.closest(sec));

  // ---------- gizli bağlantılar: dosyadan açılınca da çalışsın ----------
  $$('a[data-kod]').forEach((a) => { a.href = kodBag(a.dataset.kod); });
  if (!dosya) $$('[data-adres]').forEach((e) => { e.textContent = location.host; });

  // ---------- makineni tanıyor ----------
  const ben = O.kimlik();
  const sira = [
    [25, `${ben.osDan} giriyorsun.`],
    [120, `Saat ${ben.saat}. Seni bu saatte buraya ne getirdi.`],
    [195, `Ekranın ${ben.ekran}. Arkanda kalan yer bundan büyük.`],
  ];
  const g = ben.tarih.getHours(), hg = ben.tarih.getDay();
  if ((g < 5 || g >= 23) && hg !== 6 && hg !== 0) sira.push([250, 'Yarın erken kalkacaktın.']);
  if (navigator.getBattery) {
    navigator.getBattery().then((b) => {
      if (!b.charging && b.level < 0.95) sira.push([70, `Şarjın %${Math.round(b.level * 100)}. Buna yetmez.`]);
      sira.sort((x, y) => x[0] - y[0]);
    }).catch(() => {});
  }
  setInterval(() => {
    if (!girdi || document.hidden || !sira.length) return;
    if ((performance.now() - girisAn) / 1000 >= sira[0][0] && V.fisilda(sira[0][1])) sira.shift();
  }, 3000);

  // ---------- sekme: sen yokken mesaj bırakır ----------
  const baslik = document.title;
  const ikon = $('link[rel="icon"]'), ikonEski = ikon.href;
  const GOZ = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' shape-rendering='crispEdges'%3E%3Crect width='16' height='16'/%3E%3Cpath fill='%23f0201a' d='M1 8h2V6h2V5h6v1h2v2h2v1h-2v2h-2v1H5v-1H3V9H1z'/%3E%3Cpath d='M6 6h4v5H6z'/%3E%3Cpath fill='%23f0201a' d='M7 7h2v3H7z'/%3E%3C/svg%3E";
  let sekmeZaman = 0, birakilan = 0;
  document.addEventListener('visibilitychange', () => {
    clearInterval(sekmeZaman);
    if (document.hidden) {
      birakilan = 0;
      ikon.href = GOZ;
      const yaz = () => {
        birakilan++;
        document.title = `(${birakilan}) ${birakilan === 1 ? 'selimkadiryaar31' : birakilan === 2 ? 'neredesin' : kayit.ad || 'görüldü'}`;
      };
      yaz();
      sekmeZaman = setInterval(yaz, 13000);
    } else {
      document.title = baslik;
      ikon.href = ikonEski;
      if (girdi && birakilan > 1) {
        const n = birakilan;
        setTimeout(() => V.fisilda(`${n} mesaj bıraktı. Okuyamazsın.`, { zorla: true }), 3500);
      }
    }
  });

  // ---------- sağ tık, kopyalama, geri tuşu ----------
  let sagTik = 0;
  addEventListener('contextmenu', (e) => {
    if (!girdi || icinde(e, 'input,textarea,#esik-tut')) return;
    sagTik++;
    if (sagTik === 1) V.fisilda('neye bakıyorsun.', { zorla: true });
    if (sagTik === 2) V.fisilda('kaynağa bakacaksan F12.', { zorla: true });
  });
  document.addEventListener('copy', (e) => {
    if (!e.clipboardData || icinde(e, 'input,textarea')) return;
    const m = String(document.getSelection());
    if (!m.trim()) return;
    e.clipboardData.setData('text/plain', `${m}\n\n(bunu kopyaladığını gördü.)`);
    e.preventDefault();
    V.fisilda('onu da gördü.', { zorla: true });
  });
  // Bir kez geri basmak yetmez. İkincisinde gerçekten çıkar.
  dinle('esik', () => {
    if (history.state && history.state.kadim) return;
    history.pushState({ kadim: 1 }, '', location.href);
  });
  addEventListener('popstate', (e) => {
    if (girdi && !e.state) V.fisilda('geri yok.', { zorla: true, sure: 4200 });
  });

  // ---------- nereye baktığını not alır ----------
  const KAT_AD = {
    kayitlar: "Kayıtlar'a", suretler: "Suretler'e", kulliyat: "Külliyat'a", yasaklar: "Yasaklar'a",
    ayin: "Ayin'e", oyun: "Selam Verme'ye", mumlar: "Mumlar'a", bugun: 'sona',
  };
  const katGoz = new IntersectionObserver((l) => {
    l.forEach((e) => { if (e.isIntersecting && girdi) depo.yaz('sonkat', KAT_AD[e.target.id]); });
  }, { rootMargin: '-50% 0px -50% 0px' });
  $$('[data-kat]').forEach((b) => katGoz.observe(b));
  const sureKaydet = () => { if (girdi) depo.yaz('sonsure', String(Math.round((performance.now() - girisAn) / 1000))); };
  addEventListener('pagehide', sureKaydet);
  document.addEventListener('visibilitychange', () => { if (document.hidden) sureKaydet(); });

  // ---------- sen bakmazken değişen metin ----------
  const donecek = $$('[data-sonra]').map((el) => ({ el, gorunen: 0, ayrildi: 0, bitti: false, gor: false }));
  const metinGoz = new IntersectionObserver((l) => {
    l.forEach((e) => {
      const d = donecek.find((x) => x.el === e.target);
      if (e.isIntersecting) {
        d.gor = true;
        if (!d.gorunen) d.gorunen = performance.now();
      } else {
        d.gor = false;
        if (d.gorunen) d.ayrildi = performance.now();
      }
    });
  });
  donecek.forEach((d) => metinGoz.observe(d.el));
  let sonDegisim = 0;
  const adKoy = (m) => (m.includes('{ad}') ? (kayit.ad ? m.replace('{ad}', kayit.ad) : null) : m);
  setInterval(() => {
    if (!girdi || document.hidden) return;
    const n = performance.now();
    if (n - sonDegisim < 20000) return;
    for (const d of donecek) {
      if (d.bitti || d.gor || !d.ayrildi || n - d.ayrildi < 6000 || d.ayrildi - d.gorunen < 900) continue;
      const m = adKoy(d.el.dataset.sonra);
      if (!m) continue;
      d.el.textContent = m;
      d.bitti = true;
      sonDegisim = n;
      break;
    }
    // Erişim kaydındaki «biri» artık adını biliyor.
    const es = $('.kayit-son .kayit-eski');
    if (kayit.ad && es && es.firstChild.nodeType === 3 && es.getBoundingClientRect().bottom < 0) {
      es.firstChild.textContent = `${kayit.ad} kayıtları okuyor. `;
    }
  }, 2000);

  // Adını verdiysen yasak listesi seni de bilir.
  let adSatiri = false;
  function adIsle(ad) {
    if (!ad || adSatiri) return;
    adSatiri = true;
    const li = document.createElement('li');
    li.textContent = `${ad}: arkana bakma.`;
    li.setAttribute('aria-hidden', 'true');
    $('.emirler').appendChild(li);
  }
  dinle('ad', adIsle);
  adIsle(kayit.ad);

  // ---------- gözünün kenarında bir an ----------
  function sokak() {
    let tuval = null, son = 0, hazir = false;
    async function hazirla() {
      const r = await O.portreResmi();
      tuval = document.createElement('canvas');
      tuval.id = 'sokak';
      const n = 3, gg = Math.floor(innerWidth / n), yy = Math.floor(innerHeight / n);
      tuval.width = gg;
      tuval.height = yy;
      const c = tuval.getContext('2d');
      const v = c.createImageData(gg, yy);
      O.atkinson(O.griOrnekle(r, gg, yy, [0, 0.3, 1, 0.66]), gg, yy, null, new Uint32Array(v.data.buffer), O.RENK.kor, 0x00000000);
      c.putImageData(v, 0, 0);
      document.body.appendChild(tuval);
      hazir = true;
    }
    addEventListener('scroll', () => {
      const n = performance.now();
      if (!girdi || document.documentElement.classList.contains('giriste') || n - girisAn < 40000 || n - son < 47000) return;
      if (Math.random() > 0.012) return;
      son = n;
      if (!hazir) {
        hazirla();
        return;
      }
      tuval.style.display = 'block';
      setTimeout(() => { tuval.style.display = 'none'; }, 90);
    }, { passive: true });
  }

  // ---------- kıpırdamadıkça aşağı çeker ----------
  function cekim() {
    let son = performance.now();
    ['pointermove', 'pointerdown', 'keydown', 'wheel', 'touchstart'].forEach((o) => {
      addEventListener(o, () => { son = performance.now(); }, { passive: true });
    });
    let kalan = 0;
    setInterval(() => {
      if (!girdi || document.hidden) return;
      const k = document.documentElement.classList;
      if (k.contains('giriste') || k.contains('esikte')) return;
      const a = document.activeElement;
      if (a && /^(INPUT|TEXTAREA)$/.test(a.tagName)) return;
      if ($('#asli').open || $('#perde').hidden || !$('#karartma').hidden) return;
      const sessizlik = performance.now() - son;
      if (sessizlik < 9000) {
        kalan = 0;
        return;
      }
      if (kalan === 0 && sessizlik % 13000 < 130) kalan = 31;
      if (kalan > 0) {
        kalan--;
        scrollBy({ top: 1, behavior: 'instant' });
      }
    }, 125);
  }

  // ---------- başlıktaki 31 ----------
  let otuzbir = 0;
  const SAY = { 5: 'dur.', 13: 'dur dedim.', 24: 'neden sayıyorsun.', 30: 'bir tane daha.' };
  const on = $('.otuzbir');
  on.addEventListener('click', (e) => {
    e.stopPropagation();
    otuzbir++;
    if (SAY[otuzbir]) V.fisilda(SAY[otuzbir], { zorla: true });
    if (otuzbir === 31) location.href = kodBag('sessizoda');
  });

  // ---------- yazdığını okur ----------
  let tampon = '';
  addEventListener('keydown', (e) => {
    if (!girdi || e.key.length !== 1 || icinde(e, 'input,textarea')) return;
    tampon = (tampon + e.key.toLowerCase()).slice(-16);
    if (tampon.endsWith('selim')) {
      tampon = '';
      V.cevrimici();
      V.fisilda('adını yazma.', { zorla: true });
    } else if (tampon.endsWith('cevap')) {
      tampon = '';
      V.fisilda('hayır.', { zorla: true });
    }
  });

  // ---------- konsol ----------
  let konsolVar = false;
  function konsolTepki() {
    if (konsolVar) return;
    konsolVar = true;
    const n = (parseInt(depo.al('f12'), 10) || 0) + 1;
    depo.yaz('f12', String(n));
    if (!girdi) return;
    V.cevrimici();
    V.fisilda(n === 1 ? 'oraya bakma.' : 'orada da görüyor.', { zorla: true, sure: 4200 });
  }
  addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if (e.key === 'F12' || ((e.ctrlKey || e.metaKey) && e.shiftKey && (k === 'i' || k === 'j' || k === 'c')) || ((e.ctrlKey || e.metaKey) && e.altKey && k === 'i') || ((e.ctrlKey || e.metaKey) && k === 'u')) {
      konsolTepki();
    }
  });
  // Yana ya da alta yapışık geliştirici paneli pencereyi daraltır.
  const taban = [outerWidth - innerWidth, outerHeight - innerHeight];
  setInterval(() => {
    const a = outerWidth - innerWidth - taban[0], b = outerHeight - innerHeight - taban[1];
    if (a > 160 || b > 160) konsolTepki();
    else konsolVar = false;
  }, 1500);

  O.portreResmi().then((r) => {
    const G = 76, Y = 76;
    const gri = O.griOrnekle(r, G, Y, [0, 0.28, 1, 0.68]);
    const RAMP = ' .:-=+*#%@';
    let cizim = '';
    for (let y = 0; y < Y; y += 2) {
      for (let x = 0; x < G; x++) cizim += RAMP[Math.min(9, Math.floor((gri[y * G + x] / 256) * 10))];
      cizim += '\n';
    }
    console.log(`[notice] ${O.onion()}\n[notice] 31 düğüm bağlı. biri sen.\n[warn]   konsol oturumu kaydediliyor.`);
    console.log('%cKonsolu açtın.', 'font:700 26px "Times New Roman",serif;color:#f0201a');
    console.log('%c' + cizim, 'color:#c8c8c8;background:#000;font:7px/7px monospace');
    console.log('Seni burada da gördü. Yine de cevap yazmayacak.');
    console.log('%c10100 10100 11001', 'color:#f0201a;font:400 16px monospace', '  beş bit. A=00001. Adresin sonuna.');
    console.log('Yardım istersen: kadim.yardim()');
  }).catch(() => {});

  window.kadim = Object.assign(window.kadim || {}, {
    yardim() {
      console.log('kadim.sor("...")     görüldü\nkadim.kapilar()      denediğin ve açılan kapılar\nkadim.unut()         kaydını sil\nkadim.tanriModu()    oyunda hile. kayda geçer.\nselimkadiryaar31     yazma.');
      return 'Yardım gelmeyecek. Liste bu kadar.';
    },
    sor(m) {
      V.cevrimici();
      return m ? 'görüldü' : 'yazmadığını da okudu.';
    },
    kapilar() {
      const oku = (a) => { try { return JSON.parse(depo.al(a) || '[]'); } catch (e) { return []; } };
      return { acilan: oku('katlar'), denenen: oku('denenen') };
    },
    unut() {
      O.unut();
      return 'Senden sildik. O silmedi.';
    },
  });
  Object.defineProperty(window, 'selimkadiryaar31', {
    configurable: true,
    get() {
      V.cevrimici();
      V.fisilda('adını konsola yazdın.', { zorla: true, sure: 4200 });
      Ses.fisilti(2);
      return 'görüldü';
    },
  });

  // Uygulama sekmesine bakan için. Ağ sekmesine bakan için.
  depo.yaz('bakma', 'buraya da mı baktın. koridor.');
  if (!dosya) fetch('assets/kayit/bu-dosyayi-kim-istedi.txt', { cache: 'no-store' }).catch(() => {});

  dinle('esik', () => {
    girdi = true;
    girisAn = performance.now();
    if (!azalt) {
      sokak();
      cekim();
    }
  });
})();
