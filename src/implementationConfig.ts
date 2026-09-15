import type { LocationQueryRaw, LocationQueryValue } from 'vue-router'

export const debug = true

// Production API: https://search.darwinproject.ac.uk
export const api_url: string = 'https://search.darwinproject.ac.uk'

// Control params kept out of the filter set (sort via the sort form, tc via the core path)
export const non_filtering_keys = ['tc', 'sort']

export const params_to_remove: string[] = [
  'start',
  'page',
  'tab',
  'smode',
  'text-exclude',
]

export type Facet = {
  name: string
  count: number
  alias?: string
  subfacet?: Record<string, Facet>
}

// Displayed in this order
export const desired_facets: string[] = [
  'f1-document-type',
  'f1-author',
  'f1-addressee',
  'f1-correspondent',
  'f1-year',
  's-commentary',
  's-key-stage',
  's-ages',
  's-topics',
]

//   alias    -- url param name used for a facet that owns a hierarchy (all its
//               subfacets share it); Darwin dates are selected via `f1-date`.
//   subfacet -- nested bucket levels (year -> year-month -> year-month-day).
export const facet_key: Record<string, Facet> = {
  'f1-document-type': { name: 'Document type', count: 5 },
  'f1-author': { name: 'Author', count: 5 },
  'f1-addressee': { name: 'Addressee', count: 5 },
  'f1-correspondent': { name: 'Correspondent', count: 5 },
  'f1-year': {
    name: 'Date',
    count: 999,
    alias: 'f1-date',
    subfacet: {
      'f1-year-month': {
        name: 'Date',
        count: 999,
        subfacet: {
          'f1-year-month-day': { name: 'Date', count: 999 },
        },
      },
    },
  },
  's-commentary': { name: 'Commentary', count: 5 },
  's-key-stage': { name: 'Key Stage', count: 5 },
  's-ages': { name: 'Learning Band', count: 5 },
  's-topics': { name: 'Topics', count: 5 },
}

// Facets whose value list can be expanded ("more"/"less")
export const expandable: string[] = ['author', 'addressee', 'correspondent']

export const advanced_params = [
  'text',
  'sectionType',
  'search-addressee',
  'search-author',
  'search-correspondent',
  'year',
  'month',
  'day',
  'year-max',
  'month-max',
  'day-max',
  'search-date-type',
  'exclude-widedate',
  'search-repository',
  'exclude-cancelled',
]

export const advanced_default_value_params = [
  'search-date-type',
  'exclude-widedate',
  'exclude-cancelled',
]

export const section_type_options = [
  { value: '', label: 'Keyword' },
  { value: 'transcribed', label: 'Transcriptions' },
  { value: 'footnote', label: 'Footnotes' },
  { value: 'summary', label: 'Summaries' },
]

export const correspondent_role_options = [
  { value: 'search-correspondent', label: 'To & from' },
  { value: 'search-author', label: 'From' },
  { value: 'search-addressee', label: 'To' },
]

export const date_type_options = [
  { value: 'on', label: 'On' },
  { value: 'before', label: 'Before' },
  { value: 'after', label: 'After' },
  { value: 'between', label: 'Between' },
]

// Standardise XTF-style fN- facet numbering to f1-
export const _tidy_facet_paramname = (key: string): string =>
  key.replace(/^f\d+-/, 'f1-')

// search-date-type defaults to 'on' in advanced search but is only meaningful
// when a temporal param is set.
export const _remove_unused_params = (
  params: Array<{ key: string; value: string }>,
): Array<{ key: string; value: string }> => {
  let newParams = [...params]
  if (
    !['year', 'month', 'day'].some(k =>
      newParams.some(item => item.key === k),
    )
  ) {
    newParams = newParams.filter(item => item.key !== 'search-date-type')
  }
  return newParams
}

export function tab_active(name: string, core: string): boolean {
  return (
    (name == 'this-site' && core == 'pages') ||
    (name == 'cudl-results' && core != 'pages')
  )
}

export function tab_class(name: string, core: string) {
  const active_class = tab_active(name, core) ? 'active' : null
  return [name, active_class].join(' ')
}

// Only `keyword` carries across a core switch: the cores have disjoint facet sets.
export function tab_query(
  name: string,
  keyword: LocationQueryValue | LocationQueryValue[] | null,
): LocationQueryRaw {
  const params: LocationQueryRaw = { keyword, page: 1 }
  if (name === 'this-site') params.tc = 'pages'
  return params
}
