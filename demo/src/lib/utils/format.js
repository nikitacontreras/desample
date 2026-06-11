export function fmt(n) {
  if (n < 1024) return n + ' B';
  if (n < 1048576) return (n / 1024).toFixed(1) + ' KB';
  return (n / 1048576).toFixed(1) + ' MB';
}

export function fmtTime(t) {
  const m = Math.floor(t / 60), s = Math.floor(t % 60), ms = Math.floor((t % 1) * 100);
  return `${m}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
}

export function hexToRgba(hex, a) {
  const m8 = hex.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
  if (m8) return `rgba(${parseInt(m8[1], 16)},${parseInt(m8[2], 16)},${parseInt(m8[3], 16)},${a})`;
  const m6 = hex.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
  if (m6) return `rgba(${parseInt(m6[1], 16)},${parseInt(m6[2], 16)},${parseInt(m6[3], 16)},${a})`;
  return `rgba(6,95,70,${a})`;
}

export function waveformColor(hf, amp) {
  const f = Math.pow(Math.min(hf * 2, 1), 0.55);
  const hue = 340 - f * 150;
  const sat = 55 + amp * 35;
  const lit = 10 + amp * 46;
  return `hsl(${hue}, ${sat}%, ${lit}%)`;
}
