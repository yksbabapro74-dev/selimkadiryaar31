// Karakter oluştur: adın, kulaklığın, yüzün. Yüz zorunlu değil. Çizilir de.
(function () {
  'use strict';
  const O = window.Ortak, Ses = window.Ses, B = window.Bakis, D = window.Davet, Y = window.Yonetmen, Sn = window.Sensor;
  const { depo, kayit, azalt } = O;
  const $ = (s) => document.querySelector(s);
  const tuval = $('#k-tuval'), c = tuval.getContext('2d', { willReadFrequently: true });
  const W = tuval.width, H = tuval.height;
  const yaziEl = $('#k-yazi'), isEl = $('#k-is'), osdEl = $('#k-osd'), adimEl = $('#k-adim');

  let gorunum = 'cizim', dongude = false, noktalar = false, donuk = null, parazit = 0;
  const yaz = (m, s) => Y.daktilo(yaziEl, m, s);
  const uyu = Y.uyu, bekle = Y.bekle;

  function dugmeler(l) {
    isEl.textContent = '';
    return new Promise((coz) => {
      l.forEach((d, i) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = d.ikincil ? 'k-dugme ikincil' : 'k-dugme';
        b.textContent = d.yazi;
        b.addEventListener('click', () => {
          isEl.textContent = '';
          coz(d.deger);
        });
        isEl.appendChild(b);
        if (i === 0) b.focus({ preventScroll: true });
      });
    });
  }
  // Koşul doğru olana ya da süre bitene kadar. Kamera kapanırsa da çıkar.
  async function kosul(f, ms) {
    const bas = performance.now();
    while (performance.now() - bas < ms) {
      if (!B.acikMi()) return false;
      if (f()) return true;
      await uyu(70);
    }
    return false;
  }

  // ---------- önizleme ----------
  function cizimYuz(z) {
    // Yüzü olmayan bir kafa. Kameran kapalı: seni böyle çizdik.
    const g = c.createImageData(W, H), px = new Uint32Array(g.data.buffer);
    const gri = new Float32Array(W * H);
    const cx = W / 2 + (azalt ? 0 : Math.sin(z / 2600) * 1.2), cy = H * 0.5;
    for (let y = 0, i = 0; y < H; y++) {
      for (let x = 0; x < W; x++, i++) {
        const dx = (x - cx) / 44, dy = (y - cy) / 58, q = dx * dx + dy * dy;
        let v = 16 + Math.random() * 8;
        if (q < 1) v = 150 - q * 110 + Math.random() * 8;
        const om = Math.abs(x - cx) < 44 + (y - 152) * 2.4 && y > 152;
        if (om) v = 44 - (y - 152) * 0.6;
        gri[i] = v;
      }
    }
    O.atkinson(gri, W, H, null, px, 0xffb4b4b4, 0xff000000);
    c.putImageData(g, 0, 0);
    if (Date.now() % 7000 < 900) return;
    c.fillStyle = '#000';
    c.fillRect(Math.round(cx - 14), Math.round(cy - 5), 5, 2);
    c.fillRect(Math.round(cx + 10), Math.round(cy - 5), 5, 2);
  }
  function kareCiz(z) {
    if (parazit > performance.now()) {
      const g = c.createImageData(W, H), px = new Uint32Array(g.data.buffer);
      for (let i = 0; i < px.length; i++) px[i] = Math.random() < 0.5 ? 0xff000000 : 0xff555555;
      c.putImageData(g, 0, 0);
      return;
    }
    if (gorunum === 'dondur' && donuk) {
      c.drawImage(donuk, 0, 0, W, H);
      B.griIsle(c, W, H, { gurultu: 3 });
      return;
    }
    if (gorunum === 'canli' && B.acikMi()) {
      if (!B.ciz(c, W, H)) return;
      B.griIsle(c, W, H);
      if (noktalar && B.d.yuz) {
        c.fillStyle = '#f0201a';
        const f = B.d.yuz.nokta;
        for (let i = 0; i < f.length; i += 4) {
          const [x, y] = B.yer(1 - f[i].x, f[i].y, W, H);
          c.fillRect(Math.round(x), Math.round(y), 1, 1);
        }
      }
      return;
    }
    cizimYuz(z);
  }
  function dongu() {
    if (dongude) return;
    dongude = true;
    let son = 0;
    (function k(z) {
      if ($('#karakter').hidden) {
        dongude = false;
        return;
      }
      requestAnimationFrame(k);
      if (z - son < 80) return;
      son = z;
      kareCiz(z);
    })(0);
    (function osd() {
      if ($('#karakter').hidden) return;
      const d = B.d;
      const satirlar = !B.acikMi() ? ['kamera: kapalı', 'yüz: çizilecek']
        : d.model !== 'hazir' ? ['kamera: açık', d.model === 'hata' ? 'yüz: okunamıyor' : 'yüz: yükleniyor…']
          : [`kişi: ${d.yuzSayi}`, `yüz: ${d.yuzVar ? 'bulundu' : 'aranıyor'}`, `göz: ${d.yuzVar ? (d.gozKapali ? 'kapalı' : 'açık') : '-'}`, `ışık: %${Math.round(d.isik * 100)}`];
      osdEl.innerHTML = '';
      satirlar.forEach((s) => {
        const li = document.createElement('li');
        li.textContent = s;
        osdEl.appendChild(li);
      });
      setTimeout(osd, 220);
    })();
  }

  // ---------- adımlar ----------
  async function adAdimi() {
    adimEl.textContent = '1/4';
    const davetli = D.ad();
    if (davetli && D.var()) {
      $('#k-ad').textContent = davetli;
      await yaz(`Adın ${davetli}.`);
      await bekle(900);
      await yaz(`Adın ${davetli}. Düzenlenemez.`, { hiz: 0 });
      await dugmeler([{ yazi: 'devam', deger: 1 }]);
      return;
    }
    await yaz('Adın.');
    const f = document.createElement('form');
    f.className = 'k-form';
    f.autocomplete = 'off';
    const g = document.createElement('input');
    g.type = 'text';
    g.maxLength = 24;
    g.placeholder = 'adını yaz';
    g.spellcheck = false;
    g.autocomplete = 'off';
    g.value = kayit.ad || '';
    g.setAttribute('aria-label', 'Adın');
    const b = document.createElement('button');
    b.type = 'submit';
    b.className = 'k-dugme';
    b.textContent = 'tamam';
    f.append(g, b);
    isEl.textContent = '';
    isEl.appendChild(f);
    g.focus({ preventScroll: true });
    await new Promise((coz) => {
      f.addEventListener('submit', (e) => {
        e.preventDefault();
        const ad = g.value.trim().slice(0, 24);
        if (ad) {
          kayit.ad = ad;
          depo.yaz('ad', ad);
        }
        coz();
      });
    });
    isEl.textContent = '';
    $('#k-ad').textContent = kayit.ad || O.misafir();
  }

  async function sesAdimi() {
    adimEl.textContent = '2/4';
    await yaz('Bu oyun sesle daha kötü. Kulaklığın var mı?');
    const s = await dugmeler([
      { yazi: 'taktım', deger: 'kulaklik' },
      { yazi: 'kulaklık yok', deger: 'hoparlor', ikincil: true },
      { yazi: 'sessiz oynayacağım', deger: 'sessiz', ikincil: true },
    ]);
    depo.yaz('kulaklik', s === 'kulaklik' ? '1' : '0');
    if (s === 'sessiz') {
      Ses.uyu();
      return;
    }
    Ses.uyan();
    if (s !== 'kulaklik') return;
    await yaz('Sol.', { hiz: 0 });
    Ses.adimlar(-1.5, 0.05, 0.42, 1);
    await bekle(1500);
    await yaz('Sağ.', { hiz: 0 });
    Ses.adimlar(1.5, 0.05, 0.42, 1);
    await bekle(1500);
    await yaz('Arkan.', { hiz: 0 });
    Ses.adimlar(0.1, 1.6, 0.42, 2);
    await bekle(2300);
    await yaz('Duydun. Çıkarma.', { hiz: 0 });
    await bekle(1500);
    // Test bitti. Bu ses testte yoktu.
    Ses.kayit('yutkun', { x: 0.16, z: 0.2, ses: 0.34 });
    await bekle(1400);
  }

  async function kameraAdimi() {
    adimEl.textContent = '3/4';
    await yaz('Yüz taraması.');
    const not = document.createElement('p');
    isEl.textContent = '';
    not.className = 'k-acik-not';
    const izin = (async () => {
      const k = await dugmeler([
        { yazi: 'kamerayı aç', deger: 'evet' },
        { yazi: 'kamerasız devam et', deger: 'hayir', ikincil: true },
      ]);
      return k;
    })();
    not.textContent = 'Bu adım kameranı kullanır. Görüntü yalnızca bu sekmede işlenir; kaydedilmez, hiçbir yere gönderilmez. Reddedersen oyun aynen sürer, açtıysan her an kapatabilirsin.';
    isEl.prepend(not);
    const k = await izin;
    if (k !== 'evet') {
      B.izin.yaz('red');
      return false;
    }
    await yaz('Tarayıcın soruyor. Karar senin.', { hiz: 0 });
    const a = await B.ac();
    B.izin.yaz(a ? 'evet' : 'red');
    return a;
  }

  async function yuzBekle() {
    gorunum = 'canli';
    if (!(await kosul(() => B.d.model !== 'yukleniyor' && B.d.model !== 'yok', 45000))) return false;
    if (B.d.model !== 'hazir') return false;
    await yaz('Yüzünü bulmaya çalışıyorum.', { hiz: 0 });
    if (await kosul(() => B.d.yuzVar, 7000)) return true;
    await yaz('Göremiyorum. Ekrana yaklaş, yüzün aydınlansın.', { hiz: 0 });
    return kosul(() => B.d.yuzVar, 9000);
  }
  // Komutu gerçekten yapıyor mu: yaptığını görür, görmediyse sessizce geçer.
  async function komut(m, f, ms) {
    await yaz(m, { hiz: 0 });
    const ok = await kosul(f, ms || 7000);
    Ses.tik(0.3);
    await bekle(ok ? 450 : 200);
    return ok;
  }
  async function gozKapat() {
    await yaz('Gözlerini kapat.', { hiz: 0 });
    await bekle(1400);
    await yaz('Üç saniye. Açma. Sesle sayacağım.', { hiz: 0 });
    const kapandi = await kosul(() => B.d.gozKapali, 9000);
    if (!kapandi) return false;
    Ses.cinlama(0.7);
    for (let dene = 0; dene < 3; dene++) {
      const bas = performance.now();
      let sayi = 0, tamam = true;
      while (performance.now() - bas < 3100) {
        if (!B.acikMi()) {
          Ses.cinlama(0);
          return false;
        }
        if (!B.d.gozKapali) {
          tamam = false;
          break;
        }
        const s = Math.floor((performance.now() - bas) / 1000);
        if (s > sayi) {
          sayi = s;
          Ses.tik(0.6);
          Sn.titret(40);
          // Gözün kapalıyken duyduğun şeyler.
          if (sayi === 1) Ses.kayit('kumas1', { x: 0.7, z: 0.6, ses: 0.4 });
          if (sayi === 2) Ses.kayit('kokla', { x: -0.2, z: 0.16, ses: 0.62 });
        }
        await uyu(60);
      }
      if (tamam) break;
      await yaz('Açtın. Yine.', { hiz: 0 });
      if (!(await kosul(() => B.d.gozKapali, 5000))) {
        Ses.cinlama(0);
        return !!B.ozel.kapaliGoz;
      }
    }
    Ses.cinlama(0);
    // Açtığında artık ekranda canlı görüntü yok.
    donuk = B.ozel.kapaliGoz ? B.ozel.kapaliGoz.tuval : null;
    if (donuk) gorunum = 'dondur';
    yaziEl.textContent = '';
    noktalar = false;
    Ses.can(116.54, 7, 0.55);
    Sn.titret([60, 80, 60]);
    await kosul(() => !B.d.gozKapali, 6000);
    return true;
  }
  async function tarama() {
    adimEl.textContent = '4/4';
    const bulundu = await yuzBekle();
    if (!B.acikMi()) return cizim();
    if (!bulundu) {
      await yaz('Yüzünü okuyamadım. Olsun. Görüntü yeter.', { hiz: 0 });
      await bekle(1800);
      return;
    }
    noktalar = true;
    await yaz('Buldum.', { hiz: 0 });
    await bekle(1100);
    await komut('Başını sağa çevir.', () => B.d.yaw > 0.3);
    await komut('Sola.', () => B.d.yaw < -0.3);
    await komut('Bana bak.', () => B.d.bakiyor && Math.abs(B.d.yaw) < 0.25);
    if (B.d.yuzSayi >= 2) {
      await yaz('Yanındaki kim? Neyse. Biriniz yeter.', { hiz: 0 });
      await bekle(1800);
    }
    const kapatti = await gozKapat();
    if (!B.acikMi()) return cizim();
    if (!kapatti) {
      // Kapatmadı. Ama herkes kırpar.
      if (B.ozel.kapaliGoz) {
        donuk = B.ozel.kapaliGoz.tuval;
        gorunum = 'dondur';
        noktalar = false;
        await yaz('Kapatmadın. Ama kırptın.', { hiz: 0 });
        await bekle(2400);
      }
    }
    if (gorunum === 'dondur') {
      await bekle(900);
      await yaz('Gözlerin kapalıyken böyle görünüyorsun.');
      await bekle(2600);
      await yaz('Bunu ilk kez görüyorsun.');
      await bekle(2400);
      Y.dinlen(0);
    }
    gorunum = 'canli';
    noktalar = false;
    parazit = performance.now() + 500;
    Ses.parazit(0.45, 0.1);
    // Odayı karart: gerçekten kapatırsa görür.
    await yaz('Son bir şey. Işığı kapat.', { hiz: 0 });
    const once = B.d.isik;
    const karardi = await kosul(() => B.d.isik < 0.12 || once - B.d.isik > 0.12, 9000);
    await yaz(karardi ? 'Teşekkürler.' : 'Kapatmadın. Sorun değil. Burası zaten aydınlanmıyor.', { hiz: 0 });
    await bekle(1800);
  }
  async function cizim() {
    gorunum = 'cizim';
    adimEl.textContent = '4/4';
    parazit = performance.now() + 300;
    await yaz('Peki. Seni çizeriz.');
    await bekle(2600);
    await yaz('Benzedi mi? Fark etmez.');
    await bekle(1900);
  }

  // Cesaret kaydırıcısı: yukarı çekilir, kendi iner.
  (function () {
    const g = $('#k-cesaret');
    let z = 0, taban = 3;
    const in_ = () => {
      clearInterval(z);
      z = setInterval(() => {
        if (+g.value > taban) g.value = +g.value - 1;
        else {
          clearInterval(z);
          taban = Math.max(0, taban - 1);
          g.value = taban;
        }
      }, 90);
    };
    g.addEventListener('change', in_);
    g.addEventListener('pointerup', in_);
  })();

  Y.kaydet('karakter', async () => {
    gorunum = 'cizim';
    $('#k-ad').textContent = D.ad() || '—';
    isEl.textContent = '';
    yaziEl.textContent = '';
    dongu();
    Y.gerilim(0.08);
    await adAdimi();
    await sesAdimi();
    Y.gerilim(0.14);
    const acildi = await kameraAdimi();
    if (acildi) {
      gorunum = 'canli';
      await tarama();
    } else {
      await cizim();
    }
    await yaz('NPC hazır.', { hiz: 0 });
    await bekle(1500);
    await Y.gec('inis', 1300, 700);
  });
})();
