import { describe, it, expect } from 'vitest';

describe('desample', () => {
  it('exports extractProjectJson', async () => {
    const mod = await import('./index.js');
    expect(mod.extractProjectJson).toBeDefined();
    expect(typeof mod.extractProjectJson).toBe('function');
  });

  it('exports parseStemsFile', async () => {
    const mod = await import('./index.js');
    expect(mod.parseStemsFile).toBeDefined();
    expect(typeof mod.parseStemsFile).toBe('function');
  });

  it('exports STEM_MAPPING', async () => {
    const mod = await import('./index.js');
    expect(mod.STEM_MAPPING).toEqual({
      1: 'drums',
      2: 'bass',
      3: 'other',
      4: 'vocals',
    });
  });
});
