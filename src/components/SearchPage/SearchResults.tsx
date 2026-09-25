import type { Entry } from 'contensis-delivery-api';
import { Badge } from '~/components/ui/badge';
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from '~/components/ui/item';
import { searchTypeLabel } from './searchTypes';

/**
 * Lives in a React file rather than the Astro page because Item's `render`
 * prop needs a React element, and JSX in an .astro file is not one.
 */
const SearchResults = ({ items }: { items: Entry[] }) => (
  <ItemGroup>
    {items.map(result => (
      // The listitem role sits on a wrapper so the rendered <a> keeps its link role
      // biome-ignore lint/a11y/useSemanticElements: ItemGroup renders a div with role="list", so an <li> would be invalid here
      <div key={result.sys.id} role="listitem">
        <Item
          variant="outline"
          // biome-ignore lint/a11y/useAnchorContent: Base UI renders Item's children inside this anchor
          render={result.sys.uri ? <a href={result.sys.uri} /> : undefined}
        >
          <ItemContent>
            <ItemTitle>
              {result.entryTitle}
              <Badge variant="secondary">
                {searchTypeLabel(result.sys.contentTypeId)}
              </Badge>
            </ItemTitle>
            {result.description && (
              <ItemDescription>{result.description}</ItemDescription>
            )}
          </ItemContent>
        </Item>
      </div>
    ))}
  </ItemGroup>
);

export default SearchResults;
