import {db} from "../index.ts";

/**
 * Idempotently add a column to a table if it doesn't already exist.
 * Uses PRAGMA table_info to check for column existence before ALTER TABLE.
 */
function addColumnIfMissing(tableName: string, columnName: string, columnDefinition: string): void {
    try {
        const columns = db.prepare(`PRAGMA table_info(${tableName})`).all() as any[];
        const columnExists = columns.some(col => col.name === columnName);
        
        if (!columnExists) {
            console.log(`[Migration] Adding column ${tableName}.${columnName}...`);
            db.prepare(`ALTER TABLE ${tableName} ADD COLUMN ${columnDefinition}`).run();
            console.log(`[Migration] Column ${tableName}.${columnName} added successfully.`);
        }
    } catch (error) {
        console.error(`[Migration] Error adding column ${tableName}.${columnName}:`, error);
        throw error;
    }
}

export default async function () {
    const sql = await Bun.file('./migrations/init.sql').text()
    db.run(sql)
    
    // Idempotent schema migrations for existing DBs
    addColumnIfMissing('tracked_flights', 'icao24', 'icao24 VARCHAR(16) NULL');
    addColumnIfMissing('tracked_flights', 'phase', "phase VARCHAR(16) NOT NULL DEFAULT 'ground'");
    addColumnIfMissing('tracked_flights', 'last_adsb_at', 'last_adsb_at INTEGER NULL');
    addColumnIfMissing('tracked_flights', 'last_flightaware_at', 'last_flightaware_at INTEGER NULL');
    addColumnIfMissing('tracked_flights', 'adsb_state', 'adsb_state TEXT NULL');
    addColumnIfMissing('tracked_flights', 'data_source', 'data_source VARCHAR(16) NULL');
    addColumnIfMissing('tracked_flights', 'degraded_mode', 'degraded_mode INTEGER NOT NULL DEFAULT 0');
}
