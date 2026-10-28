import {afterEach, beforeEach, describe, expect, mock, test} from 'bun:test';
import {RadarDataService} from '../services/radarData.service.ts';
import {RadarInstance} from '../classes/RadarInstance.ts';
import {RadarCommercialFlight} from '../classes/RadarCommercialFlight.ts';
import {RadarRepository} from '../repositories/radar.repository.ts';
import {PreferencesRepository} from '../repositories/preferences.repository.ts';
import {PreferenceKeyEnum} from '../enums/PreferenceKeyEnum.ts';
import {mockProviders, resetDb} from './helpers.ts';

const USER_ID = 1;
const MALPENSA = {latitude: 45.63, longitude: 8.72};
const radar = new RadarInstance(1, MALPENSA, 50, null, 30, null, 'Malpensa', new Date(), null, null);

const OPENSKY = 'opensky-network.org/api/states/all';
const ADSB_LOL_ROUTES = 'api.adsb.lol/api/0/routeset';
const FLIGHTAWARE = 'aeroapi.flightaware.com';

function openSkyState(icao24: string, callsign: string, kmNorthOfRadar: number) {
    const latitude = MALPENSA.latitude + kmNorthOfRadar / 111.32;
    return [icao24, callsign, 'Italy', 0, 0, MALPENSA.longitude, latitude, 3000, false, 120, 0, 0, null, 3100, null, false, 0];
}

const getFlightsInArea = () => RadarDataService.getFlightsInArea(radar, USER_ID, null);

beforeEach(() => {
    resetDb();
    PreferencesRepository.setPreference(PreferenceKeyEnum.FLIGHTAWARE_API_KEY, USER_ID, 'test-key');
});

afterEach(() => {
    mock.restore();
});

describe('radar data', () => {
    test('returns aircraft inside the radius, nearest first', async () => {
        mockProviders({
            [OPENSKY]: {
                states: [
                    openSkyState('aaaaaa', 'FAR1', 40),
                    openSkyState('bbbbbb', 'NEAR1', 5),
                    openSkyState('cccccc', 'OUT1', 80),
                ],
            },
        });

        const aircraft = await getFlightsInArea();

        expect(aircraft.map(a => a.adsb_state.callsign)).toEqual(['NEAR1', 'FAR1']);
    });

    test('serves cached routes without calling any route provider', async () => {
        RadarRepository.persistRoute(new RadarCommercialFlight('AZA1', null, null, null, 'matched'));
        RadarRepository.persistRoute(new RadarCommercialFlight('AZA2', null, null, null, 'matched'));
        const provider = mockProviders({
            [OPENSKY]: {states: [openSkyState('aaaaaa', 'AZA1', 5), openSkyState('bbbbbb', 'AZA2', 10)]},
        });

        await getFlightsInArea();

        expect(provider.requestedUrls().filter(url => url.includes(ADSB_LOL_ROUTES) || url.includes(FLIGHTAWARE))).toEqual([]);
    });

    test('asks FlightAware only for the callsigns adsb.lol does not know', async () => {
        const provider = mockProviders({
            [OPENSKY]: {states: [openSkyState('aaaaaa', 'AZA1', 5), openSkyState('bbbbbb', 'RYR2', 10)]},
            [ADSB_LOL_ROUTES]: [{callsign: 'AZA1', _airports: [{icao: 'LIRF'}, {icao: 'LIMC'}], airline_code: 'AZA', plausible: true}],
            [FLIGHTAWARE]: {flights: [{origin: {code_icao: 'EIDW'}, destination: {code_icao: 'LIME'}, operator_icao: 'RYR'}]},
        });

        const aircraft = await getFlightsInArea();

        expect(provider.requestedUrls().filter(url => url.includes(FLIGHTAWARE))).toEqual([expect.stringContaining('/flights/RYR2')]);
        expect(aircraft.map(a => a.route_info?.routeInfo?.destination?.icao)).toEqual(['LIMC', 'LIME']);
    });
});
