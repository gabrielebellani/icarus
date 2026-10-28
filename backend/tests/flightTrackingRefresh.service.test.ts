import {afterEach, beforeEach, describe, expect, mock, setSystemTime, test} from 'bun:test';
import {FlightTrackingRefreshService} from '../services/flightTrackingRefresh.service.ts';
import {PreferencesRepository} from '../repositories/preferences.repository.ts';
import {PreferenceKeyEnum} from '../enums/PreferenceKeyEnum.ts';
import {db} from '../db.ts';
import {mockProviders, resetDb} from './helpers.ts';

const USER_ID = 1;
const NOW = new Date('2026-10-28T15:00:00Z');

const ADSB_LOL_BY_REGISTRATION = 'api.adsb.lol/api/v2/registration/';
const ADSB_LOL_BY_ICAO24 = 'api.adsb.lol/api/v2/icao/';
const OPENSKY = 'opensky-network.org/api/states/all';
const FLIGHTAWARE = 'aeroapi.flightaware.com';

const NO_ADSB_DATA = {
    [ADSB_LOL_BY_REGISTRATION]: {ac: []},
    [ADSB_LOL_BY_ICAO24]: {ac: []},
    [OPENSKY]: {states: null},
};

const minutesFromNow = (minutes: number) => NOW.getTime() + minutes * 60_000;
const isoMinutesFromNow = (minutes: number) => new Date(minutesFromNow(minutes)).toISOString();

const airborneFlight = {
    ident_iata: 'AZ610',
    registration: 'EI-DEO',
    scheduled_out: isoMinutesFromNow(-70),
    actual_off: isoMinutesFromNow(-60),
    estimated_on: isoMinutesFromNow(60),
};

const groundFlight = {
    ident_iata: 'AZ610',
    registration: 'EI-DEO',
    scheduled_out: isoMinutesFromNow(5),
    scheduled_off: isoMinutesFromNow(15),
    scheduled_on: isoMinutesFromNow(75),
};

function trackFlight(payload: object, state: {
    phase: string,
    lastAdsbAt: number | null,
    lastFlightawareAt: number | null,
    degradedMode?: boolean,
}) {
    db.run(
        `INSERT INTO tracked_flights (user_id, reference_date, payload, icao24, phase, last_adsb_at, last_flightaware_at, degraded_mode)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [USER_ID, '2026-10-28', JSON.stringify(payload), '4ca7b5', state.phase, state.lastAdsbAt, state.lastFlightawareAt, state.degradedMode ? 1 : 0]
    );
}

const refresh = () => FlightTrackingRefreshService.refreshTrackedFlight(USER_ID);
const flightAwareCalls = (urls: string[]) => urls.filter(url => url.includes(FLIGHTAWARE));

beforeEach(() => {
    resetDb();
    setSystemTime(NOW);
    PreferencesRepository.setPreference(PreferenceKeyEnum.FLIGHTAWARE_API_KEY, USER_ID, 'test-key');
});

afterEach(() => {
    mock.restore();
    setSystemTime();
});

describe('flight tracking refresh', () => {
    test('makes no calls when the last ADS-B poll is less than a minute old', async () => {
        const provider = mockProviders({});
        trackFlight(airborneFlight, {phase: 'airborne', lastAdsbAt: minutesFromNow(-0.5), lastFlightawareAt: minutesFromNow(-30)});

        await refresh();

        expect(provider.requestedUrls()).toEqual([]);
    });

    test('uses adsb.lol when it knows the aircraft, without calling FlightAware', async () => {
        const provider = mockProviders({[ADSB_LOL_BY_REGISTRATION]: {ac: [{gs: 450, alt_baro: 35000}]}});
        trackFlight(airborneFlight, {phase: 'airborne', lastAdsbAt: minutesFromNow(-2), lastFlightawareAt: minutesFromNow(-30)});

        const row = await refresh();

        expect(row?.data_source).toBe('adsb.lol');
        expect(row?.degraded_mode).toBe(0);
        expect(provider.requestedUrls()).toEqual([expect.stringContaining(ADSB_LOL_BY_REGISTRATION)]);
    });

    test('falls back to OpenSky when adsb.lol has no data', async () => {
        const openSkyState = ['4ca7b5', 'AZA610', 'Ireland', 0, 0, 9.5, 45.2, 10500, false, 230, 90, 0, null, 10600, null, false, 0];
        const provider = mockProviders({...NO_ADSB_DATA, [OPENSKY]: {states: [openSkyState]}});
        trackFlight(airborneFlight, {phase: 'airborne', lastAdsbAt: minutesFromNow(-2), lastFlightawareAt: minutesFromNow(-30)});

        const row = await refresh();

        expect(row?.data_source).toBe('opensky');
        expect(flightAwareCalls(provider.requestedUrls())).toEqual([]);
    });

    test('calls FlightAware when every ADS-B source is down, and enters degraded mode', async () => {
        const provider = mockProviders({...NO_ADSB_DATA, [FLIGHTAWARE]: {flights: [airborneFlight]}});
        trackFlight(airborneFlight, {phase: 'airborne', lastAdsbAt: minutesFromNow(-2), lastFlightawareAt: minutesFromNow(-10)});

        const row = await refresh();

        expect(row?.data_source).toBe('flightaware');
        expect(row?.degraded_mode).toBe(1);
        expect(flightAwareCalls(provider.requestedUrls())).toHaveLength(1);
    });

    test('in degraded mode, keeps retrying ADS-B but waits 5 minutes between FlightAware calls', async () => {
        const provider = mockProviders({...NO_ADSB_DATA, [FLIGHTAWARE]: {flights: [airborneFlight]}});
        trackFlight(airborneFlight, {phase: 'airborne', lastAdsbAt: minutesFromNow(-6), lastFlightawareAt: minutesFromNow(-2), degradedMode: true});

        await refresh();

        expect(provider.requestedUrls()).toEqual([
            expect.stringContaining(ADSB_LOL_BY_REGISTRATION),
            expect.stringContaining(ADSB_LOL_BY_ICAO24),
            expect.stringContaining(OPENSKY),
        ]);
    });

    test('refreshes from FlightAware when ADS-B detects the takeoff', async () => {
        const takenOff = {...groundFlight, actual_off: isoMinutesFromNow(-1)};
        const provider = mockProviders({
            [ADSB_LOL_BY_REGISTRATION]: {ac: [{gs: 160, alt_baro: 2000}]},
            [FLIGHTAWARE]: {flights: [takenOff]},
        });
        trackFlight(groundFlight, {phase: 'ground', lastAdsbAt: minutesFromNow(-2), lastFlightawareAt: minutesFromNow(-30)});

        const row = await refresh();

        expect(row?.phase).toBe('airborne');
        expect(row?.data_source).toBe('flightaware');
        expect(flightAwareCalls(provider.requestedUrls())).toHaveLength(1);
    });
});
