<script setup
        lang="ts"
>
import {ref, watch, computed} from 'vue'
import {useForm} from 'vee-validate'
import {toTypedSchema} from '@vee-validate/zod'
import {z} from 'zod'
import {createRadarTracking} from '@/api/radar'
import {HttpError} from '@/api/client'
import type {RadarTracking, RadarCoordinates} from '@/types/radar'
import RadarLocationPicker from './RadarLocationPicker.vue'
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
import {Input} from '@/components/ui/input'
import {Button} from '@/components/ui/button'
import {Alert, AlertDescription} from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const emit = defineEmits<{
  created: [radar: RadarTracking]
}>()

// Controlled open state, synced with the parent via `v-model:open`.
// Reka-ui's DialogRoot (wrapped by our Dialog component) manages the
// close-on-Esc, close-on-overlay-click, and close (X) button interactions
// automatically as long as `open` is bound with v-model.
const open = defineModel<boolean>('open', {default: false})

// ── Step state ─────────────────────────────────────────────────────────────────
const currentStep = ref(1)
const isSubmitting = ref(false)
const errorMessage = ref<string | null>(null)
const selectedCoordinates = ref<RadarCoordinates | null>(null)

// Enable Step 2 only when a location has been selected.
const canProceedToStep2 = computed(() => selectedCoordinates.value !== null)

// ── Form schema ────────────────────────────────────────────────────────────────
// Only validate fields relevant to the current step.
// Step 1: only radius (coordinates require map picker)
// Step 2: refresh_interval (required), others optional
const schema = toTypedSchema(
    z.object({
      name: z.string().optional(),
      radius: z.coerce
          .number('Radius must be a valid number')
          .positive('Radius must be greater than 0')
          .max(99, 'Maximum radius is 99km'),
      refresh_interval: z.coerce
          .number()
          .int()
          .min(30, 'Minimum refresh interval is 30 seconds')
          .max(300, 'Maximum refresh interval is 300 seconds'),
      expiration: z.string().optional(),
      inactivity_timeout: z.coerce.number().int().nullable(),
    }),
)

const {handleSubmit, resetForm} = useForm({
  validationSchema: schema,
  initialValues: {
    name: '',
    radius: 50,
    refresh_interval: 30,
    expiration: '',
    inactivity_timeout: 30,
  },
})

// ── Step navigation ────────────────────────────────────────────────────────────
function goToStep(step: number) {
  currentStep.value = step
  errorMessage.value = null
}

function nextStep() {
  if (currentStep.value < 2) {
    goToStep(currentStep.value + 1)
  }
}

function prevStep() {
  if (currentStep.value > 1) {
    goToStep(currentStep.value - 1)
  }
}

// ── Submission handler ─────────────────────────────────────────────────────────
const onSubmit = handleSubmit(async (formValues) => {
  errorMessage.value = null
  isSubmitting.value = true

  try {
    const payload = {
      name: formValues.name || null,
      coordinates: selectedCoordinates.value!,
      radius: formValues.radius,
      refresh_interval: formValues.refresh_interval,
      expiration: formValues.expiration || null,
      inactivity_timeout: formValues.inactivity_timeout,
    }

    const radar = await createRadarTracking(payload)
    emit('created', radar)
    open.value = false
  } catch (err) {
    if (err instanceof HttpError) {
      const body = err.body as { error?: string } | null
      errorMessage.value = body?.error ?? 'Failed to create radar tracking.'
    } else {
      errorMessage.value = 'An unexpected error occurred.'
    }
  } finally {
    isSubmitting.value = false
  }
})

