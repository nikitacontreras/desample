import { state, $ } from './state.js';
import { fmtTime } from './utils/format.js';
import { parseTempoMap } from './utils/tempo-parser.js';

export function showTempoMap(result, bpm, songLen) {
  const { version, totalBytes, numEntries, entries } = result;
  const quarterSec = 60 / bpm;
  const totalBeats = songLen / quarterSec;
  let html = `<div class="grid grid-cols-2 gap-2 mb-2">
    <div class="bg-neutral-800/60 p-2 rounded border border-neutral-700/50"><div class="text-[10px] text-neutral-500 uppercase">Versión</div><div class="text-xs font-bold text-neutral-200 mt-0.5">${version}</div></div>
    <div class="bg-neutral-800/60 p-2 rounded border border-neutral-700/50"><div class="text-[10px] text-neutral-500 uppercase">Marcadores</div><div class="text-xs font-bold text-neutral-200 mt-0.5">${numEntries}</div></div>
  </div>`;
  html += `<p class="text-[10px] text-neutral-500 mb-2 leading-relaxed">${numEntries} marcadores · cada uno termina con <code class="font-mono text-neutral-400">0.25</code> (negra)</p>`;
  html += `<details class="text-[10px]"><summary class="cursor-pointer text-neutral-500 hover:text-neutral-300 font-medium select-none">Ver marcadores</summary>
    <div class="mt-1 max-h-36 overflow-y-auto border border-neutral-700/50 rounded">`;
  for (const e of entries) {
    const pos = e.index * (songLen / numEntries);
    const bar = Math.floor(pos / quarterSec / 4) + 1;
    const hex = Array.from(e.data.slice(0, 6)).map(b => b.toString(16).padStart(2, '0')).join(' ');
    html += `<div class="flex items-center gap-1 px-2 py-0.5 ${e.index % 2 === 0 ? 'bg-neutral-800/30' : ''} border-b border-neutral-800/50">
      <span class="text-neutral-500 min-w-[16px]">${e.index + 1}</span>
      <span class="text-neutral-300 min-w-[48px]">${pos.toFixed(1)}s</span>
      <span class="text-neutral-500 min-w-[20px]">${bar}</span>
      <span class="text-emerald-500/70 min-w-[28px]">${e.marker.toFixed(2)}</span>
      <span class="text-neutral-600 font-mono">${hex}…</span>
    </div>`;
  }
  html += `</div></details>`;
  $('tempo-content').innerHTML = html;
}

export function renderProject() {
  if (!state.projectData) return;
  const p = state.projectData;
  $('project-details').classList.remove('hidden');
  $('project-info-list').innerHTML = [
    ['Versión', p.Version ?? '?'],
    ['Vaporwave', p.VaporwaveWaveformsActive ? '✓' : '—'],
    ['Velocity', p.VelocitySensitive ? 'Sí' : 'No'],
    ['Quantize', p.Quantize ? 'Sí' : 'No'],
  ].map(([k, v]) => `<div class="flex justify-between py-0.5"><span>${k}</span><span class="text-neutral-300">${v}</span></div>`).join('');

  if (p.sourceSong) {
    const s = p.sourceSong;
    $('song-details').classList.remove('hidden');
    $('song-info-list').innerHTML = [
      ['Nombre', s.Name || '?'],
      ['Artista', s.Artist || '?'],
      ['BPM', s.BPM?.toFixed(1) ?? '?'],
      ['BPM Original', s.OriginalBPM?.toFixed(1) ?? '?'],
      ['Tonalidad', `${s.Key ?? '?'} (offset: ${s.KeySemitoneOffset ?? 0})`],
      ['Duración', s.Length ? fmtTime(s.Length) : '?'],
      ['BPM Mult.', s.BpmMultiplier ?? 1],
      ['Downbeat', `#${s.DownbeatIndex ?? '?'}`],
    ].map(([k, v]) => `<div class="flex justify-between py-0.5"><span>${k}</span><span class="text-neutral-300">${v}</span></div>`).join('');
  }

  if (p.sourceSong?.TempoMap) {
    $('tempo-details').classList.remove('hidden');
    try {
      const result = parseTempoMap(p.sourceSong.TempoMap);
      showTempoMap(result, p.sourceSong.BPM ?? 120, p.sourceSong.Length ?? 240);
    } catch { $('tempo-content').innerHTML = '<span class="text-red-400">Error al decodificar</span>'; }
  }

  if (p.SelectedStems?.length > 0) {
    $('stems-selection-details').classList.remove('hidden');
    $('stems-selection-content').innerHTML = p.SelectedStems.map(s => `<span class="text-[10px] bg-emerald-900/30 text-emerald-400 border border-emerald-700/50 px-2 py-0.5 rounded-full">${s}</span>`).join('');
  }

  if (state.regions.length > 0) {
    $('regions-details').classList.remove('hidden');
    $('regions-list').innerHTML = state.regions.map((x, i) => {
      const d = (x[1] - x[0]).toFixed(2);
      return `<div class="flex justify-between py-0.5 border-b border-neutral-800/50 last:border-0"><span class="text-neutral-500">#${i + 1}</span><span>${x[0].toFixed(2)}s → ${x[1].toFixed(2)}s</span><span class="text-neutral-500">${d}s</span></div>`;
    }).join('');
  }
}

export function updateTrackInfo() {
  if (state.waveform) {
    $('track-duration').textContent = fmtTime(state.waveform.duration);
    $('track-duration').classList.remove('hidden');
  }
  if (state.projectData?.sourceSong) {
    const s = state.projectData.sourceSong;
    if (s.Name) $('track-name').textContent = s.Name;
    if (s.Key) $('track-key').textContent = s.Key;
    if (s.OriginalBPM) $('track-original-bpm').textContent = s.OriginalBPM.toFixed(1) + ' BPM';
    if (s.BPM) {
      $('current-bpm-display').textContent = s.BPM.toFixed(1);
      $('current-bpm-display').classList.remove('hidden');
    }
    if (s.KeySemitoneOffset) {
      $('key-shift').textContent = (s.KeySemitoneOffset > 0 ? '+' : '') + s.KeySemitoneOffset;
      $('key-shift').classList.remove('hidden');
    }
  }
}
