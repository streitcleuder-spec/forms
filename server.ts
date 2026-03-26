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
    printer_tpsc TEXT,
    printer_quadro TEXT,
    printers_json TEXT,
    toner_level INTEGER NOT NULL,
    submitted_at TEXT NOT NULL
  );
`);

const colsResult = await db.execute(`PRAGMA table_info(assessments);`);
const cols = new Set(colsResult.rows.map((r: any) => String(r.name)));
if (!cols.has('printer_tpsc')) {
  await db.execute(`ALTER TABLE assessments ADD COLUMN printer_tpsc TEXT;`);
}
if (!cols.has('printer_quadro')) {
  await db.execute(`ALTER TABLE assessments ADD COLUMN printer_quadro TEXT;`);
}
if (!cols.has('printers_json')) {
  await db.execute(`ALTER TABLE assessments ADD COLUMN printers_json TEXT;`);
}

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/api/assessments', async (_req, res) => {
  try {
    const result = await db.execute(
      `SELECT id, school_name, classes_json, has_spare_toner, is_printer_good, printer_tpsc, printer_quadro, printers_json, toner_level, submitted_at
       FROM assessments
       ORDER BY submitted_at DESC`,
    );

    const toBool = (v: unknown) => v === 1 || v === true || v === '1';
    const safeParsePrinters = (raw: unknown) => {
      if (raw == null) return null;
      const text = String(raw);
      if (!text.trim()) return null;
      try {
        const parsed = JSON.parse(text);
        return Array.isArray(parsed) ? parsed : null;
      } catch {
        return null;
      }
    };
    const items = result.rows.map((row) => ({
      id: String(row.id),
      schoolName: String(row.school_name),
      classes: JSON.parse(String(row.classes_json ?? '[]')),
      hasSpareToner: toBool(row.has_spare_toner),
      isPrinterGood: toBool(row.is_printer_good),
      tonerLevel: Number(row.toner_level),
      printerTpscNumber: row.printer_tpsc == null ? '' : String(row.printer_tpsc),
      printerLocation: row.printer_quadro == null ? '' : String(row.printer_quadro),
      printers:
        safeParsePrinters(row.printers_json) ??
        [
          {
            id: 'legacy',
            tpscNumber: row.printer_tpsc == null ? '' : String(row.printer_tpsc),
            location: row.printer_quadro == null ? '' : String(row.printer_quadro),
            isGood: toBool(row.is_printer_good),
            tonerLevel: Number(row.toner_level),
          },
        ].filter((p) => p.tpscNumber || p.location),
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
      printerTpscNumber?: string;
      printerLocation?: string;
      printers?: unknown;
      tonerLevel?: number;
      submittedAt?: string;
    };

    if (!data.id || !data.schoolName || typeof data.submittedAt !== 'string') {
      res.status(400).json({ error: 'Payload inválido' });
      return;
    }

    const classesJson = JSON.stringify(data.classes ?? []);

    const rawPrinters = Array.isArray(data.printers) ? (data.printers as any[]) : null;
    const legacyTpsc = typeof data.printerTpscNumber === 'string' ? data.printerTpscNumber : '';
    const legacyLocation = typeof data.printerLocation === 'string' ? data.printerLocation : '';

    const printers = (rawPrinters ?? [
      {
        id: 'legacy',
        tpscNumber: legacyTpsc,
        location: legacyLocation,
        isGood: !!data.isPrinterGood,
        tonerLevel: Number(data.tonerLevel ?? 0),
      },
    ])
      .map((p: any) => ({
        id: typeof p.id === 'string' ? p.id : 'p',
        tpscNumber: typeof p.tpscNumber === 'string' ? p.tpscNumber.trim() : '',
        location: typeof p.location === 'string' ? p.location.trim() : '',
        isGood: !!p.isGood,
        tonerLevel: Math.max(0, Math.min(100, Number(p.tonerLevel ?? 0) || 0)),
      }))
      .filter((p: any) => p.tpscNumber || p.location);

    const isPrinterGood = printers.length ? printers.every((p: any) => p.isGood === true) : !!data.isPrinterGood;
    const tonerLevel = printers.length
      ? Math.round(printers.reduce((sum: number, p: any) => sum + (Number(p.tonerLevel) || 0), 0) / printers.length)
      : Number(data.tonerLevel ?? 0);

    const firstPrinter = printers[0] ?? null;
    const printerTpscNumber = firstPrinter?.tpscNumber ?? legacyTpsc;
    const printerLocation = firstPrinter?.location ?? legacyLocation;
    const printersJson = JSON.stringify(printers);

    await db.execute({
      sql: `
        INSERT INTO assessments (
          id, school_name, classes_json, has_spare_toner, is_printer_good, printer_tpsc, printer_quadro, printers_json, toner_level, submitted_at
        ) VALUES (
          :id, :school_name, :classes_json, :has_spare_toner, :is_printer_good, :printer_tpsc, :printer_quadro, :printers_json, :toner_level, :submitted_at
        )
      `,
      args: {
        id: data.id,
        school_name: data.schoolName,
        classes_json: classesJson,
        has_spare_toner: data.hasSpareToner ? 1 : 0,
        is_printer_good: isPrinterGood ? 1 : 0,
        printer_tpsc: printerTpscNumber,
        printer_quadro: printerLocation,
        printers_json: printersJson,
        toner_level: Number(tonerLevel ?? 0),
        submitted_at: data.submittedAt,
      },
    });

    res.status(201).json({
      id: data.id,
      schoolName: data.schoolName,
      classes: data.classes ?? [],
      hasSpareToner: !!data.hasSpareToner,
      isPrinterGood,
      printerTpscNumber,
      printerLocation,
      printers,
      tonerLevel: Number(tonerLevel ?? 0),
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
