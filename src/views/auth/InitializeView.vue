<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { z } from 'zod'
import { initializeUser } from '@/api/auth'
import { HttpError } from '@/api/client'
import AuthLayout from './AuthLayout.vue'
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const router = useRouter()

const errorMessage = ref<string | null>(null)
const isSubmitting = ref(false)

const DISPLAY_MODES = [
  { value: 'minimal', label: 'Minimal' },
  { value: 'detailed', label: 'Detailed' },
  { value: 'flight', label: 'Flight' },
  { value: 'airport', label: 'Airport' },
] as const

const schema = toTypedSchema(
  z.object({
    display_mode: z.enum(['minimal', 'detailed', 'flight', 'airport']),
    flightawareApiKey: z.string().optional(),
    openSkyNetworkKey: z.string().optional(),
  }),
)

const { handleSubmit } = useForm({
  validationSchema: schema,
  initialValues: {
    display_mode: 'minimal',
  },
})

const onSubmit = handleSubmit(async (values) => {
  errorMessage.value = null
  isSubmitting.value = true

  const payload = {
    openSkyNetworkKey: values.openSkyNetworkKey ?? '',
    flightawareApiKey: values.flightawareApiKey ?? '',
    display_mode: values.display_mode,
  }

  try {
    await initializeUser(payload)
    router.push({ name: 'dashboard' })
  } catch (err) {
    if (err instanceof HttpError && err.status === 409) {
      // Already initialized — treat as success and redirect.
      router.push({ name: 'dashboard' })
    } else {
      errorMessage.value = 'Something went wrong. Please try again.'
    }
  } finally {
    isSubmitting.value = false
  }
})
</script>

<template>
  <AuthLayout title="Set up your account">
    <div class="rounded-xl border bg-card text-card-foreground shadow-sm p-6">
      <div class="mb-6">
        <h1 class="text-xl font-semibold leading-none tracking-tight">Set up your account</h1>
        <p class="text-sm text-muted-foreground mt-1">
          Customize your experience. All fields except display mode are optional.
        </p>
      </div>

      <Alert v-if="errorMessage" variant="destructive" class="mb-4">
        <AlertDescription>{{ errorMessage }}</AlertDescription>
      </Alert>

      <form @submit.prevent="onSubmit" class="space-y-4">
        <!-- Display mode -->
        <FormField name="display_mode" v-slot="{ componentField }">
          <FormItem>
            <FormLabel>Display mode <span class="text-destructive">*</span></FormLabel>
            <Select v-bind="componentField">
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a display mode" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem v-for="mode in DISPLAY_MODES" :key="mode.value" :value="mode.value">
                  {{ mode.label }}
                </SelectItem>
              </SelectContent>
            </Select>
            <FormDescription>Choose your dashboard default view mode</FormDescription>
            <FormMessage :align="'left'"/>
          </FormItem>
        </FormField>

        <!-- Flightaware API key -->
        <FormField name="flightawareApiKey" v-slot="{ componentField }">
          <FormItem>
            <FormLabel>Flightaware API key</FormLabel>
            <FormControl>
              <Input type="text" placeholder="72PwUiKp..." v-bind="componentField" />
            </FormControl>
            <FormDescription>Flightaware API key for airports timetables, flights information and more accurate radar results.</FormDescription>
            <FormMessage :align="'left'"/>
          </FormItem>
        </FormField>

        <!-- OpenSky Network key -->
        <FormField name="openSkyNetworkKey" v-slot="{ componentField }">
          <FormItem>
            <FormLabel>OpenSky Network key</FormLabel>
            <FormControl>
              <Input type="text" placeholder="sk_live_…" v-bind="componentField" />
            </FormControl>
            <FormDescription>API key for seeing flights in your area. If no key is provided, only 400 requests per day are allowed.</FormDescription>
            <FormMessage :align="'left'"/>
          </FormItem>
        </FormField>

        <Button type="submit" class="w-full" :disabled="isSubmitting">
          {{ isSubmitting ? 'Saving…' : 'Continue to dashboard' }}
        </Button>
      </form>
    </div>
  </AuthLayout>
</template>
