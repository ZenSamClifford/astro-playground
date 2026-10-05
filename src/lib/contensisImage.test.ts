import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildVariantUrl,
  clampWidth,
  getDisplayDimensions,
  isSvg,
  parseImageUri,
  validateVariantOptions,
} from './contensisImage.ts';

const CROPPED =
  '/image-library/bridge.xb7bbef80.jpeg?w=1920&h=1235&crop=1920,800,0,218';
const field = (
  uri: string,
  properties?: { width: number; height: number } | null
) => ({
  altText: 'alt',
  caption: null,
  asset: { sys: properties === undefined ? { uri } : { uri, properties } },
  transformations: null,
});
const logger = () => {
  const messages: string[] = [];
  return { messages, warn: (m: string) => messages.push(m) };
};

describe('parseImageUri', () => {
  it('parses a bare uri', () => {
    assert.deepEqual(parseImageUri('/image-library/a.jpeg'), {
      path: '/image-library/a.jpeg',
      extra: [],
    });
  });
  it('parses w/h only', () => {
    const p = parseImageUri('/a.jpeg?w=600&h=250');
    assert.equal(p.w, 600);
    assert.equal(p.h, 250);
    assert.equal(p.crop, undefined);
  });
  it('parses crop only', () => {
    assert.deepEqual(parseImageUri('/a.jpeg?crop=400,300,100,50').crop, {
      w: 400,
      h: 300,
      x: 100,
      y: 50,
    });
  });
  it('parses w/h plus crop', () => {
    const p = parseImageUri(CROPPED);
    assert.equal(p.path, '/image-library/bridge.xb7bbef80.jpeg');
    assert.deepEqual([p.w, p.h], [1920, 1235]);
    assert.deepEqual(p.crop, { w: 1920, h: 800, x: 0, y: 218 });
  });
  it('keeps unknown params sorted and drops width/format/quality', () => {
    const p = parseImageUri('/a.jpeg?z=1&a=2&width=10&format=png&quality=5');
    assert.deepEqual(p.extra, [
      ['a', '2'],
      ['z', '1'],
    ]);
  });
  it('ignores invalid values', () => {
    const p = parseImageUri('/a.jpeg?w=abc&h=-1&crop=1,2,x');
    assert.equal(p.w, undefined);
    assert.equal(p.h, undefined);
    assert.equal(p.crop, undefined);
  });
  it('keeps unparseable w, h and crop values as raw extra params', () => {
    const p = parseImageUri('/a.jpeg?w=abc&h=-1&crop=1.5,2,3,4');
    assert.deepEqual(p.extra, [
      ['crop', '1.5,2,3,4'],
      ['h', '-1'],
      ['w', 'abc'],
    ]);
  });
  it('never throws on malformed percent escapes', () => {
    assert.doesNotThrow(() => parseImageUri('/a.jpeg?crop=%E0%A4%A&w=1'));
    assert.deepEqual(parseImageUri('/a.jpeg?crop=%E0%A4%A').extra, [
      ['crop', '%E0%A4%A'],
    ]);
  });
  it('decodes an encoded crop but still parses it', () => {
    assert.deepEqual(parseImageUri('/a.jpeg?crop=1%2C2%2C3%2C4').crop, {
      w: 1,
      h: 2,
      x: 3,
      y: 4,
    });
  });
});

describe('isSvg', () => {
  it('detects by extension, ignoring query and case', () => {
    assert.equal(isSvg('/a/logo.svg'), true);
    assert.equal(isSvg('/a/LOGO.SVG?w=1'), true);
    assert.equal(isSvg('/a/logo.png'), false);
    assert.equal(isSvg(null), false);
  });
});

describe('clampWidth', () => {
  it('rounds up to the nearest allowed width', () => {
    assert.equal(clampWidth(100), 480);
    assert.equal(clampWidth(480), 480);
    assert.equal(clampWidth(500), 768);
    assert.equal(clampWidth(1500), 1920);
  });
  it('caps at the largest allowed width', () => {
    assert.equal(clampWidth(4000), 1920);
  });
  it('caps at the smallest allowed width >= the original', () => {
    assert.equal(clampWidth(1920, 1000), 1024);
    assert.equal(clampWidth(1920, 300), 480);
    assert.equal(clampWidth(1920, 3070), 1920);
    assert.equal(clampWidth(1920, 480), 480);
    assert.equal(clampWidth(4000, 3070), 1920);
  });
  it('requests below the cap still snap up to the nearest allowed width', () => {
    assert.equal(clampWidth(500, 1000), 768);
    assert.equal(clampWidth(100, 1000), 480);
    assert.equal(clampWidth(500, 3070), 768);
  });
  it('unknown original leaves behaviour unchanged', () => {
    assert.equal(clampWidth(500, undefined), 768);
    assert.equal(clampWidth(500, 0), 768);
  });
});

