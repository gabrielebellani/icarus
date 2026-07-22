import {db} from "../index.ts";

export function deleteExpiredRadars() {
    try{
        console.log('Deleting expired radars...', new Date().toISOString());
        db.prepare('UPDATE radars SET expired_at = ? WHERE expiration < ? AND expired_at IS NULL')
            .run(Date.now(), Date.now() / 1000);
        console.log('Expired radars deleted', new Date().toISOString());
    } catch (error) {
        console.error('Error deleting expired radars:', error);
    }
}
