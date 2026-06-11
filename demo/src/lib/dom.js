import { $ } from './state.js';

export function showError(m) {
  const t = $('error-toast');
  t.textContent = m;
  t.classList.remove('hidden');
  setTimeout(() => t.classList.add('hidden'), 4000);
}

export function showLoading() {
  $('loading-overlay').classList.remove('hidden');
}

export function hideLoading() {
  $('loading-overlay').classList.add('hidden');
}

export function setupDropZone(zone, input, handler) {
  zone.addEventListener('click', () => input.click());
  input.addEventListener('change', () => { if (input.files[0]) handler(input.files[0]); });
  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('border-neutral-400', 'bg-neutral-800/80'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('border-neutral-400', 'bg-neutral-800/80'));
  zone.addEventListener('drop', e => {
    e.preventDefault(); zone.classList.remove('border-neutral-400', 'bg-neutral-800/80');
    if (e.dataTransfer?.files?.[0]) handler(e.dataTransfer.files[0]);
  });
}
