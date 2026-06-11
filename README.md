# desample

Serato Sample project parser and `.serato-stems` extractor. Works entirely in the browser and Node.js.

## Install

```bash
npm install desample
```

## Usage

### Extract Serato Sample project JSON

```ts
import { extractProjectJson } from 'desample';

const buffer = fs.readFileSync('some-file.serato-sample');
const project = extractProjectJson(buffer);
console.log(project.sourceSong.BPM); // 92
```

### Parse `.serato-stems` files

```ts
import { parseStemsFile, extractStemsToFiles } from 'desample';

const buffer = fs.readFileSync('some-file.serato-stems');
const stemsFile = parseStemsFile(buffer);
// stemsFile.stems[0].assignment === 'drums'

extractStemsToFiles(stemsFile, './output-dir/');
// → ./output-dir/drums.mp3, ./output-dir/bass.mp3, ...
```

### Demo

```bash
npx tsx demo/index.ts
```

Or open `demo/dist/index.html` (build with `cd demo && npm run build`).

## API

| Function | Description |
|---|---|
| `extractProjectJson(buffer)` | Extracts the embedded Serato Sample project from a `.serato-sample` buffer |
| `extractAllProjectJsons(buffer)` | Returns all embedded JSON objects found |
| `parseSampleRegions(json)` | Parses `SampleRegions` into `SlicePad[]` |
| `parseStemsFile(buffer)` | Parses a `.serato-stems` file, returns `{ stems: Stem[] }` |
| `extractStemsToFiles(data, outputDir)` | Writes each stem as an MP3 file |

## License

MIT
