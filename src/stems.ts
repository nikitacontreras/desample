import * as fs from 'fs';
import * as path from 'path';
import { Stem, SeratoStemsFile, STEM_MAPPING } from './types.js';

function readUint32BE(data: Uint8Array, offset: number): number {
  return (
    (data[offset] << 24) |
    (data[offset + 1] << 16) |
    (data[offset + 2] << 8) |
    data[offset + 3]
  ) >>> 0;
}

function readUint16BE(data: Uint8Array, offset: number): number {
  return ((data[offset] << 8) | data[offset + 1]) >>> 0;
}

function decodeTag(data: Uint8Array, offset: number): string {
  if (offset + 4 > data.length) return '';
  return new TextDecoder().decode(data.slice(offset, offset + 4)).replace(/\0/g, '');
}

/**
 * Parse a .serato-stems binary file and extract stem metadata + audio data.
 * The stems data is XOR-obfuscated with 0x26 (MP3 format after deobfuscation).
 */
export function parseStemsFile(filepath: string): SeratoStemsFile {
  const fileData = new Uint8Array(fs.readFileSync(filepath));

  if (fileData.length < 8) {
    throw new Error('File too small to be a valid .serato-stems file');
  }

  const magic = decodeTag(fileData, 0);
  if (magic !== 'srts') {
    throw new Error(`Invalid magic: expected "srts", got "${magic}"`);
  }

  let offset = 4; // skip magic
  let stemCount = 0;
  const stems: Stem[] = [];
  let version = '';
  let totalStems = 0;
  let sampleRate = 0;
  let totalSamples = 0;

  while (offset + 8 <= fileData.length) {
    const tag = decodeTag(fileData, offset);
    const length = readUint32BE(fileData, offset + 4);
    offset += 8;

    if (offset + length > fileData.length) break;

    if (tag === 'head') {
      if (length >= 16) {
        const versionMajor = readUint16BE(fileData, offset);
        const versionMinor = readUint16BE(fileData, offset + 2);
        version = `${versionMajor}.${versionMinor}`;
        totalStems = readUint32BE(fileData, offset + 4);
        totalSamples = readUint32BE(fileData, offset + 8);
        sampleRate = readUint32BE(fileData, offset + 12);
      }
      offset += length;
    } else if (tag === 'stem') {
      stemCount++;
      const raw = fileData.slice(offset, offset + length);

      const assignment = STEM_MAPPING[stemCount] || `unknown_${stemCount}`;

      // Stem format:
      //   bytes 0-3: stem index (uint32 LE)
      //   bytes 4+:  XOR(0x26)-obfuscated MP3 audio data
      // Skip the 4-byte index header before deobfuscating
      const audioStart = raw.length >= 4 ? 4 : 0;
      const audioLen = raw.length - audioStart;
      const clean = new Uint8Array(audioLen);
      for (let i = 0; i < audioLen; i++) {
        clean[i] = raw[audioStart + i] ^ 0x26;
      }

      stems.push({
        index: stemCount,
        assignment,
        offset: offset - 8,
        size: audioLen,
        data: clean,
      });

      offset += length;
    } else {
      if (length > 0) {
        offset += length;
      } else {
        offset += 1;
      }
    }
  }

  const durationSeconds =
    sampleRate > 0 ? Math.round((totalSamples / sampleRate) * 1000) / 1000 : 0;

  return {
    version,
    totalStems,
    sampleRate,
    totalSamples,
    durationSeconds,
    stems,
  };
}

/**
 * Parse a .serato-stems file and extract all stems to individual MP3 files
 * in the given output directory.
 */
export function extractStemsToFiles(
  filepath: string,
  outputDir: string,
): SeratoStemsFile {
  const parsed = parseStemsFile(filepath);

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  for (const stem of parsed.stems) {
    const filename = `${stem.assignment}.mp3`;
    const outPath = path.join(outputDir, filename);
    fs.writeFileSync(outPath, stem.data);
    console.log(`  Exported: ${filename} (${stem.size} bytes)`);
  }

  return parsed;
}
