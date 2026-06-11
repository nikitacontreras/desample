import { SeratoProject } from './types.js';

const PJPREFIX = new Uint8Array([0x23, 0x50]); // #P
const BRACE_OPEN = 0x7b; // {
const BRACE_CLOSE = 0x7d; // }
const QUOTE = 0x22; // "
const BACKSLASH = 0x5c; // \

function findBytes(data: Uint8Array, needle: Uint8Array, startOffset = 0): number {
  for (let i = startOffset; i <= data.length - needle.length; i++) {
    let match = true;
    for (let j = 0; j < needle.length; j++) {
      if (data[i + j] !== needle[j]) {
        match = false;
        break;
      }
    }
    if (match) return i;
  }
  return -1;
}

function decodeString(data: Uint8Array): string {
  return new TextDecoder().decode(data);
}

/**
 * Given a raw byte buffer (typically the VST chunk portion of a PluginState),
 * find and extract the embedded Serato Sample JSON (#P{...}).
 * Returns `null` if no Serato project JSON is found.
 */
export function extractProjectJson(data: Uint8Array): SeratoProject | null {
  const prefixIdx = findBytes(data, PJPREFIX);
  if (prefixIdx < 0) return null;

  const braceStart = prefixIdx + 2;
  if (braceStart >= data.length || data[braceStart] !== BRACE_OPEN) return null;

  let depth = 0;
  let inStr = false;
  let escaped = false;
  let end = -1;

  for (let i = braceStart; i < data.length; i++) {
    const b = data[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (b === BACKSLASH) {
      escaped = true;
      continue;
    }
    if (b === QUOTE) {
      inStr = !inStr;
      continue;
    }
    if (inStr) continue;
    if (b === BRACE_OPEN) {
      depth++;
    } else if (b === BRACE_CLOSE) {
      depth--;
      if (depth === 0) {
        end = i + 1;
        break;
      }
    }
  }

  if (end < 0) return null;

  const raw = data.slice(braceStart, end);
  const jsonStr = decodeString(raw);

  try {
    const parsed = JSON.parse(jsonStr) as Record<string, unknown>;
    // Serato wraps the project data under a "project" key
      if (parsed && typeof parsed === 'object' && 'project' in parsed) {
        return parsed.project as unknown as SeratoProject;
      }
      return parsed as unknown as SeratoProject;
    } catch {
      return null;
    }
}

/**
 * Extract all Serato-style #P{...} JSON blobs from a buffer.
 * Some VST chunks may contain multiple embedded JSON objects.
 */
export function extractAllProjectJsons(data: Uint8Array): SeratoProject[] {
  const results: SeratoProject[] = [];
  let offset = 0;

  while (offset < data.length) {
    const prefixIdx = findBytes(data, PJPREFIX, offset);
    if (prefixIdx < 0) break;

    const braceStart = prefixIdx + 2;
    if (braceStart >= data.length || data[braceStart] !== BRACE_OPEN) {
      offset = prefixIdx + 1;
      continue;
    }

    let depth = 0;
    let inStr = false;
    let escaped = false;
    let end = -1;

    for (let i = braceStart; i < data.length; i++) {
      const b = data[i];
      if (escaped) { escaped = false; continue; }
      if (b === BACKSLASH) { escaped = true; continue; }
      if (b === QUOTE) { inStr = !inStr; continue; }
      if (inStr) continue;
      if (b === BRACE_OPEN) depth++;
      else if (b === BRACE_CLOSE) {
        depth--;
        if (depth === 0) { end = i + 1; break; }
      }
    }

    if (end < 0) break;

    const raw = data.slice(braceStart, end);
    try {
      const parsed = JSON.parse(decodeString(raw)) as Record<string, unknown>;
      if (parsed && typeof parsed === 'object' && 'project' in parsed) {
        results.push(parsed.project as unknown as SeratoProject);
      } else {
        results.push(parsed as unknown as SeratoProject);
      }
    } catch {
      // skip invalid JSON
    }

    offset = end;
  }

  return results;
}

/**
 * Format sample regions string into an array of [start, end] pairs.
 */
export function parseSampleRegions(regionsStr: string): [number, number][] {
  if (!regionsStr) return [];
  return regionsStr.split(',').map((pair) => {
    const [start, end] = pair.split('|').map(Number);
    return [start, end];
  });
}
