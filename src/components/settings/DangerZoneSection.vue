<script setup lang="ts">
import { ref, computed } from 'vue'
import { Trash2, Loader2 } from '@lucide/vue'
import { deleteAccount } from '@/api/preferences'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'
import { HttpError } from '@/api/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'

const CONFIRM_TEXT = 'DELETE'

const dialogOpen = ref(false)
const confirmInput = ref('')
const isDeleting = ref(false)
const errorMessage = ref<string | null>(null)

const canDelete = computed(() => confirmInput.value === CONFIRM_TEXT)

const auth = useAuthStore()
const router = useRouter()

function openDialog() {
  confirmInput.value = ''
  errorMessage.value = null
  dialogOpen.value = true
}

async function confirmDelete() {
  if (!canDelete.value) return
  isDeleting.value = true
  errorMessage.value = null
  try {
    await deleteAccount()
    auth.clearTokens()
    router.push({ name: 'login' })
  } catch (err) {
    if (err instanceof HttpError) {
      const body = err.body as { message?: string } | null
      errorMessage.value = body?.message ?? 'Failed to delete account. Please try again.'
    } else {
      errorMessage.value = 'Failed to delete account. Please try again.'
    }
    isDeleting.value = false
  }
}
</script>

<template>
  <section class="danger-zone">
    <div class="danger-zone__header">
      <h2 class="danger-zone__title">Danger zone</h2>
      <p class="danger-zone__subtitle">
        Irreversible actions. Proceed with caution.
      </p>
    </div>

    <div class="danger-zone__action-row">
      <div class="danger-zone__action-info">
        <span class="danger-zone__action-name">Delete account</span>
        <span class="danger-zone__action-desc">
          Permanently delete your account and all associated data. This cannot be undone.
        </span>
      </div>
      <Button variant="destructive" @click="openDialog">
        <Trash2 class="mr-2" :size="16" />
        Delete account
      </Button>
    </div>
  </section>

  <Dialog v-model:open="dialogOpen">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Delete account</DialogTitle>
        <DialogDescription>
          This action is permanent and cannot be undone. All your data will be deleted.
          Type <strong>{{ CONFIRM_TEXT }}</strong> to confirm.
        </DialogDescription>
      </DialogHeader>

      <div class="dialog-confirm">
        <Input
          v-model="confirmInput"
          :placeholder="CONFIRM_TEXT"
          autocomplete="off"
          spellcheck="false"
        />
      </div>

      <Alert v-if="errorMessage" variant="destructive" class="mt-2">
        <AlertDescription>{{ errorMessage }}</AlertDescription>
      </Alert>

      <DialogFooter class="gap-2">
        <Button variant="outline" :disabled="isDeleting" @click="dialogOpen = false">
          Cancel
        </Button>
        <Button
          variant="destructive"
          :disabled="!canDelete || isDeleting"
          @click="confirmDelete"
        >
          <Loader2 v-if="isDeleting" class="animate-spin mr-2" :size="16" />
          <Trash2 v-else class="mr-2" :size="16" />
          Delete my account
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<style scoped lang="scss">
.danger-zone {
  --danger-zone-border: oklch(0.65 0.2 25 / 0.5);
  --danger-zone-bg: oklch(0.99 0.005 25);

  border: 1px solid var(--danger-zone-border);
  border-radius: var(--radius-lg);
  padding: 1.5rem;
  background: var(--danger-zone-bg);

  &__header {
    margin-bottom: 1.25rem;
  }

  &__title {
    font-size: 1.1rem;
    font-weight: 600;
    color: var(--destructive);
    margin: 0 0 0.25rem;
  }

  &__subtitle {
    font-size: 0.875rem;
    color: var(--muted-foreground);
    margin: 0;
  }

  &__action-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;

    @media (max-width: 600px) {
      flex-direction: column;
      align-items: flex-start;
    }
  }

  &__action-info {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
  }

  &__action-name {
    font-size: 0.9rem;
    font-weight: 500;
    color: var(--foreground);
  }

  &__action-desc {
    font-size: 0.8rem;
    color: var(--muted-foreground);
    max-width: 36rem;
  }
}

:global(.dark) .danger-zone {
  --danger-zone-border: oklch(0.4 0.15 25 / 0.4);
  --danger-zone-bg: oklch(0.12 0.015 25);
}

.dialog-confirm {
  padding: 0.25rem 0;
}
</style>
