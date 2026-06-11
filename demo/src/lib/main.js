import { state, $, audioPlayer } from './state.js';
import { setupDropZone } from './dom.js';
import { handleAudio, handleStems, handleJson, setStemMute, togglePlay, sync, seekTo, startPlaybackAnim, updatePlayButtons, autoScrollWaveform, syncRatio } from './player.js';
import { renderPadGrid, updateActivePad, renderSlicePalettePads, renderRegionPads } from './pads.js';
import { renderAllWaveforms } from './waveform.js';
import { KEY_TO_NOTE } from './utils/constants.js';

// ── Drop zones ──
setupDropZone($('audio-zone'), $('audio-input'), handleAudio);
setupDropZone($('stems-zone'), $('stems-input'), handleStems);
setupDropZone($('json-zone'), $('json-input'), handleJson);

// ── Play button ──
$('play-btn').addEventListener('click', togglePlay);

// ── SYNC button ──
$('sync-btn').addEventListener('click', sync);

// ── Audio element events ──
audioPlayer.addEventListener('play', () => {
  if (state.waveform) state.waveform.isPlaying = true;
  updatePlayButtons();
  startPlaybackAnim();
});
audioPlayer.addEventListener('pause', () => {
  if (state.waveform) state.waveform.isPlaying = false;
  updatePlayButtons();
});
audioPlayer.addEventListener('ended', () => {
  if (state.waveform) state.waveform.isPlaying = false;
  updatePlayButtons();
});
audioPlayer.addEventListener('timeupdate', updateActivePad);
audioPlayer.addEventListener('timeupdate', autoScrollWaveform);

// ── Pad grid (event delegation) ──
$('pad-grid').addEventListener('click', (e) => {
  const sliceTarget = e.target.closest('[data-slice="1"]');
  if (sliceTarget) {
    const globalIdx = parseInt(sliceTarget.dataset.global);
    const p = state.pads[globalIdx];
    if (p?.slice && (state.audioUrl || state.stemsMode)) {
      seekTo(p.slice.StartPosition);
      if (audioPlayer.paused && !state.stemsMode) audioPlayer.play().catch(() => {});
      else if (state.stemsMode && !state.stemsPlaying) togglePlay();
    }
    return;
  }
  const regionTarget = e.target.closest('[data-region]');
  if (regionTarget) {
    const idx = parseInt(regionTarget.dataset.region);
    const [start] = state.regions[idx];
    if (state.audioUrl || state.stemsMode) {
      seekTo(start);
      if (audioPlayer.paused && !state.stemsMode) audioPlayer.play().catch(() => {});
      else if (state.stemsMode && !state.stemsPlaying) togglePlay();
    }
  }
});

// ── Bank tabs (event delegation) ──
$('bank-tabs').addEventListener('click', (e) => {
  const tab = e.target.closest('.bank-tab');
  if (!tab) return;
  state.currentBank = parseInt(tab.dataset.bank);
  renderPadGrid();
});

// ── Stem mute icons (event delegation) ──
$('stem-icons').addEventListener('click', (e) => {
  const dot = e.target.closest('.stem-dot');
  if (!dot) return;
  const idx = parseInt(dot.dataset.idx);
  setStemMute(idx, !state.stemsMuted[idx]);
});

// ── Keyboard triggers ──
let triggerCtx = null;
const triggerSources = {};

function getTriggerRegion(note) {
  const regionIdx = note - 60;
  if (regionIdx < 0) return null;
  if (state.pads) {
    if (regionIdx >= state.pads.length) return null;
    const p = state.pads[regionIdx];
    if (!p?.slice) return null;
    return { start: p.slice.StartPosition, end: p.slice.EndPosition };
  }
  if (state.regions.length > 0) {
    if (regionIdx >= state.regions.length) return null;
    const [start, end] = state.regions[regionIdx];
    return { start, end };
  }
  return null;
}

function setActivePadForNote(note) {
  const regionIdx = note - 60;
  if (state.pads) {
    if (regionIdx >= state.pads.length) return;
    if (!state.pads[regionIdx]?.slice) return;
    const bank = Math.floor(regionIdx / 16);
    if (bank !== state.currentBank) {
      state.currentBank = bank;
      renderPadGrid();
    }
    const bankIdx = regionIdx - bank * 16;
    state.activePadIdx = bankIdx;
    state.activePad = state.pads[regionIdx].slice;
    renderSlicePalettePads();
  } else if (state.regions.length > 0) {
    if (regionIdx >= state.regions.length) return;
    state.activeRegionIdx = regionIdx;
    renderRegionPads();
  }
}

