'use strict';

const fs = require('fs');
const path = require('path');

function loadPostgres() {
  try {
    return require('pg');
  } catch (error) {
    if (error && error.code !== 'MODULE_NOT_FOUND') throw error;
    const { execFileSync } = require('child_process');
    const npm = process.env.npm_execpath || 'npm';
    console.warn('VIDIK staging migration: pg dependency missing; bootstrapping declared production dependency.');
    execFileSync(npm, ['install', '--no-save', '--omit=dev', 'pg@8.16.3'], {
      cwd: path.resolve(__dirname, '..'),
      stdio: 'inherit',
    });
    return require('pg');
  }
}

const { Pool } = loadPostgres();

function databaseConfigured() {
  return typeof process.env.VIDIK_DATABASE_URL === 'string' &&
    /^postgres(?:ql)?:\/\//i.test(process.env.VIDIK_DATABASE_URL);
}

function databaseSslConfig() {
  if (!databaseConfigured()) return false;
  const match = process.env.VIDIK_DATABASE_URL.match(/[?&]sslmode=([^&]+)/i);
  if (!match) return false;
  const mode = decodeURIComponent(match[1]).toLowerCase();
  if (mode === 'disable') return false;
  if (mode === 'verify-ca' || mode === 'verify-full') return { rejectUnauthorized: true };
  return { rejectUnauthorized: false };
}

async function main() {
  if (!databaseConfigured()) {
    throw new Error('VIDIK_DATABASE_URL_NOT_CONFIGURED');
  }

  const schemaPath = path.resolve(__dirname, '..', 'infra', 'postgres', '001_vidik_core.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');
  const pool = new Pool({
    connectionString: process.env.VIDIK_DATABASE_URL,
    ssl: databaseSslConfig(),
    connectionTimeoutMillis: 10000,
    statement_timeout: 10000,
    max: 1,
  });

  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(schema);
      await client.query('COMMIT');
      console.log('VIDIK staging migration: 001_vidik_core.sql applied successfully.');
    } catch (error) {
      try { await client.query('ROLLBACK'); } catch {}
      throw error;
    } finally {
      client.release();
    }
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error('VIDIK staging migration failed:', error && error.stack ? error.stack : error);
  process.exit(1);
});
