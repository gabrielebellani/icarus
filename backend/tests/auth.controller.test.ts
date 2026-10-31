import {afterEach, describe, expect, test} from 'bun:test';
import {db} from '../db.ts';
import {registerUser} from '../controllers/auth.controller.ts';

const registration = () => registerUser(new Request('http://icarus.test/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({username: 'newpilot', password: 'long-enough-password', email: 'pilot@example.com'}),
}));

const userCreated = () => db.query("SELECT id FROM users WHERE username = 'newpilot'").get() !== null;

describe('registration', () => {
    afterEach(() => {
        delete process.env.DISABLE_REGISTRATION;
        db.run("DELETE FROM users WHERE username = 'newpilot'");
    });

    test('is closed when DISABLE_REGISTRATION is not set', async () => {
        expect((await registration()).status).toBe(403);
        expect(userCreated()).toBe(false);
    });

    test('is closed for any value other than "false"', async () => {
        process.env.DISABLE_REGISTRATION = '0';

        expect((await registration()).status).toBe(403);
    });

    test('is open when DISABLE_REGISTRATION is "false"', async () => {
        process.env.DISABLE_REGISTRATION = 'false';
        process.env.JWT_SECRET ??= 'test-secret-that-is-at-least-32-characters';

        expect((await registration()).status).toBe(201);
        expect(userCreated()).toBe(true);
    });
});
