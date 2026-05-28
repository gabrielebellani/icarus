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
import {getUserPreferences} from "./controllers/preferences.controller.ts";
import {getTrackingFlight, searchFlight, startTracking, terminateTracking} from "./controllers/flight.controller.ts";
import {getTrackingAirports, searchAirport} from "./controllers/airport.controller.ts";

export const db = new Database('./icarus-db.sqlite', {create: true});

// Esegui migrazioni
await runMigrations();

// Inizializza superuser da env
await bootstrapSuperuser();

Bun.serve({
    port: "3465",
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
            "POST": async (request) => await startTracking(request),
            "DELETE": async (request) => await terminateTracking(request)
        },
        '/*': new Response("Not found", {status: 404}),
    },
})

console.log('[server] In ascolto su http://localhost:3465');
