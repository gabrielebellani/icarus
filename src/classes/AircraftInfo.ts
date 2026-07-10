export class AircraftInfo {
    icao24: string
    type: string
    icaoType: string
    registration: string
    registrationCountryCode: string
    registrationCountryName: string
    manufacturer: string
    cover_url: string|null

    constructor(icao24: string, type: string, icaoType: string, registration: string, registrationCountryCode: string, registrationCountryName: string, manufacturer: string, cover_url: string | null) {
        this.icao24 = icao24
        this.type = type;
        this.icaoType = icaoType;
        this.registration = registration;
        this.registrationCountryCode = registrationCountryCode;
        this.registrationCountryName = registrationCountryName;
        this.manufacturer = manufacturer;
        this.cover_url = cover_url;
    }

    public static buildFromPersistedRecord(row: any): AircraftInfo|null {
        const decodedInfo = row.data !== null ? JSON.parse(row.data) : null
        if(decodedInfo === null || Object.keys(decodedInfo).length === 0){
            return null;
        }
        return new AircraftInfo(
            row.icao24,
            decodedInfo.type,
            decodedInfo.icao_type,
            decodedInfo.registration,
            decodedInfo.registration_country_code,
            decodedInfo.registration_country_name,
            decodedInfo.manufacturer,
            decodedInfo.cover_url,
        )
    }

    public static buildFromAdsbDbResult(icao24: string, data: any): AircraftInfo {
        return new AircraftInfo(
            icao24,
            data.type,
            data.icao_type,
            data.registration,
            data.registration_country_iso_name,
            data.registration_country_name,
            data.manufacturer,
            data.url_photo,
        )
    }

    public serialize(withIcao24: boolean = false): string {
        return JSON.stringify({
            ...(withIcao24 ? { icao24: this.icao24 } : {}),
            type: this.type,
            icao_type: this.icaoType,
            registration: this.registration,
            registration_country_code: this.registrationCountryCode,
            registration_country_name: this.registrationCountryName,
            manufacturer: this.manufacturer,
            cover_url: this.cover_url
        })
    }
}
