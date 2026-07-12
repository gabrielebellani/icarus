import type {Coordinates} from "./Coordinates.ts";

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

/**
 * Returns distance between two coordinates in meters
 * Source: https://stackoverflow.com/questions/18883601/function-to-calculate-distance-between-two-coordinates
 */
export function getDistanceFromCoordinates(coordinate1: Coordinates, coordinate2: Coordinates): number {
    const toRadiant = (value: number) => {
        return value * Math.PI / 180
    }

    const earthRadiusInKm = 6371;
    const deltaLatitudeRad = toRadiant(coordinate2.latitude - coordinate1.latitude);
    const deltaLongitudeRad = toRadiant(coordinate2.longitude - coordinate1.longitude);

    const a =
        Math.sin(deltaLatitudeRad / 2) * Math.sin(deltaLatitudeRad / 2) +
        Math.cos(toRadiant(coordinate1.latitude)) * Math.cos(toRadiant(coordinate2.latitude)) *
        Math.sin(deltaLongitudeRad / 2) * Math.sin(deltaLongitudeRad / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return earthRadiusInKm * c * 1000; // Distance in m
}
