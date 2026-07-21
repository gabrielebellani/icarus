import {db} from "../index.ts";

export default async function () {
    const sql = await Bun.file('./migrations/init.sql').text()
    db.run(sql)

    // Aggiunte colonne a DB già esistenti (idempotenti)
    try { db.run("ALTER TABLE users ADD COLUMN password_reset_token TEXT") } catch {}
    try { db.run("ALTER TABLE users ADD COLUMN password_reset_token_expires_at INTEGER") } catch {}
}
