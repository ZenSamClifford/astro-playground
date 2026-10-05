import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Client } from 'contensis-delivery-api';
import { getTranslationLinks } from './translations.ts';

const sys = (availableLanguages?: string[], language = 'en-GB') => ({
  id: 'entry-1',
  language,
  availableLanguages,
});

// A delivery client whose node lookups answer from a language to path map
const apiWith = (paths: Record<string, string>) =>
  ({
    nodes: {
      get: async ({ language }: { id: string; language: string }) => {
        if (!paths[language]) throw new Error('not found');
        return { path: paths[language] };
      },
    },
  }) as unknown as Client;

describe('getTranslationLinks', () => {
  it('returns nothing when the entry has no translations', async () => {
    const api = apiWith({});
    assert.deepEqual(await getTranslationLinks(api, sys(), 'n1', '/a'), []);
    assert.deepEqual(
      await getTranslationLinks(api, sys(['en-GB']), 'n1', '/a'),
      []
    );
  });

  it('keeps the current path and uses node paths for the others', async () => {
    const api = apiWith({ es: '/es/blogs/x', ar: '/ar/almdwnat/x' });
    const links = await getTranslationLinks(
      api,
      sys(['ar', 'en-GB', 'es']),
      'n1',
      '/blogs/x'
    );
    assert.deepEqual(links, [
      { language: 'ar', href: '/ar/almdwnat/x' },
      { language: 'en-GB', href: '/blogs/x' },
      { language: 'es', href: '/es/blogs/x' },
    ]);
  });

  it('leaves out the href for a language whose node cannot be resolved', async () => {
    const api = apiWith({ es: '/es/x' });
    const links = await getTranslationLinks(
      api,
      sys(['en-GB', 'es', 'ar']),
      'n1',
      '/x'
    );
    assert.deepEqual(links[2], { language: 'ar' });
    assert.equal(links[1].href, '/es/x');
  });
});
