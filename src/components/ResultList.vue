<script lang="ts" setup>
import { ref, computed, onBeforeMount } from 'vue'
import { useRouter, useRoute, stringifyQuery } from 'vue-router'
import ResultItem from '@/components/ResultItem.vue'
import FacetBlock from '@/components/FacetBlock.vue'
import NoResults from '@/components/NoResults.vue'
import PaginationBar from '@/components/PaginationBar.vue'
import CamplPageHeader from '@/components/campl-page-header.vue'
import 'vue-awesome-paginate/dist/style.css'
import { CSpinner } from '@coreui/vue'
import {
  api_url,
  desired_facets,
  facet_key,
  advanced_params,
  non_filtering_keys,
  tab_class,
  tab_href,
} from '@/implementationConfig'
import {
  build_all_params,
  cancel_link,
  _facet_display_name,
  _query_param_sort,
  _params_to_query_structure,
  _tracer_bullet,
} from '@/lib/utils'

const router = useRouter()
const route = useRoute()
const commits = ref(<any[]>[])
const facets = ref(<any>{})
const core = computed(() => {
  const tc = 'tc' in route.query && route.query['tc'] ? route.query['tc'] : ''
  return tc == 'pages' ? 'pages' : 'items'
})
const is_loading = ref(true)
const is_error = ref(<any>{'bool': false, message: ""})

const items_per_page = 20

function get_current_page(): number {
  let result: number = 1
  if ('page' in route.query && /^\d+$/.test(String(route.query['page']))) {
    result = Number(route.query['page'])
  }
  return result
}

const currentPage = ref(get_current_page())

let total = ref(0)

const all_params = computed<{ key: string; value: string }[]>(() =>
  build_all_params(route.query),
)

const facets_key = computed(() => _params_to_query_structure(all_params.value))

const fullpath_uriencoded = computed(() => encodeURIComponent(route.fullPath))

const all_params_uri = computed(() =>
  all_params.value
    .map(p => p.key + '=' + encodeURIComponent(String(p.value)))
    .join('&'),
)

const filtering_params = computed(() =>
  all_params.value.filter(p => !non_filtering_keys.includes(p.key)),
)

const get_facet_header = (key: string): string => _facet_display_name(key) ?? key

// Query-summary pills: the filtering params minus the (non-filter) expand control,
// sorted by facet (search terms first), then by value.
const summary_params = computed(() =>
  filtering_params.value
    .filter(p => p.key !== 'expand')
    .sort((a, b) => {
      const byKey = _query_param_sort(a.key).localeCompare(_query_param_sort(b.key))
      return byKey !== 0 ? byKey : a.value.localeCompare(b.value)
    }),
)

const keyword_values = computed(() =>
  all_params.value
    .filter(p => p.key === 'keyword')
    .map(p => p.value)
    .join(' '),
)

const sort = computed(() => {
  return 'sort' in route.query ? route.query['sort'] : 'score'
})

const keyword = computed(() => {
  return 'keyword' in route.query ? route.query['keyword'] : null
})

const advanced_query_string = computed(() => {
  const params: any = {}
  all_params.value
    .filter(p => advanced_params.includes(p.key))
    .forEach(p => {
      if (params[p.key]) {
        params[p.key].push(p.value)
      } else {
        params[p.key] = [p.value]
      }
    })

  return stringifyQuery(params)
})

const paginated_results = computed(() => total.value >= items_per_page )

function throw_error(error: any) {
  is_error.value['bool'] = true
  is_error.value['message'] = error
  is_loading.value = false
  console.log(error)
}

const updateURL = async (page: number): Promise<void> => {
  _tracer_bullet('Moving to page ' + page)

  await router.push({
    name: 'search',
    query: { ...route.query, page: page },
  })
}

