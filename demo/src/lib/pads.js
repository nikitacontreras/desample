import { state, $, getCurrentTime } from './state.js';
import { BANK_NAMES, KEY_TO_NOTE, NOTE_TO_KEY } from './utils/constants.js';

const NOTE_NAMES = {
  60: 'C4', 61: 'C#4', 62: 'D4', 63: 'D#4', 64: 'E4',
  65: 'F4', 66: 'F#4', 67: 'G4', 68: 'G#4', 69: 'A4',
  70: 'A#4', 71: 'B4', 72: 'C5', 73: 'C#5', 74: 'D5',
  75: 'D#5', 76: 'E5', 77: 'F5', 78: 'F#5', 79: 'G5',
  80: 'G#5', 81: 'A5', 82: 'A#5', 83: 'B5', 84: 'C6',
  85: 'C#6', 86: 'D6', 87: 'D#6', 88: 'E6', 89: 'F6',
  90: 'F#6',
};

export function refreshPadsMessage() {
  const hasPads = state.pads || state.regions.length > 0;
  if (hasPads) $('pads-section').classList.remove('hidden');
}

export function renderPadGrid() {
  if (state.pads) renderSlicePalettePads();
  else if (state.regions.length > 0) renderRegionPads();
  else { $('pad-grid').innerHTML = ''; $('bank-tabs').innerHTML = ''; $('pads-section').classList.add('hidden'); hideKeyRef(); }
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
  $('bank-tabs').innerHTML = tabsHtml + `<button id="key-ref-btn" class="ml-auto text-[11px] px-1.5 py-1 rounded-md bg-neutral-800/60 text-neutral-500 hover:text-neutral-300 hover:bg-neutral-700/50 transition-colors cursor-pointer" title="Keyboard Reference">⌨</button>`;

  const start = state.currentBank * 16;
  const bankPads = pads.slice(start, start + 16);
  $('pad-grid').innerHTML = bankPads.map((p, i) => {
    const sl = p.slice;
    const globalIdx = start + i;
    const isActive = state.activePadIdx === i && state.currentBank === Math.floor(globalIdx / 16);
    const note = 60 + globalIdx;
    const keyChar = NOTE_TO_KEY[note];
    const noteName = NOTE_NAMES[note];
    let style = '', label = '', detail = '';
    if (sl) {
      const baseColor = sl.Color || '#065f46';
      style = `background:${baseColor};border-color:transparent;${isActive ? 'box-shadow:0 0 0 2px #22c55e;' : ''}`;
      label = sl.Name || `S${i}`; detail = `${sl.StartPosition.toFixed(1)}s`;
    } else { style = 'background:#262626;border-color:#404040;'; }
    const title = sl ? `${label} · ${sl.StartPosition.toFixed(3)}s – ${sl.EndPosition.toFixed(3)}s` : `Pad ${i} (vacío)`;
    return `<div class="h-8 flex items-center gap-1 px-1.5 rounded-md border transition-all cursor-pointer ${isActive ? 'brightness-110 ring-1 ring-emerald-500' : 'hover:brightness-110'}" data-bank="${state.currentBank}" data-idx="${i}" data-global="${globalIdx}" data-note="${note}" data-slice="${sl ? 1 : 0}" title="${title}" style="${style}">${sl ? `<span class="text-[9px] font-bold text-neutral-100 leading-tight truncate">${label}</span>` : `<span class="text-[9px] text-neutral-600 font-medium">${i + 1}</span>`}<span class="text-[7px] text-neutral-400/50 ml-auto shrink-0">${keyChar ? `<span class="uppercase">${keyChar}</span>·${noteName}` : ''}</span></div>`;
  }).join('');
  bindKeyRefBtn();
}

