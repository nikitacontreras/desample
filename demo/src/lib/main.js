import { state, $, audioPlayer } from './state.js';
import { setupDropZone } from './dom.js';
import { handleAudio, handleStems, handleJson, setStemMute, togglePlay, sync, seekTo, startPlaybackAnim, updatePlayButtons, autoScrollWaveform } from './player.js';
import { renderPadGrid, updateActivePad } from './pads.js';
import { renderAllWaveforms } from './waveform.js';

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
