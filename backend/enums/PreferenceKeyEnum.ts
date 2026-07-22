export enum PreferenceKeyEnum {
    DISABLE_REGISTRATION = 'disable_registration',
    FLIGHTAWARE_API_KEY = 'flightaware_api_key',
    INITIALIZED = 'initialized',
    OPEN_SKY_API_KEY = 'opensky_network_api_key',
    OPEN_SKY_DAILY_THRESHOLD = 'opensky_network_daily_threshold',
    PASSWORD_RECOVERY_AVAILABLE = 'password_recovery_available',
    SUPERUSER = 'superuser',
}

import {PreferenceTypeEnum} from './PreferenceTypeEnum.ts';

export const PreferenceKeyToType: Record<PreferenceKeyEnum, PreferenceTypeEnum> = {
    [PreferenceKeyEnum.DISABLE_REGISTRATION]: PreferenceTypeEnum.BOOLEAN,
    [PreferenceKeyEnum.FLIGHTAWARE_API_KEY]: PreferenceTypeEnum.STRING,
    [PreferenceKeyEnum.INITIALIZED]: PreferenceTypeEnum.BOOLEAN,
    [PreferenceKeyEnum.OPEN_SKY_API_KEY]: PreferenceTypeEnum.STRING,
    [PreferenceKeyEnum.PASSWORD_RECOVERY_AVAILABLE]: PreferenceTypeEnum.BOOLEAN,
    [PreferenceKeyEnum.SUPERUSER]: PreferenceTypeEnum.BOOLEAN,
    [PreferenceKeyEnum.OPEN_SKY_DAILY_THRESHOLD]: PreferenceTypeEnum.NUMBER,
};

export const PreferenceUserCanSet = [
    PreferenceKeyEnum.FLIGHTAWARE_API_KEY,
    PreferenceKeyEnum.OPEN_SKY_API_KEY,
    PreferenceKeyEnum.OPEN_SKY_DAILY_THRESHOLD
]