export function renderRegionPads() {
  $('pads-section').classList.remove('hidden');
  const regions = state.regions;
  $('pad-grid').innerHTML = regions.map(([start, end], i) => {
    const dur = (end - start).toFixed(2);
    const isActive = state.activeRegionIdx === i;
    const note = 60 + i;
    const keyChar = NOTE_TO_KEY[note];
    const noteName = NOTE_NAMES[note];
    const activeStyle = isActive ? 'ring-1 ring-emerald-500 bg-emerald-900/30 border-emerald-700' : 'bg-neutral-800 border-neutral-700 hover:border-neutral-500';
    return `<div class="h-10 flex items-center gap-2 px-2.5 rounded-md border ${activeStyle} transition-all cursor-pointer" data-region="${i}" data-note="${note}" title="Región ${i + 1}: ${start.toFixed(3)}s – ${end.toFixed(3)}s">
      <span class="text-[11px] font-bold text-neutral-200">R${i + 1}</span>
      <span class="text-[7px] text-neutral-400/50 ml-1">${keyChar ? `<span class="uppercase">${keyChar}</span>·${noteName}` : ''}</span>
      <span class="text-[9px] text-neutral-500 ml-auto">${dur}s</span>
    </div>`;
  }).join('');
  $('bank-tabs').innerHTML = `<button id="key-ref-btn" class="ml-auto text-[11px] px-1.5 py-1 rounded-md bg-neutral-800/60 text-neutral-500 hover:text-neutral-300 hover:bg-neutral-700/50 transition-colors cursor-pointer" title="Keyboard Reference">⌨</button>`;
  bindKeyRefBtn();
}

const KEY_REF_LAYOUT = [
  { label: 'Oct 4', keys: ['z', 's', 'x', 'd', 'c', 'v', 'g', 'b', 'h', 'n', 'j', 'm'] },
  { label: 'Oct 5 (mid)', keys: ['q', '2', 'w', '3', 'e', 'r', '5', 't', '6', 'y', '7', 'u'] },
  { label: 'Oct 5 (bot)', keys: [',', 'l', '.', ';', '/'] },
  { label: 'Oct 6', keys: ['i', '9', 'o', '0', 'p', '[', '='] },
];

function renderKeyRefOverlay() {
  let existing = $('key-ref-overlay');
  if (existing) return existing;
  const overlay = document.createElement('div');
  overlay.id = 'key-ref-overlay';
  overlay.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/60 hidden';
  overlay.addEventListener('click', (e) => { if (e.target === overlay) hideKeyRef(); });
  overlay.innerHTML = `<div class="bg-neutral-800 border border-neutral-700 rounded-lg p-4 max-w-lg w-full mx-3 shadow-2xl">
    <div class="flex items-center justify-between mb-3">
      <span class="text-sm font-medium text-neutral-200">⌨ Keyboard Reference</span>
      <button id="key-ref-close" class="text-neutral-500 hover:text-neutral-300 text-lg leading-none cursor-pointer">&times;</button>
    </div>
    <div class="space-y-2">${KEY_REF_LAYOUT.map(row => `<div class="flex items-center gap-1.5">
      <span class="text-[9px] text-neutral-600 w-16 shrink-0 uppercase">${row.label}</span>
      ${row.keys.map(k => {
        const note = KEY_TO_NOTE[k];
        const name = NOTE_NAMES[note] || '';
        const hasSharp = name?.includes('#');
        return `<span class="flex flex-col items-center px-1 py-0.5 rounded text-[10px] font-mono ${hasSharp ? 'bg-neutral-900 text-neutral-400' : 'bg-neutral-700/60 text-neutral-200'}"><span class="uppercase font-bold">${k}</span><span class="text-[7px] opacity-60">${name}</span></span>`;
      }).join('')}
    </div>`).join('')}</div>
    <p class="text-[10px] text-neutral-500 mt-2 text-center">Presiona una tecla para disparar el pad correspondiente</p></div>`;
  document.body.appendChild(overlay);
  document.getElementById('key-ref-close').addEventListener('click', hideKeyRef);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') hideKeyRef(); });
  return overlay;
}

function showKeyRef() {
  const overlay = renderKeyRefOverlay();
  overlay.classList.remove('hidden');
}

function hideKeyRef() {
  const overlay = $('key-ref-overlay');
  if (overlay) overlay.classList.add('hidden');
}

function bindKeyRefBtn() {
  const btn = document.getElementById('key-ref-btn');
  if (btn && !btn._bound) {
    btn._bound = true;
    btn.addEventListener('click', () => {
      const overlay = $('key-ref-overlay');
      if (overlay && !overlay.classList.contains('hidden')) hideKeyRef();
      else showKeyRef();
    });
  }
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
