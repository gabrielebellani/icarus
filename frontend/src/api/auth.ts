import { request } from './client'

export interface AuthTokens {
  access_token: string
  refresh_token: string
}

export interface InitStatus {
  requires_initialization: boolean
}

export function login(payload: { username: string; password: string }): Promise<AuthTokens> {
  return request<AuthTokens>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
    authenticated: false,
  })
}

export function register(payload: {
  username: string
  email: string
  password: string
}): Promise<AuthTokens> {
  return request<AuthTokens>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
    authenticated: false,
  })
}

export function recovery(payload: { username: string }): Promise<{ message: string }> {
  return request<{ message: string }>('/auth/recovery', {
    method: 'POST',
    body: JSON.stringify(payload),
    authenticated: false,
  })
}

export function resetPassword(payload: {
  token: string
  new_password: string
}): Promise<{ message: string }> {
  return request<{ message: string }>('/auth/reset', {
    method: 'POST',
    body: JSON.stringify(payload),
    authenticated: false,
  })
}

export function fetchInitStatus(): Promise<InitStatus> {
  return request<InitStatus>('/auth/init')
}

export function initializeUser(payload: {
  openSkyNetworkKey: string
  flightawareApiKey?: string
  display_mode: string
}): Promise<{ message: string }> {
  return request<{ message: string }>('/auth/init', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}
