// Telefonun kendi hissettikleri: titreşim, hareket, yön. Veri bu sayfadan çıkmaz.
// Android izin istemez. iPhone bir dokunuşla izin penceresi açar, titreşim de yoktur.
window.Sensor = (function () {
  'use strict';
  const { azalt } = window.Ortak;
  const dokunmatik = matchMedia('(pointer: coarse)').matches;

  function titret(desen) {
    if (azalt || !navigator.vibrate) return false;
    try { return navigator.vibrate(desen); } catch (e) { return false; }
  }
  let kalpZaman = 0;
  function kalpAt(bpm) {
    clearInterval(kalpZaman);
    if (!bpm) {
      titret(0);
      return;
    }
    kalpZaman = setInterval(() => { if (!document.hidden) titret([34, 90, 22]); }, 60000 / bpm);
  }

  // iOS: jest içinde çağrılır. Android: hemen evet döner.
  async function izinIste() {
    const istekler = [];
    if (window.DeviceMotionEvent && DeviceMotionEvent.requestPermission) istekler.push(DeviceMotionEvent.requestPermission());
    if (window.DeviceOrientationEvent && DeviceOrientationEvent.requestPermission) istekler.push(DeviceOrientationEvent.requestPermission());
    try {
      const s = await Promise.all(istekler);
      return s.every((x) => x === 'granted');
    } catch (e) {
      return false;
    }
  }

  // Telefon kıpırdarsa f(g) çağırır. Yerçekimi çıkarılmış ivme yoksa fark alınır.
  function hareketDinle(f, esik) {
    if (!window.DeviceMotionEvent) return () => {};
    const E = esik === undefined ? 1.15 : esik;
    let once = null;
    const h = (e) => {
      const a = e.acceleration, b = e.accelerationIncludingGravity;
      let g = 0;
      if (a && a.x !== null) g = Math.hypot(a.x, a.y, a.z);
      else if (b && b.x !== null) {
        if (once) g = Math.hypot(b.x - once.x, b.y - once.y, b.z - once.z);
        once = { x: b.x, y: b.y, z: b.z };
      }
      if (g > E) f(g);
    };
    addEventListener('devicemotion', h);
    return () => removeEventListener('devicemotion', h);
  }

  // Yön: derece. Sıçramasız olsun diye 0-360 üstünden açı farkı alınır.
  function yonDinle(f) {
    const h = (e) => {
      const alfa = typeof e.webkitCompassHeading === 'number' ? -e.webkitCompassHeading : e.alpha;
      if (alfa === null || alfa === undefined) return;
      f({ alfa, beta: e.beta, gama: e.gamma });
    };
    addEventListener('deviceorientation', h);
    return () => removeEventListener('deviceorientation', h);
  }

  return { dokunmatik, titret, kalpAt, izinIste, hareketDinle, yonDinle };
})();
