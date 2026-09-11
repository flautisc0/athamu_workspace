import type { IncomingMessage, ServerResponse } from 'http';
import {
  getObras,
  upsertObra,
  deleteObra,
  getLeads,
  upsertLead,
  getRdProjects,
  getVenues,
  getEvents,
  upsertEvent,
  getInventory,
  upsertInventory,
  getFinances,
  upsertFinance,
  getProcessLogs,
  getRiders,
  getTeam,
  getAllData
} from '../db/queries.ts';
import { seedDatabase } from '../db/seed.ts';

// Helper to read request body as JSON
function parseJsonBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      if (!body.trim()) {
        return resolve({});
      }
      try {
        const parsed = JSON.parse(body);
        resolve(parsed);
      } catch (err) {
        reject(new Error('Invalid JSON payload'));
      }
    });
    req.on('error', reject);
  });
}

// Helper to send JSON response
function sendJson(res: ServerResponse, statusCode: number, data: any) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  });
  res.end(JSON.stringify(data));
}

export async function handleApiRequest(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
  const url = req.url || '';

  if (!url.startsWith('/api/')) {
    return false;
  }

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    });
    res.end();
    return true;
  }

  const cleanUrl = url.split('?')[0];
  const urlParams = new URLSearchParams(url.includes('?') ? url.split('?')[1] : '');

  try {
    // 1. Health & Database Status
    if (cleanUrl === '/api/status') {
      const stats = {
        status: 'online',
        databaseEngine: 'PostgreSQL (Cloud SQL)',
        host: process.env.SQL_HOST || 'Cloud SQL Managed Instance',
        database: process.env.SQL_DB_NAME || 'defaultdb',
        tables: {
          obras: (await getObras()).length,
          leads: (await getLeads()).length,
          rdProjects: (await getRdProjects()).length,
          venues: (await getVenues()).length,
          events: (await getEvents()).length,
          inventory: (await getInventory()).length,
          finances: (await getFinances()).length,
          processLogs: (await getProcessLogs()).length,
          riders: (await getRiders()).length,
          team: (await getTeam()).length,
        },
        timestamp: new Date().toISOString()
      };
      sendJson(res, 200, stats);
      return true;
    }

    // 2. Full Data Retrieval
    if (cleanUrl === '/api/data') {
      const moduleParam = urlParams.get('module');
      if (moduleParam === 'obras') {
        return sendJson(res, 200, { success: true, data: await getObras() }), true;
      }
      if (moduleParam === 'leads') {
        return sendJson(res, 200, { success: true, data: await getLeads() }), true;
      }
      if (moduleParam === 'finances') {
        return sendJson(res, 200, { success: true, data: await getFinances() }), true;
      }
      if (moduleParam === 'inventory') {
        return sendJson(res, 200, { success: true, data: await getInventory() }), true;
      }
      if (moduleParam === 'venues') {
        return sendJson(res, 200, { success: true, data: await getVenues() }), true;
      }
      if (moduleParam === 'events') {
        return sendJson(res, 200, { success: true, data: await getEvents() }), true;
      }

      // Return complete bundle
      const all = await getAllData();
      sendJson(res, 200, { success: true, ...all });
      return true;
    }

    // 3. Seed Database
    if (cleanUrl === '/api/seed' && req.method === 'POST') {
      const result = await seedDatabase();
      sendJson(res, 200, result);
      return true;
    }

    // 4. Export File (JSON, CSV or SQL)
    if (cleanUrl === '/api/export') {
      const format = urlParams.get('format') || 'json';
      const table = urlParams.get('table') || 'all';

      if (format === 'csv') {
        // Build CSV for requested table
        let rows: any[] = [];
        if (table === 'obras') rows = await getObras();
        else if (table === 'leads') rows = await getLeads();
        else if (table === 'finances') rows = await getFinances();
        else if (table === 'inventory') rows = await getInventory();
        else if (table === 'events') rows = await getEvents();
        else if (table === 'venues') rows = await getVenues();
        else rows = await getObras();

        if (rows.length === 0) {
          res.writeHead(200, { 'Content-Type': 'text/csv; charset=utf-8' });
          res.end('id\n');
          return true;
        }

        const headers = Object.keys(rows[0]);
        const csvLines = [
          headers.join(','),
          ...rows.map(row =>
            headers
              .map(col => {
                const val = row[col];
                if (val === null || val === undefined) return '';
                const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
                return `"${str.replace(/"/g, '""')}"`;
              })
              .join(',')
          )
        ];

        res.writeHead(200, {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="fase_${table}_${Date.now()}.csv"`
        });
        res.end('\uFEFF' + csvLines.join('\n'));
        return true;
      }

      // JSON Export
      const all = await getAllData();
      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="fase_backup_${Date.now()}.json"`
      });
      res.end(JSON.stringify(all, null, 2));
      return true;
    }

    // 5. Import File (JSON or CSV upload)
    if (cleanUrl === '/api/import' && req.method === 'POST') {
      const payload = await parseJsonBody(req);
      let count = 0;

      // Case A: Full dump object with { obras: [...], leads: [...] }
      if (payload.obras && Array.isArray(payload.obras)) {
        for (const o of payload.obras) {
          await upsertObra(o);
          count++;
        }
      }
      if (payload.leads && Array.isArray(payload.leads)) {
        for (const l of payload.leads) {
          await upsertLead(l);
          count++;
        }
      }
      if (payload.finances && Array.isArray(payload.finances)) {
        for (const f of payload.finances) {
          await upsertFinance(f);
          count++;
        }
      }
      if (payload.inventory && Array.isArray(payload.inventory)) {
        for (const inv of payload.inventory) {
          await upsertInventory(inv);
          count++;
        }
      }
      if (payload.events && Array.isArray(payload.events)) {
        for (const ev of payload.events) {
          await upsertEvent(ev);
          count++;
        }
      }

      // Case B: Direct list for a specific table
      const targetTable = payload.targetTable || urlParams.get('table');
      const items = Array.isArray(payload) ? payload : payload.items;
      if (items && Array.isArray(items)) {
        for (const item of items) {
          if (targetTable === 'obras') await upsertObra(item);
          else if (targetTable === 'leads') await upsertLead(item);
          else if (targetTable === 'finances') await upsertFinance(item);
          else if (targetTable === 'inventory') await upsertInventory(item);
          else if (targetTable === 'events') await upsertEvent(item);
          count++;
        }
      }

      sendJson(res, 200, {
        success: true,
        message: `Se importaron ${count} registros a Cloud SQL PostgreSQL.`,
        importedCount: count
      });
      return true;
    }

    // 6. Entity CRUD Handlers
    if (cleanUrl === '/api/obras') {
      if (req.method === 'GET') {
        sendJson(res, 200, { success: true, data: await getObras() });
        return true;
      }
      if (req.method === 'POST') {
        const obraData = await parseJsonBody(req);
        const result = await upsertObra(obraData);
        sendJson(res, 200, { success: true, data: result });
        return true;
      }
      if (req.method === 'DELETE') {
        const id = urlParams.get('id');
        if (id) {
          await deleteObra(id);
          sendJson(res, 200, { success: true, message: `Obra ${id} eliminada` });
          return true;
        }
      }
    }

    if (cleanUrl === '/api/leads') {
      if (req.method === 'GET') {
        sendJson(res, 200, { success: true, data: await getLeads() });
        return true;
      }
      if (req.method === 'POST') {
        const leadData = await parseJsonBody(req);
        const result = await upsertLead(leadData);
        sendJson(res, 200, { success: true, data: result });
        return true;
      }
    }

    if (cleanUrl === '/api/finances') {
      if (req.method === 'GET') {
        sendJson(res, 200, { success: true, data: await getFinances() });
        return true;
      }
      if (req.method === 'POST') {
        const item = await parseJsonBody(req);
        const result = await upsertFinance(item);
        sendJson(res, 200, { success: true, data: result });
        return true;
      }
    }

    if (cleanUrl === '/api/inventory') {
      if (req.method === 'GET') {
        sendJson(res, 200, { success: true, data: await getInventory() });
        return true;
      }
      if (req.method === 'POST') {
        const item = await parseJsonBody(req);
        const result = await upsertInventory(item);
        sendJson(res, 200, { success: true, data: result });
        return true;
      }
    }

    // 404 for unknown api endpoint
    sendJson(res, 404, { error: `Endpoint no encontrado: ${cleanUrl}` });
    return true;
  } catch (error: any) {
    console.error('API Error:', error);
    sendJson(res, 500, {
      success: false,
      error: error?.message || 'Error interno en la API de F.A.S.E',
    });
    return true;
  }
}
