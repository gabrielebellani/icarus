import { ref, computed, onMounted, onUnmounted } from 'vue'
import { getWsUrl, getAccessTokenValue } from '@/api/client'
import type { RadarUpdateMessage, RadarAircraft } from '@/types/radar'

export interface UseRadarSocketOptions {
  radarId: string
  onAuthFailure?: () => void
}

type ConnectionState = 'connecting' | 'open' | 'reconnecting' | 'error' | 'closed'

export function useRadarSocket({ radarId }: UseRadarSocketOptions) {
  const connectionState = ref<ConnectionState>('closed')
  const aircraft = ref<RadarAircraft[]>([])
  const lastMessageAt = ref<Date | null>(null)
  const error = ref<string | null>(null)

  let ws: WebSocket | null = null
  let reconnectTimeout: ReturnType<typeof setTimeout> | null = null
  let reconnectDelay = 1000 // milliseconds
  let consecutiveFailures = 0
  let isActive = true
  const MAX_RECONNECT_DELAY = 15000

  function buildWsUrl(): string {
    const token = getAccessTokenValue()
    if (!token) {
      const err = 'No access token available. Please log in again.'
      console.error('[useRadarSocket] buildWsUrl:', err)
      throw new Error(err)
    }
    const path = `/api/radar/open/${radarId}?token=${encodeURIComponent(token)}`
    const url = getWsUrl(path)
    console.log(`[useRadarSocket] Built WebSocket URL for radarId="${radarId}"`)
    console.debug(`[useRadarSocket] Final URL: ${url.replace(/token=[^&]*/, 'token=***')}`)
    return url
  }

  function connect() {
    if (!isActive) {
      console.log('[useRadarSocket] connect called after unmount, ignoring')
      return
    }
    console.log(`[useRadarSocket] Attempting to connect (state: ${connectionState.value}, radarId: ${radarId})`)
    if (connectionState.value === 'connecting' || connectionState.value === 'open') {
      console.debug('[useRadarSocket] Already connecting or connected, skipping')
      return
    }

    try {
      connectionState.value = 'connecting'
      error.value = null
      const url = buildWsUrl()
      console.log('[useRadarSocket] Creating new WebSocket instance...')
      ws = new WebSocket(url)

      ws.onopen = () => {
        console.log('[useRadarSocket] ✓ WebSocket connected')
        connectionState.value = 'open'
        consecutiveFailures = 0
        reconnectDelay = 1000
        error.value = null
      }

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as RadarUpdateMessage
          aircraft.value = message.aircraft ?? []
          lastMessageAt.value = new Date()
          error.value = null
          console.debug(`[useRadarSocket] Received ${aircraft.value.length} aircraft`)
        } catch (err) {
          const errMsg = `Failed to parse message: ${err instanceof Error ? err.message : 'unknown error'}`
          error.value = errMsg
          console.error('[useRadarSocket] Parse error:', err)
        }
      }

      ws.onerror = (event) => {
        connectionState.value = 'error'
        consecutiveFailures++
        const errMsg = `WebSocket error (attempt ${consecutiveFailures})`
        error.value = errMsg
        console.error('[useRadarSocket] ✗ Error:', event, errMsg)
      }

      ws.onclose = () => {
        console.log(`[useRadarSocket] Connection closed (final state: ${connectionState.value})`)
        if (connectionState.value !== 'closed') {
          connectionState.value = 'reconnecting'
          scheduleReconnect()
        }
      }
    } catch (err) {
      connectionState.value = 'error'
      const errMsg = err instanceof Error ? err.message : 'Failed to connect'
      error.value = errMsg
      consecutiveFailures++
      console.error('[useRadarSocket] Connection failed:', errMsg, err)
      scheduleReconnect()
    }
  }

  function scheduleReconnect() {
    if (!isActive) {
      console.log('[useRadarSocket] scheduleReconnect called after unmount, ignoring')
      return
    }
    if (reconnectTimeout) clearTimeout(reconnectTimeout)

    console.log(`[useRadarSocket] Scheduling reconnect in ${reconnectDelay}ms`)
    reconnectTimeout = setTimeout(() => {
      if (isActive && connectionState.value !== 'closed') {
        connect()
      }
    }, reconnectDelay)

    // Exponential backoff: 1s → 2s → 4s → 8s → 15s cap
    reconnectDelay = Math.min(reconnectDelay * 2, MAX_RECONNECT_DELAY)
  }

  function retry() {
    if (!isActive) {
      console.log('[useRadarSocket] retry called after unmount, ignoring')
      return
    }
    console.log('[useRadarSocket] Manual retry requested')
    consecutiveFailures = 0
    reconnectDelay = 1000
    connect()
  }

  /**
   * Close the socket. Pass `permanent: false` to allow a later `connect()` call to
   * reopen it (used to pause the connection, e.g. while editing radar settings).
   */
  function disconnect(permanent = true) {
    console.log('[useRadarSocket] Disconnecting...')
    if (permanent) isActive = false
    connectionState.value = 'closed'
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout)
      reconnectTimeout = null
    }
    if (ws) {
      // Remove all event listeners before closing to prevent callback execution after unmount
      ws.onopen = null
      ws.onmessage = null
      ws.onerror = null
      ws.onclose = null
      ws.close()
      ws = null
    }
  }

  const isConnected = computed(() => connectionState.value === 'open')
  const isReconnecting = computed(() => connectionState.value === 'reconnecting' || connectionState.value === 'connecting')
  const hasError = computed(() => connectionState.value === 'error')

  onMounted(() => {
    console.log(`[useRadarSocket] Mounted for radarId="${radarId}"`)
    connect()
  })

  onUnmounted(() => {
    console.log(`[useRadarSocket] Unmounting, closing connection`)
    disconnect()
  })

  return {
    connectionState,
    aircraft,
    lastMessageAt,
    error,
    isConnected,
    isReconnecting,
    hasError,
    retry,
    connect,
    disconnect,
  }
}
