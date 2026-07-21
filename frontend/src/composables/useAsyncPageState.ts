import { ref } from 'vue'

export type AsyncPageState = 'loading' | 'ready' | 'error'

/**
 * Shared loading/error/retry bookkeeping for views that fetch data on mount.
 *
 * Note: 401s are already handled globally by the API client (see
 * `api/client.ts` + the auth store's `bindClient`), which clears tokens and
 * redirects to the login screen before the rejection ever reaches a view.
 * Callers only need to handle the "something else went wrong" case.
 */
export function useAsyncPageState(errorMessage: string) {
  const state = ref<AsyncPageState>('loading')
  const error = ref<string | null>(null)
  let task: (() => Promise<void>) | null = null

  async function run(fn: () => Promise<void>) {
    task = fn
    state.value = 'loading'
    error.value = null
    try {
      await fn()
      state.value = 'ready'
    } catch {
      error.value = errorMessage
      state.value = 'error'
    }
  }

  function retry() {
    if (task) run(task)
  }

  return { state, error, run, retry }
}
