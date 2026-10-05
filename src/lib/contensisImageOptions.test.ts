import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { imageOptions, resolveImageOptions } from './contensisImageOptions.ts';

describe('resolveImageOptions', () => {
  it('returns the defaults without overrides', () => {
    assert.deepEqual(resolveImageOptions(), imageOptions);
    assert.deepEqual(resolveImageOptions({}), imageOptions);
    assert.deepEqual(resolveImageOptions(null), imageOptions);
  });
  it('applies overrides over the defaults', () => {
    assert.deepEqual(resolveImageOptions({ widths: [400, 800], quality: 60 }), {
      widths: [400, 800],
      format: 'webp',
      quality: 60,
      maxQuality: 90,
    });
  });
  it('ignores undefined overrides', () => {
    assert.equal(resolveImageOptions({ quality: undefined }).quality, 75);
  });
  it('rejects bad widths', () => {
    assert.throws(() => resolveImageOptions({ widths: [] }), /non-empty/);
    assert.throws(
      () => resolveImageOptions({ widths: [0, 5] }),
      /positive integers/
    );
    assert.throws(
      () => resolveImageOptions({ widths: [1.5] }),
      /positive integers/
    );
    assert.throws(() => resolveImageOptions({ widths: [480, 480] }), /unique/);
    assert.throws(
      () => resolveImageOptions({ widths: [800, 400] }),
      /ascending/
    );
    assert.throws(
      () => resolveImageOptions({ widths: 'x' as never }),
      /non-empty/
    );
  });
  it('rejects a format other than webp', () => {
    assert.throws(
      () => resolveImageOptions({ format: 'avif' as never }),
      /format/
    );
  });
  it('rejects bad quality and maxQuality', () => {
    assert.throws(() => resolveImageOptions({ quality: 0 }), /quality/);
    assert.throws(() => resolveImageOptions({ quality: 91 }), /quality/);
    assert.throws(() => resolveImageOptions({ quality: 50.5 }), /quality/);
    assert.throws(() => resolveImageOptions({ maxQuality: 101 }), /maxQuality/);
    assert.throws(() => resolveImageOptions({ maxQuality: 0 }), /maxQuality/);
    assert.throws(
      () => resolveImageOptions({ maxQuality: 50 }),
      /quality must be/
    );
    assert.equal(
      resolveImageOptions({ maxQuality: 100, quality: 100 }).quality,
      100
    );
  });
});
