import { state, $, audioPlayer, getCurrentTime } from './state.js';
import { showError, showLoading, hideLoading } from './dom.js';
import { parseStemsFile, extractProjectJson, extractFullJson, parseSampleRegions } from './utils/binary.js';
import { fmt } from './utils/format.js';
import { analyzeAudio, renderAllWaveforms } from './waveform.js';
import { refreshPadsMessage, renderPadGrid, renderSlicePalettePads, updateActivePad } from './pads.js';
import { renderProject, updateTrackInfo } from './project.js';
import { renderInspector } from './inspector.js';

let syncRatio = 1;

// ── Audio handling ──

export function handleAudio(file) {
  showLoading();
  const info = $('audio-file-info');
  info.textContent = '✓'; info.classList.remove('hidden');
  $('audio-filename').textContent = file.name;
      if (state.audioUrl) URL.revokeObjectURL(state.audioUrl);
  state.audioFile = file;
  state.audioUrl = URL.createObjectURL(file);
  audioPlayer.src = state.audioUrl;
  audioPlayer.load();

  $('stems-bar').classList.add('hidden');

  const reader = new FileReader();
  reader.onload = async () => {
    try {
      const ctx = new AudioContext();
      const audioBuffer = await ctx.decodeAudioData(reader.result);
      state.audioBuffer = audioBuffer;
      const analysis = await analyzeAudio(audioBuffer);
      state.waveform = {
        data: analysis.data,
        duration: analysis.duration,
        sampleRate: analysis.sampleRate,
        viewStart: 0,
        viewDuration: Math.min(30, analysis.duration),
        isPlaying: false,
        animId: null,
      };
      if (state.triggerCtx) state.triggerCtx.close();
      state.triggerCtx = ctx;
      ctx.suspend();
      updateTrackInfo();
      renderAllWaveforms();
      $('waveform-empty').classList.add('hidden');
      $('overview-empty').classList.add('hidden');
      $('play-btn').disabled = false;
      hideLoading();
      audioPlayer.play().catch(() => {});
      startPlaybackAnim();
      refreshPadsMessage();
    } catch (e) {
      hideLoading();
      showError('Error al decodificar audio: ' + e.message);
    }
  };
  reader.onerror = () => { hideLoading(); showError('Error al leer el archivo de audio.'); };
  reader.readAsArrayBuffer(file);
}

// ── Stems handling ──

export function handleStems(f) {
  showLoading();
  const info = $('stems-file-info');
  info.textContent = '✓'; info.classList.remove('hidden');
  $('audio-filename').textContent = f.name;
  if (state.audioUrl) { URL.revokeObjectURL(state.audioUrl); state.audioUrl = null; }
  if (state.stemsCtx) { state.stemsCtx.close(); state.stemsCtx = null; }
  state.stemsMode = false;
  state.stemsBuffers = [];
  state.stemsGains = [];
  state.stemsMuted = [];
  state.stemsSources = {};
  state.stemsCurrentTime = 0;
  state.stemsPlaying = false;

  const r = new FileReader();
  r.onload = async () => {
    try {
      const parsed = parseStemsFile(r.result);
      state.stemsData = parsed;
      if (parsed.stems.length === 0) throw new Error('No hay stems en el archivo');
      const stemCtx = new AudioContext();
      state.stemsCtx = stemCtx;
      const buffers = await Promise.all(parsed.stems.map(s => {
        const arr = s.data.buffer.slice(s.data.byteOffset, s.data.byteOffset + s.data.byteLength);
        return stemCtx.decodeAudioData(arr);
      }));
      state.stemsBuffers = buffers;
      state.stemsGains = buffers.map(() => {
        const g = stemCtx.createGain();
        g.connect(stemCtx.destination);
        return g;
      });
      state.stemsMuted = buffers.map(() => false);
      const analysis = await analyzeAudio(buffers[0]);
      state.waveform = {
        data: analysis.data,
        duration: analysis.duration,
        sampleRate: analysis.sampleRate,
        viewStart: 0,
        viewDuration: Math.min(30, analysis.duration),
        isPlaying: false,
        animId: null,
      };
      state.stemsMode = true;
      stemCtx.suspend();
      updateTrackInfo();
      renderStems();
      renderAllWaveforms();
      $('waveform-empty').classList.add('hidden');
      $('overview-empty').classList.add('hidden');
      $('play-btn').disabled = false;
      hideLoading();
      startPlaybackAnim();
      refreshPadsMessage();
    } catch (e) { state.stemsData = null; state.stemsMode = false; hideLoading(); showError(e.message || String(e)); }
  };
  r.onerror = () => { hideLoading(); showError('Error al leer el archivo.'); };
  r.readAsArrayBuffer(f);
}

