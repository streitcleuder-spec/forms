import dotenv from 'dotenv';
import { createClient } from '@libsql/client';

dotenv.config({ path: '.env.local' });
dotenv.config();

const tursoUrl = process.env.TURSO_DATABASE_URL;
const tursoAuthToken = process.env.TURSO_AUTH_TOKEN;

if (!tursoUrl) {
  console.log('TURSO_DATABASE_URL não definido — ignorando init sem falhar o build.');
  process.exit(0);
}

if (tursoUrl.startsWith('libsql:') && !tursoAuthToken) {
  console.log('TURSO_AUTH_TOKEN não definido para URL libsql — ignorando init sem falhar o build.');
  process.exit(0);
}

const db = createClient({
  url: tursoUrl,
  authToken: tursoAuthToken,
});

await db.execute(`
  CREATE TABLE IF NOT EXISTS assessments (
    id TEXT PRIMARY KEY,
    school_name TEXT NOT NULL,
    classes_json TEXT NOT NULL,
    has_spare_toner INTEGER NOT NULL,
    is_printer_good INTEGER NOT NULL,
    toner_level INTEGER NOT NULL,
    submitted_at TEXT NOT NULL
  );
`);
