process.env.DB_PATH = ':memory:';
process.env.JETAPI_URL = 'http://jetapi.test';

const {default: runMigrations} = await import('../migrations/migrations.ts');
await runMigrations();
