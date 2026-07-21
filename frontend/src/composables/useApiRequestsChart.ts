import { ref, computed } from 'vue'
import { fetchApiRequests } from '@/api/preferences'
import { HttpError } from '@/api/client'
import type { ApiRequestsDay } from '@/types/preferences'

export type QuickRange = 'today' | 'yesterday' | '7d' | '30d' | '60d' | 'custom'

export const QUICK_RANGES: { value: QuickRange; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '60d', label: 'Last 60 days' },
]

type Status = 'loading' | 'ready' | 'error'

/** Formats a Date as a local YYYY-MM-DD key (avoids UTC off-by-one issues). */
function toDateKey(d: Date): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function daysAgo(n: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d
}

function computeQuickRange(range: Exclude<QuickRange, 'custom'>): { from: string; to: string } {
  switch (range) {
    case 'today':
      return { from: toDateKey(new Date()), to: toDateKey(new Date()) }
    case 'yesterday':
      return { from: toDateKey(daysAgo(1)), to: toDateKey(daysAgo(1)) }
    case '7d':
      return { from: toDateKey(daysAgo(6)), to: toDateKey(new Date()) }
    case '30d':
      return { from: toDateKey(daysAgo(29)), to: toDateKey(new Date()) }
    case '60d':
      return { from: toDateKey(daysAgo(59)), to: toDateKey(new Date()) }
  }
}

export function useApiRequestsChart() {
  const range = ref<QuickRange>('7d')
  const customFrom = ref(toDateKey(daysAgo(6)))
  const customTo = ref(toDateKey(new Date()))

  const status = ref<Status>('loading')
  const errorMessage = ref<string | null>(null)
  const days = ref<ApiRequestsDay[]>([])

  const activeFrom = computed(() =>
    range.value === 'custom' ? customFrom.value : computeQuickRange(range.value).from,
  )
  const activeTo = computed(() =>
    range.value === 'custom' ? customTo.value : computeQuickRange(range.value).to,
  )

  async function load() {
    status.value = 'loading'
    errorMessage.value = null

    const from = activeFrom.value
    const to = activeTo.value

    if (from > to) {
      errorMessage.value = 'The start date must be before the end date.'
      status.value = 'error'
      return
    }

    try {
      const data = await fetchApiRequests(from, to)
      days.value = Object.values(data).sort((a, b) => a.date.localeCompare(b.date))
      status.value = 'ready'
    } catch (err) {
      errorMessage.value =
        err instanceof HttpError ? 'Failed to load API usage data.' : 'Network error while loading API usage data.'
      status.value = 'error'
    }
  }

  function selectQuickRange(value: QuickRange) {
    if (value === range.value) return
    range.value = value
    if (value !== 'custom') load()
  }

  function applyCustomRange(from: string, to: string) {
    customFrom.value = from
    customTo.value = to
    range.value = 'custom'
    load()
  }

  return {
    range,
    customFrom,
    customTo,
    status,
    errorMessage,
    days,
    load,
    selectQuickRange,
    applyCustomRange,
  }
}
