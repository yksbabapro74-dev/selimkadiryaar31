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
  const kokAdres = 'kat31.html';
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
    const cik = S.akis(girdi, S.ozet(S.utf8('anahtar:' + V.tuz + k)));
    return JSON.parse(new TextDecoder().decode(cik));
  }

  const listeOku = (a) => { try { return JSON.parse(depo.al(a) || '[]'); } catch (e) { return []; } };
  function listeyeEkle(a, v) {
    const l = listeOku(a).filter((x) => x !== v);
    l.push(v);
    depo.yaz(a, JSON.stringify(l.slice(-31)));
    return l;
  }

  // Şifreli görsel: indirilir, burada çözülür, sekmede kalır. Anahtarı hem parolaya hem bu katın koduna bağlıdır.
  async function gorselCoz(ad) {
    const a = S.anahtar();
    if (!a) throw new Error('anahtar yok');
    const ek = `${V.tuz}${a}:${kod}:${ad}`;
    const r = await fetch(`assets/g/${S.hex(S.ozet(S.utf8('dosya:' + ek))).slice(0, 20)}.bin`);
    if (!r.ok) throw new Error('görsel yok');
    const cik = S.akis(new Uint8Array(await r.arrayBuffer()), S.ozet(S.utf8('gorsel:' + ek)));
    return URL.createObjectURL(new Blob([cik], { type: 'image/jpeg' }));
  }
  // <figure data-gorsel="ad" data-soz="...">: kapalı gelir. Bakmak senin kararın.
  function gorselKur() {
    kat.querySelectorAll('[data-gorsel]').forEach((f) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'kg-ac';
      b.textContent = f.dataset.dugme || 'aç';
      f.prepend(b);
      b.addEventListener('click', async () => {
        b.disabled = true;
        b.textContent = '…';
        try {
          if (!O.azalt) {
            Ses.ters(1.1, 0.16);
            await G.uyu(1100);
          }
          const url = await gorselCoz(f.dataset.gorsel);
          const i = document.createElement('img');
          i.src = url;
          i.alt = f.dataset.alt || '';
          i.className = 'kg-resim';
          b.replaceWith(i);
          f.classList.add('acik');
          if (f.dataset.ses) Ses.kayit(f.dataset.ses, { x: 0.25, z: 0.22, ses: 0.6 });
        } catch (e) {
          b.disabled = false;
          b.textContent = 'açılmadı, yine dene';
        }
      });
    });
  }

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
    // Ses ancak bir dokunuştan sonra açılır: açık değilse ilk açıldığı an çalışır. Bir kez.
    sesle(f) {
      if (Ses.acikMi()) { f(); return; }
      let oldu = false;
      O.dinle('ses', (a) => {
        if (!a || oldu) return;
        oldu = true;
        f();
      });
    },
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
    portre: () => O.portreResmi(),
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
    gorselKur();
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
