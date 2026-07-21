<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { z } from 'zod'
import { useAuthStore } from '@/stores/auth'
import { login } from '@/api/auth'
import { fetchConfig } from '@/api/config'
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

const registrationEnabled = ref(false)
const errorMessage = ref<string | null>(null)
const isSubmitting = ref(false)

onMounted(async () => {
  try {
    const config = await fetchConfig()
    registrationEnabled.value = !config.registration_disabled
  } catch {
    // If config fails, keep registration disabled as the safe default.
    registrationEnabled.value = false
  }
})

const schema = toTypedSchema(
  z.object({
    username: z.string('Username is required').min(1, 'Username is required'),
    password: z.string('Password is required').min(1, 'Password is required'),
  }),
)

const { handleSubmit } = useForm({ validationSchema: schema })

const onSubmit = handleSubmit(async (values) => {
  errorMessage.value = null
  isSubmitting.value = true

  try {
    const tokens = await login(values)
    auth.setTokens(tokens)

    const initStatus = await fetchInitStatus()
    if (initStatus.requires_initialization) {
      router.push({ name: 'initialize' })
    } else {
      router.push({ name: 'dashboard' })
    }
  } catch (err) {
    if (err instanceof HttpError && err.status === 401) {
      errorMessage.value = 'Invalid username or password.'
    } else {
      errorMessage.value = 'Something went wrong. Please try again.'
    }
  } finally {
    isSubmitting.value = false
  }
})
</script>

<template>
  <AuthLayout title="Sign in">
    <div class="rounded-xl border bg-card text-card-foreground shadow-sm p-6">
      <div class="mb-6">
        <h1 class="text-xl font-semibold leading-none tracking-tight">Sign in</h1>
        <p class="text-sm text-muted-foreground mt-1">Enter your credentials to continue</p>
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
                placeholder="johndoe"
                autocomplete="username"
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
                autocomplete="current-password"
                v-bind="componentField"
              />
            </FormControl>
            <FormMessage :align="'left'"/>
          </FormItem>
        </FormField>

        <div class="flex items-center justify-between text-sm">
          <RouterLink
            :to="{ name: 'recovery' }"
            class="text-muted-foreground hover:text-foreground underline-offset-4 hover:underline transition-colors"
          >
            Forgot password?
          </RouterLink>
        </div>

        <Button type="submit" class="w-full" :disabled="isSubmitting">
          {{ isSubmitting ? 'Signing in…' : 'Sign in' }}
        </Button>
      </form>

      <div v-if="registrationEnabled" class="mt-6 text-center text-sm text-muted-foreground">
        No account yet?
        <RouterLink
          :to="{ name: 'register' }"
          class="text-foreground font-medium underline-offset-4 hover:underline transition-colors"
        >
          Create one
        </RouterLink>
      </div>
    </div>
  </AuthLayout>
</template>
