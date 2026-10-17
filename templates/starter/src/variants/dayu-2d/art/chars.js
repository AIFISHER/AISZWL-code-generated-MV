// Original cast, 2D cel style (hand-painted Chinese animation look). Local frame: feet at (0,0), +x = facing direction, height ~620.
// drawChar(g, x, y, s, P, T): P = {kind:'hero'|'girl'|'elder', face, back, lean, tilt, look, eyes, mouth, brows, aN, aF ([shoulder, elbow] rad),
//   walk (phase rad|null), wind (0..1), windDir (±1), sword ('hand'|'back'|'none'), swordAng (world rad, for 'hand'), tear, rim, rimColor, light ([dx,dy])}
import { clamp, rgba, mixHex, lerp, TAU } from '../../../core/util.js';
import { sp, cel, line, cloudCurl, INK, LW } from './draw.js';

export const CAST = {
  hero: { robe: '#1e2742', robeSh: '#0e1226', inner: '#ece6d8', trim: '#3f8f8a', sash: '#b3262c', skin: '#f3d6c2', skinSh: '#d39c8c', hair: '#151a2b', hairHi: '#4b5c8f', iris: '#2a1c1a', boots: '#151520', lining: '#2f6f73', gold: '#d9a441' },
  girl: { robe: '#c8282c', robeSh: '#7c1426', inner: '#f6f1e8', trim: '#e8b64c', sash: '#f2c6c8', skin: '#f8e0d0', skinSh: '#e0a99c', hair: '#1a1420', hairHi: '#5a4a78', iris: '#3a1d14', boots: '#7c1426', lining: '#f6f1e8', gold: '#e8b64c', shawl: '#f4d9d0' },
  elder: { robe: '#352a52', robeSh: '#17112c', inner: '#cfc8d8', trim: '#9aa3c0', sash: '#1a1630', skin: '#e9cdb6', skinSh: '#b98a7a', hair: '#dfe3ea', hairHi: '#ffffff', iris: '#1c1418', boots: '#120e1c', lining: '#6a5a8f', gold: '#b8c0d8' },
};
const SKINLINE = '#6a3a34';
const BANGS = { hero: [[-46, -560], [-40, -596], [-6, -614], [36, -604], [52, -578], [40, -576], [44, -556], [30, -566], [24, -548], [12, -566], [4, -550], [-6, -570], [-18, -556], [-26, -572], [-38, -548]],
  girl: [[-46, -556], [-42, -594], [-8, -614], [34, -606], [52, -576], [42, -560], [34, -570], [22, -556], [10, -572], [-4, -560], [-16, -574], [-30, -556]] };
const strands = (g, C, list) => { for (const pts of list) line(g, pts, rgba(C.hairHi, 0.45), 1.3); };

function ribbon(g, pts, w0, w1, fill, lineC = INK, lw = 1.6, shade) {
  // strip of tapering width along a smooth centreline
  const N = 24, c = []; const n = pts.length;
  const at = (t) => { const f = t * (n - 1), i = Math.min(n - 2, Math.floor(f)), u = f - i; const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(n - 1, i + 2)];
    const q = (a, b, cc, d) => 0.5 * (2 * b + (-a + cc) * u + (2 * a - 5 * b + 4 * cc - d) * u * u + (-a + 3 * b - 3 * cc + d) * u * u * u); return [q(p0[0], p1[0], p2[0], p3[0]), q(p0[1], p1[1], p2[1], p3[1])]; };
  for (let i = 0; i <= N; i++) c.push(at(i / N));
  const L = [], R = [];
  for (let i = 0; i <= N; i++) { const a = c[Math.max(0, i - 1)], b = c[Math.min(N, i + 1)]; let dx = b[0] - a[0], dy = b[1] - a[1]; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
    const w = lerp(w0, w1, i / N) / 2; L.push([c[i][0] - dy * w, c[i][1] + dx * w]); R.push([c[i][0] + dy * w, c[i][1] - dx * w]); }
  g.save(); g.beginPath(); g.moveTo(L[0][0], L[0][1]); for (const p of L) g.lineTo(p[0], p[1]); for (let i = R.length - 1; i >= 0; i--) g.lineTo(R[i][0], R[i][1]); g.closePath();
  if (shade) { const gr = g.createLinearGradient(c[0][0], c[0][1], c[N][0], c[N][1]); gr.addColorStop(0, fill); gr.addColorStop(1, shade); g.fillStyle = gr; } else g.fillStyle = fill;
  g.fill(); if (lw) { g.strokeStyle = lineC; g.lineWidth = lw; g.lineJoin = 'round'; g.stroke(); } g.restore();
  return c;
}
export { ribbon };

