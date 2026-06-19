export const RADAR_REFRESH_INTERVAL_S: number = 30; // 30 seconds
export const RADAR_INACTIVITY_TIMEOUT_S: number =  60 * 60 * 2; // 2 hours

export function getBoundingBox(latitude: number, longitude: number, radius: number) {
    const deltaLatitude = radius / 111.32;
    const deltaLongitude = radius / (111.32 * Math.cos(latitude * Math.PI / 180));

    return {
        lamin: latitude - deltaLatitude,
        lomin: longitude - deltaLongitude,
        lamax: latitude + deltaLatitude,
        lomax: longitude + deltaLongitude
    };
}
