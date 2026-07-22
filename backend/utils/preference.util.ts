import {PreferenceTypeEnum} from "../enums/PreferenceTypeEnum.ts";

export function castValue(raw: any, type: PreferenceTypeEnum): any {
    if (raw === null || raw === undefined) return null;
    switch (type) {
        case PreferenceTypeEnum.BOOLEAN:
            return raw === true || raw === 1 || raw === '1' || raw === 'true';
        case PreferenceTypeEnum.NUMBER:
            return Number(raw);
        case PreferenceTypeEnum.JSON:
            if (typeof raw === 'string') {
                try { return JSON.parse(raw); } catch { return null; }
            }
            return raw;
        case PreferenceTypeEnum.STRING:
        default:
            return String(raw);
    }
}
