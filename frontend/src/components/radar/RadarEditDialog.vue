<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { z } from 'zod'
import { updateRadarTracking } from '@/api/radar'
import { HttpError } from '@/api/client'
import type { RadarTracking } from '@/types/radar'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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

const props = defineProps<{
  radar: RadarTracking
}>()

const emit = defineEmits<{
  updated: [radar: RadarTracking]
}>()

const open = defineModel<boolean>('open', { default: false })

const isSubmitting = ref(false)
const errorMessage = ref<string | null>(null)

const schema = toTypedSchema(
  z.object({
    name: z.string().min(1, 'Name is required'),
    expiration: z.string().optional(),
    inactivity_timeout: z.string(),
  }),
)

function toDatetimeLocal(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function toInactivityValue(seconds: number | null): string {
  return seconds === null ? 'none' : String(Math.round(seconds / 60))
}

const { handleSubmit, resetForm } = useForm({
  validationSchema: schema,
  initialValues: {
    name: props.radar.name ?? '',
    expiration: toDatetimeLocal(props.radar.expiration),
    inactivity_timeout: toInactivityValue(props.radar.inactivity_timeout),
  },
})

// Re-sync the form whenever the dialog opens for a (possibly updated) radar.
watch(open, (isOpen) => {
  if (isOpen) {
    resetForm({
      values: {
        name: props.radar.name ?? '',
        expiration: toDatetimeLocal(props.radar.expiration),
        inactivity_timeout: toInactivityValue(props.radar.inactivity_timeout),
      },
    })
    errorMessage.value = null
  }
})

const onSubmit = handleSubmit(async (formValues) => {
  errorMessage.value = null
  isSubmitting.value = true

  try {
    const updated = await updateRadarTracking(props.radar.id, {
      name: formValues.name,
      expiration: formValues.expiration || null,
      inactivity_timeout:
        formValues.inactivity_timeout && formValues.inactivity_timeout !== 'none'
          ? formValues.inactivity_timeout
          : null,
    })
    emit('updated', updated)
    open.value = false
  } catch (err) {
    if (err instanceof HttpError) {
      const body = err.body as { error?: string } | null
      errorMessage.value = body?.error ?? 'Failed to update radar tracking.'
    } else {
      errorMessage.value = 'An unexpected error occurred.'
    }
  } finally {
    isSubmitting.value = false
  }
})

const dialogDescription = computed(() =>
  `Editing "${props.radar.name || `Radar #${props.radar.id}`}". The radar connection is paused while this is open.`,
)
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="sm:max-w-[500px]">
      <DialogHeader>
        <DialogTitle>Edit radar settings</DialogTitle>
        <DialogDescription class="mt-2">{{ dialogDescription }}</DialogDescription>
      </DialogHeader>

      <Alert v-if="errorMessage" variant="destructive" class="mb-3">
        <AlertDescription>{{ errorMessage }}</AlertDescription>
      </Alert>

      <form @submit.prevent="onSubmit" class="space-y-3">
        <FormField name="name" v-slot="{ componentField }">
          <FormItem>
            <FormLabel>Name <span class="text-destructive">*</span></FormLabel>
            <FormControl>
              <Input v-bind="componentField" placeholder="e.g., Downtown Zone" />
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>

        <FormField name="expiration" v-slot="{ componentField }">
          <FormItem>
            <FormLabel>Expiration (optional)</FormLabel>
            <FormControl>
              <Input v-bind="componentField" type="datetime-local" />
            </FormControl>
            <FormDescription>The radar will auto-delete after this date and time.</FormDescription>
            <FormMessage />
          </FormItem>
        </FormField>

        <FormField name="inactivity_timeout" v-slot="{ componentField }">
          <FormItem>
            <FormLabel>Inactivity timeout (optional)</FormLabel>
            <Select v-bind="componentField" class="w-full">
              <FormControl>
                <SelectTrigger class="w-full">
                  <SelectValue placeholder="Select a timeout duration" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="none">No timeout</SelectItem>
                <SelectItem value="15">15 minutes</SelectItem>
                <SelectItem value="30">30 minutes</SelectItem>
                <SelectItem value="60">60 minutes</SelectItem>
                <SelectItem value="120">2 hours</SelectItem>
                <SelectItem value="360">6 hours</SelectItem>
                <SelectItem value="720">12 hours</SelectItem>
              </SelectContent>
            </Select>
            <FormDescription>
              Radar stops updating if no refresh is triggered within this time.
            </FormDescription>
            <FormMessage />
          </FormItem>
        </FormField>

        <div class="pt-2 flex gap-2">
          <Button type="button" variant="outline" class="flex-1" @click="open = false" :disabled="isSubmitting">
            Cancel
          </Button>
          <Button type="submit" class="flex-1" :disabled="isSubmitting">
            {{ isSubmitting ? 'Saving…' : 'Save changes' }}
          </Button>
        </div>
      </form>
    </DialogContent>
  </Dialog>
</template>