document.addEventListener('keydown', async (e) => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  const note = KEY_TO_NOTE[e.key.toLowerCase()];
  if (note === undefined) return;
  if (triggerSources[note]) return;
  e.preventDefault();
  const region = getTriggerRegion(note);
  if (!region) return;
  const { start, end } = region;
  const duration = end - start;
  if (duration <= 0) return;

  setActivePadForNote(note);

  if (!state.stemsMode && state.audioBuffer) {
    if (!triggerCtx || triggerCtx.state === 'closed') triggerCtx = new AudioContext();
    if (triggerCtx.state === 'suspended') await triggerCtx.resume();
    const source = triggerCtx.createBufferSource();
    source.buffer = state.audioBuffer;
    source.connect(triggerCtx.destination);
    triggerSources[note] = source;
    source.onended = () => { if (triggerSources[note] === source) delete triggerSources[note]; };
    source.start(0, start, duration);
  } else if (state.stemsMode && state.stemsCtx) {
    if (state.stemsCtx.state === 'suspended') await state.stemsCtx.resume();
    const sources = [];
    state.stemsBuffers.forEach((buffer, i) => {
      if (state.stemsMuted[i]) return;
      const s = state.stemsCtx.createBufferSource();
      s.buffer = buffer;
      s.playbackRate.value = syncRatio;
      s.connect(state.stemsGains[i]);
      sources.push(s);
      s.start(0, start, duration);
    });
    triggerSources[note] = sources;
  }
});

document.addEventListener('keyup', (e) => {
  const note = KEY_TO_NOTE[e.key.toLowerCase()];
  if (note === undefined) return;
  const sources = triggerSources[note];
  if (!sources) return;
  e.preventDefault();
  const arr = Array.isArray(sources) ? sources : [sources];
  arr.forEach(s => { try { s.stop(); } catch (e) {} });
  delete triggerSources[note];
});

// ── Overview seek drag ──
let isDraggingOverview = false;
$('overview-canvas').addEventListener('mousedown', (e) => {
  if (!state.waveform) return;
  isDraggingOverview = true;
  seekFromOverview(e);
});
document.addEventListener('mousemove', (e) => {
  if (!isDraggingOverview || !state.waveform) return;
  seekFromOverview(e);
});
document.addEventListener('mouseup', () => { isDraggingOverview = false; });

function seekFromOverview(e) {
  const canvas = $('overview-canvas');
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const frac = Math.max(0, Math.min(1, x / rect.width));
  const seekTime = frac * state.waveform.duration;
  seekTo(seekTime);
  state.waveform.viewStart = Math.max(0, Math.min(seekTime - state.waveform.viewDuration / 2, state.waveform.duration - state.waveform.viewDuration));
}

// ── Waveform click to seek ──
$('waveform-canvas').addEventListener('click', (e) => {
  if (!state.waveform) return;
  const rect = $('waveform-canvas').getBoundingClientRect();
  const x = e.clientX - rect.left;
  const frac = x / rect.width;
  const seekTime = state.waveform.viewStart + frac * state.waveform.viewDuration;
  seekTo(seekTime);
});

// ── Waveform scroll to zoom ──
$('waveform-container').addEventListener('wheel', (e) => {
  if (!state.waveform) return;
  e.preventDefault();
  const delta = e.deltaY > 0 ? 1.12 : 0.88;
  const oldDur = state.waveform.viewDuration;
  const newDur = Math.max(2, Math.min(state.waveform.duration, oldDur * delta));
  const rect = $('waveform-container').getBoundingClientRect();
  const frac = (e.clientX - rect.left) / rect.width;
  const cursorTime = state.waveform.viewStart + frac * oldDur;
  state.waveform.viewDuration = newDur;
  state.waveform.viewStart = Math.max(0, Math.min(cursorTime - frac * newDur, state.waveform.duration - newDur));
  renderAllWaveforms();
}, { passive: false });

// ── Window resize ──
window.addEventListener('resize', () => { renderAllWaveforms(); });
