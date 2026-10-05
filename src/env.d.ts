declare namespace App {
  interface Locals {
    /** The page entry's sys, set by the RouteLoader once it is resolved; its
     * `language` is the language everything on the page renders in. Undefined
     * on pages that have no entry. */
    entrySys?: import('./i18n/translations').EntrySys;
    /** The Site View node the page was resolved from, when it was resolved by path */
    nodeId?: string;
    /** The language of that node, for pages whose entry has none to give */
    nodeLanguage?: string;
    /** The delivery client bound to this request's surrogate-key store */
    api?: import('contensis-delivery-api').Client;
    /** Loads the Site View in a language, once per request. Resolves to
     * undefined when the Site View could not be loaded. */
    primaryNavigation?: (
      language: string
    ) => Promise<
      import('./contensis/primaryNavigation').MenuItem[] | undefined
    >;
  }
}
