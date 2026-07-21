<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { z } from 'zod'
import { resetPassword } from '@/api/auth'
import { HttpError } from '@/api/client'
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

const route = useRoute()

// The reset token comes from the query string (?token=...).
const token = computed(() => route.query.token as string | undefined)
const missingToken = computed(() => !token.value)

const successMessage = ref<string | null>(null)
const errorMessage = ref<string | null>(null)
const isSubmitting = ref(false)

const schema = toTypedSchema(
  z
    .object({
      new_password: z
        .string('Password is required')
        .min(8, 'Password must be at least 8 characters'),
      confirm_password: z
        .string('Please confirm your password')
        .min(1, 'Please confirm your password'),
    })
    .refine((data) => data.new_password === data.confirm_password, {
      message: 'Passwords do not match',
      path: ['confirm_password'],
    }),
)

const { handleSubmit } = useForm({ validationSchema: schema })

const onSubmit = handleSubmit(async (values) => {
  if (!token.value) return

  errorMessage.value = null
  successMessage.value = null
  isSubmitting.value = true

  try {
    await resetPassword({ token: token.value, new_password: values.new_password })
    successMessage.value = 'Password reset successfully. You can now sign in.'
  } catch (err) {
    if (err instanceof HttpError && err.status === 401) {
      errorMessage.value = 'This reset link is invalid or has expired. Request a new one.'
    } else {
      errorMessage.value = 'Something went wrong. Please try again.'
    }
  } finally {
    isSubmitting.value = false
  }
})
</script>

<template>
  <AuthLayout title="Set new password">
    <div class="rounded-xl border bg-card text-card-foreground shadow-sm p-6">
      <div class="mb-6">
        <h1 class="text-xl font-semibold leading-none tracking-tight">Set new password</h1>
        <p class="text-sm text-muted-foreground mt-1">Choose a new password for your account.</p>
      </div>

      <Alert v-if="missingToken" variant="destructive" class="mb-4">
        <AlertDescription>
          The reset link is missing a token. Please use the link from your recovery email.
        </AlertDescription>
      </Alert>

      <Alert v-if="successMessage" class="mb-4">
        <AlertDescription>{{ successMessage }}</AlertDescription>
      </Alert>

      <Alert v-if="errorMessage" variant="destructive" class="mb-4">
        <AlertDescription>{{ errorMessage }}</AlertDescription>
      </Alert>

      <form v-if="!missingToken && !successMessage" @submit.prevent="onSubmit" class="space-y-4">
        <FormField name="new_password" v-slot="{ componentField }">
          <FormItem>
            <FormLabel>New password</FormLabel>
            <FormControl>
              <Input
                type="password"
                placeholder="••••••••"
                autocomplete="new-password"
                v-bind="componentField"
              />
            </FormControl>
            <FormMessage :align="'left'"/>
          </FormItem>
        </FormField>

        <FormField name="confirm_password" v-slot="{ componentField }">
          <FormItem>
            <FormLabel>Confirm new password</FormLabel>
            <FormControl>
              <Input
                type="password"
                placeholder="••••••••"
                autocomplete="new-password"
                v-bind="componentField"
              />
            </FormControl>
            <FormMessage :align="'left'"/>
          </FormItem>
        </FormField>

        <Button type="submit" class="w-full" :disabled="isSubmitting">
          {{ isSubmitting ? 'Saving…' : 'Set new password' }}
        </Button>
      </form>

      <div v-if="successMessage" class="mt-4 text-center">
        <RouterLink
          :to="{ name: 'login' }"
          class="text-sm text-foreground font-medium underline-offset-4 hover:underline transition-colors"
        >
          Go to sign in
        </RouterLink>
      </div>

      <div v-if="!successMessage" class="mt-6 text-center text-sm text-muted-foreground">
        <RouterLink
          :to="{ name: 'recovery' }"
          class="text-foreground font-medium underline-offset-4 hover:underline transition-colors"
        >
          Request a new recovery link
        </RouterLink>
      </div>
    </div>
  </AuthLayout>
</template>
