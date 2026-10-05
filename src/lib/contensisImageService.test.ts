import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import service from './contensisImageService.ts';

const WIDTHS = [480, 768, 1024, 1440, 1920];
const SRC = '/image-library/a.jpg?w=1920&h=2866&crop=1920,800,0,1033';
const cfg = {} as never;
const messages: string[] = [];
const logger = { warn: (m: string) => messages.push(m) } as never;

// Same path Astro takes: validateOptions first, then getSrcSet on its result.
const run = (
  width: number,
  height: number,
  extra: Record<string, unknown> = {}
) => {
  const validated = service.validateOptions?.(
    { src: SRC, width, height, widths: WIDTHS, ...extra },
    cfg,
    logger
  ) as never;
  const set = service.getSrcSet?.(validated, cfg, logger) as {
    transform: { width: number };
    descriptor: string;
  }[];
  return { validated: validated as Record<string, unknown>, set };
};

describe('validateOptions then getSrcSet', () => {
  it('real Hero shape (1920x800) gives the full srcset, unchanged', () => {
    const { set } = run(1920, 800);
    assert.deepEqual(
      set.map(r => r.descriptor),
      ['480w', '768w', '1024w', '1440w', '1920w']
    );
    assert.deepEqual(
      set.map(r => r.transform.width),
      WIDTHS
    );
  });
  it('keeps the true displayed size on the options (not the snapped width)', () => {
    const { validated } = run(1000, 400);
    assert.equal(validated.width, 1000);
    assert.equal(validated.height, 400);
  });
  it('a 1000x400 crop gets a 1000w descriptor on the 1024 URL', () => {
    const { set } = run(1000, 400);
    assert.deepEqual(
      set.map(r => r.descriptor),
      ['480w', '768w', '1000w']
    );
    assert.deepEqual(
      set.map(r => r.transform.width),
      [480, 768, 1024]
    );
  });
  it('a 400px crop gets a single 400w descriptor on the 480 URL', () => {
    const { set } = run(400, 200);
    assert.deepEqual(
      set.map(r => r.descriptor),
      ['400w']
    );
    assert.equal(set[0].transform.width, 480);
  });
  it('getURL snaps the displayed width and keeps stored w/h/crop', () => {
    const { validated } = run(1000, 400);
    assert.equal(
      service.getURL(validated as never, cfg, logger),
      '/image-library/a.jpg?w=1920&h=2866&crop=1920,800,0,1033&width=1024&format=webp&quality=75'
    );
  });
  it('has no duplicate descriptors for any crop size', () => {
    for (const [w, h] of [
      [1000, 400],
      [300, 100],
      [1920, 800],
      [1024, 400],
      [481, 200],
    ]) {
      const d = run(w, h).set.map(r => r.descriptor);
      assert.equal(new Set(d).size, d.length, `${w}x${h}: ${d}`);
    }
  });
  it('a lone-w image (450x338) never advertises widths above 450', () => {
    const { set } = run(450, 338);
    assert.deepEqual(
      set.map(r => r.descriptor),
      ['450w']
    );
    assert.equal(set[0].transform.width, 480);
  });
  it('a non-numeric quality is invalid (throws in dev)', () => {
    assert.throws(() => run(1920, 800, { quality: 'high' }), /quality/);
  });
  it('getSrcSet returns no entries for an SVG src', () => {
    assert.deepEqual(
      service.getSrcSet?.(
        { src: '/image-library/logo.svg', width: 300, height: 150 } as never,
        cfg,
        logger
      ),
      []
    );
  });
  it('getURL returns an SVG src unchanged', () => {
    assert.equal(
      service.getURL(
        { src: '/image-library/logo.svg?w=10', width: 480 } as never,
        cfg,
        logger
      ),
      '/image-library/logo.svg?w=10'
    );
  });
  it('accepts numeric quality and defaults when absent', () => {
    assert.equal(run(1920, 800, { quality: 60 }).validated.quality, 60);
    assert.equal(run(1920, 800).validated.quality, 75);
  });
  it('without a width asks for the largest variant', () => {
    const v = service.validateOptions?.(
      { src: SRC } as never,
      cfg,
      logger
    ) as never as Record<string, unknown>;
    assert.equal(v.width, 1920);
  });
  it('strips widths, src, format and quality from the HTML attributes', () => {
    const { validated } = run(1920, 800);
    const attrs = service.getHTMLAttributes?.(
      validated as never,
      cfg,
      logger
    ) as Record<string, unknown>;
    for (const k of ['src', 'format', 'quality', 'widths'])
      assert.equal(k in attrs, false);
    assert.equal(attrs.loading, 'lazy');
    assert.equal(attrs.decoding, 'async');
  });
  it('returns nothing without widths or a width', () => {
    assert.deepEqual(
      service.getSrcSet?.({ src: '/a.jpg' } as never, cfg, logger),
      []
    );
  });
});

describe('config from imageConfig.service.config', () => {
  const withConfig = (config: Record<string, unknown>) =>
    ({ service: { entrypoint: 'x', config } }) as never;

  it('defaults getSrcSet to the configured widths when none are passed', () => {
    const c = withConfig({ widths: [400, 800] });
    const v = service.validateOptions?.(
      { src: SRC, width: 800, height: 400 },
      c,
      logger
    ) as never;
    const set = service.getSrcSet?.(v, c, logger) as {
      descriptor: string;
      transform: { width: number };
    }[];
    assert.deepEqual(
      set.map(r => r.descriptor),
      ['400w', '800w']
    );
    assert.deepEqual(
      set.map(r => r.transform.width),
      [400, 800]
    );
  });
  it('uses the default widths when the config is empty', () => {
    const v = service.validateOptions?.(
      { src: SRC, width: 1920, height: 800 },
      cfg,
      logger
    ) as never;
    const set = service.getSrcSet?.(v, cfg, logger) as { descriptor: string }[];
    assert.deepEqual(
      set.map(r => r.descriptor),
      ['480w', '768w', '1024w', '1440w', '1920w']
    );
  });
  it('custom quality changes the URL and is the default', () => {
    const c = withConfig({ quality: 60 });
    const v = service.validateOptions?.(
      { src: SRC, width: 1920, height: 800 },
      c,
      logger
    ) as never;
    assert.match(service.getURL(v, c, logger), /&quality=60$/);
  });
  it('snaps getURL widths to the configured set', () => {
    const c = withConfig({ widths: [400, 800] });
    const v = service.validateOptions?.(
      { src: SRC, width: 500 },
      c,
      logger
    ) as never;
    assert.match(service.getURL(v, c, logger), /&width=800&/);
  });
  it('throws on invalid config', () => {
    assert.throws(
      () =>
        service.validateOptions?.(
          { src: SRC, width: 800 },
          withConfig({ widths: [800, 400] }),
          logger
        ),
      /ascending/
    );
    assert.throws(
      () =>
        service.getURL(
          { src: SRC, width: 800 } as never,
          withConfig({ format: 'avif' }),
          logger
        ),
      /format/
    );
  });
});
