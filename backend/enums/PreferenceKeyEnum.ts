export enum PreferenceKeyEnum {
    COORDINATES = 'coordinates',
    DISABLE_REGISTRATION = 'disable_registration',
    FLIGHTAWARE_API_KEY = 'flightaware_api_key',
    INITIALIZED = 'initialized',
    OPEN_SKY_API_KEY = 'opensky_network_api_key',
    RADIUS = 'radius',
    SUPERUSER = 'superuser',
}

import {PreferenceTypeEnum} from './PreferenceTypeEnum.ts';

export const PreferenceKeyToType: Record<PreferenceKeyEnum, PreferenceTypeEnum> = {
    [PreferenceKeyEnum.COORDINATES]: PreferenceTypeEnum.JSON,
    [PreferenceKeyEnum.DISABLE_REGISTRATION]: PreferenceTypeEnum.BOOLEAN,
    [PreferenceKeyEnum.FLIGHTAWARE_API_KEY]: PreferenceTypeEnum.STRING,
    [PreferenceKeyEnum.INITIALIZED]: PreferenceTypeEnum.BOOLEAN,
    [PreferenceKeyEnum.OPEN_SKY_API_KEY]: PreferenceTypeEnum.STRING,
    [PreferenceKeyEnum.RADIUS]: PreferenceTypeEnum.NUMBER,
    [PreferenceKeyEnum.SUPERUSER]: PreferenceTypeEnum.BOOLEAN,
};

export const PreferenceUserCanSet = [
    PreferenceKeyEnum.COORDINATES,
    PreferenceKeyEnum.FLIGHTAWARE_API_KEY,
    PreferenceKeyEnum.OPEN_SKY_API_KEY,
    PreferenceKeyEnum.RADIUS,
]