describe('validateVariantOptions', () => {
  it('accepts allowed values and applies defaults', () => {
    assert.deepEqual(validateVariantOptions({ width: 768 }), {
      ok: true,
      width: 768,
      format: 'webp',
      quality: 75,
    });
  });
  it('rejects bad format, width and quality', () => {
    assert.equal(
      validateVariantOptions({ width: 768, format: 'avif' }).ok,
      false
    );
    assert.equal(validateVariantOptions({ width: 500 }).ok, false);
    assert.equal(validateVariantOptions({ width: 768, quality: 0 }).ok, false);
    assert.equal(validateVariantOptions({ width: 768, quality: 95 }).ok, false);
    assert.equal(
      validateVariantOptions({ width: 768, quality: 70.5 }).ok,
      false
    );
  });
});

describe('buildVariantUrl', () => {
  const ctx = { isDev: true };
  const build = (uri: string, width = 768) =>
    buildVariantUrl(uri, { width }, ctx);
  it('keeps w, h and crop unchanged (bridge, y=218) and appends width/format/quality', () => {
    assert.equal(
      build(CROPPED),
      '/image-library/bridge.xb7bbef80.jpeg?w=1920&h=1235&crop=1920,800,0,218&width=768&format=webp&quality=75'
    );
  });
  it('keeps the portrait example (w=1920&h=2866, y=1033)', () => {
    assert.equal(
      build('/image-library/x.jpg?w=1920&h=2866&crop=1920,800,0,1033', 480),
      '/image-library/x.jpg?w=1920&h=2866&crop=1920,800,0,1033&width=480&format=webp&quality=75'
    );
  });
  it('keeps w/h on size-only uris', () => {
    assert.equal(
      build('/a.jpeg?w=600&h=250', 480),
      '/a.jpeg?w=600&h=250&width=480&format=webp&quality=75'
    );
  });
  it('appends width to a crop-only uri (native pixels)', () => {
    assert.equal(
      build('/a.jpeg?crop=400,300,100,50'),
      '/a.jpeg?crop=400,300,100,50&width=768&format=webp&quality=75'
    );
  });
  it('handles bare uris', () => {
    assert.equal(
      build('/a.jpeg', 1024),
      '/a.jpeg?width=1024&format=webp&quality=75'
    );
  });
  it('is deterministic regardless of input param order', () => {
    assert.equal(
      build('/a.jpeg?h=2&crop=1,2,3,4&w=9&z=1&b=2', 480),
      build('/a.jpeg?b=2&z=1&crop=1,2,3,4&w=9&h=2', 480)
    );
    assert.equal(
      build('/a.jpeg?h=2&crop=1,2,3,4&w=9&z=1&b=2', 480),
      '/a.jpeg?w=9&h=2&crop=1,2,3,4&b=2&z=1&width=480&format=webp&quality=75'
    );
  });
  it('replaces stored width/format/quality rather than duplicating them', () => {
    assert.equal(
      build('/a.jpeg?w=9&h=2&width=5&format=png&quality=1', 480),
      '/a.jpeg?w=9&h=2&width=480&format=webp&quality=75'
    );
  });
  it('carries an unparseable crop through as-is', () => {
    assert.equal(
      build('/a.jpeg?w=9&h=2&crop=1.5,2,3,4', 480),
      '/a.jpeg?w=9&h=2&crop=1.5,2,3,4&width=480&format=webp&quality=75'
    );
  });
  it('throws in dev on invalid options', () => {
    assert.throws(
      () => buildVariantUrl('/a.jpeg', { width: 500 }, ctx),
      /width/
    );
  });
  it('warns and returns the original uri in production', () => {
    const l = logger();
    assert.equal(
      buildVariantUrl(CROPPED, { width: 500 }, { isDev: false, logger: l }),
      CROPPED
    );
    assert.equal(l.messages.length, 1);
    assert.match(l.messages[0], /original uri/);
  });
});

