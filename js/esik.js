// Eşik: devre kurulur, parola sorulur, insan olup olmadığına bakılır, sonra 3,1 saniye basılı tutulur.
(function () {
  'use strict';
  const O = window.Ortak;
  const { azalt, kayit, depo, yay, kalem, CSS_RENK } = O;
  const Ses = window.Ses, Sifre = window.Sifre;
  const kok = document.documentElement;
  const esik = document.getElementById('esik');
  if (!esik) return;
  const tuval = document.getElementById('esik-muhur');
  const c = tuval.getContext('2d');
  const N = tuval.width;
  const tut = document.getElementById('esik-tut');
  const sessiz = document.getElementById('esik-sessiz');
  const yazi = document.getElementById('esik-metin');
  const form = document.getElementById('esik-form');
  const parola = document.getElementById('esik-parola');
  const cevap = document.getElementById('esik-cevap');
  const SURE = 3.1;

  // Geri gelen tanınır.
  function satirlar() {
    const { ad, gelis } = kayit;
    const s = [];
    if (depo.al('taslak')) {
      s.push(ad ? `${ad}.` : 'Sen.', 'Taslakları gördün. Kimseye söylemedin, değil mi?');
    } else if (depo.al('kacti')) {
      s.push(ad ? `Çağrıyı yarıda bıraktın, ${ad}.` : 'Çağrıyı yarıda bıraktın.', 'Kaçmak da cevaptır. Not edildi.');
    } else if (kayit.cevap === 'verdi') {
      s.push(ad ? `Cevap vermiştin, ${ad}.` : 'Cevap vermiştin.', 'Kapanmadı.');
    } else if (gelis >= 30) {
      s.push(ad ? `${ad}.` : 'Sen.', `${gelis + 1}. gelişin. Artık saymıyoruz.`);
    } else if (gelis >= 1) {
      s.push(ad ? `Yine geldin, ${ad}.` : 'Yine geldin.', `${gelis + 1}. gelişin. Sayılıyor.`);
      const sk = depo.al('sonkat'), dk = Math.round((parseInt(depo.al('sonsure'), 10) || 0) / 60);
      if (sk) s.push(`Geçen sefer ${dk ? dk + ' dakika kaldın' : 'çabuk kaçtın'}. En son ${sk} bakıyordun.`);
    } else {
      s.push('Buraya kendi isteğinle geldin.', 'Bunu sonra kendine hatırlat.');
    }
    const d = new Date();
    if (d.getHours() < 5) {
      const iki = (n) => String(n).padStart(2, '0');
      s.push(`Saat ${iki(d.getHours())}.${iki(d.getMinutes())}. Bu saatte uyanık iki kişi var.`);
    }
    if (d.getHours() === 4 && d.getMinutes() === 12) s.unshift('Saat 04.12. Commit atıyor. Sessiz ol.');
    return s.slice(0, 3);
  }
  function metinYaz(liste) {
    yazi.textContent = '';
    liste.forEach((m, i) => {
      if (i) yazi.appendChild(document.createElement('br'));
      yazi.appendChild(document.createTextNode(m));
    });
  }
  metinYaz(satirlar());

  // ---------- devre günlüğü ----------
  const gunluk = document.getElementById('esik-log');
  const GUNLUK = [
    '[notice] Bootstrapped 5% (conn): Connecting to a relay',
    '[notice] Bootstrapped 14% (handshake): Handshaking with a relay',
    '[notice] Bootstrapped 45% (requesting_descriptors): Asking for relay descriptors',
    '[notice] Bootstrapped 75% (enough_dirinfo): Loaded enough directory info to build circuits',
    '[notice] Bootstrapped 90% (ap_handshake_done): Handshake finished with a relay to build circuits',
    '[notice] Bootstrapped 100% (done): Done',
    '[notice] devre: sen -> ugarit -> hattuşa -> ????',
    '[warn]   son röle kendini bildirmedi. devre yine de kuruldu.',
    '[warn]   bu devreyi sen kurmadın.',
    `[notice] ${O.onion()}`,
  ];
  (function logYaz() {
    if (azalt || Sifre.gecti()) {
      gunluk.textContent = GUNLUK.slice(-4).join('\n');
      return;
    }
    let i = 0;
    (function sonraki() {
      if (i >= GUNLUK.length || !gunluk.isConnected) return;
      gunluk.textContent += (i ? '\n' : '') + GUNLUK[i];
      i++;
      setTimeout(sonraki, i < 6 ? 180 + Math.random() * 420 : 720 + Math.random() * 500);
    })();
  })();

  const m = (N - 1) / 2, dis = N * 0.48, ic = N * 0.41;
  const P = (i, r) => {
    const a = -Math.PI / 2 + (i / 31) * Math.PI * 2;
    return [m + Math.cos(a) * r, m + Math.sin(a) * r];
  };
  const k = kalem(c);
  function ciz(p, acik) {
    c.fillStyle = '#000';
    c.fillRect(0, 0, N, N);
    c.fillStyle = '#4a4438';
    k.halka(m, m, dis);
    k.halka(m, m, ic);
    const yanan = Math.floor(p * 31 + 1e-6);
    for (let i = 0; i < 31; i++) {
      c.fillStyle = i < yanan ? CSS_RENK.kor : '#4a4438';
      const a = P(i, ic + 1), b = P(i, dis - 1);
      k.cizgi(a[0], a[1], b[0], b[1]);
    }
    // T sütun: baş, gövde, gövdede beş oyma. 11111.
    const x0 = Math.round(m);
    c.fillStyle = p > 0 ? CSS_RENK.kagit : '#7c7464';
    const ust = x0 - 36, gx = 12, bx = 34, ba = 14, gy = 66;
    k.cizgi(x0 - bx, ust, x0 + bx, ust);
    k.cizgi(x0 + bx, ust, x0 + bx, ust + ba);
    k.cizgi(x0 - bx, ust, x0 - bx, ust + ba);
    k.cizgi(x0 - bx, ust + ba, x0 - gx, ust + ba);
    k.cizgi(x0 + bx, ust + ba, x0 + gx, ust + ba);
    k.cizgi(x0 - gx, ust + ba, x0 - gx, ust + ba + gy);
    k.cizgi(x0 + gx, ust + ba, x0 + gx, ust + ba + gy);
    k.cizgi(x0 - gx, ust + ba + gy, x0 + gx, ust + ba + gy);
    for (let i = 0; i < 5; i++) {
      c.fillStyle = yanan >= 31 ? CSS_RENK.kor : p > (i + 1) / 6 ? CSS_RENK.kagit : '#4a4438';
      const x = x0 - 8 + i * 4;
      k.cizgi(x, ust + ba + 26, x, ust + ba + gy - 5);
    }
    // Göz
    const ex = x0, ey = ust + ba + 10, en = 44, boy = 12;
    const h = Math.max(0.5, boy * acik);
    c.fillStyle = '#000';
    for (let x = -en / 2; x <= en / 2; x++) {
      const y = h * (1 - (2 * x / en) ** 2);
      c.fillRect(ex + x, Math.round(ey - y), 1, Math.round(y * 2) + 1);
    }
    c.fillStyle = acik > 0.5 ? CSS_RENK.kor : CSS_RENK.kagit;
    for (let x = -en / 2; x <= en / 2; x++) {
      const y = h * (1 - (2 * x / en) ** 2);
      k.nokta(ex + x, ey - y);
      k.nokta(ex + x, ey + y);
    }
    if (acik > 0.12) {
      c.fillStyle = CSS_RENK.kor;
      const py = Math.round(h * 0.86);
      c.fillRect(ex - 1, ey - py, 3, py * 2 + 1);
    }
  }

  let p = 0, tutuyor = false, bitti = false, sonZ = performance.now(), acik = 0.04, acildi = false;
  function dongu(z) {
    if (bitti) return;
    requestAnimationFrame(dongu);
    const dt = Math.min(0.1, (z - sonZ) / 1000);
    sonZ = z;
    const once = p;
    p = Math.max(0, Math.min(1, p + (tutuyor ? dt / SURE : -dt / 1.1)));
    Ses.yukselt(p);
    if (Math.floor(p * 31) > Math.floor(once * 31)) Ses.tik(0.5);
    // Beklerken göz hafifçe aralanır; tuttukça açılır.
    const hedef = (acildi ? 0.13 : 0.04) + p * 0.3 + (azalt ? 0 : Math.max(0, Math.sin(z / 900) - 0.86) * 0.5);
    acik += (hedef - acik) * Math.min(1, dt * 6);
    ciz(p, acik);
    tut.textContent = tutuyor ? 'bırakma' : 'basılı tut';
    if (p >= 1) gir(true);
  }

  function gir(sesli) {
    if (bitti) return;
    bitti = true;
    kayit.gelis += 1;
    depo.yaz('gelis', String(kayit.gelis));
    tut.disabled = true;
    sessiz.disabled = true;
    tut.textContent = '';
    if (sesli) {
      Ses.can(174.61, 12, 0.7);
      Ses.derinlik(0);
    }
    // Göz bir kerede açılır. Sonra karanlık, sonra sahne.
    const bas = performance.now();
    (function ac(z) {
      const t = Math.min(1, (z - bas) / 420);
      ciz(sesli ? 1 : p, 0.34 + t * 0.66);
      if (t < 1) requestAnimationFrame(ac);
    })(bas);
    const b = azalt ? 0 : 700;
    setTimeout(() => {
      esik.classList.add('kapaniyor');
      kok.classList.remove('esikte');
      yay('esik', sesli);
    }, b);
    setTimeout(() => esik.remove(), azalt ? 0 : b + 1900);
  }

  function basla() {
    if (bitti) return;
    tutuyor = true;
    Ses.uyan();
  }
  function birak() { tutuyor = false; }
  // Parola doğruysa basılı tutma aşaması açılır. Bu sekmede bir kez söylemek yeter.
  function tutmaya() {
    esik.classList.add('tutma');
    tut.hidden = false;
    sessiz.hidden = false;
    tut.focus({ preventScroll: true });
  }
  function kapiAc(soz) {
    acildi = true;
    form.hidden = true;
    cevap.textContent = '';
    if (soz) metinYaz(soz);
    let gecmis = false;
    try { gecmis = sessionStorage.getItem('kadim.insan') === '1'; } catch (e) { /* gizli sekme */ }
    if (gecmis) tutmaya();
    else insanMi().then(tutmaya);
  }

  // ---------- insan doğrulaması: nereye basarsan bas ----------
  function insanMi() {
    return new Promise((bitir) => {
      const kutu = document.getElementById('captcha'), izgara = document.getElementById('captcha-izgara');
      const durum = document.getElementById('captcha-durum'), dogrula = document.getElementById('esik-dogrula');
      const TIP = ['koridor', 'merdiven', 'kapi', 'oda', 'koridor', 'oda', 'kapi', 'merdiven', 'koridor'];
      const K = 84;
      let tur = 0;
      function kareCiz(t, i) {
        const c = t.getContext('2d');
        const v = c.createImageData(K, K);
        const px = new Uint32Array(v.data.buffer);
        const var1 = tur === 0 ? [1, 5, 6].includes(i) : true;
        const figur = var1 ? { x: K * (0.32 + ((i * 37) % 40) / 100), y: K * (tur === 0 ? 0.74 : 0.98), boy: K * (tur === 0 ? 0.26 : 0.74) } : null;
        O.kameraCiz(px, K, K, O.kameraHarita(TIP[i], K, K), { figur, isik: tur === 0 ? 1 : 0.8 });
        c.putImageData(v, 0, 0);
        // İkinci turda ortadaki kare başka bir yerden geliyor.
        if (tur === 1 && i === 4) {
          O.portreResmi().then((r) => {
            O.atkinson(O.griOrnekle(r, K, K, [0.1, 0.32, 0.9, 0.62]), K, K, (d) => Math.max(0, d - 34), px, O.RENK.kagit, O.RENK.murekkep);
            c.putImageData(v, 0, 0);
          }).catch(() => {});
        }
      }
      function kur() {
        izgara.textContent = '';
        for (let i = 0; i < 9; i++) {
          const b = document.createElement('button');
          b.type = 'button';
          b.className = 'captcha-kare';
          b.setAttribute('aria-pressed', 'false');
          b.setAttribute('aria-label', `Kare ${i + 1}`);
          const t = document.createElement('canvas');
          t.width = K;
          t.height = K;
          b.appendChild(t);
          b.addEventListener('click', () => {
            b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') === 'true' ? 'false' : 'true');
            Ses.tik(0.3);
          });
          izgara.appendChild(b);
          kareCiz(t, i);
        }
      }
      dogrula.addEventListener('click', () => {
        if (tur === 0) {
          tur = 1;
          durum.textContent = 'Yanlış. Birini kaçırdın. Yine bak.';
          Ses.fisilti(1.2);
          kur();
          return;
        }
        dogrula.disabled = true;
        durum.textContent = 'Doğru. Hepsinde. Sen de dahil.';
        try { sessionStorage.setItem('kadim.insan', '1'); } catch (e) { /* gizli sekme */ }
        setTimeout(() => {
          kutu.hidden = true;
          bitir();
        }, azalt ? 300 : 1500);
      });
      kutu.hidden = false;
      kur();
      dogrula.focus({ preventScroll: true });
    });
  }
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const m = parola.value;
    if (!m.trim()) return;
    if (Sifre.dene(m)) {
      parola.value = '';
      kapiAc(['Bunu sana kim verdi?', 'Neyse. Kayda geçti.']);
    } else {
      cevap.textContent = Sifre.yanlisSoz(m);
      parola.value = '';
      parola.focus();
    }
  });
  // Kapıyı elle söken olursa: girer, ama defterde görünür.
  new MutationObserver(() => {
    if (document.getElementById('esik') || bitti) return;
    bitti = true;
    depo.yaz('hirsiz', '1');
    kok.classList.remove('esikte');
    yay('esik', false);
    console.log('%cKapıyı söktün.', 'font:400 26px serif;color:#f23a1d');
    console.log('Parola hâlâ sende yok. Yukarısı açıldı; altı açılmaz. Not edildi.');
    setTimeout(() => window.Varlik.fisilda('kapıyı söktün. not edildi.', { zorla: true, sure: 6200 }), 900);
  }).observe(document.body, { childList: true });

  tut.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    try { tut.setPointerCapture(e.pointerId); } catch (h) { /* eski tarayıcı */ }
    basla();
  });
  tut.addEventListener('pointerup', birak);
  tut.addEventListener('pointercancel', birak);
  tut.addEventListener('lostpointercapture', birak);
  tut.addEventListener('contextmenu', (e) => e.preventDefault());
  tut.addEventListener('keydown', (e) => {
    if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) {
      e.preventDefault();
      basla();
    }
  });
  tut.addEventListener('keyup', (e) => {
    if (e.key === ' ' || e.key === 'Enter') birak();
  });
  tut.addEventListener('blur', birak);
  sessiz.addEventListener('click', () => gir(false));

  ciz(0, acik);
  requestAnimationFrame(dongu);
  if (Sifre.gecti()) kapiAc();
  else parola.focus({ preventScroll: true });
})();
