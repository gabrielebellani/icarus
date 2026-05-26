import {z} from 'zod';
import {db} from "../index.ts";
import {Preference} from "../classes/Preference.ts";
import {PreferenceKeyEnum} from "../enums/PreferenceKeyEnum.ts";

export async function initInstallation(request: Request): Promise<Response> {

    const initValidationSchema = z.object({
        username: z.string().min(4).max(255),
        password: z.string().min(12).max(255),
        openSkyNetworkKey: z.string().optional(),
        coordinates: z.object({
            latitude: z.number(),
            longitude: z.number(),
        }).optional(),
        radius: z.number().optional(),
        display_mode: z.enum(['minimal', 'detailed']).optional()
    })

    const body = await request.json();
    const parsed = initValidationSchema.safeParse(body);
    if (!parsed.success) {
        return new Response(JSON.stringify({errors: parsed.error.issues}), {
            status: 422,
            headers: {'Content-Type': 'application/json'}
        })
    }
    const validated = parsed.data

    if(getIsInstallationAlreadyInitialized()){
        return new Response("This installation is already initialized", {status: 409})
    }

    //create the superuser
    const passwordHash = await Bun.password.hash(validated.password)
    db.prepare('INSERT INTO users (username, password) VALUES (?, ?)').run(validated.username, passwordHash)
    const user = db.prepare('SELECT id FROM users WHERE username = ?', [validated.username]).get() as { id: number }

    const valuesToInitialize = [
        new Preference(user.id, PreferenceKeyEnum.SUPERUSER, true),
        new Preference(user.id, PreferenceKeyEnum.OPEN_SKY_API_KEY, validated.openSkyNetworkKey),
        new Preference(user.id, PreferenceKeyEnum.COORDINATES, JSON.stringify(validated.coordinates)),
        new Preference(user.id, PreferenceKeyEnum.RADIUS, validated.radius),
        new Preference(user.id, PreferenceKeyEnum.DEFAULT_DISPLAY_MODE, validated.display_mode),
    ]

    // Bulk insert in a single query
    const placeholders = valuesToInitialize.map(() => '(?, ?, ?)').join(', ')
    const params: any[] = []
    for (const pref of valuesToInitialize) {
        const valueToStore = pref.value === undefined || pref.value === '' ? null : pref.value
        params.push(pref.user_id, pref.key, valueToStore)
    }
    db.prepare(`INSERT INTO preferences (user_id, key, value)
                VALUES ${placeholders}`).run(...params)

    return new Response("Installation initialized", {status: 200})
}

export function getInstallationInitRequired(request: Request): Response{
    return Response.json({
        "required": !getIsInstallationAlreadyInitialized()
    })
}

function getIsInstallationAlreadyInitialized(){
    const isAlreadyInitialized = db
        .query('SELECT COUNT(*) as initialized FROM preferences WHERE key = ? AND value = ?')
        .get(PreferenceKeyEnum.SUPERUSER, true) as {initialized: number}

    return !!isAlreadyInitialized.initialized
}
