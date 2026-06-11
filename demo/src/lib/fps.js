import { $ } from './state.js';

const timestamps = [];
let started = false;

function tick() {
  const now = performance.now();
  timestamps.push(now);
  while (timestamps.length > 0 && now - timestamps[0] > 1000) {
    timestamps.shift();
  }
  const el = $('fps');
  if (el) el.textContent = (timestamps.length - 1) + ' FPS';
  requestAnimationFrame(tick);
}

export function startFps() {
  if (started) return;
  started = true;
  tick();
}
