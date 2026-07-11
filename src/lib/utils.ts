import { computed } from 'vue'
import type { LocationQuery, LocationQueryValue } from 'vue-router'
import * as implementation from '@/implementationConfig'
import type { Facet } from '@/implementationConfig'

/* Lookup: bucket name -> url param name. A facet with an alias (and its whole
   subfacet tree) maps to that alias; everything else maps to itself. */
const bucket_to_param_lookup = computed<Array<{ key: string; value: string }>>(() => {
  const walk = (
    facets: Record<string, Facet> = implementation.facet_key,
    topAlias?: string,
  ): Array<{ key: string; value: string }> => {
    let arr: Array<{ key: string; value: string }> = []
    for (const key in facets) {
      const facet = facets[key]
      const effectiveValue = topAlias ?? facet.alias ?? key
      arr.push({ key, value: effectiveValue })
      if (facet.subfacet) {
        arr = arr.concat(walk(facet.subfacet, topAlias ?? facet.alias))
      }
    }
    return arr
  }
  return walk()
})

/* Lookup: bucket name -> immediate child bucket name (the next level down). */
const param_to_bucket_lookup = computed<Array<{ key: string; value: string }>>(() => {
  const lookup: Array<{ key: string; value: string }> = []
  const walk = (facets: Record<string, Facet>) => {
    for (const key in facets) {
      const facet = facets[key]
      if (facet.subfacet) {
        const subKeys = Object.keys(facet.subfacet)
        if (subKeys.length > 0) {
          lookup.push({ key, value: subKeys[0] })
        }
        walk(facet.subfacet)
      }
    }
  }
  walk(implementation.facet_key)
  return lookup
})

const _bucket_to_param_name = (facetKey: string): string => {
  const found = bucket_to_param_lookup.value.find(item => item.key === facetKey)
  return found ? found.value : ''
}

function _get_subfacet_bucket_name(facetKey: string): string | null {
  const found = param_to_bucket_lookup.value.find(item => item.key === facetKey)
  return found ? found.value : null
}

/* Every descendant bucket name below a facet's subfacet tree, any depth
   (f1-year -> ['f1-year-month', 'f1-year-month-day']); [] if it has none. */
const _descendant_bucket_names = (
  facetKey: string,
  facets: Record<string, Facet> = implementation.facet_key,
): string[] => {
  const collect = (subfacet?: Record<string, Facet>): string[] =>
    subfacet
      ? Object.entries(subfacet).flatMap(([key, f]) => [key, ...collect(f.subfacet)])
      : []
  return collect(facets[facetKey]?.subfacet)
}

const _find_facet_hierarchy = (
  facetKey: string,
  facets: Record<string, Facet> = implementation.facet_key,
  path: string[] = [],
): string[] | null => {
  for (const key in facets) {
    const facet = facets[key]
    if (key === facetKey) {
      return [...path, key]
    }
    if (facet.subfacet) {
      const foundPath = _find_facet_hierarchy(facetKey, facet.subfacet, [...path, key])
      if (foundPath) return foundPath
    }
  }
  return null
}

const _is_hierarchical = (
  searchKey: string,
  facets: Record<string, Facet> = implementation.facet_key,
): boolean => {
  for (const key in facets) {
    const facet = facets[key]
    if (key === searchKey || facet.alias === searchKey) {
      return !!facet.subfacet
    }
    if (facet.subfacet && _is_hierarchical(searchKey, facet.subfacet)) {
      return true
    }
  }
  return false
}

function _params_to_query_structure(param_array: { key: string; value: string }[]) {
  const result: Record<string, string[]> = {}
  param_array.forEach((item) => {
    if (result[item.key]) {
      result[item.key].push(item.value)
    } else {
      result[item.key] = [item.value]
    }
  })
  return result
}

const cancel_link = (
  keyToRemove: string,
  valueToRemove: string,
  all_params: { key: string; value: string }[],
): Record<string, string[]> => {
  const target = valueToRemove.replace(/(^"|"$)/g, '')
  const childPrefix = `${target}::`
  const filteredArr = all_params.filter((item) => {
    const cleanValue = item.value.replace(/(^"|"$)/g, '')
    const keyMatches = item.key === keyToRemove
    const exactMatch = cleanValue === target
    const childMatch = cleanValue.startsWith(childPrefix)
    return !(keyMatches && (exactMatch || childMatch))
  })
  return _params_to_query_structure(filteredArr)
}