/** jian sword: hilt at (x,y), pointing ang. o:{len, glow, sheath} */
export function drawSword(g, x, y, ang, o = {}) {
  const { len = 300, glow = 0, sheath = false, tassel = '#c0282c', T = 0, wind = 0.3, broken = false } = o;
  g.save(); g.translate(x, y); g.rotate(ang);
  // tassel from pommel
  const tw = Math.sin(T * 4) * 8 * wind;
  ribbon(g, [[-46, 0], [-62, 6 + tw], [-84, 14 - tw], [-104, 20 + tw]], 6, 2, tassel, INK, 1);
  g.fillStyle = '#2a1e1a'; g.beginPath(); g.roundRect(-44, -5, 44, 10, 3); g.fill(); g.strokeStyle = INK; g.lineWidth = 1.5; g.stroke();
  for (let i = 0; i < 5; i++) { g.strokeStyle = '#6b4a2a'; g.beginPath(); g.moveTo(-40 + i * 8, -5); g.lineTo(-36 + i * 8, 5); g.stroke(); }
  g.fillStyle = '#d9a441'; g.beginPath(); g.arc(-46, 0, 6, 0, TAU); g.fill(); g.stroke();
  // guard
  g.beginPath(); g.moveTo(0, -16); g.quadraticCurveTo(8, -6, 6, 0); g.quadraticCurveTo(8, 6, 0, 16); g.lineTo(-4, 0); g.closePath(); g.fillStyle = '#d9a441'; g.fill(); g.stroke();
  if (sheath) {
    g.beginPath(); g.roundRect(4, -8, len, 16, 7); const sg = g.createLinearGradient(0, -8, 0, 8); sg.addColorStop(0, '#3a2a40'); sg.addColorStop(1, '#140e1a'); g.fillStyle = sg; g.fill(); g.stroke();
    g.fillStyle = '#d9a441'; for (const p of [30, len - 30]) { g.fillRect(p, -8, 10, 16); }
  } else {
    if (glow > 0) { g.save(); g.globalCompositeOperation = 'lighter'; const gg = g.createLinearGradient(0, 0, len, 0); gg.addColorStop(0, rgba('#bfe0ff', 0.5 * glow)); gg.addColorStop(1, rgba('#bfe0ff', 0)); g.fillStyle = gg; g.beginPath(); g.ellipse(len / 2, 0, len * 0.62, 26, 0, 0, TAU); g.fill(); g.restore(); }
    g.beginPath(); if (broken) { g.moveTo(6, -6); g.lineTo(len, -5); g.lineTo(len - 8, -1); g.lineTo(len + 6, 2); g.lineTo(len - 4, 6); g.lineTo(6, 6); } else { g.moveTo(6, -6); g.lineTo(len - 22, -5); g.lineTo(len, 0); g.lineTo(len - 22, 5); g.lineTo(6, 6); } g.closePath();
    const bg = g.createLinearGradient(0, -6, 0, 6); bg.addColorStop(0, '#f4f8ff'); bg.addColorStop(0.48, '#c7d2e6'); bg.addColorStop(0.52, '#7f8ca8'); bg.addColorStop(1, '#a9b6cc'); g.fillStyle = bg; g.fill(); g.strokeStyle = INK; g.lineWidth = 1.6; g.stroke();
    g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(10, 0); g.lineTo(len - 20, 0); g.stroke();
  }
  g.restore();
}

function armChain(S, a1, a2, L1 = 116, L2 = 106) { const E = [S[0] + Math.sin(a1) * L1, S[1] + Math.cos(a1) * L1]; const H = [E[0] + Math.sin(a1 + a2) * L2, E[1] + Math.cos(a1 + a2) * L2]; return { S, E, H }; }

function drawArm(g, C, ch, a, P, T, near) {
  const { S, E, H } = ch; const wind = (P.wind || 0) * (P.windDir || 1) * (P.face || 1);
  const n = (A, B) => { const dx = B[0] - A[0], dy = B[1] - A[1], d = Math.hypot(dx, dy) || 1; return [-dy / d, dx / d]; };
  const n1 = n(S, E), n2 = n(E, H); const sw = Math.sin(T * 3.1 + (near ? 0 : 1.7));
  const drop = [-wind * 34 + sw * 6 * (P.wind || 0) - 6, 96 + (P.kind === 'girl' ? 24 : 0)];
  const fa = a === 'hand' ? 1 : 1; const robe = near ? C.robe : mixHex(C.robe, C.robeSh, 0.35);
  const pts = [[S[0] + n1[0] * 30, S[1] + n1[1] * 30], [E[0] + n1[0] * 28, E[1] + n1[1] * 28], [H[0] + n2[0] * 26, H[1] + n2[1] * 26],
    [H[0] - n2[0] * 18 + drop[0], H[1] - n2[1] * 10 + drop[1]], [(E[0] + H[0]) / 2 + drop[0] * 1.1, Math.max(E[1], H[1]) + drop[1] * 0.95], [E[0] - n1[0] * 30 + drop[0] * 0.4, E[1] - n1[1] * 30 + 30], [S[0] - n1[0] * 30, S[1] - n1[1] * 30 + 10]];
  // hand first (sticks out of cuff)
  const dx = H[0] - E[0], dy = H[1] - E[1], d = Math.hypot(dx, dy) || 1; const hx = H[0] + (dx / d) * 16, hy = H[1] + (dy / d) * 16;
  cel(g, (q) => { q.ellipse(hx, hy, 13, 10, Math.atan2(dy, dx), 0, TAU); }, { fill: C.skin, shade: C.skinSh, line: SKINLINE, lw: 1.6, box: [hx - 14, hy - 14, hx + 14, hy + 14] });
  cel(g, (q) => sp(q, pts), { fill: robe, shade: C.robeSh, lw: 2.2, rim: P.rim ?? 0.5, rimColor: P.rimColor || '#cfe0ff', box: [S[0] - 60, S[1] - 20, S[0] + 60, S[1] + 260], dir: P.light || [1, -0.3] });
  // cuff lining
  g.save(); g.fillStyle = C.lining; g.strokeStyle = INK; g.lineWidth = 1.4; g.beginPath(); g.ellipse(H[0] + n2[0] * 1 + drop[0] * 0.15, H[1] + 4 + drop[1] * 0.15, 8, 20, Math.atan2(dy, dx) + Math.PI / 2, 0, TAU); g.fill(); g.stroke();
  // gold trim on sleeve hem
  g.strokeStyle = C.trim; g.lineWidth = 3; g.beginPath(); sp(g, [pts[2], pts[3], pts[4]], false); g.stroke(); g.restore();
  return [hx, hy];
}

