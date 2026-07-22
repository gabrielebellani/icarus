import {db} from "../index.ts";

export default async function () {
    const sql = await Bun.file('./src/migrations/init.sql').text()
    db.run(sql)
}
