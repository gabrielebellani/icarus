import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import type { Ref } from 'vue'
import type { RadarAircraft } from '@/types/radar'

export interface UseAircraftCarouselOptions {
  aircraft: Ref<RadarAircraft[]>
}

export function useAircraftCarousel({ aircraft }: UseAircraftCarouselOptions) {
  const activeIndex = ref(0)
  let carouselInterval: ReturnType<typeof setInterval> | null = null

  const ROTATION_INTERVAL_MS = 6000

  function startCarousel() {
    if (carouselInterval) clearInterval(carouselInterval)

    carouselInterval = setInterval(() => {
      if (aircraft.value.length > 0) {
        activeIndex.value = (activeIndex.value + 1) % aircraft.value.length
      }
    }, ROTATION_INTERVAL_MS)
  }

  function stopCarousel() {
    if (carouselInterval) {
      clearInterval(carouselInterval)
      carouselInterval = null
    }
  }

  // When aircraft list changes (new message from WS), reset to first item and restart timer.
  watch(
    aircraft,
    () => {
      activeIndex.value = 0
      startCarousel()
    },
    { deep: false },
  )

  const currentAircraft = computed(() => {
    if (aircraft.value.length === 0) return null
    return aircraft.value[activeIndex.value] ?? null
  })

  const total = computed(() => aircraft.value.length)

  const position = computed(() => ({
    current: aircraft.value.length > 0 ? activeIndex.value + 1 : 0,
    total: aircraft.value.length,
  }))

  onMounted(() => {
    startCarousel()
  })

  onUnmounted(() => {
    stopCarousel()
  })

  return {
    activeIndex,
    currentAircraft,
    total,
    position,
    stopCarousel,
    startCarousel,
  }
}