export function stopStemsPlayback() {
  if (!state.stemsCtx) return;
  for (const source of Object.values(state.stemsSources)) {
    try { source.stop(); } catch (e) {}
  }
  state.stemsSources = {};
  state.stemsPlaying = false;
  if (state.waveform) state.waveform.isPlaying = false;
  if (state.stemsAnimId) { cancelAnimationFrame(state.stemsAnimId); state.stemsAnimId = null; }
}

export function startStemsPlayback() {
  if (!state.stemsCtx || state.stemsBuffers.length === 0) return;
  state.stemsStartTime = state.stemsCtx.currentTime - state.stemsCurrentTime;
  state.stemsBuffers.forEach((buffer, i) => {
    if (state.stemsMuted[i]) return;
    const source = state.stemsCtx.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = syncRatio;
    source.connect(state.stemsGains[i]);
    source.start(0, state.stemsCurrentTime);
    state.stemsSources[i] = source;
  });
  state.stemsPlaying = true;
  if (state.waveform) state.waveform.isPlaying = true;
  function tick() {
    if (state.stemsPlaying && state.stemsCtx) {
      state.stemsCurrentTime = state.stemsCtx.currentTime - state.stemsStartTime;
      if (state.waveform && state.stemsCurrentTime >= state.waveform.duration) {
        stopStemsPlayback();
        updatePlayButtons();
      }
      updateActivePad();
    }
    state.stemsAnimId = requestAnimationFrame(tick);
  }
  state.stemsAnimId = requestAnimationFrame(tick);
}

export function setStemMute(idx, mute) {
  if (idx >= state.stemsGains.length) return;
  state.stemsMuted[idx] = mute;
  state.stemsGains[idx].gain.value = mute ? 0 : 1;
  if (state.stemsPlaying && state.stemsCtx && !mute && !state.stemsSources[idx]) {
    const buffer = state.stemsBuffers[idx];
    if (buffer) {
      const source = state.stemsCtx.createBufferSource();
      source.buffer = buffer;
      source.connect(state.stemsGains[idx]);
      source.start(0, state.stemsCurrentTime);
      state.stemsSources[idx] = source;
    }
  }
  renderStems();
}

// ── Playback ──

export function togglePlay() {
  if (state.stemsMode) {
    if (state.stemsPlaying) {
      state.stemsCurrentTime = state.stemsCtx.currentTime - state.stemsStartTime;
      stopStemsPlayback();
      updatePlayButtons();
    } else {
      if (state.stemsCtx.state === 'suspended') state.stemsCtx.resume();
      startStemsPlayback();
      updatePlayButtons();
    }
    return;
  }
  if (!state.audioUrl) return;
  if (audioPlayer.paused) {
    audioPlayer.play().catch(() => {});
  } else {
    audioPlayer.pause();
  }
}

