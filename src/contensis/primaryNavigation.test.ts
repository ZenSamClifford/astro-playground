import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Node } from 'contensis-delivery-api';
import { toPrimaryNavigation } from './primaryNavigation.ts';

const node = (path: string, extra: Partial<Node> = {}) =>
  ({
    displayName: path,
    path,
    includeInMenu: true,
    entry: {},
    children: [],
    ...extra,
  }) as unknown as Node;

describe('toPrimaryNavigation', () => {
  it('leads with Home at the root node path', () => {
    const items = toPrimaryNavigation(
      node('/es', { children: [node('/es/blogs')] })
    );
    assert.equal(items[0].path, '/es');
    assert.equal(items[0].home, true);
    assert.equal(items[1].path, '/es/blogs');
    assert.equal(items[1].home, undefined);
  });
});
