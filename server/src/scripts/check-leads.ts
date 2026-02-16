import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function checkLeads() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        const res = await client.query('SELECT * FROM leads ORDER BY created_at DESC LIMIT 5');
        console.log('--- RECENT LEADS IN SUPABASE ---');
        console.table(res.rows.map(r => ({
            id: r.id.substring(0, 8),
            name: r.name,
            email: r.email,
            source: r.source,
            date: r.created_at
        })));
        console.log('--------------------------------');
    } catch (err) {
        console.error('Database Error:', err.message);
    } finally {
        await client.end();
    }
}

checkLeads();
