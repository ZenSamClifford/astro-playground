import type { Client } from 'contensis-delivery-api';

export type EntrySys = {
  id: string;
  language: string;
  availableLanguages?: string[];
};

export type TranslationLink = {
  language: string;
  /** Path of the translated node; undefined when it could not be resolved */
  href?: string;
};

/** One link per language the entry is available in. The language being viewed
 * keeps the current path; the others use the path of the same Site View node in
 * that language. An entry's own `sys.uri` is not used: it is not always where
 * the translated node lives. */
export const getTranslationLinks = async (
  api: Client,
  sys: EntrySys,
  nodeId: string,
  currentPath: string
): Promise<TranslationLink[]> => {
  const languages = sys.availableLanguages ?? [];
  if (languages.length < 2) return [];
  return Promise.all(
    languages.map(async (language): Promise<TranslationLink> => {
      if (language === sys.language) return { language, href: currentPath };
      try {
        const node = await api.nodes.get({ id: nodeId, language });
        return { language, href: node.path };
      } catch (error) {
        console.error(`[i18n] No ${language} node for ${nodeId}:`, error);
        return { language };
      }
    })
  );
};
