import { STEM_MAPPING } from './constants.js';

export function readUint32BE(d, o) { return ((d[o] << 24) | (d[o + 1] << 16) | (d[o + 2] << 8) | d[o + 3]) >>> 0; }
export function readUint16BE(d, o) { return ((d[o] << 8) | d[o + 1]) >>> 0; }
export function decodeTag(d, o) { return o + 4 > d.length ? '' : new TextDecoder().decode(d.slice(o, o + 4)).replace(/\0/g, ''); }

const PJPREFIX = new Uint8Array([0x23, 0x50]), BO = 0x7b, BC = 0x7d, Q = 0x22, BS = 0x5c;
function findBytes(d, n, s = 0) {
  for (let i = s; i <= d.length - n.length; i++) {
    let m = true;
    for (let j = 0; j < n.length; j++) { if (d[i + j] !== n[j]) { m = false; break } }
    if (m) return i;
  }
  return -1;
}

export function extractProjectJson(d) {
  const pi = findBytes(d, PJPREFIX); if (pi < 0) return null;
  const bs = pi + 2; if (bs >= d.length || d[bs] !== BO) return null;
  let dp = 0, is = false, es = false, end = -1;
  for (let i = bs; i < d.length; i++) {
    const b = d[i];
    if (es) { es = false; continue }
    if (b === BS) { es = true; continue }
    if (b === Q) { is = !is; continue }
    if (is) continue;
    if (b === BO) dp++;
    else if (b === BC) { dp--; if (dp === 0) { end = i + 1; break } }
  }
  if (end < 0) return null;
  try {
    const p = JSON.parse(new TextDecoder().decode(d.slice(bs, end)));
    return p && typeof p === 'object' && 'project' in p ? p.project : p;
  } catch { return null }
}

export function extractFullJson(d) {
  const pi = findBytes(d, PJPREFIX); if (pi < 0) return null;
  const bs = pi + 2; if (bs >= d.length || d[bs] !== BO) return null;
  let dp = 0, is = false, es = false, end = -1;
  for (let i = bs; i < d.length; i++) {
    const b = d[i];
    if (es) { es = false; continue }
    if (b === BS) { es = true; continue }
    if (b === Q) { is = !is; continue }
    if (is) continue;
    if (b === BO) dp++;
    else if (b === BC) { dp--; if (dp === 0) { end = i + 1; break } }
  }
  if (end < 0) return null;
  try {
    return JSON.parse(new TextDecoder().decode(d.slice(bs, end)));
  } catch { return null }
}

export function parseSampleRegions(s) { return s ? s.split(',').map(p => p.split('|').map(Number)) : []; }

export function parseStemsFile(bytes) {
  const d = new Uint8Array(bytes);
  if (d.length < 8) throw new Error('Archivo demasiado pequeño');
  if (decodeTag(d, 0) !== 'srts') throw new Error('Magic inválido');
  let off = 4, sc = 0, stems = [], ver = '', total = 0, sr = 0, samples = 0;
  while (off + 8 <= d.length) {
    const tag = decodeTag(d, off), len = readUint32BE(d, off + 4);
    off += 8; if (off + len > d.length) break;
    if (tag === 'head') {
      if (len >= 16) { ver = `${readUint16BE(d, off)}.${readUint16BE(d, off + 2)}`; total = readUint32BE(d, off + 4); samples = readUint32BE(d, off + 8); sr = readUint32BE(d, off + 12); }
      off += len;
    } else if (tag === 'stem') {
      sc++; const raw = d.slice(off, off + len), asg = STEM_MAPPING[sc] || `unknown_${sc}`, ast = raw.length >= 4 ? 4 : 0, alen = raw.length - ast;
      const cl = new Uint8Array(alen); for (let i = 0; i < alen; i++) cl[i] = raw[ast + i] ^ 0x26;
      stems.push({ index: sc, assignment: asg, size: alen, data: cl });
      off += len;
    } else off += len > 0 ? len : 1;
  }
  const dur = sr > 0 ? Math.round((samples / sr) * 1000) / 1000 : 0;
  return { version: ver, totalStems: total, sampleRate: sr, totalSamples: samples, durationSeconds: dur, stems };
}