function drawHead(g, C, P, T) {
  const k = P.kind; const look = (P.look || 0) * 4; const eo = clamp(P.eyes ?? 1);
  const face = [[-44, -566], [-44, -534], [-30, -508], [4, -490], [32, -505], [46, -530], [48, -566], [30, -596], [0, -603], [-30, -594]];
  // ear
  cel(g, (q) => q.ellipse(-28, -540, 9, 14, -0.2, 0, TAU), { fill: C.skin, shade: C.skinSh, line: SKINLINE, lw: 1.6, box: [-38, -556, -18, -524] });
  if (P.back) return;
  cel(g, (q) => sp(q, face), { fill: C.skin, shade: C.skinSh, line: SKINLINE, lw: 2, box: [-46, -604, 50, -490], dir: P.light || [1, -0.3], rim: (P.rim ?? 0.5) * 0.6, rimColor: P.rimColor || '#dfe8ff' });
  // blush
  g.save(); g.globalAlpha = k === 'girl' ? 0.42 : 0.18; g.fillStyle = '#ff8a8a'; g.beginPath(); g.ellipse(-8, -522, 11, 5, 0, 0, TAU); g.ellipse(34, -522, 7, 4, 0, 0, TAU); g.fill(); g.restore();
  // forehead shadow cast by the bangs
  g.save(); g.beginPath(); sp(g, face); g.clip(); g.fillStyle = rgba(C.skinSh, 0.5);
  if (P.kind !== 'elder') { g.save(); g.translate(-3, 9); g.beginPath(); sp(g, BANGS[P.kind]); g.fill(); g.restore(); }
  // far-cheek soft shade + under-chin
  const sg = g.createLinearGradient(-46, 0, 10, 0); sg.addColorStop(0, rgba(C.skinSh, 0.6)); sg.addColorStop(1, rgba(C.skinSh, 0)); g.fillStyle = sg; g.fillRect(-50, -600, 60, 120); g.restore();
  // eyes: almond lids, layered iris, catchlights
  const sharp = k === 'hero' ? 0.78 : k === 'girl' ? 1 : 0.55;
  const eyes = [[-6, -539, 15.5, -1], [30, -539, 10.5, 1]];
  for (const [ex, ey, ew, od] of eyes) {
    const eh = 10.5 * sharp * eo; const O = [ex + od * ew, ey - 10.5 * sharp * 0.25], I = [ex - od * ew, ey + 2];
    const lidPath = (q, h) => { q.moveTo(O[0], O[1]); q.bezierCurveTo(ex + od * ew * 0.4, ey - h * 1.3, ex - od * ew * 0.55, ey - h * 1.15, I[0], I[1]); };
    g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
    if (eo > 0.12) {
      g.beginPath(); lidPath(g, eh); g.bezierCurveTo(ex - od * ew * 0.3, ey + eh * 0.95, ex + od * ew * 0.55, ey + eh * 0.85, O[0], O[1]); g.closePath();
      g.save(); g.clip(); g.fillStyle = '#fbf6ee'; g.fillRect(ex - 24, ey - 24, 48, 48);
      const ir = Math.min(ew * 0.6, 9.8); const icx = ex + look - od * 1.5, icy = ey + 1;
      const ig = g.createRadialGradient(icx, icy + ir * 0.4, 0, icx, icy, ir); ig.addColorStop(0, k === 'elder' ? '#6a6070' : '#a0683a'); ig.addColorStop(0.55, k === 'girl' ? '#5a2a1a' : '#3a2418'); ig.addColorStop(1, '#0c0608');
      g.fillStyle = ig; g.beginPath(); g.arc(icx, icy, ir, 0, TAU); g.fill();
      g.fillStyle = '#05030a'; g.beginPath(); g.arc(icx, icy, ir * 0.42, 0, TAU); g.fill();
      g.strokeStyle = 'rgba(255,220,170,0.35)'; g.lineWidth = 1; g.beginPath(); g.arc(icx, icy, ir * 0.72, 0.3, 2.8); g.stroke();
      g.fillStyle = 'rgba(255,255,255,0.97)'; g.beginPath(); g.ellipse(icx - 2.5, icy - 3.5, ir * 0.3, ir * 0.24, -0.4, 0, TAU); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.7)'; g.beginPath(); g.arc(icx + 3, icy + 3.5, ir * 0.12, 0, TAU); g.fill();
      g.fillStyle = 'rgba(40,20,50,0.28)'; g.beginPath(); lidPath(g, eh); g.lineTo(ex + 30, ey - 30); g.lineTo(ex - 30, ey - 30); g.closePath(); g.save(); g.translate(0, 4); g.fill(); g.restore();
      g.restore();
      g.strokeStyle = INK; g.lineWidth = k === 'girl' ? 3.6 : 3.3; g.beginPath(); lidPath(g, eh); g.stroke();
      // outer-corner flick + crease + lower lid
      g.lineWidth = 2.4; g.beginPath(); g.moveTo(O[0], O[1]); g.lineTo(O[0] + od * 5, O[1] - (k === 'girl' ? 5 : 2)); g.stroke();
      if (k === 'girl') { g.lineWidth = 1.6; for (let j = 0; j < 2; j++) { g.beginPath(); g.moveTo(O[0] - od * j * 4, O[1] - 1 - j); g.lineTo(O[0] + od * (4 - j * 2), O[1] - 6 - j * 2); g.stroke(); } }
      g.strokeStyle = rgba(SKINLINE, 0.6); g.lineWidth = 1.1; g.beginPath(); g.moveTo(O[0] - od * 2, O[1] - 5); g.bezierCurveTo(ex + od * ew * 0.4, ey - eh * 1.3 - 5, ex - od * ew * 0.4, ey - eh * 1.2 - 5, I[0] + od * 4, I[1] - 6); g.stroke();
      g.strokeStyle = rgba(SKINLINE, 0.7); g.lineWidth = 1.2; g.beginPath(); g.moveTo(ex - od * ew * 0.5, ey + eh * 0.8); g.quadraticCurveTo(ex + od * ew * 0.3, ey + eh * 0.95, O[0] - od * 2, O[1] + 3); g.stroke();
    } else { g.strokeStyle = INK; g.lineWidth = 2.8; g.beginPath(); g.moveTo(O[0] + od * 2, O[1]); g.quadraticCurveTo(ex, ey + 6, I[0], I[1]); g.stroke();
      if (k === 'girl') { g.lineWidth = 1.4; for (let j = 0; j < 3; j++) { const xx = lerp(O[0], ex, j / 3); g.beginPath(); g.moveTo(xx, ey + 3); g.lineTo(xx + od * 2, ey + 7); g.stroke(); } } }
    g.restore();
  }
  // brows
  const br = P.brows || 'n'; const bw = k === 'elder' ? 5 : 2.6; const dy0 = br === 'angry' ? 4 : br === 'sad' ? -3 : 0;
  g.save(); g.strokeStyle = k === 'elder' ? '#e8ecf2' : INK; g.lineWidth = bw; g.lineCap = 'round';
  g.beginPath(); g.moveTo(-20, -556 - (br === 'sad' ? -2 : 0)); g.quadraticCurveTo(-6, -562, 6, -556 + dy0); g.stroke();
  g.beginPath(); g.moveTo(22, -556 + dy0); g.quadraticCurveTo(32, -561, 42, -555); g.stroke();
  if (k === 'elder') { g.strokeStyle = 'rgba(90,50,50,0.5)'; g.lineWidth = 1; g.beginPath(); g.moveTo(-14, -572); g.lineTo(10, -574); g.moveTo(-10, -578); g.lineTo(8, -580); g.moveTo(-18, -530); g.quadraticCurveTo(-14, -522, -18, -514); g.stroke(); }
  g.restore();
  // nose & mouth
  g.save(); g.strokeStyle = SKINLINE; g.lineWidth = 1.6; g.lineCap = 'round'; g.beginPath(); g.moveTo(24, -530); g.lineTo(28, -520); g.lineTo(23, -518); g.stroke();
  const m = P.mouth || 'n'; g.lineWidth = 2;
  if (m === 'o' || m === 'shout') { g.fillStyle = '#5a1e24'; g.beginPath(); g.ellipse(16, -504, m === 'shout' ? 8 : 4, m === 'shout' ? 7 : 4, 0, 0, TAU); g.fill(); g.stroke(); }
  else { g.beginPath(); const c = m === 'smile' ? 4 : m === 'sad' ? -3 : 0.5; g.moveTo(8, -505); g.quadraticCurveTo(15, -505 + c, 22, -506); g.stroke(); g.fillStyle = k === 'girl' ? 'rgba(220,80,90,0.55)' : 'rgba(190,110,100,0.3)'; g.beginPath(); g.ellipse(15, -501 + c * 0.3, 5, 2.2, 0, 0, TAU); g.fill(); }
  g.restore();
  if (P.tear > 0) { g.save(); g.globalAlpha = clamp(P.tear); const ty = -530 + clamp(P.tear * 1.6 - 0.4) * 26; g.fillStyle = 'rgba(210,235,255,0.95)'; g.strokeStyle = 'rgba(120,160,220,0.9)'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(-4, ty - 8); g.quadraticCurveTo(2, ty, -4, ty + 4); g.quadraticCurveTo(-10, ty, -4, ty - 8); g.fill(); g.stroke(); g.globalCompositeOperation = 'lighter'; g.fillStyle = 'rgba(200,230,255,0.5)'; g.beginPath(); g.arc(-4, ty, 6, 0, TAU); g.fill(); g.restore(); }
}

