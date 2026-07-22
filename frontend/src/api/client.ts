/**
 * HTTP client with automatic auth header injection and token refresh on 401.
 * Networking concerns are kept isolated here so views stay presentation-only.
 */
export interface ApiError {
  error: string
}

export class HttpError extends Error {
  status: number
  body: unknown

  constructor(status: number, body: unknown) {
    super(`HTTP ${status}`)
    this.status = status
    this.body = body
  }
}

// Resolved after app boot to break circular dep between client and auth store.
let getAccessToken: (() => string | null) | null = null
let getRefreshToken: (() => string | null) | null = null
let onRefreshSuccess: ((tokens: { access_token: string; refresh_token: string }) => void) | null = null
let onAuthFailure: (() => void) | null = null

const API_BASE = import.meta.env.VITE_API_BASE_URL

console.log('[API Client] Initialized with API_BASE:', API_BASE)

export function configureClient(options: {
  getAccessToken: () => string | null
  getRefreshToken: () => string | null
  onRefreshSuccess: (tokens: { access_token: string; refresh_token: string }) => void
  onAuthFailure: () => void
}) {
  getAccessToken = options.getAccessToken
  getRefreshToken = options.getRefreshToken
  onRefreshSuccess = options.onRefreshSuccess
  onAuthFailure = options.onAuthFailure
  console.log('[API Client] Client configured')
}

async function parseBody(res: Response): Promise<unknown> {
  const text = await res.text()
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

let refreshingPromise: Promise<string | null> | null = null

async function refreshAccessToken(): Promise<string | null> {
  const token = getRefreshToken?.()
  if (!token) return null

  const res = await fetch(`${API_BASE}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  })

  if (!res.ok) return null

  const data = (await parseBody(res)) as { access_token: string; refresh_token: string }
  onRefreshSuccess?.(data)
  return data.access_token
}

export async function request<T = unknown>(
  path: string,
  options: RequestInit & { authenticated?: boolean } = {},
): Promise<T> {
  const { authenticated = true, ...init } = options

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string>),
  }

  if (authenticated && getAccessToken) {
    const token = getAccessToken()
    if (token) headers['Authorization'] = `Bearer ${token}`
  }

  let res = await fetch(`${API_BASE}${path}`, { ...init, headers })

  // Attempt token refresh on 401 for authenticated requests.
  if (res.status === 401 && authenticated) {
    if (!refreshingPromise) {
      refreshingPromise = refreshAccessToken().finally(() => {
        refreshingPromise = null
      })
    }

    const newToken = await refreshingPromise

    if (!newToken) {
      onAuthFailure?.()
      throw new HttpError(401, await parseBody(res))
    }

    headers['Authorization'] = `Bearer ${newToken}`
    res = await fetch(`${API_BASE}${path}`, { ...init, headers })

    if (res.status === 401) {
      onAuthFailure?.()
      throw new HttpError(401, await parseBody(res))
    }
  }

  const body = await parseBody(res)

  if (!res.ok) {
    throw new HttpError(res.status, body)
  }

  return body as T
}

/**
 * Get the current access token value.
 * Used by WebSocket composables to build authenticated WS URLs.
 * Returns null if no token is available.
 */
export function getAccessTokenValue(): string | null {
  return getAccessToken?.() ?? null
}

/**
 * Build a WebSocket URL by converting the API base URL scheme.
 * Converts http:// → ws:// and https:// → wss://.
 * Handles both absolute URLs (http://...) and relative paths (/api).
 * Path should start with / (e.g., "/radar/open/123").
 */
export function getWsUrl(path: string): string {
  if (!API_BASE) {
    const err = 'API_BASE is not configured'
    console.error('[getWsUrl]', err)
    throw new Error(err)
  }

  let wsBase: string

  // If API_BASE is absolute (e.g., "http://localhost:3000"), convert to ws://
  if (API_BASE.startsWith('http://') || API_BASE.startsWith('https://')) {
    wsBase = API_BASE.replace(/^https?:/, (match: string) => {
      const replacement = match === 'https:' ? 'wss:' : 'ws:'
      console.debug(`[getWsUrl] Converted "${match}" → "${replacement}"`)
      return replacement
    })
  } else if (API_BASE.startsWith('/')) {
    // If API_BASE is relative (e.g., "/api"), use same origin as the frontend
    // This works when behind a reverse proxy (Caddy) that proxies /api to the backend
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    wsBase = `${protocol}//${window.location.host}`
    console.debug('[getWsUrl] API_BASE is relative, using same origin:', wsBase)
  } else {
    const err = `Invalid API_BASE format: ${API_BASE}`
    console.error('[getWsUrl]', err)
    throw new Error(err)
  }

  const fullUrl = `${wsBase}${path}`
  console.log(`[getWsUrl] Full WebSocket URL: ${fullUrl.replace(/token=[^&]*/, 'token=***')}`)
  return fullUrl
}
