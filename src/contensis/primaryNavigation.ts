import type { Client, Node } from 'contensis-delivery-api';

export type MenuItem = {
  label: string;
  path: string;
  /** Only a Node with an attached entry resolves to a page, so only those link */
  linkable: boolean;
  children: MenuItem[];
};

/** Levels of the Site View beneath the Root Node. `depth` on getRoot counts
 * levels below the root, so this returns the root, its children and theirs. */
const DEPTH = 2;

const visible = (nodes: Node[] = []) =>
  nodes.filter(node => node.includeInMenu);

/** An item earns its place by linking somewhere itself or holding children
 * that do; a Node with neither has nothing to offer the menu. */
const hasDestination = (item: MenuItem) =>
  item.linkable || item.children.length > 0;

const toMenuItem = (node: Node, depth: number): MenuItem => ({
  label: node.displayName,
  path: node.path,
  linkable: !!node.entry,
  children:
    depth > 1
      ? visible(node.children)
          .map(child => toMenuItem(child, depth - 1))
          .filter(hasDestination)
      : [],
});

/** Home leads, whatever the Root Node's own menu flag says, as long as the
 * root has an entry. A hidden Node is filtered before its children are read,
 * so it hides its descendants. */
export const toPrimaryNavigation = (root: Node): MenuItem[] =>
  [
    {
      label: root.displayName,
      path: '/',
      linkable: !!root.entry,
      children: [],
    },
    ...visible(root.children).map(node => toMenuItem(node, DEPTH)),
  ].filter(hasDestination);

/** Resolves to undefined rather than rejecting: routes that never render the
 * Layout (404s) never await this, and an unhandled rejection would crash the
 * process. Undefined means the header is not rendered. */
export const loadPrimaryNavigation = async (
  client: Client
): Promise<MenuItem[] | undefined> => {
  try {
    const root = await client.nodes.getRoot({ depth: DEPTH });
    return root ? toPrimaryNavigation(root) : undefined;
  } catch (error: unknown) {
    console.error('[primaryNavigation] Failed to load the Site View:', error);
    return undefined;
  }
};
