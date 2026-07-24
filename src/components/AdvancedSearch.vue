<script lang="ts" setup>
import { reactive, computed } from 'vue'
import { useRoute, useRouter, type LocationQueryRaw } from 'vue-router'
import {
  advanced_params,
  params_to_remove,
  section_type_options,
  correspondent_role_options,
  date_type_options,
} from '@/implementationConfig'
import { build_all_params, is_advanced_active } from '@/lib/utils'

const route = useRoute()
const router = useRouter()

const all_params = computed(() => build_all_params(route.query))

function qjoin(key: string): string {
  const v = route.query[key]
  if (Array.isArray(v)) return v.filter((x): x is string => x !== null).join(' ')
  return v ?? ''
}
function qval(key: string): string {
  const v = route.query[key]
  if (Array.isArray(v)) return v[0] ?? ''
  return v ?? ''
}

const correspondentKeys = ['search-author', 'search-addressee', 'search-correspondent']

function freshAdv() {
  return {
    text: '',
    sectionType: '',
    role: 'search-correspondent',
    name: '',
    year: '',
    month: '',
    day: '',
    yearMax: '',
    monthMax: '',
    dayMax: '',
    dateType: 'on',
    repository: '',
    excludeWide: false,
    excludeCancelled: false,
  }
}

function advFromQuery() {
  const activeCorrespondent = correspondentKeys.find(k => qval(k))
  return {
    text: qjoin('text') || qjoin('keyword'),
    sectionType: qval('sectionType'),
    role: activeCorrespondent ?? 'search-correspondent',
    name: activeCorrespondent ? qval(activeCorrespondent) : '',
    year: qval('year'),
    month: qval('month'),
    day: qval('day'),
    yearMax: qval('year-max'),
    monthMax: qval('month-max'),
    dayMax: qval('day-max'),
    dateType: qval('search-date-type') || 'on',
    repository: qval('search-repository'),
    excludeWide: qval('exclude-widedate') === 'Yes',
    excludeCancelled: qval('exclude-cancelled') === 'Yes',
  }
}

const adv = reactive(advFromQuery())

function baseQuery(): LocationQueryRaw {
  const q: LocationQueryRaw = { ...route.query }
  for (const k of params_to_remove) delete q[k]
  return q
}

function clearAdvancedParams(): void {
  const q = baseQuery()
  for (const k of advanced_params) delete q[k]
  q.page = 1
  router.push({ name: 'search', query: q })
}

function onReset(): void {
  if (is_advanced_active(all_params.value)) {
    clearAdvancedParams()
    return
  }
  Object.assign(adv, freshAdv())
}

function onSubmit(): void {
  const q = baseQuery()
  for (const k of advanced_params) delete q[k]
  delete q.keyword

  const term = adv.text.trim()
  if (term) {
    if (adv.sectionType) {
      q.text = term
      q.sectionType = adv.sectionType
    } else {
      q.keyword = term
    }
  }
  if (adv.name.trim()) q[adv.role] = adv.name.trim()

  const dates: Record<string, string> = {
    year: adv.year,
    month: adv.month,
    day: adv.day,
  }
  if (adv.dateType === 'between') {
    dates['year-max'] = adv.yearMax
    dates['month-max'] = adv.monthMax
    dates['day-max'] = adv.dayMax
  }
  let hasDate = false
  for (const [k, v] of Object.entries(dates)) {
    if (v.trim()) {
      q[k] = v.trim()
      hasDate = true
    }
  }
  if (hasDate) q['search-date-type'] = adv.dateType
  q['exclude-widedate'] = adv.excludeWide ? 'Yes' : 'No'
  q['exclude-cancelled'] = adv.excludeCancelled ? 'Yes' : 'No'
  if (adv.repository.trim()) q['search-repository'] = adv.repository.trim()
  delete q.tc

  q.page = 1
  router.push({ name: 'search', query: q })
}
</script>

<template>
  <!-- Class names mirror the original Drupal form to reuse darwin_search.css. -->
  <div id="advanced-search-forms">
    <form @submit.prevent="onSubmit">
      <p class="search-text">
        <select v-model="adv.sectionType" class="section-type">
          <option
            v-for="opt in section_type_options"
            :key="opt.value"
            :value="opt.value"
          >
            {{ opt.label }}
          </option>
        </select>
        <input
          id="text"
          name="text"
          type="text"
          placeholder="Search..."
          v-model="adv.text"
        />
      </p>

      <p class="search-correspondent">
        <select v-model="adv.role" class="correspondent-type">
          <option
            v-for="opt in correspondent_role_options"
            :key="opt.value"
            :value="opt.value"
          >
            {{ opt.label }}
          </option>
        </select>
        <input id="adv-correspondent" type="text" v-model="adv.name" />
      </p>

      <p class="search-dates">
        <select v-model="adv.dateType" class="date-type">
          <option
            v-for="opt in date_type_options"
            :key="opt.value"
            :value="opt.value"
          >
            {{ opt.label }}
          </option>
        </select>
        <span class="date-item">
          <input type="text" size="5" placeholder="yyyy" v-model="adv.year" />
        </span>
        <span class="date-item">
          <input type="text" size="3" placeholder="mm" v-model="adv.month" />
        </span>
        <span class="date-item">
          <input type="text" size="3" placeholder="dd" v-model="adv.day" />
        </span>
        <span class="between" v-if="adv.dateType === 'between'">
          <span class="ndash">&ndash;</span>
          <span class="date-item">
            <input type="text" size="5" placeholder="yyyy" v-model="adv.yearMax" />
          </span>
          <span class="date-item">
            <input type="text" size="3" placeholder="mm" v-model="adv.monthMax" />
          </span>
          <span class="date-item">
            <input type="text" size="3" placeholder="dd" v-model="adv.dayMax" />
          </span>
        </span>
      </p>

      <p class="repository">
        <label for="adv-repository">Repository</label>
        <input id="adv-repository" type="text" v-model="adv.repository" />
      </p>

      <p class="search-exclude">
        <label>
          <input type="checkbox" v-model="adv.excludeWide" />
          Exclude letters with a date range over two years
        </label>
        <label>
          <input type="checkbox" v-model="adv.excludeCancelled" />
          Exclude cancelled letters
        </label>
      </p>

      <p class="search-submit">
        <button type="button" class="form-reset" @click="onReset">Reset</button>
        <button type="submit" class="form-submit">Search</button>
      </p>
    </form>
  </div>
