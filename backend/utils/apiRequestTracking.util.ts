import {formatISO} from "date-fns";
import {ApiRequestTrackingRepository} from "../repositories/apiRequestTracking.repository.ts";
import {ThirdPartyServiceEnum} from "../enums/ThirdPartyServiceEnum.ts";

/**
 * Tracks a request made to a third-party service, incrementing today's counter for the given
 * user and service. This is fire-and-forget: it never blocks nor throws to the caller, so the
 * client response is never delayed or affected by the outcome of this tracking update.
 */
export function trackApiRequest(service: ThirdPartyServiceEnum, userId: number): void {
    queueMicrotask(() => {
        try {
            const today = formatISO(new Date(), {representation: 'date'});
            ApiRequestTrackingRepository.incrementRequestCount(service, userId, today);
        } catch (error) {
            console.error(`[ApiRequestTracking] Failed to track request for service "${service}" and user ${userId}:`, error);
        }
    });
}
