import {Database} from 'bun:sqlite';
import {RedisClient} from "bun"
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
    getAirportTimetable,
    getTrackingAirports,
    searchAirport,
    startTracking as startTrackingAirport,
    terminateTracking as terminateTrackingAirport
} from "./controllers/airport.controller.ts";
import {changePassword, deleteAccount} from "./controllers/user.controller.ts";
import {
    getSingleTrackingRadar,
    getTrackingRadars,
    resumeRadar,
    startTracking as startTrackingRadar,
    terminateTracking as terminateTrackingRadar
} from "./controllers/radar.controller.ts";
import {jsonResponse} from "./utils/response.ts";

export const db = new Database('./icarus-db.sqlite', {create: true});
export const redis = new RedisClient()

// Esegui migrazioni
await runMigrations();

// Inizializza superuser da env
await bootstrapSuperuser();

Bun.serve({
    port: "3465",
    routes: {
        "/api/status": async () => {
            return jsonResponse({
                status: "ok",
                database: db.query("SELECT 1") ? "connected" : "error",
                redis: await redis.ping() ? "connected" : "error",
            })
        },
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

console.log('[server] In ascolto su http://localhost:3465');
