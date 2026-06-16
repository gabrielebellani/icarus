export enum AircraftTypeEnum {
    NoInfo = 0,
    NonEmitter = 1, //transponder has not been configured with its specific type or size
    Light = 2,
    Small = 3,
    Large = 4,
    HighVortexLarge = 5,
    Heavy = 6,
    HighPerformance = 7,
    Rotorcraft = 8,
    Others = 9
}

export const DefaultAircraftTypeDisplayPriority : AircraftTypeEnum[] = [
    AircraftTypeEnum.Rotorcraft,
    AircraftTypeEnum.HighPerformance,
    AircraftTypeEnum.Heavy,
    AircraftTypeEnum.HighVortexLarge,
    AircraftTypeEnum.Large,
    AircraftTypeEnum.Small,
    AircraftTypeEnum.Light,
    AircraftTypeEnum.Others,
    AircraftTypeEnum.NonEmitter,
    AircraftTypeEnum.NoInfo,
]
