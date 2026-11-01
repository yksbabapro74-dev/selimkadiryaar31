// Gizli katların kapıcısı: adresin sonundaki kelimeyi alır, şifreli kaydı o kelimeyle çözer.
// Kelime yanlışsa çözülecek bir şey de yoktur; burada hiçbir kat düz yazı durmaz.
(function () {
  'use strict';
  const O = window.Ortak, Ses = window.Ses, S = window.Sifre, V = window.GIZLI;
  const { depo } = O;
  // Son kapıdan geçen için hiçbir kat yok.
  if (depo.al('bitti')) {
    document.body.appendChild(O.oluSayfa({ son: true }).e);
    document.title = 'Problem loading page';
    return;
  }
  const $ = (s) => document.querySelector(s);
  const kat = $('#kat'), kapi = $('#kat-kapi'), yukari = $('#kat-yukari'), sesDugme = $('#ses-dugme');
  const dosya = location.protocol === 'file:';
  const kokAdres = dosya ? 'index.html' : './';
  const bag = (k) => (dosya ? `404.html?k=${encodeURIComponent(k)}` : encodeURIComponent(k));

  function hamYol() {
    const q = new URLSearchParams(location.search).get('k');
    if (q) return q;
    if (dosya) return '';
    const p = location.pathname.split('/').filter(Boolean);
    let son = p.length ? p[p.length - 1] : '';
    try { son = decodeURIComponent(son); } catch (e) { /* bozuk adres */ }
    return son.replace(/\.html?$/i, '');
  }
  const ham = hamYol();
  const kod = S.kodSade(ham);

  function coz(b64, k) {
    const girdi = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const anahtar = S.ozet(S.utf8('anahtar:' + V.tuz + k));
    const blok = new Uint8Array(36);
    blok.set(anahtar, 0);
    const cik = new Uint8Array(girdi.length);
    for (let i = 0, sayac = 0; i < girdi.length; sayac++) {
      blok[32] = sayac >>> 24;
      blok[33] = (sayac >>> 16) & 255;
      blok[34] = (sayac >>> 8) & 255;
      blok[35] = sayac & 255;
      const akis = S.ozet(blok);
      for (let j = 0; j < 32 && i < girdi.length; j++, i++) cik[i] = girdi[i] ^ akis[j];
    }
    return JSON.parse(new TextDecoder().decode(cik));
  }

  const listeOku = (a) => { try { return JSON.parse(depo.al(a) || '[]'); } catch (e) { return []; } };
  function listeyeEkle(a, v) {
    const l = listeOku(a).filter((x) => x !== v);
    l.push(v);
    depo.yaz(a, JSON.stringify(l.slice(-31)));
    return l;
  }

  let portreSoz = null;
  const G = {
    O, Ses, S, kod, kat, depo, bag,
    kok: kokAdres,
    azalt: O.azalt,
    kayit: O.kayit,
    kimlik: O.kimlik,
    $: (s) => kat.querySelector(s),
    bekle: (ms) => new Promise((c) => setTimeout(c, O.azalt ? Math.min(ms, 400) : ms)),
    uyu: (ms) => new Promise((c) => setTimeout(c, ms)),
    mesajlar: () => listeOku('mesajlar'),
    katlar: () => listeOku('katlar'),
    denenen: () => listeOku('denenen'),
    parmaklar: () => listeOku('parmak'),
    // Beş parmak: her biri bir katta açılır. Söylemez, bir kere fısıldar.
    parmak(ad) {
      const l = listeOku('parmak');
      if (l.includes(ad)) return l.length;
      l.push(ad);
      depo.yaz('parmak', JSON.stringify(l));
      const t = document.createElement('p');
      t.className = 'kat-parmak';
      t.textContent = `bir parmak açıldı. ${l.length}/5`;
      document.body.appendChild(t);
      Ses.vurus(0.5);
      setTimeout(() => t.remove(), 6200);
      return l.length;
    },
    // Yüz gerekirse sonradan yüklenir.
    portre() {
      if (!portreSoz) {
        portreSoz = new Promise((c, r) => {
          const b = document.createElement('script');
          b.src = 'js/portre-veri.js';
          b.onload = () => O.portreResmi().then(c, r);
          b.onerror = r;
          document.head.appendChild(b);
        });
      }
      return portreSoz;
    },
    // Tam ekran bir an: azaltılmış harekette yalnızca çağırana döner.
    async yuz(ms, ses) {
      if (O.azalt) return;
      const r = await G.portre();
      const t = document.createElement('canvas');
      t.className = 'kat-yuz';
      const n = innerWidth < 700 ? 2 : 3;
      const g = Math.floor(innerWidth / n), y = Math.floor(innerHeight / n);
      t.width = g;
      t.height = y;
      const c = t.getContext('2d');
      const v = c.createImageData(g, y);
      O.atkinson(O.griOrnekle(r, g, y, [0, 0.3, 1, 0.66]), g, y, null, new Uint32Array(v.data.buffer), O.RENK.kor, 0xff000000);
      c.putImageData(v, 0, 0);
      document.body.appendChild(t);
      Ses.cigilik(ses === undefined ? 0.8 : ses);
      await G.uyu(ms || 430);
      t.remove();
    },
  };

  function sayfa(v) {
    if (v.s !== undefined) {
      kat.innerHTML = '<p class="kat-soz"></p>';
      kat.firstChild.textContent = v.s;
      document.title = '—';
      return;
    }
    document.title = v.t || '—';
    if (v.c) {
      const st = document.createElement('style');
      st.textContent = v.c;
      document.head.appendChild(st);
    }
    kat.innerHTML = v.h;
    kat.querySelectorAll('[data-kod]').forEach((a) => { a.href = bag(a.dataset.kod); });
    kat.querySelectorAll('[data-kok]').forEach((a) => { a.href = kokAdres; });
    if (v.j) new Function('G', v.j)(G);
  }

  function yok() {
    const onceki = listeOku('denenen').filter((x) => x !== kod);
    if (kod) listeyeEkle('denenen', kod);
    kat.innerHTML = '<div class="kat-yok"><h1 class="kat-404">404 Not Found</h1><p class="kat-soz" id="y1">Burada bir şey yok.</p><p class="kat-soz kor" id="y2" hidden>Henüz.</p><p class="kat-liste" id="y3" hidden></p><p class="kat-sunucu">nginx/1.4.6 (Ugarit)</p></div>';
    setTimeout(() => {
      $('#y2').hidden = false;
      Ses.fisilti(1.6);
    }, O.azalt ? 0 : 3100);
    if (onceki.length) {
      const y3 = $('#y3');
      y3.textContent = `Denediğin kapılar: ${onceki.map((k) => '/' + k).join(' · ')}. Açılmadılar. Ama artık senin kim olduğunu biliyorlar.`;
      y3.hidden = false;
    }
    document.title = '404';
  }

  function ac() {
    kapi.hidden = true;
    kapi.textContent = '';
    yukari.href = kokAdres;
    yukari.hidden = false;
    const ust = document.createElement('div');
    ust.className = 'ust-cubuk kat-ust';
    const adr = document.createElement('span');
    adr.className = 'adres';
    adr.textContent = `http://${O.onion()}/${kod}`;
    ust.appendChild(adr);
    document.body.insertBefore(ust, document.body.firstChild);
    const id = S.hex(S.ozet(S.utf8('kapi:' + V.tuz + kod))).slice(0, 24);
    const kayit = V.kat[id];
    if (kayit) {
      listeyeEkle('katlar', kod);
      sayfa(coz(kayit, kod));
    } else if (/^(kat)?-?\d{1,2}$/.test(kod)) {
      kat.innerHTML = '<p class="kat-soz">Kat numarasıyla girilmez. Kelimesini bulacaksın.</p>';
    } else {
      yok();
    }
  }

  function parola() {
    kapi.hidden = false;
    kapi.innerHTML = '<form class="kapi-form" autocomplete="off"><p class="kapi-soz" id="kp-soz">Buraya yukarıdan gelmedin. erişim anahtarı:</p>'
      + '<label class="gizli" for="kp">Parola</label><input id="kp" type="password" autocomplete="off" autocapitalize="off" spellcheck="false">'
      + '<button type="submit" class="dugme">gönder</button><p class="kapi-cevap" id="kp-cevap" aria-live="polite"></p></form>';
    const girdi = $('#kp');
    girdi.focus();
    kapi.firstChild.addEventListener('submit', (e) => {
      e.preventDefault();
      const m = girdi.value;
      if (!m.trim()) return;
      if (S.dene(m)) {
        Ses.uyan();
        ac();
      } else {
        $('#kp-cevap').textContent = S.yanlisSoz(m);
        girdi.value = '';
        girdi.focus();
      }
    });
  }

  // Ses ancak bir dokunuştan sonra açılabilir. Yukarıda kapattıysa burada da kapalı kalır.
  function sesAc() {
    removeEventListener('pointerdown', sesAc);
    removeEventListener('keydown', sesAc);
    if (depo.al('ses') !== '0') Ses.uyan();
  }
  addEventListener('pointerdown', sesAc);
  addEventListener('keydown', sesAc);
  O.dinle('ses', (a) => { sesDugme.textContent = a ? 'ses: açık' : 'ses: kapalı'; });
  sesDugme.addEventListener('click', () => {
    // Bu tıklama sesAc'tan da geçer; yalnızca o an açılmadıysa değiştir.
    setTimeout(() => { if (!sesDugme.dataset.ilk) sesDugme.dataset.ilk = '1'; else Ses.degistir(); }, 0);
  });

  if (S.gecti()) ac();
  else parola();
})();
