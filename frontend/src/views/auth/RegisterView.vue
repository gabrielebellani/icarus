<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { z } from 'zod'
import { useAuthStore } from '@/stores/auth'
import { register } from '@/api/auth'
import { fetchInitStatus } from '@/api/auth'
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

const router = useRouter()
const auth = useAuthStore()

const errorMessage = ref<string | null>(null)
const isSubmitting = ref(false)

const schema = toTypedSchema(
  z.object({
    username: z.string('Username is required').min(1, 'Username is required'),
    email: z.string('Enter a valid email address').email('Enter a valid email address'),
    password: z
      .string('Password is required')
      .min(8, 'Password must be at least 8 characters'),
  }),
)

const { handleSubmit } = useForm({ validationSchema: schema })

const onSubmit = handleSubmit(async (values) => {
  errorMessage.value = null
  isSubmitting.value = true

  try {
    const tokens = await register(values)
    auth.setTokens(tokens)

    const initStatus = await fetchInitStatus()
    if (initStatus.requires_initialization) {
      router.push({ name: 'initialize' })
    } else {
      router.push({ name: 'dashboard' })
    }
  } catch (err) {
    if (err instanceof HttpError) {
      if (err.status === 400) {
        errorMessage.value = 'Registration is currently disabled.'
      } else if (err.status === 409) {
        errorMessage.value = 'This username is already taken.'
      } else {
        errorMessage.value = 'Something went wrong. Please try again.'
      }
    } else {
      errorMessage.value = 'Something went wrong. Please try again.'
    }
  } finally {
    isSubmitting.value = false
  }
})
</script>

<template>
  <AuthLayout title="Create account">
    <div class="rounded-xl border bg-card text-card-foreground shadow-sm p-6">
      <div class="mb-6">
        <h1 class="text-xl font-semibold leading-none tracking-tight">Create account</h1>
        <p class="text-sm text-muted-foreground mt-1">Fill in the details below to get started</p>
      </div>

      <Alert v-if="errorMessage" variant="destructive" class="mb-4">
        <AlertDescription>{{ errorMessage }}</AlertDescription>
      </Alert>

      <form @submit.prevent="onSubmit" class="space-y-4">
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

        <FormField name="email" v-slot="{ componentField }">
          <FormItem>
            <FormLabel>Email</FormLabel>
            <FormControl>
              <Input
                type="email"
                placeholder="you@example.com"
                autocomplete="email"
                v-bind="componentField"
              />
            </FormControl>
            <FormMessage :align="'left'"/>
          </FormItem>
        </FormField>

        <FormField name="password" v-slot="{ componentField }">
          <FormItem>
            <FormLabel>Password</FormLabel>
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
          {{ isSubmitting ? 'Creating account…' : 'Create account' }}
        </Button>
      </form>

      <div class="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?
        <RouterLink
          :to="{ name: 'login' }"
          class="text-foreground font-medium underline-offset-4 hover:underline transition-colors"
        >
          Sign in
        </RouterLink>
      </div>
    </div>
  </AuthLayout>
</template>
