import {type Airport, getAirportByCode} from "../utils/airports.util.ts";
import {type Airline, searchAirline} from "../utils/airlines.util.ts";

export class RadarCommercialFlight {
    callsign: string
    status: string
    routeInfo: {
        origin: Airport | null,
        destination: Airport | null,
        airline: Airline | null
    } | null


    constructor(callsign: string, originAirport: Airport | null, destinationAirport: Airport | null, airline: Airline | null, status: 'matched' | 'unknown') {
        this.callsign = callsign;
        this.routeInfo = {
            origin: originAirport,
            destination: destinationAirport,
            airline: airline,
        };
        this.status = status
    }

    public static buildFromAdsbLolResult(callsign: string, result: any) {
        const airports: any[] = result._airports
        const origin = airports[0]
        const destination = airports[airports.length - 1]
        const airline = result.airline_code

        if(!origin || !destination){
            return new RadarCommercialFlight(callsign, null, null, null, 'unknown')
        }

        return this.build(
            callsign,
            origin.icao ?? origin.iata,
            destination.icao ?? destination.iata,
            airline
        )
    }

    public static buildFromFlightAwareResult(callsign: string, result: any) {
        return this.build(
            callsign,
            result.origin.code_icao ?? result.origin.code_iata,
            result.destination.code_icao ?? result.destination.code_iata,
            result.airline.operator_icao ?? result.airline.operator_iata,
        )
    }

    public static buildFromPersistedRecord(row: any) {
        return this.build(
            row.callsign,
            row.origin_icao ?? row.origin_iata,
            row.destination_icao ?? row.destination_iata,
            row.airline
        )
    }

    private static build(
        callsign: string,
        airportOriginCode: string | null,
        destinationAirportCode: string | null,
        airlineCode: string | null
    ) {
        return new RadarCommercialFlight(
            callsign,
            getAirportByCode(airportOriginCode),
            getAirportByCode(destinationAirportCode),
            searchAirline(airlineCode),
            'matched'
        )
    }
}