function hairBack(g, C, P, T) {
  const w = (P.wind || 0) * (P.windDir || 1) * (P.face || 1); const f = (o) => Math.sin(T * 2.6 + o) * (2 + 10 * Math.abs(P.wind || 0));
  const k = P.kind;
  if (k === 'hero') {
    // high ponytail + ribbon
    ribbon(g, [[-24, -606], [-60 - w * 30, -600 + f(0)], [-96 - w * 60, -566 + f(1)], [-120 - w * 80, -520 + f(2)], [-138 - w * 95, -470 + f(3)]], 20, 4, '#e9e4f2', INK, 1.4, '#9aa4c8');
    ribbon(g, [[-16, -612], [-50 - w * 40, -608 + f(0.5)], [-80 - w * 60, -580 + f(1.5)], [-100 - w * 85, -530 + f(2.5)], [-104 - w * 100, -470 + f(3.5)], [-96 - w * 110, -420 + f(4)]], 46, 6, C.hair, INK, 2, '#0a0c16');
    cel(g, (q) => sp(q, [[-50, -560], [-52, -600], [-20, -626], [30, -620], [54, -590], [52, -548], [-30, -520]]), { fill: C.hair, shade: '#07080f', box: [-54, -626, 54, -520] });
  } else if (k === 'girl') {
    const pts = [[-30, -600], [-56, -560], [-70 - w * 30, -480 + f(0) * 0.4], [-80 - w * 60, -400 + f(1)], [-74 - w * 90, -330 + f(2)], [-40 - w * 70, -350 + f(2.4)], [-20 - w * 40, -420], [10, -520], [40, -590]];
    cel(g, (q) => sp(q, pts), { fill: C.hair, shade: '#05040a', box: [-90, -610, 40, -330], lw: 2.2 });
    for (let i = 0; i < 4; i++) line(g, [[-30 + i * 6, -560], [-50 - i * 4 - w * 20, -470 + f(i)], [-56 - i * 6 - w * 50, -380 + f(i + 1)]], 'rgba(120,110,170,0.35)', 1.4);
  } else {
    cel(g, (q) => sp(q, [[-46, -560], [-48, -596], [-10, -618], [32, -612], [52, -584], [50, -548], [-30, -526]]), { fill: C.hair, shade: '#9aa2b8', box: [-50, -618, 52, -526] });
  }
}

