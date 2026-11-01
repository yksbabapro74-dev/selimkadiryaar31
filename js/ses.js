// Ses: dosya yok, her şey burada üretilir. Yalnızca kullanıcı jestiyle başlar.
// Uğultu, taş odada koro, çan, uzaktan klavye tıkırtısı, fısıltı, kalp, çığlık.
window.Ses = (function () {
  'use strict';
  const { depo, yay, gerilim } = window.Ortak;
  const AC = window.AudioContext || window.webkitAudioContext;

  function gurultu(c, sn, kahve) {
    const n = Math.floor(c.sampleRate * sn);
    const b = c.createBuffer(1, n, c.sampleRate);
    const d = b.getChannelData(0);
    let son = 0;
    for (let i = 0; i < n; i++) {
      const w = Math.random() * 2 - 1;
      if (kahve) {
        son = (son + 0.02 * w) / 1.02;
        d[i] = son * 3.5;
      } else d[i] = w;
    }
    return b;
  }

  // Taş oda: yavaş söner, tizi çabuk ölür.
  function yankiYap(c, sn, dusus) {
    const n = Math.floor(c.sampleRate * sn);
    const b = c.createBuffer(2, n, c.sampleRate);
    for (let k = 0; k < 2; k++) {
      const d = b.getChannelData(k);
      let yumus = 0;
      for (let i = 0; i < n; i++) {
        const t = i / n;
        yumus += (Math.random() * 2 - 1 - yumus) * (0.5 * (1 - t) + 0.04);
        d[i] = yumus * Math.pow(1 - t, dusus);
      }
    }
    return b;
  }

  // Risset'in çan kısmileri: [oran, genlik, süre, Hz kayması]
  const CAN = [
    [0.56, 1, 1, 0], [0.56, 0.67, 0.9, 1], [0.92, 1, 0.65, 0], [0.92, 1.8, 0.55, 1.7], [1.19, 2.67, 0.325, 0],
    [1.7, 1.67, 0.35, 0], [2, 1.46, 0.25, 0], [2.74, 1.33, 0.2, 0], [3, 1.33, 0.15, 0], [3.76, 1, 0.1, 0], [4.07, 1.33, 0.075, 0],
  ];
  const AKOR = [
    [164.81, 174.61, 233.08, 246.94],
    [146.83, 155.56, 207.65, 220],
    [164.81, 196, 233.08, 277.18],
    [130.81, 138.59, 196, 207.65],
  ];
  const ANA_SES = 0.9;
  // Uğultu ve koro olayların altında durur. Üstüne çıkarsa sınırlayıcıyı doldurur;
  // o zaman ne fısıltı duyulur ne tıkırtı, çığlık da uğultudan farksız kalır.
  const ORTAM_SES = 0.13;
  const CIGLIK_SES = 0.8;
  // Arkandaki soluk. Sessizlikte duyulur; bağırmaz.
  const NEFES_SES = 0.32;

  function Motor(c) {
    const g = (v) => { const k = c.createGain(); k.gain.value = v; return k; };
    const simdi = () => c.currentTime;

    const sinir = c.createDynamicsCompressor();
    // Yalnızca tavan: normal seste dokunmaz, ani tepeleri keser.
    sinir.threshold.value = -6;
    sinir.knee.value = 3;
    sinir.ratio.value = 20;
    sinir.attack.value = 0.003;
    sinir.release.value = 0.2;
    sinir.connect(c.destination);

    const ana = g(0);
    ana.connect(sinir);
    const kuru = g(1);
    kuru.connect(ana);
    const konv = c.createConvolver();
    konv.buffer = yankiYap(c, 6, 2.6);
    const islak = g(0.9);
    konv.connect(islak);
    islak.connect(ana);
    // Çığlık sessizliği deler: ana kazancı atlar.
    const delen = g(CIGLIK_SES);
    delen.connect(sinir);
    // Yakın yol: arkadan gelenler ortam kısılınca kısılmaz. Asıl o zaman duyulur.
    const yakin = g(0);
    yakin.connect(sinir);
    const nefesYol = g(1);
    nefesYol.connect(yakin);

    const konum = (p, x, y, z, t) => {
      if (p.positionX) {
        p.positionX.setValueAtTime(x, t);
        p.positionY.setValueAtTime(y, t);
        p.positionZ.setValueAtTime(z, t);
      } else p.setPosition(x, y, z);
    };
    // Dinleyen -z'ye bakar: +z tam arkası, +x sağ omzu. Kulaklıkla anlaşılır.
    function uzayda(x, y, z, t) {
      const p = c.createPanner();
      p.panningModel = 'HRTF';
      p.distanceModel = 'inverse';
      p.refDistance = 0.45;
      p.rolloffFactor = 1;
      konum(p, x, y, z, t === undefined ? c.currentTime : t);
      return p;
    }
    // HRTF verisi ilk kullanımda arkadan yüklenir; o ana kalmasın.
    uzayda(0, 0, 1);

    const beyaz = gurultu(c, 3, false), kahve = gurultu(c, 4, true);
    const kaynaklar = [];
    function osc(tur, f, det, ses, hedef) {
      const o = c.createOscillator();
      o.type = tur;
      o.frequency.value = f;
      o.detune.value = det;
      const k = g(ses);
      o.connect(k);
      k.connect(hedef);
      kaynaklar.push(o);
      return o;
    }

    const ortam = g(ORTAM_SES);
    ortam.connect(kuru);
    const ortamYanki = g(ORTAM_SES);
    ortamYanki.connect(konv);

    // --- uğultu: alt oktav, üstünde tritonlu bir testere
    const ugultu = g(0);
    ugultu.connect(ortam);
    const ugultuIslak = g(0.2);
    ugultu.connect(ugultuIslak);
    ugultuIslak.connect(ortamYanki);
    const suzgec = c.createBiquadFilter();
    suzgec.type = 'lowpass';
    suzgec.frequency.value = 170;
    suzgec.Q.value = 1.4;
    suzgec.connect(ugultu);
    osc('sine', 41.2, 0, 0.42, ugultu);
    osc('sawtooth', 82.41, -7, 0.17, suzgec);
    osc('sawtooth', 82.41, 6, 0.17, suzgec);
    osc('sawtooth', 116.54, 3, 0.1, suzgec);
    osc('triangle', 55, 0, 0.14, suzgec);
    const lfo = c.createOscillator();
    lfo.frequency.value = 0.071;
    const lfoK = g(65);
    lfo.connect(lfoK);
    lfoK.connect(suzgec.frequency);
    kaynaklar.push(lfo);
    const lfo2 = c.createOscillator();
    lfo2.frequency.value = 0.031;
    const lfo2K = g(0.09);
    lfo2.connect(lfo2K);
    lfo2K.connect(ugultu.gain);
    kaynaklar.push(lfo2);
    // Hava: odanın kendisi
    const hava = c.createBufferSource();
    hava.buffer = kahve;
    hava.loop = true;
    const havaS = c.createBiquadFilter();
    havaS.type = 'lowpass';
    havaS.frequency.value = 420;
    const havaK = g(0.16);
    hava.connect(havaS);
    havaS.connect(havaK);
    havaK.connect(ugultu);
    kaynaklar.push(hava);

    // --- koro: dört testere, «o» ünlüsünün formantlarından geçer
    const koro = g(0);
    const koroGiris = g(0.5);
    [[420, 9, 1], [820, 11, 0.55], [2700, 16, 0.14]].forEach(([f, q, k]) => {
      const b = c.createBiquadFilter();
      b.type = 'bandpass';
      b.frequency.value = f;
      b.Q.value = q;
      const m = g(k);
      koroGiris.connect(b);
      b.connect(m);
      m.connect(koro);
    });
    const koroKuru = g(0.4);
    koro.connect(koroKuru);
    koroKuru.connect(ortam);
    const koroIslak = g(1);
    koro.connect(koroIslak);
    koroIslak.connect(ortamYanki);
    const notalar = AKOR[0].map((f, i) => osc('sawtooth', f, (i - 1.5) * 4, 0.3, koroGiris));
    const vib = c.createOscillator();
    vib.frequency.value = 4.6;
    const vibK = g(1.1);
    vib.connect(vibK);
    notalar.forEach((o) => vibK.connect(o.frequency));
    kaynaklar.push(vib);
    function koroSirala(bas, adet) {
      for (let i = 0; i < adet; i++) {
        const a = AKOR[(i * 3 + (i >> 2)) % 4], t = bas + i * 13;
        notalar.forEach((o, k) => o.frequency.setTargetAtTime(a[k], t, 1.6));
      }
    }

    // --- tıkırtı yolu: kes dendiğinde hemen susar
    const tikYol = g(1);
    const tikKuru = g(0.4);
    tikYol.connect(tikKuru);
    tikKuru.connect(kuru);
    const tikIslak = g(1.3);
    tikYol.connect(tikIslak);
    tikIslak.connect(konv);

    let basladi = false, separdK = null, kumeD = null, cinD = null;
    return {
      basla(t) {
        if (basladi) return;
        basladi = true;
        const b = t === undefined ? simdi() : t;
        kaynaklar.forEach((o) => o.start(b));
        koroSirala(b + 13, 140);
      },
      ac(t) {
        const b = t === undefined ? simdi() : t;
        ana.gain.cancelScheduledValues(b);
        ana.gain.setTargetAtTime(ANA_SES, b, 0.12);
        yakin.gain.cancelScheduledValues(b);
        yakin.gain.setTargetAtTime(1, b, 0.05);
      },
      kapat() {
        ana.gain.cancelScheduledValues(simdi());
        ana.gain.setTargetAtTime(0, simdi(), 0.05);
        yakin.gain.cancelScheduledValues(simdi());
        yakin.gain.setTargetAtTime(0, simdi(), 0.02);
      },
      // Yaklaştıkça oda susar.
      ortamKis(p, t) {
        const b = t === undefined ? simdi() : t;
        ortam.gain.setTargetAtTime(ORTAM_SES * p, b, 2.5);
        ortamYanki.gain.setTargetAtTime(ORTAM_SES * p, b, 2.5);
      },
      // Bir adım: topuk, sonra taban. Uzaktaysa odada yankılanır, yakındaysa kuru.
      adim(x, z, ses, t) {
        const b = t === undefined ? simdi() : t;
        const p = uzayda(x, -0.9, z, b);
        // Uzaktan da duyulsun: uğultunun altında kalmaz.
        p.refDistance = 1.5;
        p.connect(yakin);
        const yank = g(Math.min(0.5, Math.hypot(x, z) * 0.11));
        p.connect(yank);
        yank.connect(konv);
        const o = c.createOscillator();
        o.frequency.setValueAtTime(105, b);
        o.frequency.exponentialRampToValueAtTime(46, b + 0.1);
        const e = c.createGain();
        e.gain.setValueAtTime(0, b);
        e.gain.linearRampToValueAtTime(ses, b + 0.008);
        e.gain.exponentialRampToValueAtTime(0.0001, b + 0.17);
        o.connect(e);
        e.connect(p);
        o.start(b);
        o.stop(b + 0.2);
        const s = c.createBufferSource();
        s.buffer = beyaz;
        const bp = c.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = 520 + Math.random() * 420;
        bp.Q.value = 0.9;
        const e2 = c.createGain();
        e2.gain.setValueAtTime(0, b + 0.02);
        e2.gain.linearRampToValueAtTime(ses * 0.5, b + 0.045);
        e2.gain.exponentialRampToValueAtTime(0.0001, b + 0.16);
        s.connect(bp);
        bp.connect(e2);
        e2.connect(p);
        s.start(b + 0.02, Math.random() * 2.5, 0.16);
      },
      // Üç, sonra bir. 11111'in içi değil ama kapıda böyle duyulur.
      kapiVur(x, z, t) {
        const b = t === undefined ? simdi() : t;
        const p = uzayda(x, 0, z, b);
        p.refDistance = 1.5;
        p.connect(yakin);
        const yank = g(0.45);
        p.connect(yank);
        yank.connect(konv);
        [0, 0.31, 0.62, 1.55].forEach((d) => {
          const o = c.createOscillator();
          o.type = 'triangle';
          o.frequency.setValueAtTime(190, b + d);
          o.frequency.exponentialRampToValueAtTime(118, b + d + 0.07);
          const e = c.createGain();
          e.gain.setValueAtTime(0, b + d);
          e.gain.linearRampToValueAtTime(0.38, b + d + 0.004);
          e.gain.exponentialRampToValueAtTime(0.0001, b + d + 0.11);
          o.connect(e);
          e.connect(p);
          o.start(b + d);
          o.stop(b + d + 0.13);
          const s = c.createBufferSource();
          s.buffer = beyaz;
          const bp = c.createBiquadFilter();
          bp.type = 'bandpass';
          bp.frequency.value = 880;
          bp.Q.value = 1.2;
          const e2 = c.createGain();
          e2.gain.setValueAtTime(0.25, b + d);
          e2.gain.exponentialRampToValueAtTime(0.0001, b + d + 0.05);
          s.connect(bp);
          bp.connect(e2);
          e2.connect(p);
          s.start(b + d, Math.random() * 2.5, 0.06);
        });
      },
      // Bir soluk: içeri, sonra dışarı. Sesi yok, yalnızca hava.
      nefes(x0, z0, x1, z1, ses, t) {
        const b = t === undefined ? simdi() : t;
        const p = uzayda(x0, 0.05, z0, b);
        if (p.positionX) {
          p.positionX.linearRampToValueAtTime(x1, b + 2.8);
          p.positionZ.linearRampToValueAtTime(z1, b + 2.8);
        }
        p.connect(nefesYol);
        const s = c.createBufferSource();
        s.buffer = beyaz;
        s.loop = true;
        const hp = c.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.value = 260;
        const bp = c.createBiquadFilter();
        bp.type = 'bandpass';
        bp.Q.value = 0.8;
        bp.frequency.setValueAtTime(1900, b);
        bp.frequency.setValueAtTime(1150, b + 1.1);
        bp.frequency.exponentialRampToValueAtTime(560, b + 2.8);
        const e = c.createGain();
        e.gain.setValueAtTime(0.0001, b);
        e.gain.linearRampToValueAtTime(ses * 0.55, b + 0.4);
        e.gain.linearRampToValueAtTime(ses * 0.4, b + 0.95);
        e.gain.linearRampToValueAtTime(0.0002, b + 1.1);
        e.gain.linearRampToValueAtTime(ses, b + 1.5);
        e.gain.exponentialRampToValueAtTime(0.0002, b + 2.8);
        s.connect(hp);
        hp.connect(bp);
        bp.connect(e);
        e.connect(p);
        s.start(b, Math.random() * 2);
        s.stop(b + 2.9);
      },
      // Sol omuzdan sağ omza geçer, her solukta biraz daha yakın.
      nefesle(adet, t) {
        const b = t === undefined ? simdi() : t;
        nefesYol.gain.cancelScheduledValues(b);
        nefesYol.gain.setValueAtTime(1, b);
        const n = Math.max(1, adet);
        for (let i = 0; i < n; i++) {
          const u0 = i / n, u1 = (i + 1) / n;
          this.nefes(-0.46 + 0.76 * u0, 0.44 - 0.2 * u0, -0.46 + 0.76 * u1, 0.44 - 0.2 * u1, NEFES_SES, b + i * 3.5);
        }
      },
      nefesKes() {
        nefesYol.gain.cancelScheduledValues(simdi());
        nefesYol.gain.setTargetAtTime(0, simdi(), 0.015);
      },
      nefesAc() {
        nefesYol.gain.cancelScheduledValues(simdi());
        nefesYol.gain.setValueAtTime(1, simdi() + 0.05);
      },
      // Kare dalga, tek ses. Notalar MIDI numarası; adim: bir birimin saniyesi.
      midi(notalar, adim, kent, ses, yol) {
        const b = simdi() + 0.05;
        const y = yol || (() => { const k = g(1); k.connect(kuru); return k; })();
        y.gain.cancelScheduledValues(b);
        y.gain.setValueAtTime(1, b);
        let z = b;
        notalar.forEach(([n, u]) => {
          const sure = u * adim;
          const o = c.createOscillator();
          o.type = 'square';
          o.frequency.value = 440 * 2 ** ((n - 69) / 12);
          o.detune.value = kent || 0;
          const e = c.createGain();
          e.gain.setValueAtTime(0, z);
          e.gain.linearRampToValueAtTime(ses, z + 0.008);
          e.gain.setValueAtTime(ses * 0.8, z + sure * 0.55);
          e.gain.linearRampToValueAtTime(0.0001, z + sure * 0.92);
          o.connect(e);
          e.connect(y);
          o.start(z);
          o.stop(z + sure);
          z += sure;
        });
        return y;
      },
      // --- gerçek kayıtlar (assets/ses/kayit, CC0) ---
      // x sağ omuz, z arka. s.yol: 'nefes' nefes yoluna, 'delen' sessizliği deler, verilmezse yakın yola.
      kayit(buf, s, t) {
        const b = t === undefined ? simdi() : t;
        const k = c.createBufferSource();
        k.buffer = buf;
        if (s.hiz) k.playbackRate.value = s.hiz;
        if (s.dongu) k.loop = true;
        const e = c.createGain();
        const ses = s.ses === undefined ? 0.5 : s.ses;
        e.gain.setValueAtTime(s.gir ? 0.0001 : ses, b);
        if (s.gir) e.gain.exponentialRampToValueAtTime(Math.max(0.0002, ses), b + s.gir);
        k.connect(e);
        const hedef = s.yol === 'nefes' ? nefesYol : s.yol === 'delen' ? delen : s.yol === 'oda' ? kuru : yakin;
        let cikis = e;
        if (s.x !== undefined || s.z !== undefined) {
          const p = uzayda(s.x || 0, s.y || 0, s.z === undefined ? 0.4 : s.z, b);
          p.refDistance = s.ref || 0.45;
          e.connect(p);
          cikis = p;
          if (s.x1 !== undefined && p.positionX && s.sure) {
            p.positionX.linearRampToValueAtTime(s.x1, b + s.sure);
            p.positionZ.linearRampToValueAtTime(s.z1 === undefined ? s.z : s.z1, b + s.sure);
          }
        }
        cikis.connect(hedef);
        if (s.yanki) {
          const y = g(s.yanki);
          cikis.connect(y);
          y.connect(konv);
        }
        k.start(b, s.ofset || 0, s.dongu ? undefined : s.sure);
        return () => {
          const n = simdi();
          e.gain.cancelScheduledValues(n);
          e.gain.setTargetAtTime(0, n, 0.03);
          try { k.stop(n + 0.3); } catch (h) { /* zaten bitti */ }
        };
      },
      // Hiç bitmeyen iniş: Shepard-Risset. Sürekli alçalır, hiç inmez. Ses yoksa çağrı boşa gider.
      separd(ses) {
        const b = simdi();
        if (!separdK) {
          const T = 9, N = 7, SR = 22050, fc = 196, sg = 1.15;
          const uz = Math.floor(T * SR);
          const tam = c.createBuffer(1, uz, SR);
          const d = tam.getChannelData(0);
          const fmax = fc * 2 ** (N / 2);
          for (let k = 0; k < N; k++) {
            for (let i = 0; i < uz; i++) {
              const u = i / SR + k * T;
              const f = fmax * 2 ** (-u / T);
              const fi = (2 * Math.PI * fmax * T / Math.LN2) * (1 - 2 ** (-u / T));
              const l = Math.log2(f / fc);
              const w = Math.exp(-(l * l) / (2 * sg * sg)) * Math.sin(Math.PI * u / (N * T)) ** 2;
              d[i] += w * Math.sin(fi);
            }
          }
          let tepe = 0;
          for (let i = 0; i < uz; i++) tepe = Math.max(tepe, Math.abs(d[i]));
          for (let i = 0; i < uz; i++) d[i] /= tepe || 1;
          separdK = g(0);
          separdK.connect(kuru);
          const yk = g(0.5);
          separdK.connect(yk);
          yk.connect(konv);
          // İki kopya, çok az farklı hızda: birbirini yavaşça döver.
          [1, 1.0043].forEach((h, n) => {
            const k = c.createBufferSource();
            k.buffer = tam;
            k.loop = true;
            k.playbackRate.value = h;
            const q = g(0.5);
            const pan = c.createStereoPanner();
            pan.pan.value = n ? 0.45 : -0.45;
            k.connect(q);
            q.connect(pan);
            pan.connect(separdK);
            k.start(b);
          });
        }
        separdK.gain.cancelScheduledValues(b);
        separdK.gain.setTargetAtTime(ses, b, ses > 0 ? 2.4 : 0.9);
      },
      // Küme: on iki ses, «ı» ünlüsünde, birbirine hiç oturmuyor. p yükseldikçe sıklaşır ve pürüzlenir.
      kume(p) {
        const b = simdi();
        if (!kumeD) {
          const top = g(0);
          const puruzK = g(1);
          const giris = g(1);
          [[360, 7, 1], [1740, 13, 0.7], [2460, 15, 0.42]].forEach(([f, q, k]) => {
            const bp = c.createBiquadFilter();
            bp.type = 'bandpass';
            bp.frequency.value = f;
            bp.Q.value = q;
            const m = g(k);
            giris.connect(bp);
            bp.connect(m);
            m.connect(puruzK);
          });
          puruzK.connect(top);
          const yanki = g(0.9);
          top.connect(g(0.6)).connect(kuru);
          top.connect(yanki);
          yanki.connect(konv);
          // Pürüz: 30-150 Hz arası genlik titremesi. Çığlığın oturduğu yer burası (Arnal vd., 2015).
          const puruz = c.createOscillator();
          puruz.frequency.value = 53;
          const puruzD = g(0);
          puruz.connect(puruzD);
          puruzD.connect(puruzK.gain);
          puruz.start(b);
          const sesler = [];
          for (let i = 0; i < 12; i++) {
            const o = c.createOscillator();
            o.type = 'sawtooth';
            o.frequency.value = 150 * 2 ** (Math.random() * 1.4);
            const k = g(0.085);
            o.connect(k);
            k.connect(giris);
            o.start(b);
            sesler.push(o);
          }
          kumeD = { top, puruz, puruzD, sesler, p: 0 };
          const kaydir = () => {
            const n = simdi();
            const tavan = 1 + kumeD.p * 1.2;
            sesler.forEach((o) => {
              o.frequency.setTargetAtTime(150 * 2 ** (Math.random() * tavan), n, 2.2 + Math.random() * 3);
            });
            puruz.frequency.setTargetAtTime(34 + Math.random() * 46, n, 1.5);
          };
          kaydir();
          kumeD.z = setInterval(kaydir, 5200);
        }
        kumeD.p = p;
        kumeD.top.gain.cancelScheduledValues(b);
        kumeD.top.gain.setTargetAtTime(p * 0.62, b, p > 0 ? 1.6 : 0.35);
        kumeD.puruzD.gain.setTargetAtTime(Math.max(0, p - 0.45) * 1.1, b, 1.4);
      },
      // Kulak çınlaması. Sağ ve sol biraz farklı. Çok kısık: yüksek değil, tuhaf olması gerekir.
      cinlama(p) {
        const b = simdi();
        if (!cinD) {
          const top = g(0);
          top.connect(yakin);
          [[6870, -0.8], [6912, 0.8]].forEach(([f, pan]) => {
            const o = c.createOscillator();
            o.frequency.value = f;
            const pn = c.createStereoPanner();
            pn.pan.value = pan;
            o.connect(pn);
            pn.connect(top);
            o.start(b);
          });
          cinD = top;
        }
        cinD.gain.cancelScheduledValues(b);
        cinD.gain.setTargetAtTime(Math.min(1, p) * 0.0085, b, p > 0 ? 2.2 : 0.02);
      },
      // Çığlığın kaba tınısı, sessizce. Ses yüksek değil, sinir bozucu.
      purus(sure, ses, pan, t) {
        const b = t === undefined ? simdi() : t;
        const e = g(0);
        const am = g(0.5);
        const lfo = c.createOscillator();
        lfo.frequency.setValueAtTime(38, b);
        lfo.frequency.linearRampToValueAtTime(92, b + sure);
        const lk = g(0.5);
        lfo.connect(lk);
        lk.connect(am.gain);
        const bp = c.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.setValueAtTime(820, b);
        bp.frequency.linearRampToValueAtTime(1480, b + sure);
        bp.Q.value = 2.2;
        const pn = c.createStereoPanner();
        pn.pan.value = pan || 0;
        [233.08, 246.94, 329.63].forEach((f) => {
          const o = c.createOscillator();
          o.type = 'sawtooth';
          o.frequency.value = f;
          o.connect(bp);
          o.start(b);
          o.stop(b + sure + 0.2);
        });
        lfo.start(b);
        lfo.stop(b + sure + 0.2);
        bp.connect(am);
        am.connect(e);
        e.connect(pn);
        pn.connect(kuru);
        e.gain.setValueAtTime(0.0001, b);
        e.gain.exponentialRampToValueAtTime(ses, b + sure * 0.7);
        e.gain.linearRampToValueAtTime(0, b + sure);
      },
      // Tersine bir nefes alma: büyür büyür, kesilir. Arkasından hiçbir şey gelmez.
      ters(sure, ses, t) {
        const b = t === undefined ? simdi() : t;
        const e = g(0);
        e.connect(kuru);
        const y = g(0.8);
        e.connect(y);
        y.connect(konv);
        const s = c.createBufferSource();
        s.buffer = beyaz;
        s.loop = true;
        const bp = c.createBiquadFilter();
        bp.type = 'bandpass';
        bp.Q.value = 1.1;
        bp.frequency.setValueAtTime(180, b);
        bp.frequency.exponentialRampToValueAtTime(3200, b + sure);
        s.connect(bp);
        bp.connect(e);
        [55, 77.78, 116.54, 164.81].forEach((f) => {
          const o = c.createOscillator();
          o.type = 'sawtooth';
          o.frequency.setValueAtTime(f * 0.5, b);
          o.frequency.exponentialRampToValueAtTime(f, b + sure);
          const k = g(0.22);
          o.connect(k);
          k.connect(e);
          o.start(b);
          o.stop(b + sure + 0.01);
        });
        e.gain.setValueAtTime(0.0002, b);
        e.gain.exponentialRampToValueAtTime(ses, b + sure);
        e.gain.setValueAtTime(0, b + sure + 0.004);
        s.start(b);
        s.stop(b + sure + 0.02);
      },
      // Müzik kutusu. Her dişte biraz daha yavaş, biraz daha yanlış. Bazı dişler kırık.
      kutu(notalar, sec, t) {
        const b = t === undefined ? simdi() + 0.05 : t;
        const s = sec || {};
        const yol = g(s.ses === undefined ? 0.16 : s.ses);
        yol.connect(kuru);
        const y = g(0.55);
        yol.connect(y);
        y.connect(konv);
        let z = b, adim = s.adim || 0.26, sap = 0, kirik = s.kirik || 0;
        const tur = s.tur || 4;
        const durdurucu = [];
        for (let u = 0; u < tur; u++) {
          notalar.forEach(([n, d]) => {
            sap -= 1.5 + Math.random() * 1.6;
            adim *= s.yavas || 1.006;
            kirik = Math.min(0.42, kirik + 0.0026);
            if (n && Math.random() > kirik) {
              const f = 440 * 2 ** ((n - 69) / 12) * 2 ** ((sap + (Math.random() - 0.5) * (6 + u * 12)) / 1200);
              [[1, 0.7, 1.5], [3.01, 0.2, 0.5], [6.27, 0.08, 0.16]].forEach(([r, a, tt]) => {
                const o = c.createOscillator();
                o.frequency.value = f * r;
                const e = c.createGain();
                e.gain.setValueAtTime(0, z);
                e.gain.linearRampToValueAtTime(a, z + 0.003);
                e.gain.exponentialRampToValueAtTime(0.0001, z + tt);
                o.connect(e);
                e.connect(yol);
                o.start(z);
                o.stop(z + tt + 0.05);
                durdurucu.push(o);
              });
            }
            z += d * adim;
          });
        }
        return {
          sure: z - b,
          dur: () => {
            yol.gain.cancelScheduledValues(simdi());
            yol.gain.setTargetAtTime(0, simdi(), 0.08);
          },
        };
      },
      // Gramofon: dar bant, ağır vals. İğne kalkınca plak yavaşlayıp durur.
      gramofon(notalar, sec) {
        const s = sec || {};
        const b = simdi() + 0.05;
        const top = g(s.ses === undefined ? 0.24 : s.ses);
        const hp = c.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.value = 340;
        const lp = c.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 2500;
        const biz = c.createWaveShaper();
        const egri = new Float32Array(257);
        for (let i = 0; i < 257; i++) {
          const x = (i - 128) / 128;
          egri[i] = Math.tanh(x * 2.4);
        }
        biz.curve = egri;
        const giris = g(0.5);
        giris.connect(biz);
        biz.connect(hp);
        hp.connect(lp);
        lp.connect(top);
        top.connect(kuru);
        const y = g(0.35);
        top.connect(y);
        y.connect(konv);
        // Her notanın kentini sürükleyen tek kaynak: titreme (wow) ve son duruş.
        const kent = c.createConstantSource ? c.createConstantSource() : null;
        const wowK = g(19);
        const wow = c.createOscillator();
        wow.frequency.value = 0.55;
        wow.connect(wowK);
        if (kent) {
          kent.offset.value = s.kent || 0;
          kent.start(b);
          wowK.connect(kent.offset);
        }
        wow.start(b);
        let z = b;
        const adim = s.adim || 0.5, tur = s.tur || 6;
        for (let u = 0; u < tur; u++) {
          notalar.forEach(([n, d, n2]) => {
            [n, n2].forEach((m, ic) => {
              if (!m) return;
              const o = c.createOscillator();
              o.type = 'triangle';
              o.frequency.value = 440 * 2 ** ((m - 69) / 12);
              if (kent) kent.connect(o.detune);
              const e = c.createGain();
              const a = ic ? 0.32 : 0.6;
              e.gain.setValueAtTime(0, z);
              e.gain.linearRampToValueAtTime(a, z + 0.03);
              e.gain.setTargetAtTime(a * 0.25, z + 0.06, d * adim * 0.5);
              e.gain.setTargetAtTime(0, z + d * adim * 0.85, 0.04);
              o.connect(e);
              e.connect(giris);
              o.start(z);
              o.stop(z + d * adim + 0.3);
            });
            z += d * adim;
          });
        }
        return {
          // Elle durdurulan plak: bir buçuk saniyede sürüklenip biter.
          dur: (hizli) => {
            const n = simdi(), sn = hizli ? 0.35 : 1.6;
            if (kent) {
              kent.offset.cancelScheduledValues(n);
              kent.offset.setValueAtTime(s.kent || 0, n);
              kent.offset.linearRampToValueAtTime(-3600, n + sn);
            }
            top.gain.cancelScheduledValues(n);
            top.gain.setValueAtTime(top.gain.value, n);
            top.gain.linearRampToValueAtTime(0, n + sn);
          },
        };
      },
      // 2004: hat çevriliyor.
      modem(t) {
        const b = t === undefined ? simdi() + 0.05 : t;
        const yol = g(0.05);
        yol.connect(kuru);
        const bp = c.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = 1500;
        bp.Q.value = 0.5;
        bp.connect(yol);
        const ton = (f, b0, sure, a) => {
          const o = c.createOscillator();
          o.frequency.value = f;
          const e = c.createGain();
          e.gain.setValueAtTime(a, b0);
          e.gain.setValueAtTime(0, b0 + sure);
          o.connect(e);
          e.connect(bp);
          o.start(b0);
          o.stop(b0 + sure + 0.02);
        };
        const DT = [[697, 1336], [770, 1209], [852, 1477], [941, 1336], [697, 1209], [770, 1477], [852, 1209]];
        DT.forEach(([f1, f2], i) => {
          ton(f1, b + i * 0.12, 0.08, 0.7);
          ton(f2, b + i * 0.12, 0.08, 0.7);
        });
        const z = b + DT.length * 0.12 + 0.4;
        ton(2100, z, 0.9, 0.7);
        ton(1200, z + 1, 0.3, 0.7);
        ton(2400, z + 1.3, 0.3, 0.7);
        const s = c.createBufferSource();
        s.buffer = beyaz;
        const e = c.createGain();
        e.gain.setValueAtTime(0.5, z + 1.7);
        e.gain.setValueAtTime(0, z + 3.2);
        s.connect(e);
        e.connect(bp);
        s.start(z + 1.7, 0, 1.6);
      },
      arkadanVer(akim, gecikme, ses) {
        const b = simdi();
        const kaynak = c.createMediaStreamSource(akim);
        const hp = c.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.value = 180;
        const lp = c.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 3400;
        const sik = c.createDynamicsCompressor();
        sik.threshold.value = -38;
        sik.ratio.value = 8;
        const gec = c.createDelay(Math.max(1, gecikme + 1));
        gec.delayTime.value = gecikme;
        const p = uzayda(0.18, 0, 0.5, b);
        const e = c.createGain();
        e.gain.setValueAtTime(0, b);
        e.gain.setTargetAtTime(ses, b, 1.2);
        kaynak.connect(hp);
        hp.connect(lp);
        lp.connect(sik);
        sik.connect(gec);
        gec.connect(e);
        e.connect(p);
        p.connect(yakin);
        return () => {
          e.gain.setTargetAtTime(0, simdi(), 0.05);
          setTimeout(() => { try { kaynak.disconnect(); e.disconnect(); p.disconnect(); } catch (h) { /* zaten koptu */ } }, 400);
        };
      },
      yukselt(p, t) {
        const b = t === undefined ? simdi() : t;
        ugultu.gain.setTargetAtTime(p * 0.62, b, 0.14);
        suzgec.frequency.setTargetAtTime(120 + p * 320, b, 0.14);
      },
      derinlik(d, t) {
        const b = t === undefined ? simdi() : t;
        ugultu.gain.setTargetAtTime(0.5 + 0.28 * d, b, 1.4);
        suzgec.frequency.setTargetAtTime(170 + 340 * d, b, 1.4);
        koro.gain.setTargetAtTime(Math.max(0, d - 0.04) * 0.75, b, 1.8);
      },
      sus(sn) {
        const b = simdi();
        ana.gain.cancelScheduledValues(b);
        ana.gain.setTargetAtTime(0, b, Math.max(0.01, sn / 3));
      },
      don(sn) {
        const b = simdi();
        ana.gain.cancelScheduledValues(b);
        ana.gain.setTargetAtTime(ANA_SES, b, Math.max(0.01, sn / 3));
      },
      can(f, sure, ses, t) {
        const b = t === undefined ? simdi() : t;
        const top = g(ses * 0.6);
        top.connect(kuru);
        const gonder = g(0.8);
        top.connect(gonder);
        gonder.connect(konv);
        CAN.forEach(([r, a, d, ek]) => {
          const o = c.createOscillator();
          o.frequency.value = f * r + ek;
          const k = c.createGain();
          k.gain.setValueAtTime(0, b);
          k.gain.linearRampToValueAtTime(a / 9, b + 0.006);
          k.gain.exponentialRampToValueAtTime(0.0001, b + sure * d);
          o.connect(k);
          k.connect(top);
          o.start(b);
          o.stop(b + sure * d + 0.1);
        });
      },
      vurus(guc, t) {
        const b = t === undefined ? simdi() : t;
        [[0, 1], [0.26, 0.62]].forEach(([d, k]) => {
          [[62, 36, 'sine', 1], [124, 70, 'triangle', 0.32]].forEach(([f0, f1, tur, oran]) => {
            const o = c.createOscillator();
            o.type = tur;
            o.frequency.setValueAtTime(f0, b + d);
            o.frequency.exponentialRampToValueAtTime(f1, b + d + 0.13);
            const e = c.createGain();
            e.gain.setValueAtTime(0, b + d);
            e.gain.linearRampToValueAtTime(guc * k * oran * 0.6, b + d + 0.012);
            e.gain.exponentialRampToValueAtTime(0.0001, b + d + 0.24);
            o.connect(e);
            e.connect(kuru);
            o.start(b + d);
            o.stop(b + d + 0.3);
          });
        });
      },
      tik(pan, ses, t) {
        const b = t === undefined ? simdi() : t;
        const s = c.createBufferSource();
        s.buffer = beyaz;
        const bp = c.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = 2200 + Math.random() * 1600;
        bp.Q.value = 1.1;
        const e = c.createGain();
        e.gain.setValueAtTime(0, b);
        e.gain.linearRampToValueAtTime(ses, b + 0.001);
        e.gain.exponentialRampToValueAtTime(0.0001, b + 0.03);
        const p = c.createStereoPanner();
        p.pan.value = pan;
        s.connect(bp);
        bp.connect(e);
        e.connect(p);
        p.connect(tikYol);
        s.start(b, Math.random() * 2.5, 0.04);
      },
      // Birisi uzakta yazıyor. Kıpırdarsan keser.
      tikirti(adet, pan, t) {
        const b = t === undefined ? simdi() : t;
        tikYol.gain.cancelScheduledValues(b);
        tikYol.gain.setValueAtTime(1, b);
        let z = b;
        for (let i = 0; i < adet; i++) {
          this.tik(pan, 0.3 + Math.random() * 0.4, z);
          z += 0.07 + Math.random() * 0.16 + (Math.random() < 0.08 ? 0.5 : 0);
        }
        return z - b;
      },
      tikKes() {
        tikYol.gain.cancelScheduledValues(simdi());
        tikYol.gain.setTargetAtTime(0, simdi(), 0.012);
      },
      fisilti(pan, sure, t) {
        const b = t === undefined ? simdi() : t;
        const s = c.createBufferSource();
        s.buffer = beyaz;
        s.loop = true;
        const bp = c.createBiquadFilter();
        bp.type = 'bandpass';
        bp.Q.value = 1.4;
        bp.frequency.value = 2600;
        const hp = c.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.value = 900;
        const e = c.createGain();
        e.gain.setValueAtTime(0.0001, b);
        let z = b;
        while (z < b + sure) {
          const d = 0.06 + Math.random() * 0.17;
          bp.frequency.setValueAtTime(1500 + Math.random() * 2600, z);
          e.gain.linearRampToValueAtTime(0.09 + Math.random() * 0.14, z + d * 0.35);
          e.gain.linearRampToValueAtTime(0.004, z + d);
          z += d + Math.random() * 0.05;
        }
        const p = c.createStereoPanner();
        p.pan.value = pan;
        s.connect(bp);
        bp.connect(hp);
        hp.connect(e);
        e.connect(p);
        const kk = g(1);
        p.connect(kk);
        kk.connect(kuru);
        const ii = g(1.1);
        p.connect(ii);
        ii.connect(konv);
        s.start(b);
        s.stop(b + sure + 0.1);
      },
      // Sinyal gitti.
      parazit(sure, ses, t) {
        const b = t === undefined ? simdi() : t;
        const s = c.createBufferSource();
        s.buffer = beyaz;
        s.loop = true;
        const bp = c.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = 3100;
        bp.Q.value = 0.5;
        const e = c.createGain();
        e.gain.setValueAtTime(0, b);
        e.gain.linearRampToValueAtTime(ses, b + 0.01);
        e.gain.setValueAtTime(ses, b + Math.max(0.02, sure - 0.03));
        e.gain.linearRampToValueAtTime(0, b + sure);
        s.connect(bp);
        bp.connect(e);
        e.connect(kuru);
        s.start(b);
        s.stop(b + sure + 0.02);
      },
      cigilik(ses, t) {
        const b = t === undefined ? simdi() : t;
        const top = g(ses);
        top.connect(delen);
        [587, 622, 880, 932, 1245, 1319].forEach((f) => {
          const o = c.createOscillator();
          o.type = 'sawtooth';
          o.frequency.setValueAtTime(f * 0.94, b);
          o.frequency.exponentialRampToValueAtTime(f * 1.07, b + 0.5);
          const e = c.createGain();
          e.gain.setValueAtTime(0, b);
          e.gain.linearRampToValueAtTime(0.13, b + 0.005);
          e.gain.exponentialRampToValueAtTime(0.0001, b + 0.72 + Math.random() * 0.2);
          o.connect(e);
          e.connect(top);
          o.start(b);
          o.stop(b + 1);
        });
        const s = c.createBufferSource();
        s.buffer = beyaz;
        const hp = c.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.value = 1800;
        const e = c.createGain();
        e.gain.setValueAtTime(0.42, b);
        e.gain.exponentialRampToValueAtTime(0.0001, b + 0.5);
        s.connect(hp);
        hp.connect(e);
        e.connect(top);
        s.start(b, 0, 0.55);
        const o = c.createOscillator();
        o.frequency.setValueAtTime(72, b);
        o.frequency.exponentialRampToValueAtTime(30, b + 0.6);
        const e2 = c.createGain();
        e2.gain.setValueAtTime(0.75, b);
        e2.gain.exponentialRampToValueAtTime(0.0001, b + 0.7);
        o.connect(e2);
        e2.connect(top);
        o.start(b);
        o.stop(b + 0.75);
      },
    };
  }

  // ---------- canlı katman ----------
  let c = null, motor = null, acik = false, derin = 0, sonHareket = 0, kalpZaman = 0, tikBitis = 0, midiYol = null;

  function hayat() {
    // Hiç kıpırdamadan duran birini duymaya başlarsın.
    const hareket = () => {
      sonHareket = performance.now();
      if (acik && motor && c.currentTime < tikBitis) {
        motor.tikKes();
        tikBitis = 0;
      }
    };
    ['pointermove', 'keydown', 'wheel', 'touchstart'].forEach((o) => addEventListener(o, hareket, { passive: true }));
    (function tikDongu() {
      setTimeout(() => {
        if (acik && !document.hidden && !gerilim.sus && performance.now() - sonHareket > 1400) {
          const sure = motor.tikirti(8 + Math.floor(Math.random() * 26), Math.random() * 1.2 - 0.6);
          tikBitis = c.currentTime + sure;
        }
        tikDongu();
      }, 5000 + Math.random() * 11000);
    })();
    (function fisDongu() {
      setTimeout(() => {
        if (acik && !document.hidden && !gerilim.sus && gerilim.seviye < 5 && derin > 0.15) motor.fisilti(Math.random() * 1.6 - 0.8, 1.6 + Math.random() * 1.8);
        fisDongu();
      }, 19000 + Math.random() * 26000);
    })();
    setInterval(() => {
      if (acik && !document.hidden && !gerilim.sus && gerilim.seviye < 5) motor.can(87.31, 11, 0.2 + derin * 0.16);
    }, 31000);
    document.addEventListener('visibilitychange', () => {
      if (!c) return;
      if (document.hidden) c.suspend();
      else if (acik) c.resume();
    });
  }

  // Gerçek kayıtlar arkadan, sırayla iner. İnmediyse sentez ya da sessizlik: sayfa beklemez.
  const KAYITLAR = ['adim1', 'adim2', 'adim3', 'adim4', 'adimu1', 'adimu2', 'tokez', 'nefes', 'nefes2', 'soluk', 'panik', 'kokla', 'sus',
    'ciglik', 'yutkun', 'gulp', 'omuz', 'kazima', 'kazima2', 'vur', 'kumas1', 'kumas2', 'kalem', 'sayfa', 'plak', 'fis', 'titresim', 'fare', 'cagri', 'saat'];
  const tampon = {};
  let yuklendi = false;
  async function kayitYukle() {
    if (yuklendi || !window.fetch || location.protocol === 'file:') return;
    yuklendi = true;
    for (const ad of KAYITLAR) {
      try {
        const r = await fetch(`assets/ses/kayit/${ad}.mp3`);
        if (r.ok) tampon[ad] = await c.decodeAudioData(await r.arrayBuffer());
      } catch (e) { /* bu kayıt yok sayılır */ }
    }
  }
  const kayitCal = (ad, s, t) => (tampon[ad] && acik && motor ? motor.kayit(tampon[ad], s || {}, t) : null);

  // Jest içinde çağrılır.
  function uyan() {
    if (!AC) return false;
    if (!c) {
      c = new AC();
      motor = Motor(c);
      motor.basla();
      hayat();
      kayitYukle();
    }
    if (c.state === 'suspended') c.resume();
    acik = true;
    motor.ac();
    depo.yaz('ses', '1');
    yay('ses', true);
    return true;
  }
  function uyu() {
    acik = false;
    kalp(0);
    if (motor) motor.kapat();
    depo.yaz('ses', '0');
    yay('ses', false);
  }
  function kalp(bpm) {
    clearTimeout(kalpZaman);
    if (!bpm) return;
    (function vur() {
      if (acik && !document.hidden) motor.vurus(0.8);
      kalpZaman = setTimeout(vur, 60000 / bpm);
    })();
  }
  const canli = (f) => (...a) => (acik && motor ? f(...a) : undefined);

  return {
    uyan,
    uyu,
    degistir() { if (acik) uyu(); else uyan(); return acik; },
    acikMi: () => acik,
    yukselt: canli((p) => motor.yukselt(p)),
    derinlik: (d) => { derin = d; if (acik && motor) motor.derinlik(d); },
    can: canli((f, sure, ses) => motor.can(f || 174.61, sure || 9, ses === undefined ? 0.55 : ses)),
    tik: canli((ses) => motor.tik(Math.random() * 0.6 - 0.3, ses || 0.35)),
    fisilti: canli((sure) => motor.fisilti(Math.random() * 1.6 - 0.8, sure || 2)),
    cigilik: canli((ses) => {
      motor.cigilik(ses === undefined ? 0.9 : ses);
      // Sentezin altına gerçek bir boğaz.
      if (tampon.ciglik) motor.kayit(tampon.ciglik, { ses: (ses === undefined ? 0.9 : ses) * 0.2, yol: 'delen' });
    }),
    parazit: canli((sure, ses) => motor.parazit(sure || 1, ses === undefined ? 0.14 : ses)),
    vurus: canli((guc) => motor.vurus(guc || 0.8)),
    kalp: canli(kalp),
    // Tarayıcının kendi sesi. Kalın, yavaş, Türkçe biliyorsa Türkçe. Yoksa hiç konuşmaz.
    soyle(metin, hiz) {
      if (!acik || !window.speechSynthesis) return;
      try {
        const u = new SpeechSynthesisUtterance(metin);
        const v = speechSynthesis.getVoices().find((x) => /^tr/i.test(x.lang));
        if (v) u.voice = v;
        u.lang = 'tr-TR';
        u.rate = hiz || 0.62;
        u.pitch = 0.05;
        u.volume = 1;
        speechSynthesis.cancel();
        speechSynthesis.speak(u);
      } catch (e) { /* konuşamıyorsa susar */ }
    },
    // Arkadan gelenler. Sesi açana ve kulaklık takana.
    adimlar: canli((x, z, ses, adet) => {
      const n = adet || 3, t = c.currentTime;
      for (let i = 0; i < n; i++) {
        const k = 1 + (n - 1 - i) * 0.09, an = t + i * (0.62 + Math.random() * 0.12);
        const uzak = Math.hypot(x, z) > 3.2;
        const ad = uzak ? `adimu${1 + Math.floor(Math.random() * 2)}` : `adim${1 + Math.floor(Math.random() * 4)}`;
        if (tampon[ad]) motor.kayit(tampon[ad], { x: x * k, y: -0.9, z: z * k, ses: ses * 1.5, ref: 1.5, yanki: Math.min(0.32, Math.hypot(x, z) * 0.07), hiz: 0.92 + Math.random() * 0.12 }, an);
        else motor.adim(x * k, z * k, ses, an);
      }
    }),
    kapiVur: canli((x, z) => motor.kapiVur(x, z)),
    nefesle: canli((adet) => {
      if (!tampon.nefes) {
        motor.nefesle(adet);
        return;
      }
      // Kaydın ağır kısmı: sol omuzdan sağ omuza geçer, git gide yakın.
      motor.nefesKes();
      motor.nefesAc();
      motor.kayit(tampon.nefes, { x: -0.46, z: 0.44, x1: 0.3, z1: 0.24, sure: Math.min(9.5, adet * 3.5), ofset: 10, ses: 0.72, yol: 'nefes' });
    }),
    nefesKes: canli(() => motor.nefesKes()),
    // Eski bir sayfanın müziği. Her turda biraz daha yavaş, biraz daha pes.
    midi: canli((notalar, adim, kent, ses) => {
      midiYol = motor.midi(notalar, adim, kent, ses, midiYol);
    }),
    midiKes: canli(() => {
      if (midiYol) midiYol.gain.setTargetAtTime(0, c.currentTime, 0.04);
      midiYol = null;
    }),
    // Gerçek kayıt. Durduran işlev döner; ses kapalıysa ya da kayıt inmediyse null.
    kayit: kayitCal,
    // Kirli ince sesler: alçak, sinir bozucu. Ayrıntı motorda.
    separd: canli((ses) => motor.separd(ses)),
    kume: canli((p) => motor.kume(p)),
    cinlama: canli((p) => motor.cinlama(p)),
    purus: canli((sure, ses, pan) => motor.purus(sure, ses, pan)),
    ters: canli((sure, ses) => motor.ters(sure, ses)),
    kutu: canli((notalar, sec) => motor.kutu(notalar, sec)),
    gramofon: canli((notalar, sec) => motor.gramofon(notalar, sec)),
    modem: canli(() => motor.modem()),
    // Mikrofonu geciktirip arkadan verir. Kayıt yok, yalnızca gecikme. Yalnızca kulaklıkla çağrılır.
    arkadanVer: canli((akim, gecikme, ses) => motor.arkadanVer(akim, gecikme, ses)),
    ortamKis: canli((p) => motor.ortamKis(p)),
    sus: canli((sn) => motor.sus(sn || 0.05)),
    don: canli((sn) => motor.don(sn || 2)),
    // Çevrimdışı ölçüm için
    _Motor: Motor,
    _baglam: () => c,
  };
})();
