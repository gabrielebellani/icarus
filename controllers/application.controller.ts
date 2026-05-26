import { z } from 'zod';
import {db} from "../index.ts";

export function initInstallation(request: Request): null {

    const initValidationSchema = z.object({
        username: z.string(),
        openSkyNetworkKey: z.string().optional(),
        coordinates: z.object({
            latitude: z.number(),
            longitude: z.number(),
        }).optional(),
        radius: z.number().optional(),
        display_mode: z.enum(['minimal', 'detailed']).optional()
    })
    const validated = initValidationSchema.parse()

    const count = db.prepare('SELECT COUNT(*) FROM users where username = ?', [validated.username]).get() as number
    if(count > 0){
        throw new Response("User already exists", {status: 400})
    }

    return null
}
