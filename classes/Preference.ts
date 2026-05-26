import type {PreferenceKeyEnum} from "../enums/PreferenceKeyEnum.ts";

export class Preference {

    id?: number;
    user_id: number;
    key: PreferenceKeyEnum;
    value: any;

    constructor(user_id: number, key: PreferenceKeyEnum, value: any, id?: number) {
        this.user_id = user_id;
        this.key = key;
        this.value = value;
        if (id) {
            this.id = id;
        }
    }

    static fromDB(row: any): Preference {
        return new Preference(row.user_id, row.key, row.value, row.id);
    }

    static fromDBBulk(rows: any[]): Preference[] {
        return rows.map(row => Preference.fromDB(row));
    }
}
