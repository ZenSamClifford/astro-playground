import { useEffect, useMemo, useState } from 'react';
// import { contentLoader as contentResolver } from '~/contensis/content-loader';
import { contentResolver } from '~/contensis.config';

import type { Entry } from 'contensis-delivery-api';
/**
 * Using content loader client-side requires a lot more code
 *  - can't fire an async function so needs useEffect wrapper
 *  - needs useState to store results
 *  - content loader needs to be memoized to avoid creating a new instance on every render
 *
 * We would be better off doing the data fetching in the server-side loader and passing the
 * results to the client component as props.
 */
const ClientSearch = ({
  serverFetchedSearchResults,
  versionStatus,
}: {
  serverFetchedSearchResults?: Entry[];
  versionStatus?: string;
}) => {
  const content = useMemo(
    () => contentResolver({ versionStatus }),
    [versionStatus]
  );

  const [searchResults, setSearchResults] = useState<Entry[]>(
    serverFetchedSearchResults || []
  );

  useEffect(() => {
    if (searchResults.length > 0) return; // skip search if we already have results from server

    const performSearch = async () => {
      try {
        const { items } = await content.search(
          'sys.dataFormat=entry ORDER BY sys.version.created desc',
          {
            pageSize: 3,
          }
        );
        setSearchResults(items);
      } catch (error) {
        console.error('Search error:', error);
      }
    };

    performSearch();
  }, [content]);

  return (
    <div>
      <h2>
        {serverFetchedSearchResults ? `Server-fetched` : `Client-side`} search
        results:
      </h2>
      <p>Version status: {content.api.clientConfig.versionStatus}</p>
      <p>count: {searchResults.length}</p>
      {searchResults.length > 0 &&
        searchResults.map((item, index) => (
          <div key={index}>
            <p>
              <em>{item.sys.contentTypeId}</em>
              {item.entryTitle}
            </p>
          </div>
        ))}
    </div>
  );
};
export default ClientSearch;
