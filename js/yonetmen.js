// Yönetmen: gecenin akışı. Her perde sırayla, her tepeden sonra dinlenme.
// Eski sayfadaki dağınık zamanlayıcılar burada yok: ne zaman ne olacağına tek yer karar verir.
window.Yonetmen = (function () {
  'use strict';
  const O = window.Ortak, Ses = window.Ses, B = window.Bakis;
  const { depo, azalt, kayit } = O;
  const $ = (s) => document.querySelector(s);
  const kok = document.documentElement;

  const sahneler = {};
  let aktif = null;

  // ---------- zaman ----------
  const uyu = (ms) => new Promise((c) => setTimeout(c, ms));
  const bekle = (ms) => uyu(azalt ? Math.min(ms, 500) : ms);
  async function daktilo(el, metin, sec) {
    const s = sec || {};
    const hiz = s.hiz === undefined ? 34 : s.hiz;
    if (azalt || hiz === 0) {
      el.textContent = metin;
      return;
    }
    el.textContent = '';
    for (let i = 0; i < metin.length; i++) {
      if (s.iptal && s.iptal()) {
        el.textContent = metin;
        return;
      }
      el.textContent += metin[i];
      if (s.ses !== false && metin[i] !== ' ') Ses.tik(0.1);
      await uyu(hiz + (metin[i] === '.' ? hiz * 6 : metin[i] === ',' ? hiz * 3 : 0));
    }
  }
  function satir(el, metin, sinif) {
    const p = document.createElement('p');
    if (sinif) p.className = sinif;
    p.textContent = metin;
    el.appendChild(p);
    return p;
  }

  // ---------- gerilim eğrisi ----------
  // 0: oda sakin, 1: her şey susmuş. Aynı anda birden fazla şey olmaz: tepe çağıran dinlenmeyi de bekler.
  let egri = 0;
  function gerilim(h) {
    egri = Math.max(0, Math.min(1, h));
    kok.style.setProperty('--gerilim', egri.toFixed(2));
    Ses.derinlik(Math.min(0.92, egri * 0.92));
    O.gerilim.seviye = Math.round(egri * 7);
  }
  async function dinlen(ms) {
    const once = egri;
    gerilim(Math.max(0, once - 0.25));
    await bekle(ms || 2600);
    gerilim(once);
  }

  // ---------- kamera rozeti: açıkken hep görünür, tek dokunuşla kapanır ----------
  const rozet = $('#kamera-rozet');
  B.dinle('durum', () => { rozet.hidden = !B.acikMi(); });
  rozet.addEventListener('click', () => {
    B.kapat();
    B.izin.yaz('red');
    rozet.hidden = true;
  });

  // ---------- ses düğmesi ----------
  const sesD = $('#ses-dugme');
  O.dinle('ses', (a) => { sesD.textContent = a ? 'ses: açık' : 'ses: kapalı'; });
  sesD.addEventListener('click', () => Ses.degistir());

  // Sekmeden çıkınca başlık konuşur.
  let asilBaslik = document.title;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      asilBaslik = document.title;
      document.title = aktif && aktif !== 'magaza' ? 'bakmıyorsun' : 'hâlâ açık';
    } else document.title = asilBaslik;
  });

  // ---------- akış ----------
  function kaydet(ad, f) { sahneler[ad] = f; }
  const SIRA = ['magaza', 'karakter', 'inis', 'oda', 'final'];
  function perde() { return depo.al('perde') || 'magaza'; }
  // Komut veren sahneler sık bakar, göz kırpma kaçmasın; öbürleri yarı hızda; finalde gerek yok.
  const TEMPO = { karakter: 62, arkanda: 62, inis: 125, oda: 125, final: 500, magaza: 500 };
  function goster(ad) {
    B.tempo(TEMPO[ad] || 125);
    document.querySelectorAll('.sahne').forEach((s) => { s.hidden = s.id !== ad; });
    kok.dataset.sahne = ad;
    document.querySelector('meta[name="theme-color"]').content = ad === 'magaza' ? '#f3f2ee' : '#000000';
    scrollTo(0, 0);
  }
  async function git(ad, v) {
    aktif = ad;
    if (SIRA.includes(ad) && ad !== 'magaza') depo.yaz('perde', ad);
    sesD.hidden = ad === 'magaza';
    goster(ad);
    if (sahneler[ad]) await sahneler[ad](v);
  }

  // Sayfa kararır, sonra öbür sahne. Mağazadan geçiş bir kez yaşanır.
  async function karar(ms) {
    const p = $('#perde-kara');
    p.hidden = false;
    void p.offsetWidth;
    p.style.transition = `opacity ${azalt ? 100 : ms}ms linear`;
    p.classList.add('acik');
    await uyu(azalt ? 120 : ms);
  }
  async function aydin(ms) {
    const p = $('#perde-kara');
    p.style.transition = `opacity ${azalt ? 100 : ms}ms linear`;
    p.classList.remove('acik');
    await uyu(azalt ? 120 : ms);
    if (!p.classList.contains('acik')) p.hidden = true;
  }
  // Karar, öbür sahne açılır, aydınlanır. Sahne kendi süresince sürer: aydınlanma onu beklemez.
  async function gec(ad, kararMs, aydinMs, v) {
    await karar(kararMs === undefined ? 1300 : kararMs);
    const s = git(ad, v);
    aydin(aydinMs === undefined ? 800 : aydinMs);
    await s;
  }

  // Geliştirici konsolu: buraya bakan arkadaşlara.
  function konsol() {
    console.log('%cKonsolu açtın.', 'font:400 24px serif;color:#c33');
    console.log('Geliştirici de buradan bakıyor. Çıkış menüsünü arıyorsan: yok. Kamera açıksa Network sekmesine bak: dışarı giden istek göremezsin.');
    console.log('Eski sürüm: /kat31.html · kapı: /sessizoda');
  }

  function basla() {
    if (kok.classList.contains('olu')) {
      document.body.appendChild(O.oluSayfa({ son: true }).e);
      document.title = 'Problem loading page';
      document.querySelectorAll('.sahne').forEach((s) => { s.hidden = true; });
      return;
    }
    konsol();
    // Geliştirme: ?sahne=oda doğrudan o perdeyi açar (yalnızca bu makinede).
    const q = new URLSearchParams(location.search).get('sahne');
    if (q && /^(localhost|127\.0\.0\.1)$/.test(location.hostname)) {
      window.Sifre.gecir();
      git(q);
      return;
    }
    git('magaza');
  }

  return { kaydet, git, gec, basla, uyu, bekle, daktilo, satir, gerilim, dinlen, karar, aydin, perde, kayit, SIRA, goster };
})();