function _is_equal_to(variable: string | string[] | null, targetValue: string): boolean {
  return (
    (typeof variable === 'string' && variable === targetValue) ||
    (Array.isArray(variable) && variable.length === 1 && variable[0] === targetValue) ||
    (variable === null && targetValue === '')
  )
}

function _get_first_value(param: unknown): string {
  return Array.isArray(param) ? String(param[0]) : String(param)
}

/* Display name for a URL param key, resolving facet aliases (e.g. the date param
   'f1-date' is the alias of the 'f1-year' bucket → 'Date'). Returns null if the key
   is not a facet (e.g. 'keyword'). */
const _facet_display_name = (
  paramKey: string,
  facets: Record<string, Facet> = implementation.facet_key,
): string | null => {
  for (const key in facets) {
    const facet = facets[key]
    if (key === paramKey || facet.alias === paramKey) {
      return facet.name
    }
    if (facet.subfacet) {
      const found = _facet_display_name(paramKey, facet.subfacet)
      if (found) return found
    }
  }
  return null
}

/* Sort key for the query summary: facets by display name (aliases resolved), search
   terms (non-facets) prefixed so they sort first. */
function _query_param_sort(key: string): string {
  const name = _facet_display_name(key)
  return name !== null ? name : '000_' + key
}

/* Escape regex metacharacters in a facet value before it is interpolated into a
   `new RegExp(...)` (facet values such as "Asher & Co." contain `.`). */
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function toStringArray(val: LocationQueryValue | LocationQueryValue[]): string[] {
  return Array.isArray(val)
    ? val.filter((v): v is string => v !== null)
    : val !== null
      ? [val]
      : []
}

/* For a hierarchical key, materialise every ancestor of each value
   (1868::02::25 -> 1868, 1868::02, 1868::02::25), deduped and sorted. */
function add_missing_hierarchical_ancestor_values(key: string, values: string[]): string[] {
  if (!_is_hierarchical(key) || values.length === 0) {
    return [...values]
  }
  return [
    ...new Set(
      values.flatMap((d) => {
        const d_clean = d.replace(/(^"|"$)/g, '')
        return d.includes('::')
          ? d_clean.split('::').map((_, i, arr) => arr.slice(0, i + 1).join('::'))
          : [d_clean]
      }),
    ),
  ].sort()
}

/* Turn the raw route query into the flat, order-preserving param store the rest
   of the engine works from. */
function build_all_params(query: LocationQuery): { key: string; value: string }[] {
  let result: { key: string; value: string }[] = []
  for (const [key, value] of Object.entries(query)) {
    const tidiedKey = implementation._tidy_facet_paramname(key)
    const filteredValues = toStringArray(value).filter(v => v.trim().length > 0)
    if (filteredValues.length > 0) {
      add_missing_hierarchical_ancestor_values(tidiedKey, filteredValues).forEach(v =>
        result.push({ key: tidiedKey, value: v }),
      )
    }
  }
  result = result.filter(item => !implementation.params_to_remove.includes(item.key))
  result = implementation._remove_unused_params(result)
  return result
}

function filtering_params(
  all_params: { key: string; value: string }[],
): { key: string; value: string }[] {
  return all_params.filter(p => !implementation.non_filtering_keys.includes(p.key))
}

function is_advanced_active(all_params: { key: string; value: string }[]): boolean {
  const triggers = implementation.advanced_params.filter(
    p => !implementation.advanced_default_value_params.includes(p),
  )
  return all_params.some(p => triggers.includes(p.key))
}

function _tracer_bullet(msg: unknown): void {
  if (implementation.debug) {
    console.log(msg)
  }
}

export {
  _bucket_to_param_name,
  _get_subfacet_bucket_name,
  _descendant_bucket_names,
  _find_facet_hierarchy,
  _is_hierarchical,
  _params_to_query_structure,
  cancel_link,
  _is_equal_to,
  _get_first_value,
  _query_param_sort,
  _facet_display_name,
  escapeRegExp,
  build_all_params,
  filtering_params,
  is_advanced_active,
  _tracer_bullet,
}
