import type { AstroGlobal } from 'astro';
import { resolveLanguage } from './language';
import { useTranslations } from './ui';

type PageContext = Pick<AstroGlobal, 'locals' | 'url'>;

/** The language of the page being rendered */
export const currentLanguage = ({ locals, url }: PageContext) =>
  resolveLanguage({
    entryLanguage: locals.entrySys?.language,
    nodeLanguage: locals.nodeLanguage,
    pathname: url.pathname,
  });

/** The translator for the page being rendered */
export const pageTranslations = (context: PageContext) =>
  useTranslations(currentLanguage(context));
