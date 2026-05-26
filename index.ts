import {Database} from "bun:sqlite";
import {getInstallationInitRequired, initInstallation} from "./controllers/application.controller.ts";

export const db = new Database('icarus-db.sqlite')

const server = Bun.serve({
    port: "3465",
    routes: {
        "/api/status": new Response("OK"),
        '/api/init': {
            "GET": (request) => getInstallationInitRequired(request),
            "POST": async (request) => await initInstallation(request)
        },
        '/*': new Response("Not found", {status: 404}),
    },
})
