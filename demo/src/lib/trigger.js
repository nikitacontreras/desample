import { state } from './state.js';
import { syncRatio } from './player.js';

const reversedCache = new Map();

function getReversedBuffer(ctx, buffer, start, end) {
  const key = `${start}-${end}`;
  if (reversedCache.has(key)) return reversedCache.get(key);
  const sr = buffer.sampleRate;
  const s0 = Math.floor(start * sr);
  const s1 = Math.floor(end * sr);
  const len = s1 - s0;
  const ch = buffer.numberOfChannels;
  const rev = ctx.createBuffer(ch, len, sr);
  for (let c = 0; c < ch; c++) {
    const src = buffer.getChannelData(c);
    const dst = rev.getChannelData(c);
    for (let i = 0; i < len; i++) dst[i] = src[s1 - 1 - i];
  }
  reversedCache.set(key, rev);
  return rev;
}

export function buildChain(note, start, end, ctx, sourceBuffer) {
  const globalIdx = note - 60;
  const pad = state.pads?.[globalIdx];
  const sl = pad?.slice;

  const level = (sl?.Level != null && sl.Level > 0) ? sl.Level : 1;
  const attack = sl?.Attack ?? 0;
  const decay = sl?.Decay ?? 0;
  const sustain = sl?.Sustain ?? 1;
  const release = sl?.Release ?? 0;
  const rev = sl?.Reverse ?? false;
  const playbackSpeed = sl?.PlaybackSpeed ?? 1;
  const keyOffset = sl?.KeySemitoneOffset ?? 0;
  const filterFreq = sl?.FilterFrequency ?? null;
  const rate = syncRatio * playbackSpeed * Math.pow(2, keyOffset / 12);
  const bufDur = end - start;
  const wallDur = bufDur / rate;
  const now = ctx.currentTime;
  console.log({ globalIdx, start, end, bufDur, rate, wallDur, syncRatio, rev: sl?.Reverse, level });

  const buffer = sourceBuffer || state.audioBuffer;
  if (!buffer) return null;

  const isShortBuffer = !!sourceBuffer;

  const gainNode = ctx.createGain();
  gainNode.gain.value = 0;

  let filterNode = null;
  if (filterFreq !== null && filterFreq > 0 && filterFreq < ctx.sampleRate / 2) {
    filterNode = ctx.createBiquadFilter();
    filterNode.type = 'lowpass';
    filterNode.frequency.value = filterFreq;
  }

  let source = ctx.createBufferSource();
  if (rev) {
    if (isShortBuffer) {
      source.buffer = getReversedBuffer(ctx, buffer, 0, buffer.duration);
    } else {
      source.buffer = getReversedBuffer(ctx, buffer, start, end);
    }
    source.playbackRate.value = rate;
    source.start(0, 0, bufDur);
  } else {
    source.buffer = buffer;
    source.playbackRate.value = rate;
    source.start(0, isShortBuffer ? 0 : start, bufDur);
  }

  source.connect(gainNode);
  let dest = gainNode;
  if (filterNode) { gainNode.connect(filterNode); dest = filterNode; }
  dest.connect(ctx.destination);

  // ADSR envelope
  if (attack > 0) {
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(level, now + attack);
  } else {
    gainNode.gain.setValueAtTime(level, now);
  }

  const sustainLevel = level * sustain;
  if (decay > 0) {
    gainNode.gain.linearRampToValueAtTime(sustainLevel, now + attack + decay);
  }

  if (release > 0) {
    const relTime = now + wallDur - Math.min(release, wallDur);
    gainNode.gain.setValueAtTime(sustainLevel, relTime);
    gainNode.gain.linearRampToValueAtTime(0, now + wallDur);
  }

  return { source, gainNode, release, rate, level, sustainLevel };
}

export function stopChain(entry, ctx) {
  if (!entry) return;
  const { source, gainNode, release, sustainLevel } = entry;
  if (!source) return;
  const now = ctx.currentTime;
  if (release > 0) {
    try {
      gainNode.gain.cancelScheduledValues(now);
      gainNode.gain.setValueAtTime(gainNode.gain.value, now);
      gainNode.gain.linearRampToValueAtTime(0, now + release);
      source.stop(now + release);
    } catch (_) { try { source.stop(); } catch (_2) {} }
  } else {
    try { source.stop(); } catch (_) {}
  }
}

export function getSliceParams(note) {
  const pad = state.pads?.[note - 60];
  return pad?.slice || null;
}

export function mixStemsBuffer(start, end, ctx, stemsBuffers, stemsMuted) {
  if (!stemsBuffers || stemsBuffers.length === 0) return null;
  const duration = end - start;
  if (duration <= 0) return null;
  const sr = stemsBuffers[0].sampleRate;
  const length = Math.ceil(duration * sr);
  if (length <= 0) return null;
  const numCh = stemsBuffers[0].numberOfChannels;
  const mix = ctx.createBuffer(numCh, length, sr);
  for (let i = 0; i < stemsBuffers.length; i++) {
    if (stemsMuted[i]) continue;
    const buf = stemsBuffers[i];
    const startS = Math.floor(start * buf.sampleRate);
    for (let c = 0; c < Math.min(numCh, buf.numberOfChannels); c++) {
      const src = buf.getChannelData(c);
      const dst = mix.getChannelData(c);
      const max = Math.min(length, src.length - startS);
      for (let s = 0; s < max; s++) {
        dst[s] += src[startS + s];
      }
    }
  }
  return mix;
}
