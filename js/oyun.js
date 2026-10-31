// SELAM VERME: 31 saniye kimseyle konuşma. Karakter modeli v0.1, gövdesi yok.
(function () {
  'use strict';
  const tuval = document.getElementById('oyun-tuval');
  if (!tuval) return;
  const c = tuval.getContext('2d');
  const G = 480, Y = 270, OLCEK = tuval.width / G;
  const { CSS_RENK } = window.Ortak;
  const MUR = CSS_RENK.murekkep, KAG = CSS_RENK.kagit, KOR = CSS_RENK.kor;
  const CIZGI = '#3a362c';
  const SURE = 31;

  const perde = document.getElementById('perde');
  const perdeBaslik = document.getElementById('perde-baslik');
  const perdeMetin = document.getElementById('perde-metin');
  const perdeNot = document.getElementById('perde-not');
  const perdeResim = document.getElementById('perde-resim');
  const basla = document.getElementById('oyun-basla');
  const kulaklikDugme = document.getElementById('oyun-kulaklik');
  const rekorYazi = document.getElementById('oyun-rekor');
  const kasa = document.getElementById('oyun-kasa');

  const kafa = new Image();
  kafa.src = 'assets/suret/kafa.png';

  const CAGLAR = [
    {
      ad: 'MÖ 2600 · SÜMER', bas: 0,
      laf: ['Selam!', 'Tablete bakar mısın?', 'Çivi yazısı bozuldu', 'Zigguratta ağ çekmiyor', 'Buğday hesabım tutmuyor'],
    },
    {
      ad: '842 · BİZANS', bas: 8,
      laf: ['Efendim, selam!', 'Mozaik kaymış', 'Hipodromda maç var', 'Grejuva tarifi kayboldu', 'Bir ikon yapsana'],
    },
    {
      ad: '1683 · OSMANLI', bas: 16,
      laf: ['Evladım, selam yok mu?', 'Kimlerdensin?', 'Düğüne gelmedin', 'Matbaayı kurar mısın?', 'Annen nasıl?'],
    },
    {
      ad: 'BUGÜN · KAMPÜS', bas: 24,
      laf: ['Yazıcımı tamir eder misin?', 'Bir oyun fikrim var', '%50 ortak olalım', 'Format atar mısın?', 'Bana da site yapsana', 'Bilgisayarcı değil misin?', 'Minecraft sunucusu kur', 'GTA 6 ne zaman?'],
    },
  ];
  const KAYIP = [
    'Hâl hatır sordun. Kırk dakika sürdü.',
    'Yazıcısını tamir ettin. «Bir kereye mahsus» demişti.',
    'Oyun fikrini dinledin. Açık dünya, MMO, yüzde elli ortak.',
    'Kimlerden olduğunu anlattın. Annenle konuşacaklar.',
  ];

  // Sprite: # = kâğıt, . = saydam. Her çağın şapkası ayrı.
  const SPRITE = [
    ['....#....', '...###...', '..#####..', '...###...', '...#.#...', '...###...', '..#####..', '.#.###.#.', '.#.###.#.', '..#####..', '..#####..', '.#######.'],
    ['..#####..', '.#######.', '...###...', '...#.#...', '...###...', '..#####..', '.#######.', '.#.###.#.', '...###...', '...###...', '..#####..', '..#####..'],
    ['...###...', '..#####..', '..#####..', '...###...', '...#.#...', '...###...', '..#####..', '.#.###.#.', '.#.###.#.', '...###...', '..##.##..', '..##.##..'],
    ['.........', '...###...', '..#####..', '...#.#...', '...###...', '.#######.', '##.###.#.', '##.###.#.', '##.###...', '...###...', '...#.#...', '..##.##..'],
  ];
  const BACAK = [['...#.#...', '...#..#..'], ['...#.#...', '..#..#...']];

  function zeminCiz(cag) {
    const t = document.createElement('canvas');
    t.width = G;
    t.height = Y;
    const z = t.getContext('2d');
    z.fillStyle = MUR;
    z.fillRect(0, 0, G, Y);
    z.fillStyle = CIZGI;
    let tohum = 31 + cag * 7;
    const r = () => { tohum = (Math.imul(tohum, 1664525) + 1013904223) >>> 0; return tohum / 4294967296; };
    if (cag === 0) {
      // Kum ve çivi yazısı izleri
      for (let i = 0; i < 300; i++) z.fillRect((r() * G) | 0, (r() * Y) | 0, 1, 1);
      for (let i = 0; i < 46; i++) {
        const x = (r() * G) | 0, y = (r() * Y) | 0;
        z.fillRect(x, y, 4, 1); z.fillRect(x + 1, y + 1, 2, 1); z.fillRect(x + 1, y + 2, 1, 2);
      }
    } else if (cag === 1) {
      // Mozaik
      for (let y = 0; y < Y; y += 12) {
        for (let x = (y / 12) % 2 ? 6 : 0; x < G; x += 12) {
          z.fillRect(x, y, 5, 5);
          if ((x + y) % 48 === 0) z.fillRect(x + 6, y + 6, 5, 5);
        }
      }
    } else if (cag === 2) {
      // Çini
      for (let y = 0; y < Y; y += 24) {
        for (let x = 0; x < G; x += 24) {
          z.fillRect(x + 11, y + 2, 2, 20);
          z.fillRect(x + 2, y + 11, 20, 2);
          z.fillRect(x + 8, y + 8, 8, 8);
        }
      }
      z.fillStyle = MUR;
      for (let y = 0; y < Y; y += 24) for (let x = 0; x < G; x += 24) z.fillRect(x + 10, y + 10, 4, 4);
    } else {
      // Kilit parke ve o sarı çizgi (burada kızıl)
      for (let y = 0; y < Y; y += 10) {
        z.fillRect(0, y, G, 1);
        for (let x = (y / 10) % 2 ? 10 : 0; x < G; x += 20) z.fillRect(x, y, 1, 10);
      }
      z.fillStyle = '#5c2517';
      for (let i = 0; i < Y; i += 2) z.fillRect(70 + ((i / 2) % 2), i, 8, 1);
    }
    return t;
  }
  const ZEMIN = CAGLAR.map((_, i) => zeminCiz(i));

  const tus = {};
  let durum = 'perde', sonZaman = 0, t = 0, oyuncu, kisiler, uretim, sarsinti, flas, cagIdx, cagYazi, sonLaf, isaret, tanri = false;
  let rekor = 0;
  try { rekor = parseFloat(localStorage.getItem('kadim.rekor')) || 0; } catch (e) { /* gizli sekme */ }

  function rekorGoster() {
    rekorYazi.textContent = rekor >= SURE ? 'rekor: 31,0 sn · kimseyle konuşmadın' : rekor > 0 ? `rekor: ${rekor.toFixed(1).replace('.', ',')} sn` : 'rekor: yok';
  }
  rekorGoster();

  function kur() {
    oyuncu = { x: G / 2, y: Y / 2, pil: 3, darbe: 0, kulak: 0, bekleme: 0, salin: 0 };
    kisiler = [];
    uretim = 0.6;
    sarsinti = 0;
    flas = 0;
    t = 0;
    cagIdx = -1;
    cagYazi = 0;
    sonLaf = '';
    isaret = null;
  }

  function kisiUret() {
    const k = (Math.random() * 4) | 0, pay = 16;
    const x = k === 0 ? -pay : k === 1 ? G + pay : Math.random() * G;
    const y = k === 2 ? -pay : k === 3 ? Y + pay : Math.random() * Y;
    const laflar = CAGLAR[cagIdx].laf;
    kisiler.push({
      x, y, cag: cagIdx, laf: laflar[(Math.random() * laflar.length) | 0],
      hiz: 30 + t * 1.15 + Math.random() * 10, gidiyor: false, kare: Math.random() * 10, soz: 0,
    });
  }

  function kulaklikTak() {
    if (durum !== 'oyun' || oyuncu.bekleme > 0) return;
    oyuncu.kulak = 1.6;
    oyuncu.bekleme = 5;
  }

  function guncelle(dt) {
    t += dt;
    let yeni = 0;
    for (let i = 0; i < CAGLAR.length; i++) if (t >= CAGLAR[i].bas) yeni = i;
    if (yeni !== cagIdx) {
      cagIdx = yeni;
      cagYazi = 1.5;
    }
    cagYazi = Math.max(0, cagYazi - dt);

    let dx = (tus.ArrowRight || tus.d ? 1 : 0) - (tus.ArrowLeft || tus.a ? 1 : 0);
    let dy = (tus.ArrowDown || tus.s ? 1 : 0) - (tus.ArrowUp || tus.w ? 1 : 0);
    if (isaret) {
      const ax = isaret.x - oyuncu.x, ay = isaret.y - oyuncu.y, u = Math.hypot(ax, ay);
      if (u > 4) { dx = ax / u; dy = ay / u; }
    } else if (dx && dy) {
      dx *= Math.SQRT1_2;
      dy *= Math.SQRT1_2;
    }
    const HIZ = 118;
    oyuncu.x = Math.max(12, Math.min(G - 12, oyuncu.x + dx * HIZ * dt));
    oyuncu.y = Math.max(26, Math.min(Y - 18, oyuncu.y + dy * HIZ * dt));
    if (dx || dy) oyuncu.salin += dt * 14;
    oyuncu.darbe = Math.max(0, oyuncu.darbe - dt);
    oyuncu.kulak = Math.max(0, oyuncu.kulak - dt);
    oyuncu.bekleme = Math.max(0, oyuncu.bekleme - dt);
    sarsinti = Math.max(0, sarsinti - dt);
    flas = Math.max(0, flas - dt);

    uretim -= dt;
    if (uretim <= 0 && kisiler.length < 26) {
      kisiUret();
      uretim = Math.max(0.42, 1.25 - t * 0.03);
    }

    for (const k of kisiler) {
      k.kare += dt * 7;
      const ax = oyuncu.x - k.x, ay = oyuncu.y - k.y, u = Math.hypot(ax, ay) || 1;
      if (k.gidiyor) {
        k.x -= (ax / u) * 92 * dt;
        k.y -= (ay / u) * 92 * dt;
        continue;
      }
      k.x += (ax / u) * k.hiz * dt;
      k.y += (ay / u) * k.hiz * dt;
      k.soz = u < 90 ? 1 : 0;
      if (oyuncu.kulak > 0 && u < 40) {
        k.gidiyor = true;
        k.laf = 'Kaba.';
        continue;
      }
      if (u < 14 && oyuncu.darbe <= 0 && !tanri) {
        oyuncu.pil--;
        oyuncu.darbe = 1.3;
        sarsinti = 0.28;
        flas = 0.12;
        sonLaf = k.laf;
        k.gidiyor = true;
        k.laf = 'Sağ ol abi!';
        if (oyuncu.pil <= 0) { bitir(false); return; }
      }
    }
    kisiler = kisiler.filter((k) => k.x > -40 && k.x < G + 40 && k.y > -40 && k.y < Y + 40);

    if (t >= SURE) bitir(true);
  }

  function bitir(kazandi) {
    durum = 'bitti';
    const dayanilan = Math.min(SURE, t);
    if (dayanilan > rekor) {
      rekor = dayanilan;
      try { localStorage.setItem('kadim.rekor', String(rekor)); } catch (e) { /* gizli sekme */ }
      rekorGoster();
    }
    perdeResim.hidden = false;
    if (kazandi) {
      perdeResim.src = 'assets/suret/goruldu.png';
      perdeBaslik.textContent = 'Gün bitti.';
      perdeMetin.textContent = 'Kimseyle konuşmadın. Ödül yok; zaten kimse vermeye gelmedi. İyi ki de.';
      perdeNot.textContent = `31 saniye · ${['sıfır', 'bir', 'iki'][3 - oyuncu.pil] || 'üç'} sohbet`;
    } else {
      perdeResim.src = 'assets/suret/temas.png';
      perdeBaslik.textContent = 'Konuştun.';
      perdeMetin.textContent = KAYIP[(Math.random() * KAYIP.length) | 0];
      perdeNot.textContent = `${dayanilan.toFixed(1).replace('.', ',')} sn dayandın · son duyduğun: «${sonLaf}»`;
    }
    basla.textContent = 'Bir daha';
    perde.hidden = false;
    basla.focus({ preventScroll: true });
    ciz();
  }

  // ---------- çizim ----------
  function dikdortgen(x, y, g, yy, renk) {
    c.fillStyle = renk;
    c.fillRect(x, y, g, yy);
  }
  function sprite(sira, x, y, renk) {
    c.fillStyle = renk;
    for (let j = 0; j < sira.length; j++) {
      const s = sira[j];
      for (let i = 0; i < s.length; i++) if (s[i] === '#') c.fillRect(x + i * 1.5, y + j * 1.5, 1.5, 1.5);
    }
  }
  function kisiCiz(k) {
    const x = k.x - 7, y = k.y - 12;
    const renk = k.gidiyor ? '#7c7768' : KAG;
    sprite(SPRITE[k.cag], x, y, renk);
    const b = BACAK[Math.floor(k.kare) % 2];
    sprite(b, x, y + 18, renk);
  }
  function balon(x, y, metin, vurgulu) {
    c.font = '11px VT323, monospace';
    const en = Math.ceil(c.measureText(metin).width) + 8;
    const bx = Math.max(2, Math.min(G - en - 2, x - en / 2));
    const by = Math.max(14, y - 21);
    dikdortgen(bx, by, en, 13, vurgulu ? KOR : KAG);
    dikdortgen(Math.max(bx + 2, Math.min(bx + en - 5, x - 1)), by + 13, 3, 2, vurgulu ? KOR : KAG);
    c.fillStyle = MUR;
    c.textAlign = 'left';
    c.textBaseline = 'alphabetic';
    c.fillText(metin, bx + 4, by + 10);
  }
  function oyuncuCiz() {
    const x = oyuncu.x, y = oyuncu.y;
    const salin = Math.sin(oyuncu.salin) * 1.6;
    if (oyuncu.darbe > 0 && Math.floor(oyuncu.darbe * 12) % 2) return;
    // Sopa: gövde sprint sonuna yetişmedi.
    dikdortgen(x - 2 + salin * 0.5, y + 4, 4, 16, KAG);
    dikdortgen(x - 1 + salin * 0.5, y + 4, 2, 16, '#6d685a');
    dikdortgen(x - 5, y + 19, 10, 2, KAG);
    if (kafa.complete && kafa.naturalWidth) {
      c.imageSmoothingEnabled = false;
      c.drawImage(kafa, Math.round(x - 12 + salin), Math.round(y - 22), 24, 32);
      c.imageSmoothingEnabled = true;
    }
    if (oyuncu.kulak > 0) {
      // Kulaklık yayı + koruma halkası
      c.strokeStyle = KOR;
      c.lineWidth = 2;
      c.beginPath();
      c.arc(x + salin, y - 8, 14, Math.PI, 0);
      c.stroke();
      dikdortgen(x + salin - 16, y - 10, 4, 7, KOR);
      dikdortgen(x + salin + 12, y - 10, 4, 7, KOR);
      c.lineWidth = 1;
      c.setLineDash([2, 3]);
      c.beginPath();
      c.arc(x, y, 40, 0, Math.PI * 2);
      c.stroke();
      c.setLineDash([]);
    }
  }
  function ciz() {
    c.setTransform(OLCEK, 0, 0, OLCEK, 0, 0);
    const sar = sarsinti > 0 ? (Math.random() - 0.5) * 6 : 0;
    c.translate(sar, sar * 0.6);
    c.imageSmoothingEnabled = false;
    c.drawImage(ZEMIN[Math.max(0, cagIdx)], 0, 0);

    const sirali = kisiler.slice().sort((a, b) => a.y - b.y);
    for (const k of sirali) kisiCiz(k);
    oyuncuCiz();

    // Sözler: en yakın üç kişi konuşur, yoksa ekran dolar.
    const konusan = kisiler
      .filter((k) => k.soz || k.gidiyor)
      .sort((a, b) => Math.hypot(a.x - oyuncu.x, a.y - oyuncu.y) - Math.hypot(b.x - oyuncu.x, b.y - oyuncu.y))
      .slice(0, 3);
    for (const k of konusan) if (k.x > 0 && k.x < G && k.y > 0 && k.y < Y) balon(k.x, k.y - 11, k.laf, k.gidiyor);

    c.setTransform(OLCEK, 0, 0, OLCEK, 0, 0);
    if (flas > 0) {
      c.globalCompositeOperation = 'difference';
      dikdortgen(0, 0, G, Y, KAG);
      c.globalCompositeOperation = 'source-over';
    }

    // Üst gösterge
    dikdortgen(0, 0, G, 13, MUR);
    c.font = '12px VT323, monospace';
    c.textBaseline = 'alphabetic';
    c.fillStyle = KAG;
    c.textAlign = 'left';
    c.fillText('sosyal pil', 5, 10);
    for (let i = 0; i < 3; i++) dikdortgen(52 + i * 9, 3, 7, 7, i < oyuncu.pil ? KOR : CIZGI);
    c.fillStyle = KAG;
    c.fillText('kulaklık', 92, 10);
    dikdortgen(132, 4, 40, 5, CIZGI);
    const dolu = oyuncu.kulak > 0 ? 1 : 1 - oyuncu.bekleme / 5;
    dikdortgen(132, 4, 40 * dolu, 5, oyuncu.kulak > 0 ? KOR : KAG);
    c.textAlign = 'right';
    c.fillStyle = KOR;
    c.fillText(`${Math.max(0, SURE - t).toFixed(1).replace('.', ',')} sn`, G - 5, 10);
    c.textAlign = 'center';
    c.fillStyle = '#a39d8c';
    c.fillText(cagIdx >= 0 ? CAGLAR[cagIdx].ad : '', G / 2 + 40, 10);

    if (cagYazi > 0 && cagIdx >= 0) {
      c.font = '26px VT323, monospace';
      const ad = CAGLAR[cagIdx].ad;
      const en = c.measureText(ad).width + 22;
      dikdortgen(G / 2 - en / 2, Y / 2 - 22, en, 30, MUR);
      c.fillStyle = KOR;
      c.textAlign = 'center';
      c.fillText(ad, G / 2, Y / 2);
    }
    if (tanri) {
      c.font = '12px VT323, monospace';
      c.fillStyle = KOR;
      c.textAlign = 'left';
      c.fillText('tanrı modu · kayda geçti', 5, Y - 5);
    }
  }

  function dongu(n) {
    if (durum !== 'oyun') return;
    requestAnimationFrame(dongu);
    const dt = Math.min(0.05, (n - sonZaman) / 1000);
    sonZaman = n;
    if (!gorunur || document.hidden) return;
    guncelle(dt);
    if (durum === 'oyun') ciz();
  }

  async function baslat() {
    try {
      await Promise.all([document.fonts.load('12px VT323'), document.fonts.load('26px VT323')]);
    } catch (e) { /* sistem yazısıyla devam */ }
    kur();
    perde.hidden = true;
    durum = 'oyun';
    tuval.focus({ preventScroll: true });
    sonZaman = performance.now();
    requestAnimationFrame(dongu);
  }

  let gorunur = true;
  new IntersectionObserver((g) => { gorunur = g[0].isIntersecting; }, { threshold: 0.2 }).observe(kasa);

  // ---------- girdi ----------
  basla.addEventListener('click', baslat);
  kulaklikDugme.addEventListener('click', kulaklikTak);
  const OYUN_TUSU = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ']);
  addEventListener('keydown', (e) => {
    if (durum !== 'oyun' || !gorunur) return;
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (OYUN_TUSU.has(e.key)) e.preventDefault();
    if (e.key === ' ' && !e.repeat) kulaklikTak();
    tus[k] = true;
  });
  addEventListener('keyup', (e) => {
    tus[e.key.length === 1 ? e.key.toLowerCase() : e.key] = false;
  });
  addEventListener('blur', () => { for (const k of Object.keys(tus)) tus[k] = false; });
  function isaretKonum(e) {
    const r = tuval.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * G, y: ((e.clientY - r.top) / r.height) * Y };
  }
  tuval.addEventListener('pointerdown', (e) => {
    if (durum !== 'oyun') return;
    isaret = isaretKonum(e);
    tuval.setPointerCapture(e.pointerId);
  });
  tuval.addEventListener('pointermove', (e) => { if (isaret) isaret = isaretKonum(e); });
  const birak = () => { isaret = null; };
  tuval.addEventListener('pointerup', birak);
  tuval.addEventListener('pointercancel', birak);

  // Konsolu açanlara
  window.kadim = {
    tanriModu() {
      tanri = !tanri;
      return tanri ? 'Tanrı modu açık. Kayda geçti.' : 'Kapandı. Yine kayda geçti.';
    },
  };

  // Perdenin arkası boş kalmasın
  kur();
  cagIdx = 0;
  ciz();
})();