function hairFront(g, C, P, T) {
  const k = P.kind; const w = (P.wind || 0) * (P.windDir || 1) * (P.face || 1); const f = (o) => Math.sin(T * 3 + o) * (1 + 5 * Math.abs(P.wind || 0));
  const hl = (pts) => line(g, pts, rgba(C.hairHi, 0.8), 3);
  if (P.back) {
    // full hair covers the head from behind
    cel(g, (q) => sp(q, [[-48, -548], [-50, -594], [-14, -620], [30, -616], [52, -586], [50, -540], [30, -505], [-20, -505]]), { fill: C.hair, shade: '#05060c', box: [-52, -620, 52, -505] });
    hl([[-30, -600], [0, -612], [28, -604]]);
    if (k === 'girl') { cel(g, (q) => sp(q, [[-44, -560], [-50, -500], [-56 - w * 30, -420 + f(0)], [-46 - w * 50, -330 + f(1)], [0 - w * 40, -320 + f(2)], [44 - w * 30, -340 + f(1.5)], [50 - w * 10, -430], [48, -540]]), { fill: C.hair, shade: '#05040a', box: [-56, -560, 50, -320] });
      hl([[-20, -500], [-24 - w * 20, -420], [-20 - w * 40, -350]]); hl([[18, -500], [16 - w * 20, -420], [12 - w * 30, -360]]); }
    if (k === 'hero') { g.save(); g.fillStyle = C.gold; g.beginPath(); g.ellipse(-4, -618, 12, 7, 0, 0, TAU); g.fill(); g.strokeStyle = INK; g.lineWidth = 1.5; g.stroke(); g.restore(); }
    if (k === 'elder') { g.save(); g.fillStyle = '#20182e'; g.beginPath(); g.roundRect(-12, -634, 24, 26, 6); g.fill(); g.stroke(); g.restore(); }
    return;
  }
  if (k === 'hero') {
    cel(g, (q) => sp(q, BANGS.hero), { fill: C.hair, shade: '#05060c', box: [-46, -614, 52, -548], dir: [0.7, -0.7] });
    ribbon(g, [[-36, -570], [-40 + w * 4, -540 + f(0)], [-36 - w * 8, -505 + f(1)]], 14, 3, C.hair, INK, 1.4);
    ribbon(g, [[46, -572], [50 - w * 4, -540 + f(1)], [46 - w * 8, -508 + f(2)]], 10, 2, C.hair, INK, 1.2);
    hl([[-30, -594], [0, -606], [26, -600]]); strands(g, C, [[[-20, -600], [-14, -580], [-18, -562]], [[6, -606], [10, -584], [6, -560]], [[28, -598], [30, -580], [26, -566]], [[-36, -584], [-34, -566]]]);
    g.save(); g.fillStyle = C.gold; g.beginPath(); g.ellipse(-20, -620, 11, 6, -0.4, 0, TAU); g.fill(); g.strokeStyle = INK; g.lineWidth = 1.4; g.stroke(); g.restore();
  } else if (k === 'girl') {
    cel(g, (q) => sp(q, BANGS.girl), { fill: C.hair, shade: '#05040a', box: [-46, -614, 52, -556], dir: [0.7, -0.7] });
    ribbon(g, [[-38, -566], [-44 + w * 4, -520 + f(0)], [-40 - w * 10, -470 + f(1)], [-34 - w * 20, -440 + f(2)]], 16, 3, C.hair, INK, 1.4);
    ribbon(g, [[46, -566], [52 - w * 4, -520 + f(1)], [50 - w * 10, -470 + f(2)]], 12, 2, C.hair, INK, 1.2);
    hl([[-30, -592], [0, -604], [26, -598]]); strands(g, C, [[[-22, -598], [-18, -576], [-22, -562]], [[4, -604], [8, -582], [4, -566]], [[26, -598], [28, -580], [24, -566]]]);
    // twin loops + red ribbon + flower pin
    for (const [bx, by, r] of [[-30, -616, 16], [12, -626, 14]]) cel(g, (q) => q.ellipse(bx, by, r, r * 0.8, 0, 0, TAU), { fill: C.hair, shade: '#05040a', box: [bx - r, by - r, bx + r, by + r] });
    ribbon(g, [[-20, -620], [-50 - w * 30, -610 + f(0)], [-80 - w * 60, -590 + f(1)], [-104 - w * 80, -560 + f(2)]], 9, 4, '#d23a36', INK, 1.2, '#8a1626');
    for (let i = 0; i < 5; i++) { const a = (i / 5) * TAU + 0.3; g.save(); g.fillStyle = '#fff4f2'; g.strokeStyle = '#c86a70'; g.lineWidth = 1; g.beginPath(); g.ellipse(28 + Math.cos(a) * 7, -612 + Math.sin(a) * 7, 6, 4, a, 0, TAU); g.fill(); g.stroke(); g.restore(); }
    g.save(); g.fillStyle = '#f2b640'; g.beginPath(); g.arc(28, -612, 3, 0, TAU); g.fill(); g.restore();
  } else {
    cel(g, (q) => sp(q, [[-46, -556], [-44, -594], [-6, -610], [36, -600], [50, -570], [40, -578], [20, -586], [-10, -584], [-34, -570]]), { fill: C.hair, shade: '#a6aec4', box: [-46, -610, 50, -556] });
    g.save(); g.fillStyle = '#20182e'; g.strokeStyle = INK; g.lineWidth = 1.6; g.beginPath(); g.roundRect(-12, -634, 24, 26, 6); g.fill(); g.stroke(); g.fillStyle = C.gold; g.fillRect(-4, -644, 8, 40); g.restore();
    // beard + moustache
    const bp = [[-26, -520], [-4, -500], [8, -496], [34, -512], [30, -470], [20 - w * 20, -420 + f(0)], [6 - w * 34, -370 + f(1)], [-2 - w * 30, -400], [-16, -460]];
    cel(g, (q) => sp(q, bp), { fill: '#eef1f6', shade: '#aab2c6', box: [-30, -520, 36, -370] });
    for (let i = 0; i < 4; i++) line(g, [[-4 + i * 8, -500], [0 + i * 5 - w * 14, -450 + f(i)], [4 + i * 2 - w * 28, -400 + f(i + 1)]], 'rgba(150,160,190,0.6)', 1);
    cel(g, (q) => sp(q, [[0, -512], [16, -516], [34, -510], [44, -494], [30, -504], [16, -506], [2, -500], [-10, -494], [-6, -506]]), { fill: '#f4f6fa', shade: '#b8c0d0', box: [-10, -516, 44, -494], lw: 1.4 });
  }
}