describe('getDisplayDimensions', () => {
  it('1: crop wins over w/h', () => {
    assert.deepEqual(getDisplayDimensions(field(CROPPED)), {
      width: 1920,
      height: 800,
    });
  });
  it('1: crop only', () => {
    assert.deepEqual(
      getDisplayDimensions(field('/a.jpeg?crop=400,300,100,50')),
      { width: 400, height: 300 }
    );
  });
  it('1: crop wins over properties (original file)', () => {
    assert.deepEqual(
      getDisplayDimensions(
        field('/a.jpeg?crop=400,300,100,50', { width: 900, height: 600 })
      ),
      { width: 400, height: 300 }
    );
  });
  it('2: size only', () => {
    assert.deepEqual(getDisplayDimensions(field('/a.jpeg?w=600&h=250')), {
      width: 600,
      height: 250,
    });
  });
  it('3: lone w derives the height from the original ratio', () => {
    assert.deepEqual(
      getDisplayDimensions(
        field('/a.jpeg?w=450', { width: 4000, height: 3000 })
      ),
      { width: 450, height: 338 }
    );
  });
  it('3: lone h derives the width from the original ratio', () => {
    assert.deepEqual(
      getDisplayDimensions(field('/a.jpeg?h=300', { width: 900, height: 600 })),
      { width: 450, height: 300 }
    );
  });
  it('3: lone w without properties gives undefined and warns', () => {
    const warnings: string[] = [];
    assert.equal(
      getDisplayDimensions(field('/a.jpeg?w=450'), m => warnings.push(m)),
      undefined
    );
    assert.equal(warnings.length, 1);
  });
  it('2: size beats properties', () => {
    assert.deepEqual(
      getDisplayDimensions(
        field('/a.jpeg?w=600&h=250', { width: 900, height: 600 })
      ),
      { width: 600, height: 250 }
    );
  });
  it('3: bare uri with properties', () => {
    assert.deepEqual(
      getDisplayDimensions(field('/a.jpeg', { width: 900, height: 600 })),
      { width: 900, height: 600 }
    );
  });
  it('4: bare uri without properties gives undefined and warns', () => {
    const warnings: string[] = [];
    assert.equal(
      getDisplayDimensions(field('/a.jpeg'), m => warnings.push(m)),
      undefined
    );
    assert.equal(warnings.length, 1);
    assert.match(warnings[0], /only a link/);
  });
  it('no warning when crop/size resolve without properties', () => {
    const warnings: string[] = [];
    getDisplayDimensions(field(CROPPED), m => warnings.push(m));
    getDisplayDimensions(field('/a.jpeg?w=1&h=2'), m => warnings.push(m));
    assert.deepEqual(warnings, []);
  });
  it('0/0 properties are not trusted but do not warn as a link', () => {
    const warnings: string[] = [];
    assert.equal(
      getDisplayDimensions(field('/a.jpeg', { width: 0, height: 0 }), m =>
        warnings.push(m)
      ),
      undefined
    );
    assert.deepEqual(warnings, []);
  });
  it('null field and null asset are safe', () => {
    assert.equal(getDisplayDimensions(null), undefined);
    assert.equal(getDisplayDimensions(undefined), undefined);
    assert.equal(
      getDisplayDimensions({ asset: null, transformations: null }),
      undefined
    );
  });
  it('reads the string form of transformations when the uri is bare', () => {
    const dims = (transformations: string) =>
      getDisplayDimensions({
        asset: { sys: { uri: '/a.jpeg' } },
        transformations,
      });
    assert.deepEqual(dims('w=450&h=300'), { width: 450, height: 300 });
    assert.deepEqual(dims('crop=400,300,100,50'), { width: 400, height: 300 });
    assert.deepEqual(dims('w=1200&h=600&crop=600,600,0,0'), {
      width: 600,
      height: 600,
    });
    assert.equal(dims('garbage'), undefined);
    assert.equal(dims(''), undefined);
  });
  it('uri wins over a string transformations value', () => {
    assert.deepEqual(
      getDisplayDimensions({
        asset: { sys: { uri: '/a.jpeg?w=100&h=50' } },
        transformations: 'crop=400,300,0,0',
      }),
      { width: 100, height: 50 }
    );
  });
});
