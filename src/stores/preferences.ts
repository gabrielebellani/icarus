import { defineStore } from 'pinia'
import { ref } from 'vue'
import { fetchPreferences } from '@/api/preferences'
import type { Preference } from '@/types/preferences'

export const usePreferencesStore = defineStore('preferences', () => {
  const preferences = ref<Preference[]>([])
  // True once fetched for this page session; reset to false on every page reload.
  const loaded = ref(false)

  async function load(): Promise<void> {
    if (loaded.value) return
    try {
      preferences.value = await fetchPreferences()
    } catch {
      // On failure keep an empty array.
    } finally {
      loaded.value = true
    }
  }

  function updatePreference(key: string, value: unknown): void {
    const existing = preferences.value.find((p) => p.key === key)
    if (existing) {
      existing.value = value
    }
  }

  return {
    preferences,
    loaded,
    load,
    updatePreference,
  }
})
