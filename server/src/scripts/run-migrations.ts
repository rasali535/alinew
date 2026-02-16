import pkg from 'pg';
const { Client } = pkg;
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env from server directory
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function migrate() {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
        console.error('DATABASE_URL not found in .env');
        process.exit(1);
    }

    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('Connected to Supabase...');

        // Ensure uuid-ossp extension is enabled
        await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');
        console.log('✓ uuid-ossp extension enabled');

        const migrationsDir = path.resolve(__dirname, '../database/migrations');
        const files = fs.readdirSync(migrationsDir).sort();

        for (const file of files) {
            console.log(`Applying migration: ${file}...`);
            const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
            await client.query(sql);
            console.log(`✓ ${file} applied`);
        }

        console.log('All migrations completed successfully! 🚀');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await client.end();
    }
}

migrate();
