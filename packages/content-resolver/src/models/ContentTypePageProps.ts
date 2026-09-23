import type {
  Client as DeliveryApiClient,
  Entry,
  Node as SiteViewNode,
} from 'contensis-delivery-api';
import type { ContentResolver } from './index.js';

// Props are passed to the consumer component
export type ContentTypePageProps<
  MappedEntry extends { [key: string]: any } = { [key: string]: any },
  EntryType extends Entry = Entry,
> = {
  resolver: ContentResolver;
} & Required<ContentTypePageData<MappedEntry, EntryType>>;

// Data is collected in the RouteLoader and passed to the component as props
export type ContentTypePageData<
  MappedEntry extends { [key: string]: any } = { [key: string]: any },
  EntryType extends Entry = Entry,
> = {
  api: DeliveryApiClient;
  contentTypeId?: string;
  entry?: EntryType;
  isPageNotFound?: boolean;
  node?: SiteViewNode;
  mappedEntry?: MappedEntry;
};

// WithComponent is used internally in the RouteLoader to render the component
export type ContentTypePageWithComponent<
  MappedEntry extends { [key: string]: any } = { [key: string]: any },
  EntryType extends Entry = Entry,
> = ContentTypePageData<MappedEntry, EntryType> & {
  component: any;
  getSurrogateKeys?: () => string[];
};
