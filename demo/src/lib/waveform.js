import { state, $, getCurrentTime } from './state.js';
import { waveformColor, hexToRgba } from './utils/format.js';
import { HOP, WS } from './utils/constants.js';

export async function analyzeAudio(audioBuffer) {
  const left = audioBuffer.getChannelData(0);
  const right = audioBuffer.length > 1 ? audioBuffer.getChannelData(1) : left;
  const numWindows = Math.floor(left.length / HOP);
  const data = [];
  for (let i = 0; i < numWindows; i++) {
    const off = i * HOP;
    let peakL = 0, peakR = 0, zc = 0;
    for (let j = 0; j < WS && off + j < left.length; j++) {
      const sL = left[off + j], sR = right[off + j];
      if (Math.abs(sL) > peakL) peakL = Math.abs(sL);
      if (Math.abs(sR) > peakR) peakR = Math.abs(sR);
      if (j > 0 && sL * left[off + j - 1] < 0) zc++;
    }
    data.push({ peakL, peakR, highFreq: Math.min(zc / WS * 2.5, 1), time: off / audioBuffer.sampleRate });
  }
  return { data, duration: audioBuffer.duration, sampleRate: audioBuffer.sampleRate };
}

export function renderMainWaveform() {
  const canvas = $('waveform-canvas');
  const container = $('waveform-container');
  const wfState = state.waveform;
  if (!wfState || !wfState.data || wfState.data.length === 0) return;
  const dpr = window.devicePixelRatio || 1;
  const rect = container.getBoundingClientRect();
  const w = rect.width, h = rect.height;
  if (w === 0 || h === 0) return;
  canvas.width = w * dpr; canvas.height = h * dpr;
  canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  const centerY = h / 2;
  const { data: wfData, duration } = wfState;
  const viewStart = wfState.viewStart, viewEnd = wfState.viewStart + wfState.viewDuration;
  const secPerPx = wfState.viewDuration / w;

  ctx.clearRect(0, 0, w, h);

  const buckets = [];
  for (let px = 0; px < w; px++) buckets.push({ peakL: 0, peakR: 0, hf: 0, count: 0 });
  for (const win of wfData) {
    if (win.time < viewStart || win.time > viewEnd) continue;
    const px = Math.floor((win.time - viewStart) / secPerPx);
    if (px < 0 || px >= w) continue;
    const b = buckets[px];
    if (win.peakL > b.peakL) b.peakL = win.peakL;
    if (win.peakR > b.peakR) b.peakR = win.peakR;
    b.hf += win.highFreq; b.count++;
  }

  for (let px = 0; px < w; px++) {
    const b = buckets[px]; if (b.count === 0) continue;
    const hf = b.hf / b.count;
    const amp = Math.max(b.peakL, b.peakR);
    const color = waveformColor(hf, amp);
    const barL = Math.max(1, b.peakL * centerY * 0.88);
    const barR = Math.max(1, b.peakR * centerY * 0.88);
    ctx.fillStyle = color;
    ctx.fillRect(px, centerY - barL, 1, barL);
    ctx.fillRect(px, centerY, 1, barR);
  }

  if (state.pads) {
    for (const p of state.pads) {
      if (!p.slice) continue;
      const x1 = ((p.slice.StartPosition - viewStart) / wfState.viewDuration) * w;
      const x2 = ((p.slice.EndPosition - viewStart) / wfState.viewDuration) * w;
      if (x2 < 0 || x1 > w) continue;
      const isZeroWidth = Math.abs(x2 - x1) < 1;
      const drawX = Math.max(0, x1);
      const drawW = isZeroWidth ? Math.max(1, Math.min(w, x2 + 2) - drawX) : Math.min(w, x2) - drawX;
      const isActivePad = state.activePad === p.slice;
      const baseColor = p.slice.Color || '#065f46';
      ctx.fillStyle = isActivePad ? 'rgba(34, 197, 94, 0.18)' : hexToRgba(baseColor, 0.1);
      ctx.fillRect(drawX, 0, drawW, h);
      ctx.strokeStyle = isActivePad ? 'rgba(34, 197, 94, 0.5)' : hexToRgba(baseColor, 0.2);
      ctx.lineWidth = isActivePad ? 1.5 : 0.5;
      ctx.beginPath(); ctx.moveTo(x1, 0); ctx.lineTo(x1, h); ctx.stroke();
      if (isActivePad && !isZeroWidth) {
        ctx.beginPath(); ctx.moveTo(x2, 0); ctx.lineTo(x2, h); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x1, centerY - 8); ctx.lineTo(x1 + 4, centerY); ctx.lineTo(x1, centerY + 8); ctx.closePath();
        ctx.fillStyle = '#22c55e'; ctx.fill();
      }
      ctx.beginPath(); ctx.moveTo(x1, 2); ctx.lineTo(x1 + 3, 8); ctx.lineTo(x1 - 3, 8); ctx.closePath();
      ctx.fillStyle = isActivePad ? 'rgba(255, 255, 255, 0.6)' : 'rgba(255, 255, 255, 0.25)';
      ctx.fill();
    }
  }

  const ct = getCurrentTime();
  if (wfState.isPlaying || ct > 0) {
    const px = ((ct - viewStart) / wfState.viewDuration) * w;
    if (px >= 0 && px <= w) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px, h); ctx.stroke();
      ctx.beginPath(); ctx.arc(px, centerY, 4, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'; ctx.fill();
    }
  }
}

