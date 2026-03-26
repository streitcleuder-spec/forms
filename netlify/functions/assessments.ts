import { createClient } from '@libsql/client';

type NetlifyEvent = {
  httpMethod: string;
  body?: string | null;
  queryStringParameters?: Record<string, string | undefined>;
};

const tursoUrl = process.env.TURSO_DATABASE_URL;
const tursoAuthToken = process.env.TURSO_AUTH_TOKEN;

const db = createClient({
  url: tursoUrl ?? 'file:caed.db',
  authToken: tursoAuthToken,
});

let initialized = false;
async function ensureInit() {
  if (initialized) return;
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
  initialized = true;
}

function json(data: unknown, statusCode = 200) {
  return {
    statusCode,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(data),
  };
}

export async function handler(event: NetlifyEvent) {
  try {
    await ensureInit();

    if (event.httpMethod === 'GET') {
      const result = await db.execute(
        `SELECT id, school_name, classes_json, has_spare_toner, is_printer_good, toner_level, submitted_at
         FROM assessments
         ORDER BY submitted_at DESC`,
      );

      const toBool = (v: unknown) => v === 1 || v === true || v === '1';
      const items = result.rows.map((row: any) => ({
        id: String(row.id),
        schoolName: String(row.school_name),
        classes: JSON.parse(String(row.classes_json ?? '[]')),
        hasSpareToner: toBool(row.has_spare_toner),
        isPrinterGood: toBool(row.is_printer_good),
        tonerLevel: Number(row.toner_level),
        submittedAt: String(row.submitted_at),
      }));

      return json(items);
    }

    if (event.httpMethod === 'POST') {
      const data = event.body ? JSON.parse(event.body) : {};

      if (!data.id || !data.schoolName || typeof data.submittedAt !== 'string') {
        return json({ error: 'Payload inválido' }, 400);
      }

      const classesJson = JSON.stringify(data.classes ?? []);

      await db.execute({
        sql: `
          INSERT INTO assessments (
            id, school_name, classes_json, has_spare_toner, is_printer_good, toner_level, submitted_at
          ) VALUES (
            :id, :school_name, :classes_json, :has_spare_toner, :is_printer_good, :toner_level, :submitted_at
          )
        `,
        args: {
          id: data.id,
          school_name: data.schoolName,
          classes_json: classesJson,
          has_spare_toner: data.hasSpareToner ? 1 : 0,
          is_printer_good: data.isPrinterGood ? 1 : 0,
          toner_level: Number(data.tonerLevel ?? 0),
          submitted_at: data.submittedAt,
        },
      });

      return json({
        id: data.id,
        schoolName: data.schoolName,
        classes: data.classes ?? [],
        hasSpareToner: !!data.hasSpareToner,
        isPrinterGood: !!data.isPrinterGood,
        tonerLevel: Number(data.tonerLevel ?? 0),
        submittedAt: data.submittedAt,
      }, 201);
    }

    if (event.httpMethod === 'DELETE') {
      const id = event.queryStringParameters?.id;
      if (!id) return json({ error: 'id necessário' }, 400);
      await db.execute({ sql: 'DELETE FROM assessments WHERE id = :id', args: { id } });
      return { statusCode: 204, body: '' };
    }

    return json({ error: 'Método não suportado' }, 405);
  } catch (err) {
    return json({ error: (err as Error).message ?? 'Erro interno' }, 500);
  }
}
