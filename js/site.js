// Portre, kayıtlar, suretler, ayin, mumlar ve küçük kıyafet değişiklikleri.
document.documentElement.classList.add('js');
(function () {
  'use strict';
  const { azalt, RENK, CSS_RENK, BAYER } = window.Ortak;
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));
  const depo = {
    al(k) { try { return localStorage.getItem('kadim.' + k); } catch (e) { return null; } },
    yaz(k, v) { try { localStorage.setItem('kadim.' + k, v); } catch (e) { /* gizli sekme */ } },
  };

  // ---------- çevrimiçi: 3.1 saniye, kayda geçer ----------
  const durum = $('#durum'), durumYazi = $('#durum-yazi'), durumEk = $('#durum-ek');
  let cevrimiciZaman = 0;
  function cevrimici() {
    durum.classList.add('acik');
    durumYazi.textContent = 'çevrimiçi';
    durumEk.textContent = ' · 3,1 saniye';
    const k = $('#sohbet-durum');
    k.textContent = 'çevrimiçi';
    k.classList.add('acik');
    clearTimeout(cevrimiciZaman);
    cevrimiciZaman = setTimeout(() => {
      durum.classList.remove('acik');
      durumYazi.textContent = 'çevrimdışı';
      durumEk.textContent = ' · son görülme: az önce';
      k.textContent = 'son görülme: az önce';
      k.classList.remove('acik');
    }, 3100);
  }

  // ---------- dikişler ----------
  $$('.dikis').forEach((d) => {
    const r = window.Ortak.dikisResmi(CSS_RENK[d.dataset.ust], CSS_RENK[d.dataset.alt], 3);
    d.style.backgroundImage = `url(${r.url})`;
    d.style.backgroundSize = `${r.g}px ${r.y}px`;
  });

  // ---------- portre: karanlıktan belirir ----------
  (function () {
    const tuval = $('#portre');
    if (!tuval) return;
    const ctx = tuval.getContext('2d', { alpha: false });
    const bolum = $('#karakter');
    const baslik = bolum.querySelector('.baslik'), alt = bolum.querySelector('.alt-baslik'), kart = bolum.querySelector('.kart');
    const parcalar = [[baslik, 0.3], [alt, 0.46], [kart, 0.62]];
    const yapiskan = () => matchMedia('(min-width:1021px)').matches;
    let gri = null, resim = null, g = 0, y = 0, v = null, cikis = null, sonP = -1, bekliyor = false;

    function boyut() {
      if (!resim) return;
      const r = tuval.getBoundingClientRect();
      const nokta = 2;
      g = Math.max(40, Math.floor(r.width / nokta));
      y = Math.max(40, Math.floor(r.height / nokta));
      tuval.width = g;
      tuval.height = y;
      v = ctx.createImageData(g, y);
      cikis = new Uint32Array(v.data.buffer);
      gri = window.Ortak.griOrnekle(resim, g, y);
      sonP = -1;
    }
    function ciz(p) {
      if (!gri) return;
      // Önce en parlak yerler (gözlük parıltısı, alın) belirir, sonra orta tonlar.
      const k = Math.max(0, Math.min(1, p));
      const kay = (1 - k) * 215, kaz = 1 + (1 - k) * 0.55;
      window.Ortak.atkinson(gri, g, y, (d) => {
        const c = (d - kay) * kaz;
        return c < 0 ? 0 : c;
      }, cikis, RENK.kagit, RENK.murekkep);
      ctx.putImageData(v, 0, 0);
    }
    function kaydir() {
      bekliyor = false;
      const r = bolum.getBoundingClientRect();
      const vh = innerHeight;
      if (r.bottom < -40 || r.top > vh + 40) return;
      let p;
      if (azalt) p = 1;
      else if (yapiskan()) p = (vh * 0.55 - r.top) / (vh * 0.55 + (r.height - vh) * 0.72);
      else p = (vh * 0.92 - tuval.getBoundingClientRect().top) / (vh * 0.8);
      p = Math.max(0, Math.min(1, p));
      if (Math.abs(p - sonP) > 0.004) {
        sonP = p;
        ciz(p);
      }
      parcalar.forEach(([el, esik]) => {
        el.style.opacity = azalt || !yapiskan() || p >= esik ? 1 : 0;
      });
    }
    const iste = () => {
      if (bekliyor) return;
      bekliyor = true;
      requestAnimationFrame(kaydir);
    };
    window.Ortak.portreResmi().then((r) => {
      resim = r;
      boyut();
      kaydir();
    });
    addEventListener('scroll', iste, { passive: true });
    addEventListener('resize', () => { boyut(); iste(); });
  })();

  // ---------- kayıtlar: yeniden çeviri ----------
  (function () {
    const KARMA = 'ᚠᚢᚦᚨᚱᚲ#%&/\\=+*';
    function karistirarak(el, metin) {
      if (azalt) { el.textContent = metin; return; }
      const sure = Math.min(700, 260 + metin.length * 9), bas = performance.now();
      (function adim(n) {
        const t = Math.min(1, (n - bas) / sure), sinir = Math.floor(t * metin.length);
        let s = metin.slice(0, sinir);
        for (let i = sinir; i < metin.length; i++) s += metin[i] === ' ' ? ' ' : KARMA[(Math.random() * KARMA.length) | 0];
        el.textContent = s;
        if (t < 1) requestAnimationFrame(adim);
      })(bas);
    }
    $$('.kayit').forEach((k) => {
      const d = document.createElement('button');
      d.type = 'button';
      d.className = 'cevir';
      d.textContent = 'yeniden çevir';
      const yeni = k.querySelector('.kayit-yeni');
      const metin = yeni.textContent;
      k.insertBefore(d, yeni);
      d.addEventListener('click', () => {
        k.classList.add('cevrildi');
        d.remove();
        yeni.setAttribute('aria-live', 'polite');
        karistirarak(yeni, metin);
      });
    });
  })();

  // ---------- suretler: aslı ----------
  (function () {
    const dlg = $('#asli');
    if (!dlg || !dlg.showModal) return;
    const levhalar = $$('#duvar .levha');
    const resim = $('#asli-resim'), yazi = $('#asli-yazi');
    let sira = 0;
    function goster(i) {
      sira = (i + levhalar.length) % levhalar.length;
      const l = levhalar[sira];
      const a = l.querySelector('a');
      resim.src = a.getAttribute('href');
      resim.alt = l.querySelector('img').alt;
      yazi.innerHTML = l.querySelector('figcaption').innerHTML;
    }
    levhalar.forEach((l, i) => {
      l.querySelector('a').addEventListener('click', (e) => {
        e.preventDefault();
        goster(i);
        dlg.showModal();
      });
    });
    $('#asli-kapat').addEventListener('click', () => dlg.close());
    $('#asli-onceki').addEventListener('click', () => goster(sira - 1));
    $('#asli-sonraki').addEventListener('click', () => goster(sira + 1));
    dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
    dlg.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') goster(sira - 1);
      if (e.key === 'ArrowRight') goster(sira + 1);
    });
  })();

  // ---------- ayin ----------
  const ayin = { el: false, ad: null, no: null, soru: false, cevap: null };
  function adimBitti(id) {
    const e = document.querySelector(`#${id} .tamam`);
    if (e) e.hidden = false;
    icazetKontrol();
  }

  // Adım 1: beş parmak, beş bit
  (function () {
    const el = $('#el'), okuma = $('#el-okuma');
    const parmaklar = $$('#el .parmak');
    const YORUM = {
      0: 'Yumruk. Daha başlamadık.',
      1: 'Başparmak. Beğendin. O beğenmedi.',
      4: 'Bu sayı ayinde hoş karşılanmaz.',
      6: 'Barış işareti. O da gelmedi.',
      31: 'Selam verildi. Karşılık gelmedi. Doğrusu da bu.',
    };
    function guncelle() {
      let d = 0;
      parmaklar.forEach((p) => { if (p.getAttribute('aria-pressed') === 'true') d += +p.dataset.d; });
      const ikili = d.toString(2).padStart(5, '0');
      const yorum = YORUM[d] || (d > 24 ? 'Az kaldı.' : 'Parmak açmaya devam.');
      okuma.innerHTML = `<b>${ikili}<sub>2</sub> = ${d}</b><br>${yorum}`;
      el.classList.toggle('dolu', d === 31);
      if (d === 31 && !ayin.el) {
        ayin.el = true;
        adimBitti('adim-el');
      }
    }
    parmaklar.forEach((p) => p.addEventListener('click', () => {
      p.setAttribute('aria-pressed', p.getAttribute('aria-pressed') === 'true' ? 'false' : 'true');
      guncelle();
    }));
  })();

  // Adım 2: Java hashCode
  function javaHash(s) {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
    return h;
  }
  const sayi = (n) => n.toLocaleString('tr-TR').replace('-', '−');
  (function () {
    const girdi = $('#ad-girdi'), okuma = $('#ad-okuma');
    $('#onun-hash').textContent = String(javaHash('selimkadiryaar31')).replace('-', '−');
    function isle() {
      const ad = girdi.value.trim();
      if (!ad) {
        ayin.ad = null;
        ayin.no = null;
        okuma.innerHTML = 'Mürit numarası: <b>henüz yok</b>';
        return;
      }
      const no = javaHash(ad);
      ayin.ad = ad;
      ayin.no = no;
      depo.yaz('ad', ad);
      const not = no < 0 ? '<br>Eksi çıktı: taşmışsın. 32 bit herkese yetmez.' : '';
      okuma.innerHTML = `Mürit numarası: <b>${sayi(no)}</b>${not}`;
      const t = document.querySelector('#adim-ad .tamam');
      if (t.hidden) adimBitti('adim-ad');
      else icazetKontrol();
    }
    girdi.addEventListener('input', isle);
    $('#ad-form').addEventListener('submit', (e) => { e.preventDefault(); isle(); });
    const eski = depo.al('ad');
    if (eski) {
      girdi.value = eski;
      isle();
    }
  })();

  // Adım 3: kehanet. Cevap ihtimali 1/31; yedinci ısrarda yorulur.
  (function () {
    const akis = $('#sohbet-akis'), form = $('#sohbet-form'), girdi = $('#sohbet-girdi');
    const CEVAPLAR = ['olmuş.', "cache'i sil.", 'lokalde çalışıyor.', 'o bug değil.', "scope'u küçült.", '3D yapma.', 'hayır.', 'neyse.', 'yarın bakarım.', 'sen yap.', 'k'];
    let adet = 0, mesgul = false, sonCevap = -1;
    const bekle = (ms) => new Promise((c) => setTimeout(c, azalt ? Math.min(ms, 300) : ms));
    function ekle(sinif, metin) {
      const li = document.createElement('li');
      li.className = sinif;
      li.textContent = metin;
      akis.appendChild(li);
      akis.scrollTop = akis.scrollHeight;
      return li;
    }
    async function yaziyor(ms) {
      const y = ekle('balon yaziyor', 'yazıyor…');
      await bekle(ms);
      y.remove();
    }
    function tikKoy(balon, metin) {
      let t = balon.querySelector('.tik');
      if (!t) {
        t = document.createElement('span');
        t.className = 'tik';
        balon.appendChild(t);
      }
      t.textContent = metin;
    }
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const soru = girdi.value.trim();
      if (!soru || mesgul) return;
      mesgul = true;
      girdi.value = '';
      adet++;
      const n = adet;
      const balon = ekle('balon', soru);
      tikKoy(balon, 'iletildi');
      const ilk = !ayin.soru;
      await bekle(900);
      // Tek tik: görülmedi bile.
      if (n === 4) {
        ekle('sistem', 'Tek tik. Görmedi bile. Engellenmiş olabilirsin.');
      } else {
        tikKoy(balon, 'görüldü');
        await bekle(700);
        const zar = Math.random();
        const cevapVar = n === 7 || (n > 4 && zar < 1 / 31);
        if (cevapVar) {
          await yaziyor(2200);
          let i;
          do { i = Math.floor(Math.random() * CEVAPLAR.length); } while (i === sonCevap);
          sonCevap = i;
          ekle('balon gelen', CEVAPLAR[i]);
          ayin.cevap = CEVAPLAR[i];
          cevrimici();
          ekle('sistem', '3,1 saniye çevrimiçiydi. Kayda geçti.');
        } else if (n === 2) {
          await yaziyor(5200);
        } else if (n === 3) {
          await yaziyor(3100);
          ekle('balon silindi', 'Bu mesaj silindi.');
        } else if (n > 4) {
          const secim = zar % 0.33;
          if (zar < 0.33) await yaziyor(3000 + secim * 4000);
          else if (zar < 0.55) {
            await yaziyor(2000);
            ekle('balon silindi', 'Bu mesaj silindi.');
          }
        }
      }
      ayin.soru = true;
      mesgul = false;
      if (ilk) adimBitti('adim-soru');
      else icazetKontrol();
    });
  })();

  // Belge
  function icazetKontrol() {
    if (!ayin.el || ayin.no === null || !ayin.soru) return;
    const kutu = $('#icazet');
    const ilk = kutu.hidden;
    kutu.hidden = false;
    icazetCiz();
    if (ilk) {
      // Sohbetin ortasında sayfayı oynatma: haberi sohbete düş.
      const li = document.createElement('li');
      li.className = 'sistem';
      li.textContent = 'Ayin tamamlandı. Belgen aşağıda. Sormaya devam edebilirsin.';
      const akis = $('#sohbet-akis');
      akis.appendChild(li);
      akis.scrollTop = akis.scrollHeight;
    }
  }
  function satirla(c, metin, en) {
    const satirlar = [];
    let s = '';
    metin.split(' ').forEach((k) => {
      const d = s ? s + ' ' + k : k;
      if (c.measureText(d).width > en && s) { satirlar.push(s); s = k; } else s = d;
    });
    if (s) satirlar.push(s);
    return satirlar;
  }
  async function icazetCiz() {
    const t = $('#icazet-tuval');
    const c = t.getContext('2d');
    await Promise.all([
      document.fonts.load('60px "Jacquard 12"'),
      document.fonts.load('26px "EB Garamond"'),
      document.fonts.load('italic 26px "EB Garamond"'),
      document.fonts.load('22px "VT323"'),
    ]).catch(() => {});
    const G = t.width, Y = t.height, K = CSS_RENK.kagit, M = CSS_RENK.murekkep, R = CSS_RENK.kizil;
    c.fillStyle = K;
    c.fillRect(0, 0, G, Y);
    c.strokeStyle = M;
    c.lineWidth = 4;
    c.strokeRect(22, 22, G - 44, Y - 44);
    c.lineWidth = 1;
    c.strokeRect(32, 32, G - 64, Y - 64);
    c.fillStyle = R;
    c.font = '84px "Jacquard 12", serif';
    c.textAlign = 'center';
    c.fillText('İcazetname', G / 2, 124);
    c.fillStyle = M;
    c.font = '22px "VT323", monospace';
    c.fillText('selimkadiryaar31 müritleri · kayıt defteri', G / 2, 158);

    const resim = await window.Ortak.portreResmi();
    const pg = 240, py = 230, nokta = 2;
    const off = document.createElement('canvas');
    off.width = pg; off.height = py;
    const oc = off.getContext('2d');
    const v = oc.createImageData(pg, py);
    window.Ortak.atkinson(window.Ortak.griOrnekle(resim, pg, py, [0.02, 0.33, 0.96, 0.62]), pg, py, null, new Uint32Array(v.data.buffer), RENK.kagit, RENK.murekkep);
    oc.putImageData(v, 0, 0);
    c.imageSmoothingEnabled = false;
    c.drawImage(off, (G - pg * nokta) / 2, 186, pg * nokta, py * nokta);
    c.imageSmoothingEnabled = true;

    let metin = `Bu belge, «${ayin.ad}» adlı kişinin ${String(ayin.no).replace('-', '−')} numaralı mürit olarak kayda geçtiğini; elini açtığını, O'na bir soru sorduğunu, sorusunun görüldüğünü ve`;
    metin += ayin.cevap ? ` kayıtlarda nadir görülür biçimde «${ayin.cevap}» cevabını aldığını tasdik eder.` : ' cevaplanmadığını tasdik eder.';
    c.font = '27px "EB Garamond", serif';
    c.textAlign = 'left';
    let yy = 690;
    satirla(c, metin, G - 130).forEach((s) => { c.fillText(s, 65, yy); yy += 33; });
    c.font = 'italic 27px "EB Garamond", serif';
    c.fillText('İmza: (imzalamadı)', 65, yy + 22);
    c.font = '22px "VT323", monospace';
    c.textAlign = 'right';
    c.fillStyle = R;
    c.fillText(`unix ${Math.floor(Date.now() / 1000)}`, G - 65, yy + 22);
  }
  $('#icazet-indir').addEventListener('click', () => {
    $('#icazet-tuval').toBlob((b) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(b);
      a.download = 'icazetname.png';
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    });
  });

  // ---------- mumlar ----------
  (function () {
    const sunak = $('#sunak');
    if (!sunak) return;

    function alevResmi() {
      const SEKIL = ['....#..', '....#..', '...##..', '...###.', '..####.', '.#####.', '.##o##.', '.#ooo#.', '..#o#..', '...#...'];
      const t = document.createElement('canvas');
      t.width = 7;
      t.height = SEKIL.length;
      const c = t.getContext('2d');
      SEKIL.forEach((s, y) => {
        for (let x = 0; x < 7; x++) {
          if (s[x] === '.') continue;
          c.fillStyle = s[x] === 'o' ? CSS_RENK.kagit : CSS_RENK.kor;
          c.fillRect(x, y, 1, 1);
        }
      });
      return t.toDataURL();
    }
    function haleResmi() {
      const N = 62;
      const t = document.createElement('canvas');
      t.width = t.height = N;
      const c = t.getContext('2d');
      c.fillStyle = CSS_RENK.kor;
      for (let y = 0; y < N; y++) {
        for (let x = 0; x < N; x++) {
          const d = Math.hypot(x + 0.5 - N / 2, y + 0.5 - N / 2) / (N / 2);
          const v = Math.max(0, 1 - d) ** 2 * 0.5;
          if (v > BAYER[((y & 7) << 3) | (x & 7)]) c.fillRect(x, y, 1, 1);
        }
      }
      return t.toDataURL();
    }
    const alev = alevResmi(), hale = haleResmi();
    let tohum = 31;
    const rast = () => { tohum = (Math.imul(tohum, 1664525) + 1013904223) >>> 0; return tohum / 4294967296; };
    const mumlar = [];
    for (let b = 30; b >= 0; b--) {
      const m = document.createElement('div');
      m.className = 'mum';
      m.title = `2^${b}`;
      m.style.setProperty('--b', `${Math.round(54 + rast() * 86)}px`);
      m.style.setProperty('--s', `${(0.5 + rast() * 0.6).toFixed(2)}s`);
      m.innerHTML = `<i class="hale" style="background-image:url(${hale})"></i><i class="alev" style="background-image:url(${alev})"></i><i class="fitil"></i><i class="govde"></i><b class="sunak-bit">0</b>`;
      sunak.appendChild(m);
      mumlar.push(m);
    }
    const unix = $('#unix'), yanan = $('#yanan'), sayac = $('#sayac');
    const TAVAN = 2147483647;
    function tik() {
      const s = Math.floor(Date.now() / 1000);
      let lit = 0;
      for (let b = 30; b >= 0; b--) {
        const acik = s < 2147483648 && Math.floor(s / 2 ** b) % 2 === 1;
        const m = mumlar[30 - b];
        if (acik) lit++;
        m.classList.toggle('yanik', acik);
        m.lastChild.textContent = acik ? '1' : '0';
      }
      unix.textContent = s.toLocaleString('tr-TR');
      yanan.textContent = lit;
      const k = TAVAN - s;
      if (k <= 0) {
        sayac.textContent = 'Taştı. Hâlâ cevap yok.';
      } else {
        const g = Math.floor(k / 86400), sa = Math.floor((k % 86400) / 3600), dk = Math.floor((k % 3600) / 60), sn = k % 60;
        const iki = (n) => String(n).padStart(2, '0');
        sayac.textContent = `${g.toLocaleString('tr-TR')} gün ${iki(sa)}:${iki(dk)}:${iki(sn)}`;
      }
    }
    tik();
    setInterval(tik, 1000);
  })();

  // ---------- küçük şeyler ----------
  const baslik = document.title;
  document.addEventListener('visibilitychange', () => {
    document.title = document.hidden ? 'görüldü' : baslik;
  });

  // Yukarı yukarı aşağı aşağı sol sağ sol sağ B A
  const KOD = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
  let kodSira = 0;
  addEventListener('keydown', (e) => {
    const t = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    kodSira = t === KOD[kodSira] ? kodSira + 1 : t === KOD[0] ? 1 : 0;
    if (kodSira === KOD.length) {
      kodSira = 0;
      cevrimici();
    }
  });

  console.log('%cKonsolu açtın.', 'font:400 28px "Jacquard 12",serif;color:#ff4f2e');
  console.log('Demek ki bizdensin. Yine de cevap yazmayacak.\nOyunda takıldıysan: kadim.tanriModu()');
})();
