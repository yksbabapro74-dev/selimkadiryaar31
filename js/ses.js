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

    let basladi = false;
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
  let c = null, motor = null, acik = false, derin = 0, sonHareket = 0, kalpZaman = 0, tikBitis = 0;

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

  // Jest içinde çağrılır.
  function uyan() {
    if (!AC) return false;
    if (!c) {
      c = new AC();
      motor = Motor(c);
      motor.basla();
      hayat();
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
    cigilik: canli((ses) => motor.cigilik(ses === undefined ? 0.9 : ses)),
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
        const k = 1 + (n - 1 - i) * 0.09;
        motor.adim(x * k, z * k, ses, t + i * (0.58 + Math.random() * 0.1));
      }
    }),
    kapiVur: canli((x, z) => motor.kapiVur(x, z)),
    nefesle: canli((adet) => motor.nefesle(adet)),
    nefesKes: canli(() => motor.nefesKes()),
    ortamKis: canli((p) => motor.ortamKis(p)),
    sus: canli((sn) => motor.sus(sn || 0.05)),
    don: canli((sn) => motor.don(sn || 2)),
    // Çevrimdışı ölçüm için
    _Motor: Motor,
    _baglam: () => c,
  };
})();
