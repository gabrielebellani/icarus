export enum PreferenceKeyEnum {
    COORDINATES = 'coordinates',
    DEFAULT_DISPLAY_MODE = 'default_display_mode',
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
    [PreferenceKeyEnum.DEFAULT_DISPLAY_MODE]: PreferenceTypeEnum.STRING,
    [PreferenceKeyEnum.DISABLE_REGISTRATION]: PreferenceTypeEnum.BOOLEAN,
    [PreferenceKeyEnum.FLIGHTAWARE_API_KEY]: PreferenceTypeEnum.STRING,
    [PreferenceKeyEnum.INITIALIZED]: PreferenceTypeEnum.BOOLEAN,
    [PreferenceKeyEnum.OPEN_SKY_API_KEY]: PreferenceTypeEnum.STRING,
    [PreferenceKeyEnum.RADIUS]: PreferenceTypeEnum.NUMBER,
    [PreferenceKeyEnum.SUPERUSER]: PreferenceTypeEnum.BOOLEAN,
};

