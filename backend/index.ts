import {Database} from 'bun:sqlite';
import runMigrations from './migrations/migrations.ts';
import {bootstrapSuperuser, getApplicationPublicConfig} from './controllers/application.controller.ts';
import {
    initUser,
    loginUser,
    refreshAccessToken,
    registerUser,
    requestPasswordRecovery,
    resetPassword,
    userRequiresInit
} from './controllers/auth.controller.ts';
import {getThirdPartyAPIUsage, getUserPreferences, setUserPreferences} from "./controllers/preferences.controller.ts";
import {getTrackingFlight, searchFlight, startTracking, terminateTracking} from "./controllers/flight.controller.ts";
import {
    getAirportDelays,
    getAirportTimetable,
    getTrackingAirports,
    searchAirport,
    terminateTracking as terminateTrackingAirport,
    startTracking as startTrackingAirport
} from "./controllers/airport.controller.ts";
import {changePassword, deleteAccount} from "./controllers/user.controller.ts";
import {
    getFlightsInArea,
    getSingleTrackingRadar,
    getTrackingRadars,
    resumeRadar,
    startTracking as startTrackingRadar,
    terminateTracking as terminateTrackingRadar
} from "./controllers/radar.controller.ts";
import {env} from "./utils/env.ts";

export const db = new Database(env.DB_PATH, {create: true});

// Esegui migrazioni
await runMigrations();

// Inizializza superuser da env
await bootstrapSuperuser();

Bun.serve({
    port: env.PORT,
    routes: {
        "/api/status": new Response("OK"),
        '/api/config': (request) => getApplicationPublicConfig(request),
        '/api/auth/init': {
            "GET": async (request) => await userRequiresInit(request),
            "POST": async (request) => await initUser(request),
        },
        '/api/auth/register': {
            "POST": async (request) => await registerUser(request),
        },
        '/api/auth/login': {
            "POST": async (request) => await loginUser(request),
        },
        '/api/auth/refresh': {
            "POST": async (request) => await refreshAccessToken(request),
        },
        '/api/auth/recovery': {
            "POST": async (request) => await requestPasswordRecovery(request),
        },
        '/api/auth/reset': {
            "POST": async (request) => await resetPassword(request),
        },
        '/api/preferences': {
            "GET": async (request) => await getUserPreferences(request),
            "POST": async (request) => await setUserPreferences(request),
        },
        '/api/flight': {
            "GET": async (request) => await searchFlight(request),
        },
        '/api/flight/tracking': {
            "GET": async (request) => await getTrackingFlight(request),
            "POST": async (request) => await startTracking(request),
            "DELETE": async (request) => await terminateTracking(request)
        },
        '/api/airport': {
            "GET": async (request) => await searchAirport(request),
        },
        '/api/airport/tracking': {
            "GET": async (request) => await getTrackingAirports(request),
            "POST": async (request) => await startTrackingAirport(request),
        },
        '/api/airport/tracking/:id': {
            "DELETE": async (request) => await terminateTrackingAirport(request, Number(request.params.id)),
        },
        '/api/airport/tracking/:id/timetable': async (request) => await getAirportTimetable(request, Number(request.params.id)), //TODO: add yaak request
        '/api/radar/tracking': {
            "POST": async (request) => await startTrackingRadar(request),
            "GET": async (request) => await getTrackingRadars(request),
        },
        '/api/radar/tracking/:id': {
            "GET": async (request) => await getSingleTrackingRadar(request, String(request.params.id)),
            "DELETE": async (request) => await terminateTrackingRadar(request, String(request.params.id)),
            "PUT": async (request) => await resumeRadar(request, String(request.params.id)),
        },
        '/api/user/password': async (request) => await changePassword(request), //TODO: add yaak request
        '/api/user': {
            "DELETE": async (request) => await deleteAccount(request), //TODO: add yaak request
        },
        '/api/user/usage': async (request) => getThirdPartyAPIUsage(request), //TODO: add yaak request
        '/*': new Response("Not found", {status: 404}),
    },
})

console.log('[server] In ascolto su http://localhost:8921');
