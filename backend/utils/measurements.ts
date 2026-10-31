const KNOTS_TO_MS = 0.514444;
const FEET_TO_METERS = 0.3048;

export function knotsToMs(knots: number | undefined): number | null {
    return typeof knots === 'number' ? knots * KNOTS_TO_MS : null;
}

export function feetToMeters(feet: number | undefined): number | null {
    return typeof feet === 'number' ? feet * FEET_TO_METERS : null;
}

