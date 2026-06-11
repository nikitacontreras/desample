export const STEM_MAPPING = { 1: 'drums', 2: 'bass', 3: 'other', 4: 'vocals' };
export const BANK_NAMES = ['mcm', 'ncm', 'ocm', 'pcm', 'qcm', 'rcm', 'scm', 'tcm'];
export const WS = 1024;
export const HOP = 512;

export const KEY_TO_NOTE = {
  // Octava 4
  'z': 60, 's': 61, 'x': 62, 'd': 63, 'c': 64,
  'v': 65, 'g': 66, 'b': 67, 'h': 68, 'n': 69,
  'j': 70, 'm': 71,
  // Octava 5 (middle row primary)
  'q': 72, '2': 73, 'w': 74, '3': 75, 'e': 76,
  'r': 77, '5': 78, 't': 79, '6': 80, 'y': 81,
  '7': 82, 'u': 83,
  // Octava 5 (bottom row alternative)
  ',': 72, 'l': 73, '.': 74, ';': 75, '/': 76,
  // Octava 6
  'i': 84, '9': 85, 'o': 86, '0': 87, 'p': 88,
  '[': 89, '=': 90,
};

export const NOTE_TO_KEY = {};
for (const [k, v] of Object.entries(KEY_TO_NOTE)) {
  if (!(v in NOTE_TO_KEY)) NOTE_TO_KEY[v] = k;
}
