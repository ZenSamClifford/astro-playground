import type { Entry } from "contensis-delivery-api";


export type ContentTypeMappings<ContentTypeId extends string = string> = Record<
  ContentTypeId,
  ContentTypeMapping<any, any, any>
>;

export type ContentTypeMapping<
  ComponentProps = any,
  EntryType = Entry,
  ComponentType = any,
> = {
  component: ComponentType;
  mapper?: (entry: EntryType) => ComponentProps;
};
