// Mağaza: acıklı bir indie oyun sayfası. Burası korkunç değil. Olmamalı.
(function () {
  'use strict';
  const O = window.Ortak, Ses = window.Ses, S = window.Sifre, D = window.Davet, Y = window.Yonetmen;
  const { depo, kayit, azalt } = O;
  const $ = (s) => document.querySelector(s);

  function raporOku() {
    try { return JSON.parse(depo.al('rapor') || 'null'); } catch (e) { return null; }
  }
  function sureYaz(ms) {
    const dk = Math.round(ms / 60000);
    if (dk < 1) return 'az önce';
    if (dk < 60) return `${dk} dakika önce`;
    const sa = Math.round(dk / 60);
    if (sa < 24) return `${sa} saat önce`;
    return `${Math.round(sa / 24)} gün önce`;
  }

  // Geri gelen, sayfanın değiştiğini görür.
  function gecmisiYaz() {
    const r = raporOku();
    const ad = D.ad();
    const adim = depo.al('perde');
    if (!r && (!adim || adim === 'magaza')) return;
    if (r) {
      $('#m-indirme').textContent = '1';
      $('#m-guncel').textContent = sureYaz(Date.now() - r.bitti);
      $('#m-surum-no').textContent = 'v31.0';
      $('#m-surum-yazi').textContent = `${ad || 'misafir'} eklendi.`;
      $('#m-takipci').textContent = '1 takipçi';
      const li = document.createElement('li');
      const ust = document.createElement('p');
      ust.className = 'm-yorum-ust';
      ust.textContent = `${ad || 'misafir'} · ★☆☆☆☆ · oynama süresi: ${Math.max(1, Math.round(r.sure / 60000))} dk`;
      const yaz = document.createElement('p');
      yaz.textContent = r.kipirdadi ? 'çıkış menüsü yok' : 'çıkış menüsü yok. kıpırdamadım. yine de yok.';
      li.append(ust, yaz);
      $('#m-yorum-liste').appendChild(li);
      $('#m-yorum-sayi').textContent = '(1)';
      $('#m-yorum-bos').hidden = true;
      $('#m-aciklama').textContent = 'oyun. oynadın.';
    } else {
      $('#m-guncel').textContent = 'az önce';
      $('#m-surum-yazi').textContent = `${ad || 'misafir'} ekleniyor.`;
    }
  }

  function yaziyorGoster() {
    const el = $('#m-yaziyor');
    const ad = D.ad() || O.misafir();
    setTimeout(() => {
      if (!document.querySelector('#magaza') || $('#magaza').hidden) return;
      el.textContent = `${ad} yorum yazıyor…`;
      el.hidden = false;
      setTimeout(() => { el.hidden = true; }, azalt ? 6000 : 4800);
    }, 14000);
  }

  function cikisYaz() {
    const c = window.AYAR && window.AYAR.cikis;
    if (!c) return;
    const hedef = new Date(`${c}T00:00:00`);
    if (Number.isNaN(hedef.getTime())) return;
    const g = Math.ceil((hedef - Date.now()) / 864e5);
    $('#m-cikis-satir').hidden = false;
    $('#m-cikis').textContent = g > 0 ? `${g} gün` : 'çıktı';
  }

  // Devam edene doğru düğmeler.
  function devamYaz() {
    const adim = depo.al('perde');
    const r = raporOku();
    const kutu = $('#m-devam');
    if (!r && (!adim || adim === 'magaza')) return;
    const kapiDugme = (yazi, f) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'm-oyna m-ikincil';
      b.textContent = yazi;
      b.addEventListener('click', f);
      kutu.appendChild(b);
    };
    $('#m-oyna').textContent = r ? 'Baştan oyna' : 'Kaldığın yerden devam et';
    if (r) kapiDugme('Sonuna dön', () => anahtarla(() => gecis('final')));
    kutu.hidden = !r;
    if (r) {
      const a = document.createElement('a');
      a.className = 'm-oyna m-ikincil';
      a.href = 'kat31.html';
      a.textContent = 'Eski sürüm (kat 31)';
      kutu.appendChild(a);
    }
  }
  function hedef() {
    const adim = depo.al('perde');
    if (raporOku() || !adim || adim === 'magaza' || adim === 'final') return 'karakter';
    return adim;
  }

  // Sayfanın rengi gider. Komik olan biter.
  async function gecis(ad) {
    Ses.uyan();
    Ses.can(87.31, 12, 0.5);
    Ses.derinlik(0.06);
    const m = $('#magaza');
    m.classList.add('sonuyor');
    O.depo.yaz('gelis', String((kayit.gelis = kayit.gelis + 1)));
    await Y.gec(ad, 3100, 900);
    m.classList.remove('sonuyor');
  }

  let bekleyen = null;
  function anahtarla(f) {
    if (S.gecti()) {
      f();
      return;
    }
    bekleyen = f;
    const form = $('#m-anahtar');
    form.hidden = false;
    $('#m-anahtar-girdi').focus();
  }
  $('#m-anahtar').addEventListener('submit', (e) => {
    e.preventDefault();
    const g = $('#m-anahtar-girdi'), m = g.value;
    if (!m.trim()) return;
    if (S.dene(m)) {
      g.value = '';
      $('#m-anahtar-cevap').textContent = 'Bunu sana kim verdi?';
      g.blur();
      setTimeout(() => { if (bekleyen) bekleyen(); }, azalt ? 200 : 1300);
    } else {
      $('#m-anahtar-cevap').textContent = S.yanlisSoz(m);
      g.value = '';
      g.focus();
    }
  });
  // Yarıda bırakıp dönene kamera kendiliğinden açılmaz: yeniden sorulur.
  function kameraSor() {
    const B = window.Bakis;
    return new Promise((coz) => {
      if (B.izin.al() !== 'evet' || B.acikMi() || hedef() === 'karakter') {
        coz();
        return;
      }
      const kutu = $('#m-devam');
      kutu.textContent = '';
      kutu.hidden = false;
      const not = document.createElement('p');
      not.className = 'm-uyari';
      not.textContent = 'Kalınan yerde kamera açıktı. Yine açılsın mı? Görüntü yalnızca bu sekmede işlenir; kaydedilmez, gönderilmez.';
      const ac = document.createElement('button');
      ac.type = 'button';
      ac.className = 'm-oyna m-ikincil';
      ac.textContent = 'kamerayı aç';
      const yok = document.createElement('button');
      yok.type = 'button';
      yok.className = 'm-oyna m-ikincil';
      yok.textContent = 'kamerasız devam et';
      ac.addEventListener('click', async () => {
        kutu.hidden = true;
        const a = await B.ac();
        B.izin.yaz(a ? 'evet' : 'red');
        coz();
      });
      yok.addEventListener('click', () => {
        kutu.hidden = true;
        B.izin.yaz('red');
        coz();
      });
      kutu.append(not, ac, yok);
    });
  }
  $('#m-oyna').addEventListener('click', () => {
    Ses.uyan();
    anahtarla(async () => {
      await kameraSor();
      gecis(hedef());
    });
  });

  // Mağazanın küçük şeyleri.
  $('#m-ara-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const q = $('#m-ara').value.trim();
    const s = $('#m-ara-sonuc');
    if (!q) {
      s.hidden = true;
      return;
    }
    s.textContent = `«${q}» için sonuç yok. Bu rafta tek oyun var. Hep tek oyun vardı.`;
    s.hidden = false;
  });
  $('#m-giris').addEventListener('click', (e) => {
    e.currentTarget.textContent = 'zaten girdin';
    e.currentTarget.disabled = true;
  });
  $('#kaydi-sil').addEventListener('click', () => {
    O.unut();
    try { sessionStorage.clear(); } catch (e) { /* gizli sekme */ }
    window.Davet.unut();
    location.href = './';
  });

  // Parolasız gelen burada boş kutu görür. Görsel parolayla açılır, açılınca kutu kendini onarır.
  document.querySelectorAll('#magaza img[data-resim]').forEach((im) => {
    im.addEventListener('load', () => {
      im.hidden = false;
      const li = im.closest('li.m-kirik');
      if (!li) return;
      li.classList.remove('m-kirik');
      li.querySelector('span').textContent = li.dataset.yazi;
    }, { once: true });
  });

  // Sayfa bakmadığında değişir. Burası korkunç değil; yalnızca bir şey yerinde durmuyor.
  function sizinti() {
    const kapak = $('#m-kapak-resim'), yazi = document.querySelector('.m-kapak-yazi');
    const kapakDegis = () => {
      if ($('#magaza').hidden || kapak.dataset.degisti) return;
      kapak.dataset.degisti = '1';
      // Anahtarı olmayana görsel yok: yalnızca yazı değişir.
      if (!S.anahtar()) {
        yazi.textContent = 'kapak görseli yapıldı. anahtarı olana.';
        return;
      }
      const yol = 'kamera/c10_uzak.jpg';
      kapak.dataset.resim = yol;
      S.resim(yol).then((u) => {
        kapak.src = u;
        kapak.alt = 'Gece, gözetleme kamerası görüntüsü. Apartman koridorunun dibinde biri duruyor.';
        kapak.style.mixBlendMode = 'normal';
        kapak.style.imageRendering = 'auto';
        yazi.textContent = 'kapak görseli yapıldı';
      }).catch(() => {});
    };
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) kapakDegis();
    });
    setTimeout(kapakDegis, 62000);
    setTimeout(() => {
      if (!$('#magaza').hidden) $('#m-oynayan').textContent = '2';
    }, 47000);
  }

  Y.kaydet('magaza', async () => {
    gecmisiYaz();
    cikisYaz();
    devamYaz();
    yaziyorGoster();
    sizinti();
    $('#m-oynayan').textContent = '1';
  });
})();
