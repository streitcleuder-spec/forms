import { createClient } from '@libsql/client';

export async function handler() {
  try {
    const url = process.env.TURSO_DATABASE_URL;
    const token = process.env.TURSO_AUTH_TOKEN;
    if (!url || !token) {
      return {
        statusCode: 200,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ok: true, db: 'not_configured' }),
      };
    }

    const db = createClient({ url, authToken: token });
    await db.execute('SELECT 1');

    return {
      statusCode: 200,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ok: true, db: 'connected' }),
    };
  } catch (e) {
    return {
      statusCode: 200,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ok: true, db: 'error', message: (e as Error).message }),
    };
  }
}
