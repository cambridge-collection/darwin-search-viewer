<script lang="ts" setup>
import { ref } from 'vue'
import { useRoute, useRouter, type LocationQueryRaw } from 'vue-router'
import { advanced_params, params_to_remove } from '@/implementationConfig'

const route = useRoute()
const router = useRouter()

const term = ref('')

function onSubmit(): void {
  const q: LocationQueryRaw = { ...route.query }
  for (const k of params_to_remove) delete q[k]
  for (const k of advanced_params) delete q[k]
  delete q.keyword

  const text = term.value.trim()
  if (text) q.keyword = text

  q.page = 1
  router.push({ name: 'search', query: q })
}
</script>

<template>
  <div id="block-darwin-search-darwin-search" class="block block-darwin-search">
    <div class="campl-column9">
      <span>
        <form
          @submit.prevent="onSubmit"
          accept-charset="UTF-8"
          id="darwin-search-block-form"
          name="darwin-search-block-form"
        >
          <div>
            <input
              v-model="term"
              placeholder="Search over 15000 letters and articles..."
              name="text"
              type="text"
              class="form-text"
            />
            <input type="submit" value="Search" class="form-submit" />
          </div>
        </form>
      </span>
    </div>
  </div>
</template>
