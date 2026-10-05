import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  languageDir,
  languageFromPath,
  languageLabel,
  resolveLanguage,
} from './language.ts';
import { formatResultCount, useTranslations } from './ui.ts';

describe('languageDir', () => {
  it('is rtl for Arabic and its regions only', () => {
    assert.equal(languageDir('ar'), 'rtl');
    assert.equal(languageDir('ar-EG'), 'rtl');
    assert.equal(languageDir('en-GB'), 'ltr');
    assert.equal(languageDir('es'), 'ltr');
  });
});

describe('languageLabel', () => {
  it('names a language in itself', () => {
    assert.equal(languageLabel('es'), 'Español');
    assert.equal(languageLabel('en-GB'), 'British English');
  });
});

describe('useTranslations', () => {
  it('translates, using the base language for regional codes', () => {
    assert.equal(useTranslations('es')('search'), 'Buscar');
    assert.equal(useTranslations('es-MX')('search'), 'Buscar');
  });
  it('uses English for languages without a dictionary', () => {
    assert.equal(useTranslations('fr-FR')('search'), 'Search');
  });
});

describe('formatResultCount', () => {
  it('uses the singular and plural form', () => {
    assert.equal(formatResultCount('en-GB', 1), '1 result');
    assert.equal(formatResultCount('en-GB', 12), '12 results');
    assert.equal(formatResultCount('es', 2), '2 resultados');
  });
  it('uses every Arabic plural form', () => {
    assert.equal(formatResultCount('ar', 0), 'لا نتائج');
    assert.equal(formatResultCount('ar', 1), 'نتيجة واحدة');
    assert.equal(formatResultCount('ar', 2), 'نتيجتان');
    assert.equal(formatResultCount('ar', 5), '5 نتائج');
    assert.equal(formatResultCount('ar', 11), '11 نتيجة');
  });
  it('adds the search term, isolated from the sentence', () => {
    assert.equal(formatResultCount('en-GB', 3, 'tea'), '3 results for “⁨tea⁩”');
  });
});

describe('resolveLanguage', () => {
  const pathname = '/es/anything';
  it('prefers the entry, then the node, then the path, then the primary language', () => {
    assert.equal(
      resolveLanguage({ entryLanguage: 'ar', nodeLanguage: 'es', pathname }),
      'ar'
    );
    assert.equal(resolveLanguage({ nodeLanguage: 'ar', pathname }), 'ar');
    assert.equal(resolveLanguage({ pathname }), 'es');
    assert.equal(resolveLanguage({ pathname: '/anything' }), 'en-GB');
  });
  it('matches a path prefix case-insensitively and only whole segments', () => {
    assert.equal(languageFromPath('/EN-gb/x'), 'en-GB');
    assert.equal(languageFromPath('/espresso'), undefined);
    assert.equal(languageFromPath('/'), undefined);
  });
});
