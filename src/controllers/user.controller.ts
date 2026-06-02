import {jsonResponse} from "../utils/response.ts";
import {authenticate, isAuthError} from "../middleware/auth.ts";
import {z} from "zod";
import {db} from "../index.ts";

const changePasswordSchema = z.object({
    current_password: z.string(),
    new_password: z.string().min(8).max(255),
})

export async function changePassword(request: Request) {
    const auth = await authenticate(request)
    if (isAuthError(auth)) return auth;

    const body = await request.json();
    const parsed = changePasswordSchema.safeParse(body);
    if (!parsed.success) {
        return jsonResponse({ errors: parsed.error.issues }, 422);
    }
    const { current_password, new_password } = parsed.data;

    const userId = auth.user_id

    try {
        await db.transaction(async () => {
            const user = db.prepare('SELECT password FROM users WHERE id = ?').get(userId) as {
                password: string
            } | null;
            if (!user) {
                throw new Error('User not found.');
            }

            const passwordMatch = Bun.password.verify(current_password, user.password);
            if (!passwordMatch) {
                throw new Error('Current password is incorrect.');
            }

            const newPasswordHash = await Bun.password.hash(new_password);
            db.prepare('UPDATE users SET password = ? WHERE id = ?').run(newPasswordHash, userId);
        })();

        return jsonResponse({message: 'Password changed successfully.'})
    } catch (error) {
        return jsonResponse({message: error instanceof Error ? error.message : 'An error occurred.'}, 400)
    }
}

export async function deleteAccount(request: Request) {
    const auth = await authenticate(request)
    if (isAuthError(auth)) return auth;

    const userId = auth.user_id;

    try {
        await db.transaction(async () => {
            db.prepare('DELETE FROM users WHERE id = ?').run(userId);
            db.prepare('DELETE FROM tracked_airports WHERE user_id = ?').run(userId);
            db.prepare('DELETE FROM tracked_flights WHERE user_id = ?').run(userId);
            db.prepare('DELETE FROM preferences WHERE user_id = ?').run(userId);
        })();
        return jsonResponse({message: 'Account deleted successfully.'})
    } catch (error) {
        return jsonResponse({message: error instanceof Error ? error.message : 'An error occurred.'}, 400)
    }
}
