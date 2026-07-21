<script setup lang="ts">
import { ref } from 'vue'
import { Eye, EyeOff, Loader2, ShieldCheck } from '@lucide/vue'
import { changePassword } from '@/api/preferences'
import { HttpError } from '@/api/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'

type Status = 'idle' | 'submitting' | 'success' | 'error'

const status = ref<Status>('idle')
const serverError = ref<string | null>(null)

const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')

const showCurrent = ref(false)
const showNew = ref(false)
const showConfirm = ref(false)

// Client-side validation errors
const errors = ref<{ current?: string; new?: string; confirm?: string }>({})

function validate(): boolean {
  const e: typeof errors.value = {}

  if (!currentPassword.value) {
    e.current = 'Current password is required.'
  }
  if (!newPassword.value) {
    e.new = 'New password is required.'
  } else if (newPassword.value.length < 8) {
    e.new = 'Password must be at least 8 characters.'
  } else if (newPassword.value.length > 255) {
    e.new = 'Password must be at most 255 characters.'
  }
  if (!confirmPassword.value) {
    e.confirm = 'Please confirm your new password.'
  } else if (newPassword.value !== confirmPassword.value) {
    e.confirm = 'Passwords do not match.'
  }

  errors.value = e
  return Object.keys(e).length === 0
}

async function submit() {
  serverError.value = null
  if (!validate()) return

  status.value = 'submitting'
  try {
    await changePassword({
      current_password: currentPassword.value,
      new_password: newPassword.value,
    })
    status.value = 'success'
    currentPassword.value = ''
    newPassword.value = ''
    confirmPassword.value = ''
    errors.value = {}
    setTimeout(() => {
      if (status.value === 'success') status.value = 'idle'
    }, 3000)
  } catch (err) {
    if (err instanceof HttpError) {
      const body = err.body as { message?: string; errors?: unknown[] } | null
      serverError.value = body?.message ?? 'Failed to change password. Please try again.'
    } else {
      serverError.value = 'Failed to change password. Please try again.'
    }
    status.value = 'error'
  }
}
</script>

<template>
  <section class="settings-section">
    <div class="settings-section__header">
      <h2 class="settings-section__title">Security</h2>
      <p class="settings-section__subtitle">Change your account password.</p>
    </div>

    <Alert v-if="status === 'error' && serverError" variant="destructive" class="mb-4">
      <AlertDescription>{{ serverError }}</AlertDescription>
    </Alert>
    <Alert v-if="status === 'success'" class="mb-4 alert--success">
      <AlertDescription>Password changed successfully.</AlertDescription>
    </Alert>

    <form class="settings-fields" @submit.prevent="submit">
      <!-- Current password -->
      <div class="settings-field">
        <label class="settings-field__label" for="sec-current">Current password</label>
        <div class="settings-field__secret-row">
          <Input
            id="sec-current"
            :type="showCurrent ? 'text' : 'password'"
            placeholder="Current password"
            autocomplete="current-password"
            v-model="currentPassword"
            :class="{ 'border-destructive': errors.current }"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            :aria-label="showCurrent ? 'Hide password' : 'Show password'"
            @click="showCurrent = !showCurrent"
          >
            <EyeOff v-if="showCurrent" :size="16" />
            <Eye v-else :size="16" />
          </Button>
        </div>
        <p v-if="errors.current" class="settings-field__error">{{ errors.current }}</p>
      </div>

      <!-- New password -->
      <div class="settings-field">
        <label class="settings-field__label" for="sec-new">New password</label>
        <div class="settings-field__secret-row">
          <Input
            id="sec-new"
            :type="showNew ? 'text' : 'password'"
            placeholder="Min. 8 characters"
            autocomplete="new-password"
            v-model="newPassword"
            :class="{ 'border-destructive': errors.new }"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            :aria-label="showNew ? 'Hide password' : 'Show password'"
            @click="showNew = !showNew"
          >
            <EyeOff v-if="showNew" :size="16" />
            <Eye v-else :size="16" />
          </Button>
        </div>
        <p v-if="errors.new" class="settings-field__error">{{ errors.new }}</p>
      </div>

      <!-- Confirm password -->
      <div class="settings-field">
        <label class="settings-field__label" for="sec-confirm">Confirm new password</label>
        <div class="settings-field__secret-row">
          <Input
            id="sec-confirm"
            :type="showConfirm ? 'text' : 'password'"
            placeholder="Repeat new password"
            autocomplete="new-password"
            v-model="confirmPassword"
            :class="{ 'border-destructive': errors.confirm }"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            :aria-label="showConfirm ? 'Hide password' : 'Show password'"
            @click="showConfirm = !showConfirm"
          >
            <EyeOff v-if="showConfirm" :size="16" />
            <Eye v-else :size="16" />
          </Button>
        </div>
        <p v-if="errors.confirm" class="settings-field__error">{{ errors.confirm }}</p>
      </div>

      <div class="settings-section__actions">
        <Button type="submit" :disabled="status === 'submitting'">
          <Loader2 v-if="status === 'submitting'" class="animate-spin mr-2" :size="16" />
          <ShieldCheck v-else class="mr-2" :size="16" />
          Change password
        </Button>
      </div>
    </form>
  </section>
</template>

<style scoped lang="scss">
.settings-section {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 1.5rem;

  &__header {
    margin-bottom: 1.5rem;
  }

  &__title {
    font-size: 1.1rem;
    font-weight: 600;
    color: var(--foreground);
    margin: 0 0 0.25rem;
  }

  &__subtitle {
    font-size: 0.875rem;
    color: var(--muted-foreground);
    margin: 0;
  }

  &__actions {
    margin-top: 0.5rem;
    display: flex;
    justify-content: flex-end;
  }
}

.settings-fields {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.settings-field {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;

  &__label {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--foreground);
  }

  &__secret-row {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }

  &__error {
    font-size: 0.8rem;
    color: var(--destructive);
    margin: 0;
  }
}

.alert--success {
  border-color: oklch(0.55 0.18 145);
  background: oklch(0.95 0.04 145);
  color: oklch(0.35 0.15 145);
}
</style>
