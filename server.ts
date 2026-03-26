import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import { createClient } from '@libsql/client';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

dotenv.config({ path: '.env.local' });
dotenv.config();

const tursoUrl = process.env.TURSO_DATABASE_URL ?? 'file:caed.db';
const tursoAuthToken = process.env.TURSO_AUTH_TOKEN;

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

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/api/assessments', async (_req, res) => {
  try {
    const result = await db.execute(
      `SELECT id, school_name, classes_json, has_spare_toner, is_printer_good, toner_level, submitted_at
       FROM assessments
       ORDER BY submitted_at DESC`,
    );

    const toBool = (v: unknown) => v === 1 || v === true || v === '1';
    const items = result.rows.map((row) => ({
      id: String(row.id),
      schoolName: String(row.school_name),
      classes: JSON.parse(String(row.classes_json ?? '[]')),
      hasSpareToner: toBool(row.has_spare_toner),
      isPrinterGood: toBool(row.is_printer_good),
      tonerLevel: Number(row.toner_level),
      submittedAt: String(row.submitted_at),
    }));

    res.json(items);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message ?? 'Erro ao listar relatórios' });
  }
});

app.post('/api/assessments', async (req, res) => {
  try {
    const data = req.body as {
      id?: string;
      schoolName?: string;
      classes?: unknown;
      hasSpareToner?: boolean;
      isPrinterGood?: boolean;
      tonerLevel?: number;
      submittedAt?: string;
    };

    if (!data.id || !data.schoolName || typeof data.submittedAt !== 'string') {
      res.status(400).json({ error: 'Payload inválido' });
      return;
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

    res.status(201).json({
      id: data.id,
      schoolName: data.schoolName,
      classes: data.classes ?? [],
      hasSpareToner: !!data.hasSpareToner,
      isPrinterGood: !!data.isPrinterGood,
      tonerLevel: Number(data.tonerLevel ?? 0),
      submittedAt: data.submittedAt,
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message ?? 'Erro ao salvar relatório' });
  }
});

app.delete('/api/assessments/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.execute({ sql: 'DELETE FROM assessments WHERE id = :id', args: { id } });
    res.status(204).send('');
  } catch (err) {
    res.status(500).json({ error: (err as Error).message ?? 'Erro ao remover relatório' });
  }
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (process.env.NODE_ENV === 'production') {
  const distDir = path.join(__dirname, 'dist');
  app.use(express.static(distDir));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

const port = Number(process.env.PORT ?? 3001);
app.listen(port, () => {
  console.log(`API ouvindo em http://localhost:${port}`);
});
