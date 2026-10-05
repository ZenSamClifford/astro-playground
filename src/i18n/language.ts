// Languages written right to left, by base language
const rtl = new Set(['ar', 'he', 'fa', 'ur', 'ps', 'sd', 'yi', 'dv', 'ug']);

/** Text direction for a Contensis language code such as `ar` or `en-GB` */
export const languageDir = (language: string): 'ltr' | 'rtl' =>
  rtl.has(language.split('-')[0].toLowerCase()) ? 'rtl' : 'ltr';

/** The language's name written in that language, for the switcher */
export const languageLabel = (language: string): string => {
  try {
    const label = new Intl.DisplayNames([language], {
      type: 'language',
    }).of(language);
    return label
      ? label.charAt(0).toLocaleUpperCase(language) + label.slice(1)
      : language;
  } catch {
    return language;
  }
};

/** The project's languages, as Contensis spells them */
export const supportedLanguages = ['en-GB', 'es', 'ar'];
export const primaryLanguage = 'en-GB';

/** A supported language named by the first path segment, e.g. `/es/x` gives `es` */
export const languageFromPath = (pathname: string): string | undefined => {
  const first = pathname
    .split('/')
    .find(segment => segment)
    ?.toLowerCase();
  return supportedLanguages.find(language => language.toLowerCase() === first);
};

/** The language a page renders in, from the most to the least specific source:
 * its entry, its node, a language prefix in the path, then the primary language */
export const resolveLanguage = ({
  entryLanguage,
  nodeLanguage,
  pathname,
}: {
  entryLanguage?: string;
  nodeLanguage?: string;
  pathname: string;
}): string =>
  entryLanguage ??
  nodeLanguage ??
  languageFromPath(pathname) ??
  primaryLanguage;
