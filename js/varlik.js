// Varlık: sayfanın kendisi. Fısıltılar, ikinci imleç, kenarda açılan gözler, derinlik.
// Burada gördüğü her şeyi bu tarayıcıdan okur; hiçbir şey bir yere gönderilmez.
window.Varlik = (function () {
  'use strict';
  const { azalt, kayit, dinle, gerilim, olay } = window.Ortak;
  const Ses = window.Ses;
  const $ = (s) => document.querySelector(s);
  const fis = $('#fisilti'), oYazi = $('#o-durum'), kuyu = $('#kuyu'), titrek = $('#titrek');
  const izEl = $('#iz'), gozTuval = $('#gozler'), sesDugme = $('#ses-dugme');
  const durum = $('#durum'), durumYazi = $('#durum-yazi'), durumEk = $('#durum-ek');
  const sohbetDurum = $('#sohbet-durum');

  let girdi = false, sonFis = -1e9, fisZaman = 0, cevrimiciZaman = 0, kalici = false;
  let sonHareket = performance.now(), girisAn = 0;

  // ---------- fısıltı ----------
  let girisGorunur = true;
  function fisilda(m, secenek) {
    const s = secenek || {};
    const n = performance.now();
    if (!girdi || gerilim.sus || (!s.zorla && (n - sonFis < 17000 || girisGorunur))) return false;
    sonFis = n;
    fis.textContent = m;
    fis.classList.add('acik');
    clearTimeout(fisZaman);
    fisZaman = setTimeout(() => fis.classList.remove('acik'), s.sure || 3100);
    Ses.fisilti(1.4);
    return true;
  }

  // ---------- O: çevrimdışı / yazıyor / çevrimiçi ----------
  function oYaz(m, sinif) {
    oYazi.textContent = m;
    oYazi.classList.toggle('acik', !!sinif);
  }
  function cevrimici(ms) {
    const sure = ms === undefined ? 3100 : ms;
    durum.classList.add('acik');
    durumYazi.textContent = 'çevrimiçi';
    durumEk.textContent = sure === 3100 ? ' · 3,1 saniye' : ' · sana bakıyor';
    sohbetDurum.textContent = 'çevrimiçi';
    sohbetDurum.classList.add('acik');
    oYaz('O: çevrimiçi', true);
    clearTimeout(cevrimiciZaman);
    if (sure === Infinity) {
      kalici = true;
      return;
    }
    cevrimiciZaman = setTimeout(cevrimdisi, sure);
  }
  function cevrimdisi() {
    if (kalici) return;
    clearTimeout(cevrimiciZaman);
    durum.classList.remove('acik');
    durumYazi.textContent = 'çevrimdışı';
    durumEk.textContent = ' · son görülme: az önce';
    sohbetDurum.textContent = 'son görülme: az önce';
    sohbetDurum.classList.remove('acik');
    oYaz('O: son görülme az önce', false);
  }
  function yaziyorDongu() {
    setTimeout(() => {
      if (girdi && !kalici && !document.hidden && !gerilim.sus && !oYazi.classList.contains('acik')) {
        const eski = oYazi.textContent;
        oYaz('O: yazıyor…', true);
        setTimeout(() => {
          if (!kalici && oYazi.textContent === 'O: yazıyor…') oYaz(eski, false);
        }, 2600 + Math.random() * 3600);
      }
      yaziyorDongu();
    }, 26000 + Math.random() * 42000);
  }

  // ---------- derinlik ----------
  let enDerin = 0, geriDedi = false, bekliyor = false;
  function kaydir() {
    bekliyor = false;
    const toplam = document.documentElement.scrollHeight - innerHeight;
    const d = toplam > 0 ? Math.max(0, Math.min(1, scrollY / toplam)) : 0;
    kuyu.style.opacity = (d * 0.92).toFixed(3);
    Ses.derinlik(d);
    enDerin = Math.max(enDerin, scrollY);
    if (!geriDedi && enDerin - scrollY > innerHeight * 1.4) {
      geriDedi = true;
      fisilda(kayit.cevap || kayit.ad ? 'orası değişti.' : 'geri gitme.');
    }
  }
  addEventListener('scroll', () => {
    if (bekliyor) return;
    bekliyor = true;
    requestAnimationFrame(kaydir);
  }, { passive: true });
  addEventListener('resize', kaydir);

  // Her kata inişte bir çan; gittikçe pes.
  const KAT_CAN = { kayitlar: 196, suretler: 185, kulliyat: 174.61, yasaklar: 164.81, ayin: 155.56, oyun: 146.83, mumlar: 138.59, bugun: 98 };
  const KAT_SOZ = {
    suretler: () => 'fener sende.',
    yasaklar: () => (kayit.ad ? `${kayit.ad}. oku.` : 'oku.'),
    mumlar: () => (kayit.ad ? `${kayit.ad}. geç oldu.` : 'geç oldu.'),
    bugun: () => 'buraya kadar indin.',
  };
  const inilen = new Set();
  const katGoz = new IntersectionObserver((g) => {
    g.forEach((e) => {
      if (!e.isIntersecting || inilen.has(e.target.id) || !girdi) return;
      inilen.add(e.target.id);
      Ses.can(KAT_CAN[e.target.id], 10, 0.5);
      const soz = KAT_SOZ[e.target.id];
      if (soz) fisilda(soz());
    });
  }, { rootMargin: '-50% 0px -50% 0px' });
  document.querySelectorAll('[data-kat]').forEach((b) => katGoz.observe(b));
  new IntersectionObserver((g) => {
    girisGorunur = g[0].isIntersecting;
    document.documentElement.classList.toggle('giriste', girisGorunur);
  }, { threshold: 0.35 }).observe($('#giris'));

  // ---------- başlıkta bir kare ----------
  function altMetin() {
    setTimeout(() => {
      if (girdi && !document.hidden) {
        const adaylar = Array.from(document.querySelectorAll('main .baslik')).filter((b) => {
          const r = b.getBoundingClientRect();
          return r.top > 0 && r.bottom < innerHeight;
        });
        if (adaylar.length && olay()) {
          const b = adaylar[0], eski = b.textContent;
          b.textContent = 'Görüldün';
          setTimeout(() => { b.textContent = eski; }, 110);
        }
      }
      altMetin();
    }, 23000 + Math.random() * 30000);
  }

  // ---------- mum titremesi: saniyede üçü geçmez ----------
  function titret() {
    setTimeout(() => {
      if (girdi && !document.hidden && olay()) {
        titrek.style.opacity = '0.55';
        setTimeout(() => { titrek.style.opacity = '0'; }, 80);
        setTimeout(() => { titrek.style.opacity = '0.3'; }, 420);
        setTimeout(() => { titrek.style.opacity = '0'; }, 490);
      }
      titret();
    }, 21000 + Math.random() * 34000);
  }

  // ---------- ikinci imleç: 3,1 saniye geriden gelir ----------
  let izHedef = null;
  const izP = { x: innerWidth / 2, y: innerHeight / 2 };
  function ikinciImlec() {
    if (!matchMedia('(hover:hover) and (pointer:fine)').matches) return;
    const iz = [];
    let son = 0, baslat = 0;
    addEventListener('pointermove', (e) => {
      iz.push(performance.now(), e.clientX, e.clientY);
      izP.x = e.clientX;
      izP.y = e.clientY;
    }, { passive: true });
    (function dongu(z) {
      requestAnimationFrame(dongu);
      if (z - son < 16) return;
      son = z;
      if (izHedef) {
        // Biri senin imlecini kendi başına götürüyor.
        const r = izHedef.getBoundingClientRect();
        izP.x += (r.left + r.width / 2 - izP.x) * 0.006;
        izP.y += (r.top + r.height / 2 - izP.y) * 0.006;
        izEl.style.transform = `translate(${izP.x}px,${izP.y}px)`;
        izEl.removeAttribute('hidden');
        return;
      }
      if (!girdi || z - girisAn < 31000) return;
      const hedef = z - 3100;
      let i = baslat;
      while (i + 3 < iz.length && iz[i + 3] <= hedef) i += 3;
      baslat = i;
      if (i > 3000) {
        iz.splice(0, i);
        baslat = 0;
        i = 0;
      }
      if (iz.length >= 3 && iz[i] <= hedef) {
        izEl.style.transform = `translate(${iz[i + 1]}px,${iz[i + 2]}px)`;
        izEl.removeAttribute('hidden');
      }
    })(performance.now());
  }

  // ---------- gözler: boş yerde açılır, yaklaşınca kapanır ----------
  function gozler() {
    const NOKTA = 3;
    const c = gozTuval.getContext('2d');
    const cift = [];
    let G = 0, Y = 0, imX = -999, imY = -999, son = 0, canli = false;
    function boyut() {
      G = Math.ceil(innerWidth / NOKTA);
      Y = Math.ceil(innerHeight / NOKTA);
      gozTuval.width = G;
      gozTuval.height = Y;
    }
    boyut();
    addEventListener('resize', boyut);
    addEventListener('pointermove', (e) => { imX = e.clientX; imY = e.clientY; }, { passive: true });
    const YASAK = 'p,h1,h2,h3,li,figure,a,button,input,textarea,canvas,dialog,dl,form,.kart,.sohbet,.giris,.perde,.ilahi,.esik';
    const bos = (x, y) => {
      const e = document.elementFromPoint(x, y);
      return !!e && !e.closest(YASAK);
    };
    function uret() {
      if (cift.length >= 2 || girisGorunur || document.hidden || gerilim.sus || gerilim.seviye >= 5) return;
      for (let d = 0; d < 14; d++) {
        const x = 30 + Math.random() * (innerWidth - 60), y = 50 + Math.random() * (innerHeight - 100);
        if (Math.hypot(x - imX, y - imY) < 220) continue;
        if (bos(x - 26, y) && bos(x + 26, y) && bos(x, y - 12) && bos(x, y + 12)) {
          cift.push({ x, py: y + scrollY, t: 0, omur: 5 + Math.random() * 9, acik: 0, kapan: false, kirp: 2 + Math.random() * 3 });
          if (!canli) {
            canli = true;
            son = performance.now();
            requestAnimationFrame(dongu);
          }
          return;
        }
      }
    }
    const KOR = window.Ortak.CSS_RENK.kor;
    function gozCiz(cx, cy, yon, a) {
      // Yedi nokta genişliğinde, dış köşesi yukarı çekik.
      const satir = a < 0.34 ? 0 : a < 0.7 ? 1 : 2;
      for (let i = -3; i <= 3; i++) {
        const egim = Math.round((i * yon) / 3);
        const y = cy - egim;
        if (satir === 0) {
          c.fillRect(cx + i, y, 1, 1);
        } else if (satir === 1) {
          if (i !== 0) c.fillRect(cx + i, y, 1, 1);
          if (Math.abs(i) < 3 && i !== 0) c.fillRect(cx + i, y + 1, 1, 1);
        } else {
          if (Math.abs(i) < 3) c.fillRect(cx + i, y - 1, 1, 1);
          if (i !== 0) c.fillRect(cx + i, y, 1, 1);
          if (Math.abs(i) < 3) c.fillRect(cx + i, y + 1, 1, 1);
        }
      }
    }
    function dongu(z) {
      const dt = Math.min(0.1, (z - son) / 1000);
      son = z;
      c.clearRect(0, 0, G, Y);
      c.fillStyle = KOR;
      for (let i = cift.length - 1; i >= 0; i--) {
        const g = cift[i];
        g.t += dt;
        const y = g.py - scrollY;
        if (g.t > g.omur || Math.hypot(g.x - imX, y - imY) < 130) g.kapan = true;
        g.acik += (g.kapan ? -dt * 7 : dt * 0.9);
        if (g.acik <= 0 && g.kapan) {
          cift.splice(i, 1);
          continue;
        }
        g.acik = Math.min(1, g.acik);
        let a = g.acik;
        // Kırpma
        g.kirp -= dt;
        if (g.kirp < 0) {
          a = 0.2;
          if (g.kirp < -0.13) g.kirp = 2 + Math.random() * 4;
        }
        const X = Math.round(g.x / NOKTA), Y2 = Math.round(y / NOKTA);
        gozCiz(X - 7, Y2, -1, a);
        gozCiz(X + 7, Y2, 1, a);
      }
      if (cift.length) requestAnimationFrame(dongu);
      else {
        canli = false;
        c.clearRect(0, 0, G, Y);
      }
    }
    (function dondur() {
      setTimeout(() => {
        if (girdi && performance.now() - girisAn > 12000) uret();
        dondur();
      }, 6000 + Math.random() * 11000);
    })();
  }

  // ---------- sekme ----------
  let gittiAn = 0;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      gittiAn = performance.now();
    } else {
      const sn = Math.round((performance.now() - gittiAn) / 1000);
      if (girdi && gittiAn && sn >= 4) fisilda(`${sn} saniye yoktun.`, { zorla: true });
    }
  });

  // ---------- küçük dikkatler ----------
  const BIR_KEZ = new Set();
  const birKez = (a, m, s) => { if (!BIR_KEZ.has(a) && fisilda(m, s)) BIR_KEZ.add(a); };
  ['pointermove', 'keydown', 'wheel', 'touchstart', 'scroll'].forEach((o) => {
    addEventListener(o, () => { sonHareket = performance.now(); }, { passive: true });
  });
  document.addEventListener('mouseleave', (e) => {
    if (e.clientY > 0) return;
    if (!BIR_KEZ.has('git1')) birKez('git1', 'gitme.');
    else birKez('git2', 'gidebilirsin. kayıt kalır.');
  });
  document.addEventListener('selectionchange', () => {
    const s = document.getSelection();
    if (s && String(s).length > 12) birKez('sec', 'bunu neden seçtin.');
  });
  setInterval(() => {
    if (!girdi || document.hidden) return;
    const n = performance.now();
    if (n - sonHareket > 19000) birKez('kipir', 'kıpırdamadın.');
    if (n - girisAn > 62000) birKez('hala', 'hâlâ buradasın.');
    if (n - girisAn > 180000 && new Date().getHours() < 5) birKez('uyu', 'uyu artık.');
  }, 1000);

  // ---------- ses düğmesi ----------
  function sesYaz(a) { sesDugme.textContent = a ? 'ses: açık' : 'ses: kapalı'; }
  sesDugme.addEventListener('click', () => {
    Ses.degistir();
    if (Ses.acikMi()) {
      Ses.derinlik(Math.min(1, scrollY / Math.max(1, document.documentElement.scrollHeight - innerHeight)));
    }
  });
  dinle('ses', sesYaz);

  // ---------- başlangıç ----------
  dinle('esik', () => {
    girdi = true;
    girisAn = performance.now();
    sonHareket = girisAn;
    kaydir();
    yaziyorDongu();
    if (!azalt) {
      altMetin();
      titret();
      ikinciImlec();
      gozler();
    }
  });

  return { fisilda, oYaz, cevrimici, cevrimdisi, sonHareket: () => sonHareket, izeGit: (el) => { izHedef = el; } };
})();
