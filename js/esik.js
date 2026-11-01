// Eşik: 3,1 saniye basılı tutulur. Otuz bir diş, saniyenin onda biri başına bir diş.
(function () {
  'use strict';
  const { azalt, kayit, depo, yay, kalem, CSS_RENK } = window.Ortak;
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
  function kapiAc(soz) {
    acildi = true;
    form.hidden = true;
    cevap.textContent = '';
    if (soz) metinYaz(soz);
    tut.hidden = false;
    sessiz.hidden = false;
    tut.focus({ preventScroll: true });
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
