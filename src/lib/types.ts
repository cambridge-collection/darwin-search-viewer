// Shape of a single search result document returned by the API. Fields are the
// subset consumed by the UI; the index signature covers the rest of the Solr doc.
export interface SearchDoc {
  highlighting: string[]
  path: string
  title: string
  displayDate: string
  'facet-document-type': string
  'document-id': string
  'search-classmark': string
  'search-author': string[]
  'search-addressee': string[]
  'og_image.content': string
  'og_image_alt.content': string
  'content.summary': string
  'content_bibl-citation': string
  'content_summary': string
  'preview-tile': string
  [key: string]: unknown
}