async function fetchData(start: number) {
  commits.value = []
  const request_params = filtering_params.value.map(
    p => p.key + '=' + encodeURIComponent(String(p.value)),
  )
  if (start) {
    request_params.push('page=' + start)
  }
  if (sort.value) {
    request_params.push('sort=' + sort.value)
  }
  const url = api_url + '/' + core.value + '?' + request_params.join('&')
  _tracer_bullet('Trying ' + url)
  const nq = await fetch(url, {
    method: 'get',
    mode: 'cors',
    credentials: 'include'})
    .then(response => {
      if (response.ok) {
        return response.json()
      }
      throw new Error('Invalid response')
    })
    .then(responseJson => {
      //console.log(responseJson)
      for (let i = 0; i < responseJson['response']['docs'].length; i++) {
        const id = responseJson['response']['docs'][i].id
        const highlights =
          id in responseJson['highlighting']
            ? responseJson['highlighting'][id]
            : { _text_: [] }
        responseJson['response']['docs'][i]['highlighting'] = [
          ...new Set(
            Object.values(highlights)
              .flat(1)
              .filter(n => n),
          ),
        ]
      }
      return responseJson
    })
    .catch(error => {
      throw_error(error)
    })
  if (!is_error.value['bool'] && nq['response']) {
  commits.value = nq['response']['docs']
  total.value = nq['response']['numFound']
  const facets_cleaned: any = {}
  for (const key of desired_facets) {
    const facet_details = Object.entries(
      nq['facet_counts']['facet_fields'],
    ) as [string, Array<unknown>][]
    for (const [facet_name, facet_pairs] of facet_details) {
      facets.value[facet_name] = { buckets: [] }
      const buckets = []
      for (let i = 0; i < facet_pairs.length; i += 2) {
        const pair = facet_pairs.slice(i, i + 2)
        buckets.push({ val: pair[0], count: pair[1] })
      }
      facets_cleaned[facet_name] = buckets
    }
  }
  facets.value = facets_cleaned
}
  else {
    // The fetch result wasn't json with a 'response' property
    const msg = (is_error.value['message']) ? is_error.value['message'] : 'Error: Invalid response data'
    throw_error(msg)
  }
}

onBeforeMount(async () => {
  //console.log('Before')
  window.scrollTo(0, 0)
  await fetchData(currentPage.value).then(() => {
    is_loading.value = false
  })
})
</script>

<template>
  <campl-page-header :keyword="keyword_values" :key="keyword_values" />
  <div class="campl-row campl-content campl-recessed-content dcpNew">
    <div class="campl-wrap clearfix">
      <div
        class="campl-column9 campl-main-content"
        id="page-content"
        style="min-height: 100vh"
      >
        <div class="region region-content">
          <div
            id="block-darwin-sharing-darwin-sharing-add"
            class="block block-darwin-sharing campl-content-container"
          >
            <div>
              <div class="social-media-share">
                <a
                  class="icon-sm darwin-facebook"
                  :href="
                    'https://www.facebook.com/sharer/sharer.php?u=https%3A%2F%2Fwww.darwinproject.ac.uk' +
                    fullpath_uriencoded
                  "
                  title="Share on Facebook"
                  target="_blank"
                  ><i class="fab fa-facebook-f" aria-hidden="true"></i
                ></a>
                <a
                  class="icon-sm darwin-twitter"
                  :href="
                    'https://twitter.com/intent/tweet?text=Search+results&amp;url=https%3A%2F%2Fwww.darwinproject.ac.uk' +
                    fullpath_uriencoded
                  "
                  title="Share on Twitter"
                  target="_blank"
                  ><i class="fab fa-twitter" aria-hidden="true"></i
                ></a>
                <a
                  class="icon-sm darwin-email"
                  :href="
                    'mailto:?&amp;subject=Search results&amp;body=https%3A%2F%2Fwww.darwinproject.ac.uk' +
                    fullpath_uriencoded
                  "
                  title="Share by email"
                  ><i class="fas fa-envelope" aria-hidden="true"></i
                ></a>
              </div>
              <!-- end social media sharing -->
            </div>
          </div>
          <div id="block-system-main" class="block block-system">
            <div class="darwin-search-results" v-show="is_loading">
              <CSpinner />
            </div>
            <div class="darwin-search-results" v-if="is_error['bool']">
              <p>I'm sorry, I'm unable to complete your request ({{is_error['message']}})</p>
              <p>Please try again in a few minutes</p>
            </div>
            <div v-show="!is_loading && !is_error['bool']">
              <div class="campl-content-container" :key="route.fullPath">
                <ul class="tab-menu">
                  <li>
                    <a
                      :href="tab_href('cudl-results', core, keyword)"
                      :class="tab_class('cudl-results', core)"
                      >Letters, people &amp; references</a
                    >
                  </li>
                  <li>
                    <a
                      :href="tab_href('this-site', core, keyword)"
                      :class="tab_class('this-site', core)"
                      >Articles</a
                    >
                  </li>
                </ul>
                <div class="darwin-search-results-container">
                  <div class="search-results-page">
                    <div class="darwin-search-results">
                      <div
                        class="cudl-results search-results-list"
                        style="display: block"
                      >
                        <div class="resultsHeader">
                          <div class="query">
                            <div class="label">
                              <b>Search:</b>
                            </div>
                            <div class="subQuery">
                              <span
                                class="option"
                                v-for="o in summary_params"
                                :key="JSON.stringify(o)"
                              >
                                <span class="subhit">{{ o.value }}</span>
                                in <b>{{ get_facet_header(o.key) }}</b
                                >&nbsp;<router-link
                                  :to="{
                                    name: 'search',
                                    query: cancel_link(o.key, o.value, all_params),
                                  }"
                                  ><span class="material-icons"
                                    >disabled_by_default</span
                                  ></router-link
                                ><br />
                              </span>
                              <p
                                class="modify_advanced"
                                v-if="advanced_query_string.length > 0"
                              >
                                <a
                                  :href="
                                    '/advanced-search?' + advanced_query_string
                                  "
                                  >Modify search</a
                                >
                              </p>
                            </div>
                          </div>
                          <div class="num_items" v-show="total >= 1">
                            <span id="itemCount">{{ total }}</span> Item{{
                              total != 1 ? 's' : ''
                            }}
                          </div>
                          <div v-if="total >= 1">
                            <div class="sort_by" v-if="core != 'pages'">
                              <form method="get" action="/search">
                                <b>Sorted by:&nbsp;</b>
                                <select size="1" name="sort">
                                  {{
                                    sort
                                  }}
                                  <option
                                    value="score"
                                    :selected="sort == 'score'"
                                  >
                                    relevance
                                  </option>
                                  <option
                                    value="author"
                                    :selected="sort == 'author'"
                                  >
                                    author
                                  </option>
                                  <option
                                    value="addressee"
                                    :selected="sort == 'addressee'"
                                  >
                                    addressee
                                  </option>
                                  <option
                                    value="date"
                                    :selected="sort == 'date'"
                                  >
                                    date
                                  </option>
                                </select>
                                <input
                                  v-for="p in filtering_params"
                                  type="hidden"
                                  :name="p.key"
                                  :value="p.value"
                                  :key="p.key + p.value"
                                />
                                <input type="hidden" name="page" value="1" />
                                <input type="hidden" name="tab" value="" />
                                <input type="hidden" name="tc" :value="core" />
                                &nbsp;<input type="submit" value="Go!" />
                              </form>
                            </div>
                            <PaginationBar
                              :total="total"
                              :items-per-page="items_per_page"
                              v-model:current-page="currentPage"
                              :all-params-uri="all_params_uri"
                              :paginated-results="paginated_results"
                              @navigate="updateURL"
                            />
                          </div>
                          <NoResults
                            v-else-if="total == 0"
                            :keyword="keyword_values"
                          />
                        </div>
                        <ResultItem
                          v-for="(item, index) in commits"
                          :item="item"
                          :currentPage="currentPage"
                          :index="index"
                          :key="JSON.stringify(item)"
                        />
                        <PaginationBar
                          :total="total"
                          :items-per-page="items_per_page"
                          v-model:current-page="currentPage"
                          :all-params-uri="all_params_uri"
                          :paginated-results="paginated_results"
                          @navigate="updateURL"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <!-- facets -->

      <div class="campl-column3 campl-secondary-content" id="page-secondary">
        <div class="region-sidebar">
          <div class="srch-sidebar"></div>
          <div class="view-my-sidebar">
            <div class="field-content">
              <h3>Refine your search</h3>
              <div class="cudl-results sidebar-results-list">
                <div class="facet">
                  <facet-block
                    v-for="facet in desired_facets"
                    :desired_facet="facet"
                    :params="all_params"
                    v-bind:facets="facets"
                    v-bind:facet_key="facet_key"
                    :key="facets_key + '::' + facet"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
