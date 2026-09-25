import type { ContentTypePageProps } from '@contensis/content-resolver';
import ClientSearch from '~/components/deprecated/Search/ClientSearch';

const ContentPage = ({
  contentTypeId,
  entry,
  mappedEntry,
}: ContentTypePageProps) => {
  // const { items: searchResults } = await resolver.search(
  //   'sys.dataFormat=entry',
  //   {
  //     pageSize: 3,
  //   }
  // );
  return (
    <>
      <div>
        <h1>
          Rendered content type component: {contentTypeId} (ContentPage.tsx)
        </h1>
        <p>Mapped entry title: {mappedEntry.mappedTitle}</p>
      </div>
      {/* We cannot render the ClientSearch component client-side unless we mark the whole
           ContentPage component with a client-side directive. */}
      <ClientSearch versionStatus={entry.sys.versionStatus} />
      {/* We can use async component and do the data fetching server-side,
           then server-render the results via the ClientSearch component props. */}
      {/* <ClientSearch
        serverFetchedSearchResults={searchResults}
        versionStatus={entry.sys.versionStatus}
      /> */}
    </>
  );
};

export default ContentPage;
