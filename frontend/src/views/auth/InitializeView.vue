<script setup lang="ts">
import {ref} from 'vue'
import {useRouter} from 'vue-router'
import {useForm} from 'vee-validate'
import {toTypedSchema} from '@vee-validate/zod'
import {z} from 'zod'
import {initializeUser} from '@/api/auth'
import {HttpError} from '@/api/client'
import AuthLayout from './AuthLayout.vue'
import {FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage,} from '@/components/ui/form'
import {Input} from '@/components/ui/input'
import {Button} from '@/components/ui/button'
import {Alert, AlertDescription} from '@/components/ui/alert'

const router = useRouter()

const errorMessage = ref<string | null>(null)
const isSubmitting = ref(false)

const schema = toTypedSchema(
  z.object({
    flightawareApiKey: z.string().optional(),
    openSkyNetworkKey: z.string().optional(),
  }),
)

const { handleSubmit } = useForm({
  validationSchema: schema,
})

const onSubmit = handleSubmit(async (values) => {
  errorMessage.value = null
  isSubmitting.value = true

  const payload = {
    openSkyNetworkKey: values.openSkyNetworkKey ?? '',
    flightawareApiKey: values.flightawareApiKey ?? '',
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
      </div>

      <Alert v-if="errorMessage" variant="destructive" class="mb-4">
        <AlertDescription>{{ errorMessage }}</AlertDescription>
      </Alert>

      <form @submit.prevent="onSubmit" class="space-y-4">
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
