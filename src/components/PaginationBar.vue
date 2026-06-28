<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  total: number
  itemsPerPage: number
  currentPage: number
  allParamsUri: string
  paginatedResults: boolean
}>()

const emit = defineEmits<{
  (e: 'update:currentPage', page: number): void
  (e: 'navigate', page: number): void
}>()

const pageModel = computed({
  get: () => props.currentPage,
  set: (value: number) => emit('update:currentPage', value),
})

function navigate(page: number): void {
  emit('navigate', page)
}
</script>

<template>
  <div :class="'pages ' + paginatedResults">
    <vue-awesome-paginate
      :totalItems="total"
      :itemsPerPage="itemsPerPage"
      :maxPagesShown="5"
      v-model="pageModel"
      @click="navigate"
      type="link"
      :linkUrl="'/search?page=[page]&' + allParamsUri"
    />
  </div>
</template>
