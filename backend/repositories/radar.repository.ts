import {db} from "../db.ts";
import {RadarInstance} from "../classes/RadarInstance.ts";
import {RadarCommercialFlight} from "../classes/RadarCommercialFlight.ts";
import {AircraftInfo} from "../classes/AircraftInfo.ts";

export class RadarRepository {

    static getRadarByIdAndUser(radarId: string, userId: number): RadarInstance | null {
        const radarRow = db.prepare('SELECT * FROM radars WHERE id = ? AND user_id = ?').get(radarId, userId);
        if (!radarRow) {
            return null;
        }
        return RadarInstance.fromDbRow(radarRow);
    }

    static getAllRadarsByUser(userId: number): RadarInstance[] {
        const radarRows = db.prepare('SELECT * FROM radars WHERE user_id = ?').all(userId) as any[];
        return radarRows.map(row => RadarInstance.fromDbRow(row));
    }

    static createRadar(radarData: any): void {
        db.prepare(`
            INSERT INTO radars (id, user_id, name, coordinates, radius, expiration, refresh_interval, inactivity_timeout, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            radarData.uuid,
            radarData.userId,
            radarData.name,
            JSON.stringify(radarData.coordinates),
            radarData.radius,
            radarData.expiration,
            radarData.refresh_interval,
            radarData.inactivity_timeout,
            radarData.created_at
        );
    }

    static deleteRadar(radarId: string, userId: number): void {
        db.prepare('DELETE FROM radars WHERE id = ? AND user_id = ?').run(radarId, userId);
    }

    static updateRadar(radarId: string, userId: number, data: { name: string, expiration: number | null, inactivity_timeout: number | null }): void {
        db.prepare(`
            UPDATE radars
            SET name = ?, expiration = ?, inactivity_timeout = ?
            WHERE id = ? AND user_id = ?
        `).run(data.name, data.expiration, data.inactivity_timeout, radarId, userId);
    }

    static getPersistedRoutes(callsigns: string[]): RadarCommercialFlight[] {
        if (callsigns.length === 0) {
            return [];
        }
        const placeholders = callsigns.map(() => '?').join(',');
        return db.query(`SELECT * FROM cached_routes WHERE callsign IN (${placeholders})`)
            .all(...callsigns)
            .map((row: any) => RadarCommercialFlight.buildFromPersistedRecord(row));
    }

    static persistRoute(flight: RadarCommercialFlight): void {
        db.prepare(
            `INSERT INTO cached_routes (callsign, origin_icao, origin_iata, destination_icao, destination_iata, airline)
             VALUES (?, ?, ?, ?, ?, ?)
             ON CONFLICT (callsign) DO UPDATE SET origin_icao      = excluded.origin_icao,
                                                  origin_iata      = excluded.origin_iata,
                                                  destination_icao = excluded.destination_icao,
                                                  destination_iata = excluded.destination_iata,
                                                  airline          = excluded.airline`
        ).run(
            flight.callsign,
            flight.routeInfo?.origin?.icao ?? null,
            flight.routeInfo?.origin?.iata ?? null,
            flight.routeInfo?.destination?.icao ?? null,
            flight.routeInfo?.destination?.iata ?? null,
            flight.routeInfo?.airline?.iata ?? null,
        );
    }

    static getPersistedAircraft(icao24: string): any {
        return db.query('SELECT * FROM cached_icao24 WHERE icao24 = ?').get(icao24);
    }

    static persistAircraftInfo(icao24: string, aircraftInfo: AircraftInfo | null): void {
        db.prepare(`INSERT INTO cached_icao24 (icao24, data)
                    VALUES (?, ?)
                    ON CONFLICT (icao24) DO UPDATE SET data = excluded.data
        `)
            .run(
                icao24,
                aircraftInfo ? aircraftInfo.serialize() : null
            );
    }
}