#app {
  min-height: 100vh;
}

.social-media-share a {
  color: white;
  display: inline-block;
}

.social-media-share a svg {
  color: white;
  vertical-align: text-top;
}

.dcpNew .bibliography .item-title {
  font-style: inherit;
}

.dcpNew em.match {
  color: rgb(42, 127, 189);
  font-weight: bold;
  font-style: inherit;
}

.dcpNew .search-results-page .search-result-item .snippets li {
  padding-top: 0.5em;
  padding-bottom: 0.5em;
}

/*.dcpNew .snippets {
  max-height: 6em;
}*/

.dcpNew .search-results-page .search-result-item .main-icon {
  line-height: 1.75;
}

.dcpNew span.doubleUnderline,
.dcpNew div.doubleUnderline {
  font-weight: normal;
  text-decoration-line: underline;
  text-decoration-style: double;
}

.dcpNew .pagination-container {
  display: flex;
  column-gap: 10px;
}

.dcpNew ul#componentContainer .paginate-buttons {
  font-size: 0.8em;
  height: 2em;
  width: 2em;
  border-radius: 6px;
  cursor: pointer;
  background-color: rgb(240, 240, 240);
  border: 1px solid rgb(217, 217, 217);
  color: black;
}

.dcpNew ul#componentContainer .paginate-buttons:hover {
  background-color: rgb(254, 254, 254);
  border: 1px solid rgb(200, 200, 200);
}

.dcpNew .search-results-page .pages {
  margin: 1em 0;
  font-weight: bold;
  display: flex;
  justify-content: center;
}

.dcpNew .pages ul#componentContainer {
  margin-left: 0;
}

