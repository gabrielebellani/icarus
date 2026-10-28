import {afterEach, beforeEach, describe, expect, mock, setSystemTime, test} from 'bun:test';
import {FlightawareService} from '../services/flightaware.service.ts';
import {PreferencesRepository} from '../repositories/preferences.repository.ts';
import {PreferenceKeyEnum} from '../enums/PreferenceKeyEnum.ts';
import {ThirdPartyServiceEnum} from '../enums/ThirdPartyServiceEnum.ts';
import {ThirdPartyQuotaExceededError} from '../errors/ThirdPartyQuotaExceededError.ts';
import {mockProviders, resetDb, seedRequestCount} from './helpers.ts';

const USER_ID = 1;
const FLIGHTS = 'aeroapi.flightaware.com/aeroapi/flights/';
const USAGE = 'aeroapi.flightaware.com/aeroapi/account/usage';

const flightAware = () => new FlightawareService('test-key', USER_ID);
const searchFlight = () => flightAware().fetchFlightInfo('AZ610', new Date());

function mockFlightAware(monthlyCostUsd: number) {
    return mockProviders({[FLIGHTS]: {flights: []}, [USAGE]: {total_cost: monthlyCostUsd}});
}

beforeEach(() => {
    resetDb();
    setSystemTime(new Date('2026-10-15T12:00:00Z'));
});

afterEach(() => {
    mock.restore();
    setSystemTime();
});

describe('FlightAware monthly budget', () => {
    test('does not check the real cost before 50 requests have been made', async () => {
        const provider = mockFlightAware(1);
        seedRequestCount(ThirdPartyServiceEnum.FLIGHTAWARE, USER_ID, 49);

        await searchFlight();

        expect(provider.requestedUrls()).toEqual([expect.stringContaining(FLIGHTS)]);
    });

    test('checks the real cost every 50 requests and keeps going while under budget', async () => {
        const provider = mockFlightAware(1);
        seedRequestCount(ThirdPartyServiceEnum.FLIGHTAWARE, USER_ID, 50);

        await searchFlight();
        await searchFlight();

        expect(provider.requestedUrls()).toEqual([
            expect.stringContaining(USAGE),
            expect.stringContaining(FLIGHTS),
            expect.stringContaining(FLIGHTS),
        ]);
    });

    test('blocks every call for the rest of the month once the cost reaches $4.90', async () => {
        const provider = mockFlightAware(4.9);
        seedRequestCount(ThirdPartyServiceEnum.FLIGHTAWARE, USER_ID, 50);

        await expect(searchFlight()).rejects.toBeInstanceOf(ThirdPartyQuotaExceededError);
        await expect(searchFlight()).rejects.toBeInstanceOf(ThirdPartyQuotaExceededError);

        expect(provider.requestedUrls()).toEqual([expect.stringContaining(USAGE)]);
        expect(PreferencesRepository.getPreference(PreferenceKeyEnum.FLIGHTAWARE_LIMIT_REACHED_MONTH, USER_ID)?.value)
            .toBe('2026-10');
    });

    test('lets the user opt in to exceed the monthly limit', async () => {
        mockFlightAware(6);
        PreferencesRepository.setPreference(PreferenceKeyEnum.FLIGHTAWARE_LIMIT_REACHED_MONTH, USER_ID, '2026-10');
        PreferencesRepository.setPreference(PreferenceKeyEnum.FLIGHTAWARE_ALLOW_OVER_LIMIT, USER_ID, true);

        expect(await searchFlight()).toEqual({flights: []});
    });

    test('unblocks calls when a new month starts', async () => {
        mockFlightAware(0);
        PreferencesRepository.setPreference(PreferenceKeyEnum.FLIGHTAWARE_LIMIT_REACHED_MONTH, USER_ID, '2026-10');

        setSystemTime(new Date('2026-11-02T12:00:00Z'));

        expect(await searchFlight()).toEqual({flights: []});
    });

    test('always allows reading the current usage, even when blocked', async () => {
        mockFlightAware(4.95);
        PreferencesRepository.setPreference(PreferenceKeyEnum.FLIGHTAWARE_LIMIT_REACHED_MONTH, USER_ID, '2026-10');

        expect(await flightAware().fetchUsage()).toEqual({total_cost: 4.95});
    });
});
