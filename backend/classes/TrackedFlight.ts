import {searchAirline} from '../utils/airlines.util.ts'
import {normalizeFlightPayload} from '../utils/flight.util.ts'

export class TrackedFlight {
    id: string
    iata_code: string|null
    icao_code: string|null
    reference_date: string
    phase: string
    data_source: string|null
    degraded_mode: boolean
    payload: {
        route: object
        aircraft: object
        airline: object
        schedule: object
        adsb_state: object|null
    }

    constructor(
        id: string,
        iata_code: string|null,
        icao_code: string|null,
        reference_date: string,
        phase: string,
        data_source: string|null,
        degraded_mode: boolean,
        payload: {
            route: object
            aircraft: object
            airline: object
            schedule: object
            adsb_state: object|null
        }
    ) {
        this.id = id
        this.iata_code = iata_code
        this.icao_code = icao_code
        this.reference_date = reference_date
        this.phase = phase
        this.data_source = data_source
        this.degraded_mode = degraded_mode
        this.payload = payload
    }

    static fromDB(row: any): TrackedFlight {
        const flat = normalizeFlightPayload(JSON.parse(row.payload))
        const airline = searchAirline(flat.operator_icao || flat.operator_iata || null)
        const adsbState = row.adsb_state ? JSON.parse(row.adsb_state) : null

        const route = {
            ident: flat.ident,
            ident_icao: flat.ident_icao,
            ident_iata: flat.ident_iata,
            fa_flight_id: flat.fa_flight_id,
            atc_ident: flat.atc_ident,
            origin: flat.origin,
            destination: flat.destination,
            route_distance: flat.route_distance,
            filed_ete: flat.filed_ete,
            route: flat.route,
            progress_percent: flat.progress_percent,
            status: flat.status,
            diverted: flat.diverted,
            cancelled: flat.cancelled,
            blocked: flat.blocked,
            position_only: flat.position_only,
            codeshares: flat.codeshares,
            codeshares_iata: flat.codeshares_iata,
            inbound_fa_flight_id: flat.inbound_fa_flight_id,
            foresight_predictions_available: flat.foresight_predictions_available,
        }

        const aircraft = {
            type: flat.aircraft_type,
            registration: flat.registration,
            icao24: row.icao24 ?? null,
            image_url: flat.aircraft_image_url ?? null,
        }

        const airlineInfo = {
            operator: flat.operator,
            operator_icao: flat.operator_icao,
            operator_iata: flat.operator_iata,
            name: airline?.name ?? null,
            logo: airline?.logo ?? null,
        }

        const schedule = {
            scheduled_out: flat.scheduled_out,
            estimated_out: flat.estimated_out,
            actual_out: flat.actual_out,
            scheduled_off: flat.scheduled_off,
            estimated_off: flat.estimated_off,
            actual_off: flat.actual_off,
            scheduled_on: flat.scheduled_on,
            estimated_on: flat.estimated_on,
            actual_on: flat.actual_on,
            scheduled_in: flat.scheduled_in,
            estimated_in: flat.estimated_in,
            actual_in: flat.actual_in,
            departure_delay: flat.departure_delay,
            arrival_delay: flat.arrival_delay,
            gate_origin: flat.gate_origin,
            gate_destination: flat.gate_destination,
            terminal_origin: flat.terminal_origin,
            terminal_destination: flat.terminal_destination,
            actual_runway_off: flat.actual_runway_off,
            actual_runway_on: flat.actual_runway_on,
            baggage_claim: flat.baggage_claim,
            filed_airspeed: flat.filed_airspeed,
            filed_altitude: flat.filed_altitude,
            seats_cabin_business: flat.seats_cabin_business,
            seats_cabin_coach: flat.seats_cabin_coach,
            seats_cabin_first: flat.seats_cabin_first,
        }

        return new this(
            row.id,
            row.iata_code,
            row.icao_code,
            row.reference_date,
            row.phase,
            row.data_source ?? null,
            !!row.degraded_mode,
            {route, aircraft, airline: airlineInfo, schedule, adsb_state: adsbState}
        )
    }
}
