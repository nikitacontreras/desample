import { state, $, getCurrentTime } from './state.js';
import { BANK_NAMES } from './utils/constants.js';

export function refreshPadsMessage() {
  const hasPads = state.pads || state.regions.length > 0;
  if (hasPads) $('pads-section').classList.remove('hidden');
}

export function renderPadGrid() {
  if (state.pads) renderSlicePalettePads();
  else if (state.regions.length > 0) renderRegionPads();
  else { $('pad-grid').innerHTML = ''; $('bank-tabs').innerHTML = ''; $('pads-section').classList.add('hidden'); }
}

export function renderSlicePalettePads() {
  $('pads-section').classList.remove('hidden');
  const pads = state.pads;
  const totalBanks = Math.ceil(pads.length / 16);
  let tabsHtml = '';
  for (let b = 0; b < totalBanks; b++) {
    const name = BANK_NAMES[b] || `bank_${b}`;
    const active = b === state.currentBank;
    tabsHtml += `<button class="bank-tab px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors cursor-pointer ${active ? 'bg-neutral-700 text-neutral-100' : 'bg-neutral-800/60 text-neutral-500 hover:text-neutral-300 hover:bg-neutral-700/50'}" data-bank="${b}">${name}</button>`;
  }
  $('bank-tabs').innerHTML = tabsHtml;

  const start = state.currentBank * 16;
  const bankPads = pads.slice(start, start + 16);
  $('pad-grid').innerHTML = bankPads.map((p, i) => {
    const sl = p.slice;
    const globalIdx = start + i;
    const isActive = state.activePadIdx === i && state.currentBank === Math.floor(globalIdx / 16);
    let style = '', label = '', detail = '';
    if (sl) {
      const baseColor = sl.Color || '#065f46';
      style = `background:${baseColor};border-color:transparent;${isActive ? 'box-shadow:0 0 0 2px #22c55e;' : ''}`;
      label = sl.Name || `S${i}`; detail = `${sl.StartPosition.toFixed(1)}s`;
    } else { style = 'background:#262626;border-color:#404040;'; }
    const title = sl ? `${label} · ${sl.StartPosition.toFixed(3)}s – ${sl.EndPosition.toFixed(3)}s` : `Pad ${i} (vacío)`;
    return `<div class="h-8 flex items-center gap-1 px-1.5 rounded-md border transition-all cursor-pointer ${isActive ? 'brightness-110 ring-1 ring-emerald-500' : 'hover:brightness-110'}" data-bank="${state.currentBank}" data-idx="${i}" data-global="${globalIdx}" data-slice="${sl ? 1 : 0}" title="${title}" style="${style}">${sl ? `<span class="text-[9px] font-bold text-neutral-100 leading-tight truncate">${label}</span><span class="text-[7px] text-neutral-300/70 ml-auto shrink-0">${detail}</span>` : `<span class="text-[9px] text-neutral-600 font-medium">${i + 1}</span>`}</div>`;
  }).join('');
}

export function renderRegionPads() {
  $('pads-section').classList.remove('hidden');
  const regions = state.regions;
  $('pad-grid').innerHTML = regions.map(([start, end], i) => {
    const dur = (end - start).toFixed(2);
    const isActive = state.activeRegionIdx === i;
    const activeStyle = isActive ? 'ring-1 ring-emerald-500 bg-emerald-900/30 border-emerald-700' : 'bg-neutral-800 border-neutral-700 hover:border-neutral-500';
    return `<div class="h-10 flex items-center gap-2 px-2.5 rounded-md border ${activeStyle} transition-all cursor-pointer" data-region="${i}" title="Región ${i + 1}: ${start.toFixed(3)}s – ${end.toFixed(3)}s">
      <span class="text-[11px] font-bold text-neutral-200">R${i + 1}</span>
      <span class="text-[9px] text-neutral-500 ml-auto">${dur}s</span>
    </div>`;
  }).join('');
}

export function updateActivePad() {
  const t = getCurrentTime();
  if (!state.waveform || (!state.audioUrl && !state.stemsMode)) return;
  if (state.pads) {
    const start = state.currentBank * 16;
    const bankPads = state.pads.slice(start, start + 16);
    let found = null, foundPad = null;
    for (let i = 0; i < bankPads.length; i++) {
      const s = bankPads[i]?.slice;
      if (s && t >= s.StartPosition && t <= s.EndPosition) { found = i; foundPad = s; break; }
    }
    if (found !== state.activePadIdx) {
      state.activePadIdx = found;
      state.activePad = foundPad;
      renderSlicePalettePads();
    }
  } else if (state.regions.length > 0) {
    let found = null;
    for (let i = 0; i < state.regions.length; i++) { const [rs, re] = state.regions[i]; if (t >= rs && t <= re) { found = i; break; } }
    if (found !== state.activeRegionIdx) { state.activeRegionIdx = found; renderRegionPads(); }
  }
}
