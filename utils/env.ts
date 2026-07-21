function requireEnv(key: string): string {
    const value = process.env[key];
    if (!value) {
        throw new Error(`Missing required environment variable: ${key}`);
    }
    return value;
}

export const env = {
    get SUPERUSER_USERNAME() { return requireEnv('SUPERUSER_USERNAME'); },
    get SUPERUSER_PASSWORD() { return requireEnv('SUPERUSER_PASSWORD'); },
    get JWT_SECRET() { return requireEnv('JWT_SECRET'); },
};
