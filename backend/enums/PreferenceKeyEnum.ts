export enum PreferenceKeyEnum {
    DISABLE_REGISTRATION = 'disable_registration',
    FLIGHTAWARE_API_KEY = 'flightaware_api_key',
    FLIGHTAWARE_ALLOW_OVER_LIMIT = 'flightaware_allow_over_limit',
    FLIGHTAWARE_LIMIT_REACHED_MONTH = 'flightaware_limit_reached_month',
    FLIGHTAWARE_USAGE_CHECKED_AT_COUNT = 'flightaware_usage_checked_at_count',
    FLIGHTAWARE_USAGE_CHECKED_MONTH = 'flightaware_usage_checked_month',
    INITIALIZED = 'initialized',
    OPEN_SKY_API_KEY = 'opensky_network_api_key',
    OPEN_SKY_DAILY_THRESHOLD = 'opensky_network_daily_threshold',
    OPEN_SKY_BLOCKED_UNTIL = 'opensky_network_blocked_until',
    PASSWORD_RECOVERY_AVAILABLE = 'password_recovery_available',
    SUPERUSER = 'superuser',
}

import {PreferenceTypeEnum} from './PreferenceTypeEnum.ts';

export const PreferenceKeyToType: Record<PreferenceKeyEnum, PreferenceTypeEnum> = {
    [PreferenceKeyEnum.DISABLE_REGISTRATION]: PreferenceTypeEnum.BOOLEAN,
    [PreferenceKeyEnum.FLIGHTAWARE_API_KEY]: PreferenceTypeEnum.STRING,
    [PreferenceKeyEnum.FLIGHTAWARE_ALLOW_OVER_LIMIT]: PreferenceTypeEnum.BOOLEAN,
    [PreferenceKeyEnum.FLIGHTAWARE_LIMIT_REACHED_MONTH]: PreferenceTypeEnum.STRING,
    [PreferenceKeyEnum.FLIGHTAWARE_USAGE_CHECKED_AT_COUNT]: PreferenceTypeEnum.NUMBER,
    [PreferenceKeyEnum.FLIGHTAWARE_USAGE_CHECKED_MONTH]: PreferenceTypeEnum.STRING,
    [PreferenceKeyEnum.INITIALIZED]: PreferenceTypeEnum.BOOLEAN,
    [PreferenceKeyEnum.OPEN_SKY_API_KEY]: PreferenceTypeEnum.STRING,
    [PreferenceKeyEnum.PASSWORD_RECOVERY_AVAILABLE]: PreferenceTypeEnum.BOOLEAN,
    [PreferenceKeyEnum.SUPERUSER]: PreferenceTypeEnum.BOOLEAN,
    [PreferenceKeyEnum.OPEN_SKY_DAILY_THRESHOLD]: PreferenceTypeEnum.NUMBER,
    [PreferenceKeyEnum.OPEN_SKY_BLOCKED_UNTIL]: PreferenceTypeEnum.STRING,
};

export const PreferenceUserCanSet = [
    PreferenceKeyEnum.FLIGHTAWARE_API_KEY,
    PreferenceKeyEnum.FLIGHTAWARE_ALLOW_OVER_LIMIT,
    PreferenceKeyEnum.OPEN_SKY_API_KEY,
    PreferenceKeyEnum.OPEN_SKY_DAILY_THRESHOLD
]
