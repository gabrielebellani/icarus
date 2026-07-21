<script setup lang="ts">
// FlightCard is now a thin alias for FlightTracking.
// Import FlightTracking directly for new code.
import FlightTracking from './FlightTracking.vue'
import type { Flight } from '@/types/flight'

defineProps<{ flight: Flight }>()
defineEmits<{ stopTracking: [] }>()
</script>

<template>
  <FlightTracking v-bind="$props" v-on="$emit" />
</template>