.dcpNew ul#componentContainer a.active-page,
.dcpNew ul#componentContainer a.active-page:hover {
  cursor: default;
  background: rgb(254, 254, 254);
  border-color: rgb(200, 200, 200);
}

.dcpNew .subQuery a {
  display: inline-block;
}

.dcpNew .subQuery a .material-icons {
  display: inline-block;
  vertical-align: bottom;
  font-size: 1rem;
  color: rgb(240, 0, 0);
}

.dcpNew .resultsHeader .query {
  margin-bottom: 1.5em;
}

.dcpNew .campl-column3.campl-secondary-content {
  display: block;
  position: relative !important;
}

#page-content .modify_advanced a,
#page-content .modify_advanced a:visited {
  color: #fff;
  background-color: #4b701c;
  padding: 3px 12px;
  border-radius: 24px;
  margin-top: 10px;
  box-shadow: rgba(0, 0, 0, 0.27) 1px 1px 5px;
}

#page-content .search-results-page .search-result-item h2 a {
  color: #111;
}

/* CSS for spinner from coreui - https://github.com/coreui/coreui.
   It's compatible bootstrap 5 and loading up the full CSS disrupts the current
   fragile CSS. Once migration to bootstrap is complete, the main css file can
   be used, which will be a more robust solution.
 */

.visually-hidden,
.visually-hidden-focusable:not(:focus):not(:focus-within) {
  width: 1px !important;
  height: 1px !important;
  padding: 0 !important;
  margin: -1px !important;
  overflow: hidden !important;
  clip: rect(0, 0, 0, 0) !important;
  white-space: nowrap !important;
  border: 0 !important;
}
.visually-hidden:not(caption),
.visually-hidden-focusable:not(:focus):not(:focus-within):not(caption) {
  position: absolute !important;
}

.spinner-grow,
.spinner-border {
  display: inline-block;
  width: var(--cui-spinner-width);
  height: var(--cui-spinner-height);
  vertical-align: var(--cui-spinner-vertical-align);
  border-radius: 50%;
  animation: var(--cui-spinner-animation-speed) linear infinite
    var(--cui-spinner-animation-name);
}

@keyframes spinner-border {
  to {
    transform: rotate(360deg) /* rtl:ignore */;
  }
}
.spinner-border {
  --cui-spinner-width: 2rem;
  --cui-spinner-height: 2rem;
  --cui-spinner-vertical-align: -0.125em;
  --cui-spinner-border-width: 0.25em;
  --cui-spinner-animation-speed: 0.75s;
  --cui-spinner-animation-name: spinner-border;
  border: var(--cui-spinner-border-width) solid currentcolor;
  border-right-color: transparent;
}

.spinner-border-sm {
  --cui-spinner-width: 1rem;
  --cui-spinner-height: 1rem;
  --cui-spinner-border-width: 0.2em;
}

@keyframes spinner-grow {
  0% {
    transform: scale(0);
  }
  50% {
    opacity: 1;
    transform: none;
  }
}
.spinner-grow {
  --cui-spinner-width: 2rem;
  --cui-spinner-height: 2rem;
  --cui-spinner-vertical-align: -0.125em;
  --cui-spinner-animation-speed: 0.75s;
  --cui-spinner-animation-name: spinner-grow;
  background-color: currentcolor;
  opacity: 0;
}

.spinner-grow-sm {
  --cui-spinner-width: 1rem;
  --cui-spinner-height: 1rem;
}

@media (prefers-reduced-motion: reduce) {
  .spinner-border,
  .spinner-grow {
    --cui-spinner-animation-speed: 1.5s;
  }
}

.spinner-border {
  margin: 5em auto 0 auto;
  text-align: center;
  display: block;
}

div.pages.false .pagination-container li:has(a.back-button),
div.pages.false .pagination-container li:has(a.next-button) {
  display: none;
}
div.pages.false .pagination-container li:has(a.number-buttons) {
  display: inherit;
}

@media (max-width: 767px) {
  li:has(a.paginate-buttons.number-buttons) {
    display: none;
  }
  #page-content li:has(a.paginate-buttons.number-buttons.active-page) {
    display: inherit;
  }

  /*  li:has(a.paginate-buttons.number-buttons):nth-last-child(2), li:has(a.paginate-buttons.number-buttons):nth-child(2) {
    display: inherit;
  }*/

  .dcpNew ul#componentContainer .paginate-buttons {
    font-size: 0.7em;
    height: 1.5em;
    width: 1.5em;
    border-radius: 6px;
    cursor: pointer;
    background-color: rgb(240, 240, 240);
    border: 1px solid rgb(217, 217, 217);
    color: black;
  }

  #page-content .search-results-page .pages a {
    margin: 0 4px 0 4px;
    padding: 2px 7px;
    background-color: #f8f8f8;
    border: 1px solid #eee;
  }
}
</style>
