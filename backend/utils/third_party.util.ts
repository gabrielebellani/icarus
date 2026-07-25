import {PreferencesRepository} from "../repositories/preferences.repository.ts";
import {PreferenceKeyEnum} from "../enums/PreferenceKeyEnum.ts";

export function getOpenSkyKey(userId: number): string|null{
    return PreferencesRepository.getPreference(PreferenceKeyEnum.OPEN_SKY_API_KEY, userId)?.value ?? null
}

export function getFlightawareKey(userId: number): string|null{
    return PreferencesRepository.getPreference(PreferenceKeyEnum.FLIGHTAWARE_API_KEY, userId)?.value ?? null
}
