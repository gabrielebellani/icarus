import {Database} from 'bun:sqlite';
import {env} from './utils/env.ts';

export const db = new Database(env.DB_PATH, {create: true});
