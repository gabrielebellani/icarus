import type { PreferenceKeyEnum } from "../enums/PreferenceKeyEnum.ts";
import { PreferenceKeyToType } from "../enums/PreferenceKeyEnum.ts";
import { PreferenceTypeEnum } from "../enums/PreferenceTypeEnum.ts";

export class Preference {

    id?: number;
    user_id: number;
    key: PreferenceKeyEnum;
    type: PreferenceTypeEnum;
    value: any;

    constructor(user_id: number, key: PreferenceKeyEnum, value: any, id?: number) {
        this.user_id = user_id;
        this.key = key;
        this.type = PreferenceKeyToType[key];
        this.value = Preference.castValue(value, this.type);
        if (id) {
            this.id = id;
        }
    }

    private static castValue(raw: any, type: PreferenceTypeEnum): any {
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

    static fromDB(row: any): Preference {
        return new Preference(row.user_id, row.key, row.value, row.id);
    }

    static fromDBBulk(rows: any[]): Preference[] {
        return rows.map(row => Preference.fromDB(row));
    }
}
