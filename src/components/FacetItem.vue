<script lang="ts" setup>
import { computed } from 'vue'
import {
  _bucket_to_param_name,
  _get_subfacet_bucket_name,
  _params_to_query_structure,
  cancel_link as build_cancel_link,
  escapeRegExp,
} from '@/lib/utils'

const props = defineProps({
  facet: {
    type: Object as () => { val: string; count: number },
    required: true,
  },
  param_name: { type: String, required: true },
  params: {
    type: Array as () => { key: string; value: string }[],
    required: true,
  },
  subfacets: { type: Object, required: true },
  is_subgroup: { type: Boolean, required: true },
})

const facet_name = computed(() => _bucket_to_param_name(props.param_name))

const current_selections = computed<string[]>(() =>
  props.params.filter(p => p.key === facet_name.value).map(p => p.value),
)

function is_selected(value: string): boolean {
  const re = new RegExp('^' + escapeRegExp(value) + '::')
  return current_selections.value.some(e => {
    const para_val = String(e).replaceAll(/^"(.+?)"$/g, '$1')
    return para_val == value || re.test(para_val)
  })
}

const url_reset_page = computed<Record<string, string[]>>(() => {
  const param_array = [...props.params]
  param_array.push({ key: facet_name.value, value: '"' + props.facet.val + '"' })
  const result = _params_to_query_structure(param_array)
  result['page'] = ['1']
  return result
})

const cancel_link = computed(() =>
  build_cancel_link(facet_name.value, props.facet.val, props.params),
)

const subgroupName = computed(() => _get_subfacet_bucket_name(props.param_name))

const get_subgroup = computed(() => {
  const tidied_val = props.facet.val.replaceAll(/^"(.+?)"$/g, '')
  const val_pattern = new RegExp('^' + tidied_val + '::')
  let result: { val: string; count: number }[] = []
  if (subgroupName.value && subgroupName.value in props.subfacets) {
    result = (
      props.subfacets[subgroupName.value] as { val: string; count: number }[]
    ).filter(subfacet => val_pattern.test(subfacet.val))
  }
  return result
})

const name = computed(() => {
  let value = props.facet.val.split('::').slice(-1)[0]
  if (
    props.param_name == 'f1-year-month' &&
    /^(0[1-9]|1[0,1,2])$/.test(value)
  ) {
    const date = new Date(2009, parseInt(value) - 1, 10) // 2009-11-10
    value = date.toLocaleString('default', { month: 'long' })
  }
  return value
})
</script>

<template>
  <tr>
    <td class="col2">
      <span v-if="is_selected(props.facet.val)">{{ name }}</span>
      <router-link :to="{ name: 'search', query: url_reset_page }" v-else>
        {{ name }}
      </router-link>
    </td>
    <td class="col3">
      <router-link
        :to="{ name: 'search', query: cancel_link }"
        v-if="is_selected(props.facet.val)"
      >
        <span class="material-icons">disabled_by_default</span>
      </router-link>
      <span v-else>({{ props.facet.count }})</span>
    </td>
  </tr>
  <tr v-if="is_selected(props.facet.val) && subgroupName">
    <td colspan="2">
      <div
        class="facetSubGroup"
        v-if="is_selected(props.facet.val) && subgroupName"
      >
        <table>
          <tbody>
            <facetItem
              v-for="sub in get_subgroup"
              :facet="sub"
              :param_name="subgroupName"
              :params="params"
              :subfacets="subfacets"
              v-bind:is_subgroup="true"
              :key="JSON.stringify(sub)"
            />
          </tbody>
        </table>
      </div>
    </td>
  </tr>
</template>

<style scoped>
.dcpNew .facet table tr:nth-child(2n) {
  background-color: rgba(255, 255, 255, 0.8);
}

.dcpNew .facet table td {
  background-color: transparent;
}

.dcpNew .facet table td.col2 {
  padding-left: 5px;
}

.dcpNew .facet table td.col3 {
  text-align: right;
  padding-right: 5px;
}

.dcpNew .facet table td a {
  color: #506436;
}

.dcpNew .facet .material-icons {
  font-size: 1rem;
  vertical-align: bottom;
}

.dcpNew .facet tbody {
  border-top: none !important;
}

.dcpNew .facet table {
  border: none !important;
  border-collapse: collapse;
}
.dcpNew .facet .facetGroup .facetSubGroup table {
  width: 100%;
  border-top: none;
}
.dcpNew .facet .facetGroup .facetSubGroup {
  padding-left: 1em;
}
</style>
