import {Database} from "bun:sqlite";
import {initInstallation} from "./controllers/application.controller.ts";

export const db = new Database('icarus-db.sqlite')

const server = Bun.serve({
    port: "3465",
    routes: {
        "/api/status": new Response("OK"),
        '/api/init': {
            "POST": async (request) => new Response(initInstallation(request))
        },
        '/*': new Response("Not found", {status: 404}),
    },
})