// Reset local state whenever the dialog transitions to closed, regardless of
// how it was closed (X button, Esc, overlay click, or programmatic).
watch(open, (isOpen) => {
  if (!isOpen) {
    resetForm()
    errorMessage.value = null
    selectedCoordinates.value = null
    goToStep(1)
  }
})
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Create a radar tracking</DialogTitle>
        <DialogDescription class="mt-2">
          <span class="inline-block bg-secondary px-2 py-1 rounded text-xs font-medium">
            Step {{ currentStep }} of 2
          </span>
        </DialogDescription>
      </DialogHeader>

      <!-- Error Alert -->
      <Alert v-if="errorMessage"
             variant="destructive"
             class="mb-3"
      >
        <AlertDescription>{{ errorMessage }}</AlertDescription>
      </Alert>

      <form @submit.prevent="onSubmit"
            class="radar-create__steps-container"
      >
        <!-- ────────────────────────────────────────────────────────────────────────
             STEP 1: Location & Radius
             ──────────────────────────────────────────────────────────────────────── -->
        <div v-if="currentStep === 1"
             class="radar-create__step space-y-3"
        >
          <!-- Location picker -->
          <div>
            <label class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Location <span class="text-destructive">*</span>
            </label>
            <RadarLocationPicker v-model="selectedCoordinates" class="mt-2" />
          </div>

          <!-- Radius -->
          <FormField name="radius"
                     v-slot="{ componentField }"
          >
            <FormItem>
              <FormLabel>Radius (km) <span class="text-destructive">*</span></FormLabel>
              <FormControl>
                <Input v-bind="componentField"
                       type="number"
                       placeholder="15"
                       default="15"
                       min="0"
                       max="99"
                />
              </FormControl>
              <FormDescription>Detection radius around the center point.</FormDescription>
              <FormMessage/>
            </FormItem>
          </FormField>

          <!-- Step 1 buttons -->
          <div class="radar-create__button-group pt-2">
            <Button
                type="button"
                @click="nextStep"
                class="w-full"
                :disabled="!canProceedToStep2"
            >
              Next
            </Button>
          </div>
        </div>

        <!-- ────────────────────────────────────────────────────────────────────────
             STEP 2: Advanced Settings
             ──────────────────────────────────────────────────────────────────────── -->
        <div v-if="currentStep === 2"
             class="radar-create__step space-y-3"
        >
          <!-- Name -->
          <FormField name="name"
                     v-slot="{ componentField }"
          >
            <FormItem>
              <FormLabel>Name (optional)</FormLabel>
              <FormControl>
                <Input v-bind="componentField"
                       placeholder="e.g., Downtown Zone"
                />
              </FormControl>
              <FormDescription>A friendly name for this radar zone.</FormDescription>
              <FormMessage/>
            </FormItem>
          </FormField>

          <!-- Refresh interval -->
          <FormField name="refresh_interval"
                     v-slot="{ componentField }"
          >
            <FormItem>
              <FormLabel>Update interval (seconds) <span class="text-destructive">*</span></FormLabel>
              <FormControl>
                <Input
                    v-bind="componentField"
                    type="number"
                    placeholder="30"
                    min="30"
                    max="300"
                />
              </FormControl>
              <FormDescription>How often the server sends new aircraft data (30–300 seconds).</FormDescription>
              <FormMessage/>
            </FormItem>
          </FormField>

          <!-- Expiration -->
          <FormField name="expiration"
                     v-slot="{ componentField }"
          >
            <FormItem>
              <FormLabel>Expiration (optional)</FormLabel>
              <FormControl>
                <Input v-bind="componentField"
                       type="datetime-local"
                />
              </FormControl>
              <FormDescription>The radar will auto-delete after this date and time.</FormDescription>
              <FormMessage/>
            </FormItem>
          </FormField>

          <!-- Inactivity timeout -->
          <FormField name="inactivity_timeout"
                     v-slot="{ componentField }"
          >
            <FormItem>
              <FormLabel>Inactivity timeout (optional)</FormLabel>
              <Select v-bind="componentField"
                      :default-value="String(componentField.modelValue)"
                      class="w-full"
              >
                <FormControl>
                  <SelectTrigger class="w-full">
                    <SelectValue placeholder="Select a timeout duration"/>
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="">None (disabled)</SelectItem>
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
              <FormMessage/>
            </FormItem>
          </FormField>

          <!-- Step 2 buttons -->
          <div class="radar-create__button-group pt-4 flex gap-2">
            <Button
                type="button"
                variant="outline"
                @click="prevStep"
                class="flex-1"
            >
              Back
            </Button>
            <Button
                type="submit"
                class="flex-1"
                :disabled="isSubmitting"
            >
              <svg
                  v-if="isSubmitting"
                  class="animate-spin -ml-1 mr-2 h-4 w-4"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
              >
                <circle class="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        stroke-width="4"
                />
                <path
                    class="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              {{ isSubmitting ? 'Creating…' : 'Create radar' }}
            </Button>
          </div>
        </div>
      </form>
    </DialogContent>
  </Dialog>
</template>

<style scoped
       lang="scss"
>
.radar-create {
  &__steps-container {
    display: flex;
    flex-direction: column;
  }

  &__step {
    display: flex;
    flex-direction: column;
    min-height: auto;
  }

  &__button-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
}
</style>