export function sync() {
  if (!state.projectData?.sourceSong) return;
  const s = state.projectData.sourceSong;
  const bpm = s.BPM;
  const originalBpm = s.OriginalBPM;
  if (!bpm || !originalBpm || bpm === 0) return;
  state.syncActive = !state.syncActive;
  if (state.syncActive) {
    syncRatio = originalBpm / bpm;
    if (!state.stemsMode) audioPlayer.playbackRate = syncRatio;
    $('sync-btn').textContent = 'SYNCED';
    $('sync-btn').classList.remove('bg-neutral-700/60', 'text-neutral-500', 'hover:bg-neutral-600/60', 'hover:text-neutral-300');
    $('sync-btn').classList.add('bg-emerald-700/60', 'text-emerald-300', 'hover:bg-emerald-600/60');
    if (s.BPM) $('current-bpm-display').textContent = originalBpm.toFixed(1);
  } else {
    syncRatio = 1;
    if (!state.stemsMode) audioPlayer.playbackRate = 1;
    $('sync-btn').textContent = 'SYNC';
    $('sync-btn').classList.remove('bg-emerald-700/60', 'text-emerald-300', 'hover:bg-emerald-600/60');
    $('sync-btn').classList.add('bg-neutral-700/60', 'text-neutral-500', 'hover:bg-neutral-600/60', 'hover:text-neutral-300');
    if (s.BPM) $('current-bpm-display').textContent = bpm.toFixed(1);
  }
  if (state.stemsMode && state.stemsPlaying) {
    const t = state.stemsCurrentTime;
    stopStemsPlayback();
    state.stemsCurrentTime = t;
    startStemsPlayback();
  }
}

export function seekTo(t) {
  t = Math.max(0, Math.min(t, state.waveform ? state.waveform.duration : 0));
  if (state.stemsMode) {
    const wasPlaying = state.stemsPlaying;
    stopStemsPlayback();
    state.stemsCurrentTime = t;
    if (wasPlaying) startStemsPlayback();
  } else {
    audioPlayer.currentTime = t;
  }
  renderAllWaveforms();
}

export function autoScrollWaveform() {
  const wf = state.waveform;
  if (!wf || !wf.isPlaying) return;
  const ct = getCurrentTime();
  const mid = wf.viewStart + wf.viewDuration / 2;
  if (ct > mid) {
    const newStart = ct - wf.viewDuration / 2;
    wf.viewStart = Math.max(0, Math.min(newStart, wf.duration - wf.viewDuration));
  }
}

export function startPlaybackAnim() {
  if (state.waveform && state.waveform.animId) return;
  function tick() { autoScrollWaveform(); renderAllWaveforms(); state.waveform.animId = requestAnimationFrame(tick); }
  state.waveform.animId = requestAnimationFrame(tick);
}

export function updatePlayButtons() {
  const isPlaying = state.stemsMode ? state.stemsPlaying : (!audioPlayer.paused);
  if (isPlaying) {
    $('play-icon').classList.add('hidden');
    $('pause-icon').classList.remove('hidden');
  } else {
    $('play-icon').classList.remove('hidden');
    $('pause-icon').classList.add('hidden');
  }
}

// ── JSON handling ──

export function handleJson(f) {
  showLoading();
  const info = $('json-file-info');
  info.textContent = '✓'; info.classList.remove('hidden');
  const r = new FileReader();
  r.onload = () => {
    try {
      const o = JSON.parse(r.result), k = Object.keys(o);
      if (k.length === 1 && /^Unknown\s+Event/.test(k[0])) {
        const b = o[k[0]];
        const full = extractFullJson(new Uint8Array(Object.keys(b).map(k => b[k])));
        state.projectData = full?.project || full;
        if (full?.slicePalette) state.projectData.slicePalette = full.slicePalette;
      } else if (k.length === 1 && k[0] === 'project') state.projectData = o.project;
      else if (o && typeof o === 'object' && 'Version' in o) state.projectData = o;
      else state.projectData = o;

      state.regions = []; state.pads = null;
      if (state.projectData) {
        const ss = state.projectData.sourceSong;
        if (ss?.SampleRegions) state.regions = parseSampleRegions(ss.SampleRegions);
        if (state.projectData.slicePalette?.slicePad) {
          state.pads = state.projectData.slicePalette.slicePad.map(p => ({
            ...p,
            slice: p.slice || {
              StartPosition: 0,
              EndPosition: 0,
              Name: '',
              Color: null,
              Reverse: false,
              Level: 1,
              Attack: 0,
              Decay: 0,
              Sustain: 1,
              Release: 0,
              PlaybackSpeed: 1,
              KeySemitoneOffset: 0,
              FilterFrequency: 20000,
            }
          }));
        }
        if (!state.pads && state.regions.length > 0) {
          state.pads = state.regions.map(([start, end]) => ({
            slice: {
              StartPosition: start,
              EndPosition: end,
              Name: '',
              Color: null,
              Reverse: false,
              Level: 1,
              Attack: 0,
              Decay: 0,
              Sustain: 1,
              Release: 0,
              PlaybackSpeed: 1,
              KeySemitoneOffset: 0,
              FilterFrequency: 20000,
            }
          }));
        }
      }
      renderProject();
      hideLoading();
      updateTrackInfo();
      const selIdx = state.pads?.findIndex(p => p.slice?.StartPosition > 0 || p.slice?.StartPosition === 0) ?? -1;
      if (selIdx >= 0) {
        state.activePadIdx = selIdx % 32;
        state.currentBank = Math.floor(selIdx / 32);
        state.activePad = state.pads[selIdx].slice;
      } else {
        state.activePadIdx = null;
        state.activePad = null;
      }
      renderPadGrid();
      renderAllWaveforms();
      renderInspector(selIdx >= 0 ? selIdx : null);
      refreshPadsMessage();
    } catch (e) { state.projectData = null; state.regions = []; state.pads = null; hideLoading(); showError('Error JSON: ' + e.message); }
  };
  r.onerror = () => { hideLoading(); showError('Error al leer JSON.'); };
  r.readAsText(f);
}