</template>

<style>
#page-secondary #advanced-search-forms {
  margin: 0;
  padding: 0;
}
#page-secondary #advanced-search-forms form {
  background: inherit;
  border: none;
  padding: 0;
  overflow: hidden;
}
#page-secondary #advanced-search-forms form p {
  font-size: 12px;
  margin: 0 0 0.6em;
  padding: 0;
  clear: both;
  overflow: visible;
}
#page-secondary #advanced-search-forms form p:last-of-type {
  float: none;
  margin-bottom: 0;
}
#page-secondary #advanced-search-forms form p label {
  font-weight: normal;
  font-size: 1em;
  line-height: 1.3;
}
#page-secondary #advanced-search-forms form input[type='text'],
#page-secondary #advanced-search-forms form select {
  font-size: inherit;
}

/* label/dropdown on the same line as its field(s) */
#page-secondary #advanced-search-forms form p.search-text,
#page-secondary #advanced-search-forms form p.search-correspondent,
#page-secondary #advanced-search-forms form p.repository,
#page-secondary #advanced-search-forms form p.search-dates {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.4em;
}
#page-secondary #advanced-search-forms form p.search-text input[type='text'],
#page-secondary #advanced-search-forms form p.search-correspondent input[type='text'],
#page-secondary #advanced-search-forms form p.repository input[type='text'] {
  flex: 1 1 auto;
  min-width: 0;
  width: auto;
  margin: 0;
  box-sizing: border-box;
  height: 28px;
}
#page-secondary #advanced-search-forms form p.repository label {
  flex: 0 0 10em;
  width: 10em;
  box-sizing: border-box;
  margin: 0;
  padding: 0;
  font-weight: bold;
  text-align: left;
}

#page-secondary #advanced-search-forms form select.section-type,
#page-secondary #advanced-search-forms form select.correspondent-type,
#page-secondary #advanced-search-forms form select.date-type {
  flex: 0 0 10em;
  width: 10em;
  box-sizing: border-box;
  margin: 0;
  font: inherit;
}

#page-secondary #advanced-search-forms form p.search-exclude {
  padding-left: 0;
}
#page-secondary #advanced-search-forms form p.search-exclude label {
  display: block;
  padding: 0.1em 0;
}

#page-secondary #advanced-search-forms form p.search-dates {
  column-gap: 0.25em;
}
#page-secondary #advanced-search-forms form p.search-dates span.date-item {
  display: inline-block;
}
#page-secondary #advanced-search-forms form p.search-dates span.date-item input[type='text'] {
  display: block;
  margin: 0;
  text-align: center;
  box-sizing: border-box;
  height: 28px
}
#page-secondary #advanced-search-forms form p.search-dates input[size='5'] {
  width: 3.4em;
}
#page-secondary #advanced-search-forms form p.search-dates input[size='3'] {
  width: 2.4em;
}
#page-secondary #advanced-search-forms form p.search-dates span.between {
  display: inline-flex;
  align-items: center;
  gap: 0.25em;
}
#page-secondary #advanced-search-forms form p.search-dates span.ndash {
  display: inline-block;
  padding: 0 0.2em;
}

#page-secondary #advanced-search-forms form p.search-submit {
  margin-top: 0.2em;
  text-align: right;
}
#page-secondary #advanced-search-forms form p.search-submit button {
  font: inherit;
  padding: 0.4em 1.1em;
  margin: 0 0 0 0.5em;
  border: none;
  color: #fff;
  font-weight: bold;
  cursor: pointer;
}
#page-secondary #advanced-search-forms form p.search-submit button.form-submit {
  background-color: #355918;
}
#page-secondary #advanced-search-forms form p.search-submit button.form-submit:hover {
  background-color: #4b701c;
}
#page-secondary #advanced-search-forms form p.search-submit button.form-reset {
  background-color: #515c48;
}
#page-secondary #advanced-search-forms form p.search-submit button.form-reset:hover {
  background-color: #4b701c;
}

.refine {background-color: #f7f5f0; margin-bottom: 2rem;}
</style>
