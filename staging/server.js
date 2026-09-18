'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
function loadPostgres() {
  try {
    return require('pg');
  } catch (error) {
    if (error && error.code !== 'MODULE_NOT_FOUND') throw error;
    const { execFileSync } = require('child_process');
    const npm = process.env.npm_execpath || 'npm';
    console.warn('VIDIK staging: pg dependency missing; bootstrapping declared production dependency.');
    execFileSync(npm, ['install', '--no-save', '--omit=dev', 'pg@8.16.3'], {
      cwd: path.resolve(__dirname, '..'),
      stdio: 'inherit',
    });
    return require('pg');
  }
}

const { Pool } = loadPostgres();

const root = path.resolve(__dirname, '..');
const port = Number(process.env.PORT || 8080);
const VERSION = '9.2.0';

let ready = true;
let pool = null;

function databaseConfigured() {
  return typeof process.env.VIDIK_DATABASE_URL === 'string' && /^postgres(?:ql)?:\/\//i.test(process.env.VIDIK_DATABASE_URL);
}

function databaseSslConfig() {
  if (!databaseConfigured()) return false;
  const url = process.env.VIDIK_DATABASE_URL;
  const match = url.match(/[?&]sslmode=([^&]+)/i);
  if (!match) return false;
  const mode = decodeURIComponent(match[1]).toLowerCase();
  if (mode === 'disable') return false;
  if (mode === 'verify-ca' || mode === 'verify-full') return { rejectUnauthorized: true };
  return { rejectUnauthorized: false };
}

function getPool() {
  if (!databaseConfigured()) return null;
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.VIDIK_DATABASE_URL,
      ssl: databaseSslConfig(),
      connectionTimeoutMillis: 5000,
      statement_timeout: 5000,
      max: 2,
    });
  }
  return pool;
}

async function databaseStatus() {
  const db = getPool();
  if (!db) return { configured: false, reachable: false, reason: 'VIDIK_DATABASE_URL_NOT_CONFIGURED' };
  const client = await db.connect();
  try {
    const result = await client.query(`
      SELECT
        current_setting('server_version_num')::int AS server_version_num,
        COALESCE((SELECT ssl FROM pg_stat_ssl WHERE pid = pg_backend_pid()), false) AS tls_active,
        EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'vidik_decisions') AS decisions_table,
        EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'vidik_outcomes') AS outcomes_table,
        EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'vidik_audit_events') AS audit_table
    `);
    const row = result.rows[0];
    const schemaReady = row.decisions_table && row.outcomes_table && row.audit_table;
    return {
      configured: true,
      reachable: true,
      tlsActive: row.tls_active,
      connectionMode: row.tls_active ? 'tls' : 'render-private-network',
      postgresqlMajor: Math.floor(row.server_version_num / 10000),
      schemaReady,
      requiredTables: {
        vidik_decisions: row.decisions_table,
        vidik_outcomes: row.outcomes_table,
        vidik_audit_events: row.audit_table,
      },
    };
  } finally {
    client.release();
  }
}

async function healthPayload() {
  let db;
  try { db = await databaseStatus(); }
  catch (error) {
    db = { configured: true, reachable: false, reason: error.code || 'DATABASE_CONNECTION_FAILED' };
  }
  return {
    status: ready && (!db.configured || db.reachable) ? 'ok' : 'degraded',
    service: 'vidik',
    version: VERSION,
    deploymentRole: 'staging',
    database: db,
  };
}

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8'
};

const server = http.createServer(async (req, res) => {
  if (req.url === '/health') {
    const payload = await healthPayload();
    res.writeHead(payload.status === 'ok' ? 200 : 503, {'content-type': 'application/json'});
    return res.end(JSON.stringify(payload));
  }

  if (req.url === '/ready') {
    const payload = await healthPayload();
    const isReady = payload.status === 'ok' && (!payload.database.configured || payload.database.schemaReady);
    res.writeHead(isReady ? 200 : 503, {'content-type': 'application/json'});
    return res.end(JSON.stringify({ready: isReady, ...payload}));
  }

  const clean = decodeURIComponent((req.url || '/').split('?')[0]);
  const rel = clean === '/' ? 'index.html' : clean.replace(/^\/+/, '');
  const target = path.resolve(root, rel);
  if (!target.startsWith(root + path.sep)) {
    res.writeHead(400);
    return res.end('bad path');
  }

  fs.readFile(target, (err, data) => {
    if (err) {
      res.writeHead(err.code === 'ENOENT' ? 404 : 500);
      return res.end('not found');
    }
    res.writeHead(200, {'content-type': mime[path.extname(target)] || 'application/octet-stream'});
    res.end(data);
  });
});

function shutdown() {
  ready = false;
  server.close(async () => {
    if (pool) {
      try { await pool.end(); } catch {}
    }
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 5000).unref();
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

server.listen(port, '0.0.0.0', () => console.log(`VIDIK staging listening on ${port}`));
