import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { type Block, createRenderer } from '@contensis/canvas-html';
import { createCanvasRenderer } from './canvasRenderer.ts';

const load = (name: string): Block[] =>
  JSON.parse(
    readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8')
  );
const ld0 = load('canvas-image-blocks-ld0.json');
const ld1 = load('canvas-image-blocks-ld1.json');
const block = (blocks: Block[], id: string): Block => {
  const found = blocks.find(b => b.id === id);
  assert.ok(found, id);
  return found;
};

const render = (
  b: Block,
  options: Parameters<typeof createCanvasRenderer>[0] = {}
) => {
  const warnings: string[] = [];
  const html = createCanvasRenderer({
    isDev: true,
    onWarn: m => warnings.push(m),
    ...options,
  })({ data: [b] });
  return { html, warnings };
};
const attr = (html: string, name: string) =>
  html.match(new RegExp(` ${name}="([^"]*)"`))?.[1];
const descriptors = (html: string) =>
  [...(attr(html, 'srcset') ?? '').matchAll(/ (\d+w)(?:,|$)/g)].map(m => m[1]);
const urls = (html: string) =>
  (attr(html, 'srcset') ?? '').split(', ').map(e => e.split(' ')[0]);
const FULL = ['480w', '768w', '1024w', '1440w', '1920w'];
const HOST = '/image-library/zz-test-jpeg-900x600.jpeg.x4aa9e920.jpeg';

