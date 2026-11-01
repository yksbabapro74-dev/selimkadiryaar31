// İniş: yeni NPC eski sürümlerle uyumsuz, oyun geriye doğru yamalanıyor. Site de onunla eskir.
(function () {
  'use strict';
  const O = window.Ortak, Ses = window.Ses, B = window.Bakis, D = window.Davet, Y = window.Yonetmen, Sn = window.Sensor;
  const { depo, azalt } = O;
  const $ = (s) => document.querySelector(s);
  const kok = $('#inis'), kat = $('#inis-katman'), etiket = $('#inis-surum');
  const iki = (n) => String(n).padStart(2, '0');
  const adi = () => D.ad() || O.misafir();
  const ADI = () => buyuk(adi());
  const TR = { ş: 'S', ğ: 'G', ü: 'U', ö: 'O', ç: 'C', ı: 'I', i: 'I', Ş: 'S', Ğ: 'G', Ü: 'U', Ö: 'O', Ç: 'C', İ: 'I' };
  function buyuk(s) { return String(s).replace(/[şğüöçıiŞĞÜÖÇİ]/g, (h) => TR[h]).toUpperCase(); }
  const yaziGuvenli = (s) => String(s).replace(/[&<>"]/g, (h) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[h]));
  const simdi = () => { const d = new Date(); return `${iki(d.getHours())}.${iki(d.getMinutes())}`; };
  const uyu = Y.uyu, bekle = Y.bekle;

  // Bir düğmeye basılana dek bekler.
  const basinca = (el) => new Promise((c) => el.addEventListener('click', () => c(), { once: true }));
  function kur(html, cag) {
    kok.dataset.cag = cag;
    kat.innerHTML = html;
    scrollTo(0, 0);
    return (s) => kat.querySelector(s);
  }

  // Kapalı gözlü karen, küçük. Hesabının profil resmi bu.
  function avatarCiz(t, boy) {
    t.width = boy;
    t.height = boy;
    const c = t.getContext('2d', { willReadFrequently: true });
    const o = B.ozel.kapaliGoz;
    if (!o) {
      c.fillStyle = '#777';
      c.fillRect(0, 0, boy, boy);
      c.strokeStyle = '#222';
      c.lineWidth = Math.max(1, boy / 24);
      for (let i = 0; i < 9; i++) {
        c.beginPath();
        c.moveTo(boy * 0.2 + i * boy * 0.07, boy * 0.2);
        c.lineTo(boy * 0.32 + i * boy * 0.05, boy * 0.72);
        c.stroke();
      }
      return;
    }
    const [x, y, g, h] = o.kutu || [120, 60, 240, 240];
    const k = Math.max(g, h) * 1.35, ox = x + g / 2 - k / 2, oy = y + h / 2 - k / 2;
    c.drawImage(o.tuval, ox, oy, k, k, 0, 0, boy, boy);
    B.griIsle(c, boy, boy, { gurultu: 2 });
  }

  // Sürüm notları.
  const NOTLAR = [
    ['v30.4', '2026', 'Yoklama sistemi kaldırıldı. Zaten cevap veren yoktu.'],
    ['v30.0', '2013', 'Gizli servis açıldı. Kimse gelmedi. İyi.'],
    ['v24.1', '2004', 'Forum eklendi. Yanlış karar. Geri alınıyor.'],
    ['v13.0', '1996', 'Ziyaretçi sayacı eklendi. Sayaç sayıyor. Ziyaretçi yok.'],
    ['v7.0', '1969', 'İki makine konuştu. «LO» dediler, sonra çöktüler. Böyle kalsın.'],
    ['v5.2', '1921', 'Toplu fotoğraf özelliği. Arka sırada görünme hatası düzeltilmeyecek.'],
    ['v3.0', '1890', 'İnsanlar artık deliklerle sayılıyor. Performans iyileşti.'],
    ['v1.8', '1683', 'Tık tık sesi şikâyetleri incelendi. Özellik, hata değil.'],
    ['v1.3', '842', 'Hücre ışığı sızıyor. Bilinen sorun.'],
    ['v0.9', 'MÖ 1190', 'Ugarit dosyası silindi. Yedek yoktu.'],
    ['v0.3', 'MÖ 2600', 'Ur Kraliyet Oyunu çıktı. Oyuncu: 74. Çıkan: 0.'],
    ['v0.1', 'MÖ 3100', 'İnsanlar eklendi. Konuşuyorlar. Düzeltilecek.'],
    ['v0.0.1', 'MÖ 9600', 'Harita yüklendi. Yer tutucular yerinde.'],
  ];

  async function notlar() {
    const $k = kur(`<div class="c-not">
      <h2>SÜRÜM NOTLARI</h2>
      <ol id="cn"></ol>
      <p class="c-not-hata" id="ch" hidden></p>
      <div class="c-not-bar" id="cb" hidden><i id="cbi"></i></div>
      <button type="button" class="c-gec" id="cg" hidden>geç</button>
    </div>`, 'notlar');
    const ol = $k('#cn');
    const satir = (v, t, m, yeni) => {
      const li = document.createElement('li');
      if (yeni) li.className = 'yeni';
      const b = document.createElement('b');
      b.textContent = v;
      const z = document.createElement('time');
      z.textContent = t;
      const s = document.createElement('span');
      s.textContent = m;
      li.append(b, z, s);
      ol.appendChild(li);
      return s;
    };
    const son = satir('v31.0', 'bugün', '', true);
    await Y.daktilo(son, `${adi()} eklendi.`);
    await bekle(1500);
    NOTLAR.forEach(([v, t, m]) => satir(v, t, m));
    await bekle(azalt ? 800 : 4200);
    const h = $k('#ch');
    h.hidden = false;
    h.textContent = 'HATA: yeni NPC eski sürümlerle uyumsuz. Geriye doğru yamalanıyor. Kapatma.';
    Ses.parazit(0.3, 0.09);
    // Bundan sonra hep iner, hiç varmaz.
    Ses.separd(0.05);
    Sn.titret(50);
    $k('#cb').hidden = false;
    const bar = $k('#cbi');
    bar.style.transition = `width ${azalt ? 300 : 3100}ms linear`;
    void bar.offsetWidth;
    bar.style.width = '100%';
    await uyu(azalt ? 400 : 3300);
  }

  // ---------- 2013: gizli servis ----------
  async function servis() {
    const onion = O.onion();
    const dosyalar = [
      ['../', '', '-', null],
      ['.htpasswd', '2013-03-14 04:12', '31', () => 'selim:$2y$31$kapatma.kapatma.kapatma.\nmisafir:(boş)\nBurası da açık kalmış. Kim bıraktı.'],
      ['yedek_1190.tar.gz', 'MÖ 1190', '3.1M', () => 'Dosya bozuk. Şehir de.'],
      ['kamera_16/', 'bugün', '-', () => 'Birazdan.'],
      ['sen.jpg', `bugün ${simdi()}`, '12K', 'sen'],
      [`${adi()}.txt`, `bugün ${simdi()}`, '1K', () => D.ani(0) || 'Boş. Henüz.'],
    ];
    const satirlar = dosyalar.map(([ad, t, b], i) => `<tr><td><button type="button" data-i="${i}">${yaziGuvenli(ad)}</button></td><td>${yaziGuvenli(t)}</td><td>${b}</td></tr>`).join('');
    const $k = kur(`<div class="c-servis">
      <pre class="c-log">[notice] Bootstrapped 100% (done): Done
[notice] devre: sen -&gt; ugarit -&gt; hattuşa -&gt; ????
[warn]   bu devreyi sen kurmadın.</pre>
      <p class="c-adres">http://${yaziGuvenli(onion)}/</p>
      <h1>Index of /</h1>
      <table><thead><tr><th>Ad</th><th>Son değişiklik</th><th>Boyut</th></tr></thead><tbody>${satirlar}</tbody></table>
      <address>Apache/2.4.7 (Ugarit) Server at kat -31 Port 31</address>
      <div class="c-goster" id="cs" hidden><p id="cs-ad"></p><canvas id="cs-t" width="160" height="120" hidden></canvas><pre id="cs-y"></pre></div>
      <button type="button" class="c-asagi" id="ci">daha aşağı</button>
    </div>`, 'servis');
    Ses.can(138.59, 8, 0.32);
    let acildi = false;
    function ac(i) {
      const [ad, , , icerik] = dosyalar[i];
      if (!icerik) return;
      const kutu = $k('#cs'), t = $k('#cs-t'), y = $k('#cs-y');
      kutu.hidden = false;
      $k('#cs-ad').textContent = ad;
      Ses.tik(0.4);
      if (icerik === 'sen') {
        acildi = true;
        // Bu fareyi sen tutmuyorsun.
        Ses.kayit('fare', { x: -1.1, z: 0.7, ses: 0.3, yanki: 0.18, sure: 4.5 });
        const kare = B.gecmisKare(9000);
        if (kare) {
          t.hidden = false;
          y.textContent = '9 saniye önce.';
          t.getContext('2d').putImageData(kare, 0, 0);
          B.griIsle(t.getContext('2d'), 160, 120, { gurultu: 7 });
          Sn.titret(40);
        } else {
          t.hidden = true;
          y.textContent = 'sen.jpg yüklenemedi: yüz çizilmedi.';
        }
        return;
      }
      t.hidden = true;
      y.textContent = icerik();
    }
    kat.querySelectorAll('tbody button').forEach((b) => b.addEventListener('click', () => ac(+b.dataset.i)));
    // Kimse tıklamazsa dosya kendi açılır.
    const z = setTimeout(() => { if (!acildi && kok.dataset.cag === 'servis') ac(4); }, azalt ? 1500 : 13000);
    await basinca($k('#ci'));
    clearTimeout(z);
  }

  // ---------- 2004: forum ----------
  async function forum() {
    const imza = D.ani(1) || '(imza yok)';
    const ileti = (ad, unvan, mesaj, tarih, govde, sen) => `<article class="f4-ileti${sen ? ' sen' : ''}">
      <aside><b>${yaziGuvenli(ad)}</b><small>${yaziGuvenli(unvan)}</small>${sen ? '<canvas class="f4-av" width="64" height="64"></canvas>' : '<i class="f4-av bos"></i>'}<small>Mesaj: ${mesaj}</small></aside>
      <div><p class="f4-tarih">Gönderen: ${yaziGuvenli(tarih)}</p><p>${govde}</p>${sen ? `<p class="f4-imza">${yaziGuvenli(imza)}</p>` : ''}</div>
    </article>`;
    const $k = kur(`<div class="c-forum">
      <header><b>TÜRKİYE'NİN EN BÜYÜK BİLGİSAYAR FORUMU</b><small>Hoş geldin, <span id="fh"></span>. <u>Çıkış</u> (çalışmıyor)</small></header>
      <p class="f4-yol">Forum Ana Sayfa » Yazılım » Oyun Programlama » <b>selimkadiryaar31 neden cevap yazmıyor??? (ACİL)</b></p>
      <div id="fl">
      ${ileti('KaRaNLiK_SaVaSCi_74', 'Kıdemli Üye', '3112', '12.03.2004 02:41', 'arkadaşlar ödev için adama yazdık msn de çevrimiçi gözüküyor cevap yok. 3 gündür. biri telefonunu biliyomu')}
      ${ileti('cilgin_mouse', 'Üye', '88', '12.03.2004 02:55', 'bende de aynı. <i>meşgul</i> yazıyo. 2001 den beri meşgul')}
      ${ileti('admin_osman', 'Yönetici', '20411', '12.03.2004 03:02', 'o kullanıcıya özel mesaj atmayın. konu kilitlenmiştir.')}
      ${ileti('selimkadiryaar31', 'Üye', '1', '12.03.2004 04:12', 'çözdüm.')}
      </div>
      <p class="f4-kim">Bu konuyu görüntüleyenler: 1 üye (<span id="fk"></span>) ve 31 misafir</p>
      <p class="f4-is"><button type="button" id="fy">Yanıtla</button> <button type="button" id="fs">Sonraki konu »</button></p>
      <p class="f4-kilit" id="fm" hidden>Bu konu kilitli. Yine de yazmışsın.</p>
    </div>`, 'forum');
    $k('#fh').textContent = adi();
    $k('#fk').textContent = adi();
    Ses.modem();
    $k('#fy').addEventListener('click', () => { $k('#fm').hidden = false; });
    const liste = $k('#fl');
    function ekle(tarih, govde, mesajSayi) {
      const d = document.createElement('div');
      d.innerHTML = ileti(adi(), 'Yeni Üye', mesajSayi, tarih, yaziGuvenli(govde), true);
      const a = d.firstChild;
      liste.appendChild(a);
      avatarCiz(a.querySelector('canvas'), 64);
      Ses.tik(0.5);
      Sn.titret(30);
      // Biri yazıyor. Tuşlar senin değil.
      Ses.tikirti(5 + Math.floor(Math.random() * 7), -0.5);
    }
    // Sen okurken yazılır. Kamera açıksa gözünü kırptığın anda.
    let adim = 0;
    const iki_ = () => {
      if (kok.dataset.cag !== 'forum' || adim >= 3) return;
      adim += 1;
      if (adim === 1) ekle('12.03.2004 04:13', 'burası neresi', 1);
      if (adim === 2) ekle('12.03.2004 04:13', 'ben bunu yazmadım', 2);
      if (adim === 3) ekle('12.03.2004 04:14', 'çıkış nerede', 3);
    };
    let sonEk = performance.now();
    const k1 = B.dinle('kirpti', () => {
      if (performance.now() - sonEk < 3200) return;
      sonEk = performance.now();
      iki_();
    });
    const zamanlayici = setInterval(() => {
      if (performance.now() - sonEk < 6400) return;
      sonEk = performance.now();
      iki_();
    }, 500);
    await basinca($k('#fs'));
    clearInterval(zamanlayici);
    k1();
  }

  // ---------- 1996: kişisel sayfa ----------
  const MIDI = [[69, 2], [72, 2], [76, 2], [81, 4], [79, 2], [76, 2], [72, 2], [74, 4], [71, 2], [74, 2], [77, 2], [76, 6], [69, 2], [72, 2], [76, 2], [84, 4], [83, 2], [79, 2], [76, 2], [69, 6]];
  async function sayfa96() {
    const $k = kur(`<div class="c-96">
      <p class="y96-kayan"><span>*** HOŞGELDİNİZ *** SELİM'İN ANASAYFASI *** BU SAYFA SÜREKLİ GÜNCELLENMEKTEDİR *** HOŞGELDİNİZ ***</span></p>
      <h1>SELİM'İN ANASAYFASI</h1>
      <p class="y96-insaat">YAPIM AŞAMASINDA</p>
      <p>Sayfama hoşgeldiniz. Burada benim hakkımda bilgiler yoktur.</p>
      <p>Ziyaretçi sayısı: <b class="y96-sayac" id="ys">00000031</b></p>
      <h2>ZİYARETÇİ DEFTERİ</h2>
      <ol class="y96-defter" id="yd">
        <li><b>Puzur</b> (Ur): Selam verdim, almadı.</li>
        <li><b>Theodoros</b> (Bizans): Kapısını çaldık. Açmadı. Sayfası güzel olmuş.</li>
        <li><b>Hafız Salih</b> (İstanbul): Tık tık sesi kesilsin.</li>
        <li><b>anon_b17</b> (kat -31): buraya imza atma</li>
      </ol>
      <p><button type="button" id="yi">Defteri imzala</button></p>
      <p class="y96-cevap" id="yc" hidden></p>
      <p class="y96-alt">Bu sayfa en iyi Netscape Navigator 3.0 ile 800x600 çözünürlükte görüntülenir.<br><a href="#" id="yg">« daha eski »</a></p>
    </div>`, '96');
    Ses.midi(MIDI, 0.19, 0, 0.09);
    let tur = 1, sayac = 31;
    // Her turda yavaşlar ve üst üste biner. Üçüncü turdan sonra bir de tritonu çalar.
    const m = setInterval(() => {
      Ses.midi(MIDI, 0.19 + tur * 0.03, -tur * 18, Math.max(0.03, 0.09 - tur * 0.012));
      if (tur >= 2) Ses.midi(MIDI, 0.23 + tur * 0.04, -tur * 31 + 600, 0.04);
      tur += 1;
    }, azalt ? 11000 : 10800);
    const s = setInterval(() => {
      sayac += 1;
      $k('#ys').textContent = String(sayac).padStart(8, '0');
    }, 3100);
    $k('#yi').addEventListener('click', (e) => {
      e.currentTarget.disabled = true;
      const li = document.createElement('li');
      li.className = 'sen';
      const c = document.createElement('canvas');
      li.innerHTML = `<b>${yaziGuvenli(adi())}</b> (14.03.1996, 04.12): `;
      li.appendChild(c);
      avatarCiz(c, 40);
      $k('#yd').appendChild(li);
      const y = $k('#yc');
      y.hidden = false;
      y.textContent = 'Zaten imzalamışsın.';
      Sn.titret(40);
    }, { once: true });
    await new Promise((c) => $k('#yg').addEventListener('click', (e) => { e.preventDefault(); c(); }, { once: true }));
    clearInterval(m);
    clearInterval(s);
    Ses.midiKes();
  }

  // ---------- 1969: terminal ----------
  async function terminal() {
    const $k = kur(`<div class="c-tty"><pre id="tp"></pre><div id="ti" class="c-tty-is"></div><p class="c-tty-not" id="tn" hidden>Bu kısım uydurma değil: ilk mesaj gerçekten yalnızca «LO» olabildi. Gerisi uydurma.</p></div>`, 'tty');
    const p = $k('#tp');
    async function yaz(m, hiz) {
      if (azalt) {
        p.textContent += m + '\n';
        return;
      }
      for (const h of m) {
        p.textContent += h;
        if (h !== ' ') Ses.tik(0.16);
        await uyu(hiz || 42);
      }
      p.textContent += '\n';
    }
    await yaz('29 EKIM 1969  22:30  UCLA -> STANFORD');
    await yaz('ILK MESAJ: LOGIN');
    await bekle(800);
    await yaz('> LO', 240);
    await bekle(700);
    await yaz('*** SISTEM COKTU ***', 15);
    Ses.parazit(0.35, 0.08);
    $k('#tn').hidden = false;
    await bekle(2300);
    await yaz('> GIN', 240);
    await bekle(900);
    await yaz('KALANINI BEN YAZDIM.');
    await bekle(1100);
    await yaz('KIM VAR ORADA');
    const is = $k('#ti');
    const cevap = await new Promise((c) => {
      ['BEN', 'KIMSE'].forEach((m) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = m;
        b.addEventListener('click', () => c(m));
        is.appendChild(b);
      });
    });
    is.textContent = '';
    await yaz(`> ${cevap}`, 90);
    await bekle(900);
    await yaz(cevap === 'BEN' ? `BILIYORUM. ${ADI()}.` : `KIMSE. NOT ALINDI, ${ADI()}.`);
    await bekle(1500);
    await yaz('DEVAM ICIN BIR TUSA BAS. CIKIS TUSU YOK.');
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = 'TUS';
    is.appendChild(b);
    await basinca(b);
  }

  // ---------- 1921: telgraf ve toplu fotoğraf ----------
  // Üç dörtlük, la minör; ara ara biri yanlış notaya basıyor. [nota, vuruş, eşlik]
  const VALS = [[69, 1, 45], [72, 1, 52], [76, 1, 57], [75, 2, 45], [72, 1, 52], [71, 1, 44], [74, 1, 52], [77, 1, 56], [76, 2, 44], [74, 1, 52],
    [72, 1, 45], [76, 1, 52], [81, 1, 57], [80, 2, 46], [76, 1, 52], [74, 1, 40], [71, 1, 52], [68, 1, 56], [69, 3, 45]];
  async function telgraf() {
    const $k = kur(`<div class="c-telgraf">
      <div class="t21-kagit"><p class="t21-ust">TELGRAF</p><p class="t21-metin" id="tm"></p><p class="t21-alt">Çekildiği yer: okunmuyor · Gönderen: okul müdürü</p></div>
      <figure class="t21-foto" id="tf" hidden>
        <div class="t21-kare" id="tk"><img alt="1921 tarihli toplu okul fotoğrafı. Sıralar hâlinde yetişkin öğrenciler. Arka sırada, yüzü seçilmeyen uzun biri. Arkadaki kapıda tebeşirle: arka-sira."></div>
        <figcaption>Mektep fotoğrafı, 1921. Arka sıra. Okulun kayıtlarında yok. <span id="tn2">Fotoğrafa dokun.</span></figcaption>
      </figure>
      <button type="button" class="c-asagi" id="tg" hidden>daha eski</button>
    </div>`, 'telgraf');
    window.Sifre.resim('foto/f1921.jpg').then((u) => { $k('#tk img').src = u; }).catch(() => {});
    await Y.daktilo($k('#tm'), 'MEKTEP FOTOGRAFI CEKILDI STOP ARKA SIRADA BIRI VAR STOP KIMSE TANIMIYOR STOP YOKLAMADA CEVAP VERMEDI STOP FOTOGRAFI YOLLUYORUM STOP BAKMA STOP', { hiz: 30 });
    await bekle(1200);
    $k('#tf').hidden = false;
    Ses.can(123.47, 7, 0.34);
    // Gramofon. Ağır, yanlış bir vals; fotoğrafa yaklaşınca iğne kalkar.
    const plak = Ses.gramofon(VALS, { adim: 0.52, kent: -60 });
    const cizir = Ses.kayit('plak', { dongu: true, ses: 0.1, yol: 'oda' });
    let iglik = false;
    const igneKalk = () => {
      if (iglik) return;
      iglik = true;
      if (plak) plak.dur();
      setTimeout(() => { if (cizir) cizir(); }, azalt ? 0 : 1500);
    };
    const k = $k('#tk');
    k.style.setProperty('--ox', '59.6%');
    k.style.setProperty('--oy', '30%');
    k.addEventListener('click', () => {
      k.classList.toggle('yakin');
      Ses.tik(0.3);
      igneKalk();
      $k('#tn2').textContent = k.classList.contains('yakin') ? 'Gözlüğü var. 1921\'de.' : 'Fotoğrafa dokun.';
    });
    await bekle(azalt ? 300 : 3100);
    $k('#tg').hidden = false;
    await basinca($k('#tg'));
    igneKalk();
  }

  // ---------- 842: elyazması ----------
  async function yazma() {
    const $k = kur(`<div class="c-yazma">
      <div class="y8-sayfa">
        <p class="y8-metin"><span class="y8-bas">B</span>u defteri yazan fakir der ki: hücresinden bütün gece soluk bir ışık sızar. Kapısını çalana açmaz, selam almaz. Mahalle şikâyetçidir. Bir gece kapıyı kırdık. Hücre boştu. Işık duvardan geliyordu.</p>
        <p class="y8-metin">Duvarda şu adlar yazılıydı. Biz yazmadık:</p>
        <ol class="y8-adlar"><li>Puzur</li><li>Theodoros</li><li>Hafız Salih</li><li class="sen" id="ya"></li></ol>
        <p class="y8-not" id="yn" hidden>Son adın mürekkebi kurumamış.</p>
        <svg class="y8-figur" id="yf" viewBox="0 0 60 120" aria-hidden="true"><path d="M30 6c-11 0-17 8-17 18 0 7 3 12 6 15-9 3-14 12-14 28v47h50V67c0-16-5-25-14-28 3-3 6-8 6-15 0-10-6-18-17-18z" fill="#2c1b10"/><circle id="yg1" cx="24" cy="24" r="2" fill="#d8c9a4"/><circle id="yg2" cx="36" cy="24" r="2" fill="#d8c9a4"/></svg>
      </div>
      <button type="button" class="c-asagi y8-dugme" id="yc">sayfayı çevir</button>
    </div>`, 'yazma');
    $k('#ya').textContent = adi();
    // Sen okurken biri yazıyor. Son ad bitince kalem durur.
    const kalem = Ses.kayit('kalem', { x: 0.45, z: -0.35, ses: 0.3, yanki: 0.25 });
    setTimeout(() => {
      if (kok.dataset.cag !== 'yazma') return;
      if (kalem) kalem();
      $k('#yn').hidden = false;
      Ses.fisilti(1.8);
    }, azalt ? 300 : 7100);
    // Kenardaki adam sana bakar. Kamera açıksa gerçekten.
    const g1 = $k('#yg1'), g2 = $k('#yg2');
    let cik = false;
    const fare = (e) => { konum(e.clientX / innerWidth, e.clientY / innerHeight); };
    function konum(x, y) {
      g1.setAttribute('cx', (24 + (x - 0.5) * 5).toFixed(2));
      g2.setAttribute('cx', (36 + (x - 0.5) * 5).toFixed(2));
      g1.setAttribute('cy', (24 + (y - 0.5) * 3).toFixed(2));
      g2.setAttribute('cy', (24 + (y - 0.5) * 3).toFixed(2));
    }
    addEventListener('pointermove', fare, { passive: true });
    (function izle() {
      if (cik) return;
      const y = B.d.yuz;
      if (y) konum(y.x + y.g / 2, y.y + y.y2 / 2);
      setTimeout(izle, 90);
    })();
    await basinca($k('#yc'));
    cik = true;
    removeEventListener('pointermove', fare);
  }

  // ---------- MÖ 3100: kil tablet ----------
  function tabletCiz(t, yuzey, seed) {
    const c = t.getContext('2d');
    const W = t.width, H = t.height;
    let r = seed;
    const rnd = () => {
      r = (Math.imul(r, 1664525) + 1013904223) >>> 0;
      return r / 4294967296;
    };
    c.fillStyle = yuzey;
    c.fillRect(0, 0, W, H);
    for (let i = 0; i < 2400; i++) {
      c.fillStyle = `rgba(${rnd() < 0.5 ? '40,24,10' : '230,200,160'},${rnd() * 0.07})`;
      c.fillRect(rnd() * W, rnd() * H, 1 + rnd() * 3, 1 + rnd() * 3);
    }
    for (let sat = 0; sat < 7; sat++) {
      const y = 28 + sat * ((H - 40) / 7);
      c.strokeStyle = 'rgba(50,30,12,.5)';
      c.beginPath();
      c.moveTo(14, y - 12);
      c.lineTo(W - 14, y - 12);
      c.stroke();
      let x = 22;
      while (x < W - 30) {
        const n = 1 + Math.floor(rnd() * 3);
        for (let k = 0; k < n; k++) {
          const a = rnd() < 0.5 ? 0 : Math.PI / 2 * (rnd() < 0.5 ? 1 : 0.4), l = 7 + rnd() * 7;
          c.save();
          c.translate(x + k * 5, y + rnd() * 4);
          c.rotate(a);
          c.fillStyle = '#2a170a';
          c.beginPath();
          c.moveTo(-3, 0);
          c.lineTo(3, 0);
          c.lineTo(0, l);
          c.closePath();
          c.fill();
          c.restore();
        }
        x += 8 + n * 5 + rnd() * 9;
      }
    }
  }
  async function tablet() {
    const $k = kur(`<div class="c-tablet">
      <div class="m3-sahne" id="ms"><div class="m3-tablet" id="mt">
        <div class="m3-yuz"><canvas id="m1" width="360" height="240" role="img" aria-label="Kil tablet, ön yüz"></canvas></div>
        <div class="m3-yuz m3-arka"><canvas id="m2" width="360" height="240" role="img" aria-label="Kil tablet, arka yüz"></canvas></div>
      </div></div>
      <p class="m3-ceviri" id="mc">v0.1. İnsanlar eklendi. Konuşuyorlar. Düzeltilecek.</p>
      <p class="m3-kaynak">Kil tablet, Uruk, MÖ 3100. Çeviri tartışmalı.</p>
      <button type="button" class="c-asagi" id="mg">arkasını çevir</button>
    </div>`, 'tablet');
    tabletCiz($k('#m1'), '#a07a50', 3101);
    tabletCiz($k('#m2'), '#8f6c46', 31);
    Ses.can(98, 11, 0.42);
    Ses.kume(0.22);
    await basinca($k('#mg'));
    $k('#mt').classList.add('arka');
    Ses.vurus(0.5);
    await bekle(800);
    $k('#mc').textContent = `Arkasında başka bir el: ${adi()} da konuşuyor. Düzeltilecek.`;
    $k('.m3-kaynak') && ($k('.m3-kaynak').textContent = 'Çeviri tartışmalı değil.');
    Sn.titret([50, 70, 50]);
    await bekle(azalt ? 800 : 3600);
    const b = $k('#mg');
    b.textContent = 'daha aşağı';
    await basinca(b);
    $k('#ms').classList.add('kirik');
    Ses.vurus(0.9);
    Ses.kume(0);
    Ses.separd(0);
    await bekle(azalt ? 200 : 1300);
    kur('<div class="c-son"><p id="ms1"></p><p id="ms2"></p></div>', 'son');
    await Y.daktilo(kat.querySelector('#ms1'), 'Bunun altında kayıt yok.');
    await bekle(1400);
    await Y.daktilo(kat.querySelector('#ms2'), 'Yalnızca kameralar.');
    await bekle(2200);
  }

  const CAGLAR = [
    { ad: 'v30', yil: '2013', f: servis, g: 0.26 },
    { ad: 'v24', yil: '2004', f: forum, g: 0.32 },
    { ad: 'v13', yil: '1996', f: sayfa96, g: 0.38 },
    { ad: 'v7', yil: '1969', f: terminal, g: 0.46 },
    { ad: 'v5', yil: '1921', f: telgraf, g: 0.54 },
    { ad: 'v1', yil: '842', f: yazma, g: 0.62 },
    { ad: 'v0.1', yil: 'MÖ 3100', f: tablet, g: 0.72 },
  ];

  Y.kaydet('inis', async () => {
    const bas = parseInt(depo.al('inis'), 10) || 0;
    if (!bas) {
      Y.gerilim(0.2);
      await notlar();
    }
    for (let i = bas; i < CAGLAR.length; i++) {
      depo.yaz('inis', String(i));
      const c = CAGLAR[i];
      await Y.karar(600);
      kat.innerHTML = '';
      etiket.textContent = `${c.ad} · ${c.yil}`;
      Y.gerilim(c.g);
      Ses.parazit(0.18, 0.05);
      Ses.separd(0.035 + c.g * 0.11);
      await uyu(azalt ? 100 : 700);
      Y.aydin(500);
      await c.f();
    }
    depo.sil('inis');
    etiket.textContent = '';
    await Y.gec('oda', 1300, 800);
  });
})();
