export function parseTempoMap(base64Str) {
  const bytes = Uint8Array.from(atob(base64Str), c => c.charCodeAt(0));
  const dv = new DataView(bytes.buffer);
  const version = dv.getUint32(0, true);
  const ENTRY_SIZE = 33, headerSize = 4;
  const numEntries = Math.floor((bytes.length - headerSize) / ENTRY_SIZE);
  const entries = [];
  for (let i = 0; i < numEntries; i++) {
    const off = headerSize + i * ENTRY_SIZE;
    if (off + ENTRY_SIZE > bytes.length) break;
    const dataBlock = bytes.slice(off, off + 25);
    const markerF64 = dv.getFloat64(off + 25, false);
    entries.push({ index: i, data: dataBlock, marker: markerF64 });
  }
  return { version, totalBytes: bytes.length, numEntries, entries, trailingBytes: bytes.length - (headerSize + numEntries * ENTRY_SIZE) };
}
