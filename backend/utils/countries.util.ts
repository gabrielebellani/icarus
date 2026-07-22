import countries_codes from '../jsons/countries_codes.json'
import type { CountryCode } from '../types/CountryCode.ts'

interface Country {
  name: string
  dial_code: string
  code: CountryCode
  flag: string
}

const data: Country[] = countries_codes as Country[]

export function getCountryNameByCode(code: string): string {
  const lowerCaseCode = code.toLowerCase() as CountryCode
  const result = data.find((country) => country.code.toLowerCase() === lowerCaseCode)
  return result?.name ?? ''
}

export function getCountryEmojiFlagByCode(code: string): string {
  const lowerCaseCode = code.toLowerCase() as CountryCode
  const result = data.find((country) => country.code.toLowerCase() === lowerCaseCode)
  return result?.flag ?? '🌐'
}