/** feet + robe body + arms */
export function drawChar(g, x, y, s, P, T) {
  const C = CAST[P.kind]; const face = P.face || 1; LW.k = s > 1.2 ? Math.max(0.45, 1.2 / Math.sqrt(s)) : 1;
  g.save(); g.translate(x, y); g.scale(s * face, s); if (P.lean) g.rotate(P.lean);
  const wind = (P.wind || 0) * (P.windDir || 1) * face; const W0 = Math.abs(P.wind || 0);
  const walk = P.walk; const girl = P.kind === 'girl';
  // ground shadow
  g.save(); g.fillStyle = 'rgba(8,6,20,0.35)'; g.beginPath(); g.ellipse(0, 2, 110, 14, 0, 0, TAU); g.fill(); g.restore();
  const aN = P.aN || [0.3, 1.0], aF = P.aF || [0.25, 1.1];
  const SF = [38, -460], SN = [-42, -460];
  const chF = armChain(SF, aF[0], aF[1]), chN = armChain(SN, aN[0], aN[1]);
  hairBack(g, C, P, T);
  // girl pibo shawl behind
  if (girl) ribbon(g, [[chF.E[0], chF.E[1]], [-40, -420], [-110 - wind * 60, -360 + Math.sin(T * 2) * 10], [-140 - wind * 110, -240 + Math.sin(T * 2.4) * 16], [-150 - wind * 150, -120 + Math.sin(T * 2.8) * 22]], 18, 12, C.shawl, INK, 1.4, '#d8a6b8');
  // feet
  const ph = walk ?? null; const step = ph === null ? 0 : Math.sin(ph);
  for (const [sgn, sh] of [[1, 0.35], [-1, 0]]) { const fx = 14 * sgn + step * 40 * sgn, lift = ph === null ? 0 : Math.max(0, Math.cos(ph) * sgn) * 10;
    cel(g, (q) => { q.moveTo(fx - 16, -2 - lift); q.quadraticCurveTo(fx - 18, -24 - lift, fx - 4, -26 - lift); q.lineTo(fx + 16, -22 - lift); q.quadraticCurveTo(fx + 34, -10 - lift, fx + 30, -2 - lift); q.closePath(); }, { fill: mixHex(C.boots, '#000', sh), shade: '#05040a', lw: 1.8, box: [fx - 20, -30, fx + 34, 0] }); }
  // far arm
  if (!P.back) { const h = drawArm(g, C, chF, null, P, T, false); P._handF = h; }
  // robe body
  const hemN = 9, hem = [];
  for (let i = 0; i <= hemN; i++) { const u = i / hemN; const bx = lerp(girl ? -124 : -106, girl ? 120 : 102, u) - wind * (30 + 18 * Math.sin(T * 2.2 + u * 3)) * (1 - u * 0.4) + step * 10;
    hem.push([bx, -6 - Math.sin(T * 5.2 + u * 9) * 5 * W0 - Math.abs(step) * 8 * Math.sin(u * Math.PI)]); }
  const body = [[-18, -488], [-62, -468], [-60, -420], [-46, -340], [-56, -290], ...hem, [56, -290], [46, -340], [56, -420], [60, -468], [18, -488]];
  cel(g, (q) => sp(q, body), { fill: girl ? C.inner : C.robe, shade: girl ? '#cfc4c8' : C.robeSh, box: [-90, -486, 90, 0], dir: P.light || [1, -0.3], rim: P.rim ?? 0.5, rimColor: P.rimColor || '#cfe0ff', lw: 2.4 });
  if (girl) {
    // red long outer jacket over white skirt: two panels open at front
    const jh = hem.map(([hx, hy], i) => [hx * 0.98, hy - 70 - Math.sin(i) * 4]);
    const back = [[-18, -486], [-54, -466], [-52, -420], [-42, -340], [-56, -300], ...jh.slice(0, 6), [6 + step * 8, -330], [14, -420], [10, -486]];
    cel(g, (q) => sp(q, back), { fill: C.robe, shade: C.robeSh, box: [-90, -486, 60, -60], dir: P.light || [1, -0.3], rim: P.rim ?? 0.5, rimColor: P.rimColor || '#ffd8d0' });
    const fr = [[14, -486], [50, -466], [48, -420], [42, -340], [52, -300], ...jh.slice(6).reverse().reverse(), [28 + step * 6, -330], [20, -420]];
    cel(g, (q) => sp(q, [fr[0], fr[1], fr[2], fr[3], fr[4], jh[jh.length - 1], jh[7], fr[fr.length - 2], fr[fr.length - 1]]), { fill: C.robe, shade: C.robeSh, box: [0, -486, 100, -60], dir: P.light || [1, -0.3] });
    line(g, jh.slice(0, 6), C.trim, 3); line(g, [jh[7], jh[jh.length - 1]], C.trim, 3);
    // skirt pleat lines + hem flowers
    for (let i = 1; i < hemN; i += 2) line(g, [[lerp(-30, 30, i / hemN), -320], [hem[i][0], hem[i][1] - 8]], 'rgba(150,130,150,0.45)', 1.2, false);
  } else {
    // front panel overlap line + gongbi cloud embroidery at hem
    line(g, [[14, -486], [10, -420], [16, -330], [26 + step * 6, -160], [hem[6][0], hem[6][1]]], INK, 2);
    for (let i = 0; i < 4; i++) cloudCurl(g, -60 + i * 38 - wind * 18, -40 - (i % 2) * 18, 1.1, C.gold, 1.6, i % 2 ? 1 : -1);
    line(g, hem.slice(0, 10), C.trim, 3.2);
  }
  // collar
  if (!P.back) { const ib = girl ? '#f6f1e8' : C.inner;
    g.save(); g.lineCap = 'round'; for (const [pts, col, lw] of [[[[-18, -488], [4, -440], [14, -400]], INK, 15], [[[-18, -488], [4, -440], [14, -400]], ib, 11], [[[18, -488], [8, -456], [-2, -420]], INK, 13], [[[18, -488], [8, -456], [-2, -420]], girl ? C.trim : C.trim, 9]]) line(g, pts, col, lw); g.restore(); }
  // sash + knot ribbons + pendant
  cel(g, (q) => sp(q, [[-44, -350], [0, -354], [44, -350], [42, -318], [0, -322], [-42, -318]]), { fill: C.sash, shade: mixHex(C.sash, '#000', 0.4), lw: 1.8, box: [-44, -354, 44, -318] });
  const sw = (o) => Math.sin(T * 3 + o) * (3 + 14 * W0);
  ribbon(g, [[24, -334], [30 - wind * 30, -280 + sw(0)], [26 - wind * 60, -220 + sw(1)], [20 - wind * 90, -170 + sw(2)]], 12, 6, C.sash, INK, 1.4, mixHex(C.sash, '#000', 0.35));
  ribbon(g, [[30, -334], [44 - wind * 40, -290 + sw(1)], [46 - wind * 70, -240 + sw(2)]], 10, 5, C.sash, INK, 1.2, mixHex(C.sash, '#000', 0.35));
  if (P.kind === 'hero') { line(g, [[10, -320], [10 - wind * 8, -282]], '#c0282c', 2); g.save(); g.fillStyle = '#5fb39a'; g.strokeStyle = INK; g.lineWidth = 1.5; g.beginPath(); g.arc(10 - wind * 8, -272, 10, 0, TAU); g.fill(); g.stroke(); g.fillStyle = '#0e2a24'; g.beginPath(); g.arc(10 - wind * 8, -272, 3.5, 0, TAU); g.fill(); g.restore();
    ribbon(g, [[10 - wind * 8, -262], [8 - wind * 20, -230 + sw(3)], [6 - wind * 30, -205 + sw(4)]], 6, 2, '#c0282c', INK, 1); }
  // sword on back
  if (P.sword === 'back') drawSword(g, -58, -540, 2.0, { sheath: true, len: 230, T, wind: W0 });
  // neck
  cel(g, (q) => sp(q, [[-12, -500], [14, -500], [16, -478], [-14, -478]]), { fill: C.skinSh, shade: C.skinSh, line: SKINLINE, lw: 1.4, box: [-14, -500, 16, -478] });
  const armUp = !P.back && aN[0] > 1.9; let hN = null; if (armUp) hN = drawArm(g, C, chN, null, P, T, true);
  // head
  g.save(); if (P.tilt) { g.translate(0, -500); g.rotate(P.tilt); g.translate(0, 500); }
  drawHead(g, C, P, T); hairFront(g, C, P, T); g.restore();
  // near arm
  if (!P.back && !armUp) hN = drawArm(g, C, chN, null, P, T, true);
  else { drawArm(g, C, chF, null, P, T, false); hN = drawArm(g, C, chN, null, P, T, true); }
  if (girl && !P.back) ribbon(g, [[chN.E[0], chN.E[1] + 10], [chN.E[0] - 10 - wind * 20, chN.E[1] + 80 + sw(1)], [chN.E[0] - 30 - wind * 60, chN.E[1] + 170 + sw(2)], [chN.E[0] - 40 - wind * 100, chN.E[1] + 250 + sw(3)]], 14, 10, C.shawl, INK, 1.4, '#d8a6b8');
  g.restore();
  // hand world position (for sword placement)
  const toW = (p) => { const c = Math.cos(P.lean || 0), sn = Math.sin(P.lean || 0); const lx = p[0] * c - p[1] * sn, ly = p[0] * sn + p[1] * c; return [x + lx * s * face, y + ly * s]; };
  const handN = toW(hN);
  if (P.sword === 'hand') { g.save(); g.translate(handN[0], handN[1]); g.scale(s, s); drawSword(g, 0, 0, P.swordAng ?? -0.6, { len: P.swordLen || 300, T, glow: P.swordGlow || 0, wind: W0 }); g.restore(); }
  LW.k = 1;
  return { handN, handF: P._handF ? toW(P._handF) : null, head: toW([4, -548]) };
}