// ── Render stems ──

export function renderStems() {
  if (!state.stemsData) return;
  const d = state.stemsData;
  const colors = { drums: '#ef4444', bass: '#3b82f6', other: '#f59e0b', vocals: '#10b981' };

  $('stems-bar').classList.remove('hidden');
  function stemIcon(ass) {
    if (ass === 'drums') return `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/><path d="M7 10c0-.55.45-1 1-1h8c.55 0 1 .45 1 1s-.45 1-1 1H8c-.55 0-1-.45-1-1z"/></svg>`;
    if (ass === 'vocals') return `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>`;
    if (ass === 'bass') return `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 3h-2.18c-.83 0-1.63.33-2.22.92L8 11.59V10c0-.55-.45-1-1-1s-1 .45-1 1v3h3c.55 0 1-.45 1-1s-.45-1-1-1h-1.59l7.17-7.17c.39-.39.9-.59 1.41-.59h2.18l2 2zM6.5 15c-.83 0-1.5.67-1.5 1.5S5.67 18 6.5 18 8 17.33 8 16.5 7.33 15 6.5 15z"/></svg>`;
    return `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z"/><path d="M15 5v14h2V5h-2zM7 5v14h2V5H7z"/></svg>`;
  }

  $('stem-icons').innerHTML = d.stems.map((s, i) => {
    const c = colors[s.assignment] || '#6b7280';
    const muted = state.stemsMuted[i];
    return `<div class="stem-dot w-7 h-7 rounded-full flex items-center justify-center cursor-pointer transition-all ${muted ? 'opacity-30 scale-90' : 'opacity-95 hover:opacity-100 hover:scale-105'}" style="background:${c}" data-idx="${i}" title="${s.assignment}${muted ? ' (muted)' : ''}">
      ${stemIcon(s.assignment)}
    </div>`;
  }).join('');

  $('stems-files-details').classList.remove('hidden');
  $('stems-files-content').innerHTML = d.stems.map((s, i) => {
    const c = colors[s.assignment] || '#6b7280';
    const u = URL.createObjectURL(new Blob([s.data.buffer], { type: 'audio/mpeg' }));
    return `<div class="flex items-center gap-2 py-1 border-b border-neutral-800/50 last:border-0">
      <span class="w-2 h-2 rounded-full shrink-0" style="background:${c}"></span>
      <span class="flex-1 text-xs text-neutral-300 truncate">${s.assignment}</span>
      <span class="text-[10px] text-neutral-500 font-mono">${fmt(s.size)}</span>
      <a class="text-[9px] text-neutral-500 hover:text-neutral-300 transition-colors" href="${u}" download="${s.assignment}.mp3" title="Descargar ${s.assignment}.mp3">
        <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3"/></svg>
      </a>
    </div>`;
  }).join('');
}

export { syncRatio };