export function renderOverview() {
  const canvas = $('overview-canvas');
  const container = $('overview-container');
  const wfState = state.waveform;
  if (!wfState || !wfState.data || wfState.data.length === 0) return;
  const dpr = window.devicePixelRatio || 1;
  const rect = container.getBoundingClientRect();
  const w = rect.width, h = rect.height;
  if (w === 0 || h === 0) return;
  canvas.width = w * dpr; canvas.height = h * dpr;
  canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  const centerY = h / 2;
  const { data: wfData, duration } = wfState;
  const secPerPx = duration / w;
  ctx.clearRect(0, 0, w, h);

  const buckets = [];
  for (let px = 0; px < w; px++) buckets.push({ peak: 0, count: 0 });
  for (const win of wfData) {
    const px = Math.floor(win.time / secPerPx);
    if (px < 0 || px >= w) continue;
    const b = buckets[px];
    const amp = Math.max(win.peakL, win.peakR);
    if (amp > b.peak) b.peak = amp; b.count++;
  }

  for (let px = 0; px < w; px++) {
    const b = buckets[px]; if (b.count === 0) continue;
    const amp = Math.max(0.02, b.peak);
    const bar = Math.max(1, amp * centerY * 0.7);
    ctx.fillStyle = `rgba(180, 180, 200, ${0.15 + amp * 0.5})`;
    ctx.fillRect(px, centerY - bar, 1, bar * 2);
  }

  if (state.pads) {
    for (const p of state.pads) {
      if (!p.slice) continue;
      const x1 = (p.slice.StartPosition / duration) * w;
      const x2 = (p.slice.EndPosition / duration) * w;
      if (x2 < 0 || x1 > w) continue;
      const isZeroWidth = Math.abs(x2 - x1) < 1;
      const drawX = Math.max(0, x1);
      const drawW = isZeroWidth ? Math.max(1, Math.min(w, x2 + 2) - drawX) : Math.min(w, x2) - drawX;
      const baseColor = p.slice.Color || '#065f46';
      ctx.fillStyle = hexToRgba(baseColor, 0.12);
      ctx.fillRect(drawX, 0, drawW, h);
      ctx.fillStyle = hexToRgba(baseColor, 0.35);
      ctx.beginPath(); ctx.moveTo(x1, 1); ctx.lineTo(x1 + 3, 6); ctx.lineTo(x1 - 3, 6); ctx.closePath();
      ctx.fill();
    }
  }

  const viewStart = wfState.viewStart, viewEnd = wfState.viewStart + wfState.viewDuration;
  const x1 = (viewStart / duration) * w;
  const x2 = (viewEnd / duration) * w;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.fillRect(x1, 0, x2 - x1, h);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(x1, 0); ctx.lineTo(x1, h); ctx.moveTo(x2, 0); ctx.lineTo(x2, h); ctx.stroke();

  const ct = getCurrentTime();
  if (wfState.isPlaying || ct > 0) {
    const px = (ct / duration) * w;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px, h); ctx.stroke();
  }
}

export function renderAllWaveforms() { renderMainWaveform(); renderOverview(); }
