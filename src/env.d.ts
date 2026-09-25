declare namespace App {
  interface Locals {
    /** Started by the middleware so it runs alongside the page's own lookup;
     * resolves to undefined when the Site View could not be loaded. */
    primaryNavigation?: Promise<
      import('./contensis/primaryNavigation').MenuItem[] | undefined
    >;
  }
}
