import type {PreferenceKeyEnum} from "../enums/PreferenceKeyEnum.ts";
import {PreferenceKeyToType} from "../enums/PreferenceKeyEnum.ts";
import {PreferenceTypeEnum} from "../enums/PreferenceTypeEnum.ts";
import {castValue} from "../utils/preference.util.ts";

export class AppPreference {

    id?: number;
    user_id: null
    key: PreferenceKeyEnum;
    type: PreferenceTypeEnum;
    value: any;

    constructor(key: PreferenceKeyEnum, value: any, user_id: null = null, id?: number) {
        this.user_id = user_id;
        this.key = key;
        this.type = PreferenceKeyToType[key];
        this.value = castValue(value, this.type);
        if (id) {
            this.id = id;
        }
    }

    static fromDB(row: any): AppPreference {
        return new this(row.key, row.value, row.user_id, row.id);
    }

    static fromDBBulk(rows: any[]): AppPreference[] {
        return rows.map(row => this.fromDB(row));
    }
}
