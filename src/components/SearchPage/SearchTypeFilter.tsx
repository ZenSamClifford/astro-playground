import { useRef } from 'react';
import { ToggleGroup, ToggleGroupItem } from '~/components/ui/toggle-group';
import { searchConfig } from '~/search.config';
import { allTypes, type SearchType } from './searchTypes';

const options = [{ id: allTypes, label: 'All' }, ...searchConfig.searchTypes];

/**
 * Picks the content type to search and submits the surrounding form, so a new
 * filter reloads the server-rendered results straight away. The hidden input
 * carries the value in the GET request, which keeps the current filter on a
 * term search even before this island hydrates. It has no name for All, so
 * the form and the page's own links agree on one URL: no type parameter.
 */
const SearchTypeFilter = ({ value }: { value: SearchType }) => {
  const input = useRef<HTMLInputElement>(null);

  return (
    <>
      <input
        ref={input}
        type="hidden"
        name={value === allTypes ? undefined : 'type'}
        value={value}
      />
      <ToggleGroup
        aria-label="Filter by content type"
        variant="outline"
        spacing={0}
        value={[value]}
        onValueChange={([next]) => {
          // Pressing the active option would clear the group; keep it selected
          if (!next || next === value || !input.current) return;
          input.current.value = next;
          // An input without a name is left out of the submitted form
          if (next === allTypes) input.current.removeAttribute('name');
          else input.current.name = 'type';
          input.current.form?.requestSubmit();
        }}
      >
        {options.map(option => (
          <ToggleGroupItem key={option.id} value={option.id}>
            {option.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </>
  );
};

export default SearchTypeFilter;
