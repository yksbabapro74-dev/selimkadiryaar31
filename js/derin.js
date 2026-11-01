// Gizli servis kabuğu: devre, yayın, oda, oturum günlüğü, dizin, kanarya.
// Buradaki «izleme» bu sayfada üretilir. Hiçbir şey bu tarayıcıdan çıkmaz.
(function () {
  'use strict';
  const O = window.Ortak, Ses = window.Ses, V = window.Varlik;
  const { azalt, kayit, depo, dinle, yay } = O;
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));
  const iki = (n) => String(n).padStart(2, '0');
  const kok = document.documentElement;
  const dosyaModu = location.protocol === 'file:';
  const kodBag = (k) => (dosyaModu ? `404.html?k=${encodeURIComponent(k)}` : encodeURIComponent(k));

  // Son kapıdan geçen için burası artık yok.
  if (depo.al('bitti')) {
    document.body.appendChild(O.oluSayfa({ son: true }).e);
    document.title = 'Problem loading page';
    return;
  }

  const ONION = O.onion(), BEN = O.misafir(), MAKINE = O.kimlik();
  let girdi = false, girisAn = 0;
  $('#adres').textContent = `http://${ONION}/`;
  $('#adres-alt').textContent = ONION;
  $('#oda-ad').textContent = `${BEN}>`;

  // ---------- oturum günlüğü: yaptığın her şey, yalnızca burada ----------
  const AY = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dilim = (() => {
    const d = -new Date().getTimezoneOffset();
    return `${d < 0 ? '-' : '+'}${iki(Math.floor(Math.abs(d) / 60))}${iki(Math.abs(d) % 60)}`;
  })();
  const zaman = (d) => `${iki(d.getDate())}/${AY[d.getMonth()]}/${d.getFullYear()}:${iki(d.getHours())}:${iki(d.getMinutes())}:${iki(d.getSeconds())} ${dilim}`;
  const saatim = (d) => `${iki(d.getHours())}:${iki(d.getMinutes())}:${iki(d.getSeconds())}`;
  const altLog = $('#alt-log'), altOda = $('#alt-oda');
  const logSatir = [];
  let logBayt = 0, acikDosya = null;
  let onceki = [];
  try { onceki = JSON.parse(depo.al('log') || '[]'); } catch (e) { onceki = []; }
  function logla(kisa, tam) {
    const d = new Date();
    altLog.textContent = `${saatim(d)} ${BEN} ${kisa}`;
    const s = `[${zaman(d)}] ${BEN} ${tam || kisa}`;
    logSatir.push(s);
    logBayt += s.length + 1;
    if (logSatir.length > 400) logSatir.shift();
    if (acikDosya === 'sen.log') senLogGoster();
    dizinSenLog(d);
  }
  const logKaydet = () => {
    try { depo.yaz('log', JSON.stringify(logSatir.slice(-120))); } catch (e) { /* dolu */ }
  };
  addEventListener('pagehide', logKaydet);

  // ---------- oda ----------
  const akis = $('#oda-akis'), odaSayi = $('#oda-sayi'), odaGirdi = $('#oda-girdi'), yayinSayi = $('#yayin-sayi'), bagliSayi = $('#bagli-sayi');
  let uye = 27, izleyici = 30, odaDurum = 'normal', adim = BEN;
  function sayilar() {
    odaSayi.textContent = `${uye} kişi`;
    yayinSayi.textContent = `izleyici: ${izleyici.toLocaleString('tr-TR')} · izlenen: 1`;
    bagliSayi.textContent = `bağlı: ${(izleyici + 1).toLocaleString('tr-TR')}`;
  }
  function akisaEkle(li) {
    const altta = akis.scrollHeight - akis.scrollTop - akis.clientHeight < 42;
    akis.appendChild(li);
    while (akis.children.length > 220) akis.firstChild.remove();
    if (altta) akis.scrollTop = akis.scrollHeight;
  }
  function odaSatir(kim, m, sinif) {
    const li = document.createElement('li');
    if (sinif) li.className = sinif;
    const k = document.createElement('span');
    k.className = 'kim';
    k.textContent = `<${kim}> `;
    li.append(k, document.createTextNode(m));
    akisaEkle(li);
    altOda.classList.toggle('kor', sinif === 'o');
    altOda.textContent = `#kat31 <${kim}> ${m}`;
    if (sinif !== 'sen') Ses.tik(0.1);
    return li;
  }
  function sistem(m, kor) {
    const li = document.createElement('li');
    li.className = kor ? 'sistem yasak' : 'sistem';
    li.textContent = `* ${m}`;
    akisaEkle(li);
    altOda.classList.toggle('kor', !!kor);
    altOda.textContent = `#kat31 * ${m}`;
    return li;
  }
  // Senaryo kuyruğu: [bekleme ms, kim ya da işlev, söz, sınıf]
  const kuyruk = [];
  let kuyrukVar = false;
  function isle() {
    if (kuyrukVar) return;
    const s = kuyruk.shift();
    if (!s) return;
    kuyrukVar = true;
    setTimeout(() => {
      kuyrukVar = false;
      if (typeof s[1] === 'function') s[1]();
      else if (s[1] === '*') sistem(s[2], s[3]);
      else odaSatir(s[1], s[2], s[3]);
      isle();
    }, azalt ? Math.min(s[0], 500) : s[0]);
  }
  function soyle(liste) {
    kuyruk.push(...liste);
    isle();
  }
  const sonTepki = {};
  function tepki(ad, bekleme, liste) {
    if (!girdi || odaDurum !== 'normal') return;
    const n = performance.now();
    if (sonTepki[ad] && n - sonTepki[ad] < bekleme) return;
    sonTepki[ad] = n;
    soyle(liste);
  }
  const karisik = (a) => {
    const b = a.slice();
    for (let i = b.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [b[i], b[j]] = [b[j], b[i]];
    }
    return b;
  };
  const HAVUZ = karisik([
    ['theodoros', 'kapıyı kim kırdı'],
    ['puzur', 'selam verdim. son tabletim oydu'],
    ['hafiz_salih', 'tık tık'],
    ['anon_09c', 'kimse cevap yazmasın'],
    ['anon_4f2', 'yazıyor göründü mü'],
    ['anon_b17', 'kamera 1 hâlâ aynı'],
    ['portland81', 'kabin yok dediler. vardı'],
    ['puzur', 'kaç kişi kaldık'],
    ['anon_b17', 'sayıyorum. her seferinde bir eksik çıkıyor'],
    ['theodoros', 'duvarda adımız var'],
    ['anon_4f2', 'ben bu odaya ne zaman girdim'],
    ['hafiz_salih', 'kendi evimden de geliyor artık'],
    ['anon_09c', 'arkaya bakmayın'],
    ['portland81', 'kâbus görmüyorum. unutuyorum'],
    ['anon_4f2', 'bugün tarih kaç'],
    ['puzur', 'MÖ 2600'],
    ['anon_b17', 'az önce odada biri daha vardı'],
    ['theodoros', 'hâlâ var'],
    ['ammurapi_ulak', 'yedi mektup götürdüm. sekizinciyi kim götürecek'],
    ['anon_09c', 'yeni gelene söylemeyin'],
    ['hafiz_salih', 'komşular da duyuyor'],
    ['anon_4f2', 'odadaki sayı ile yazan sayı tutmuyor'],
  ]);
  function kendiliginden() {
    setTimeout(() => {
      if (girdi && !document.hidden && !kuyruk.length && !kuyrukVar && odaDurum === 'normal' && HAVUZ.length) {
        const s = HAVUZ.shift();
        odaSatir(s[0], s[1]);
      }
      kendiliginden();
    }, 8000 + Math.random() * 15000);
  }
  function geceSozu() {
    const s = MAKINE.tarih.getHours();
    if (s < 5) return 'bu saatte uyanıksa biliyordur';
    if (s < 8) return 'sabahı beklemiş';
    if (s >= 22) return 'gece geliyor. geç kalmamış';
    return 'gündüz gelen de görülür';
  }
  function odaBasla() {
    sistem(`${BEN} odaya bağlandı.`);
    const s = iki(MAKINE.tarih.getHours()) + '.' + iki(MAKINE.tarih.getMinutes());
    if (depo.al('odayazdi')) {
      uye = 4;
      izleyici = 3;
      sayilar();
      soyle([
        [1900, 'anon_09c', 'bu yazmıştı'],
        [2300, 'puzur', 'nasıl geri geldi'],
        [2900, 'anon_09c', 'kimse konuşmasın'],
        [6200, 'puzur', `${MAKINE.osDan} yine`],
      ]);
    } else {
      soyle([
        [1600, 'anon_4f2', 'yeni biri'],
        [1900, 'theodoros', 'selam verme'],
        [1500, 'anon_09c', 'kimse cevap yazmasın'],
        [2500, 'anon_4f2', `${MAKINE.osDan} gelmiş`],
        [3000, 'puzur', 'orada saat kaç'],
        [1800, 'anon_4f2', s],
        [2300, 'hafiz_salih', geceSozu()],
        [3200, 'anon_b17', 'kamera 1 açık. oturuyor'],
        [2000, 'theodoros', 'döndü mü'],
        [1300, 'anon_b17', 'dönmedi'],
        [2600, 'anon_4f2', `yeni gelenin ekranı ${MAKINE.ekran}`],
        [2100, 'puzur', 'arkası kaç metre'],
      ]);
    }
    if (navigator.getBattery) {
      navigator.getBattery().then((b) => {
        if (!b.charging) tepki('pil', 1e9, [[34000, 'anon_b17', `şarjı %${Math.round(b.level * 100)}`], [1800, 'theodoros', 'yetmez']]);
      }).catch(() => {});
    }
    // Sızıntılar: biri söyler, silinir, atılır.
    setTimeout(() => {
      if (odaDurum !== 'normal') return;
      const li = odaSatir('anon_4f2', 'burada anlatılmaz. /tahta\'ya geçin');
      setTimeout(() => {
        li.textContent = '(bu mesaj silindi)';
        li.className = 'silindi';
        sistem('anon_4f2 odadan atıldı. sebep: konuştu.');
        uye = Math.max(1, uye - 1);
        sayilar();
      }, azalt ? 2600 : 6200);
    }, 76000);
    setTimeout(() => {
      if (odaDurum !== 'normal') return;
      const li = odaSatir('portland81', 'on altı kamera var. 16\'ya bakmayın. /kamera');
      setTimeout(() => {
        li.textContent = '(bu mesaj silindi)';
        li.className = 'silindi';
        sistem('portland81 odadan atıldı. sebep: konuştu.');
        uye = Math.max(1, uye - 1);
        sayilar();
      }, azalt ? 2600 : 6200);
    }, 151000);
    kendiliginden();
    setInterval(() => {
      if (odaDurum === 'normal' && !document.hidden && Math.random() < 0.4) {
        izleyici++;
        uye++;
        sayilar();
      }
    }, 17000);
  }

  // Yazarsan.
  let sonMesajLi = null, yazilan = 0;
  function mesajiSakla(m) {
    try {
      const l = JSON.parse(depo.al('mesajlar') || '[]');
      l.push(m);
      depo.yaz('mesajlar', JSON.stringify(l.slice(-31)));
    } catch (e) { /* gizli sekme */ }
  }
  function gorulduNotu() {
    const li = document.createElement('li');
    li.className = 'gorulme-not';
    li.textContent = 'görüldü';
    akisaEkle(li);
    altOda.classList.remove('kor');
    altOda.textContent = 'görüldü';
  }
  function kanaryaOlsun() {
    const k = $('#kanarya');
    k.classList.add('oldu');
    k.textContent = `-----BEGIN PGP SIGNED MESSAGE-----\nHash: SHA256\n\nKANARYA\n\nBu metin artık imzalanmıyor.\n\n-----BEGIN PGP SIGNATURE-----\n\ngpg: İMZA GEÇERSİZ\ngpg: imzalayan: ${BEN}\n-----END PGP SIGNATURE-----`;
  }
  function hepsiGider() {
    const ayril = (ad, b) => [b, () => { sistem(`${ad} ayrıldı.`); uye = Math.max(1, uye - 1); izleyici = Math.max(0, izleyici - 1); sayilar(); Ses.tik(0.2); }];
    soyle([
      [3100, 'anon_09c', 'neden'],
      [1100, 'theodoros', 'yazma demiştik'],
      [800, 'puzur', 'YAZMA'],
      [1400, 'anon_b17', 'kamera'],
      [500, () => sinyalKaybi(1400, () => yay('yayin-figur', 'yok'))],
      [2100, 'anon_b17', 'koltuk boş'],
      ayril('theodoros', 800),
      ayril('hafiz_salih', 460),
      ayril('puzur', 380),
      ayril('portland81', 300),
      ayril('ammurapi_ulak', 260),
      [220, 'anon_4f2', 'ben de'],
      ayril('anon_4f2', 200),
      ayril('anon_b17', 200),
      [180, () => { sistem(`${uye - 2} kişi daha ayrıldı.`); uye = 2; izleyici = 0; sayilar(); }],
      [1900, 'anon_09c', 'özür dilerim'],
      ayril('anon_09c', 500),
      [5200, '*', 'selimkadiryaar31 odaya bağlandı.', true],
      [100, () => {
        odaDurum = 'o';
        uye = 2;
        sayilar();
        V.cevrimici(31000);
        Ses.fisilti(2.4);
        odaGirdi.placeholder = 'yaz. okuyor.';
        kanaryaOlsun();
        logla('odaya yazdı. kayda geçti.', 'KURAL_3 ihlal');
      }],
      [2600, gorulduNotu],
      [31000, () => {
        const li = sistem('selimkadiryaar31 yazıyor…', true);
        Ses.kalp(58);
        setTimeout(() => {
          li.remove();
          Ses.kalp(0);
          sistem('selimkadiryaar31 odadan ayrıldı.');
          uye = 1;
          sayilar();
          altOda.classList.remove('kor');
          altOda.textContent = '#kat31 odada yalnızsın.';
        }, azalt ? 2000 : 6200);
      }],
    ]);
  }
  function yazdi(m) {
    sonMesajLi = odaSatir(adim, m, 'sen');
    yazilan++;
    mesajiSakla(m);
    logla(`odaya yazdı: «${m.slice(0, 31)}»`, `ODA_MESAJ "${m.slice(0, 80)}"`);
    if (odaDurum === 'normal') {
      odaDurum = 'yazdi';
      depo.yaz('odayazdi', '1');
      kuyruk.length = 0;
      hepsiGider();
    } else if (odaDurum === 'o') {
      setTimeout(gorulduNotu, azalt ? 400 : 1400 + Math.random() * 1700);
    }
  }
  $('#oda-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const m = odaGirdi.value.trim();
    if (!m) return;
    odaGirdi.value = '';
    yazdi(m);
  });
  let yazmaBasladi = false;
  odaGirdi.addEventListener('input', () => {
    if (!odaGirdi.value.trim()) {
      if (yazmaBasladi) {
        yazmaBasladi = false;
        logla('yazdığını sildi', 'ODA_SILDI');
        tepki('sildi', 45000, [[1100, 'anon_4f2', 'sildi'], [1300, 'anon_09c', 'okundu yine de']]);
      }
      return;
    }
    if (!yazmaBasladi) {
      yazmaBasladi = true;
      logla('odaya yazmaya başladı', 'ODA_YAZIYOR');
      tepki('yaziyor', 30000, [[350, 'anon_09c', 'yazıyor'], [500, 'theodoros', 'yazma'], [450, 'puzur', 'YAZMA'], [1500, 'hafiz_salih', 'sil onu']]);
    }
  });

  // ---------- yayın ----------
  const parazit = $('#parazit'), yayinYazi = $('#yayin-yazi'), yayinSaat = $('#yayin-saat');
  const pc = parazit.getContext('2d');
  const pv = pc.createImageData(parazit.width, parazit.height);
  const pp = new Uint32Array(pv.data.buffer);
  function kar() {
    for (let i = 0; i < pp.length; i++) pp[i] = Math.random() < 0.5 ? 0xff000000 : 0xff6a6a6a;
    pc.putImageData(pv, 0, 0);
  }
  let karZaman = 0;
  function sinyalKaybi(ms, sonra) {
    parazit.hidden = false;
    yayinYazi.textContent = 'SİNYAL YOK';
    yayinYazi.hidden = false;
    kar();
    Ses.parazit(ms / 1000, 0.1);
    clearInterval(karZaman);
    if (!azalt) karZaman = setInterval(kar, 90);
    setTimeout(() => {
      clearInterval(karZaman);
      parazit.hidden = true;
      yayinYazi.hidden = true;
      if (sonra) sonra();
    }, ms);
  }
  function saatYaz() {
    const d = new Date();
    yayinSaat.textContent = `${d.getFullYear()}-${iki(d.getMonth() + 1)}-${iki(d.getDate())} ${saatim(d)}`;
  }
  saatYaz();
  setInterval(saatYaz, 1000);
  function yayinAkisi() {
    yayinYazi.textContent = 'akış alınıyor… 31 kB/s';
    yayinYazi.hidden = false;
    setTimeout(() => { yayinYazi.hidden = true; }, azalt ? 0 : 2900);
    // Otuz bir saniye sonra sinyal bir an gider.
    setTimeout(() => { if (odaDurum === 'normal') sinyalKaybi(800); }, 31000);
    // Geri geldiğinde oturan yok.
    setTimeout(() => {
      if (odaDurum !== 'normal') return;
      sinyalKaybi(1300, () => yay('yayin-figur', 'yok'));
      soyle([[2700, 'anon_b17', 'koltuk boş'], [1400, 'puzur', 'nerede'], [1900, 'theodoros', 'kimse kalktığını görmedi'], [2200, 'anon_09c', 'bakmayın']]);
      setTimeout(() => {
        if (odaDurum !== 'normal') return;
        sinyalKaybi(900, () => {
          // Yerinde. Ama kulaklığı yok.
          yay('yayin-figur', 'yuz');
          soyle([[1100, 'anon_4f2', 'kulaklığı'], [650, 'anon_4f2', 'çıkmış'], [2600, 'theodoros', 'görmedik'], [1100, 'puzur', 'görmedik'], [1100, 'hafiz_salih', 'görmedik']]);
          setTimeout(() => {
            if (odaDurum === 'normal') sinyalKaybi(600, () => yay('yayin-figur', 'normal'));
          }, 6200);
        });
      }, 31000);
    }, 62000);
  }

  // ---------- oturum sayacı: 04:12 ----------
  const sayac = $('#oturum-sayac');
  let kalan = 252;
  let olduOlay = false;
  try { olduOlay = sessionStorage.getItem('kadim.oldu') === '1'; } catch (e) { /* gizli sekme */ }
  if (olduOlay) kalan = -1;
  const sureYaz = (n) => `${iki(Math.floor(n / 60))}:${iki(n % 60)}`;
  function uygunMu() {
    if (document.hidden || kok.classList.contains('esikte')) return false;
    if ($('#asli').open || $('#dosya').open || !$('#karartma').hidden || $('#perde').hidden) return false;
    const a = document.activeElement;
    if (a && /^(INPUT|TEXTAREA)$/.test(a.tagName)) return false;
    const r = $('#ayin').getBoundingClientRect();
    return !(r.top < innerHeight * 0.7 && r.bottom > innerHeight * 0.3);
  }
  function olumOlayi() {
    olduOlay = true;
    try { sessionStorage.setItem('kadim.oldu', '1'); } catch (e) { /* gizli sekme */ }
    if (azalt) return;
    const o = O.oluSayfa();
    document.body.appendChild(o.e);
    kok.classList.add('olu-an');
    const eski = document.title;
    document.title = 'Problem loading page';
    Ses.sus(0.05);
    logla('bağlantı koptu', 'CIRCUIT_DESTROYED 0xF0');
    let basim = 0, zaman1 = 0;
    const don = () => {
      clearTimeout(zaman1);
      removeEventListener('keydown', tus);
      o.e.remove();
      kok.classList.remove('olu-an');
      document.title = eski;
      Ses.don(1.2);
      logla('geri geldi. kimse çağırmadı.', 'CIRCUIT_BUILT');
      V.cevrimici();
      odaDurum === 'normal' && soyle([[1700, 'anon_09c', 'geri geldi'], [1300, 'theodoros', 'gitmedi ki'], [2200, 'puzur', 'gidilmez']]);
    };
    const tus = (e) => { if (e.key === 'Escape') don(); };
    addEventListener('keydown', tus);
    o.b.addEventListener('click', () => {
      basim++;
      if (basim > 1) {
        don();
        return;
      }
      o.b.disabled = true;
      o.b.textContent = 'Connecting…';
      setTimeout(() => {
        o.d.textContent = 'Details: 0xF0 — o cevap vermiyor. Sen de verme.';
        o.b.disabled = false;
        o.b.textContent = 'Try Again';
      }, 1900);
    });
    o.b.focus({ preventScroll: true });
    zaman1 = setTimeout(don, 31000);
  }
  function sayacCalis() {
    setInterval(() => {
      if (kalan > 0) {
        kalan--;
        sayac.textContent = `oturum ${sureYaz(kalan)}`;
        if (kalan === 60) tepki('dakika', 1e9, [[0, 'anon_09c', 'bir dakikası kaldı'], [1800, 'puzur', 'neyin']]);
        return;
      }
      if (!olduOlay) {
        sayac.textContent = 'oturum 00:00';
        if (uygunMu()) olumOlayi();
        return;
      }
      kalan--;
      sayac.classList.add('gecti');
      sayac.textContent = `oturum −${sureYaz(-kalan)}`;
    }, 1000);
  }

  // ---------- dizin ----------
  const bugun = new Date();
  const tarihYaz = (d) => `${iki(d.getDate())}-${AY[d.getMonth()]}-${d.getFullYear()} ${iki(d.getHours())}:${iki(d.getMinutes())}`;
  const dun = new Date(bugun.getTime() - 864e5);
  dun.setHours(4, 12);
  const KANARYA_IMZA = 'YWRyZXNpbiBzb251bmE6IGFyc2l2';
  const kanaryaMetni = () => {
    const d = new Date();
    const gun = `${iki(d.getDate())}.${iki(d.getMonth() + 1)}.${d.getFullYear()}`;
    return `-----BEGIN PGP SIGNED MESSAGE-----
Hash: SHA256

KANARYA · ${gun}, 04.12

1. Bu tarih itibarıyla hiçbir mahkemeden celp almadık.
2. Çağrıldık. Gitmedik. MÖ 1259'dan beri çağrılıyoruz.
3. İşletmeciye kimse ulaşmadı. Ulaşan olmadı.
4. Ugarit'ten bu yana cevap verilmedi.
5. Bu metni yazan hâlâ odada.

Bu metin her gece 04.12'de yeniden imzalanır.
İmzalanmadığı gün bu sayfayı kapat ve kimseye söyleme.

-----BEGIN PGP SIGNATURE-----

${KANARYA_IMZA}
iQEzBAEBCAAdFiEE3xq7ZwKm0vUfJcT1hY8pQnL4aX0FAmXyK04ACgkQhY8pQnL4
aX1w0gf/TzV3mNq8YcRu2oEfGd5sLk1pWbH7xIuJt9aZ0vKe6MrD4yUoQf3nSgCj
=31kD
-----END PGP SIGNATURE-----`;
  };
  $('#kanarya').textContent = kanaryaMetni();

  function hexdump(metin, tohum) {
    const b = new TextEncoder().encode(metin);
    let r = tohum;
    const bayt = [];
    const dolgu = (n) => { for (let i = 0; i < n; i++) { r = (Math.imul(r, 1664525) + 1013904223) >>> 0; bayt.push(r >>> 24); } };
    dolgu(96);
    b.forEach((x) => bayt.push(x));
    dolgu(112);
    const sat = [];
    for (let i = 0; i < bayt.length; i += 16) {
      const p = bayt.slice(i, i + 16);
      const h = p.map((x, j) => x.toString(16).padStart(2, '0') + (j === 7 ? '  ' : ' ')).join('').padEnd(49);
      const a = p.map((x) => (x >= 32 && x < 127 ? String.fromCharCode(x) : '.')).join('');
      sat.push(`${i.toString(16).padStart(8, '0')}  ${h} |${a}|`);
    }
    return sat.join('\n');
  }
  const dosyaEl = $('#dosya'), dosyaAd = $('#dosya-ad'), dosyaGovde = $('#dosya-govde'), dosyaResim = $('#dosya-resim');
  let resimZaman = [];
  function dosyaAc(ad, metin, hex) {
    acikDosya = ad;
    dosyaAd.textContent = `/${ad}`;
    dosyaGovde.classList.toggle('hex', !!hex);
    dosyaGovde.textContent = metin;
    dosyaResim.hidden = true;
    resimZaman.forEach(clearTimeout);
    resimZaman = [];
    if (!dosyaEl.open) dosyaEl.showModal();
    logla(`${ad} dosyasını açtı`, `"GET /${ad} HTTP/1.1" 200`);
  }
  function senLogGoster() {
    const onc = onceki.length ? `${onceki.join('\n')}\n--- önceki oturum burada bitti. sen bitirmedin. ---\n` : '';
    dosyaGovde.textContent = `${onc}${logSatir.join('\n')}\n[şimdi] ${BEN} bunu okuyor`;
    dosyaGovde.scrollTop = dosyaGovde.scrollHeight;
  }
  function mesajlarDb() {
    let l = [];
    try { l = JSON.parse(depo.al('mesajlar') || '[]'); } catch (e) { l = []; }
    const sat = ['rowid       | kimden        | mesaj                     | okundu | cevap', '------------+---------------+---------------------------+--------+------',
      '1           | Puzur         | Selam.                    | evet   | yok',
      '2           | Hattuşa       | Bin tanrı şahittir, gel.  | evet   | yok',
      '7           | Ugarit        | Bir kere de cevap ver.    | evet   | VAR',
      '8           | Ugarit        | (fırında kaldı)           | evet   | yok',
      '412         | Mahalle       | Selamünaleyküm.           | evet   | yok',
      '9214007111  | Grup ödevi    | Neden yazmıyorsun?        | evet   | yok'];
    l.slice(-5).forEach((m, i) => sat.push(`${String(9214007112 + i).padEnd(11)} | ${BEN.padEnd(13)} | ${m.slice(0, 25).padEnd(25)} | evet   | yok`));
    sat.push('', `(${(9214007113 + l.length).toLocaleString('tr-TR')} satır. Hepsi okundu. Kuyruğun adı: [2038])`);
    return sat.join('\n');
  }
  const DOSYA = {
    'README.txt': () => dosyaAc('README.txt', 'okuma.\n\nbu dizin kimse için yazılmadı. buraya bağlantı veren yok.\nburaya geldiysen biri seni gönderdi. kimin gönderdiğini sorma.\n\ncevap yazma. selam verme. kendi adını yazma.\nköşeli parantez içinde gördüğün kelimeyi adres çubuğuna yazma.\n\nkurallar kat -4\'te.\n\n- op'),
    '.htpasswd': () => dosyaAc('.htpasswd', '403 Forbidden\n\nop:$apr1$0412$ZGVmdGVy\n\nParolayı zaten söyledin. Kime söylediğini sormak istemez misin?'),
    'anne.wav': () => {
      dosyaAc('anne.wav', '0 bayt.\n\nDosya boş. Sesi burada değil.');
      Ses.fisilti(2.2);
    },
    'kamera/': () => dosyaAc('kamera/', '403 Forbidden\n\nBu dizinin listelenmesi kapalı.\n16 kamera var. 15\'i buraya bakıyor.\n\nAdresten girilir.'),
    'kanarya.txt.asc': () => dosyaAc('kanarya.txt.asc', $('#kanarya').textContent),
    'mesajlar.db': () => dosyaAc('mesajlar.db', mesajlarDb()),
    'sen.log': () => {
      dosyaAc('sen.log', '');
      senLogGoster();
    },
    'ugarit_7.eml': () => dosyaAc('ugarit_7.eml', 'Return-Path: <ammurapi@ugarit.invalid>\nReceived: from sarayfirini.ugarit.invalid by kat31 (kil); MÖ 1190\nMessage-ID: <7.1190@ugarit.invalid>\nFrom: Ammurapi, Ugarit Kralı\nTo: selimkadiryaar31\nSubject: Bir kere de cevap ver\nX-Okundu: evet\nX-Cevap: evet\n\nYedi kez yazdık. Görüyorsun.\nGemiler geldi. Yedi gemi. Köyleri yaktılar.\nBir kere de cevap ver.\n\n----- yanıt -----\nFrom: selimkadiryaar31\n\nkaçın\n\n----- iletilemedi -----\nAlıcının şehri bulunamadı.'),
    'yedek_1190.tar.gz': () => dosyaAc('yedek_1190.tar.gz', hexdump('ustar  ugarit/mektup_0008.txt\0\0\0firinda kaldi. pisirilmedi.\0\0\0kat-23/adresin_sonu=pazar\0\0\0tikla diye yazmadim. oku diye yazdim.\0', 1190), true),
    '31.jpg': () => {
      dosyaAc('31.jpg', 'indiriliyor… 31 kB/s');
      dosyaResim.src = 'assets/suret/bugun.jpg';
      dosyaResim.alt = 'Bir yüz, satır satır iniyor.';
      dosyaResim.hidden = false;
      if (azalt) {
        dosyaGovde.textContent = 'Restore edilmedi. Aslı budur.';
        return;
      }
      // Satır satır iner. Gözlerin hemen üstünde durur.
      let y = 0;
      const adim1 = () => {
        y = Math.min(100, y + 1.3 + Math.random() * 1.2);
        const dur = y > 24 && y < 27;
        dosyaResim.style.clipPath = `inset(0 0 ${100 - y}% 0)`;
        dosyaGovde.textContent = dur ? `bağlantı bekleniyor… %${Math.floor(y)}` : `indiriliyor… %${Math.floor(y)} · 31 kB/s`;
        if (y >= 100) {
          dosyaGovde.textContent = 'Restore edilmedi. Aslı budur. Şimdi o da bu dosyanın açıldığını biliyor.';
          V.cevrimici();
          return;
        }
        resimZaman.push(setTimeout(adim1, dur ? 3100 : 90 + Math.random() * 160));
      };
      adim1();
    },
  };
  function dosyaKapat() {
    if (dosyaEl.open) dosyaEl.close();
  }
  $('#dosya-kapat').addEventListener('click', dosyaKapat);
  dosyaEl.addEventListener('close', () => {
    acikDosya = null;
    resimZaman.forEach(clearTimeout);
    resimZaman = [];
    dosyaResim.removeAttribute('style');
    dosyaResim.hidden = true;
  });
  dosyaEl.addEventListener('click', (e) => { if (e.target === dosyaEl) dosyaKapat(); });

  const SATIR = [
    ['../', '', '-', () => { V.fisilda('yukarısı yok.', { zorla: true }); logla('yukarı çıkmak istedi', '"GET ../ HTTP/1.1" 403'); }],
    ['.htpasswd', '31-Dec-1969 23:59', '41'],
    ['31.jpg', tarihYaz(dun), '41K'],
    ['README.txt', '01-Jan-2009 04:12', '312'],
    ['anne.wav', tarihYaz(dun), '0'],
    ['kamera/', tarihYaz(bugun), '-'],
    ['kanarya.txt.asc', tarihYaz(new Date(bugun.getFullYear(), bugun.getMonth(), bugun.getDate(), 4, 12)), '731'],
    ['kat-1_kayitlar/', '13-Dec-1901 20:45', '-', '#kayitlar'],
    ['kat-2_suretler/', '19-Mar-2012 04:12', '-', '#suretler'],
    ['kat-3_kulliyat/', '01-Jan-2014 04:12', '-', '#kulliyat'],
    ['kat-4_yasaklar.txt', '31-Dec-1969 23:59', '31', '#yasaklar'],
    ['kat-5_ayin/', tarihYaz(dun), '-', '#ayin'],
    ['kat-6_selam_verme.bin', tarihYaz(dun), '3.1M', '#oyun'],
    ['kat-7_mumlar/', '10-Jan-2004 13:37', '-', '#mumlar'],
    ['kat-31_son/', tarihYaz(bugun), '-', '#bugun'],
    ['mesajlar.db', tarihYaz(bugun), '9.2G'],
    ['sen.log', tarihYaz(bugun), '0'],
    ['ugarit_7.eml', '31-Dec-1969 23:59', '731'],
    ['yedek_1190.tar.gz', '31-Dec-1969 23:59', '3.1T'],
  ];
  const govde = $('#dizin-tablo tbody');
  let senSatir = null;
  SATIR.forEach(([ad, t, b, is]) => {
    const tr = document.createElement('tr');
    const a = document.createElement('td'), c = document.createElement('td'), d = document.createElement('td');
    c.textContent = t;
    d.textContent = b;
    if (typeof is === 'string') {
      const l = document.createElement('a');
      l.href = is;
      l.textContent = ad;
      a.appendChild(l);
    } else {
      const l = document.createElement('button');
      l.type = 'button';
      l.textContent = ad;
      l.addEventListener('click', () => {
        if (typeof is === 'function') is();
        else DOSYA[ad]();
      });
      a.appendChild(l);
    }
    tr.append(a, c, d);
    if (ad === 'sen.log') {
      tr.className = 'canli-dosya';
      senSatir = { c, d };
    }
    govde.appendChild(tr);
  });
  function dizinSenLog(d) {
    if (!senSatir) return;
    senSatir.c.textContent = tarihYaz(d);
    senSatir.d.textContent = logBayt < 1024 ? String(logBayt) : `${(logBayt / 1024).toFixed(1)}K`;
  }

  // ---------- bağlantılar ----------
  const A32 = 'abcdefghijklmnopqrstuvwxyz234567';
  const sahte = (s) => {
    let h = O.javaHash(s), m = s.replace(/[^a-z0-9_]/g, '');
    while (m.length < 22) {
      h = (Math.imul(h, 31) + 17) | 0;
      m += A32[(h >>> 9) & 31];
    }
    return `${m}…onion`;
  };
  const BAG = [
    ['ÖLÜ', 'Ur Kâtipler Birliği', sahte('urkatip'), 'son görülme: MÖ 2600'],
    ['ÖLÜ', 'Hattuşa Devlet Arşivi', sahte('hattusa'), 'boşaltıldı'],
    ['ÖLÜ', 'Ugarit Posta Servisi', sahte('ugarit'), 'sekizinci mektup iletilemedi'],
    ['ÖLÜ', 'Theodoros Manastırı', sahte('theodoros'), 'kapı kırık'],
    ['?', 'Portland Salon Kabinleri', sahte('portland'), 'böyle bir yer yok'],
    ['AÇIK', 'Anonim Tahta', sahte('tahta'), 'burada anlatılmaz', 'tahta'],
    ['AÇIK', 'Kat −23 Pazarı', 'p_z_r…onion', 'satıcı: 0 cevap'],
    ['BEKLİYOR', 'Kuyruk', '20_8…onion', 'hepsi okundu'],
    ['?', 'Kamera 16', sahte('kamera'), 'bakma'],
  ];
  const bagGovde = $('#bag-tablo tbody');
  BAG.forEach((s, i) => {
    const tr = document.createElement('tr');
    const d = document.createElement('td'), a = document.createElement('td'), n = document.createElement('td'), x = document.createElement('td');
    d.className = 'durumu';
    d.textContent = '[kontrol…]';
    if (s[4]) {
      const l = document.createElement('a');
      l.href = kodBag(s[4]);
      l.textContent = s[1];
      a.appendChild(l);
    } else {
      a.textContent = s[1];
    }
    n.textContent = s[2];
    x.textContent = s[3];
    tr.append(d, a, n, x);
    bagGovde.appendChild(tr);
    setTimeout(() => {
      d.textContent = `[${s[0]}]`;
      d.classList.add(s[0] === 'ÖLÜ' ? 'olu' : s[0] === 'AÇIK' ? 'acik' : 'bekle');
    }, azalt ? 0 : 1800 + i * 1300 + Math.random() * 1800);
  });

  // ---------- sayfada kalan izler ----------
  const KATLAR = {
    dizin: ['dizine baktı', null],
    karakter: ['işletmeciye baktı', [[800, 'puzur', 'işletmeciye bakıyor'], [1700, 'theodoros', 'o da ona']]],
    kayitlar: ['kat −1\'e indi', [[800, 'anon_4f2', 'aşağı indi'], [1600, 'hafiz_salih', 'kayıtları okuyacak'], [1800, 'puzur', 'bizi']]],
    suretler: ['kat −2\'ye indi', [[800, 'anon_b17', 'suretlere indi'], [1800, 'theodoros', 'fener onda']]],
    kulliyat: ['kat −3\'e indi', [[800, 'portland81', 'külliyata bakıyor'], [1600, 'anon_09c', 'oynayan oldu mu']]],
    yasaklar: ['kat −4\'e indi', [[800, 'anon_09c', 'yasakları okuyor'], [1600, 'puzur', 'geç']]],
    ayin: ['kat −5\'e indi', [[800, 'theodoros', 'ayine geldi'], [1500, 'anon_4f2', 'elini açacak'], [1500, 'puzur', 'açma']]],
    oyun: ['kat −6\'ya indi', [[800, 'anon_b17', 'oynayacak'], [1300, 'hafiz_salih', 'çoktan oynuyor']]],
    mumlar: ['kat −7\'ye indi', [[800, 'ammurapi_ulak', 'mumlara geldi'], [1600, 'anon_09c', 'kaç tane yanıyor']]],
    bugun: ['kat −31\'e indi', [[800, 'anon_09c', 'buraya kadar indi'], [1700, 'theodoros', 'kimse inmemişti'], [1400, 'puzur', 'inmişti']]],
  };
  let sonKat = null, sonKatAn = 0;
  const katGoz = new IntersectionObserver((l) => {
    l.forEach((e) => {
      if (!e.isIntersecting || !girdi) return;
      const id = e.target.id, n = performance.now();
      if (id === sonKat) return;
      const kal = sonKat ? ` · ${Math.round((n - sonKatAn) / 1000)} sn kaldı` : '';
      sonKat = id;
      sonKatAn = n;
      const k = KATLAR[id];
      if (!k) return;
      logla(`${k[0]}${kal}`, `"GET /${id}/ HTTP/1.1" 200${kal}`);
      if (k[1] && !gorulenKat.has(id)) {
        gorulenKat.add(id);
        tepki(`kat${id}`, 1e9, k[1]);
      }
      if (id === 'bugun') {
        izleyici = 9214007113;
        sayilar();
      }
    });
  }, { rootMargin: '-50% 0px -50% 0px' });
  const gorulenKat = new Set();
  ['dizin', 'karakter', 'kayitlar', 'suretler', 'kulliyat', 'yasaklar', 'ayin', 'oyun', 'mumlar', 'bugun'].forEach((id) => {
    const e = document.getElementById(id);
    if (e) katGoz.observe(e);
  });

  let gizlenme = 0;
  document.addEventListener('visibilitychange', () => {
    if (!girdi) return;
    if (document.hidden) {
      gizlenme = performance.now();
      logla('sekmeden çıktı', 'TAB_HIDDEN');
      logKaydet();
    } else if (gizlenme) {
      const sn = Math.round((performance.now() - gizlenme) / 1000);
      logla(`sekmeye döndü · ${sn} sn nereye gittin`, `TAB_VISIBLE ${sn}s`);
      if (sn >= 2) tepki('sekme', 25000, [[900, 'anon_09c', 'döndü'], [1400, 'theodoros', `${sn} saniye`], [1500, 'puzur', 'nereye gitti'], [1800, 'anon_b17', 'görmedim. ilk defa']]);
    }
  });
  document.documentElement.addEventListener('mouseleave', (e) => {
    if (!girdi || e.clientY > 0) return;
    logla('imleç sekme çubuğuna gitti', 'POINTER_EXIT_TOP');
    tepki('kapat', 70000, [[300, 'anon_b17', 'kapatacak'], [1300, 'theodoros', 'kapatsın'], [1700, 'hafiz_salih', 'kapatanlar da dönüyor']]);
  });
  addEventListener('contextmenu', (e) => {
    if (!girdi) return;
    logla('sağ tıkladı', 'CONTEXT_MENU');
    tepki('sag', 60000, [[600, 'anon_4f2', 'kaynağa bakacak'], [1400, 'anon_09c', 'baksın']]);
  });
  document.addEventListener('copy', () => {
    if (!girdi) return;
    const m = String(document.getSelection()).trim();
    if (!m) return;
    logla(`kopyaladı: «${m.slice(0, 31)}»`, `COPY "${m.slice(0, 80)}"`);
    tepki('kopya', 40000, [[600, 'anon_4f2', 'kopyaladı'], [1300, 'puzur', 'kime gösterecek']]);
  });
  addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if (e.key === 'F12' || ((e.ctrlKey || e.metaKey) && e.shiftKey && (k === 'i' || k === 'j' || k === 'c')) || ((e.ctrlKey || e.metaKey) && k === 'u')) {
      logla('konsolu açtı', 'DEVTOOLS');
      tepki('konsol', 60000, [[500, 'anon_b17', 'konsolu açtı'], [1200, 'anon_09c', 'orada da var']]);
    }
  });
  let secimZaman = 0;
  document.addEventListener('selectionchange', () => {
    clearTimeout(secimZaman);
    secimZaman = setTimeout(() => {
      if (!girdi) return;
      const m = String(document.getSelection()).trim();
      if (m.length >= 4) logla(`şunu seçti: «${m.slice(0, 31)}»`, `SELECT "${m.slice(0, 80)}"`);
    }, 700);
  });
  let sonHareket = performance.now(), durgun = false;
  ['pointermove', 'pointerdown', 'keydown', 'wheel', 'touchstart'].forEach((o) => {
    addEventListener(o, () => {
      if (durgun) {
        durgun = false;
        logla(`yeniden kıpırdadı · ${Math.round((performance.now() - sonHareket) / 1000)} sn durdu`, 'IDLE_END');
      }
      sonHareket = performance.now();
    }, { passive: true });
  });
  setInterval(() => {
    if (!girdi || document.hidden || durgun) return;
    if (performance.now() - sonHareket > 20000) {
      durgun = true;
      logla('kıpırdamayı bıraktı', 'IDLE_START');
      tepki('kipir', 90000, [[0, 'puzur', 'kıpırdamıyor'], [2100, 'anon_09c', 'iyi'], [2500, 'theodoros', 'nefes alıyor mu']]);
    }
  }, 2000);
  dinle('ad', (ad) => {
    if (!ad) return;
    adim = ad;
    $('#oda-ad').textContent = `${ad}>`;
    logla(`adını verdi: ${ad}`, `IDENT "${ad}"`);
    tepki('ad', 1e9, [[900, 'theodoros', ad], [850, 'puzur', ad], [850, 'hafiz_salih', ad], [1500, 'anon_09c', 'adını verdi']]);
  });
  dinle('cevap', (tur) => {
    logla(tur === 'verdi' ? 'cevap verdi' : 'cevap vermedi', `RITUAL_END ${tur}`);
    if (tur === 'verdi') tepki('cevap', 1e9, [[1500, 'anon_09c', 'cevap verdi'], [1400, 'theodoros', 'herkes çıksın']]);
    else tepki('cevap', 1e9, [[1500, 'puzur', 'susmayı öğrendi'], [1700, 'theodoros', 'geç']]);
  });
  dinle('ses', (a) => {
    if (!girdi) return;
    logla(a ? 'sesi açtı' : 'sesi kapattı', a ? 'AUDIO_ON' : 'AUDIO_OFF');
    tepki('ses', 45000, a ? [[700, 'anon_b17', 'sesi açtı'], [1400, 'theodoros', 'duyacak']] : [[700, 'anon_b17', 'sesi kapattı'], [1500, 'hafiz_salih', 'tık tık hâlâ']]);
  });

  // ---------- levhalar satır satır iner ----------
  if (!azalt) {
    const levhaGoz = new IntersectionObserver((l) => {
      l.forEach((e) => {
        if (!e.isIntersecting) return;
        levhaGoz.unobserve(e.target);
        e.target.style.setProperty('--sure', `${3 + Math.random() * 4}s`);
        e.target.classList.add('iniyor');
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    $$('.levha img').forEach((i) => levhaGoz.observe(i));
  }

  // ---------- karakter kodlaması bazen kayıyor ----------
  if (!azalt) {
    const kodla = new TextDecoder('windows-1252'), bayt = new TextEncoder();
    const bozuk = (m) => kodla.decode(bayt.encode(m));
    setInterval(() => {
      if (!girdi || document.hidden || Math.random() > 0.5) return;
      const aday = $$('.kayit-eski,.katalog p,.emirler li:not(.kazinmis),.giris-yazi,.kehanet p:not(.sayac)').filter((e) => {
        if (e.children.length) return false;
        const r = e.getBoundingClientRect();
        return r.top > 60 && r.bottom < innerHeight - 80;
      });
      if (!aday.length) return;
      const e = aday[Math.floor(Math.random() * aday.length)], asil = e.textContent, kirik = bozuk(asil);
      e.textContent = kirik;
      setTimeout(() => { if (e.textContent === kirik) e.textContent = asil; }, 1500);
    }, 19000);
  }

  // ---------- konsol ----------
  window.kadim = Object.assign(window.kadim || {}, {
    devre() {
      console.log(`sen → ugarit → hattuşa → ????\n????: 127.0.0.1`);
      V.cevrimici();
      return 'son röle bu makine.';
    },
    log() {
      return logSatir.slice();
    },
  });

  dinle('esik', () => {
    girdi = true;
    girisAn = performance.now();
    sayilar();
    logla(`bağlandı · ${MAKINE.osDan} · ${MAKINE.tarayici} · ${MAKINE.ekran}`, `"GET / HTTP/1.1" 200 - "${MAKINE.os}/${MAKINE.tarayici}" ${MAKINE.ekran}`);
    odaBasla();
    yayinAkisi();
    sayacCalis();
  });
})();
