import { request } from './client'

export interface AppConfig {
  registration_disabled: boolean
}

export function fetchConfig(): Promise<AppConfig> {
  return request<AppConfig>('/config', { authenticated: false })
}
