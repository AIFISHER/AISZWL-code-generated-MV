// Xianxia VFX + props: 掌天瓶-like green bottle, flying sword, talismans, magic circles, lightning, qi, fox-fire, ice, blood mist,
// ghost wisps, sword trails, shockwaves, alchemy furnace, cave & herb props. Additive light only on light sources (keeps blacks).
import { clamp, lerp, hash1, hash2, TAU, rgba, mixHex, noise1, fract, smooth } from '../core/util.js';
import { glow, glowE, vgrad, lgrad, rgrad, sprite } from '../core/look.js';

export const QI = { green: '#5dffb0', jade: '#7dffd8', gold: '#ffd56a', ice: '#9fe8ff', fox: '#8fd8ff', blood: '#ff2a3a', purple: '#b07aff', white: '#ffffff' };

/** small green bottle (palm-sized). s ~ 1 => 60px tall */
export function bottle(g, x, y, s, T, a = 1, glowA = 1) {
  g.save(); g.translate(x, y); g.scale(s, s); g.globalAlpha *= a;
  if (glowA > 0) { glow(g, 0, -28, 140, QI.green, 0.55 * glowA); glow(g, 0, -28, 46, '#d8ffe8', 0.5 * glowA * (0.8 + 0.2 * Math.sin(T * 5))); }
  g.beginPath(); g.moveTo(-8, -62); g.lineTo(8, -62); g.lineTo(8, -48); g.quadraticCurveTo(28, -40, 26, -18); g.quadraticCurveTo(24, 0, 0, 0); g.quadraticCurveTo(-24, 0, -26, -18); g.quadraticCurveTo(-28, -40, -8, -48); g.closePath();
  g.fillStyle = lgrad(g, -26, 0, 26, 0, [[0, '#0d4a34'], [0.35, '#2fae74'], [0.6, '#7affc0'], [1, '#0f5a3e']]); g.fill();
  g.strokeStyle = 'rgba(220,255,235,0.8)'; g.lineWidth = 2; g.beginPath(); g.moveTo(-14, -38); g.quadraticCurveTo(-20, -24, -14, -10); g.stroke();
  g.fillStyle = '#e8c060'; g.fillRect(-10, -68, 20, 8); g.fillStyle = '#7a4a20'; g.fillRect(-6, -76, 12, 9);
  // leaf glyph
  g.strokeStyle = 'rgba(230,255,240,0.7)'; g.lineWidth = 1.5; g.beginPath(); g.ellipse(4, -24, 6, 10, 0.5, 0, TAU); g.stroke();
  g.restore();
}
/** flying sword pointing along angle ang. len px. o: {glow, color, trail:[[x,y],...]} */
export function sword(g, x, y, ang, len, o = {}) {
  const { color = QI.jade, glowA = 1, a = 1 } = o; g.save(); g.globalAlpha *= a; g.translate(x, y); g.rotate(ang);
  if (glowA > 0) { g.save(); g.scale(1, 0.18); glow(g, 0, 0, len * 0.75, color, 0.55 * glowA); g.restore(); }
  const L = len / 2; g.beginPath(); g.moveTo(L, 0); g.lineTo(L * 0.82, -len * 0.035); g.lineTo(-L * 0.55, -len * 0.03); g.lineTo(-L * 0.55, len * 0.03); g.lineTo(L * 0.82, len * 0.035); g.closePath();
  g.fillStyle = lgrad(g, 0, -len * 0.035, 0, len * 0.035, [[0, '#ffffff'], [0.5, '#bfe8f0'], [0.52, '#7aa8b8'], [1, '#d8f4ff']]); g.fill();
  g.fillStyle = '#e8b84a'; g.fillRect(-L * 0.6, -len * 0.07, len * 0.04, len * 0.14); g.fillStyle = '#3a2a3a'; g.fillRect(-L, -len * 0.022, L * 0.4, len * 0.044); g.fillStyle = '#e8b84a'; g.beginPath(); g.arc(-L, 0, len * 0.03, 0, TAU); g.fill();
  g.restore();
}
/** glowing trail along a sampled path fn(u)->[x,y], u in [u0,u1] */
export function trail(g, path, u0, u1, w, color, a = 1, n = 40) {
  if (u1 <= u0 || a <= 0) return; g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
  for (let i = 0; i < n; i++) { const ua = lerp(u0, u1, i / n), ub = lerp(u0, u1, (i + 1) / n); const k = (i + 1) / n; const [x0, y0] = path(ua), [x1, y1] = path(ub);
    g.strokeStyle = rgba(color, a * k * 0.5); g.lineWidth = w * k * 2.4; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
    g.strokeStyle = rgba('#ffffff', a * k * 0.8); g.lineWidth = w * k * 0.5; g.stroke(); }
  g.restore();
}
/** talisman paper with brush glyph */
export function talisman(g, x, y, s, rot, glyph = '敕', a = 1, glowA = 0.6, T = 0) {
  g.save(); g.translate(x, y); g.rotate(rot); g.scale(s, s); g.globalAlpha *= a;
  if (glowA > 0) glow(g, 0, 0, 90, '#ffcf5a', 0.45 * glowA);
  const fl = Math.sin(T * 6 + x * 0.01) * 0.08; g.transform(1, 0, fl, 1, 0, 0);
  g.fillStyle = lgrad(g, -22, -55, 22, 55, [[0, '#fff0a0'], [1, '#e8b840']]); g.fillRect(-22, -55, 44, 110);
  g.strokeStyle = '#b82a1a'; g.lineWidth = 2; g.strokeRect(-18, -51, 36, 102);
  g.fillStyle = '#b8160e'; g.font = '400 34px "MaShan", serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(glyph, 0, -16);
  g.lineWidth = 3; g.strokeStyle = '#b8160e'; g.beginPath(); g.moveTo(0, 8); g.bezierCurveTo(-12, 20, 12, 30, 0, 44); g.stroke();
  g.restore();
}
/** magic circle (flat ellipse when tilt<1) */
export function magicCircle(g, x, y, r, T, o = {}) {
  const { color = QI.gold, a = 1, tilt = 0.35, spin = 0.4, glyphs = '乾坤震巽坎离艮兑' } = o; if (a <= 0) return;
  g.save(); g.translate(x, y); g.scale(1, tilt); g.globalCompositeOperation = 'lighter'; g.globalAlpha *= a;
  glow(g, 0, 0, r * 1.5, color, 0.35);
  g.strokeStyle = rgba(color, 0.9); g.shadowColor = color; g.shadowBlur = 18;
  for (const [rr, lw] of [[1, 5], [0.92, 2], [0.62, 3], [0.55, 1.5], [0.3, 2]]) { g.lineWidth = lw; g.beginPath(); g.arc(0, 0, r * rr, 0, TAU); g.stroke(); }
  g.save(); g.rotate(T * spin); g.lineWidth = 2.5; g.beginPath(); for (let i = 0; i < 8; i++) { const t = (i / 8) * TAU; const t2 = ((i + 3) / 8) * TAU; g.moveTo(Math.cos(t) * r * 0.62, Math.sin(t) * r * 0.62); g.lineTo(Math.cos(t2) * r * 0.62, Math.sin(t2) * r * 0.62); } g.stroke();
  g.fillStyle = rgba(color, 0.95); g.font = `400 ${r * 0.13}px "MaShan", serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
  for (let i = 0; i < 8; i++) { const t = (i / 8) * TAU + 0.39; g.save(); g.translate(Math.cos(t) * r * 0.77, Math.sin(t) * r * 0.77); g.rotate(t + Math.PI / 2); g.fillText(glyphs[i % glyphs.length], 0, 0); g.restore(); }
  g.restore();
  g.save(); g.rotate(-T * spin * 1.6); g.lineWidth = 2; for (let i = 0; i < 36; i++) { const t = (i / 36) * TAU; g.beginPath(); g.moveTo(Math.cos(t) * r * 0.92, Math.sin(t) * r * 0.92); g.lineTo(Math.cos(t) * r * (i % 3 ? 0.96 : 1), Math.sin(t) * r * (i % 3 ? 0.96 : 1)); g.stroke(); } g.restore();
  g.restore();
}
/** jagged lightning bolt with branches + bloom. k: 0..1 intensity */
export function lightning(g, x0, y0, x1, y1, seed, k = 1, o = {}) {
  if (k <= 0.01) return; const { color = '#cfc0ff', w = 6, branches = 4 } = o;
  const pts = []; const N = 18; for (let i = 0; i <= N; i++) { const u = i / N; const j = i === 0 || i === N ? 0 : (hash2(seed, i) - 0.5) * 140 * Math.sin(u * Math.PI); pts.push([lerp(x0, x1, u) + j, lerp(y0, y1, u) + (hash2(seed + 1, i) - 0.5) * 20]); }
  const strokeP = (P, lw, col, al) => { g.strokeStyle = rgba(col, al); g.lineWidth = lw; g.beginPath(); P.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.stroke(); };
  g.save(); g.globalCompositeOperation = 'lighter'; g.lineJoin = 'round'; g.lineCap = 'round';
  const brs = []; for (let b = 0; b < branches; b++) { const i0 = 3 + Math.floor(hash2(seed + 5, b) * (N - 6)); const P = [pts[i0]]; let [bx, by] = pts[i0]; const dir = hash2(seed + 6, b) > 0.5 ? 1 : -1; for (let s = 0; s < 6; s++) { bx += dir * (30 + hash2(seed + 7, b * 9 + s) * 60); by += 30 + hash2(seed + 8, b * 9 + s) * 50; P.push([bx, by]); } brs.push(P); }
  g.filter = `blur(${w * 2.5}px)`; strokeP(pts, w * 6, color, 0.5 * k); brs.forEach((P) => strokeP(P, w * 3, color, 0.3 * k)); g.filter = 'none';
  strokeP(pts, w * 1.8, color, 0.8 * k); brs.forEach((P) => strokeP(P, w * 0.8, color, 0.6 * k)); strokeP(pts, w * 0.6, '#ffffff', k); brs.forEach((P) => strokeP(P, w * 0.3, '#ffffff', 0.8 * k));
  g.restore(); glow(g, x1, y1, 260 * k, color, 0.6 * k);
}
/** rising qi motes around (x,y) radius r */
export function qi(g, T, x, y, r, color = QI.green, n = 40, a = 1, seed = 1, rise = 120) {
  if (a <= 0) return; g.save(); g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) { const p = fract(T * (0.25 + hash2(seed, i) * 0.3) + hash2(seed + 1, i)); const ang = hash2(seed + 2, i) * TAU + T * 0.5; const rr = r * (0.4 + 0.6 * hash2(seed + 3, i));
    const px = x + Math.cos(ang) * rr * (1 - p * 0.3), py = y + Math.sin(ang) * rr * 0.4 - p * rise; const s = 2 + hash2(seed + 4, i) * 4; const al = a * Math.sin(p * Math.PI);
    g.fillStyle = rgba('#ffffff', al * 0.9); g.beginPath(); g.arc(px, py, s * 0.5, 0, TAU); g.fill(); glow(g, px, py, s * 5, color, al * 0.6); }
  g.restore();
}
/** swirling qi ribbon around a centre (cultivation) */
export function qiSwirl(g, T, x, y, r, color = QI.green, a = 1, n = 3) {
  if (a <= 0) return; g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
  for (let k = 0; k < n; k++) { const ph = T * 1.4 + (k * TAU) / n; for (let i = 0; i < 30; i++) { const u = i / 30; const ang = ph - u * 2.4; const rr = r * (0.75 + 0.25 * Math.sin(u * 5 + k));
    g.strokeStyle = rgba(color, a * u * 0.55); g.lineWidth = 2 + u * 7; g.beginPath(); g.ellipse(x, y, rr, rr * 0.32, 0, ang - 0.09, ang); g.stroke(); } }
  g.restore();
}
/** fox-fire: blue-white flame wisp */
export function foxFire(g, T, x, y, s, a = 1, seed = 1) {
  if (a <= 0) return; g.save(); g.translate(x, y); g.scale(s, s); g.globalCompositeOperation = 'lighter';
  glow(g, 0, 0, 90, QI.fox, 0.5 * a);
  for (let k = 4; k >= 0; k--) { const fl = Math.sin(T * 9 + k * 1.7 + seed) * 6; g.fillStyle = rgba(k === 0 ? '#ffffff' : k === 1 ? '#c8f0ff' : '#4aa8ff', a * (k < 2 ? 0.75 : 0.4)); const sc = 1.25 - k * 0.2;
    g.beginPath(); g.moveTo(-18 * sc, 6); g.bezierCurveTo(-22 * sc, -18, fl - 4, -40 * sc - k * 6, fl, -62 * sc - k * 4); g.bezierCurveTo(fl + 6, -36 * sc, 22 * sc, -18, 18 * sc, 6); g.bezierCurveTo(12 * sc, 22, -12 * sc, 22, -18 * sc, 6); g.fill(); }
  g.restore();
}
/** ice shard / crystal */
export function iceShard(g, x, y, len, ang, a = 1) {
  if (a <= 0) return; g.save(); g.translate(x, y); g.rotate(ang); g.globalAlpha *= a;
  glow(g, 0, 0, len * 0.8, QI.ice, 0.35);
  g.beginPath(); g.moveTo(len / 2, 0); g.lineTo(len * 0.1, -len * 0.12); g.lineTo(-len / 2, -len * 0.05); g.lineTo(-len / 2, len * 0.05); g.lineTo(len * 0.1, len * 0.12); g.closePath();
  g.fillStyle = lgrad(g, 0, -len * 0.12, 0, len * 0.12, [[0, '#ffffff'], [0.45, '#bff0ff'], [0.55, '#5ab8e8'], [1, '#d8f8ff']]); g.fill(); g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 1.5; g.stroke();
  g.restore();
}
/** blood mist / demonic smoke cloud */
export function bloodMist(g, T, x, y, r, a = 1, seed = 1, color = '#8a0a18') {
  if (a <= 0) return; g.save();
  for (let i = 0; i < 14; i++) { const ang = hash2(seed, i) * TAU + T * 0.3 * (hash2(seed + 1, i) - 0.5); const d = r * hash2(seed + 2, i) * 0.8; const rr = r * (0.3 + hash2(seed + 3, i) * 0.4);
    glow(g, x + Math.cos(ang) * d, y + Math.sin(ang) * d * 0.6, rr, i % 3 ? color : '#2a0008', 0.55 * a, 'source-over'); }
  glow(g, x, y, r * 0.6, '#ff3040', 0.25 * a); g.restore();
}
/** ghost wisp (banner spirits): translucent wailing spirit with a long flowing tail; ang = travel direction */
export function ghost(g, T, x, y, s, ang, a = 1, seed = 1) {
  if (a <= 0) return; g.save(); g.translate(x, y); g.rotate(ang); g.scale(s, s); g.globalAlpha *= a;
  // tail (behind, along -x)
  g.globalCompositeOperation = 'lighter'; g.beginPath(); const N = 14; const up = [], dn = [];
  for (let i = 0; i <= N; i++) { const u = i / N; const w = 24 * (1 - u) + 2; const yy = Math.sin(T * 7 + u * 6 + seed) * 14 * u; up.push([-u * 170, yy - w]); dn.push([-u * 170, yy + w]); }
  g.moveTo(up[0][0], up[0][1]); up.forEach((q) => g.lineTo(q[0], q[1])); dn.reverse().forEach((q) => g.lineTo(q[0], q[1])); g.closePath();
  g.fillStyle = lgrad(g, 0, 0, -170, 0, [[0, 'rgba(255,90,100,0.55)'], [1, 'rgba(160,0,30,0)']]); g.fill();
  glow(g, 0, 0, 60, '#ff3a4a', 0.35);
  // head
  g.globalCompositeOperation = 'source-over'; g.fillStyle = rgrad(g, 6, -6, 2, 30, [[0, 'rgba(255,236,236,0.85)'], [0.6, 'rgba(255,150,160,0.6)'], [1, 'rgba(200,40,60,0)']]); g.beginPath(); g.ellipse(0, 0, 30, 26, 0, 0, TAU); g.fill();
  g.fillStyle = 'rgba(60,0,10,0.75)'; g.beginPath(); g.ellipse(8, -8, 4.5, 6, 0.3, 0, TAU); g.ellipse(8, 8, 4.5, 6, -0.3, 0, TAU); g.fill(); g.beginPath(); g.ellipse(18, 0, 3 + Math.sin(T * 10 + seed) * 1.5, 5, 0, 0, TAU); g.fill();
  g.restore();
}
/** expanding ring shockwave */
export function shockwave(g, x, y, p, rMax, color = '#ffffff', a = 1, tilt = 0.3) {
  if (p <= 0 || p >= 1) return; g.save(); g.translate(x, y); g.scale(1, tilt); g.globalCompositeOperation = 'lighter'; const r = rMax * (1 - Math.pow(1 - p, 3));
  g.strokeStyle = rgba(color, a * (1 - p)); g.lineWidth = 30 * (1 - p) + 2; g.filter = 'blur(4px)'; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.stroke(); g.filter = 'none'; g.lineWidth = 4 * (1 - p) + 1; g.strokeStyle = rgba('#ffffff', a * (1 - p)); g.stroke(); g.restore();
}
/** golden pillar of light (breakthrough) */
export function lightPillar(g, x, y, w, a = 1, color = QI.gold) {
  if (a <= 0) return; g.save(); g.globalCompositeOperation = 'lighter';
  for (const [k, al] of [[3, 0.18], [1.6, 0.3], [0.6, 0.6], [0.2, 0.9]]) { g.fillStyle = lgrad(g, x - w * k, 0, x + w * k, 0, [[0, rgba(color, 0)], [0.5, rgba(k < 0.5 ? '#ffffff' : color, al * a)], [1, rgba(color, 0)]]); g.fillRect(x - w * k, -2000, w * k * 2, y + 2000); }
  glowE(g, x, y, w * 4, w, color, 0.7 * a); g.restore();
}
/** bronze alchemy furnace (tripod ding) with fire */
export function furnace(g, T, x, y, s, fire = 1) {
  g.save(); g.translate(x, y); g.scale(s, s);
  glow(g, 0, -20, 260, '#ff8a2a', 0.45 * fire);
  // legs
  g.fillStyle = '#4a3020'; for (const lx of [-110, 0, 110]) { g.beginPath(); g.moveTo(lx - 18, -60); g.lineTo(lx + 18, -60); g.lineTo(lx + 12, 0); g.lineTo(lx - 12, 0); g.fill(); }
  // fire under
  for (let i = 0; i < 9; i++) { const fx = (i - 4) * 26; const fl = Math.sin(T * 11 + i * 1.9) * 10; g.fillStyle = rgba(i % 2 ? '#ffcf5a' : '#ff6a1a', 0.85 * fire); g.beginPath(); g.moveTo(fx - 16, -20); g.quadraticCurveTo(fx + fl, -90 - (i % 3) * 20, fx + 16, -20); g.fill(); }
  // body
  g.beginPath(); g.moveTo(-170, -260); g.lineTo(170, -260); g.quadraticCurveTo(190, -120, 120, -60); g.lineTo(-120, -60); g.quadraticCurveTo(-190, -120, -170, -260); g.closePath();
  g.fillStyle = lgrad(g, -180, 0, 180, 0, [[0, '#3a2a14'], [0.3, '#9a6a2a'], [0.55, '#e8b860'], [0.8, '#7a4a1a'], [1, '#2a1a0a']]); g.fill();
  g.strokeStyle = 'rgba(40,20,5,0.6)'; g.lineWidth = 4; for (const yy of [-220, -110]) { g.beginPath(); g.moveTo(-175, yy); g.lineTo(175, yy); g.stroke(); }
  g.fillStyle = 'rgba(40,20,5,0.55)'; g.font = '400 60px "MaShan", serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('丹', 0, -165);
  g.fillStyle = '#b8862a'; g.fillRect(-190, -282, 380, 26); for (const hx of [-150, 150]) { g.strokeStyle = '#b8862a'; g.lineWidth = 14; g.beginPath(); g.arc(hx, -300, 26, Math.PI, 0); g.stroke(); }
  // rim light & fire light from below
  g.globalCompositeOperation = 'source-atop'; g.restore();
  g.save(); g.translate(x, y); g.scale(s, s);
  for (let i = 0; i < 8; i++) { const p = fract(T * 0.5 + i / 8); glow(g, Math.sin(i * 3 + p * 4) * 40, -290 - p * 260, 30 + p * 50, '#ffe0a0', 0.4 * (1 - p) * fire); }
  g.restore();
}
/** glowing spirit herb */
export function herb(g, T, x, y, s, color = QI.jade, a = 1, seed = 1) {
  g.save(); g.translate(x, y); g.scale(s, s); const sw = Math.sin(T * 1.3 + seed) * 0.08;
  g.strokeStyle = '#2f6a3a'; g.lineWidth = 3; g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(sw * 40, -30, sw * 60, -60); g.stroke();
  for (let k = 0; k < 5; k++) { const ang = -Math.PI / 2 + (k - 2) * 0.55 + sw; g.fillStyle = k % 2 ? '#3f9a50' : '#5ab868'; g.beginPath(); g.ellipse(Math.cos(ang) * 18, -20 + Math.sin(ang) * 14, 16, 6, ang, 0, TAU); g.fill(); }
  g.fillStyle = rgba(color, 0.95); g.beginPath(); g.arc(sw * 60, -64, 7, 0, TAU); g.fill(); glow(g, sw * 60, -64, 40, color, 0.6 * a * (0.8 + 0.2 * Math.sin(T * 3 + seed)));
  g.restore();
}
/** speed lines radiating (impact) */
export function speedLines(g, T, cx, cy, a = 1, seed = 1, color = '#ffffff', n = 40) {
  if (a <= 0) return; g.save(); g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) { const ang = hash2(seed + Math.floor(T * 20), i) * TAU; const r0 = 300 + hash2(seed + 1, i) * 300; const L = 200 + hash2(seed + 2, i) * 500;
    g.strokeStyle = rgba(color, a * 0.35 * hash2(seed + 3, i)); g.lineWidth = 1 + hash2(seed + 4, i) * 4; g.beginPath(); g.moveTo(cx + Math.cos(ang) * r0, cy + Math.sin(ang) * r0); g.lineTo(cx + Math.cos(ang) * (r0 + L), cy + Math.sin(ang) * (r0 + L)); g.stroke(); }
  g.restore();
}
/** blood banner (big, for the demonic cultivator's attack) */
export function banner(g, T, x, y, s, a = 1) {
  g.save(); g.translate(x, y); g.scale(s, s); g.globalAlpha *= a;
  g.fillStyle = '#2a1a14'; g.fillRect(-8, -420, 16, 440); g.fillStyle = '#c8a050'; g.beginPath(); g.arc(0, -430, 16, 0, TAU); g.fill();
  for (let k = 0; k < 7; k++) { const x0 = -120 + k * 34; g.beginPath(); g.moveTo(x0, -400); for (let j = 0; j <= 10; j++) { const v = j / 10; g.lineTo(x0 + Math.sin(T * 3 + v * 5 + k) * 10 * v, -400 + v * (260 + (k % 3) * 40)); } g.lineTo(x0 + 26, -400 + 300); g.lineTo(x0 + 26, -400); g.closePath();
    g.fillStyle = lgrad(g, x0, 0, x0 + 26, 0, [[0, '#5a0410'], [0.5, '#c8182a'], [1, '#4a020a']]); g.fill(); }
  g.fillStyle = '#1a1010'; g.fillRect(-140, -416, 280, 20);
  glow(g, 0, -280, 260, '#ff2030', 0.35); g.restore();
}
/** cave interior backdrop with crystals */
export function cave(g, T, o = {}) {
  const { glowCol = QI.green, glowA = 0.6, seed = 3 } = o;
  g.fillStyle = vgrad(g, 0, 1080, [[0, '#050c0c'], [0.5, '#0c2220'], [1, '#081614']]); g.fillRect(-500, -500, 2920, 2080);
  // back wall rocks
  for (let i = 0; i < 26; i++) { const x = hash2(seed, i) * 2200 - 140, y = hash2(seed + 1, i) * 900, r = 120 + hash2(seed + 2, i) * 220; g.fillStyle = rgrad(g, x - r * 0.3, y - r * 0.4, 0, r, [[0, '#1d3a36'], [1, 'rgba(8,20,18,0)']]); g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); }
  // crystals
  for (let i = 0; i < 9; i++) { const x = 120 + i * 210 + hash2(seed + 4, i) * 80, y = 880 + hash2(seed + 5, i) * 120, h = 60 + hash2(seed + 6, i) * 120; const col = i % 3 ? '#4adfb0' : '#7ab0ff';
    glow(g, x, y - h * 0.5, h * 1.4, col, 0.25 * glowA * (0.8 + 0.2 * Math.sin(T * 1.5 + i)));
    for (let k = -1; k <= 1; k++) { g.save(); g.translate(x + k * h * 0.2, y); g.rotate(k * 0.35); g.fillStyle = lgrad(g, -h * 0.1, 0, h * 0.1, 0, [[0, mixHex(col, '#000000', 0.4)], [0.5, mixHex(col, '#ffffff', 0.4)], [1, mixHex(col, '#000000', 0.5)]]); g.beginPath(); g.moveTo(0, -h * (k ? 0.7 : 1)); g.lineTo(h * 0.11, -h * 0.2); g.lineTo(h * 0.08, 0); g.lineTo(-h * 0.08, 0); g.lineTo(-h * 0.11, -h * 0.2); g.closePath(); g.fill(); g.restore(); } }
  // floor
  g.fillStyle = vgrad(g, 860, 1080, [[0, '#0f2a26'], [1, '#040a0a']]); g.beginPath(); g.moveTo(-200, 900); g.quadraticCurveTo(960, 840, 2120, 900); g.lineTo(2120, 1300); g.lineTo(-200, 1300); g.fill();
}
/** meditation stone / lotus platform */
export function lotusSeat(g, x, y, s, a = 1, col = '#7dffd8') {
  g.save(); g.translate(x, y); g.scale(s, s);
  g.fillStyle = vgrad(g, -40, 30, [[0, '#7a8a88'], [1, '#2a3434']]); g.beginPath(); g.ellipse(0, 0, 200, 50, 0, 0, TAU); g.fill(); g.fillStyle = '#8a9a98'; g.beginPath(); g.ellipse(0, -10, 190, 40, 0, 0, TAU); g.fill();
  if (a > 0) for (let k = 0; k < 10; k++) { const ang = (k / 10) * TAU; g.save(); g.translate(Math.cos(ang) * 150, -14 + Math.sin(ang) * 32); g.rotate(Math.cos(ang) * 0.4); g.globalAlpha *= a * 0.85; g.fillStyle = lgrad(g, 0, -60, 0, 0, [[0, '#ffffff'], [1, col]]); g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(-30, -30, 0, -70); g.quadraticCurveTo(30, -30, 0, 0); g.fill(); g.restore(); }
  g.restore();
}
