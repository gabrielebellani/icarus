export class RadarInstance {
    id: number
    coordinates: { latitude: number, longitude: number }
    radius: number
    expiration: Date | null
    refresh_interval: number
    inactivity_timeout: number | null
    name: string | null
    created_at: Date
    timeout_at: Date | null = null
    expired_at: Date | null = null

    constructor(
        id: number,
        coordinates: { latitude: number, longitude: number },
        radius: number,
        expiration: Date | null,
        refresh_interval: number,
        inactivity_timeout: number | null,
        name: string | null,
        created_at: Date,
        timeout_at: Date | null,
        expired_at: Date | null,
    ) {
        this.id = id
        this.coordinates = coordinates
        this.radius = radius
        this.expiration = expiration
        this.refresh_interval = refresh_interval
        this.inactivity_timeout = inactivity_timeout
        this.name = name
        this.created_at = created_at
        this.timeout_at = timeout_at
        this.expired_at = expired_at
    }

    public static fromDbRow(row: any): RadarInstance {
        const coordinates = row.coordinates ? JSON.parse(row.coordinates) : null;
        if (!coordinates || typeof coordinates.latitude !== 'number' || typeof coordinates.longitude !== 'number') {
            throw new Error(`Invalid coordinates, try terminate tracking and start a new one.`);
        }

        return new RadarInstance(
            row.id,
            {latitude: coordinates.latitude, longitude: coordinates.longitude},
            row.radius,
            row.expiration ? new Date(row.expiration) : null,
            row.refresh_interval,
            row.inactivity_timeout,
            row.name,
            new Date(row.created_at),
            row.timeout_at ? new Date(row.timeout_at) : null,
            row.expired_at ? new Date(row.expired_at) : null,
        )
    }
}
