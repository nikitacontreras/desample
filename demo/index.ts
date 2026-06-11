import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { extractProjectJson } from '../src/serato-sample.js';
import { parseStemsFile, extractStemsToFiles } from '../src/stems.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');

const STEMS_FILE = path.join(
  PROJECT_ROOT,
  'serato',
  'José José - Una Mañana (Cover Audio).1.2.serato-stems',
);

const SERATO_SAMPLE_JSON = path.join(
  PROJECT_ROOT,
  'flbin',
  'serato_sample.json',
);

function demoExtractProjectJson() {
  console.log('=== Serato Sample Project JSON ===');

  if (!fs.existsSync(SERATO_SAMPLE_JSON)) {
    console.log('  serato_sample.json not found, skipping.');
    return;
  }

  const raw = JSON.parse(fs.readFileSync(SERATO_SAMPLE_JSON, 'utf-8'));
  const blobData = raw['Unknown Event (213)'];
  if (!blobData) {
    console.log('  No Event 213 data in serato_sample.json');
    return;
  }

  const bytes = new Uint8Array(
    Object.keys(blobData).map((k) => blobData[k]),
  );

  const project = extractProjectJson(bytes);

  if (!project) {
    console.log('  No Serato project JSON found.');
    return;
  }

  console.log(`  Version: ${project.Version}`);
  console.log(`  Vaporwave Waveforms: ${project.VaporwaveWaveformsActive}`);
  console.log(`  Velocity Sensitive: ${project.VelocitySensitive}`);

  if (project.sourceSong) {
    const s = project.sourceSong;
    console.log(`  Source Song:`);
    console.log(`    Name: ${s.Name}`);
    console.log(`    Artist: ${s.Artist}`);
    console.log(`    File: ${s.File}`);
    console.log(`    Original BPM: ${s.OriginalBPM}`);
    console.log(`    BPM: ${s.BPM}`);
    console.log(`    Length: ${s.Length}s`);
    console.log(`    Key: ${s.Key} (offset: ${s.KeySemitoneOffset} semitones)`);
    console.log(`    Sync To Host: ${s.SyncToHost}`);
  }

  if (project.slicePalette) {
    const sp = project.slicePalette;
    console.log(`  Slice Palette:`);
    console.log(`    Momentary: ${sp.Momentary}`);
    console.log(`    Polyphonic: ${sp.PolyphonicMode}`);
    console.log(`    Slicer Length: ${sp.SlicerSliceLength} beats`);

    const padsWithSlices = sp.slicePad.filter((p) => p.slice);
    console.log(`    Pads with slices: ${padsWithSlices.length}/${sp.slicePad.length}`);

    for (const pad of padsWithSlices.slice(0, 5)) {
      const sl = pad.slice!;
      console.log(
        `      [${sl.StartPosition.toFixed(2)}s - ${sl.EndPosition.toFixed(2)}s] ` +
          `${sl.Name || 'unnamed'} ${sl.Reverse ? '(reversed)' : ''}`,
      );
    }
    if (padsWithSlices.length > 5) {
      console.log(`      ... and ${padsWithSlices.length - 5} more`);
    }
  }

  if (project.SelectedStems && project.SelectedStems.length > 0) {
    console.log(`  Selected Stems: ${project.SelectedStems.join(', ')}`);
  }

  if (project.sourceSong?.TempoMap) {
    console.log(`  Tempo Map: ${project.sourceSong.TempoMap.length} chars (base64)`);
  }

  if (project.sourceSong?.SampleRegions) {
    const regionCount = project.sourceSong.SampleRegions.split(',').length;
    console.log(`  Sample Regions: ${regionCount} regions`);
  }

  console.log();
}

function demoParseStemsFile() {
  console.log('=== .serato-stems File ===');

  if (!fs.existsSync(STEMS_FILE)) {
    console.log(`  File not found: ${STEMS_FILE}`);
    return;
  }

  const parsed = parseStemsFile(STEMS_FILE);

  console.log(`  Version: ${parsed.version}`);
  console.log(`  Stems: ${parsed.totalStems}`);
  console.log(`  Sample Rate: ${parsed.sampleRate} Hz`);
  console.log(`  Total Samples: ${parsed.totalSamples}`);
  console.log(`  Duration: ${parsed.durationSeconds}s`);

  for (const stem of parsed.stems) {
    console.log(`  Stem ${stem.index}: ${stem.assignment} (${stem.size} bytes)`);
  }

  console.log();
}

function demoExtractStems() {
  console.log('=== Extracting Stems to MP3 ===');

  if (!fs.existsSync(STEMS_FILE)) {
    console.log(`  File not found: ${STEMS_FILE}`);
    return;
  }

  const outputDir = path.join(__dirname, '..', 'extracted_stems');
  extractStemsToFiles(STEMS_FILE, outputDir);
  console.log();
}

// Run all demos
console.log('desample — Serato Sample Toolkit Demo\n');

demoExtractProjectJson();
demoParseStemsFile();
demoExtractStems();

console.log('Done.');
