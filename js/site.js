// Portre, kayıtlar, karanlık oda, ayin, belge, ayna, mumlar ve son.
(function () {
  'use strict';
  const O = window.Ortak;
  const { azalt, RENK, CSS_RENK, BAYER, kayit, depo, dinle, yay, javaHash, muhur } = O;
  const Ses = window.Ses, V = window.Varlik;
  const kok = document.documentElement;
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));
  const bekle = (ms) => new Promise((c) => setTimeout(c, azalt ? Math.min(ms, 300) : ms));
  const iki = (n) => String(n).padStart(2, '0');
  const saat = () => { const d = new Date(); return `${iki(d.getHours())}.${iki(d.getMinutes())}`; };
  const sayi = (n) => n.toLocaleString('tr-TR').replace('-', '−');
  let hepsiYanik = false;

  // ---------- dikişler ve ilahiler ----------
  $$('.dikis').forEach((d) => {
    const r = O.dikisResmi(CSS_RENK[d.dataset.ust], CSS_RENK[d.dataset.alt], 3);
    d.style.backgroundImage = `url(${r.url})`;
    d.style.backgroundSize = `${r.g}px ${r.y}px`;
  });
  $$('.ilahi').forEach((e) => {
    const s = document.createElement('span');
    s.textContent = e.dataset.ilahi.repeat(24);
    e.appendChild(s);
  });

  // ---------- portre: karanlıktan belirir, nefes alır, seni izler ----------
  (function () {
    const tuval = $('#portre');
    if (!tuval) return;
    const ctx = tuval.getContext('2d', { alpha: false });
    const bolum = $('#karakter');
    const baslik = bolum.querySelector('.baslik'), alt = bolum.querySelector('.alt-baslik'), kart = bolum.querySelector('.kart');
    const parcalar = [[baslik, 0.3], [alt, 0.46], [kart, 0.62]];
    const yapiskan = () => false;
    // Gözlük camlarının kaynak resimdeki yeri (kesir)
    const CAM = [[0.318, 0.567], [0.661, 0.579]];
    let gri = null, resim = null, g = 0, y = 0, v = null, cikis = null, sonP = -1, bekliyor = false;
    let camlar = [], camR = 2, imX = innerWidth / 2, imY = innerHeight / 2, nefesVar = false, sonN = 0;

    function boyut() {
      if (!resim) return;
      const r = tuval.getBoundingClientRect();
      const nokta = 2;
      g = Math.max(40, Math.floor(r.width / nokta));
      y = Math.max(40, Math.floor(r.height / nokta));
      tuval.width = g;
      tuval.height = y;
      v = ctx.createImageData(g, y);
      cikis = new Uint32Array(v.data.buffer);
      gri = O.griOrnekle(resim, g, y);
      const olc = Math.min(g / resim.width, y / resim.height);
      const rg = Math.round(resim.width * olc), ry = Math.round(resim.height * olc);
      const x0 = Math.round((g - rg) / 2), y0 = y - ry;
      camlar = CAM.map(([a, b]) => [x0 + a * rg, y0 + b * ry]);
      camR = Math.max(1, rg * 0.016);
      sonP = -1;
    }
    function gozler(z) {
      // Arada kırpar.
      if (!azalt && z % 5700 < 130) return;
      const r = tuval.getBoundingClientRect();
      const mx = ((imX - r.left) / r.width) * g, my = ((imY - r.top) / r.height) * y;
      camlar.forEach(([cx, cy]) => {
        const dx = mx - cx, dy = my - cy, u = Math.hypot(dx, dy) || 1, k = Math.min(1, u / 60) * camR * 2.4;
        const gx = Math.round(cx + (dx / u) * k), gy = Math.round(cy + (dy / u) * k * 0.7);
        const b = Math.max(1, Math.round(camR));
        for (let j = -b; j < b; j++) {
          for (let i = -b; i < b; i++) {
            const n = (gy + j) * g + gx + i;
            if (n >= 0 && n < cikis.length) cikis[n] = RENK.kor;
          }
        }
      });
    }
    function ciz(p, nefes, z) {
      if (!gri) return;
      // Önce en parlak yerler (gözlük parıltısı, alın) belirir, sonra orta tonlar.
      const k = Math.max(0, Math.min(1, p));
      const kay = (1 - k) * 215 + (nefes || 0), kaz = 1 + (1 - k) * 0.55;
      O.atkinson(gri, g, y, (d) => {
        const c = (d - kay) * kaz;
        return c < 0 ? 0 : c;
      }, cikis, RENK.kagit, RENK.murekkep);
      if (k > 0.96) gozler(z || performance.now());
      ctx.putImageData(v, 0, 0);
    }
    function nefes(z) {
      const r = bolum.getBoundingClientRect();
      if (azalt || sonP < 0.97 || r.bottom < 0 || r.top > innerHeight || document.hidden) {
        nefesVar = false;
        return;
      }
      requestAnimationFrame(nefes);
      if (z - sonN < 83) return;
      sonN = z;
      ciz(1, Math.sin(z / 1300) * 11, z);
    }
    function kaydir() {
      bekliyor = false;
      const r = bolum.getBoundingClientRect();
      const vh = innerHeight;
      if (r.bottom < -40 || r.top > vh + 40) return;
      let p;
      if (azalt) p = 1;
      else if (yapiskan()) p = (vh * 0.55 - r.top) / (vh * 0.55 + (r.height - vh) * 0.72);
      else p = (vh * 0.92 - tuval.getBoundingClientRect().top) / (vh * 0.8);
      p = Math.max(0, Math.min(1, p));
      if (Math.abs(p - sonP) > 0.004) {
        sonP = p;
        ciz(p);
      }
      if (sonP >= 0.97 && !nefesVar && !azalt) {
        nefesVar = true;
        requestAnimationFrame(nefes);
      }
      parcalar.forEach(([el, esik]) => {
        el.style.opacity = azalt || !yapiskan() || p >= esik ? 1 : 0;
      });
    }
    const iste = () => {
      if (bekliyor) return;
      bekliyor = true;
      requestAnimationFrame(kaydir);
    };
    O.portreResmi().then((r) => {
      resim = r;
      boyut();
      kaydir();
    });
    addEventListener('scroll', iste, { passive: true });
    addEventListener('resize', () => { boyut(); iste(); });
    addEventListener('pointermove', (e) => {
      imX = e.clientX;
      imY = e.clientY;
    }, { passive: true });
  })();

  // ---------- kayıtlar: son sayfalar ----------
  (function () {
    const KARMA = '†‡§¶#%&/\\=+*';
    function karistirarak(el, metin) {
      if (azalt) { el.textContent = metin; return; }
      const sure = Math.min(900, 300 + metin.length * 9), bas = performance.now();
      (function adim(n) {
        const t = Math.min(1, (n - bas) / sure), sinir = Math.floor(t * metin.length);
        let s = metin.slice(0, sinir);
        for (let i = sinir; i < metin.length; i++) s += metin[i] === ' ' ? ' ' : KARMA[(Math.random() * KARMA.length) | 0];
        el.textContent = s;
        if (t < 1) requestAnimationFrame(adim);
      })(bas);
    }
    $$('.kayit').forEach((k) => {
      const d = document.createElement('button');
      d.type = 'button';
      d.className = 'cevir';
      d.textContent = 'son sayfayı oku';
      const yeni = k.querySelector('.kayit-yeni');
      const metin = yeni.textContent;
      k.insertBefore(d, yeni);
      d.addEventListener('click', () => {
        k.classList.add('cevrildi');
        d.remove();
        yeni.setAttribute('aria-live', 'polite');
        karistirarak(yeni, metin);
        Ses.fisilti(1.2);
      });
    });
    // Son kayıt sensin.
    const sure = $('#kayit-sure'), bas = performance.now();
    $('#kayit-saat').textContent = saat();
    setInterval(() => { sure.textContent = Math.round((performance.now() - bas) / 1000); }, 1000);
  })();

  // ---------- suretler: aslı ----------
  (function () {
    const dlg = $('#asli');
    if (!dlg || !dlg.showModal) return;
    const levhalar = $$('#duvar .levha');
    const resim = $('#asli-resim'), yazi = $('#asli-yazi');
    let sira = 0;
    function goster(i) {
      sira = (i + levhalar.length) % levhalar.length;
      const l = levhalar[sira];
      const a = l.querySelector('a');
      resim.src = a.getAttribute('href');
      resim.alt = l.querySelector('img').alt;
      yazi.innerHTML = l.querySelector('figcaption').innerHTML;
    }
    levhalar.forEach((l, i) => {
      l.querySelector('a').addEventListener('click', (e) => {
        e.preventDefault();
        goster(i);
        dlg.showModal();
      });
    });
    $('#asli-kapat').addEventListener('click', () => dlg.close());
    $('#asli-onceki').addEventListener('click', () => goster(sira - 1));
    $('#asli-sonraki').addEventListener('click', () => goster(sira + 1));
    dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
    dlg.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') goster(sira - 1);
      if (e.key === 'ArrowRight') goster(sira + 1);
    });
  })();

  // ---------- karanlık oda: fener sende, bakmadıkların değişir ----------
  (function () {
    const tuval = $('#fener'), oda = $('#duvar');
    const levhalar = $$('#duvar .levha');
    if (azalt) {
      tuval.hidden = true;
      return;
    }
    const c = tuval.getContext('2d');
    const NOKTA = 4;
    const dokunmatik = matchMedia('(pointer:coarse)').matches;
    let W = 0, H = 0, img = null, px = null, gorunur = false, calisiyor = false, son = 0, sonDenetim = 0;
    let hedefX = innerWidth / 2, hedefY = innerHeight / 2, x = hedefX, y = hedefY, R = 220;
    let odaSure = 0, sonDegisim = 0, degisen = 0;
    const SIYAH = 0xff000000;
    const durum = levhalar.map((l) => ({ bakis: 0, dondu: l.hasAttribute('data-hedef') }));

    function boyut() {
      W = Math.ceil(innerWidth / NOKTA);
      H = Math.ceil(innerHeight / NOKTA);
      tuval.width = W;
      tuval.height = H;
      img = c.createImageData(W, H);
      px = new Uint32Array(img.data.buffer);
      R = dokunmatik ? Math.max(180, innerWidth * 0.66) : Math.max(190, Math.min(300, Math.min(innerWidth, innerHeight) * 0.36));
      if (dokunmatik) {
        hedefX = innerWidth / 2;
        hedefY = innerHeight / 2;
      }
    }
    boyut();
    addEventListener('resize', boyut);
    addEventListener('pointermove', (e) => {
      hedefX = e.clientX;
      hedefY = e.clientY;
    }, { passive: true });
    addEventListener('touchmove', (e) => {
      if (e.touches[0]) {
        hedefX = e.touches[0].clientX;
        hedefY = e.touches[0].clientY;
      }
    }, { passive: true });
    oda.addEventListener('focusin', (e) => {
      const r = e.target.getBoundingClientRect();
      hedefX = r.left + r.width / 2;
      hedefY = r.top + r.height / 2;
    });

    function degistir(l, i) {
      const im = l.querySelector('img'), a = l.querySelector('a');
      im.style.aspectRatio = `${im.getAttribute('width')}/${im.getAttribute('height')}`;
      im.style.objectFit = 'cover';
      im.style.objectPosition = '50% 30%';
      im.src = 'assets/suret/goruldu.png';
      im.alt = 'Kameraya boş boş bakan, gözlüklü bir yüz.';
      a.setAttribute('href', 'assets/suret/renkli/goruldu.jpg');
      l.classList.add('dondu');
      const no = l.querySelector('.levha-no').textContent.split(' · ')[0];
      l.querySelector('figcaption').innerHTML = `<span class="levha-no">${no} · şimdi</span><b>Görüldü.</b> Bu levhada başka bir şey vardı.`;
      durum[i].dondu = true;
      degisen++;
    }

    function denetle(z, dt) {
      odaSure += dt;
      levhalar.forEach((l, i) => {
        const d = durum[i];
        if (d.dondu) return;
        const r = l.getBoundingClientRect();
        const ax = Math.max(r.left - x, 0, x - r.right), ay = Math.max(r.top - y, 0, y - r.bottom);
        const u = Math.hypot(ax, ay);
        if (u < R * 0.42) d.bakis += dt;
        // Yalnızca görülmüş, ışıktan uzak levha değişir.
        if (d.bakis > 0.6 && u > R * 1.2 && odaSure > 14 && z - sonDegisim > 3600) {
          sonDegisim = z;
          degistir(l, i);
          if (degisen === 1) V.fisilda('az önce başka bir şeydi.');
          if (degisen >= levhalar.length - 1) V.fisilda('hepsi o.', { zorla: true });
        }
      });
    }

    function kare(z) {
      if (!gorunur) {
        calisiyor = false;
        c.clearRect(0, 0, W, H);
        return;
      }
      requestAnimationFrame(kare);
      if (z - son < 32) return;
      const dt = Math.min(0.1, (z - son) / 1000);
      son = z;
      x += (hedefX - x) * 0.24;
      y += (hedefY - y) * 0.24;
      const r = oda.getBoundingClientRect();
      const ust = r.top - 40, alt = r.bottom + 40;
      const Rn = (R * (1 + 0.035 * Math.sin(z * 0.011) + 0.02 * Math.sin(z * 0.037))) / NOKTA;
      const R2 = Rn * Rn, cx = x / NOKTA, cy = y / NOKTA;
      for (let j = 0, i = 0; j < H; j++) {
        const sy = j * NOKTA;
        if (sy < ust || sy > alt) {
          px.fill(0, i, i + W);
          i += W;
          continue;
        }
        const kenar = Math.min(1, (sy - ust) / 200) * Math.min(1, (alt - sy) / 90);
        const dy = j - cy, by = (j & 7) << 3;
        for (let k = 0; k < W; k++, i++) {
          const dx = k - cx, q = (dx * dx + dy * dy) / R2;
          const d = (q < 0.26 ? 0 : q > 1 ? 1 : (q - 0.26) / 0.74) * kenar;
          px[i] = d > BAYER[by | (k & 7)] ? SIYAH : 0;
        }
      }
      c.putImageData(img, 0, 0);
      if (z - sonDenetim > 240) {
        denetle(z, (z - sonDenetim) / 1000);
        sonDenetim = z;
      }
    }
    new IntersectionObserver((g) => {
      gorunur = g[0].isIntersecting;
      if (gorunur && !calisiyor) {
        calisiyor = true;
        son = performance.now();
        sonDenetim = son;
        requestAnimationFrame(kare);
      }
    }, { rootMargin: '220px 0px' }).observe(oda);
  })();

  // ---------- ayin ----------
  const ayin = { el: false, ad: null, no: null };
  function adimBitti(id, sonraki) {
    const t = document.querySelector(`#${id} .tamam`);
    if (t) t.hidden = false;
    if (sonraki) {
      const s = document.getElementById(sonraki);
      s.inert = false;
      s.classList.remove('kilitli');
    }
    Ses.can(164.81, 8, 0.4);
  }

  // I: beş parmak, beş bit. Açılan kapanmaz.
  (function () {
    const el = $('#el'), okuma = $('#el-okuma');
    const parmaklar = $$('#el .parmak');
    const YORUM = {
      0: 'Yumruk. Daha başlamadık.',
      1: 'Bir parmak. Bir bit. Görüyor.',
      4: 'Bunu gördü.',
      6: 'Barış işareti. Geç kaldın.',
      31: 'Selam verildi. El artık kapanmaz.',
    };
    function guncelle() {
      let d = 0;
      parmaklar.forEach((p) => { if (p.getAttribute('aria-pressed') === 'true') d += +p.dataset.d; });
      const ikili = d.toString(2).padStart(5, '0');
      const yorum = YORUM[d] || (d > 24 ? 'Az kaldı. Durabilirsin. Durmayacaksın.' : 'Sayıyor.');
      okuma.innerHTML = `<b>${ikili}<sub>2</sub> = ${d}</b><br>${yorum}`;
      el.classList.toggle('dolu', d === 31);
      if (d === 31 && !ayin.el) {
        ayin.el = true;
        parmaklar.forEach((p) => { p.disabled = true; });
        adimBitti('adim-el', 'adim-ad');
      }
    }
    parmaklar.forEach((p) => p.addEventListener('click', () => {
      p.setAttribute('aria-pressed', p.getAttribute('aria-pressed') === 'true' ? 'false' : 'true');
      Ses.tik(0.6);
      guncelle();
    }));
  })();

  function adYansit(ad) {
    $('#alt-baslik').textContent = `${ad}. Cevap yazmayacak.`;
    $('#ipucu').textContent = `${ad}. yüzünü görmeye çalışma.`;
    const g = $('#gorulme-ad');
    g.textContent = ad;
    g.hidden = false;
  }

  // II: ad 31 ile çarpılır, mühre döner.
  (function () {
    const girdi = $('#ad-girdi'), form = $('#ad-form'), okuma = $('#ad-okuma'), dugme = $('#ad-muhurle');
    const tuval = $('#muhur-tuval');
    const c = tuval.getContext('2d'), N = tuval.width;
    $('#onun-hash').textContent = String(javaHash('selimkadiryaar31')).replace('-', '−');
    function ciz(ad, oran, renk) {
      c.fillStyle = '#050403';
      c.fillRect(0, 0, N, N);
      c.fillStyle = renk;
      muhur(c, N, ad ? javaHash(ad) : 0, oran);
    }
    function isle() {
      if (ayin.ad) return;
      const ad = girdi.value.trim();
      if (!ad) {
        okuma.innerHTML = 'Mürit numarası: <b>henüz yok</b>';
        ciz('', 0, CSS_RENK.kagit);
        return;
      }
      const no = javaHash(ad);
      const not = no < 0 ? '<br>Eksi çıktı: taşmışsın. 32 bit herkese yetmez.' : '<br>Artı çıktı. Henüz taşmadın.';
      okuma.innerHTML = `Mürit numarası: <b>${sayi(no)}</b>${not}`;
      ciz(ad, Math.min(1, ad.length / 7), CSS_RENK.kagit);
    }
    girdi.addEventListener('input', isle);
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (ayin.ad) return;
      const ad = girdi.value.trim();
      if (!ad) {
        girdi.focus();
        return;
      }
      ayin.ad = ad;
      ayin.no = javaHash(ad);
      kayit.ad = ad;
      depo.yaz('ad', ad);
      girdi.readOnly = true;
      dugme.disabled = true;
      dugme.textContent = 'mühürlendi';
      adYansit(ad);
      yay('ad', ad);
      adimBitti('adim-ad', 'adim-yemin');
      Ses.fisilti(2);
      if (azalt) {
        ciz(ad, 1, CSS_RENK.kor);
        return;
      }
      const bas = performance.now();
      (function anim(z) {
        const t = Math.min(1, (z - bas) / 1300);
        ciz(ad, t, CSS_RENK.kor);
        if (t < 1) requestAnimationFrame(anim);
      })(bas);
    });
    ciz('', 0, CSS_RENK.kagit);
    if (kayit.ad) {
      girdi.value = kayit.ad;
      isle();
      okuma.insertAdjacentHTML('beforeend', '<br>Bunu zaten biliyoruz.');
    }
  })();

  // III: yemin. Neye basarsan bas, bu yazılır.
  (function () {
    const y = $('#yemin'), okuma = $('#yemin-okuma');
    let n = 0, bitti = false;
    const metin = () => `ben ${ayin.ad}. buraya kendi isteğimle geldim. kimse beni zorlamadı. cevap istemiyorum. cevap istemiyorum. cevap istiyorum.`;
    y.addEventListener('paste', (e) => e.preventDefault());
    y.addEventListener('input', () => {
      const m = metin();
      if (bitti) {
        y.value = m;
        return;
      }
      n = Math.min(m.length, n + 3);
      y.value = m.slice(0, n);
      y.setSelectionRange(n, n);
      Ses.tik(0.5);
      if (n >= m.length) {
        bitti = true;
        y.readOnly = true;
        okuma.textContent = 'Sen yazdın. Kayıtta öyle.';
        Ses.fisilti(3);
        adimBitti('adim-yemin', 'adim-soru');
      }
    });
  })();

  // IV: soru. Beşinci mesajdan sonra adını söyler. Cevap verirsen biter.
  (function () {
    const akis = $('#sohbet-akis'), form = $('#sohbet-form'), girdi = $('#sohbet-girdi'), dugme = $('#sohbet-gonder'), kutu = $('#sohbet');
    const SURE = 31;
    const balonlar = [];
    let adet = 0, mesgul = false, faz = 'soru', zaman = 0, dedi = false, sildi = false, elle = false;
    // Yazdıkların bu tarayıcıda durur. Alt katlarda karşına çıkar.
    function mesajSakla(m) {
      let l = [];
      try { l = JSON.parse(depo.al('mesajlar') || '[]'); } catch (e) { /* bozuksa baştan */ }
      l.push(m);
      depo.yaz('mesajlar', JSON.stringify(l.slice(-31)));
    }
    const ayrilma = (e) => { e.preventDefault(); e.returnValue = ''; };
    function ekle(sinif, metin) {
      const li = document.createElement('li');
      li.className = sinif;
      li.textContent = metin;
      akis.appendChild(li);
      akis.scrollTop = akis.scrollHeight;
      return li;
    }
    function tikKoy(balon, metin) {
      let t = balon.querySelector('.tik');
      if (!t) {
        t = document.createElement('span');
        t.className = 'tik';
        balon.appendChild(t);
      }
      t.textContent = metin;
      akis.scrollTop = akis.scrollHeight;
    }
    async function yaziyor(ms) {
      V.oYaz('O: yazıyor…', true);
      const y = ekle('balon yaziyor', 'yazıyor…');
      await bekle(ms);
      y.remove();
      V.oYaz('O: son görülme az önce', false);
    }
    function kapa(not) {
      girdi.disabled = true;
      dugme.disabled = true;
      dugme.textContent = 'gönder';
      girdi.value = '';
      girdi.placeholder = not;
      kutu.classList.remove('cagri');
    }
    async function kendiYazar() {
      girdi.disabled = true;
      dugme.disabled = true;
      await bekle(1100);
      const m = 'özür dilerim';
      for (let i = 1; i <= m.length; i++) {
        girdi.value = m.slice(0, i);
        Ses.tik(0.5);
        await bekle(95);
      }
      await bekle(500);
      girdi.value = '';
      const b = ekle('balon', m);
      tikKoy(b, 'iletildi');
      await bekle(800);
      tikKoy(b, 'görüldü');
      await bekle(1000);
      await yaziyor(5200);
      cagri();
    }
    function cagri() {
      faz = 'cagri';
      mesgul = false;
      const ad = ayin.ad;
      kutu.classList.add('cagri');
      girdi.disabled = false;
      dugme.disabled = false;
      dugme.textContent = 'cevap ver';
      girdi.placeholder = '…';
      ekle('balon gelen', `${ad}.`);
      ekle('sistem yasak', 'Yasak III.');
      V.cevrimici(SURE * 1000 + 2000);
      Ses.can(110, 10, 0.6);
      Ses.kalp(58);
      Ses.soyle(ad);
      depo.yaz('kacti', '1');
      addEventListener('beforeunload', ayrilma);
      const PLAN = [[6, `${ad}?`, 70], [12, 'duyuyorum seni', 84], [18, 'cevap ver', 98], [24, 'bir kere', 116], [29, '…', 132]];
      const SOYLE = { 6: `${ad}?`, 18: 'cevap ver', 24: 'bir kere' };
      const CEVAP = 'efendim';
      let t = 0, i = 0, yazilan = 0;
      zaman = setInterval(() => {
        if (document.hidden) return;
        t += 0.25;
        while (i < PLAN.length && t >= PLAN[i][0]) {
          ekle('balon gelen', PLAN[i][1]);
          Ses.kalp(PLAN[i][2]);
          Ses.fisilti(1.2);
          if (SOYLE[PLAN[i][0]]) Ses.soyle(SOYLE[PLAN[i][0]]);
          i++;
        }
        // Son on üç saniye: imleç sana rağmen düğmeye gider.
        if (t === 18 && !azalt) V.izeGit(dugme);
        // Son altı saniye: kutuya cevabı biri yazar. Tek yapman gereken Enter.
        if (t >= 25 && !elle && yazilan < CEVAP.length && t % 0.5 === 0) {
          yazilan++;
          girdi.value = CEVAP.slice(0, yazilan);
          girdi.focus({ preventScroll: true });
          Ses.tik(0.5);
        }
        if (t >= SURE) vermedi();
      }, 250);
    }
    girdi.addEventListener('input', () => {
      if (faz !== 'cagri') return;
      const dolu = girdi.value.length > 0;
      elle = true;
      if (dolu && !dedi) {
        dedi = true;
        ekle('balon gelen', 'yazıyorsun.');
      } else if (!dolu && dedi && !sildi) {
        sildi = true;
        ekle('balon gelen', 'sildin.');
      }
    });
    function cagriBitti() {
      depo.sil('kacti');
      removeEventListener('beforeunload', ayrilma);
      V.izeGit(null);
      if (window.speechSynthesis) speechSynthesis.cancel();
    }
    function vermedi() {
      faz = 'bitti';
      clearInterval(zaman);
      cagriBitti();
      kapa('bu kişiye mesaj gönderemezsin');
      Ses.kalp(0);
      V.cevrimdisi();
      ekle('sistem', 'Çevrimdışı oldu.');
      ekle('sistem', 'Otuz bir saniye. Cevap vermedin. Kayda geçti.');
      Ses.can(130.81, 12, 0.55);
      son('vermedi');
    }
    async function cevapVerdi(m) {
      faz = 'bitti';
      clearInterval(zaman);
      cagriBitti();
      Ses.kalp(0);
      kapa('bu kişiye mesaj gönderemezsin');
      mesajSakla(m);
      const b = ekle('balon', m);
      tikKoy(b, 'görüldü');
      await bekle(1300);
      await yaziyor(1500);
      ekle('balon gelen', 'tamam');
      await bekle(1500);
      await karartma();
      ekle('sistem', 'Bağlantı kesildi.');
      son('verdi');
    }
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const soru = girdi.value.trim();
      if (!soru) return;
      if (faz === 'cagri') {
        girdi.value = '';
        cevapVerdi(soru);
        return;
      }
      if (faz !== 'soru' || mesgul) return;
      mesgul = true;
      girdi.value = '';
      mesajSakla(soru);
      adet++;
      const n = adet;
      const balon = ekle('balon', soru);
      balonlar.push(balon);
      tikKoy(balon, 'iletildi');
      await bekle(900);
      if (n === 4) {
        // Tek tik. Ama eski bir mesajın artık başka bir şey söylüyor.
        await bekle(1200);
        const ilk = balonlar[0];
        ilk.firstChild.textContent = 'neden buradayım';
        tikKoy(ilk, 'görüldü · düzenlendi');
        ekle('sistem', 'Bir mesajın düzenlendi.');
        Ses.fisilti(1.5);
      } else {
        tikKoy(balon, 'görüldü');
        await bekle(700);
        if (n === 2) await yaziyor(5200);
        else if (n === 3) {
          await yaziyor(3100);
          ekle('balon silindi', 'Bu mesaj silindi.');
        } else if (n >= 5) {
          await kendiYazar();
          return;
        }
      }
      mesgul = false;
    });
  })();

  // ---------- karartma: mumlar teker teker, sonra sessizlik ----------
  async function karartma() {
    const kar = $('#karartma'), mumlar = $('#kar-mumlar'), yuz = $('#kar-yuz'), yazi = $('#kar-yazi');
    let atla = false;
    const esc = (e) => { if (e.key === 'Escape') atla = true; };
    addEventListener('keydown', esc);
    const adim = async (ms) => { if (!atla) await bekle(ms); };
    $('#kar-ad').textContent = ayin.ad || kayit.ad || '';
    kar.hidden = false;
    if (azalt) {
      kar.classList.add('acik');
    } else {
      mumlar.hidden = false;
      mumlar.textContent = '';
      const dizi = [];
      for (let i = 0; i < 31; i++) {
        const s = document.createElement('i');
        s.className = 'kmum';
        s.style.animationDelay = `${-Math.random()}s`;
        const a = -Math.PI / 2 + (i / 31) * Math.PI * 2, r = Math.min(innerWidth, innerHeight) * 0.34;
        s.style.transform = `translate(${Math.round(Math.cos(a) * r)}px,${Math.round(Math.sin(a) * r)}px)`;
        mumlar.appendChild(s);
        dizi.push(s);
      }
      await new Promise((c) => requestAnimationFrame(() => requestAnimationFrame(c)));
      kar.classList.add('acik');
      await adim(900);
      for (let i = dizi.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [dizi[i], dizi[j]] = [dizi[j], dizi[i]];
      }
      for (let i = 0; i < dizi.length; i++) {
        dizi[i].classList.add('sondu');
        Ses.tik(0.8);
        await adim(Math.max(50, 190 - i * 5));
      }
      mumlar.hidden = true;
      Ses.sus(0.04);
      await adim(3100);
      if (!atla) {
        const resim = await O.portreResmi();
        const nokta = innerWidth < 700 ? 2 : 3;
        const g = Math.floor(innerWidth / nokta), y = Math.floor(innerHeight / nokta);
        yuz.width = g;
        yuz.height = y;
        const c = yuz.getContext('2d');
        const v = c.createImageData(g, y);
        O.atkinson(O.griOrnekle(resim, g, y, [0, 0.3, 1, 0.66]), g, y, null, new Uint32Array(v.data.buffer), RENK.kor, 0xff000000);
        c.putImageData(v, 0, 0);
        yuz.hidden = false;
        Ses.cigilik(0.95);
        await bekle(430);
        yuz.hidden = true;
      }
      await adim(900);
    }
    Ses.don(3);
    yazi.hidden = false;
    Ses.soyle(`${ayin.ad || kayit.ad || ''}. Görüldün.`);
    await new Promise((c) => setTimeout(c, 3100));
    kar.classList.add('kapaniyor');
    await bekle(1200);
    kar.hidden = true;
    kar.classList.remove('acik', 'kapaniyor');
    yazi.hidden = true;
    removeEventListener('keydown', esc);
  }

  function son(tur) {
    kayit.cevap = tur;
    depo.yaz('cevap', tur);
    yay('cevap', tur);
    const t = $('#adim-soru .tamam');
    if (t) t.hidden = false;
    sonUygula(tur);
    $('#icazet').hidden = false;
    icazetCiz(tur);
    $('#ayna').hidden = false;
  }

  // Yukarı çıkan, gördüklerinin değiştiğini görür.
  function sonUygula(tur) {
    if (tur !== 'verdi') return;
    kok.classList.add('verdi');
    const ad = kayit.ad;
    $('#karakter-baslik').textContent = 'Seni gördü.';
    $('#alt-baslik').textContent = ad ? `${ad}. Cevap yazdı.` : 'Cevap yazdı.';
    $('#slogan').innerHTML = 'Çağlar boyu hor görüldü. Tek kelime etmedi. <em>Sana etti.</em>';
    $('#kayitlar-baslik').textContent = 'Senin Kaydın';
    $('#oyun-baslik').textContent = 'Selam Verdin';
    $('#yasak-uc').classList.add('cignendi');
    $('#kehanet-son').textContent = 'Bütün mumlar yanıyor. Daha 2038 değil. Cevap verdin; kuyruk senden başladı.';
    hepsiYanik = true;
    V.cevrimici(Infinity);
    const cv = $('.nitelik li:last-child');
    if (cv) {
      cv.querySelector('i').style.setProperty('--d', '2');
      cv.querySelector('b').textContent = '2';
    }
  }

  // ---------- belge ----------
  function satirla(c, metin, en) {
    const satirlar = [];
    let s = '';
    metin.split(' ').forEach((k) => {
      const d = s ? s + ' ' + k : k;
      if (c.measureText(d).width > en && s) { satirlar.push(s); s = k; } else s = d;
    });
    if (s) satirlar.push(s);
    return satirlar;
  }
  async function icazetCiz(tur) {
    const t = $('#icazet-tuval');
    const c = t.getContext('2d');
    await Promise.all([
      document.fonts.load('60px "Jacquard 12"'),
      document.fonts.load('26px "EB Garamond"'),
      document.fonts.load('italic 26px "EB Garamond"'),
      document.fonts.load('22px "VT323"'),
    ]).catch(() => {});
    const G = t.width, Y = t.height, K = CSS_RENK.kagit, M = '#050403', R = CSS_RENK.kor;
    c.fillStyle = M;
    c.fillRect(0, 0, G, Y);
    c.strokeStyle = K;
    c.lineWidth = 4;
    c.strokeRect(22, 22, G - 44, Y - 44);
    c.lineWidth = 1;
    c.strokeRect(32, 32, G - 64, Y - 64);
    c.fillStyle = R;
    c.font = '84px "Jacquard 12", serif';
    c.textAlign = 'center';
    c.fillText('İcazetname', G / 2, 124);
    c.fillStyle = K;
    c.font = '22px "VT323", monospace';
    c.fillText('selimkadiryaar31 · kayıt defteri', G / 2, 158);

    // Mühür: bu ada özgü, başka birinde aynısı çıkmaz.
    const N = 232;
    const off = document.createElement('canvas');
    off.width = N;
    off.height = N;
    const oc = off.getContext('2d');
    oc.fillStyle = R;
    muhur(oc, N, ayin.no === null ? javaHash(kayit.ad || '') : ayin.no, 1);
    c.imageSmoothingEnabled = false;
    c.drawImage(off, (G - N * 2) / 2, 190, N * 2, N * 2);
    c.imageSmoothingEnabled = true;

    const ad = ayin.ad || kayit.ad || '';
    const no = String(ayin.no === null ? javaHash(ad) : ayin.no).replace('-', '−');
    let metin = `Bu belge, «${ad}» adlı kişinin ${no} numarayla kayda geçtiğini; elini açtığını, yemin ettiğini, soru sorduğunu ve adı seslenildiğinde`;
    metin += tur === 'verdi'
      ? ' cevap verdiğini tasdik eder. Geri alınamaz.'
      : ' otuz bir saniye boyunca cevap vermediğini tasdik eder. Bu kayıtlarda nadirdir. Yine de görüldü.';
    c.font = '27px "EB Garamond", serif';
    c.textAlign = 'left';
    c.fillStyle = K;
    let yy = 690;
    satirla(c, metin, G - 130).slice(0, 6).forEach((s) => { c.fillText(s, 65, yy); yy += 33; });
    c.font = 'italic 27px "EB Garamond", serif';
    c.fillText('İmza: (imzalamadı)', 65, Math.min(yy + 18, 900));
    c.font = '22px "VT323", monospace';
    c.textAlign = 'right';
    c.fillStyle = R;
    c.fillText(`unix ${Math.floor(Date.now() / 1000)}`, G - 65, Math.min(yy + 18, 900));
    c.fillText(`dosya: [${tur === 'verdi' ? 'tamam' : 'sustun'}]`, G - 65, 905);
    $('#icazet-yazi').innerHTML = tur === 'verdi'
      ? 'Ayin tamamlandı. Cevap verdin. Belgen hazır. Dosyası <span class="kod">tamam</span> altında.'
      : 'Ayin tamamlandı. Kimse bir şey demedi. Sen de. Belgen hazır. Dosyası <span class="kod">sustun</span> altında.';
  }
  $('#icazet-indir').addEventListener('click', () => {
    $('#icazet-tuval').toBlob((b) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(b);
      a.download = 'icazetname.png';
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    });
  });

  // ---------- ayna: kamera sayfadan çıkmaz, 31 saniyede kapanır ----------
  (function () {
    const ac = $('#ayna-ac'), tuval = $('#ayna-tuval'), okuma = $('#ayna-okuma');
    const G = tuval.width, Y = tuval.height, SURE = 31;
    const c = tuval.getContext('2d');
    const off = document.createElement('canvas');
    off.width = G;
    off.height = Y;
    const oc = off.getContext('2d', { willReadFrequently: true });
    const cikti = c.createImageData(G, Y), px = new Uint32Array(cikti.data.buffer);
    const gri = new Float32Array(G * Y), vig = new Float32Array(G * Y), yuzde = new Uint8Array(G * Y);
    for (let y = 0, i = 0; y < Y; y++) {
      for (let x = 0; x < G; x++, i++) {
        const d = Math.hypot((x - G / 2) / (G * 0.34), (y - Y * 0.48) / (Y * 0.6));
        vig[i] = d < 0.75 ? 1 : d > 1.3 ? 0 : 1 - (d - 0.75) / 0.55;
        yuzde[i] = d < 0.58 ? 1 : 0;
      }
    }
    const YARI = [[0, 0.03], [0.05, 0.1], [0.1, 0.145], [0.16, 0.16], [0.22, 0.13], [0.28, 0.2], [0.45, 0.28], [0.7, 0.36], [1, 0.46]];
    function yari(u) {
      let k = 0;
      while (k < YARI.length - 2 && YARI[k + 1][0] < u) k++;
      return YARI[k][1] + ((YARI[k + 1][1] - YARI[k][1]) * (u - YARI[k][0])) / (YARI[k + 1][0] - YARI[k][0]);
    }
    let akim = null, video = null, calisiyor = false;
    function kameraKapa() {
      if (akim) akim.getTracks().forEach((t) => t.stop());
      akim = null;
      if (video) video.srcObject = null;
      video = null;
    }
    function bitir(m) {
      calisiyor = false;
      kameraKapa();
      Ses.kalp(0);
      c.fillStyle = '#000';
      c.fillRect(0, 0, G, Y);
      okuma.textContent = m;
      ac.disabled = false;
      ac.textContent = 'Bir daha bak';
    }
    addEventListener('pagehide', kameraKapa);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && calisiyor) bitir('Sekmeden çıktın. Ayna kapandı, kamera da.');
    });
    ac.addEventListener('click', async () => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        okuma.textContent = 'Ayna bu adreste açılmıyor: tarayıcı güvenli bağlantı istiyor. O yine de görüyor.';
        return;
      }
      ac.disabled = true;
      okuma.textContent = 'İzin bekleniyor…';
      try {
        akim = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 320 }, height: { ideal: 240 } }, audio: false });
      } catch (e) {
        okuma.textContent = 'Aynayı açmadın. Akıllıca. O seni zaten görüyordu.';
        ac.disabled = false;
        return;
      }
      video = document.createElement('video');
      video.muted = true;
      video.playsInline = true;
      video.srcObject = akim;
      try {
        await video.play();
      } catch (e) {
        bitir('Ayna açılamadı.');
        return;
      }
      tuval.hidden = false;
      okuma.textContent = 'Bu sensin.';
      calisiyor = true;
      const bas = performance.now();
      let son = 0, lo = 30, hi = 220, adim = 0;
      (function kare(z) {
        if (!calisiyor) return;
        requestAnimationFrame(kare);
        if (z - son < 66) return;
        son = z;
        const t = (z - bas) / 1000;
        if (t >= SURE) {
          Ses.cigilik(0.7);
          bitir('Ayna kapandı. Kamera da kapandı. O kapanmadı.');
          return;
        }
        if (adim === 0 && t > 6) { adim = 1; okuma.textContent = 'Kıpırdama.'; Ses.fisilti(2.4); }
        if (adim === 1 && t > 15) { adim = 2; okuma.textContent = 'Arkana bakma.'; Ses.kalp(72); Ses.soyle('Arkana bakma.'); }
        if (adim === 2 && t > 24) { adim = 3; okuma.textContent = 'Bakma.'; Ses.kalp(112); }
        const vw = video.videoWidth || 320, vh = video.videoHeight || 240;
        const olc = Math.max(G / vw, Y / vh), sw = G / olc, sh = Y / olc;
        oc.save();
        oc.translate(G, 0);
        oc.scale(-1, 1);
        oc.drawImage(video, (vw - sw) / 2, (vh - sh) / 2, sw, sh, 0, 0, G, Y);
        oc.restore();
        const d = oc.getImageData(0, 0, G, Y).data;
        let mn = 255, mx = 0;
        for (let i = 0; i < gri.length; i++) {
          const l = d[i * 4] * 0.3 + d[i * 4 + 1] * 0.59 + d[i * 4 + 2] * 0.11;
          gri[i] = l;
          if (l < mn) mn = l;
          if (l > mx) mx = l;
        }
        lo += (mn - lo) * 0.1;
        hi += (mx - hi) * 0.1;
        const k = 255 / Math.max(30, hi - lo);
        for (let i = 0; i < gri.length; i++) gri[i] = Math.max(0, (gri[i] - lo) * k) * vig[i];
        // Omzunun arkasında biri. Yüzünün önüne geçmez.
        const p = Math.max(0, Math.min(1, (t - 6) / (SURE - 6)));
        const gorunen = t > 6;
        const boy = Y * (0.72 + 0.9 * p), cx = G * (0.17 + 0.13 * p), tepe = Y * (0.36 - 0.24 * p);
        if (gorunen) {
          for (let y = Math.max(0, Math.ceil(tepe)); y < Y; y++) {
            const u = (y - tepe) / boy;
            if (u > 1) break;
            const hw = yari(u) * boy * 0.62;
            for (let x = Math.max(0, Math.ceil(cx - hw)); x <= Math.min(G - 1, Math.floor(cx + hw)); x++) {
              const i = y * G + x;
              if (!yuzde[i]) gri[i] = 0;
            }
          }
        }
        O.atkinson(gri, G, Y, null, px, RENK.kagit, 0xff000000);
        if (gorunen && Math.sin(t * 1.1) < 0.94) {
          const ey = Math.round(tepe + boy * 0.085), ara = Math.max(2, Math.round(boy * 0.036)), b = Math.max(1, Math.round(boy * 0.012));
          for (let e = -1; e <= 1; e += 2) {
            const ex = Math.round(cx + e * ara);
            for (let j = 0; j < b; j++) {
              for (let i = -b; i <= b; i++) {
                const n = (ey + j) * G + ex + i;
                if (n >= 0 && n < px.length) px[n] = RENK.kor;
              }
            }
          }
        }
        c.putImageData(cikti, 0, 0);
      })(bas);
    });
  })();

  // ---------- mumlar ----------
  (function () {
    const sunak = $('#sunak');
    if (!sunak) return;

    function alevResmi() {
      const SEKIL = ['....#..', '....#..', '...##..', '...###.', '..####.', '.#####.', '.##o##.', '.#ooo#.', '..#o#..', '...#...'];
      const t = document.createElement('canvas');
      t.width = 7;
      t.height = SEKIL.length;
      const c = t.getContext('2d');
      SEKIL.forEach((s, y) => {
        for (let x = 0; x < 7; x++) {
          if (s[x] === '.') continue;
          c.fillStyle = s[x] === 'o' ? CSS_RENK.kagit : CSS_RENK.kor;
          c.fillRect(x, y, 1, 1);
        }
      });
      return t.toDataURL();
    }
    function haleResmi() {
      const N = 62;
      const t = document.createElement('canvas');
      t.width = t.height = N;
      const c = t.getContext('2d');
      c.fillStyle = CSS_RENK.kor;
      for (let y = 0; y < N; y++) {
        for (let x = 0; x < N; x++) {
          const d = Math.hypot(x + 0.5 - N / 2, y + 0.5 - N / 2) / (N / 2);
          const v = Math.max(0, 1 - d) ** 2 * 0.5;
          if (v > BAYER[((y & 7) << 3) | (x & 7)]) c.fillRect(x, y, 1, 1);
        }
      }
      return t.toDataURL();
    }
    const alev = alevResmi(), hale = haleResmi();
    let tohum = 31;
    const rast = () => { tohum = (Math.imul(tohum, 1664525) + 1013904223) >>> 0; return tohum / 4294967296; };
    const mumlar = [];
    for (let b = 30; b >= 0; b--) {
      const m = document.createElement('div');
      m.className = 'mum';
      m.title = `2^${b}`;
      m.style.setProperty('--b', `${Math.round(54 + rast() * 86)}px`);
      m.style.setProperty('--s', `${(0.5 + rast() * 0.6).toFixed(2)}s`);
      m.innerHTML = `<i class="hale" style="background-image:url(${hale})"></i><i class="alev" style="background-image:url(${alev})"></i><i class="fitil"></i><i class="govde"></i><b class="sunak-bit">0</b>`;
      sunak.appendChild(m);
      mumlar.push(m);
    }
    // En soldaki mum: söndürmeye çalışan olur.
    let ufleme = 0;
    const UF = { 1: 'sönmez.', 3: 'söndüremezsin.', 5: '2004\'ten beri yanıyor.', 7: 'kuyruk burada: [2038]' };
    mumlar[0].addEventListener('click', () => {
      ufleme++;
      if (UF[ufleme]) V.fisilda(UF[ufleme], { zorla: true, sure: ufleme === 7 ? 6200 : 3100 });
    });
    const unix = $('#unix'), yanan = $('#yanan'), sayac = $('#sayac');
    const TAVAN = 2147483647;
    function tik() {
      const s = Math.floor(Date.now() / 1000);
      let lit = 0;
      for (let b = 30; b >= 0; b--) {
        const acik = hepsiYanik || (s < 2147483648 && Math.floor(s / 2 ** b) % 2 === 1);
        const m = mumlar[30 - b];
        if (acik) lit++;
        m.classList.toggle('yanik', acik);
        m.lastChild.textContent = acik ? '1' : '0';
      }
      unix.textContent = s.toLocaleString('tr-TR');
      yanan.textContent = lit;
      const k = TAVAN - s;
      if (k <= 0) {
        sayac.textContent = 'Taştı. Cevaplar geliyor.';
      } else {
        const g = Math.floor(k / 86400), sa = Math.floor((k % 86400) / 3600), dk = Math.floor((k % 3600) / 60), sn = k % 60;
        sayac.textContent = `${g.toLocaleString('tr-TR')} gün ${iki(sa)}:${iki(dk)}:${iki(sn)}`;
      }
    }
    tik();
    setInterval(tik, 1000);
  })();

  // ---------- son: fotoğraf yaklaşır, kenarları karanlığa dağılır ----------
  (function () {
    const fig = $('#bugun-resim'), kare = fig.querySelector('.bugun-kare');
    const W = 145, H = 167;
    const t = document.createElement('canvas');
    t.width = W;
    t.height = H;
    const m = t.getContext('2d');
    m.fillStyle = '#000';
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const nx = ((x + 0.5) / W) * 2 - 1, ny = ((y + 0.5) / H) * 2 - 1;
        const d = Math.hypot(nx / 1.04, (ny + 0.06) / 1.08);
        const v = d < 0.66 ? 1 : d > 1 ? 0 : 1 - (d - 0.66) / 0.34;
        if (v > BAYER[((y & 7) << 3) | (x & 7)]) m.fillRect(x, y, 1, 1);
      }
    }
    const u = `url(${t.toDataURL()})`;
    kare.style.webkitMaskImage = u;
    kare.style.maskImage = u;
    kare.style.webkitMaskSize = '100% 100%';
    kare.style.maskSize = '100% 100%';
    new IntersectionObserver((g, o) => {
      if (g[0].isIntersecting) {
        fig.classList.add('yakin');
        o.disconnect();
      }
    }, { threshold: 0.5 }).observe(fig);

    const an = $('#gorulme-an');
    new IntersectionObserver((g, o) => {
      if (!g[0].isIntersecting) return;
      o.disconnect();
      setTimeout(() => {
        an.textContent = `görüldü · bugün ${saat()}`;
        Ses.can(98, 14, 0.7);
      }, azalt ? 0 : 3100);
    }, { threshold: 0.6 }).observe($('#gorulme-kutu'));

    const sil = $('#kaydi-sil');
    sil.addEventListener('click', () => {
      O.unut();
      sil.textContent = 'Silindi. O silmedi.';
      sil.disabled = true;
    });
  })();

  // ---------- küçük şeyler ----------
  // Yukarı yukarı aşağı aşağı sol sağ sol sağ B A
  const KOD = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
  let kodSira = 0;
  addEventListener('keydown', (e) => {
    const t = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    kodSira = t === KOD[kodSira] ? kodSira + 1 : t === KOD[0] ? 1 : 0;
    if (kodSira === KOD.length) {
      kodSira = 0;
      V.cevrimici();
      V.fisilda('hile kodu. onu da o yazdı. [koridor]', { zorla: true, sure: 6200 });
    }
  });

  if (kayit.ad) adYansit(kayit.ad);
  if (kayit.cevap) sonUygula(kayit.cevap);

})();
