// Final: oyun çıktı. Jenerik, fotoğraflar, bir kapı daha.
(function () {
  'use strict';
  const O = window.Ortak, Ses = window.Ses, B = window.Bakis, D = window.Davet, Y = window.Yonetmen, S = window.Sifre;
  const { depo, azalt } = O;
  const $ = (s) => document.querySelector(s);
  const adi = () => D.ad() || O.misafir();
  const bekle = Y.bekle;

  // 1921 fotoğrafında arka sıradaki boş yüz. Fotoğrafa göre kesir.
  const FOTO = { src: 'assets/foto/f1921.jpg', yuz: { x: 0.658, y: 0.313, g: 0.03 } };
  const OLCEK = 2;
  // Bozuk müzik kutusu. Jenerikte «Müzik: yok» yazarken çalar.
  const KUTU = [[81, 1], [76, 1], [72, 1], [75, 2], [71, 1], [74, 1], [77, 1], [76, 2], [0, 1], [72, 1], [69, 1], [68, 2], [71, 1], [74, 1], [75, 1], [76, 3], [0, 2]];

  function foto1(tuval) {
    return new Promise((coz) => {
      const r = new Image();
      r.onload = () => {
        // İki kat çözünürlük: yaklaşınca yüz seçilsin.
        tuval.width = r.naturalWidth * OLCEK;
        tuval.height = r.naturalHeight * OLCEK;
        const c = tuval.getContext('2d', { willReadFrequently: true });
        c.drawImage(r, 0, 0, tuval.width, tuval.height);
        const W = tuval.width, H = tuval.height;
        const g = FOTO.yuz.g * W, h = g * 1.28;
        const x = FOTO.yuz.x * W - g / 2, y = FOTO.yuz.y * H - h / 2;
        const o = B.ozel.korku || B.ozel.kapaliGoz;
        if (o && o.kutu) {
          const [kx, ky, kg, kh] = o.kutu;
          // Yüzü al, küçült: eski fotoğraflarda kimse net değildir.
          const ara = document.createElement('canvas');
          ara.width = Math.max(8, Math.round(g));
          ara.height = Math.max(8, Math.round(h));
          const ac = ara.getContext('2d', { willReadFrequently: true });
          ac.drawImage(o.tuval, kx - kg * 0.06, ky - kh * 0.08, kg * 1.12, kh * 1.16, 0, 0, ara.width, ara.height);
          const v = ac.getImageData(0, 0, ara.width, ara.height), p = v.data;
          for (let j = 0, yy = 0; yy < ara.height; yy++) {
            for (let xx = 0; xx < ara.width; xx++, j += 4) {
              const l = (p[j] * 0.3 + p[j + 1] * 0.59 + p[j + 2] * 0.11) * 0.82 + 26 + (Math.random() - 0.5) * 16;
              const dx = (xx - ara.width / 2) / (ara.width / 2), dy = (yy - ara.height / 2) / (ara.height / 2);
              const q = dx * dx + dy * dy;
              p[j] = l * 1.02;
              p[j + 1] = l * 0.88;
              p[j + 2] = l * 0.68;
              p[j + 3] = q < 0.62 ? 255 : q > 1 ? 0 : 255 * (1 - (q - 0.62) / 0.38);
            }
          }
          ac.putImageData(v, 0, 0);
          c.drawImage(ara, x, y);
        } else {
          // Yüz vermedin: kazınmış.
          c.strokeStyle = 'rgba(232,214,178,.8)';
          c.lineWidth = Math.max(1.5, g / 14);
          for (let i = 0; i < 16; i++) {
            c.beginPath();
            c.moveTo(x + Math.random() * g, y + Math.random() * h * 0.3);
            c.lineTo(x + Math.random() * g, y + h * 0.7 + Math.random() * h * 0.3);
            c.stroke();
          }
        }
        c.font = `italic ${Math.round(H * 0.032)}px "EB Garamond", serif`;
        c.fillStyle = 'rgba(244,230,200,.92)';
        c.textAlign = 'right';
        c.fillText(`${adi()}, 1921.`, W - H * 0.03, H - H * 0.03);
        coz(true);
      };
      r.onerror = () => coz(false);
      r.src = FOTO.src;
    });
  }
  function foto2(tuval) {
    const o = B.ozel.korku;
    if (!o) return false;
    tuval.width = 480;
    tuval.height = 360;
    const c = tuval.getContext('2d', { willReadFrequently: true });
    c.drawImage(o.tuval, 0, 0);
    B.griIsle(c, 480, 360, { gurultu: 9 });
    c.font = '22px "VT323", monospace';
    c.fillStyle = '#e8e8e8';
    c.fillText(`CAM 16 · ${adi()}`, 12, 28);
    c.fillStyle = '#f0201a';
    c.fillText('REC', 430, 28);
    return o.puan;
  }

  function indir(tuval, ad) {
    tuval.toBlob((b) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(b);
      a.download = ad;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    }, 'image/jpeg', 0.9);
  }

  async function jenerik() {
    const j = $('#f-jenerik');
    j.textContent = '';
    const liste = D.liste();
    const npc = liste.length ? liste : [adi()];
    const SATIR = [
      ['b', 'proje_son_v31_final_bu_son'],
      ['', 'bir selimkadiryaar31 oyunu'],
      ['-', ''],
      ['k', 'Yapım'], ['', 'selimkadiryaar31'],
      ['k', 'Kod'], ['', 'selimkadiryaar31'],
      ['k', 'Diyaloglar'], ['', 'fix · çözdüm · tamam'],
      ['k', 'Müzik'], ['', 'yok'],
      ['k', 'Yoklama'], ['', 'alınmadı'],
      ['-', ''],
      ['k', 'NPC\'ler'],
      ...npc.map((a) => ['', a]),
      ['-', ''],
      ['k', 'Özel teşekkür'], ['', 'çağlar boyu hor görenlere'],
      ['-', ''],
      ['', 'Kimse cevap alamadı.'],
      ['', 'Değeri ancak bugün anlaşıldı.'],
    ];
    const kutu = document.createElement('div');
    kutu.className = 'f-kayan';
    SATIR.forEach(([t, m]) => {
      const p = document.createElement('p');
      if (t === 'b') p.className = 'f-j-baslik';
      if (t === 'k') p.className = 'f-j-kategori';
      if (t === '-') p.className = 'f-j-bosluk';
      p.textContent = m;
      kutu.appendChild(p);
    });
    j.appendChild(kutu);
    const atla = document.createElement('button');
    atla.type = 'button';
    atla.className = 'f-atla';
    atla.textContent = 'atla';
    j.appendChild(atla);
    const kutuSes = Ses.kutu(KUTU, { adim: 0.31, yavas: 1.0035, tur: 7, ses: 0.15 });
    await new Promise((coz) => {
      let bitti = false;
      const son = () => {
        if (bitti) return;
        bitti = true;
        if (kutuSes) kutuSes.dur();
        coz();
      };
      atla.addEventListener('click', son);
      if (azalt) {
        kutu.classList.add('duragan');
        return;
      }
      const sure = Math.max(26000, SATIR.length * 1200);
      kutu.style.animationDuration = `${sure}ms`;
      kutu.addEventListener('animationend', son);
    });
    j.textContent = '';
  }

  Y.kaydet('final', async () => {
    Y.gerilim(0.05);
    const son = (() => { try { return JSON.parse(depo.al('sonuc') || '{}'); } catch (e) { return {}; } })();
    const gelisBas = parseInt(depo.al('gecebas'), 10) || 0;
    const kameraAcikti = B.acikMi() || !!B.ozel.korku;
    // Kamera burada biter. Kareler bu sekmede, indirmezsen sekmeyle gider.
    if (B.acikMi()) B.durdur();
    $('#f-sonra').hidden = true;
    const j = $('#f-jenerik');
    j.textContent = '';
    const notP = document.createElement('p');
    notP.className = 'f-kamera-not';
    j.appendChild(notP);
    if (kameraAcikti) {
      await Y.daktilo(notP, 'Kamera kapandı.');
      await bekle(1500);
    }
    await Y.daktilo(notP, 'selimkadiryaar31 yazıyor…', { ses: false });
    await bekle(azalt ? 300 : 6200);
    notP.textContent = 'tamam';
    Ses.can(174.61, 12, 0.5);
    await bekle(2600);
    await jenerik();

    $('#f-sonra').hidden = false;
    scrollTo(0, 0);
    const t1 = $('#f-t1'), t2 = $('#f-t2');
    const f1 = await foto1(t1);
    if (f1) {
      $('#f-foto1').hidden = false;
      t1.setAttribute('aria-label', 'Eski bir toplu fotoğraf. Arka sırada yüzü olmayan biri, yanında sen.');
      // Önce bütünü, sonra arka sıra: yanındaki kim, sen kimsin.
      const kare = $('#f-k1');
      kare.style.setProperty('--ox', `${FOTO.yuz.x * 100 - 3}%`);
      kare.style.setProperty('--oy', `${FOTO.yuz.y * 100}%`);
      setTimeout(() => { kare.classList.add('yakin'); Ses.can(116.54, 8, 0.3); }, azalt ? 300 : 3100);
      kare.addEventListener('click', () => kare.classList.toggle('yakin'));
      const yuzVar = !!(B.ozel.korku || B.ozel.kapaliGoz);
      const verdi = B.izin.al() === 'evet';
      $('#f-c1').textContent = yuzVar ? `Arşivin son fotoğrafı. Arka sıra. ${adi()}, sen 1921'de nasıl oradaydın?`
        : verdi ? 'Arşivin son fotoğrafı. Arka sırada biri var, yüzü kazınmış. O kareler sekmeyle gitti. Altında adın yazıyor.'
          : 'Arşivin son fotoğrafı. Arka sırada biri var, yüzü kazınmış. Yüz vermedin. Altında adın yazıyor.';
    }
    const p = foto2(t2);
    if (p !== false) {
      $('#f-foto2').hidden = false;
      t2.setAttribute('aria-label', 'Gece boyunca kameranın yakaladığı en korkmuş karen.');
      $('#f-c2').textContent = p > 0.55 ? 'Gecenin en korkmuş karen.' : 'Gecenin en az sıkılmış karen.';
      $('#f-gizlilik').textContent = 'Bu kareler yalnızca bu sekmede duruyor. Hiçbir yere gitmedi. İndirmezsen sekmeyle birlikte silinir.';
    }
    document.querySelectorAll('[data-indir]').forEach((b) => {
      b.addEventListener('click', () => {
        if (b.dataset.indir === '1') indir(t1, `${adi()}_1921.jpg`);
        else indir(t2, `${adi()}_cam16.jpg`);
      });
    });

    // Rapor: mağaza sayfasına döner.
    const dl = $('#f-rapor');
    dl.textContent = '';
    const sure = gelisBas ? Date.now() - gelisBas : 0;
    const rapor = [
      ['Oynama süresi', sure ? `${Math.max(1, Math.round(sure / 60000))} dk` : '-'],
      ['Gece sonu', son.kipirdadi ? 'yakalandın' : son.kacti ? 'kaçtın' : 'gitti'],
    ];
    if (kameraAcikti) rapor.push(['Göz kırpma', String(B.d.kirpma)]);
    if (depo.al('arkana')) rapor.push(['Arkana baktın', 'gitmemişti']);
    rapor.forEach(([a, b]) => {
      const dv = document.createElement('div');
      const dt = document.createElement('dt');
      dt.textContent = a;
      const dd = document.createElement('dd');
      dd.textContent = b;
      dv.append(dt, dd);
      dl.appendChild(dv);
    });
    depo.yaz('rapor', JSON.stringify({ bitti: Date.now(), sure, kipirdadi: !!son.kipirdadi }));

    // Bir kapı daha: tek kişiyle açılmaz.
    const kapiYazi = $('#f-kapi-yazi');
    const parca = D.parca();
    if (parca) {
      kapiYazi.textContent = `Bu kapı tek kişiyle açılmaz. Sendeki parça: ${parca.yazi} (${parca.sira}/${parca.toplam}). Kalanı başkalarında. Gruba sor.`;
    } else {
      kapiYazi.textContent = 'Bu kapı tek kişiyle açılmaz. Parçalar davet edilenlerde.';
    }
    $('#f-kapi-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const k = S.kodSade($('#f-kapi-girdi').value);
      if (!k) return;
      location.href = encodeURIComponent(k);
    });
    $('#f-bastan').addEventListener('click', () => {
      ['perde', 'rapor', 'inis', 'sonuc', 'arkana', 'oda-uzak', 'odasaat'].forEach((k) => depo.sil(k));
      location.href = './';
    });
    $('#f-sil').addEventListener('click', () => {
      O.unut();
      try { sessionStorage.clear(); } catch (h) { /* gizli sekme */ }
      D.unut();
      B.karelerSil();
      location.href = './';
    });
  });
})();
