import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildImageAttributes } from './imageAttributes.ts';
import { DEFAULT_SIZES, resolveSizes } from './imageSizes.ts';

const URI = '/image-library/a.jpg?w=1920&h=2866&crop=1920,800,0,1033';
const ctx = { isDev: true };
const descriptors = (srcset?: string) =>
  (srcset ?? '').split(', ').map(e => e.split(' ')[1]);

describe('buildImageAttributes', () => {
  it('known size: lazy, async, srcset capped, size attributes', () => {
    const a = buildImageAttributes(
      { src: URI, alt: 'x', width: 900, height: 600 },
      ctx
    );
    assert.equal(a.loading, 'lazy');
    assert.equal(a.decoding, 'async');
    assert.equal(a.fetchpriority, undefined);
    assert.equal(a.width, 900);
    assert.equal(a.height, 600);
    assert.deepEqual(descriptors(a.srcset), ['480w', '768w', '900w']);
    assert.equal(a.sizes, DEFAULT_SIZES);
  });
  it('unknown size: no loading attribute, no width/height, full fixed set', () => {
    const a = buildImageAttributes({ src: '/a.jpg', alt: 'x' }, ctx);
    assert.equal(a.loading, undefined);
    assert.equal(a.width, undefined);
    assert.equal(a.height, undefined);
    assert.equal(a.decoding, 'async');
    assert.deepEqual(descriptors(a.srcset), [
      '480w',
      '768w',
      '1024w',
      '1440w',
      '1920w',
    ]);
  });
  it('a lone width is not a known size', () => {
    const a = buildImageAttributes({ src: '/a.jpg', alt: '', width: 900 }, ctx);
    assert.equal(a.loading, undefined);
    assert.equal(a.width, undefined);
  });
  it('priority: eager and fetchpriority high, even without a size', () => {
    for (const size of [{ width: 900, height: 600 }, {}]) {
      const a = buildImageAttributes(
        { src: URI, alt: 'x', priority: true, ...size },
        ctx
      );
      assert.equal(a.loading, 'eager');
      assert.equal(a.fetchpriority, 'high');
    }
  });
  it('priority src is the largest variant, others use 768', () => {
    const big = { width: 1920, height: 800 };
    assert.match(
      buildImageAttributes({ src: URI, alt: '', priority: true, ...big }, ctx)
        .src,
      /width=1920&/
    );
    assert.match(
      buildImageAttributes({ src: URI, alt: '', ...big }, ctx).src,
      /width=768&/
    );
  });
  it('fallbackSize is used only when the image has no size', () => {
    const fallbackSize = { width: 1920, height: 800 };
    const without = buildImageAttributes(
      { src: URI, alt: '', fallbackSize },
      ctx
    );
    assert.equal(without.width, 1920);
    assert.equal(without.height, 800);
    assert.equal(without.loading, 'lazy');
    const own = buildImageAttributes(
      { src: URI, alt: '', width: 900, height: 600, fallbackSize },
      ctx
    );
    assert.equal(own.width, 900);
    assert.equal(own.height, 600);
  });
  it('svg is plain: only src and alt', () => {
    assert.deepEqual(
      buildImageAttributes(
        { src: '/logo.svg', alt: 'logo', priority: true, width: 10, height: 5 },
        ctx
      ),
      { src: '/logo.svg', alt: 'logo' }
    );
  });
  it('alt is always emitted', () => {
    assert.equal(buildImageAttributes({ src: URI, alt: '' }, ctx).alt, '');
    assert.equal(buildImageAttributes({ src: URI }, ctx).alt, '');
    assert.equal(buildImageAttributes({ src: URI, alt: null }, ctx).alt, '');
  });
  it('keeps stored w/h/crop and appends width/format/quality in every URL', () => {
    const a = buildImageAttributes(
      { src: URI, alt: '', width: 1920, height: 800 },
      ctx
    );
    for (const url of (a.srcset ?? '').split(', ').map(e => e.split(' ')[0]))
      assert.match(
        url,
        /^\/image-library\/a\.jpg\?w=1920&h=2866&crop=1920,800,0,1033&width=\d+&format=webp&quality=75$/
      );
  });
  it('values are plain: & is not escaped here', () => {
    const a = buildImageAttributes({ src: URI, alt: 'a & b' }, ctx);
    assert.match(a.src, /&width=/);
    assert.doesNotMatch(a.src, /&amp;/);
    assert.equal(a.alt, 'a & b');
  });
  it('uses the options given', () => {
    const a = buildImageAttributes(
      { src: '/a.jpg', alt: '' },
      {
        options: {
          widths: [400, 800],
          format: 'webp',
          quality: 60,
          maxQuality: 90,
        },
      }
    );
    assert.deepEqual(descriptors(a.srcset), ['400w', '800w']);
    assert.match(a.src, /quality=60$/);
  });
});

describe('resolveSizes', () => {
  it('resolves preset names', () => {
    assert.equal(
      resolveSizes('hero'),
      '(min-width: 1088px) 1024px, calc(100vw - 4rem)'
    );
    assert.equal(
      resolveSizes('article'),
      '(min-width: 768px) 592px, (min-width: 730px) 666px, calc(100vw - 4rem)'
    );
    assert.equal(resolveSizes('page'), 'calc(100vw - 4rem)');
  });
  it('passes a raw string through and defaults when absent', () => {
    assert.equal(
      resolveSizes('(min-width: 800px) 800px, 100vw'),
      '(min-width: 800px) 800px, 100vw'
    );
    assert.equal(resolveSizes(undefined), DEFAULT_SIZES);
  });
});