describe('createCanvasRenderer images', () => {
  it('bare jpeg at linkDepth 0: no width/height, one warning, full fixed set', () => {
    const { html, warnings } = render(block(ld0, 'zzimg001'));
    assert.equal(attr(html, 'width'), undefined);
    assert.equal(attr(html, 'height'), undefined);
    assert.deepEqual(descriptors(html), FULL);
    assert.equal(warnings.length, 1);
    assert.match(warnings[0], /dimensions unavailable/);
    assert.equal(attr(html, 'loading'), 'lazy');
    assert.equal(attr(html, 'decoding'), 'async');
    assert.equal(attr(html, 'sizes'), '(min-width: 768px) 50vw, 100vw');
    assert.equal(
      attr(html, 'src'),
      `${HOST}?width=768&amp;format=webp&amp;quality=75`
    );
  });
  it('does not warn outside dev', () => {
    const { warnings } = render(block(ld0, 'zzimg001'), { isDev: false });
    assert.deepEqual(warnings, []);
  });
  it('bare jpeg at linkDepth 1 (900x600): srcset capped, size attributes present', () => {
    const { html, warnings } = render(block(ld1, 'zzimg001'));
    assert.deepEqual(descriptors(html), ['480w', '768w', '900w']);
    assert.match(urls(html)[2], /width=1024&amp;/);
    assert.equal(attr(html, 'width'), '900');
    assert.equal(attr(html, 'height'), '600');
    assert.deepEqual(warnings, []);
  });
  it('size-only (450x300) keeps w/h and is capped at 450w', () => {
    const { html, warnings } = render(block(ld0, 'zzimg002'));
    assert.deepEqual(descriptors(html), ['450w']);
    assert.equal(
      urls(html)[0],
      `${HOST}?w=450&amp;h=300&amp;width=480&amp;format=webp&amp;quality=75`
    );
    assert.equal(attr(html, 'width'), '450');
    assert.equal(attr(html, 'height'), '300');
    assert.deepEqual(warnings, []);
  });
  it('crop-only (400x300) keeps the crop', () => {
    const { html } = render(block(ld0, 'zzimg003'));
    assert.deepEqual(descriptors(html), ['400w']);
    assert.equal(
      urls(html)[0],
      `${HOST}?crop=400,300,100,50&amp;width=480&amp;format=webp&amp;quality=75`
    );
    assert.equal(attr(html, 'width'), '400');
    assert.equal(attr(html, 'height'), '300');
  });
  it('size plus crop (300x300) keeps the whole query, in fixed order', () => {
    const { html } = render(block(ld0, 'zzimg004'));
    assert.equal(
      urls(html)[0],
      `${HOST}?w=600&amp;h=400&amp;crop=300,300,10,20&amp;width=480&amp;format=webp&amp;quality=75`
    );
    assert.equal(attr(html, 'width'), '300');
    assert.equal(attr(html, 'height'), '300');
  });
  it('every variant URL keeps stored w/h/crop and appends width, format, quality in order', () => {
    for (const id of ['zzimg002', 'zzimg003', 'zzimg004']) {
      const stored = (
        block(ld0, id) as never as {
          value: { asset: { sys: { uri: string } } };
        }
      ).value.asset.sys.uri.split('?')[1];
      for (const url of urls(render(block(ld0, id)).html))
        assert.match(
          url,
          new RegExp(
            `\\?${stored.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/&/g, '&amp;')}&amp;width=\\d+&amp;format=webp&amp;quality=75$`
          )
        );
    }
  });
  it('png, webp and gif use the same pipeline (uncapped at ld0, capped at ld1)', () => {
    for (const id of ['zzimg005', 'zzimg006', 'zzimg007']) {
      assert.deepEqual(descriptors(render(block(ld0, id)).html), FULL);
      assert.match(
        attr(render(block(ld0, id)).html, 'src') ?? '',
        /format=webp/
      );
    }
    assert.deepEqual(descriptors(render(block(ld1, 'zzimg005')).html), [
      '480w',
      '768w',
      '800w',
    ]);
    assert.deepEqual(descriptors(render(block(ld1, 'zzimg006')).html), [
      '480w',
      '700w',
    ]);
    assert.deepEqual(descriptors(render(block(ld1, 'zzimg007')).html), [
      '480w',
      '500w',
    ]);
  });
  it('svg is not transformed, at either linkDepth', () => {
    for (const blocks of [ld0, ld1]) {
      const { html, warnings } = render(block(blocks, 'zzimg008'));
      assert.equal(
        html,
        '<img src="/image-library/zz-test-svg-300x150.svg.x03591e66.svg" alt="alt zzimg008">'
      );
      assert.deepEqual(warnings, []);
    }
  });
  it('svg output equals the stock renderer', () => {
    const b = block(ld0, 'zzimg008');
    assert.equal(render(b).html, createRenderer()({ data: [b] }));
  });
  it('a caption gives figure and figcaption and no title attribute', () => {
    const { html } = render(block(ld1, 'zzimg009'));
    assert.match(html, /^<figure><img /);
    assert.match(html, /<figcaption>zz caption text<\/figcaption><\/figure>$/);
    assert.equal(attr(html, 'title'), undefined);
  });
  it('differs from the stock renderer only as intended', () => {
    const b = block(ld0, 'zzimg009');
    const stock = createRenderer()({ data: [b] });
    assert.match(stock, / title="zz caption text"/);
    assert.match(stock, /<figcaption>zz caption text<\/figcaption>/);
    assert.equal(attr(render(b).html, 'alt'), attr(stock, 'alt'));
  });
  it('an empty altText keeps alt=""', () => {
    assert.match(render(block(ld0, 'zzimg010')).html, / alt=""/);
  });
  it('a missing asset or uri renders nothing', () => {
    const noAsset = {
      id: 'x',
      type: '_image',
      value: { altText: 'a' },
    } as Block;
    const noUri = {
      id: 'x',
      type: '_image',
      value: { altText: 'a', asset: { sys: {} } },
    } as Block;
    assert.equal(render(noAsset).html, '');
    assert.equal(render(noUri).html, '');
    const { warnings } = render(noAsset);
    assert.equal(warnings.length, 1);
    assert.match(warnings[0], /block x /);
    assert.deepEqual(render(noAsset, { isDev: false }).warnings, []);
  });
  it('escapes ampersands and quotes in attribute values', () => {
    const b = {
      id: 'x',
      type: '_image',
      value: {
        altText: 'a "quoted" & <b>',
        asset: { sys: { uri: '/image-library/a.jpeg?w=450&h=300&foo=a"b' } },
        transformations: 'w=450&h=300',
      },
    } as Block;
    const { html } = render(b);
    assert.match(html, / alt="a &quot;quoted&quot; &amp; &lt;b&gt;"/);
    assert.doesNotMatch(html, /[?&]h=300&(?!amp;)/);
    assert.match(html, /foo=a&quot;b/);
  });
  it('the sizes option replaces the default', () => {
    const { html } = render(block(ld1, 'zzimg001'), {
      sizes: '(min-width: 800px) 800px, 100vw',
    });
    assert.equal(attr(html, 'sizes'), '(min-width: 800px) 800px, 100vw');
  });
  it('imageOptions override widths and quality', () => {
    const { html } = render(block(ld0, 'zzimg001'), {
      imageOptions: { widths: [400, 800], quality: 60 },
    });
    assert.deepEqual(descriptors(html), ['400w', '800w']);
    assert.match(urls(html)[0], /&amp;quality=60$/);
  });
  it('invalid imageOptions throw when the renderer is created', () => {
    assert.throws(
      () => createCanvasRenderer({ imageOptions: { widths: [800, 400] } }),
      /ascending/
    );
  });
  it('leaves other blocks to the stock renderer', () => {
    const p = {
      id: 'p',
      type: '_paragraph',
      value: 'hello',
    } as Block;
    assert.equal(render(p).html, createRenderer()({ data: [p] }));
  });
});
