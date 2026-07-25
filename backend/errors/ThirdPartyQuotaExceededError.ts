import {ThirdPartyServiceEnum} from "../enums/ThirdPartyServiceEnum.ts";

export class ThirdPartyQuotaExceededError extends Error {
    constructor(public readonly service: ThirdPartyServiceEnum, message: string) {
        super(message);
        this.name = 'ThirdPartyQuotaExceededError';
    }
}
