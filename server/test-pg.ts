import { Pool } from 'pg';
import { config } from './src/config/index.js';

console.log('Testing PG Pool initialization...');
console.log('Connection String:', config.database.connectionString || '(empty)');

try {
    const pool = new Pool({
        connectionString: config.database.connectionString,
        min: config.database.poolMin,
        max: config.database.poolMax,
    });
    console.log('Pool initialized.');

    // Try dummy connect? No, just init.
} catch (error) {
    console.error('FAILED:', error);
}
