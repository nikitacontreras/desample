import { state, $ } from './state.js';

let currentGlobalIdx = null;

function hexTo6(hex) {
  if (!hex) return '#065f46';
  let h = hex.replace('#', '');
  if (h.length === 8) h = h.slice(0, 6);
  return '#' + h;
}

function updateField(key, value) {
  if (currentGlobalIdx === null || !state.pads) return;
  const pad = state.pads[currentGlobalIdx];
  if (!pad) return;
  if (!pad.slice) return;
  if (key === 'Color') {
    let h = value.replace('#', '');
    if (h.length === 6) h += 'CC';
    pad.slice.Color = '#' + h;
  } else {
    pad.slice[key] = value;
  }
}

function getSlice() {
  if (currentGlobalIdx === null || !state.pads) return null;
  return state.pads[currentGlobalIdx]?.slice || null;
}

function fmtFreq(v) {
  return v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v.toFixed(0) + 'Hz';
}

function fmtKey(v) {
  return (v >= 0 ? '+' : '') + v + 'st';
}

export function renderInspector(globalIdx) {
  currentGlobalIdx = globalIdx;

  const top = $('inspector-top');
  const bottom = $('inspector-bottom');
  if (!top || !bottom) return;

  const sl = getSlice();
  if (!sl) { top.classList.add('hidden'); bottom.classList.add('hidden'); return; }

  top.classList.remove('hidden');
  bottom.classList.remove('hidden');

  // Top strip
  const nameInput = $('inspector-name');
  const colorInput = $('inspector-color');
  const revBtn = $('inspector-reverse');
  const levelSlider = $('inspector-level');
  const levelVal = $('inspector-level-val');

  nameInput.value = sl.Name || '';
  colorInput.value = hexTo6(sl.Color);
  revBtn.textContent = sl.Reverse ? 'Rev ✓' : 'Rev ✗';
  revBtn.className = 'px-1.5 py-0.5 rounded font-medium transition-colors cursor-pointer ' + (sl.Reverse ? 'bg-emerald-700/60 text-emerald-300' : 'text-neutral-500 bg-neutral-800 hover:text-neutral-300');
  levelSlider.value = sl.Level ?? 1;
  levelVal.textContent = (sl.Level ?? 1).toFixed(2);

  // Bottom strip
  const atkSlider = $('inspector-attack');
  const dcySlider = $('inspector-decay');
  const susSlider = $('inspector-sustain');
  const relSlider = $('inspector-release');
  const spdSlider = $('inspector-speed');
  const keySlider = $('inspector-key');
  const fltSlider = $('inspector-filter');
  const atkVal = $('inspector-attack-val');
  const dcyVal = $('inspector-decay-val');
  const susVal = $('inspector-sustain-val');
  const relVal = $('inspector-release-val');
  const spdVal = $('inspector-speed-val');
  const keyVal = $('inspector-key-val');
  const fltVal = $('inspector-filter-val');

  atkSlider.value = sl.Attack ?? 0;
  dcySlider.value = typeof sl.Decay === 'number' ? sl.Decay : (sl.Decay ?? 0);
  susSlider.value = typeof sl.Sustain === 'number' ? sl.Sustain : (sl.Sustain ?? 1);
  relSlider.value = sl.Release ?? 0;
  spdSlider.value = sl.PlaybackSpeed ?? 1;
  keySlider.value = sl.KeySemitoneOffset ?? 0;
  fltSlider.value = sl.FilterFrequency ?? 20000;
  atkVal.textContent = (sl.Attack ?? 0).toFixed(2) + 's';
  dcyVal.textContent = (sl.Decay ?? 0).toFixed(2) + 's';
  susVal.textContent = (sl.Sustain ?? 1).toFixed(2);
  relVal.textContent = (sl.Release ?? 0).toFixed(2) + 's';
  spdVal.textContent = (sl.PlaybackSpeed ?? 1).toFixed(2) + 'x';
  keyVal.textContent = fmtKey(sl.KeySemitoneOffset ?? 0);
  fltVal.textContent = fmtFreq(sl.FilterFrequency ?? 20000);

  // ── Bind events (only once) ──
  if (!top._bound) {
    top._bound = true;

    nameInput.oninput = () => updateField('Name', nameInput.value);

    colorInput.oninput = () => updateField('Color', colorInput.value);

    revBtn.onclick = () => {
      updateField('Reverse', !getSlice()?.Reverse);
      renderInspector(currentGlobalIdx);
    };

    levelSlider.oninput = () => {
      const v = parseFloat(levelSlider.value);
      updateField('Level', v);
      levelVal.textContent = v.toFixed(2);
    };
  }

  if (!bottom._bound) {
    bottom._bound = true;

    atkSlider.oninput = () => {
      const v = parseFloat(atkSlider.value);
      updateField('Attack', v);
      atkVal.textContent = v.toFixed(2) + 's';
    };

    dcySlider.oninput = () => {
      const v = parseFloat(dcySlider.value);
      updateField('Decay', v);
      dcyVal.textContent = v.toFixed(2) + 's';
    };

    susSlider.oninput = () => {
      const v = parseFloat(susSlider.value);
      updateField('Sustain', v);
      susVal.textContent = v.toFixed(2);
    };

    relSlider.oninput = () => {
      const v = parseFloat(relSlider.value);
      updateField('Release', v);
      relVal.textContent = v.toFixed(2) + 's';
    };

    spdSlider.oninput = () => {
      const v = parseFloat(spdSlider.value);
      updateField('PlaybackSpeed', v);
      spdVal.textContent = v.toFixed(2) + 'x';
    };

    keySlider.oninput = () => {
      const v = parseFloat(keySlider.value);
      updateField('KeySemitoneOffset', v);
      keyVal.textContent = fmtKey(v);
    };

    fltSlider.oninput = () => {
      const v = parseFloat(fltSlider.value);
      updateField('FilterFrequency', v);
      fltVal.textContent = fmtFreq(v);
    };
  }
}
