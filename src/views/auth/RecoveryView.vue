<script setup lang="ts">
import { ref } from 'vue'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { z } from 'zod'
import { recovery } from '@/api/auth'
import AuthLayout from './AuthLayout.vue'
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'

const successMessage = ref<string | null>(null)
const errorMessage = ref<string | null>(null)
const isSubmitting = ref(false)

const schema = toTypedSchema(
  z.object({
    username: z.string('Username is required').min(1, 'Username is required'),
  }),
)

const { handleSubmit } = useForm({ validationSchema: schema })

const onSubmit = handleSubmit(async (values) => {
  errorMessage.value = null
  successMessage.value = null
  isSubmitting.value = true

  try {
    await recovery(values)
    // The API intentionally returns the same message regardless of whether
    // the user exists, to prevent username enumeration.
    successMessage.value =
      'If an account with that username exists, a recovery link has been sent.'
  } catch {
    errorMessage.value = 'Something went wrong. Please try again.'
  } finally {
    isSubmitting.value = false
  }
})
</script>

<template>
  <AuthLayout title="Reset your password">
    <div class="rounded-xl border bg-card text-card-foreground shadow-sm p-6">
      <div class="mb-6">
        <h1 class="text-xl font-semibold leading-none tracking-tight">Reset your password</h1>
        <p class="text-sm text-muted-foreground mt-1">
          Enter your username and we'll send you a recovery link.
        </p>
      </div>

      <Alert v-if="successMessage" class="mb-4">
        <AlertDescription>{{ successMessage }}</AlertDescription>
      </Alert>

      <Alert v-if="errorMessage" variant="destructive" class="mb-4">
        <AlertDescription>{{ errorMessage }}</AlertDescription>
      </Alert>

      <form v-if="!successMessage" @submit.prevent="onSubmit" class="space-y-4">
        <FormField name="username" v-slot="{ componentField }">
          <FormItem>
            <FormLabel>Username</FormLabel>
            <FormControl>
              <Input
                type="text"
                placeholder="your_username"
                autocomplete="username"
                v-bind="componentField"
              />
            </FormControl>
            <FormMessage :align="'left'"/>
          </FormItem>
        </FormField>

        <Button type="submit" class="w-full" :disabled="isSubmitting">
          {{ isSubmitting ? 'Sending…' : 'Send recovery link' }}
        </Button>
      </form>

      <div class="mt-6 text-center text-sm text-muted-foreground">
        <RouterLink
          :to="{ name: 'login' }"
          class="text-foreground font-medium underline-offset-4 hover:underline transition-colors"
        >
          Back to sign in
        </RouterLink>
      </div>
    </div>
  </AuthLayout>
</template>
