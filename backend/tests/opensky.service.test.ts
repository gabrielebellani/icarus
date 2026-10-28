import {afterEach, beforeEach, describe, expect, mock, setSystemTime, test} from 'bun:test';
import {OpenSkyService} from '../services/opensky.service.ts';
import {PreferencesRepository} from '../repositories/preferences.repository.ts';
import {ApiRequestTrackingRepository} from '../repositories/apiRequestTracking.repository.ts';
import {PreferenceKeyEnum} from '../enums/PreferenceKeyEnum.ts';
import {ThirdPartyServiceEnum} from '../enums/ThirdPartyServiceEnum.ts';
import {ThirdPartyQuotaExceededError} from '../errors/ThirdPartyQuotaExceededError.ts';
import {mockProviders, resetDb, seedRequestCount} from './helpers.ts';

const USER_ID = 1;
const NOW = new Date('2026-10-28T15:00:00Z');
const BOUNDING_BOX = {lamin: 45, lomin: 8, lamax: 46, lomax: 9};

let provider: ReturnType<typeof mockProviders>;
const openSky = () => new OpenSkyService(null, USER_ID);

beforeEach(() => {
    resetDb();
    setSystemTime(NOW);
    provider = mockProviders({'opensky-network.org/api/states/all': {states: []}});
});

afterEach(() => {
    mock.restore();
    setSystemTime();
});

describe('OpenSky daily quota', () => {
    test('calls OpenSky while under the default threshold of 400 requests', async () => {
        seedRequestCount(ThirdPartyServiceEnum.OPENSKY, USER_ID, 398);

        await openSky().fetchAircraftInArea(BOUNDING_BOX);

        expect(provider.requestedUrls()).toHaveLength(1);
    });

    test('counts every request made to OpenSky', async () => {
        await openSky().fetchAircraftInArea(BOUNDING_BOX);

        const today = NOW.toISOString().slice(0, 10);
        expect(ApiRequestTrackingRepository.getRequestCount(ThirdPartyServiceEnum.OPENSKY, USER_ID, today, today)).toBe(1);
    });

    test('blocks one request before the threshold and pauses calls until 01:00 UTC', async () => {
        seedRequestCount(ThirdPartyServiceEnum.OPENSKY, USER_ID, 399);

        await expect(openSky().fetchAircraftInArea(BOUNDING_BOX)).rejects.toBeInstanceOf(ThirdPartyQuotaExceededError);

        expect(provider.requestedUrls()).toHaveLength(0);
        expect(PreferencesRepository.getPreference(PreferenceKeyEnum.OPEN_SKY_BLOCKED_UNTIL, USER_ID)?.value)
            .toBe('2026-10-29T01:00:00.000Z');
    });

    test('stays blocked until the pause expires, then resumes', async () => {
        PreferencesRepository.setPreference(PreferenceKeyEnum.OPEN_SKY_BLOCKED_UNTIL, USER_ID, '2026-10-29T01:00:00.000Z');

        await expect(openSky().fetchAircraftInArea(BOUNDING_BOX)).rejects.toBeInstanceOf(ThirdPartyQuotaExceededError);

        setSystemTime(new Date('2026-10-29T01:00:01Z'));
        await openSky().fetchAircraftInArea(BOUNDING_BOX);

        expect(provider.requestedUrls()).toHaveLength(1);
    });

    test('uses the threshold configured by the user', async () => {
        PreferencesRepository.setPreference(PreferenceKeyEnum.OPEN_SKY_DAILY_THRESHOLD, USER_ID, 50);
        seedRequestCount(ThirdPartyServiceEnum.OPENSKY, USER_ID, 49);

        await expect(openSky().fetchAircraftInArea(BOUNDING_BOX)).rejects.toBeInstanceOf(ThirdPartyQuotaExceededError);
    });

    test('keeps a separate quota for each user', async () => {
        seedRequestCount(ThirdPartyServiceEnum.OPENSKY, 2, 399);

        await openSky().fetchAircraftInArea(BOUNDING_BOX);

        expect(provider.requestedUrls()).toHaveLength(1);
    });
});
