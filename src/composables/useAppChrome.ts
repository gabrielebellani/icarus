import { ref } from 'vue'

// Module-level singleton: a view toggles this while it goes fullscreen so
// `AuthenticatedLayout` can hide the shared header without every fullscreen
// view needing to re-implement (or Teleport around) the header itself.
const isChromeHidden = ref(false)

export function useAppChrome() {
  return { isChromeHidden }
}
