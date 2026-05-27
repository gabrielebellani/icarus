import { Database } from 'bun:sqlite';
import runMigrations from './migrations/migrations.ts';
import { bootstrapSuperuser } from './controllers/application.controller.ts';
import { initUser, registerUser, loginUser, refreshAccessToken, requestPasswordRecovery, resetPassword } from './controllers/auth.controller.ts';

export const db = new Database('./icarus-db.sqlite', { create: true });

// Esegui migrazioni
await runMigrations();

// Inizializza superuser da env
await bootstrapSuperuser();

const server = Bun.serve({
    port: "3465",
    routes: {
        "/api/status": new Response("OK"),
        '/api/auth/init': {
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
        // '/api/config': (request) => getUserConfig(request),
        '/*': new Response("Not found", {status: 404}),
    },
})

console.log('[server] In ascolto su http://localhost:3465');
