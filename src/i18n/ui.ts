const enGB = {
  siteTitle: 'Astro Basics',
  searchTerm: 'Search term',
  searchPlaceholder: 'Search content and blogs',
  search: 'Search',
  searchTitle: 'Search',
  clearSearch: 'Clear search',
  searchUnavailable: 'Search is unavailable',
  noResults: 'No results',
  noResultsForTerm: 'No results for “{term}”',
  noResultsHint: 'Try a different term or content type.',
  filterByType: 'Filter by content type',
  all: 'All',
  typeContent: 'Content',
  typeBlog: 'Blog',
  related: 'Related',
  tags: 'Tags',
  pagination: 'pagination',
  previous: 'Previous',
  next: 'Next',
  previousPage: 'Go to previous page',
  nextPage: 'Go to next page',
  morePages: 'More pages',
  primaryNav: 'Primary',
  language: 'Language',
} as const;

export type UiKey = keyof typeof enGB;
type Dictionary = Partial<Record<UiKey, string>>;

const es: Dictionary = {
  siteTitle: 'Astro Basics',
  searchTerm: 'Término de búsqueda',
  searchPlaceholder: 'Buscar contenido y blogs',
  search: 'Buscar',
  searchTitle: 'Buscar',
  clearSearch: 'Borrar búsqueda',
  searchUnavailable: 'La búsqueda no está disponible',
  noResults: 'Sin resultados',
  noResultsForTerm: 'Sin resultados para «{term}»',
  noResultsHint: 'Prueba con otro término o tipo de contenido.',
  filterByType: 'Filtrar por tipo de contenido',
  all: 'Todo',
  typeContent: 'Contenido',
  typeBlog: 'Blog',
  related: 'Relacionado',
  tags: 'Etiquetas',
  pagination: 'paginación',
  previous: 'Anterior',
  next: 'Siguiente',
  previousPage: 'Ir a la página anterior',
  nextPage: 'Ir a la página siguiente',
  morePages: 'Más páginas',
  primaryNav: 'Principal',
  language: 'Idioma',
};

const ar: Dictionary = {
  siteTitle: 'Astro Basics',
  searchTerm: 'عبارة البحث',
  searchPlaceholder: 'ابحث في المحتوى والمدونات',
  search: 'بحث',
  searchTitle: 'بحث',
  clearSearch: 'مسح البحث',
  searchUnavailable: 'البحث غير متاح',
  noResults: 'لا توجد نتائج',
  noResultsForTerm: 'لا توجد نتائج عن «{term}»',
  noResultsHint: 'جرّب عبارة أو نوع محتوى مختلفًا.',
  filterByType: 'التصفية حسب نوع المحتوى',
  all: 'الكل',
  typeContent: 'المحتوى',
  typeBlog: 'المدونة',
  related: 'ذو صلة',
  tags: 'الوسوم',
  pagination: 'ترقيم الصفحات',
  previous: 'السابق',
  next: 'التالي',
  previousPage: 'انتقل إلى الصفحة السابقة',
  nextPage: 'انتقل إلى الصفحة التالية',
  morePages: 'المزيد من الصفحات',
  primaryNav: 'الرئيسية',
  language: 'اللغة',
};

const dictionaries: Record<string, Dictionary> = { en: enGB, es, ar };

const baseLanguage = (language: string) => language.split('-')[0].toLowerCase();

/** Returns the translator for a Contensis language code. Keys missing from a
 * language's dictionary, and languages without one, use the English text; a
 * regional code such as `es-ES` uses its base language's dictionary. */
export const useTranslations = (language: string) => {
  const dictionary = dictionaries[baseLanguage(language)];
  return (key: UiKey): string => dictionary?.[key] ?? enGB[key];
};

export type Translate = ReturnType<typeof useTranslations>;

/** Replaces `{name}` placeholders in a translated message */
export const fill = (
  message: string,
  values: Record<string, string | number>
) => message.replace(/\{(\w+)\}/g, (_, name) => String(values[name] ?? ''));

// Counted messages need a form per plural category of the language, which for
// Arabic means six. Categories a language lacks fall back to `other`.
type Plural = Partial<Record<Intl.LDMLPluralRule, string>> & { other: string };

const resultCounts: Record<string, { all: Plural; forTerm: Plural }> = {
  en: {
    all: { one: '{count} result', other: '{count} results' },
    forTerm: {
      one: '{count} result for “{term}”',
      other: '{count} results for “{term}”',
    },
  },
  es: {
    all: { one: '{count} resultado', other: '{count} resultados' },
    forTerm: {
      one: '{count} resultado para «{term}»',
      other: '{count} resultados para «{term}»',
    },
  },
  ar: {
    all: {
      zero: 'لا نتائج',
      one: 'نتيجة واحدة',
      two: 'نتيجتان',
      few: '{count} نتائج',
      many: '{count} نتيجة',
      other: '{count} نتيجة',
    },
    forTerm: {
      zero: 'لا نتائج عن «{term}»',
      one: 'نتيجة واحدة عن «{term}»',
      two: 'نتيجتان عن «{term}»',
      few: '{count} نتائج عن «{term}»',
      many: '{count} نتيجة عن «{term}»',
      other: '{count} نتيجة عن «{term}»',
    },
  },
};

// Bidi isolation so a term in another script cannot reorder the sentence
export const isolate = (text: string) => `⁨${text}⁩`;

/** "12 results", or "12 results for “term”" when searching for a term */
export const formatResultCount = (
  language: string,
  count: number,
  term?: string
): string => {
  const messages = resultCounts[baseLanguage(language)] ?? resultCounts.en;
  const plural = messages[term ? 'forTerm' : 'all'];
  const category = new Intl.PluralRules(language).select(count);
  return fill(plural[category] ?? plural.other, {
    count,
    term: term ? isolate(term) : '',
  });
};
