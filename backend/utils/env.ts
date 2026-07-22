function requireEnv(key: string): string {
    const value = process.env[key];
    if (!value) {
        throw new Error(`Missing required environment variable: ${key}`);
    }
    return value;
}

function optionalEnv(key: string): string | undefined {
    return process.env[key];
}

export const env = {
    get PORT() { return requireEnv('PORT'); },
    get SUPERUSER_USERNAME() { return requireEnv('SUPERUSER_USERNAME'); },
    get SUPERUSER_PASSWORD() { return requireEnv('SUPERUSER_PASSWORD'); },
    get JWT_SECRET() { return requireEnv('JWT_SECRET'); },
    get JETAPI_SCRAPER_URL() { return requireEnv('JETAPI_URL'); },
    get REDIS_URL() { return requireEnv('REDIS_URL'); },
    get FRONTEND_URL() { return optionalEnv('FRONTEND_URL'); },
    get DB_PATH() { return optionalEnv('DB_PATH') || './icarus-db.sqlite'; },

    // SMTP (optional)
    get SMTP_HOST() { return optionalEnv('SMTP_HOST'); },
    get SMTP_PORT() { return optionalEnv('SMTP_PORT'); },
    get SMTP_SECURE() { return optionalEnv('SMTP_SECURE'); },
    get SMTP_USER() { return optionalEnv('SMTP_USER'); },
    get SMTP_PASSWORD() { return optionalEnv('SMTP_PASSWORD'); },
    get SMTP_FROM() { return optionalEnv('SMTP_FROM'); },
};
