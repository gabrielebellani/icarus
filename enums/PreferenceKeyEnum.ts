export enum PreferenceKeyEnum {
    SUPERUSER ='superuser',
    OPEN_SKY_API_KEY = 'opensky_network_api_key',
    COORDINATES = 'coordinates',
    RADIUS = 'radius',
    DEFAULT_DISPLAY_MODE = 'default_display_mode',
    DISABLE_REGISTRATION = 'disable_registration',
    INITIALIZED = 'initialized'
}

import { PreferenceTypeEnum } from './PreferenceTypeEnum.ts';

export const PreferenceKeyToType: Record<PreferenceKeyEnum, PreferenceTypeEnum> = {
    [PreferenceKeyEnum.SUPERUSER]:           PreferenceTypeEnum.BOOLEAN,
    [PreferenceKeyEnum.OPEN_SKY_API_KEY]:    PreferenceTypeEnum.STRING,
    [PreferenceKeyEnum.COORDINATES]:         PreferenceTypeEnum.JSON,
    [PreferenceKeyEnum.RADIUS]:              PreferenceTypeEnum.NUMBER,
    [PreferenceKeyEnum.DEFAULT_DISPLAY_MODE]:PreferenceTypeEnum.STRING,
    [PreferenceKeyEnum.DISABLE_REGISTRATION]:PreferenceTypeEnum.BOOLEAN,
    [PreferenceKeyEnum.INITIALIZED]:         PreferenceTypeEnum.BOOLEAN,
};

