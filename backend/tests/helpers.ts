import {spyOn} from 'bun:test';
import {formatISO} from 'date-fns';
import {db} from '../db.ts';
import type {ThirdPartyServiceEnum} from '../enums/ThirdPartyServiceEnum.ts';

export function resetDb() {
    for (const table of ['preferences', 'third_party_api_requests', 'tracked_flights', 'cached_routes', 'cached_icao24']) {
        db.run(`DELETE FROM ${table}`);
    }
}

export function seedRequestCount(service: ThirdPartyServiceEnum, userId: number, requests: number, date = new Date()) {
    db.run(
        'INSERT INTO third_party_api_requests (service, user_id, date, requests) VALUES (?, ?, ?, ?)',
        [service, userId, formatISO(date, {representation: 'date'}), requests]
    );
}

/**
 * Replaces global fetch: a request whose URL contains one of the keys gets that value back as JSON,
 * anything else gets a 404. Returns the mock so tests can inspect which URLs were requested.
 */
export function mockProviders(responses: Record<string, unknown>) {
    const fetchMock = spyOn(globalThis, 'fetch').mockImplementation((async (input: string | URL | Request) => {
        const url = String(input);
        const match = Object.keys(responses).find(fragment => url.includes(fragment));
        return match ? Response.json(responses[match]) : new Response('Not found', {status: 404});
    }) as typeof fetch);

    return {
        requestedUrls: () => fetchMock.mock.calls.map(([input]) => String(input)),
    };
}
