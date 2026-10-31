// Giriş sahnesi: elle yazılmış yazılımsal rasterizer. WebGL yok, kütüphane yok.
// Tutulmuş ay, taş halka, yerde kızıl daire, sunak, CRT ve kapüşonlu figür.
// Figür her zaman sırtını kameraya döner. Çevresindekilerin hepsi sana bakar.
(function () {
  'use strict';
  const tuval = document.getElementById('sahne');
  if (!tuval) return;
  const ctx = tuval.getContext('2d', { alpha: false });
  const giris = document.getElementById('giris');
  const { azalt, RENK, BAYER, kayit, dinle, javaHash } = window.Ortak;
  const Ses = window.Ses;
  const kok = document.documentElement;
  const MUREKKEP = RENK.murekkep, KAGIT = RENK.kagit, KOR = RENK.kor, KAN = RENK.kan, KOR_KOYU = 0xff060a24;

  // Bu değerin altı tam siyah: gölgelerde düzenli nokta ızgarası oluşmasın.
  const TABAN = 0.05;
  // Bu değerin üstü kemik, altı kan: taş ışıktan uzaklaştıkça kızıla batar.
  const KEMIK_ESIK = 0.46;
  const M_ZEMIN = 1, M_TAS = 2, M_KUMAS = 3, M_EKRAN = 4, M_DUZ = 5, M_HALKA = 6, M_SILUET = 7;

  // Kararlı rastgele: sahne her açılışta aynı olsun.
  let tohum = 31;
  const rast = () => { tohum = (Math.imul(tohum, 1664525) + 1013904223) >>> 0; return tohum / 4294967296; };

  // Zemin ve taş dokusu: iki oktav değer gürültüsü, 256x256.
  const GUR = new Float32Array(65536);
  (function () {
    const kaba = new Float32Array(4096);
    for (let i = 0; i < 4096; i++) kaba[i] = rast();
    for (let y = 0; y < 256; y++) {
      for (let x = 0; x < 256; x++) {
        const fx = x / 8, fy = y / 8;
        const x0 = fx | 0, y0 = fy | 0, tx = fx - x0, ty = fy - y0;
        const a = kaba[(y0 & 63) * 64 + (x0 & 63)], b = kaba[(y0 & 63) * 64 + ((x0 + 1) & 63)];
        const c = kaba[((y0 + 1) & 63) * 64 + (x0 & 63)], d = kaba[((y0 + 1) & 63) * 64 + ((x0 + 1) & 63)];
        const yumusak = (a + (b - a) * tx) * (1 - ty) + (c + (d - c) * tx) * ty;
        GUR[y * 256 + x] = 0.66 + 0.46 * yumusak + 0.12 * rast() - 0.06;
      }
    }
  })();

  // ---------- geometri ----------
  function liste() { return { p: [], n: [], a: [], m: [], e: [] }; }
  const sabit = liste(), gurup = liste();

  function ucgen(L, a, b, c, alb, mat, ek) {
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
    const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const u = Math.hypot(nx, ny, nz) || 1;
    nx /= u; ny /= u; nz /= u;
    L.p.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);
    L.n.push(nx, ny, nz);
    L.a.push(alb);
    L.m.push(mat);
    L.e.push(ek || 0);
  }
  function dortgen(L, a, b, c, d, alb, mat, ek) {
    ucgen(L, a, b, c, alb, mat, ek);
    ucgen(L, a, c, d, alb, mat, ek);
  }
  // cx,cy,cz merkez; yaw döndürme. Alt yüz yok: yere oturur.
  function kutu(L, cx, cy, cz, g, y, d, yaw, alb, mat, ek) {
    const c = Math.cos(yaw), s = Math.sin(yaw), hx = g / 2, hy = y / 2, hz = d / 2;
    const P = (x, yy, z) => [cx + x * c + z * s, cy + yy, cz - x * s + z * c];
    dortgen(L, P(-hx, -hy, hz), P(hx, -hy, hz), P(hx, hy, hz), P(-hx, hy, hz), alb, mat, ek);
    dortgen(L, P(hx, -hy, hz), P(hx, -hy, -hz), P(hx, hy, -hz), P(hx, hy, hz), alb, mat, ek);
    dortgen(L, P(hx, -hy, -hz), P(-hx, -hy, -hz), P(-hx, hy, -hz), P(hx, hy, -hz), alb, mat, ek);
    dortgen(L, P(-hx, -hy, -hz), P(-hx, -hy, hz), P(-hx, hy, hz), P(-hx, hy, -hz), alb, mat, ek);
    dortgen(L, P(-hx, hy, hz), P(hx, hy, hz), P(hx, hy, -hz), P(-hx, hy, -hz), alb, mat, ek);
  }
  // Y ekseni çevresinde döndürülmüş profil.
  function torna(L, ox, oz, profil, kenar, alb, mat, ek) {
    for (let i = 0; i < profil.length - 1; i++) {
      const [r0, y0] = profil[i], [r1, y1] = profil[i + 1];
      for (let j = 0; j < kenar; j++) {
        const a0 = (j / kenar) * Math.PI * 2, a1 = ((j + 1) / kenar) * Math.PI * 2;
        const A = [ox + Math.cos(a0) * r0, y0, oz + Math.sin(a0) * r0];
        const B = [ox + Math.cos(a1) * r0, y0, oz + Math.sin(a1) * r0];
        const C = [ox + Math.cos(a1) * r1, y1, oz + Math.sin(a1) * r1];
        const D = [ox + Math.cos(a0) * r1, y1, oz + Math.sin(a0) * r1];
        // Dışarı bakan sıralama: artan açı +z'den bakınca saat yönünde gider, ters sırala.
        dortgen(L, B, A, D, C, alb, mat, ek);
      }
    }
  }

  // Zemin
  dortgen(sabit, [-46, 0, 46], [46, 0, 46], [46, 0, -46], [-46, 0, -46], 0.44, M_ZEMIN);

  // Çevre duvarı: içe bakan, rastgele tonlu taşlar.
  const DUVAR_R = 6.5, DUVAR_S = 46, DUVAR_K = 4, DUVAR_H = 0.34;
  for (let k = 0; k < DUVAR_K; k++) {
    for (let i = 0; i < DUVAR_S; i++) {
      const kay = k % 2 ? 0.5 : 0;
      const a0 = ((i + kay) / DUVAR_S) * Math.PI * 2, a1 = ((i + 1 + kay) / DUVAR_S) * Math.PI * 2;
      const r = DUVAR_R + (rast() - 0.5) * 0.08;
      const y0 = k * DUVAR_H, y1 = y0 + DUVAR_H * 0.94;
      const A = [Math.sin(a0) * r, y0, Math.cos(a0) * r], B = [Math.sin(a1) * r, y0, Math.cos(a1) * r];
      const C = [Math.sin(a1) * r, y1, Math.cos(a1) * r], D = [Math.sin(a0) * r, y1, Math.cos(a0) * r];
      dortgen(sabit, B, A, D, C, 0.36 + rast() * 0.5, M_TAS);
    }
  }

  // T sütunlar + gölge silüetleri
  const golgeSabit = [];
  const SUTUN_R = 5.3, SUTUN_SAYI = 7;
  for (let i = 0; i < SUTUN_SAYI; i++) {
    const t = ((i + 0.5) / SUTUN_SAYI) * Math.PI * 2;
    const H = 2.42 + rast() * 0.55;
    const cx = Math.sin(t) * SUTUN_R, cz = Math.cos(t) * SUTUN_R;
    kutu(sabit, cx, H / 2, cz, 0.66, H, 0.36, t, 0.92, M_TAS);
    const ic = -0.06;
    const bx = cx + Math.sin(t) * ic, bz = cz + Math.cos(t) * ic;
    kutu(sabit, bx, H + 0.25, bz, 1.6, 0.5, 0.5, t, 0.96, M_TAS);
    // Oymalar: içe bakan yüzde beş çizgi. 11111.
    const c = Math.cos(t), s = Math.sin(t);
    const P = (x, y) => { const z = -0.19; return [cx + x * c + z * s, y, cz - x * s + z * c]; };
    for (let b = 0; b < 5; b++) {
      const x0 = -0.21 + b * 0.09, x1 = x0 + 0.042;
      dortgen(sabit, P(x1, H - 0.95), P(x0, H - 0.95), P(x0, H - 0.2), P(x1, H - 0.2), 0.05, M_DUZ);
    }
    // T silüeti
    const S = (x, y) => [cx + x * c, y, cz - x * s];
    golgeSabit.push(
      [S(-0.33, 0), S(0.33, 0), S(0.33, H)], [S(-0.33, 0), S(0.33, H), S(-0.33, H)],
      [S(-0.8, H), S(0.8, H), S(0.8, H + 0.5)], [S(-0.8, H), S(0.8, H + 0.5), S(-0.8, H + 0.5)]
    );
  }

  // Grup: figürle birlikte dönen sunak. Yerel +z kameraya bakar.
  const EKRAN_G = 0.74, EKRAN_Y = 0.56, EKRAN_M = [0, 1.25, -0.69];
  kutu(gurup, 0, 0.42, -0.95, 1.55, 0.84, 1.0, 0, 0.72, M_TAS);
  kutu(gurup, 0, 1.23, -0.96, 0.96, 0.78, 0.52, 0, 0.5, M_DUZ);
  kutu(gurup, 0, 1.21, -1.4, 0.62, 0.54, 0.42, 0, 0.42, M_DUZ);
  dortgen(
    gurup,
    [-EKRAN_G / 2, EKRAN_M[1] - EKRAN_Y / 2, EKRAN_M[2]], [EKRAN_G / 2, EKRAN_M[1] - EKRAN_Y / 2, EKRAN_M[2]],
    [EKRAN_G / 2, EKRAN_M[1] + EKRAN_Y / 2, EKRAN_M[2]], [-EKRAN_G / 2, EKRAN_M[1] + EKRAN_Y / 2, EKRAN_M[2]],
    1, M_EKRAN
  );

  // Figür: bağdaş kurmuş, pelerinli, kapüşonlu.
  const FZ = 0.2, FS = 0.86;
  const figProfil = [[0.56, 0], [0.54, 0.14], [0.48, 0.36], [0.44, 0.58], [0.39, 0.74], [0.25, 0.87], [0.19, 0.95], [0.23, 1.01], [0.29, 1.13], [0.27, 1.27], [0.17, 1.39], [0.03, 1.45]]
    .map(([r, y]) => [r * FS, y * FS]);
  torna(gurup, 0, FZ, figProfil, 12, 0.5, M_KUMAS);
  // Kulaklık: kapüşonun sırtından geçen yay ve iki kap. Arkadan bakınca seçilsin.
  // Yüzünü döndüğünde çizilmez; buradan sonraki üçgenler kulaklıktır.
  const KULAK_BAS = gurup.a.length;
  const KY = 1.04 * FS, KR = 0.2, KZ = FZ + 0.262;
  for (let i = 0; i < 9; i++) {
    const a0 = Math.PI * (i / 9), a1 = Math.PI * ((i + 1) / 9);
    const R0 = KR, R1 = KR + 0.036;
    dortgen(
      gurup,
      [Math.cos(a1) * R0, KY + Math.sin(a1) * R0, KZ], [Math.cos(a0) * R0, KY + Math.sin(a0) * R0, KZ],
      [Math.cos(a0) * R1, KY + Math.sin(a0) * R1, KZ], [Math.cos(a1) * R1, KY + Math.sin(a1) * R1, KZ],
      1, M_DUZ, 1.2
    );
  }
  kutu(gurup, KR + 0.03, KY - 0.03, KZ - 0.02, 0.11, 0.16, 0.06, 0, 1, M_DUZ, 1.2);
  kutu(gurup, -KR - 0.03, KY - 0.03, KZ - 0.02, 0.11, 0.16, 0.06, 0, 1, M_DUZ, 1.2);

  // Figürün gölge silüeti (yerel, FZ düzleminde)
  const figSiluet = [[-0.56, 0], [0.56, 0], [0.44, 0.58], [0.25, 0.87], [0.19, 0.95], [0.29, 1.13], [0.17, 1.39], [-0.17, 1.39], [-0.29, 1.13], [-0.19, 0.95], [-0.25, 0.87], [-0.44, 0.58]];

  const S = {
    p: Float32Array.from(sabit.p), n: Float32Array.from(sabit.n), a: Float32Array.from(sabit.a),
    m: Uint8Array.from(sabit.m), e: Float32Array.from(sabit.e), adet: sabit.a.length,
  };
  const G = {
    p: Float32Array.from(gurup.p), n: Float32Array.from(gurup.n), a: Float32Array.from(gurup.a),
    m: Uint8Array.from(gurup.m), e: Float32Array.from(gurup.e), adet: gurup.a.length,
    dp: new Float32Array(gurup.p.length), dn: new Float32Array(gurup.n.length),
  };

  // Yıldızlar: üst yarımküre
  const YILDIZ = [];
  for (let i = 0; i < 80; i++) {
    const az = rast() * Math.PI * 2, ey = 0.02 + Math.pow(rast(), 0.8) * 1.3;
    YILDIZ.push(Math.cos(ey) * Math.sin(az), Math.sin(ey), Math.cos(ey) * Math.cos(az), rast());
  }
  const AY = (function () {
    const x = -0.848, y = 0.125, z = -0.529, u = Math.hypot(x, y, z);
    return [x / u, y / u, z / u];
  })();
  const AY_ISIK = (function () { const x = -0.45, y = 0.8, z = 0.4, u = Math.hypot(x, y, z); return [x / u, y / u, z / u]; })();

  // ---------- yerdeki halka: 31 kol, kolların arasında 5 bitlik yazı ----------
  const HALKA_A = 2.32, HALKA_B = 2.98, HALKA_K = 0.034;
  const HALKA_IC2 = (HALKA_A - HALKA_K) ** 2, HALKA_DIS2 = (HALKA_B + HALKA_K) ** 2;
  const YAZI = new Uint8Array(31);
  (function () {
    let s = javaHash('selimkadiryaar31');
    for (let i = 0; i < 31; i++) {
      s = (Math.imul(s, 31) + i) | 0;
      YAZI[i] = (s >>> 11) & 31;
    }
  })();
  function halkaMi(x, z, r2) {
    const r = Math.sqrt(r2);
    if (r < HALKA_A + HALKA_K || r > HALKA_B - HALKA_K) return true;
    const aci = (Math.atan2(x, z) / (Math.PI * 2) + 0.5) * 31;
    const dilim = Math.floor(aci) % 31, fr = aci - Math.floor(aci);
    if (fr < 0.04) return true;
    if (fr < 0.3 || fr > 0.74) return false;
    const seviye = Math.floor(((r - HALKA_A) / (HALKA_B - HALKA_A)) * 7) - 1;
    return seviye >= 0 && seviye < 5 && ((YAZI[dilim] >> seviye) & 1) === 1;
  }

  // Dairenin içinde dokuz mum. Işık vermezler, yalnızca parlarlar.
  const MUMLAR = [];
  for (let i = 0; i < 9; i++) {
    const a = ((i + 0.5) / 9) * Math.PI * 2;
    MUMLAR.push([Math.sin(a) * 1.92, Math.cos(a) * 1.92, 0.15 + rast() * 0.13, rast() * 40]);
  }

  // ---------- müritler: ekrana dönük silüetler ----------
  const BOY = 1.72;
  const YARI = new Float32Array(32);
  (function () {
    const P = [[0, 0.03], [0.05, 0.1], [0.1, 0.145], [0.16, 0.16], [0.22, 0.13], [0.28, 0.2], [0.45, 0.28], [0.7, 0.36], [1, 0.46]];
    for (let i = 0; i < 32; i++) {
      const u = i / 31;
      let k = 0;
      while (k < P.length - 2 && P[k + 1][0] < u) k++;
      const o = (u - P[k][0]) / (P[k + 1][0] - P[k][0]);
      YARI[i] = P[k][1] + (P[k + 1][1] - P[k][1]) * o;
    }
  })();
  const muritler = [];
  function muritEkle(a, r, sabit) {
    muritler.push({ a, r, sabit: !!sabit, tohum: rast() * 100, gx: 0, gy: 0, gs: 0, iz: 0 });
  }

  // ---------- kamera + tamponlar ----------
  let W = 0, H = 0, pikselBoy = 3, img, cikis, zb, br, mt, gl, sh, vig, kareNo = 0;
  let f = 400, ox = 0, oy = 0;
  const YAKIN = 0.12;
  let cam = [0, 0, 0], R = [1, 0, 0], U = [0, 1, 0], F = [0, 0, -1];
  let Lx = 0, Ly = 0, Lz = 0, Isik = 3;
  let grupC = 1, grupS = 0;
  let ekSx = 0, ekSy = 0, ekSz = 0, ekUx = 1, ekUz = 0, kaydir = 0, imlec = 0;
  // parla: eşikten sonra sahne karanlıktan yavaşça çıkar.
  let parla = azalt ? 1 : 0, yuzDonuk = kayit.cevap === 'verdi';

  function boyutla() {
    const cssG = giris.clientWidth, cssY = giris.clientHeight;
    const dar = cssG < 700;
    const taban = Math.max(dar ? 2 : 3, Math.ceil(cssG / 560));
    pikselBoy = Math.max(pikselBoy > taban ? pikselBoy : 0, taban);
    W = Math.max(40, Math.floor(cssG / pikselBoy));
    H = Math.max(40, Math.floor(cssY / pikselBoy));
    tuval.width = W;
    tuval.height = H;
    img = ctx.createImageData(W, H);
    cikis = new Uint32Array(img.data.buffer);
    const n = W * H;
    zb = new Float32Array(n);
    br = new Float32Array(n);
    mt = new Uint8Array(n);
    gl = new Float32Array(n);
    sh = new Uint32Array(n);
    vig = new Float32Array(n);
    const dikey = cssG < cssY * 1.05;
    ox = dikey ? W * 0.5 : W * 0.69;
    oy = dikey ? H * 0.31 : H * 0.455;
    f = dikey ? Math.min(W * 1.32, H * 0.72) : H * 1.16;
    // Yazıların altını karart: başlık sol altta (dikey ekranda altta) okunsun.
    const ss = (a, b, v) => { const t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
    for (let y = 0, i = 0; y < H; y++) {
      const ny = y / H;
      for (let x = 0; x < W; x++, i++) {
        const nx = x / W;
        let k = 1;
        if (dikey) {
          k *= 1 - ss(0.46, 0.66, ny) * 0.97;
        } else {
          k *= 1 - ss(0.8, 0.5, nx) * ss(0.42, 0.58, ny) * 0.99;
          k *= 1 - ss(0.88, 1, ny) * 0.92;
          k *= 1 - ss(0.5, 0, nx) * 0.3;
        }
        k *= 1 - ss(0.1, 0.03, ny) * 0.97;
        vig[i] = k;
      }
    }
  }

  // ---------- rasterizer ----------
  const yGecici = new Float64Array(6 * 5), yCikti = new Float64Array(6 * 5);
  const yKose = new Float64Array(6 * 3);

  // Kamera uzayına dönüştür, yakın düzleme kırp, çokgeni yelpazeyle çiz.
  function kirpVeCiz(ax, ay, az, bx, by, bz, cx, cy, cz, cizici, a1, a2, a3, a4, a5, a6, a7, a8) {
    const Rx = R[0], Ry = R[1], Rz = R[2], Ux = U[0], Uy = U[1], Uz = U[2], Fx = F[0], Fy = F[1], Fz = F[2];
    const K = cam;
    let dx = ax - K[0], dy = ay - K[1], dz = az - K[2];
    yKose[0] = dx * Rx + dy * Ry + dz * Rz; yKose[1] = dx * Ux + dy * Uy + dz * Uz; yKose[2] = dx * Fx + dy * Fy + dz * Fz;
    yKose[3] = ax; yKose[4] = ay; yKose[5] = az;
    dx = bx - K[0]; dy = by - K[1]; dz = bz - K[2];
    yKose[6] = dx * Rx + dy * Ry + dz * Rz; yKose[7] = dx * Ux + dy * Uy + dz * Uz; yKose[8] = dx * Fx + dy * Fy + dz * Fz;
    yKose[9] = bx; yKose[10] = by; yKose[11] = bz;
    dx = cx - K[0]; dy = cy - K[1]; dz = cz - K[2];
    yKose[12] = dx * Rx + dy * Ry + dz * Rz; yKose[13] = dx * Ux + dy * Uy + dz * Uz; yKose[14] = dx * Fx + dy * Fy + dz * Fz;
    yKose[15] = cx; yKose[16] = cy; yKose[17] = cz;

    const za = yKose[2], zb_ = yKose[8], zc = yKose[14];
    if (za < YAKIN && zb_ < YAKIN && zc < YAKIN) return;
    if (za >= YAKIN && zb_ >= YAKIN && zc >= YAKIN) {
      cizici(yKose, 0, 6, 12, a1, a2, a3, a4, a5, a6, a7, a8);
      return;
    }
    let adet = 0;
    for (let i = 0; i < 3; i++) {
      const s = i * 6, e = ((i + 1) % 3) * 6;
      const zs = yKose[s + 2], ze = yKose[e + 2];
      if (zs >= YAKIN) {
        for (let k = 0; k < 6; k++) yCikti[adet * 6 + k] = yKose[s + k];
        adet++;
      }
      if ((zs >= YAKIN) !== (ze >= YAKIN)) {
        const t = (YAKIN - zs) / (ze - zs);
        for (let k = 0; k < 6; k++) yCikti[adet * 6 + k] = yKose[s + k] + (yKose[e + k] - yKose[s + k]) * t;
        adet++;
      }
    }
    for (let i = 1; i < adet - 1; i++) cizici(yCikti, 0, i * 6, (i + 1) * 6, a1, a2, a3, a4, a5, a6, a7, a8);
  }

  function golgeUcgen(V, i0, i1, i2) {
    const z0 = V[i0 + 2], z1 = V[i1 + 2], z2 = V[i2 + 2];
    const x0 = ox + (f * V[i0]) / z0, y0 = oy - (f * V[i0 + 1]) / z0;
    const x1 = ox + (f * V[i1]) / z1, y1 = oy - (f * V[i1 + 1]) / z1;
    const x2 = ox + (f * V[i2]) / z2, y2 = oy - (f * V[i2 + 1]) / z2;
    let alan = (x1 - x0) * (y2 - y0) - (y1 - y0) * (x2 - x0);
    if (alan === 0) return;
    const isaret = alan > 0 ? 1 : -1;
    alan *= isaret;
    const minX = Math.max(0, Math.floor(Math.min(x0, x1, x2))), maxX = Math.min(W - 1, Math.ceil(Math.max(x0, x1, x2)));
    const minY = Math.max(0, Math.floor(Math.min(y0, y1, y2))), maxY = Math.min(H - 1, Math.ceil(Math.max(y0, y1, y2)));
    for (let y = minY; y <= maxY; y++) {
      const py = y + 0.5;
      for (let x = minX, i = y * W + minX; x <= maxX; x++, i++) {
        if (mt[i] !== M_ZEMIN) continue;
        const px = x + 0.5;
        const w0 = ((x2 - x1) * (py - y1) - (y2 - y1) * (px - x1)) * isaret;
        const w1 = ((x0 - x2) * (py - y2) - (y0 - y2) * (px - x2)) * isaret;
        const w2 = ((x1 - x0) * (py - y0) - (y1 - y0) * (px - x0)) * isaret;
        if (w0 >= 0 && w1 >= 0 && w2 >= 0) sh[i] = kareNo;
      }
    }
  }

  function dolguUcgen(V, i0, i1, i2, nx, ny, nz, alb, mat, ek, ayTerim, _b) {
    const z0 = V[i0 + 2], z1 = V[i1 + 2], z2 = V[i2 + 2];
    const iz0 = 1 / z0, iz1 = 1 / z1, iz2 = 1 / z2;
    const x0 = ox + f * V[i0] * iz0, y0 = oy - f * V[i0 + 1] * iz0;
    const x1 = ox + f * V[i1] * iz1, y1 = oy - f * V[i1 + 1] * iz1;
    const x2 = ox + f * V[i2] * iz2, y2 = oy - f * V[i2 + 1] * iz2;
    let alan = (x1 - x0) * (y2 - y0) - (y1 - y0) * (x2 - x0);
    if (alan === 0) return;
    const isaret = alan > 0 ? 1 : -1;
    alan *= isaret;
    const ters = 1 / alan;
    const minX = Math.max(0, Math.floor(Math.min(x0, x1, x2))), maxX = Math.min(W - 1, Math.ceil(Math.max(x0, x1, x2)));
    const minY = Math.max(0, Math.floor(Math.min(y0, y1, y2))), maxY = Math.min(H - 1, Math.ceil(Math.max(y0, y1, y2)));
    if (minX > maxX || minY > maxY) return;
    const wx0 = V[i0 + 3] * iz0, wy0 = V[i0 + 4] * iz0, wz0 = V[i0 + 5] * iz0;
    const wx1 = V[i1 + 3] * iz1, wy1 = V[i1 + 4] * iz1, wz1 = V[i1 + 5] * iz1;
    const wx2 = V[i2 + 3] * iz2, wy2 = V[i2 + 4] * iz2, wz2 = V[i2 + 5] * iz2;
    const a12 = -(y2 - y1) * isaret, b12 = (x2 - x1) * isaret;
    const a20 = -(y0 - y2) * isaret, b20 = (x0 - x2) * isaret;
    const a01 = -(y1 - y0) * isaret, b01 = (x1 - x0) * isaret;
    let s0 = ((x2 - x1) * (minY + 0.5 - y1) - (y2 - y1) * (minX + 0.5 - x1)) * isaret;
    let s1 = ((x0 - x2) * (minY + 0.5 - y2) - (y0 - y2) * (minX + 0.5 - x2)) * isaret;
    let s2 = ((x1 - x0) * (minY + 0.5 - y0) - (y1 - y0) * (minX + 0.5 - x0)) * isaret;
    const lx_ = Lx, ly_ = Ly, lz_ = Lz, I = Isik;
    for (let y = minY; y <= maxY; y++) {
      let w0 = s0, w1 = s1, w2 = s2;
      let i = y * W + minX;
      for (let x = minX; x <= maxX; x++, i++) {
        if (w0 >= 0 && w1 >= 0 && w2 >= 0) {
          const a = w0 * ters, b = w1 * ters, c = w2 * ters;
          const iz = a * iz0 + b * iz1 + c * iz2;
          if (iz > zb[i]) {
            zb[i] = iz;
            const z = 1 / iz;
            const wx = (a * wx0 + b * wx1 + c * wx2) * z;
            const wy = (a * wy0 + b * wy1 + c * wy2) * z;
            const wz = (a * wz0 + b * wz1 + c * wz2) * z;
            mt[i] = mat;
            if (mat === M_EKRAN) {
              const px = wx - ekSx, py = wy - ekSy, pz = wz - ekSz;
              const u = (px * ekUx + pz * ekUz) / EKRAN_G + 0.5;
              const v = 1 - (py / EKRAN_Y + 0.5);
              br[i] = ekranDesen(u, v);
            } else {
              const dx = lx_ - wx, dy = ly_ - wy, dz = lz_ - wz;
              const d2 = dx * dx + dy * dy + dz * dz;
              const nl = nx * dx + ny * dy + nz * dz;
              let d = ayTerim + ek;
              if (nl > 0) d += ((nl / Math.sqrt(d2)) * I) / (1 + 0.115 * d2);
              d *= alb;
              if (mat === M_ZEMIN) {
                d *= GUR[((((wz * 7) | 0) & 255) << 8) | (((wx * 7) | 0) & 255)] / (1 + 0.09 * d2);
                const r2 = wx * wx + wz * wz;
                if (r2 > HALKA_IC2 && r2 < HALKA_DIS2 && halkaMi(wx, wz, r2)) mt[i] = M_HALKA;
              }
              else if (mat === M_TAS) d *= GUR[((((wy * 11 + wx * 5) | 0) & 255) << 8) | (((wz * 11 + wx * 3) | 0) & 255)];
              br[i] = d / (1 + z * z * 0.021);
            }
          }
        }
        w0 += a12; w1 += a20; w2 += a01;
      }
      s0 += b12; s1 += b20; s2 += b01;
    }
  }

  // CRT'de akan kod satırları
  const SATIR = 13;
  const satirUz = new Float32Array(64), satirGir = new Float32Array(64);
  for (let i = 0; i < 64; i++) { satirUz[i] = 0.12 + rast() * 0.62; satirGir[i] = Math.floor(rast() * 4) * 0.07; }
  function ekranDesen(u, v) {
    if (u < 0.05 || u > 0.95 || v < 0.07 || v > 0.93) return 0.12;
    const s = v * SATIR + kaydir;
    const satir = Math.floor(s);
    if (s - satir > 0.56) return 0.1;
    const n = satir & 63;
    const b = 0.08 + satirGir[n];
    if (u < b || u > b + satirUz[n]) return 0.1;
    return 1;
  }

  function aydinlatma(az, grupAz, t) {
    const kr = 3.95, kh = 2.02;
    cam = [Math.sin(az) * kr, kh, Math.cos(az) * kr];
    const hedef = [0, 1.24, 0];
    let fx = hedef[0] - cam[0], fy = hedef[1] - cam[1], fz = hedef[2] - cam[2];
    const u = Math.hypot(fx, fy, fz);
    fx /= u; fy /= u; fz /= u;
    F = [fx, fy, fz];
    let rx = fz * -1 * -1, ry = 0, rz = 0;
    // F x yukarı
    rx = fy * 0 - fz * 1; ry = fz * 0 - fx * 0; rz = fx * 1 - fy * 0;
    const ru = Math.hypot(rx, ry, rz) || 1;
    rx /= ru; ry /= ru; rz /= ru;
    R = [rx, ry, rz];
    U = [ry * fz - rz * fy, rz * fx - rx * fz, rx * fy - ry * fx];

    grupC = Math.cos(grupAz);
    grupS = Math.sin(grupAz);
    // Monitörün voltajı arada düşer: en çok 7,3 saniyede bir, 0,22 saniye.
    const dilim = Math.floor(t / 7.3);
    const zar = (Math.sin(dilim * 91.7) * 43758.5453) % 1;
    const dusuk = Math.abs(zar) < 0.55 && t - dilim * 7.3 < 0.22 ? 0.22 : 1;
    const titreme = azalt ? 1 : (1 + 0.07 * Math.sin(t * 13.1) * Math.sin(t * 7.3) + 0.04 * Math.sin(t * 29.7)) * dusuk;
    Isik = 3.4 * titreme;
    const lz = -0.2, ly = 1.3;
    Lx = lz * grupS; Ly = ly; Lz = lz * grupC;
    ekSx = EKRAN_M[2] * grupS; ekSy = EKRAN_M[1]; ekSz = EKRAN_M[2] * grupC;
    ekUx = grupC; ekUz = -grupS;
    kaydir = azalt ? 0 : t * 0.9;
    imlec = t;
  }

  // Dünya noktasını ekrana düşürür: [x, y, 1/z, ölçek]
  function yansit(x, y, z) {
    const dx = x - cam[0], dy = y - cam[1], dz = z - cam[2];
    const zc = dx * F[0] + dy * F[1] + dz * F[2];
    if (zc < YAKIN) return null;
    const s = f / zc;
    return [ox + (dx * R[0] + dy * R[1] + dz * R[2]) * s, oy - (dx * U[0] + dy * U[1] + dz * U[2]) * s, 1 / zc, s];
  }

  function muritCiz() {
    const Fx = F[0], Fy = F[1], Fz = F[2], Rx = R[0], Rz = R[2], Ux = U[0], Uy = U[1], Uz = U[2];
    for (let n = 0; n < muritler.length; n++) {
      const m = muritler[n];
      m.gs = 0;
      const dx = Math.sin(m.a) * m.r - cam[0], dy = -cam[1], dz = Math.cos(m.a) * m.r - cam[2];
      const zA = dx * Fx + dy * Fy + dz * Fz, zU = zA + BOY * Fy;
      // Kameranın içinden geçen çizilmez.
      if (zA < 0.62 || zU < 0.62) continue;
      const xc = dx * Rx + dz * Rz;
      const yA = dx * Ux + dy * Uy + dz * Uz, yU = yA + BOY * Uy;
      const sA = f / zA, sU = f / zU;
      const xA = ox + xc * sA, ayak = oy - yA * sA, xU = ox + xc * sU, tepe = oy - yU * sU;
      const boy = ayak - tepe;
      if (boy < 1) continue;
      const y0 = Math.max(0, Math.ceil(tepe)), y1 = Math.min(H - 1, Math.floor(ayak));
      for (let y = y0; y <= y1; y++) {
        const u = (y - tepe) / boy;
        const hw = YARI[(u * 31) | 0] * (sU + (sA - sU) * u);
        const cx = xU + (xA - xU) * u;
        const iz = 1 / (zU + (zA - zU) * u);
        const x0 = Math.max(0, Math.ceil(cx - hw)), x1 = Math.min(W - 1, Math.floor(cx + hw));
        for (let x = x0, i = y * W + x0; x <= x1; x++, i++) {
          if (iz > zb[i]) {
            zb[i] = iz;
            mt[i] = M_SILUET;
          }
        }
      }
      m.gs = sU;
      m.gx = xU + (xA - xU) * 0.085;
      m.gy = tepe + boy * 0.085;
      m.iz = 1 / (zU + (zA - zU) * 0.085);
    }
  }

  function gozNokta(x, y, g, yuk, renk, iz) {
    const x0 = Math.round(x - g / 2), y0 = Math.round(y - yuk / 2);
    for (let j = 0; j < yuk; j++) {
      const yy = y0 + j;
      if (yy < 0 || yy >= H) continue;
      for (let i = 0; i < g; i++) {
        const xx = x0 + i;
        if (xx < 0 || xx >= W) continue;
        const k = yy * W + xx;
        if (zb[k] > iz * 1.004) continue;
        cikis[k] = renk;
      }
    }
  }

  function muritGozleri(t) {
    if (parla < 0.5) return;
    for (let n = 0; n < muritler.length; n++) {
      const m = muritler[n];
      if (!m.gs) continue;
      if (!azalt && Math.sin(t * 0.63 + m.tohum) * Math.sin(t * 0.37 + m.tohum * 2) > 0.9) continue;
      const ara = m.gs * 0.052;
      const g = Math.max(1, (m.gs * 0.046) | 0), yuk = Math.max(1, (m.gs * 0.02) | 0);
      gozNokta(m.gx - ara, m.gy, g, yuk, KOR, m.iz);
      gozNokta(m.gx + ara, m.gy, g, yuk, KOR, m.iz);
    }
  }

  function mumCiz(t) {
    for (let n = 0; n < MUMLAR.length; n++) {
      const [x, z, boy, tohum] = MUMLAR[n];
      const A = yansit(x, 0, z), U2 = yansit(x, boy, z);
      if (!A || !U2) continue;
      const bx = Math.round(A[0]), by = Math.round(A[1]), ty = Math.round(U2[1]);
      const k0 = ty * W + bx;
      if (bx < 1 || bx >= W - 1 || ty < 3 || by >= H || zb[k0] > U2[2] * 1.01) continue;
      const ol = vig[k0] * parla;
      if (ol < 0.12) continue;
      const kalin = Math.max(1, Math.round(U2[3] * 0.024));
      for (let y = Math.max(0, ty); y <= by; y++) {
        for (let i = 0; i < kalin; i++) {
          const k = y * W + bx + i;
          if (mt[k] === M_KUMAS || mt[k] === M_SILUET) continue;
          cikis[k] = KAGIT;
        }
      }
      const tit = azalt ? 1 : 0.8 + 0.2 * Math.sin(t * 9 + tohum) * Math.sin(t * 5.3 + tohum * 3);
      const alev = Math.max(2, Math.round(U2[3] * 0.06 * tit));
      for (let j = 1; j <= alev; j++) {
        const k = (ty - j) * W + bx;
        if (ty - j >= 0) cikis[k] = j === 1 ? KAGIT : KOR;
      }
      const rr = Math.max(4, Math.min(16, U2[3] * 0.2));
      const cy = ty - alev * 0.6;
      for (let y = Math.max(0, (cy - rr) | 0); y <= Math.min(H - 1, (cy + rr) | 0); y++) {
        for (let xx = Math.max(0, (bx - rr) | 0); xx <= Math.min(W - 1, (bx + rr) | 0); xx++) {
          const q = Math.hypot(xx - bx, y - cy) / rr;
          if (q >= 1) continue;
          const k = y * W + xx;
          if (mt[k] === M_KUMAS || mt[k] === M_SILUET || mt[k] === M_EKRAN) continue;
          const v = (1 - q) * (1 - q) * 0.6 * tit * ol;
          if (v > BAYER[((y & 7) << 3) | (xx & 7)]) cikis[k] = KOR;
        }
      }
    }
  }

  // Yeni gelen ekranın dışından gelir: kamera dönünce oradadır.
  function yeniMurit() {
    let a = 0, r = 0;
    for (let d = 0; d < 10; d++) {
      a = rast() * Math.PI * 2;
      r = 4.4 + rast() * 0.6;
      const P = yansit(Math.sin(a) * r, 0, Math.cos(a) * r);
      if (!P || P[0] < -10 || P[0] > W + 10) break;
    }
    muritEkle(a, r);
  }

  function kare(az, grupAz, t) {
    kareNo++;
    aydinlatma(az, grupAz, t);
    zb.fill(0);
    mt.fill(0);
    const Ka = cam, ax = AY_ISIK[0], ay = AY_ISIK[1], azz = AY_ISIK[2];
    const AY_G = 0.03;
    // Otuz bir saniyede bir, göz açıp kapayana kadar: kulaklık yok, iki göz var.
    const bakis = yuzDonuk || (!azalt && parla >= 1 && t % 31 > 30.62);

    // Sabit geometri
    for (let i = 0, p = 0, q = 0; i < S.adet; i++, p += 9, q += 3) {
      const nx = S.n[q], ny = S.n[q + 1], nz = S.n[q + 2];
      if ((Ka[0] - S.p[p]) * nx + (Ka[1] - S.p[p + 1]) * ny + (Ka[2] - S.p[p + 2]) * nz <= 0) continue;
      const ayT = Math.max(0, nx * ax + ny * ay + nz * azz) * AY_G + 0.006;
      kirpVeCiz(S.p[p], S.p[p + 1], S.p[p + 2], S.p[p + 3], S.p[p + 4], S.p[p + 5], S.p[p + 6], S.p[p + 7], S.p[p + 8],
        dolguUcgen, nx, ny, nz, S.a[i], S.m[i], S.e[i], ayT, 0);
    }
    // Grup: figür kameraya hep sırtını döner
    const dp = G.dp, dn = G.dn, c = grupC, s = grupS;
    for (let i = 0; i < G.p.length; i += 3) {
      const x = G.p[i], z = G.p[i + 2];
      dp[i] = x * c + z * s; dp[i + 1] = G.p[i + 1]; dp[i + 2] = -x * s + z * c;
    }
    for (let i = 0; i < G.n.length; i += 3) {
      const x = G.n[i], z = G.n[i + 2];
      dn[i] = x * c + z * s; dn[i + 1] = G.n[i + 1]; dn[i + 2] = -x * s + z * c;
    }
    for (let i = 0, p = 0, q = 0; i < G.adet; i++, p += 9, q += 3) {
      if (bakis && i >= KULAK_BAS) continue;
      const nx = dn[q], ny = dn[q + 1], nz = dn[q + 2];
      if ((Ka[0] - dp[p]) * nx + (Ka[1] - dp[p + 1]) * ny + (Ka[2] - dp[p + 2]) * nz <= 0) continue;
      const ayT = Math.max(0, nx * ax + ny * ay + nz * azz) * (G.m[i] === M_KUMAS ? 0 : AY_G * 1.5) + 0.005;
      kirpVeCiz(dp[p], dp[p + 1], dp[p + 2], dp[p + 3], dp[p + 4], dp[p + 5], dp[p + 6], dp[p + 7], dp[p + 8],
        dolguUcgen, nx, ny, nz, G.a[i], G.m[i], G.e[i], ayT, 0);
    }

    muritCiz();

    // Gölgeler: silüetleri ışıktan zemine izdüşür.
    const LyN = Ly;
    const izd = (P) => {
      const y = Math.min(P[1], LyN - 0.09);
      const k = LyN / (LyN - y);
      return [Lx + (P[0] - Lx) * k, 0, Lz + (P[2] - Lz) * k];
    };
    for (let i = 0; i < golgeSabit.length; i++) {
      const u = golgeSabit[i], A = izd(u[0]), B = izd(u[1]), C = izd(u[2]);
      kirpVeCiz(A[0], 0, A[2], B[0], 0, B[2], C[0], 0, C[2], golgeUcgen);
    }
    const siluetDunya = figSiluet.map(([x, y]) => {
      const X = x * FS, Z = FZ;
      return izd([X * c + Z * s, y * FS, -X * s + Z * c]);
    });
    for (let i = 1; i < siluetDunya.length - 1; i++) {
      const A = siluetDunya[0], B = siluetDunya[i], C = siluetDunya[i + 1];
      kirpVeCiz(A[0], 0, A[2], B[0], 0, B[2], C[0], 0, C[2], golgeUcgen);
    }

    // Ekran parıltısı
    let parX = -999, parY = -999, parR = 0;
    {
      const dx = ekSx - Ka[0], dy = ekSy - Ka[1], dz = ekSz - Ka[2];
      const z = dx * F[0] + dy * F[1] + dz * F[2];
      if (z > 0.2) {
        parX = ox + (f * (dx * R[0] + dy * R[1] + dz * R[2])) / z;
        parY = oy - (f * (dx * U[0] + dy * U[1] + dz * U[2])) / z;
        parR = (f * 0.62) / z;
      }
    }
    const parR2 = parR * parR;

    // Birleştirme
    const nabiz = (azalt ? 0.7 : 0.62 + 0.2 * Math.sin(t * 0.9)) * parla;
    for (let y = 0, i = 0; y < H; y++) {
      const by = (y & 7) << 3;
      for (let x = 0; x < W; x++, i++) {
        const t8 = BAYER[by | (x & 7)];
        const m = mt[i];
        if (m === 0) {
          cikis[i] = MUREKKEP;
        } else if (m === M_EKRAN) {
          cikis[i] = br[i] * parla > t8 ? KOR : KOR_KOYU;
        } else if (m === M_HALKA) {
          cikis[i] = nabiz * vig[i] > t8 * 0.8 ? KOR : MUREKKEP;
        } else if (m === M_SILUET) {
          cikis[i] = MUREKKEP;
        } else {
          let v = br[i];
          if (m === M_ZEMIN && sh[i] === kareNo) v *= 0.1;
          v = v * vig[i] * parla - TABAN;
          let renk = v > t8 ? (v > KEMIK_ESIK ? KAGIT : KAN) : MUREKKEP;
          if (m !== M_KUMAS && parR > 0) {
            const dx = x - parX, dy = y - parY;
            const q = (dx * dx + dy * dy) / parR2;
            if (q < 3.5) {
              const g = 0.36 / (1 + q * q * 1.6) * vig[i] * parla;
              if (g > t8) renk = KOR;
            }
          }
          cikis[i] = renk;
        }
      }
    }

    // Figürün dış çizgisi: siyah gölgeyle birleşmesin diye tek nokta kâğıt rengi.
    for (let y = 1, i = W + 1; y < H - 1; y++, i += 2) {
      for (let x = 1; x < W - 1; x++, i++) {
        const m = mt[i];
        if (m === M_KUMAS) {
          if ((mt[i - 1] !== m || mt[i + 1] !== m || mt[i - W] !== m || mt[i + W] !== m) && parla > 0.5) cikis[i] = KAGIT;
        } else if (m === M_SILUET) {
          if ((mt[i - 1] !== m || mt[i + 1] !== m || mt[i - W] !== m || mt[i + W] !== m) && vig[i] > 0.4 && parla > 0.5) cikis[i] = KAN;
        }
      }
    }

    // Yıldızlar ve ay yalnızca gökte
    for (let i = 0; i < YILDIZ.length; i += 4) {
      const dx = YILDIZ[i], dy = YILDIZ[i + 1], dz = YILDIZ[i + 2];
      const z = dx * F[0] + dy * F[1] + dz * F[2];
      if (z <= 0.05) continue;
      const sx = (ox + (f * (dx * R[0] + dy * R[1] + dz * R[2])) / z) | 0;
      const sy = (oy - (f * (dx * U[0] + dy * U[1] + dz * U[2])) / z) | 0;
      if (sx < 0 || sy < 0 || sx >= W || sy >= H) continue;
      const k = sy * W + sx;
      if (mt[k] !== 0 || vig[k] < 0.5) continue;
      const parla = YILDIZ[i + 3];
      if (!azalt && parla < 0.25 && Math.sin(t * 3 + i) > 0.5) continue;
      cikis[k] = KAGIT;
    }
    {
      // Tutulma: kara bir disk, çevresinde kor.
      const z = AY[0] * F[0] + AY[1] * F[1] + AY[2] * F[2];
      if (z > 0.1) {
        const mx = ox + (f * (AY[0] * R[0] + AY[1] * R[1] + AY[2] * R[2])) / z;
        const my = oy - (f * (AY[0] * U[0] + AY[1] * U[1] + AY[2] * U[2])) / z;
        const mr = Math.max(9, H * 0.066), dis = mr * 2.3;
        const x0 = Math.max(0, (mx - dis) | 0), x1 = Math.min(W - 1, (mx + dis + 1) | 0);
        const y0 = Math.max(0, (my - dis) | 0), y1 = Math.min(H - 1, (my + dis + 1) | 0);
        for (let y = y0; y <= y1; y++) {
          for (let x = x0; x <= x1; x++) {
            const q = Math.hypot(x + 0.5 - mx, y + 0.5 - my) / mr;
            if (q > 2.3) continue;
            const k = y * W + x;
            if (mt[k] !== 0) continue;
            if (q <= 1) {
              cikis[k] = MUREKKEP;
              continue;
            }
            const a = 1 - (q - 1) / 1.3;
            const v = ((q < 1.07 ? 1.2 : 0) + a * a * a * 0.62) * vig[k] * parla;
            if (v > BAYER[((y & 7) << 3) | (x & 7)]) cikis[k] = q < 1.05 ? KAGIT : KOR;
          }
        }
      }
    }

    mumCiz(t);
    muritGozleri(t);
    if (bakis) {
      // Kapüşonun içinde iki nokta. Yerel +z kameraya bakar.
      const yY = 1.2 * FS, yZ = FZ + 0.25, yX = 0.062;
      for (let i = -1; i <= 1; i += 2) {
        const X = i * yX;
        const P = yansit(X * c + yZ * s, yY, -X * s + yZ * c);
        if (P) gozNokta(P[0], P[1], Math.max(1, (P[3] * 0.05) | 0), Math.max(1, (P[3] * 0.022) | 0), KOR, P[2]);
      }
    }
    ctx.putImageData(img, 0, 0);
  }

  // ---------- etkileşim ----------
  let az = 0.32, grupAz = az, surAz = 0;
  let isr = 0, surukle = false, sonX = 0;
  const ipucu = document.getElementById('ipucu');
  const burada = document.getElementById('burada');
  let sonBurada = -1;
  let asama = 0;
  const ASAMA = [
    [1.6, 'olmaz.'],
    [4.2, 'sen döndükçe o da dönüyor.'],
    [8, 'yapma.'],
    [10.8, 'o da seni görecek.'],
  ];

  let kesitAcik = false;
  function kesitAc() {
    const kesit = document.getElementById('kesit');
    kesitAcik = true;
    window.Ortak.portreResmi().then((resim) => {
      const nokta = giris.clientWidth < 700 ? 2 : 3;
      const g = Math.floor(giris.clientWidth / nokta), y = Math.floor(giris.clientHeight / nokta);
      kesit.width = g;
      kesit.height = y;
      const c = kesit.getContext('2d');
      const v = c.createImageData(g, y);
      window.Ortak.atkinson(window.Ortak.griOrnekle(resim, g, y, [0, 0.3, 1, 0.66]), g, y, null, new Uint32Array(v.data.buffer), KAGIT, MUREKKEP);
      c.putImageData(v, 0, 0);
      kesit.hidden = false;
      Ses.cigilik(0.8);
      ipucu.textContent = 'madem çok istedin.';
      setTimeout(() => {
        kesit.hidden = true;
        kesitAcik = false;
        ipucu.textContent = 'artık o da senin yüzünü biliyor.';
      }, 1500);
    });
  }

  giris.addEventListener('pointerdown', (e) => {
    if (e.target.closest('a,button')) return;
    surukle = true;
    sonX = e.clientX;
    giris.classList.add('suruklenir');
  });
  window.addEventListener('pointermove', (e) => {
    if (!surukle) return;
    const d = (e.clientX - sonX) * 0.0075;
    sonX = e.clientX;
    surAz -= d;
    if (kesitAcik) return;
    isr += Math.abs(d);
    while (asama < ASAMA.length && isr > ASAMA[asama][0]) {
      ipucu.textContent = ASAMA[asama][1];
      asama++;
    }
    if (isr > 12.6) {
      isr = 0;
      asama = 0;
      kesitAc();
    }
    if (azalt) iste();
  });
  const birak = () => { surukle = false; giris.classList.remove('suruklenir'); };
  window.addEventListener('pointerup', birak);
  window.addEventListener('pointercancel', birak);

  // ---------- döngü ----------
  let gorunur = true, calisiyor = false, onceki = 0, sayacZaman = 0, sayacKare = 0, sayacMs = 0, kotu = 0, girisAn = 0;
  const KARE_MS = 1000 / 30;
  function dongu(simdi) {
    if (kok.classList.contains('esikte') || !gorunur || document.hidden) { calisiyor = false; return; }
    if (azalt) calisiyor = false; else requestAnimationFrame(dongu);
    const fark = simdi - onceki;
    if (!azalt && fark < KARE_MS - 2) return;
    const dt = Math.min(0.1, fark / 1000);
    onceki = simdi;
    if (!azalt && !surukle) surAz += dt * 0.055;
    az += (surAz + 0.32 - az) * Math.min(1, dt * 6);
    // Figür sırtını hep döner; hızlı sürüklersen bir an gecikir ama yüzünü asla göstermez.
    grupAz += (az - grupAz) * Math.min(1, dt * 3.4);
    const LAG = 0.92;
    if (az - grupAz > LAG) grupAz = az - LAG;
    if (grupAz - az > LAG) grupAz = az + LAG;

    if (girisAn) {
      const sn = (simdi - girisAn) / 1000;
      if (!azalt) parla = Math.max(0, Math.min(1, (sn - 0.5) / 3.1));
      // Sen başka yerdeyken de gelmeye devam ederler.
      const hedef = Math.min(29, sn < 37 ? sn / 3.1 : 12 + (sn - 37) / 9);
      while (!azalt && muritler.length - 1 < hedef) yeniMurit();
      for (let i = 0; i < muritler.length; i++) {
        const m = muritler[i];
        if (!m.sabit && m.r > 4.1) m.r -= dt * 0.004;
      }
      if (muritler.length !== sonBurada) {
        sonBurada = muritler.length;
        burada.textContent = `burada: ${sonBurada + 2} · biri sen`;
      }
    }

    const bas = performance.now();
    kare(az, grupAz, simdi / 1000);
    const harcanan = performance.now() - bas;
    sayacKare++;
    sayacMs += harcanan;
    kotu = harcanan > 28 ? kotu + 1 : Math.max(0, kotu - 1);
    if (kotu > 40 && pikselBoy < 7) {
      kotu = 0;
      pikselBoy++;
      boyutla();
    }
    if (simdi - sayacZaman > 800) {
      tuval.dataset.fps = Math.round((sayacKare * 1000) / (simdi - sayacZaman));
      tuval.dataset.ms = (sayacMs / sayacKare).toFixed(1);
      sayacZaman = simdi;
      sayacKare = 0;
      sayacMs = 0;
    }
  }
  function iste() {
    if (calisiyor && !azalt) return;
    calisiyor = true;
    requestAnimationFrame(dongu);
  }

  dinle('cevap', (tur) => { yuzDonuk = tur === 'verdi'; iste(); });
  dinle('esik', () => {
    girisAn = performance.now();
    // Biri daireye yakın durur; kamera dönünce önünden geçer.
    muritEkle(az + 0.85, 3.05, true);
    if (azalt) for (let i = 0; i < 12; i++) muritEkle(rast() * Math.PI * 2, 4.4 + rast() * 0.6);
    iste();
  });

  boyutla();
  new IntersectionObserver((g) => {
    gorunur = g[0].isIntersecting;
    if (gorunur) iste();
  }, { threshold: 0.01 }).observe(giris);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) iste(); });
  let sonG = giris.clientWidth, sonY = giris.clientHeight;
  window.addEventListener('resize', () => {
    const g = giris.clientWidth, y = giris.clientHeight;
    if (g === sonG && Math.abs(y - sonY) < 90) return;
    sonG = g;
    sonY = y;
    pikselBoy = 0;
    boyutla();
    iste();
  });
  iste();
})();
